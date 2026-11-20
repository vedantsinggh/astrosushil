/**
 * S1 chart validation: conventions present, required vargas present, birth time present, and
 * birth-time boundary sensitivity. Produces the qualifications every result inherits.
 *
 * Boundary sensitivity reuses the engine's `BirthTimeSensitivityCalculator` output
 * (`input.birthTimeSensitivity`, precomputed by the caller because the calculator is async).
 * Without it the Lagna points cannot be timed (the ascendant's rate varies by sign and
 * latitude), so only the Moon points are estimated from the Moon's daily motion
 * (`speedLongitude`). Nothing is guessed: a point that cannot be timed is not flagged.
 *
 * The flag window (`BOUNDARY_THRESHOLD_MINUTES`) is an engineering convention (typical
 * recorded-birth-time uncertainty), provisional – pending client review.
 */
import type { SensitivityKey } from '@astro/astrology-engine';
import { InterpretationInputError, type InterpretationInput } from '../input';
import type { RunS1ChartValidation } from '../stages';
import type { BoundarySensitivity, ConditionCode, ConditionEntry, InterpretationRule, QualificationCode } from '../types';
import { sortQualifications } from '../conflict/resolve';
import { ruleRef } from '../util/count';

export const RULE_S1_CHART_INPUTS: InterpretationRule = {
  id: 'INT-S1-001',
  version: '1.0.0',
  stage: 'S1',
  status: 'approved',
  sources: ['ADR-015/016/017 (calculation conventions)', 'docs/report-system/decisions/interpretation.md §4.5'],
  requiredFacts: ['asc.d1.sign'],
  description:
    'Checks the calculation conventions, the vargas the stages need (D9, D10) and the birth time; provisional conventions add PROVISIONAL_CONVENTION, a missing birth time adds BIRTH_TIME_SENSITIVE.',
};

export const RULE_S1_BOUNDARY: InterpretationRule = {
  id: 'INT-S1-002',
  version: '1.0.0',
  stage: 'S1',
  status: 'provisional',
  sources: [
    'BPHS ch. 6 equal-arc divisions via engine BirthTimeSensitivityCalculator (sign 30°, nakshatra 13°20′, pada/navamsa 3°20′, dasamsa 3°)',
    'Flag window of 5 minutes: engineering convention (recorded birth-time uncertainty), provisional – pending client review',
  ],
  requiredFacts: ['asc.d1.sign', 'asc.d1.nakshatra', 'planet.moon.d1.nakshatra'],
  description:
    'Lagna sign / nakshatra / D9 / D10 and Moon nakshatra / pada within the flag window of a boundary add BIRTH_TIME_SENSITIVE.',
};

export const S1_CHART_VALIDATION_RULES: readonly InterpretationRule[] = [RULE_S1_CHART_INPUTS, RULE_S1_BOUNDARY];

/** Convention keys every snapshot must state (report-engine `buildChartSnapshot`). */
export const REQUIRED_CONVENTIONS = ['zodiac', 'ayanamsa', 'houseSystem', 'node'] as const;

/** Vargas the natal stages read (S2 varga dignity / vargottama, S5). */
export const REQUIRED_VARGAS = ['D9', 'D10'] as const;

/** Provisional flag window (minutes of birth-time change) for every boundary point. */
export const BOUNDARY_THRESHOLD_MINUTES = 5;

interface PointSpec {
  key: SensitivityKey;
  point: BoundarySensitivity['point'];
  code: ConditionCode;
  factIds: string[];
  /** Arc of the division (degrees) for the Moon estimate; null for Lagna points. */
  moonArc: number | null;
}

const POINTS: readonly PointSpec[] = [
  { key: 'LAGNA_SIGN', point: 'asc-sign', code: 'ASC_NEAR_SIGN_BOUNDARY', factIds: ['asc.d1.degree', 'asc.d1.sign'], moonArc: null },
  { key: 'LAGNA_NAKSHATRA', point: 'asc-nakshatra', code: 'ASC_NEAR_NAKSHATRA_BOUNDARY', factIds: ['asc.d1.degree', 'asc.d1.nakshatra'], moonArc: null },
  { key: 'LAGNA_PADA_D9', point: 'asc-d9', code: 'ASC_NEAR_D9_BOUNDARY', factIds: ['asc.d1.degree', 'asc.d9.sign'], moonArc: null },
  { key: 'LAGNA_D10', point: 'asc-d10', code: 'ASC_NEAR_D10_BOUNDARY', factIds: ['asc.d1.degree', 'asc.d10.sign'], moonArc: null },
  { key: 'MOON_NAKSHATRA', point: 'moon-nakshatra', code: 'MOON_NEAR_NAKSHATRA_BOUNDARY', factIds: ['planet.moon.d1.degree', 'planet.moon.d1.nakshatra'], moonArc: 360 / 27 },
  { key: 'MOON_PADA', point: 'moon-pada', code: 'MOON_NEAR_PADA_BOUNDARY', factIds: ['planet.moon.d1.degree', 'planet.moon.d9.sign'], moonArc: 360 / 108 },
];

const round2 = (x: number): number => Math.round(x * 100) / 100;

/** Minutes to the nearest boundary of each point (null when it cannot be timed). */
function minutesToBoundary(input: InterpretationInput, spec: PointSpec): number | null {
  const bts = input.birthTimeSensitivity;
  if (bts) {
    const m = bts.margins.find((x) => x.key === spec.key);
    if (!m) return null;
    const vals = [m.minutesSincePrevious, m.minutesToNext].filter((v): v is number => typeof v === 'number');
    return vals.length ? round2(Math.min(...vals)) : null;
  }
  if (spec.moonArc === null) return null;
  const moon = input.natal.planets.find((p) => String(p.name).toUpperCase() === 'MOON');
  const speed = moon?.speedLongitude;
  if (!moon || typeof speed !== 'number' || !(Math.abs(speed) > 0)) return null;
  const pos = moon.absoluteDegree / spec.moonArc;
  const frac = pos - Math.floor(pos);
  const arcDeg = Math.min(frac, 1 - frac) * spec.moonArc;
  return round2((arcDeg / Math.abs(speed)) * 1440);
}

export const runS1ChartValidation: RunS1ChartValidation = (input, _facts) => {
  const missingConventions = REQUIRED_CONVENTIONS.filter((k) => !input.conventions[k]);
  if (missingConventions.length) {
    throw new InterpretationInputError(`conventions missing: ${missingConventions.join(', ')}`);
  }

  const conditions: ConditionEntry[] = [];
  const qualification = new Set<QualificationCode>();
  const ruleIn = RULE_S1_CHART_INPUTS.id;

  if (input.conventionsProvisional) {
    conditions.push({ factId: 'chart.conventions', conditionCode: 'CONVENTIONS_PROVISIONAL', ruleId: ruleIn, direction: 'context' });
    qualification.add('PROVISIONAL_CONVENTION');
  }

  const missingVargas = REQUIRED_VARGAS.filter((v) => !input.vargas[v]);
  if (missingVargas.length) {
    conditions.push({ factId: 'chart.vargas', conditionCode: 'VARGA_MISSING', ruleId: ruleIn, direction: 'context' });
  }

  const birthTimePresent = typeof input.subject.timeOfBirth === 'string' && input.subject.timeOfBirth.trim().length > 0;
  if (!birthTimePresent) {
    conditions.push({ factId: 'chart.birth-time', conditionCode: 'BIRTH_TIME_MISSING', ruleId: ruleIn, direction: 'context' });
    qualification.add('BIRTH_TIME_SENSITIVE');
  }

  const boundaries: BoundarySensitivity[] = [];
  if (birthTimePresent) {
    for (const spec of POINTS) {
      const minutes = minutesToBoundary(input, spec);
      if (minutes === null || minutes > BOUNDARY_THRESHOLD_MINUTES) continue;
      boundaries.push({
        point: spec.point,
        minutesToBoundary: minutes,
        thresholdMinutes: BOUNDARY_THRESHOLD_MINUTES,
        conditionCode: spec.code,
        factIds: [...spec.factIds],
        rule: ruleRef(RULE_S1_BOUNDARY),
      });
      conditions.push({ factId: spec.factIds[1], conditionCode: spec.code, ruleId: RULE_S1_BOUNDARY.id, direction: 'context' });
      qualification.add('BIRTH_TIME_SENSITIVE');
    }
  }

  return {
    birthTimePresent,
    conventions: { ...input.conventions },
    conventionsProvisional: input.conventionsProvisional,
    missingVargas: [...missingVargas],
    boundaries,
    qualification: sortQualifications([...qualification]),
    conditions,
  };
};

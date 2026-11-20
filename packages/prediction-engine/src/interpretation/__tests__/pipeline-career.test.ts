/**
 * Pipeline + career pack against FIXTURE stages (internal seam `createInterpretationRunner`).
 *
 * The stage outputs are hand-built, so every expected class below follows from the set logic of
 * the conflict policy (decision 7) and is derived by hand in the comments, not copied from output.
 * The real stages run in report-engine's golden regression (golden-career.test.ts).
 */
import { describe, expect, it } from 'vitest';
import type { InterpretationInput, FactItem, FactView } from '../input';
import { createInterpretationRunner, type InterpretationStages } from '../pipeline';
import { CONFLICT_POLICY } from '../conflict/policy';
import { CAREER_PACK, assessFactors } from '../packs/career';
import { CAREER_RULE_CATALOGUE } from '../rules/catalogue';
import { InterpretationSetSchema } from '../schema';
import { computeRulesetVersion } from '../ids';
import { runConflictResolution } from '../conflict/resolve';
import { deriveLifeStage } from '../input';
import { ruleRef, signFrom, signLordName, signName, houseCategoriesOf } from '../util/count';
import { RULE_S2_FUNCTIONAL_NATURE } from '../stages/functional-nature';
import type { PackBuildContext } from '../stages';
import {
  PLANET_NAMES,
  type Activation,
  type ChartValidation,
  type ConditionCode,
  type ConditionDirection,
  type ConditionEntry,
  type DashaActivation,
  type HouseAssessment,
  type InterpretationResult,
  type InterpretationSet,
  type PlanetCondition,
  type PlanetName,
  type StageOutputs,
} from '../types';

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

const LAGNA = 4; // Cancer
const D10_ASC = 2; // Taurus
const key = (p: PlanetName) => p.toLowerCase();

/** Permissive fact view: every ID exists (chart-ref plumbing is tested separately). */
const ALL_FACTS: FactView = {
  has: () => true,
  get: (id: string): FactItem => ({ id, kind: 'fixture', label: id, value: id.endsWith('sun-saturn') ? [] : 'x', source: 'fixture' }),
  resolve: (patterns: string[]) => patterns.map((p) => ({ id: p.replace(/\*/g, 'x'), kind: 'fixture', label: p, value: 'x', source: 'fixture' })),
};

const c = (factId: string, conditionCode: ConditionCode, direction: ConditionDirection, ruleId: string): ConditionEntry => ({
  factId,
  conditionCode,
  ruleId,
  direction,
});

// Common condition shorthands (rule IDs are the real stage rule IDs).
const dign = (p: PlanetName, code: ConditionCode, dir: ConditionDirection) => c(`planet.${key(p)}.d1.dignity`, code, dir, 'INT-S2-001');
const d10 = (p: PlanetName, code: ConditionCode, dir: ConditionDirection) => c(`career.d10.${key(p)}.dignity`, code, dir, 'INT-S2-002');
const combust = (p: PlanetName) => c(`planet.${key(p)}.d1.combust`, 'COMBUST', 'challenges', 'INT-S2-003');
const fn = (p: PlanetName, code: ConditionCode, dir: ConditionDirection) => c(`planet.${key(p)}.d1.lordship`, code, dir, 'INT-S2-007');

interface Spec {
  planets?: Partial<Record<PlanetName, { conditions?: ConditionEntry[]; house?: number; d10Dignity?: 'EXALTED' | 'DEBILITATED' | 'OWN_SIGN' | 'NONE' }>>;
  houses?: Partial<Record<number, ConditionEntry[]>>;
  s6?: Activation[];
  s1Qualification?: ChartValidation['qualification'];
}

function planetCondition(p: PlanetName, spec: Spec): PlanetCondition {
  const s = spec.planets?.[p] ?? {};
  const house = s.house ?? 1;
  const rashi = signFrom(LAGNA, house);
  return {
    planet: p,
    sign: signName(rashi),
    house,
    degree: 10,
    dignity: { value: 'NEUTRAL', definition: 'dignity.d1.compound', factId: `planet.${key(p)}.d1.dignity` },
    vargaDignity: {
      d10: { varga: 'D10', sign: 'Aries', house: 12, value: s.d10Dignity ?? 'NONE', definition: 'dignity.varga.sign', factIds: [`planet.${key(p)}.d10.sign`] },
    },
    combustion: null,
    retrograde: false,
    vargottama: false,
    functionalNature: { value: 'neutral', lordships: [], reason: 'fixture', rule: ruleRef(RULE_S2_FUNCTIONAL_NATURE) },
    yogakaraka: { value: false, basis: 'ownership' },
    houseCategories: houseCategoriesOf(house),
    dispositor: signLordName(rashi),
    conditions: s.conditions ?? [],
    factIds: [`planet.${key(p)}.d1.sign`],
  };
}

function houseAssessment(n: number, planets: PlanetCondition[], spec: Spec): HouseAssessment {
  const rashi = signFrom(LAGNA, n);
  const lord = signLordName(rashi);
  const lc = planets.find((p) => p.planet === lord)!;
  return {
    house: n,
    sign: signName(rashi),
    lord,
    lordHouse: lc.house,
    lordPlacementCategories: houseCategoriesOf(lc.house),
    lordCondition: lord,
    occupants: [],
    aspectedBy: [],
    sav: { bindus: 28, benchmark: 28, comparison: 'at', factId: `sav.house.${n}`, rule: { ruleId: 'INT-S3-004', source: 'BPHS', status: 'approved' } },
    dispositorChain: [lord],
    conditions: spec.houses?.[n] ?? [c(`house.${n}.d1.occupants`, 'HOUSE_EMPTY', 'context', 'INT-S3-002')],
    factIds: [`house.${n}.d1.lord`],
  };
}

function stageOutputs(spec: Spec): StageOutputs {
  const s2 = PLANET_NAMES.map((p) => planetCondition(p, spec));
  const s3 = Array.from({ length: 12 }, (_, i) => houseAssessment(i + 1, s2, spec));
  return {
    s1: {
      birthTimePresent: true,
      conventions: {},
      conventionsProvisional: false,
      missingVargas: [],
      boundaries: [],
      qualification: spec.s1Qualification ?? [],
      conditions: [],
    },
    s2,
    s3,
    s4: [],
    s5: [],
    s6: spec.s6 ?? [],
  };
}

function stagesFrom(spec: Spec): InterpretationStages {
  const out = stageOutputs(spec);
  return {
    s1: () => out.s1,
    s2: () => out.s2,
    s3: () => out.s3,
    s4: () => out.s4,
    s5: () => out.s5,
    s6: () => out.s6,
  };
}

const INPUT = {
  snapshotId: 'fixture-snapshot',
  subject: { dateOfBirth: '2004-06-08', timeOfBirth: '08:30', latitude: 26.43, longitude: 82.53, timezone: 'Asia/Kolkata' },
  engineVersion: 'fixture',
  conventions: {},
  conventionsProvisional: false,
  asOfIso: '2026-11-20T00:00:00.000Z',
  natal: {},
  vargas: { D10: { ascendant: { planet: 'Ascendant', rashiIndex: D10_ASC, rashiName: 'Taurus' }, placements: {} } },
  vimshottari: {},
  ashtakavarga: { sav: { signs: {} }, bav: {} },
  yogas: [],
  transits: {},
} as unknown as InterpretationInput;

function run(spec: Spec, opts: { includePendingClient?: boolean } = {}): InterpretationSet {
  return createInterpretationRunner(stagesFrom(spec))(INPUT, ALL_FACTS, CAREER_PACK, CONFLICT_POLICY, opts);
}

const byId = (set: InterpretationSet, id: string): InterpretationResult => {
  const r = set.results.find((x) => x.id === id);
  if (!r) throw new Error(`missing ${id}; have ${set.results.map((x) => x.id).join(', ')}`);
  return r;
};

function dasha(level: 'mahadasha' | 'antardasha', lord: PlanetName, startIso: string, endIso: string, extra: Partial<DashaActivation> = {}): DashaActivation {
  const factId = level === 'mahadasha' ? 'dasha.md.03' : 'career.dasha.ad.02';
  return {
    kind: 'dasha',
    id: `s6.dasha.${level === 'mahadasha' ? 'md' : 'ad'}.${key(lord)}`,
    level,
    lord,
    ...(level === 'antardasha' ? { parentLord: 'Jupiter' as PlanetName } : {}),
    startIso,
    endIso,
    isCurrent: true,
    housesRuled: [],
    houseOccupied: 1,
    housesAspected: [],
    d10House: null,
    yogasActivated: [],
    ageAtStart: 20,
    ageAtEnd: 36,
    conditions: [c(factId, level === 'mahadasha' ? 'MD_LORD' : 'AD_LORD', 'context', 'INT-A-001')],
    factIds: [factId],
    rule: { ruleId: 'INT-A-001', source: 'BPHS', status: 'provisional' },
    ...extra,
  };
}

// Lords for a Cancer Lagna: 1 Moon, 2 Sun, 4 Venus, 5 Mars, 6 Jupiter, 7 Saturn, 10 Mars, 11 Venus.

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('career pack: planet strength (fixture stages)', () => {
  it('strong vs weak planet: exalted → supported, debilitated → challenged', () => {
    const set = run({
      planets: {
        Jupiter: { conditions: [dign('Jupiter', 'EXALTED', 'supports')] },
        Saturn: { conditions: [dign('Saturn', 'DEBILITATED', 'challenges')] },
      },
    });
    expect(byId(set, 'interp.career.planet.jupiter').strengthClass).toBe('supported');
    expect(byId(set, 'interp.career.planet.saturn').strengthClass).toBe('challenged');
    expect(byId(set, 'interp.career.planet.saturn').contradicting).toEqual([
      { factId: 'planet.saturn.d1.dignity', conditionCode: 'DEBILITATED', ruleId: 'INT-S2-001' },
    ]);
  });

  it('benefic vs malefic functional lordship: Yogakaraka → supported, 8th-lord challenging → challenged', () => {
    const set = run({
      planets: {
        Mars: { conditions: [fn('Mars', 'YOGAKARAKA_BY_OWNERSHIP', 'supports')] },
        Saturn: { conditions: [fn('Saturn', 'FUNCTIONAL_CHALLENGING', 'challenges'), fn('Saturn', 'OWNS_8TH', 'challenges')] },
      },
    });
    expect(byId(set, 'interp.career.planet.mars').strengthClass).toBe('supported');
    expect(byId(set, 'interp.career.planet.saturn').strengthClass).toBe('challenged');
  });

  it('precedence applies within one planet only (CRP-003: the Moon owning the 8th is set aside)', () => {
    const set = run({
      planets: {
        Moon: { conditions: [c('planet.moon.d1.lordship', 'LUMINARY', 'context', 'INT-S2-007'), fn('Moon', 'OWNS_8TH', 'challenges'), dign('Moon', 'FRIEND_SIGN', 'supports')] },
      },
    });
    const moon = byId(set, 'interp.career.planet.moon');
    // S = {FRIEND_SIGN}, C = {OWNS_8TH} set aside by CRP-003 → resolved-supported.
    expect(moon.strengthClass).toBe('resolved-supported');
    expect(moon.resolution?.applied.map((a) => a.precedenceRuleId)).toEqual(['CRP-003']);
    expect(moon.ruleIds).toContain('CRP-003');
    expect(moon.provisional).toBe(true);
    expect(moon.qualification).toContain('PROVISIONAL_RULE');
  });

  it('D1 strong + D10 weak → mixed, and the D10 lord result surfaces the debility as contradicting', () => {
    const set = run({
      planets: {
        Jupiter: { conditions: [dign('Jupiter', 'GREAT_FRIEND_SIGN', 'supports'), d10('Jupiter', 'D10_DEBILITATED', 'challenges')], d10Dignity: 'DEBILITATED' },
      },
    });
    const p = byId(set, 'interp.career.planet.jupiter');
    expect(p.strengthClass).toBe('mixed');
    expect(p.qualification).toContain('MIXED_INDICATORS');
    expect(p.resolution?.unresolved).toEqual(['D10_DEBILITATED', 'GREAT_FRIEND_SIGN']);
    // D10 11th from Taurus = Pisces → lord Jupiter.
    const d = byId(set, 'interp.career.d10.house-11.lord');
    expect(d.conclusion.code).toBe('D10_LORD_DEBILITATED');
    expect(d.strengthClass).toBe('challenged');
    expect(d.contradicting.map((l) => l.conditionCode)).toEqual(['D10_DEBILITATED']);
  });
});

describe('career pack: timing vs natal (fixture stages)', () => {
  it('strong natal + unfavourable timing → mixed period result', () => {
    const ad = dasha('antardasha', 'Venus', '2026-11-19T21:17:00.000Z', '2029-06-02T00:00:00.000Z', {
      conditions: [
        c('career.dasha.ad.02', 'AD_LORD', 'context', 'INT-A-001'),
        c('planet.venus.d1.house', 'PERIOD_LORD_OCCUPIES_HOUSE', 'challenges', 'INT-A-001'),
      ],
    });
    const set = run({ planets: { Venus: { conditions: [dign('Venus', 'EXALTED', 'supports')] } }, s6: [ad] });
    const r = byId(set, 'interp.career.period.ad');
    expect(r.strengthClass).toBe('mixed');
    expect(r.timeRelevance).toEqual({ kind: 'period', startIso: ad.startIso, endIso: ad.endIso, activatedBy: ['career.dasha.ad.02'] });
    expect(r.supporting.map((l) => l.conditionCode)).toEqual(['EXALTED']);
    expect(r.contradicting.map((l) => l.conditionCode)).toEqual(['PERIOD_LORD_OCCUPIES_HOUSE']);
  });

  it('favourable dasha + natal limitations → mixed period result', () => {
    const md = dasha('mahadasha', 'Jupiter', '2024-10-01T00:00:00.000Z', '2040-10-01T00:00:00.000Z', {
      housesRuled: [6, 9],
      conditions: [c('planet.jupiter.d1.lordship', 'PERIOD_LORD_RULES_HOUSE', 'supports', 'INT-A-001')],
    });
    const set = run({ planets: { Jupiter: { conditions: [dign('Jupiter', 'DEBILITATED', 'challenges'), combust('Jupiter')] } }, s6: [md] });
    const r = byId(set, 'interp.career.period.md');
    expect(r.strengthClass).toBe('mixed');
    expect(r.conclusion.code).toBe('PERIOD_LORD_LINKED_TO_CAREER_HOUSES');
    expect(r.conclusion.text).toContain('rules the 6th');
  });

  it('earnings window is age-plausible: a 2nd-lord period starting at 62 is never chosen', () => {
    const late = dasha('mahadasha', 'Sun', '2066-10-01T00:00:00.000Z', '2072-10-01T00:00:00.000Z', { isCurrent: false, ageAtStart: 62, ageAtEnd: 68 });
    const set = run({ s6: [late] });
    const r = byId(set, 'interp.career.period.earnings-window');
    expect(r.conclusion.code).toBe('NO_EARNINGS_WINDOW_IN_WORKING_AGE');
    const ok = dasha('antardasha', 'Venus', '2034-01-01T00:00:00.000Z', '2036-09-01T00:00:00.000Z', { isCurrent: false, ageAtStart: 29, ageAtEnd: 32 });
    const set2 = run({ s6: [late, ok] });
    const r2 = byId(set2, 'interp.career.period.earnings-window');
    expect(r2.conclusion.code).toBe('EARNINGS_WINDOW_IDENTIFIED');
    expect(r2.conclusion.text).toContain('ages 29–32');
    expect(r2.strengthClass).toBe('not-assessed');
  });
});

describe('career pack: dimensions are multi-factor (fixture stages)', () => {
  it('conflicting career indicators → mixed; the 6v7 SAV heuristic is context only', () => {
    // Service: 6th lord Jupiter exalted (supports) vs 6th SAV below 28 (challenges).
    const set = run({
      planets: { Jupiter: { conditions: [dign('Jupiter', 'EXALTED', 'supports')] } },
      houses: { 6: [c('sav.house.6', 'SAV_BELOW_28', 'challenges', 'INT-S3-004')] },
    });
    const r = byId(set, 'interp.career.service-orientation');
    expect(r.strengthClass).toBe('mixed');
    expect(r.conclusion.code).toBe('INDICATORS_MIXED');
    expect(r.qualification).toContain('PRACTITIONER_HEURISTIC');
    expect(r.chartRefs).toContain('career.sav.service-vs-partnership');
    expect([...r.supporting, ...r.contradicting].map((l) => l.factId)).not.toContain('career.sav.service-vs-partnership');
    expect(r.ruleIds).toEqual(expect.arrayContaining(['INT-CAR-001', 'INT-C-001', 'INT-C-002']));
    // Absence of a Sun–Saturn link is "no specific indicator", never negative (F15).
    expect(r.explanation).toContain('no specific indicator');
  });

  it('multiple supporting indicators → supported', () => {
    // Enterprise: 7th lord Saturn exalted, 7th lord in a kendra, 7th SAV above 28, Mercury in own sign.
    const set = run({
      planets: {
        Saturn: { conditions: [dign('Saturn', 'EXALTED', 'supports')], house: 4 },
        Mercury: { conditions: [dign('Mercury', 'OWN_SIGN', 'supports')] },
      },
      houses: {
        7: [c('house.7.d1.lord-house', 'LORD_IN_KENDRA', 'supports', 'INT-S3-001'), c('sav.house.7', 'SAV_ABOVE_28', 'supports', 'INT-S3-004')],
      },
    });
    const r = byId(set, 'interp.career.enterprise');
    expect(r.strengthClass).toBe('supported');
    expect(r.conclusion.code).toBe('INDICATORS_SUPPORTED');
    expect(new Set(r.supporting.map((l) => l.factId)).size).toBeGreaterThanOrEqual(4);
    expect(r.contradicting).toEqual([]);
  });

  it('a precedence rule never crosses subjects inside a dimension', () => {
    // Moon LAGNA_LORD (supports) must not set aside Saturn's OWNS_8TH (a different planet).
    const stages = stageOutputs({});
    const ctx: PackBuildContext = {
      input: INPUT,
      facts: ALL_FACTS,
      lifeStage: deriveLifeStage(INPUT),
      stages,
      policy: CONFLICT_POLICY,
      rules: Object.fromEntries(CAREER_RULE_CATALOGUE.map((r) => [r.id, r])),
      resolve: (i) => runConflictResolution(i, CONFLICT_POLICY),
    };
    const a = assessFactors(ctx, 'dimension.test', [
      { subject: 'planet.moon', conditions: [c('asc.d1.lord', 'LAGNA_LORD', 'supports', 'INT-S2-007'), dign('Moon', 'FRIEND_SIGN', 'supports')] },
      { subject: 'planet.saturn', conditions: [fn('Saturn', 'OWNS_8TH', 'challenges')] },
    ]);
    expect(a.strengthClass).toBe('mixed');
    expect(a.resolution?.applied).toEqual([]);
  });

  it('an empty chart reads as "no specific indicator" (neutral), never as a verdict', () => {
    const r = byId(run({}), 'interp.career.leadership');
    expect(r.strengthClass).toBe('neutral');
    expect(r.conclusion.code).toBe('NO_SPECIFIC_INDICATOR');
  });
});

describe('pipeline: rule status, schema and determinism', () => {
  const spec: Spec = {
    planets: {
      Rahu: { house: 10 },
      Venus: { conditions: [dign('Venus', 'OWN_SIGN', 'supports'), combust('Venus'), c('planet.venus.d1.retrograde', 'RETROGRADE', 'context', 'INT-S2-004')] },
    },
    s1Qualification: ['BIRTH_TIME_SENSITIVE'],
  };

  it('own sign + combust + retrograde → mixed (present both; CRP-101 is pending-client)', () => {
    const r = byId(run(spec), 'interp.career.planet.venus');
    expect(r.strengthClass).toBe('mixed');
    expect(r.resolution?.applied).toEqual([]);
    expect(r.resolution?.unresolved).toEqual(['COMBUST', 'OWN_SIGN']);
  });

  it('pending-client rules are rejected and never rendered unless includePendingClient (tests only)', () => {
    const prod = run(spec);
    expect(prod.rejected.map((r) => r.ruleId)).toEqual(expect.arrayContaining(['INT-CAR-041', 'INT-CAR-061', 'INT-CAR-071']));
    for (const r of prod.results) {
      expect(r.ruleIds).not.toContain('INT-CAR-061');
      expect(r.ruleIds).not.toContain('INT-CAR-071');
    }
    const test = run(spec, { includePendingClient: true });
    expect(byId(test, 'interp.career.recognition').ruleIds).toContain('INT-CAR-061');
    expect(test.rejected.map((r) => r.ruleId)).not.toContain('INT-CAR-061');
    expect(test.rulesetVersion).not.toBe(prod.rulesetVersion);
  });

  it('an uncatalogued stage rule is treated as unsourced: its conditions are left out', () => {
    const set = run({ planets: { Sun: { conditions: [c('planet.sun.d1.dignity', 'OWN_SIGN', 'supports', 'INT-ZZ-999')] } } });
    const sun = byId(set, 'interp.career.planet.sun');
    expect(sun.strengthClass).toBe('neutral');
    expect(sun.supporting).toEqual([]);
    for (const r of set.results) expect(r.ruleIds).not.toContain('INT-ZZ-999');
    expect(set.rejected).toContainEqual({ ruleId: 'INT-ZZ-999', reason: 'pending-client: evaluated in tests only, never rendered' });
  });

  it('S1 qualifications reach every result; provisional rules mark results provisional', () => {
    const set = run(spec);
    expect(set.results.length).toBeGreaterThan(40);
    for (const r of set.results) {
      expect(r.qualification).toContain('BIRTH_TIME_SENSITIVE');
      if (r.ruleIds.some((id) => CAREER_RULE_CATALOGUE.find((x) => x.id === id)?.status === 'provisional')) {
        expect(r.provisional).toBe(true);
      }
    }
  });

  it('every result is schema-valid and IDs follow interp.<topic>', () => {
    const set = run(spec);
    expect(() => InterpretationSetSchema.parse(set)).not.toThrow();
    for (const r of set.results) expect(r.id.startsWith(`interp.${r.topic}`)).toBe(true);
  });

  it('determinism: same input → identical JSON and rulesetVersion; rule order does not matter', () => {
    const a = run(spec);
    const b = run(spec);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.rulesetVersion).toMatch(/^[0-9a-f]{12}$/);
    const enabledRules = CAREER_PACK.rules.filter((r) => r.status !== 'pending-client');
    expect(a.rulesetVersion).toBe(computeRulesetVersion(enabledRules, CONFLICT_POLICY));
    expect(computeRulesetVersion([...enabledRules].reverse(), CONFLICT_POLICY)).toBe(a.rulesetVersion);
    const reversed = { ...CAREER_PACK, rules: [...CAREER_PACK.rules].reverse() };
    const c2 = createInterpretationRunner(stagesFrom(spec))(INPUT, ALL_FACTS, reversed, CONFLICT_POLICY);
    expect(JSON.stringify(c2)).toBe(JSON.stringify(a));
  });

  it('an unknown chartRef fails closed', () => {
    const strict: FactView = { ...ALL_FACTS, has: (id) => id !== 'planet.venus.d1.dignity' };
    expect(() => createInterpretationRunner(stagesFrom(spec))(INPUT, strict, CAREER_PACK, CONFLICT_POLICY)).toThrow(/INTERPRETATION_UNKNOWN_FACT/);
  });
});

describe('rule catalogue', () => {
  it('has unique IDs, and every pack topic rule is catalogued', () => {
    const ids = CAREER_RULE_CATALOGUE.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of Object.values(CAREER_PACK.topics)) for (const id of t.ruleIds) expect(ids).toContain(id);
  });

  it('pending-client rules carry an "Unsourced" source', () => {
    for (const r of CAREER_RULE_CATALOGUE.filter((x) => x.stage === 'S8' && x.status === 'pending-client')) {
      expect(r.sources.join(' ')).toMatch(/Unsourced/);
    }
  });
});

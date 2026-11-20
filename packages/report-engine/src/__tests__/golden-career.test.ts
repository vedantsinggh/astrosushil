/**
 * Golden career regression (proposal §9): the owner-approved golden subject (Apeksha Singh,
 * 08 Jun 2004 08:30 IST, Akbarpur / Ambedkar Nagar 26.4295 N 82.5343 E), as of 2026-11-20.
 *
 * Builds the snapshot and the evidence registry exactly as the orchestrator does (career module
 * contributors, then the interpretation contributor), runs the real S1–S8 pipeline with the career
 * pack, and checks:
 *   - hand-verified chart facts (audit 05 / golden-chart.json): Cancer Lagna; SAV 32/22/33/26/34/24;
 *     Saturn transiting Pisces (9th from the Lagna, 2nd from the Moon);
 *   - interpretation targets: Mars Yogakaraka by ownership; D10 Jupiter debilitated surfaced as a
 *     contradicting link; Venus own sign + combust + retrograde → mixed; service orientation from
 *     several factors with the 6v7 SAV heuristic as context only;
 *   - the full InterpretationSet against the committed fixture, so any rule change is a reviewed diff.
 *
 * To regenerate the fixture after a reviewed rule change: UPDATE_GOLDEN=1 npx vitest run <this file>.
 *
 * The interpretation extras come from the career module's `extend` output (`interpretationExtras`),
 * exactly as the orchestrator uses them.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { CAREER_INTERPRETATION_PACK, runInterpretation, type InterpretationResult, type InterpretationSet } from '@astro/prediction-engine';
import { buildChartSnapshot, ChartSnapshot, SubjectInput } from '../platform/snapshot/chart-snapshot';
import { EvidenceRegistry } from '../platform/evidence/evidence-registry';
import { CAREER_MODULE } from '../platform/reports/career';
import { interpretationContributor, type InterpretationExtras } from '../platform/interpretation/register';

const FIXTURES = path.join(__dirname, 'fixtures');
const SUBJECT_FILE = path.join(FIXTURES, 'golden-career.subject.json');
const SET_FILE = path.join(FIXTURES, 'golden-career.interpretation-set.json');

const golden = JSON.parse(readFileSync(SUBJECT_FILE, 'utf8')) as { subject: SubjectInput; asOf: string };

let snapshot: ChartSnapshot;
let registry: EvidenceRegistry;
let set: InterpretationSet;

beforeAll(async () => {
  snapshot = await buildChartSnapshot(golden.subject, {
    asOf: new Date(golden.asOf),
    requireBirthTime: true,
    vargas: ['D1', 'D9', 'D10'],
    transitYears: 10,
  });
  const ext = await CAREER_MODULE.extend!({ snapshot });
  const extras = ext.interpretationExtras as InterpretationExtras | undefined;
  if (!extras) throw new Error('career extend() did not return interpretationExtras');
  registry = new EvidenceRegistry(snapshot, {
    contributors: [
      (add, reg) => CAREER_MODULE.evidence!(add, { snapshot, ext, registry: reg }),
      interpretationContributor({ pack: CAREER_INTERPRETATION_PACK, extras, run: runInterpretation }),
    ],
  });
  const index = registry.interpretation;
  if (!index) throw new Error('interpretation index missing');
  set = index.set;
}, 180000);

const result = (id: string): InterpretationResult => {
  const r = set.results.find((x) => x.id === id);
  if (!r) throw new Error(`missing ${id}; have ${set.results.map((x) => x.id).join(', ')}`);
  return r;
};
const codes = (links: Array<{ conditionCode: string }>) => links.map((l) => l.conditionCode);

describe('golden career chart: facts (independently verified)', () => {
  it('Cancer Lagna', () => {
    expect(registry.get('asc.d1.sign')?.value).toBe('Cancer');
    expect(registry.get('house.10.d1.lord')?.value).toBe('Mars');
  });

  it('SAV of the career houses (audit 05 recomputation): 1st 32, 2nd 22, 6th 33, 7th 26, 10th 34, 11th 24', () => {
    const expected: Record<number, number> = { 1: 32, 2: 22, 6: 33, 7: 26, 10: 34, 11: 24 };
    for (const [h, v] of Object.entries(expected)) {
      expect(registry.get(`sav.house.${h}`)?.value).toBe(v);
      const code = v > 28 ? 'SAV_ABOVE_28' : v < 28 ? 'SAV_BELOW_28' : 'SAV_AT_28';
      expect(result(`interp.career.house-${h}.sav`).conclusion.code).toBe(code);
    }
  });
});

describe('golden career chart: interpretation targets', () => {
  it('Mars is Yogakaraka by ownership (5th + 10th for Cancer)', () => {
    const mars = result('interp.career.planet.mars');
    expect(codes(mars.supporting)).toContain('YOGAKARAKA_BY_OWNERSHIP');
  });

  it('D10 Jupiter is debilitated (Capricorn) and surfaces as contradicting in the D10 11th-lord result', () => {
    // D10 Lagna Taurus → D10 11th = Pisces → lord Jupiter, in Capricorn (its debilitation sign).
    const d = result('interp.career.d10.house-11.lord');
    expect(d.conclusion.code).toBe('D10_LORD_DEBILITATED');
    expect(d.conclusion.text).toContain('Jupiter');
    expect(codes(d.contradicting)).toContain('D10_DEBILITATED');
    expect(codes(result('interp.career.planet.jupiter').contradicting)).toContain('D10_DEBILITATED');
  });

  it('Venus own sign + combust + retrograde → mixed (present both)', () => {
    const v = result('interp.career.planet.venus');
    expect(v.strengthClass).toBe('mixed');
    expect(codes(v.supporting)).toContain('OWN_SIGN');
    expect(codes(v.contradicting)).toContain('COMBUST');
    expect(v.chartRefs).toContain('planet.venus.d1.retrograde');
    expect(v.qualification).toContain('MIXED_INDICATORS');
  });

  it('Saturn transits Pisces: 9th from the Lagna, 2nd from the Moon (Sade Sati closing phase, neutral)', () => {
    const t = result('interp.career.transit.saturn.current');
    expect(t.conclusion.code).toBe('TRANSIT_HOUSE_9_FROM_ASC');
    expect(t.conclusion.text).toContain('Pisces');
    expect(t.strengthClass).toBe('not-assessed');
    expect(result('interp.career.transit.saturn.from-moon').conclusion.code).toBe('SADE_SATI_SECOND_FROM_MOON');
  });

  it('service orientation is not decided by one heuristic', () => {
    const s = result('interp.career.service-orientation');
    const linked = new Set([...s.supporting, ...s.contradicting].map((l) => l.factId));
    expect(linked.has('career.sav.service-vs-partnership')).toBe(false);
    expect([...linked].filter((f) => !f.startsWith('sav.')).length).toBeGreaterThanOrEqual(2);
    expect(s.chartRefs).toContain('career.sav.service-vs-partnership');
    expect(s.qualification).toContain('PRACTITIONER_HEURISTIC');
  });

  it('current Jupiter Mahadasha / Saturn Antardasha; earnings window is age-plausible', () => {
    expect(result('interp.career.period.md').conclusion.text).toContain('Jupiter Mahadasha');
    expect(result('interp.career.period.ad').conclusion.text).toContain('Jupiter–Saturn Antardasha');
    const e = result('interp.career.period.earnings-window');
    if (e.conclusion.code === 'EARNINGS_WINDOW_IDENTIFIED') {
      const m = /ages (\d+)–(\d+)\)\.$/.exec(e.conclusion.text);
      expect(m).not.toBeNull();
      expect(Number(m![1])).toBeLessThan(60);
      expect(Number(m![2])).toBeGreaterThan(16);
    }
  });

  it('every result inherits BIRTH_TIME_SENSITIVE (D10 Lagna near its boundary) and every chartRef is registered', () => {
    for (const r of set.results) {
      expect(r.qualification).toContain('BIRTH_TIME_SENSITIVE');
      for (const ref of r.chartRefs) expect(registry.has(ref)).toBe(true);
    }
  });

  it('no pending-client rule is rendered', () => {
    const pending = new Set(CAREER_INTERPRETATION_PACK.rules.filter((r) => r.status === 'pending-client').map((r) => r.id));
    for (const r of set.results) for (const id of r.ruleIds) expect(pending.has(id)).toBe(false);
  });
});

describe('golden career chart: full InterpretationSet snapshot', () => {
  it('matches the committed fixture (a rule change must be a reviewed diff)', () => {
    const json = `${JSON.stringify(set, null, 2)}\n`;
    if (process.env.UPDATE_GOLDEN === '1') writeFileSync(SET_FILE, json);
    expect(existsSync(SET_FILE), 'fixture missing: run with UPDATE_GOLDEN=1 and review the diff').toBe(true);
    expect(json).toBe(readFileSync(SET_FILE, 'utf8'));
  });
});

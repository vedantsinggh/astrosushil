/**
 * Natal stages S1, S2, S3, S5 on two charts built directly from the engine:
 *
 *  - GOLDEN: Apeksha Singh, 08 Jun 2004 08:30 IST, Akbarpur (Ambedkar Nagar) 26.4295 N 82.5343 E
 *    (owner-approved fixture). Positions independently verified to ≤0.02° (audit 03 §C).
 *    Cancer Lagna 8.40°.
 *  - REF_CHART_001: 15 May 1990 09:00 UT, Delhi 28.6139 N 77.209 E (engine reference chart whose
 *    positions are checked against NASA/JPL Horizons in tests/fixtures/reference-charts.ts).
 *    Virgo Lagna 1.9°.
 *
 * Expected values are hand-derived from the planets' signs (whole-sign houses, BPHS sign rulers,
 * BPHS ch. 3 exaltation/debilitation, BPHS ch. 6 D9/D10 rules worked by hand in the comments),
 * not copied from stage output. Tests marked "internal consistency" check stage plumbing only.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import {
  AshtakavargaCalculator,
  BirthTimeSensitivityCalculator,
  ChartCalculator,
  DEFAULT_ASTROLOGY_CONFIG,
  getFunctionalNature,
  normalizeAstroChart,
  PlanetSymbol,
  VargaCalculator,
  YogaCalculator,
  type VargaChart,
  type VargaType,
  type VimshottariDashaTree,
} from '@astro/astrology-engine';
import type { FactItem, FactView, InterpretationInput } from '../input';
import { PLANET_NAMES, type ConditionCode, type HouseAssessment, type PlanetCondition, type PlanetName } from '../types';
import { BOUNDARY_THRESHOLD_MINUTES, runS1ChartValidation, S1_CHART_VALIDATION_RULES } from '../stages/chart-validation';
import { runS2PlanetCondition, S2_PLANET_CONDITION_RULES } from '../stages/planet-condition';
import { dispositorChain, runS3HouseLordship, S3_HOUSE_LORDSHIP_RULES } from '../stages/house-lordship';
import { keyCareerPlanets, runS5DivisionalSynthesis, S5_DIVISIONAL_RULES } from '../stages/divisional';
import { functionalConditions } from '../stages/functional-nature';
import { countFrom, houseCategoriesOf, pickFact, signFrom } from '../util/count';
import { runConflictResolution, toConflictInput } from '../conflict/resolve';
import { CONFLICT_POLICY } from '../conflict/policy';
import { InterpretationRuleSchema } from '../schema';
import { REGISTRY_ID_PATTERN } from '../ids';

// ---------------------------------------------------------------------------
// Fixture builders (engine only; no report-engine import)
// ---------------------------------------------------------------------------

interface BirthSpec {
  date: { year: number; month: number; day: number };
  time: { hour: number; minute: number; second: number };
  timezone: string;
  latitude: number;
  longitude: number;
  dateOfBirth: string;
  timeOfBirth: string;
}

const GOLDEN: BirthSpec = {
  date: { year: 2004, month: 6, day: 8 },
  time: { hour: 8, minute: 30, second: 0 },
  timezone: 'Asia/Kolkata',
  latitude: 26.4295,
  longitude: 82.5343,
  dateOfBirth: '2004-06-08',
  timeOfBirth: '08:30',
};

const REF_001: BirthSpec = {
  date: { year: 1990, month: 5, day: 15 },
  time: { hour: 9, minute: 0, second: 0 },
  timezone: 'UTC',
  latitude: 28.6139,
  longitude: 77.209,
  dateOfBirth: '1990-05-15',
  timeOfBirth: '09:00',
};

async function buildInput(spec: BirthSpec, withSensitivity: boolean): Promise<InterpretationInput> {
  const raw = await new ChartCalculator().calculateChart(
    { name: 'fixture', date: spec.date, time: spec.time, timezone: spec.timezone, latitude: spec.latitude, longitude: spec.longitude },
    DEFAULT_ASTROLOGY_CONFIG,
  );
  const natal = normalizeAstroChart(raw);
  const vc = new VargaCalculator();
  const vargas: Partial<Record<VargaType, VargaChart>> = {};
  for (const v of ['D1', 'D9', 'D10'] as VargaType[]) vargas[v] = vc.calculateVarga(raw, v);
  const ashtakavarga = new AshtakavargaCalculator().calculate(raw);
  const yogas = new YogaCalculator().evaluateYogas(raw).detectedYogas ?? [];
  const birthTimeSensitivity = withSensitivity
    ? await new BirthTimeSensitivityCalculator().calculate({
        birthUtcIso: natal.calculation.normalizedTime.utcIsoString,
        latitude: spec.latitude,
        longitude: spec.longitude,
      })
    : undefined;
  return {
    snapshotId: 'fixture',
    subject: { dateOfBirth: spec.dateOfBirth, timeOfBirth: spec.timeOfBirth, latitude: spec.latitude, longitude: spec.longitude, timezone: spec.timezone },
    engineVersion: 'test',
    conventions: { zodiac: 'SIDEREAL', ayanamsa: 'LAHIRI', houseSystem: 'WHOLE_SIGN', node: 'MEAN_NODE' },
    conventionsProvisional: true,
    asOfIso: '2026-11-20T00:00:00.000Z',
    natal,
    vargas,
    vimshottari: {} as VimshottariDashaTree, // not read by S1–S3/S5
    ashtakavarga,
    yogas,
    transits: {},
    ...(birthTimeSensitivity ? { birthTimeSensitivity } : {}),
  };
}

/** Core registry IDs (same grammar as report-engine EvidenceRegistry.buildCore), built from the input. */
function coreFactIds(input: InterpretationInput): Set<string> {
  const ids = new Set<string>(['asc.d1.sign', 'asc.d1.degree', 'asc.d1.nakshatra', 'asc.d1.lord']);
  for (const p of input.natal.planets) {
    const k = String(p.name).toLowerCase();
    for (const f of ['sign', 'house', 'degree', 'nakshatra', 'dignity', 'retrograde', 'lordship', 'aspected-by', 'conjunctions']) ids.add(`planet.${k}.d1.${f}`);
    if (!['sun', 'rahu', 'ketu'].includes(k)) ids.add(`planet.${k}.d1.combust`);
  }
  for (const h of input.natal.houses) {
    for (const f of ['sign', 'lord', 'lord-house', 'occupants']) ids.add(`house.${h.number}.d1.${f}`);
    ids.add(`sav.house.${h.number}`);
  }
  for (const v of ['d9', 'd10']) {
    ids.add(`asc.${v}.sign`);
    for (const k of PLANET_NAMES) {
      ids.add(`planet.${k.toLowerCase()}.${v}.sign`);
      ids.add(`planet.${k.toLowerCase()}.${v}.house`);
    }
  }
  for (const y of input.yogas) if (y.isDetected) ids.add(`yoga.${y.id.replace(/^YOGA_/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
  return ids;
}

/** A2 new fact IDs (scratchpad/interp/A2-fact-ids.md) that A5 registers. */
const NEW_FACT_PATTERNS = [
  /^chart\.(conventions|vargas|birth-time)$/,
  /^planet\.[a-z]+\.d1\.(dispositor|functional-nature)$/,
  /^planet\.[a-z]+\.vargottama$/,
  /^planet\.[a-z]+\.d(9|10)\.dignity$/,
  /^planet\.[a-z]+\.shadbala$/,
  /^house\.\d+\.d1\.aspected-by$/,
];

function factView(ids: Iterable<string>): FactView {
  const set = new Set(ids);
  const item = (id: string): FactItem => ({ id, kind: 'test', label: id, value: id, source: 'test' });
  return {
    has: (id) => set.has(id),
    get: (id) => (set.has(id) ? item(id) : undefined),
    resolve: (patterns) => [...set].filter((id) => patterns.includes(id)).map(item),
  };
}

const EMPTY_FACTS = factView([]);

const codes = (c: { conditions: Array<{ conditionCode: ConditionCode }> }): ConditionCode[] => c.conditions.map((x) => x.conditionCode);
const planet = (all: PlanetCondition[], name: PlanetName): PlanetCondition => all.find((p) => p.planet === name)!;
const house = (all: HouseAssessment[], n: number): HouseAssessment => all.find((h) => h.house === n)!;

// ---------------------------------------------------------------------------

let golden: InterpretationInput;
let ref: InterpretationInput;
let gS2: PlanetCondition[];
let rS2: PlanetCondition[];
let gS3: HouseAssessment[];
let rS3: HouseAssessment[];

beforeAll(async () => {
  golden = await buildInput(GOLDEN, true);
  ref = await buildInput(REF_001, false);
  gS2 = runS2PlanetCondition(golden, EMPTY_FACTS);
  rS2 = runS2PlanetCondition(ref, EMPTY_FACTS);
  gS3 = runS3HouseLordship(golden, EMPTY_FACTS, { planets: gS2 });
  rS3 = runS3HouseLordship(ref, EMPTY_FACTS, { planets: rS2 });
}, 120_000);

describe('util/count', () => {
  it('sign counting and house categories (definitional)', () => {
    expect(countFrom(4, 1)).toBe(10); // Aries is the 10th from Cancer
    expect(countFrom(4, 3)).toBe(12);
    expect(signFrom(2, 10)).toBe(11); // 10th from Taurus = Aquarius
    expect(signFrom(12, 2)).toBe(1);
    expect(houseCategoriesOf(1)).toEqual(['kendra', 'trikona']);
    expect(houseCategoriesOf(2)).toEqual([]);
    expect(houseCategoriesOf(6)).toEqual(['dusthana', 'upachaya']);
    expect(houseCategoriesOf(10)).toEqual(['kendra', 'upachaya']);
    expect(() => houseCategoriesOf(13)).toThrow(RangeError);
  });

  it('pickFact prefers the canonical ID, then a present fallback, else the canonical ID', () => {
    expect(pickFact(factView(['a', 'b']), 'a', 'b')).toBe('a');
    expect(pickFact(factView(['b']), 'a', 'b')).toBe('b');
    expect(pickFact(factView([]), 'a', 'b')).toBe('a');
  });

  it('dispositor chain stops at own sign or a repeat', () => {
    const disp: Record<string, PlanetName> = { Mars: 'Mercury', Mercury: 'Venus', Venus: 'Venus', Sun: 'Moon', Moon: 'Sun' };
    expect(dispositorChain('Mars', (p) => disp[p])).toEqual(['Mars', 'Mercury', 'Venus']);
    expect(dispositorChain('Sun', (p) => disp[p])).toEqual(['Sun', 'Moon']);
  });
});

describe('stage rules', () => {
  it('every S1/S2/S3/S5 rule is schema-valid and IDs are unique', () => {
    const all = [...S1_CHART_VALIDATION_RULES, ...S2_PLANET_CONDITION_RULES, ...S3_HOUSE_LORDSHIP_RULES, ...S5_DIVISIONAL_RULES];
    for (const r of all) expect(InterpretationRuleSchema.safeParse(r).success).toBe(true);
    expect(new Set(all.map((r) => r.id)).size).toBe(all.length);
  });
});

describe('S1 chart validation', () => {
  it('golden: D10 Lagna is 2.8 minutes from a boundary → BIRTH_TIME_SENSITIVE (engine sensitivity helper)', () => {
    // Hand check: Lagna Cancer 8.404°; Cancer is even, so D10 parts start from Pisces; 6°–9° is part 2 →
    // Taurus. The next part starts at 9°, 0.596° away (≈ 2.8 min at Cancer's rising rate).
    const s1 = runS1ChartValidation(golden, EMPTY_FACTS);
    expect(s1.birthTimePresent).toBe(true);
    expect(s1.missingVargas).toEqual([]);
    expect(s1.boundaries.map((b) => b.point)).toEqual(['asc-d10']);
    expect(s1.boundaries[0].minutesToBoundary).toBeGreaterThan(2);
    expect(s1.boundaries[0].minutesToBoundary).toBeLessThan(BOUNDARY_THRESHOLD_MINUTES);
    expect(s1.boundaries[0].conditionCode).toBe('ASC_NEAR_D10_BOUNDARY');
    expect(s1.qualification).toEqual(['BIRTH_TIME_SENSITIVE', 'PROVISIONAL_CONVENTION']);
    expect(codes(s1)).toEqual(['CONVENTIONS_PROVISIONAL', 'ASC_NEAR_D10_BOUNDARY']);
  });

  it('without the sensitivity input, Lagna points are not timed (no guess); the Moon is timed from its speed', () => {
    const s1 = runS1ChartValidation({ ...golden, birthTimeSensitivity: undefined }, EMPTY_FACTS);
    // Moon 2.25° Aquarius (Dhanishta 3) is > 1° from any pada edge: far outside 5 minutes.
    expect(s1.boundaries).toEqual([]);
    expect(s1.qualification).toEqual(['PROVISIONAL_CONVENTION']);
  });

  it('missing birth time, missing vargas and missing conventions', () => {
    const noTime = runS1ChartValidation({ ...golden, subject: { ...golden.subject, timeOfBirth: undefined }, vargas: { D1: golden.vargas.D1 } }, EMPTY_FACTS);
    expect(noTime.birthTimePresent).toBe(false);
    expect(noTime.missingVargas).toEqual(['D9', 'D10']);
    expect(noTime.boundaries).toEqual([]);
    expect(codes(noTime)).toEqual(['CONVENTIONS_PROVISIONAL', 'VARGA_MISSING', 'BIRTH_TIME_MISSING']);
    expect(noTime.qualification).toEqual(['BIRTH_TIME_SENSITIVE', 'PROVISIONAL_CONVENTION']);
    expect(() => runS1ChartValidation({ ...golden, conventions: { zodiac: 'SIDEREAL' } }, EMPTY_FACTS)).toThrow(/INTERPRETATION_INPUT_INVALID/);
    const firm = runS1ChartValidation({ ...golden, conventionsProvisional: false }, EMPTY_FACTS);
    expect(firm.qualification).toEqual(['BIRTH_TIME_SENSITIVE']);
  });
});

describe('S2 planet condition: golden (Cancer Lagna)', () => {
  it('returns the nine grahas in registry order with whole-sign houses from Cancer', () => {
    expect(gS2.map((p) => p.planet)).toEqual([...PLANET_NAMES]);
    // Taurus = 11th, Aquarius = 8th, Gemini = 12th, Leo = 2nd, Aries = 10th, Libra = 4th from Cancer.
    expect(gS2.map((p) => [p.sign, p.house])).toEqual([
      ['Taurus', 11], ['Aquarius', 8], ['Gemini', 12], ['Taurus', 11], ['Leo', 2], ['Taurus', 11], ['Gemini', 12], ['Aries', 10], ['Libra', 4],
    ]);
  });

  it('Venus: own sign AND combust (both codes, never one) plus retrograde context', () => {
    const v = planet(gS2, 'Venus');
    expect(v.dignity).toEqual({ value: 'OWN_SIGN', definition: 'dignity.d1.compound', factId: 'planet.venus.d1.dignity' });
    expect(v.combustion?.combust).toBe(true);
    expect(v.combustion?.orbDeg).toBe(8); // retrograde Venus orb
    expect(v.combustion?.distanceDeg).toBeCloseTo(54.1232 - 53.7453, 2); // 0.38°
    const c = codes(v);
    expect(c).toContain('OWN_SIGN');
    expect(c).toContain('COMBUST');
    expect(v.conditions.find((x) => x.conditionCode === 'OWN_SIGN')?.direction).toBe('supports');
    expect(v.conditions.find((x) => x.conditionCode === 'COMBUST')?.direction).toBe('challenges');
    expect(v.conditions.find((x) => x.conditionCode === 'RETROGRADE')?.direction).toBe('context');
    // With the CRP policy, Venus's dignity vs combustion stays mixed (no seed rule resolves it).
    const outcome = runConflictResolution(
      toConflictInput('planet.venus', v.conditions.filter((x) => ['OWN_SIGN', 'COMBUST'].includes(x.conditionCode))),
      CONFLICT_POLICY,
    );
    expect(outcome.strengthClass).toBe('mixed');
  });

  it('Mercury combust at 12.6° (< 14° direct orb); Mars not combust', () => {
    const m = planet(gS2, 'Mercury');
    expect(m.combustion?.combust).toBe(true);
    expect(m.combustion?.orbDeg).toBe(14);
    expect(m.combustion?.distanceDeg).toBeCloseTo(53.7453 - 41.1174, 2);
    expect(planet(gS2, 'Mars').combustion?.combust).toBe(false);
    expect(planet(gS2, 'Sun').combustion).toBeNull();
    expect(planet(gS2, 'Rahu').combustion).toBeNull();
  });

  it('Mars is Yogakaraka by ownership for Cancer (owns Scorpio 5th and Aries 10th)', () => {
    const mars = planet(gS2, 'Mars');
    expect(mars.functionalNature.value).toBe('yogakaraka');
    expect(mars.functionalNature.lordships).toEqual([5, 10]);
    expect(mars.yogakaraka).toEqual({ value: true, basis: 'ownership' });
    expect(codes(mars)).toEqual(expect.arrayContaining(['YOGAKARAKA_BY_OWNERSHIP', 'OWNS_TRIKONA', 'OWNS_KENDRA', 'IN_DUSTHANA']));
    expect(gS2.filter((p) => p.yogakaraka.value).map((p) => p.planet)).toEqual(['Mars']);
  });

  it('Jupiter (6th + 9th lord) carries OWNS_TRIKONA (supports) and OWNS_6TH (challenges) → mixed', () => {
    const j = planet(gS2, 'Jupiter');
    expect(j.functionalNature.value).toBe('mixed');
    const own = j.conditions.filter((c) => c.conditionCode === 'OWNS_TRIKONA' || c.conditionCode === 'OWNS_6TH');
    expect(own.map((c) => [c.conditionCode, c.direction])).toEqual([['OWNS_TRIKONA', 'supports'], ['OWNS_6TH', 'challenges']]);
    expect(runConflictResolution(toConflictInput('planet.jupiter', own), CONFLICT_POLICY).strengthClass).toBe('mixed');
  });

  it('dusthana lord: Saturn (7th + 8th lord) in the 12th carries OWNS_8TH, OWNS_KENDRA and IN_DUSTHANA', () => {
    const s = planet(gS2, 'Saturn');
    expect(s.functionalNature.lordships).toEqual([7, 8]);
    expect(s.functionalNature.value).toBe('challenging');
    expect(codes(s)).toEqual(expect.arrayContaining(['OWNS_8TH', 'OWNS_KENDRA', 'IN_DUSTHANA', 'FUNCTIONAL_CHALLENGING']));
    expect(s.houseCategories).toEqual(['dusthana']);
  });

  it('Moon is the Lagna lord (LAGNA_LORD on asc.d1.lord) and a luminary (context)', () => {
    const moon = planet(gS2, 'Moon');
    const ll = moon.conditions.find((c) => c.conditionCode === 'LAGNA_LORD');
    expect(ll).toMatchObject({ factId: 'asc.d1.lord', direction: 'supports' });
    expect(moon.conditions.find((c) => c.conditionCode === 'LUMINARY')?.direction).toBe('context');
    expect(moon.dignity.value).toBe('ENEMY'); // audit 03: Moon "enemy" in Aquarius, hand-verified
  });

  it('D9 / D10 sign dignity (dignity.varga.sign): Jupiter debilitated in D10 Capricorn', () => {
    // D10 by hand: Jupiter Leo 16.68° (odd sign, count from Leo), part floor(16.68/3) = 5 → 6th sign from
    // Leo = Capricorn = Jupiter's debilitation. D10 Lagna Taurus → Capricorn is the 9th.
    const j = planet(gS2, 'Jupiter');
    expect(j.vargaDignity.d10).toMatchObject({ varga: 'D10', sign: 'Capricorn', house: 9, value: 'DEBILITATED', definition: 'dignity.varga.sign' });
    expect(j.conditions.find((c) => c.conditionCode === 'D10_DEBILITATED')).toMatchObject({ factId: 'planet.jupiter.d10.dignity', direction: 'challenges' });
    // Jupiter D9: Leo 16.68° → navamsa 5 of a fire sign counted from Aries → Virgo (no dignity).
    expect(j.vargaDignity.d9).toMatchObject({ sign: 'Virgo', value: 'NONE' });
    // Sun D9 Leo (own) and D10 Leo (own); Venus D10 Virgo (debilitated).
    expect(planet(gS2, 'Sun').vargaDignity.d9?.value).toBe('OWN_SIGN');
    expect(planet(gS2, 'Sun').vargaDignity.d10?.value).toBe('OWN_SIGN');
    expect(planet(gS2, 'Venus').vargaDignity.d10).toMatchObject({ sign: 'Virgo', value: 'DEBILITATED' });
  });

  it('no golden planet is vargottama (D9 signs differ from D1 signs)', () => {
    expect(gS2.filter((p) => p.vargottama)).toEqual([]);
  });

  it('dispositors and house categories', () => {
    expect(gS2.map((p) => p.dispositor)).toEqual(['Venus', 'Saturn', 'Mercury', 'Venus', 'Sun', 'Venus', 'Mercury', 'Mars', 'Venus']);
    expect(planet(gS2, 'Jupiter').houseCategories).toEqual([]); // 2nd house
    expect(planet(gS2, 'Rahu').houseCategories).toEqual(['kendra', 'upachaya']); // 10th
  });

  it('career registry fallback for D10 dignity when only career.d10.* exists', () => {
    const facts = factView(['career.d10.jupiter.dignity']);
    const j = planet(runS2PlanetCondition(golden, facts), 'Jupiter');
    expect(j.conditions.find((c) => c.conditionCode === 'D10_DEBILITATED')?.factId).toBe('career.d10.jupiter.dignity');
  });

  it('optional Shadbala vs required rupas, only when supplied', () => {
    expect(gS2.every((p) => p.shadbala === undefined)).toBe(true);
    const withSb = runS2PlanetCondition({ ...golden, shadbala: { Saturn: { totalRupas: 4.6, requiredRupas: 5 }, Venus: { totalRupas: 8.4, requiredRupas: 5.5 } } }, EMPTY_FACTS);
    expect(planet(withSb, 'Saturn').shadbala).toMatchObject({ meetsRequired: false, provisional: true });
    expect(planet(withSb, 'Saturn').shadbala?.ratio).toBeCloseTo(0.92, 2);
    expect(codes(planet(withSb, 'Saturn'))).toContain('SHADBALA_BELOW_REQUIRED');
    expect(codes(planet(withSb, 'Venus'))).toContain('SHADBALA_MEETS_REQUIRED');
    expect(planet(withSb, 'Mars').shadbala).toBeUndefined();
  });
});

describe('S2 planet condition: REF_CHART_001 (Virgo Lagna)', () => {
  it('lordships and functional nature for Virgo; no Yogakaraka', () => {
    // Virgo: Mercury 1+10, Venus 2+9, Mars 3+8, Jupiter 4+7, Saturn 5+6, Moon 11, Sun 12.
    expect(rS2.slice(0, 7).map((p) => [p.planet, p.functionalNature.lordships, p.functionalNature.value])).toEqual([
      ['Sun', [12], 'neutral'],
      ['Moon', [11], 'challenging'],
      ['Mars', [3, 8], 'challenging'],
      ['Mercury', [1, 10], 'favourable'],
      ['Jupiter', [4, 7], 'neutral'],
      ['Venus', [2, 9], 'favourable'],
      ['Saturn', [5, 6], 'mixed'],
    ]);
    expect(rS2.some((p) => p.yogakaraka.value)).toBe(false);
  });

  it('Venus exalted in Pisces; Saturn own sign in Capricorn and vargottama; Moon vargottama', () => {
    // Saturn sidereal ≈ 271.5° (Horizons 295.25° − Lahiri ≈ 23.72°) = Capricorn 1.5°: navamsa 1 of an
    // earth sign starts from Capricorn → D9 Capricorn. Moon ≈ Capricorn 1.9° → D9 Capricorn as well.
    expect(planet(rS2, 'Venus').dignity.value).toBe('EXALTED');
    const sat = planet(rS2, 'Saturn');
    expect(sat.dignity.value).toBe('OWN_SIGN');
    expect(sat.retrograde).toBe(true);
    expect(sat.vargottama).toBe(true);
    expect(sat.vargaDignity.d9?.value).toBe('OWN_SIGN');
    expect(codes(sat)).toEqual(expect.arrayContaining(['OWN_SIGN', 'D9_OWN_SIGN', 'VARGOTTAMA', 'RETROGRADE', 'OWNS_TRIKONA', 'OWNS_6TH']));
    expect(rS2.filter((p) => p.vargottama).map((p) => p.planet)).toEqual(['Moon', 'Saturn']);
    // Venus D10 by hand: Pisces 18.95° (even sign → count from Scorpio), part 6 → Taurus = own sign.
    expect(planet(rS2, 'Venus').vargaDignity.d10).toMatchObject({ sign: 'Taurus', value: 'OWN_SIGN', house: 1 });
  });

  it('Mercury (Lagna lord) retrograde in the 8th: LAGNA_LORD and IN_DUSTHANA, no combustion (16.2° > 12° R orb)', () => {
    const m = planet(rS2, 'Mercury');
    expect(m.house).toBe(8);
    expect(m.retrograde).toBe(true);
    expect(m.combustion).toMatchObject({ combust: false, orbDeg: 12 });
    expect(codes(m)).toEqual(expect.arrayContaining(['LAGNA_LORD', 'IN_DUSTHANA', 'RETROGRADE', 'FUNCTIONAL_FAVOURABLE']));
  });
});

describe('functional-nature condition codes (engine getFunctionalNature; classical Yogakarakas)', () => {
  const yk = (lagna: number) =>
    PLANET_NAMES.filter((p) => functionalConditions(p, getFunctionalNature(lagna, p.toUpperCase() as PlanetSymbol)).some((c) => c.code === 'YOGAKARAKA_BY_OWNERSHIP'));
  it('Taurus/Libra → Saturn, Cancer/Leo → Mars, Capricorn/Aquarius → Venus, others none', () => {
    expect(yk(2)).toEqual(['Saturn']);
    expect(yk(7)).toEqual(['Saturn']);
    expect(yk(4)).toEqual(['Mars']);
    expect(yk(5)).toEqual(['Mars']);
    expect(yk(10)).toEqual(['Venus']);
    expect(yk(11)).toEqual(['Venus']);
    for (const l of [1, 3, 6, 8, 9, 12]) expect(yk(l)).toEqual([]);
  });

  it('CRP-002: Aries Lagna lord Mars owning the 8th resolves to resolved-supported', () => {
    const fc = functionalConditions('Mars', getFunctionalNature(1, PlanetSymbol.MARS));
    expect(fc.map((c) => c.code)).toEqual(['LAGNA_LORD', 'FUNCTIONAL_FAVOURABLE', 'OWNS_8TH']);
    const entries = fc.map((c) => ({ factId: 'f', conditionCode: c.code, ruleId: 'INT-S2-007', direction: c.direction }));
    expect(runConflictResolution(toConflictInput('planet.mars', entries), CONFLICT_POLICY).strengthClass).toBe('resolved-supported');
  });

  it('CRP-003: the Sun owning only the 8th (Capricorn Lagna) is set aside to neutral', () => {
    const fc = functionalConditions('Sun', getFunctionalNature(10, PlanetSymbol.SUN));
    expect(fc.map((c) => [c.code, c.direction])).toEqual([['LUMINARY', 'context'], ['FUNCTIONAL_NEUTRAL', 'context'], ['OWNS_8TH', 'challenges']]);
    const entries = fc.map((c) => ({ factId: 'f', conditionCode: c.code, ruleId: 'INT-S2-007', direction: c.direction }));
    expect(runConflictResolution(toConflictInput('planet.sun', entries), CONFLICT_POLICY).strengthClass).toBe('neutral');
  });

  it('OWNS_KENDRA is context; OWNS_12TH is context; nodes are shadow', () => {
    const jup = functionalConditions('Jupiter', getFunctionalNature(6, PlanetSymbol.JUPITER)); // Virgo: 4 + 7
    expect(jup.find((c) => c.code === 'OWNS_KENDRA')?.direction).toBe('context');
    const sun = functionalConditions('Sun', getFunctionalNature(6, PlanetSymbol.SUN)); // Virgo: 12
    expect(sun.find((c) => c.code === 'OWNS_12TH')?.direction).toBe('context');
    expect(functionalConditions('Rahu', getFunctionalNature(6, PlanetSymbol.RAHU)).map((c) => c.code)).toEqual(['SHADOW_PLANET']);
  });
});

describe('S3 house lordship', () => {
  it('golden 10th house: Aries, lord Mars in the 12th (dusthana), Rahu occupies, SAV 34 above 28', () => {
    const h = house(gS3, 10);
    expect(h).toMatchObject({ sign: 'Aries', lord: 'Mars', lordHouse: 12, lordPlacementCategories: ['dusthana'], lordCondition: 'Mars', occupants: ['Rahu'] });
    // Jupiter in the 2nd aspects the 10th (9th aspect); Ketu in the 4th aspects it (7th).
    expect(h.aspectedBy).toEqual(['Jupiter', 'Ketu']);
    expect(h.sav).toMatchObject({ bindus: 34, benchmark: 28, comparison: 'above', factId: 'sav.house.10' });
    expect(h.dispositorChain).toEqual(['Mars', 'Mercury', 'Venus']);
    expect(h.conditions.find((c) => c.conditionCode === 'LORD_IN_DUSTHANA')).toMatchObject({ factId: 'house.10.d1.lord-house', direction: 'challenges' });
    expect(codes(h)).toContain('SAV_ABOVE_28');
  });

  it('golden SAV by house (audit 03 §C) and SAV below 28', () => {
    // Signs from Cancer: 1 Cancer 32, 2 Leo 22, 6 Sagittarius 33, 7 Capricorn 26, 10 Aries 34, 11 Taurus 24.
    expect([1, 2, 6, 7, 10, 11].map((n) => house(gS3, n).sav?.bindus)).toEqual([32, 22, 33, 26, 34, 24]);
    expect(house(gS3, 2).sav?.comparison).toBe('below');
    expect(house(gS3, 2).conditions.find((c) => c.conditionCode === 'SAV_BELOW_28')).toMatchObject({ factId: 'sav.house.2', direction: 'challenges' });
    expect(house(gS3, 3).sav).toMatchObject({ bindus: 28, comparison: 'at' }); // Virgo 28
    expect(codes(house(gS3, 3))).toContain('SAV_AT_28');
  });

  it('golden 2nd house: aspects include special aspects (Saturn 3rd, Rahu 5th) and the Moon 7th', () => {
    expect(house(gS3, 2).aspectedBy).toEqual(['Moon', 'Saturn', 'Rahu']);
    expect(house(gS3, 2).occupants).toEqual(['Jupiter']);
    expect(house(gS3, 2).lordPlacementCategories).toEqual(['upachaya']); // Sun in the 11th
  });

  it('golden 11th house: lord Venus in its own house; Sun/Mercury/Venus occupy; no aspect', () => {
    const h = house(gS3, 11);
    expect(h.occupants).toEqual(['Sun', 'Mercury', 'Venus']);
    expect(h.aspectedBy).toEqual([]);
    expect(codes(h)).toEqual(expect.arrayContaining(['LORD_IN_UPACHAYA', 'LORD_IN_OWN_HOUSE', 'HOUSE_OCCUPIED', 'HOUSE_NOT_ASPECTED', 'SAV_BELOW_28']));
    expect(h.dispositorChain).toEqual(['Venus']);
  });

  it('golden 8th house (dusthana): lord Saturn in the 12th; 6th lord Jupiter in the 2nd is LORD_IN_OTHER', () => {
    expect(house(gS3, 8)).toMatchObject({ lord: 'Saturn', lordHouse: 12, lordPlacementCategories: ['dusthana'] });
    expect(codes(house(gS3, 6))).toContain('LORD_IN_OTHER');
    expect(house(gS3, 6).lordPlacementCategories).toEqual([]);
  });

  it('REF_CHART_001: 10th lord Mercury in the 8th; 8th lord Mars in the 6th (dusthana + upachaya); 1st SAV 27 below 28', () => {
    expect(house(rS3, 10)).toMatchObject({ sign: 'Gemini', lord: 'Mercury', lordHouse: 8, lordPlacementCategories: ['dusthana'], occupants: ['Jupiter'] });
    expect(house(rS3, 8)).toMatchObject({ sign: 'Aries', lord: 'Mars', lordHouse: 6, lordPlacementCategories: ['dusthana', 'upachaya'] });
    expect(house(rS3, 1).sav).toMatchObject({ bindus: 27, comparison: 'below' });
    // 5th house Capricorn: lord Saturn in it (own house), with the Moon and Rahu.
    expect(house(rS3, 5)).toMatchObject({ lord: 'Saturn', lordHouse: 5, occupants: ['Moon', 'Saturn', 'Rahu'], dispositorChain: ['Saturn'] });
    expect(codes(house(rS3, 5))).toEqual(expect.arrayContaining(['LORD_IN_TRIKONA', 'LORD_IN_OWN_HOUSE']));
  });

  it('SAV totals 337 over the twelve houses (internal consistency)', () => {
    expect(gS3.reduce((s, h) => s + (h.sav?.bindus ?? 0), 0)).toBe(337);
    expect(rS3.reduce((s, h) => s + (h.sav?.bindus ?? 0), 0)).toBe(337);
  });
});

describe('S5 divisional synthesis', () => {
  it('golden: D10 Jupiter debilitated link (planet-d10-dignity) carries D10_DEBILITATED', () => {
    const links = runS5DivisionalSynthesis(golden, EMPTY_FACTS, { planets: gS2 });
    const j = links.find((l) => l.id === 's5.planet-d10-dignity.jupiter')!;
    expect(j).toMatchObject({ kind: 'planet-d10-dignity', planet: 'Jupiter', varga: 'D10', d1: { sign: 'Leo', house: 2 }, divisional: { sign: 'Capricorn', house: 9, dignity: 'DEBILITATED' }, agreement: null });
    expect(j.conditions).toEqual([{ factId: 'planet.jupiter.d10.dignity', conditionCode: 'D10_DEBILITATED', ruleId: 'INT-S5-004', direction: 'challenges' }]);
  });

  it('golden: key career planets = 10th lord Mars, D10 Lagna lord Venus (also AmK), D10 10th lord Saturn, Sun, Jupiter', () => {
    expect(keyCareerPlanets(golden)).toEqual(['Sun', 'Mars', 'Jupiter', 'Venus', 'Saturn']);
  });

  it('golden: 10th lord Mars in D10 Aquarius = D10 10th house (kendra); D1 12th vs D10 10th differ', () => {
    // Mars Gemini 26.16° (odd → from Gemini), part 8 → 9th sign from Gemini = Aquarius; D10 Lagna Taurus → 10th.
    const links = runS5DivisionalSynthesis(golden, EMPTY_FACTS, { planets: gS2 });
    const h = links.find((l) => l.kind === 'tenth-lord-d10-house')!;
    expect(h).toMatchObject({ id: 's5.tenth-lord-d10-house.mars', planet: 'Mars', d1: { sign: 'Gemini', house: 12 }, divisional: { sign: 'Aquarius', house: 10 }, agreement: false });
    expect(codes(h)).toEqual(['D10_LORD_IN_KENDRA', 'D10_LORD_IN_UPACHAYA', 'D1_D10_DIFFER']);
    const d = links.find((l) => l.kind === 'tenth-lord-d10-dignity')!;
    expect(d.divisional?.dignity).toBe('NONE');
    expect(d.conditions).toEqual([]);
  });

  it('golden: D10 Lagna lord Venus in D10 Virgo (5th, trikona) debilitated; same-lord links false', () => {
    const links = runS5DivisionalSynthesis(golden, EMPTY_FACTS, { planets: gS2 });
    const a = links.find((l) => l.kind === 'd10-ascendant-lord')!;
    expect(a).toMatchObject({ planet: 'Venus', divisional: { sign: 'Virgo', house: 5, dignity: 'DEBILITATED' } });
    expect(codes(a)).toEqual(['D10_LORD_IN_TRIKONA', 'D10_DEBILITATED']);
    // 1st: Moon (Cancer) vs Venus (Taurus); 10th: Mars (Aries) vs Saturn (Aquarius).
    const same = links.filter((l) => l.kind === 'same-lord-d1-d10');
    expect(same.map((l) => [l.id, l.agreement])).toEqual([['s5.same-lord-d1-d10.house-1', false], ['s5.same-lord-d1-d10.house-10', false]]);
    expect(links.filter((l) => l.kind === 'vargottama' && l.agreement)).toEqual([]);
  });

  it('REF_CHART_001: vargottama Moon and Saturn; D10 Lagna lord Venus own sign in the D10 1st', () => {
    const links = runS5DivisionalSynthesis(ref, EMPTY_FACTS, { planets: rS2 });
    expect(links.filter((l) => l.kind === 'vargottama' && l.agreement).map((l) => l.planet)).toEqual(['Moon', 'Saturn']);
    const sat = links.find((l) => l.id === 's5.vargottama.saturn')!;
    expect(sat.conditions).toEqual([{ factId: 'planet.saturn.vargottama', conditionCode: 'VARGOTTAMA', ruleId: 'INT-S5-001', direction: 'supports' }]);
    const a = links.find((l) => l.kind === 'd10-ascendant-lord')!;
    expect(a).toMatchObject({ planet: 'Venus', divisional: { sign: 'Taurus', house: 1, dignity: 'OWN_SIGN' } });
    expect(codes(a)).toEqual(['D10_LORD_IN_KENDRA', 'D10_LORD_IN_TRIKONA', 'D10_OWN_SIGN']);
    // 10th lord Mercury: D1 8th, D10 Leo = 4th from Taurus.
    expect(links.find((l) => l.kind === 'tenth-lord-d10-house')).toMatchObject({ planet: 'Mercury', d1: { house: 8 }, divisional: { sign: 'Leo', house: 4 }, agreement: false });
  });

  it('no D10 → only D9 vargottama links', () => {
    const links = runS5DivisionalSynthesis({ ...golden, vargas: { D1: golden.vargas.D1, D9: golden.vargas.D9 } }, EMPTY_FACTS, { planets: gS2 });
    expect(new Set(links.map((l) => l.kind))).toEqual(new Set(['vargottama']));
    expect(links).toHaveLength(9);
  });
});

describe('fact IDs and determinism', () => {
  it('every factId is a core registry ID or a documented new A2 fact (registry grammar)', () => {
    for (const [input, s2] of [[golden, gS2], [ref, rS2]] as const) {
      const core = coreFactIds(input);
      const s1 = runS1ChartValidation(input, EMPTY_FACTS);
      const s3 = runS3HouseLordship(input, EMPTY_FACTS, { planets: s2 });
      const s5 = runS5DivisionalSynthesis(input, EMPTY_FACTS, { planets: s2 });
      const ids = new Set<string>([
        ...s1.conditions.map((c) => c.factId),
        ...s1.boundaries.flatMap((b) => b.factIds),
        ...s2.flatMap((p) => [...p.factIds, ...p.conditions.map((c) => c.factId)]),
        ...s3.flatMap((h) => [...h.factIds, ...h.conditions.map((c) => c.factId)]),
        ...s5.flatMap((l) => [...l.factIds, ...l.conditions.map((c) => c.factId)]),
      ]);
      for (const id of ids) {
        expect(REGISTRY_ID_PATTERN.test(id), id).toBe(true);
        expect(core.has(id) || NEW_FACT_PATTERNS.some((re) => re.test(id)), id).toBe(true);
      }
      // Every condition factId is also listed in the item's factIds.
      for (const item of [...s2, ...s3, ...s5]) for (const c of item.conditions) expect(item.factIds).toContain(c.factId);
    }
  });

  it('with the full registry present, preferred IDs are used (no fallback)', () => {
    const all = new Set([...coreFactIds(golden), 'house.10.d1.aspected-by', 'planet.jupiter.d1.functional-nature']);
    const s3 = runS3HouseLordship(golden, factView(all), { planets: gS2 });
    expect(house(s3, 10).factIds).toContain('house.10.d1.aspected-by');
    const s3career = runS3HouseLordship(golden, factView([...coreFactIds(golden), 'career.house.10.aspected-by']), { planets: gS2 });
    expect(house(s3career, 10).factIds).toContain('career.house.10.aspected-by');
  });

  it('stages are pure: identical input → identical output', () => {
    const a = JSON.stringify([runS1ChartValidation(golden, EMPTY_FACTS), runS2PlanetCondition(golden, EMPTY_FACTS)]);
    const b = JSON.stringify([runS1ChartValidation(golden, EMPTY_FACTS), runS2PlanetCondition(golden, EMPTY_FACTS)]);
    expect(a).toBe(b);
    const s5a = JSON.stringify(runS5DivisionalSynthesis(golden, EMPTY_FACTS, { planets: gS2 }));
    expect(JSON.stringify(runS5DivisionalSynthesis(golden, EMPTY_FACTS, { planets: gS2 }))).toBe(s5a);
  });
});

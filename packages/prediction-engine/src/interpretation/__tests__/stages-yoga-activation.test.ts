/**
 * S4 yoga assessment and S6 activation.
 *
 * Fixtures are built from the astrology engine (no report-engine import):
 *   - Golden chart: Apeksha Singh, 08 Jun 2004 08:30 IST, Akbarpur (Ambedkar Nagar) 26.4295 N,
 *     82.5343 E (decision 1: may be committed as a test fixture). asOf 2026-11-20.
 *   - Chart B: REF_CHART_001, 15 May 1990 14:30 IST, Delhi 28.6139 N, 77.2090 E.
 *
 * Independent expectations (from the audit hand-checks, audit 04 §3 / audit 05 §1b, and the
 * classical tables) are marked "independent". Expectations that only restate the rule table are
 * marked "internal consistency".
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  AshtakavargaCalculator,
  ChartCalculator,
  DEFAULT_ASTROLOGY_CONFIG,
  DashaCalculator,
  PlanetSymbol,
  SadeSatiPeriodsCalculator,
  ShadbalaCalculator,
  TransitIngressSolver,
  VargaCalculator,
  YogaCalculator,
  getFunctionalNature,
  normalizeAstroChart,
  type AstroChart,
  type NormalizedChart,
  type VargaChart,
  type VargaType,
} from '@astro/astrology-engine';
import type { FactItem, FactView, InterpretationInput, ShadbalaInput, TransitSignPeriod } from '../input';
import { deriveLifeStage } from '../input';
import {
  PLANET_NAMES,
  type Activation,
  type ConditionEntry,
  type DashaActivation,
  type FunctionalNature,
  type HouseCategory,
  type MdAdPositionActivation,
  type PlanetCondition,
  type PlanetName,
  type SaturnFromMoonActivation,
  type TransitOverNatalActivation,
  type VargaSignDignity,
  type YogaAssessment,
} from '../types';
import { REGISTRY_ID_PATTERN } from '../ids';
import { runS4YogaAssessment, yogaFactId } from '../stages/yoga-assessment';
import { LIFE_STAGE_HORIZON_AGE, S6_RULES, runS6Activation, signCount } from '../stages/activation';
import {
  ENGINE_FLAG_RULES,
  S4_RULES,
  YOGA_FACTOR_RULES,
  applicableFactorRule,
  yogaFamily,
} from '../rules/yoga-rules';
import { InterpretationRuleSchema } from '../schema';

// ---------------------------------------------------------------------------
// Fixture builder (engine only)
// ---------------------------------------------------------------------------

interface Birth {
  date: { year: number; month: number; day: number };
  time: { hour: number; minute: number; second: number };
  timezone: string;
  latitude: number;
  longitude: number;
  dateOfBirth: string;
  timeOfBirth: string;
}

const GOLDEN: Birth = {
  date: { year: 2004, month: 6, day: 8 },
  time: { hour: 8, minute: 30, second: 0 },
  timezone: 'Asia/Kolkata',
  latitude: 26.4295,
  longitude: 82.5343,
  dateOfBirth: '2004-06-08',
  timeOfBirth: '08:30',
};

const CHART_B: Birth = {
  date: { year: 1990, month: 5, day: 15 },
  time: { hour: 14, minute: 30, second: 0 },
  timezone: 'Asia/Kolkata',
  latitude: 28.6139,
  longitude: 77.209,
  dateOfBirth: '1990-05-15',
  timeOfBirth: '14:30',
};

const AS_OF = '2026-11-20T00:00:00.000Z';

const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const name = (s: string): PlanetName => PLANET_NAMES.find((p) => p.toLowerCase() === s.toLowerCase()) as PlanetName;

/** Same algorithm as report-engine `computeSignPeriods` (not imported: no package cycle). */
async function signPeriods(planet: PlanetSymbol, fromIso: string, years: number): Promise<TransitSignPeriod[]> {
  const solver = new TransitIngressSolver();
  const msToJd = (ms: number) => ms / 86400000 + 2440587.5;
  const startJd = msToJd(Date.parse(fromIso));
  const endJd = startJd + years * 365.25;
  const initial = await solver.getPlanetaryState(planet, startJd);
  const events = await solver.findSignIngresses(planet, startJd, endJd);
  const out: TransitSignPeriod[] = [];
  let cur = initial.rashiIndex;
  let start = fromIso;
  let retro = false;
  for (const ev of events) {
    out.push({ planet: String(planet), sign: SIGNS[cur - 1], signIndex: cur, startIso: start, endIso: ev.timestampIso, enteredRetrograde: retro });
    const to = ev.toSign!.index;
    retro = to === cur - 1 || (cur === 1 && to === 12);
    cur = to;
    start = ev.timestampIso;
  }
  out.push({ planet: String(planet), sign: SIGNS[cur - 1], signIndex: cur, startIso: start, endIso: new Date((endJd - 2440587.5) * 86400000).toISOString(), enteredRetrograde: retro });
  return out;
}

const EXALT: Partial<Record<PlanetName, number>> = { Sun: 1, Moon: 2, Mars: 10, Mercury: 6, Jupiter: 4, Venus: 12, Saturn: 7 };
const OWN: Partial<Record<PlanetName, number[]>> = { Sun: [5], Moon: [4], Mars: [1, 8], Mercury: [3, 6], Jupiter: [9, 12], Venus: [2, 7], Saturn: [10, 11] };

/** Sign-based varga dignity (CAR-002): exalted > debilitated > own sign. */
function vargaSignDignity(p: PlanetName, sign: number): VargaSignDignity {
  const ex = EXALT[p];
  if (ex === undefined) return 'NONE';
  if (sign === ex) return 'EXALTED';
  if (sign === ((ex + 5) % 12) + 1) return 'DEBILITATED';
  if ((OWN[p] ?? []).includes(sign)) return 'OWN_SIGN';
  return 'NONE';
}

/**
 * Test-only S2 stand-in (A2 owns the real `runS2PlanetCondition`). Fills only what S4/S6 read.
 */
function planetConditions(natal: NormalizedChart, vargas: Partial<Record<VargaType, VargaChart>>, shadbala: Partial<Record<PlanetName, ShadbalaInput>>): PlanetCondition[] {
  const sun = natal.planets.find((p) => p.name === PlanetSymbol.SUN)!;
  const d9 = vargas.D9!;
  return natal.planets.map((np) => {
    const planet = name(String(np.name));
    const k = planet.toLowerCase();
    const d9pl = Object.values(d9.placements).find((pl) => String(pl.planet) === String(np.name))!;
    const fn = getFunctionalNature(natal.ascendant.rashiIndex, np.name);
    const cats: HouseCategory[] = [];
    if ([1, 4, 7, 10].includes(np.house)) cats.push('kendra');
    if ([1, 5, 9].includes(np.house)) cats.push('trikona');
    if ([6, 8, 12].includes(np.house)) cats.push('dusthana');
    if ([3, 6, 10, 11].includes(np.house)) cats.push('upachaya');
    const sep = Math.abs(((np.absoluteDegree - sun.absoluteDegree + 540) % 360) - 180);
    const sb = shadbala[planet];
    const conditions: ConditionEntry[] = [
      { factId: `planet.${k}.d1.dignity`, conditionCode: np.dignity === 'DEBILITATED' ? 'DEBILITATED' : 'NEUTRAL_SIGN', ruleId: 'TEST-S2', direction: np.dignity === 'DEBILITATED' ? 'challenges' : 'context' },
    ];
    if (np.combust) conditions.push({ factId: `planet.${k}.d1.combust`, conditionCode: 'COMBUST', ruleId: 'TEST-S2', direction: 'challenges' });
    const pc: PlanetCondition = {
      planet,
      sign: np.sign,
      house: np.house,
      degree: np.degree,
      dignity: { value: np.dignity, definition: 'dignity.d1.compound', factId: `planet.${k}.d1.dignity` },
      vargaDignity: {
        d9: { varga: 'D9', sign: SIGNS[d9pl.rashiIndex - 1], house: d9pl.house ?? null, value: vargaSignDignity(planet, d9pl.rashiIndex), definition: 'dignity.varga.sign', factIds: [`planet.${k}.d9.sign`] },
      },
      combustion: planet === 'Sun' || planet === 'Rahu' || planet === 'Ketu' ? null : { combust: np.combust, distanceDeg: Number(sep.toFixed(4)), orbDeg: null, factId: `planet.${k}.d1.combust` },
      retrograde: np.retrograde,
      vargottama: d9pl.rashiIndex === np.rashiIndex,
      functionalNature: { value: fn.nature as FunctionalNature, lordships: fn.lordships, reason: fn.reason, rule: { ruleId: 'TEST-S2', source: 'test', status: 'provisional' } },
      yogakaraka: { value: fn.isYogakaraka, basis: 'ownership' },
      houseCategories: cats,
      dispositor: name(String(natal.houses.find((h) => h.rashiIndex === np.rashiIndex)!.lord)),
      conditions,
      factIds: [`planet.${k}.d1.sign`, `planet.${k}.d1.house`],
    };
    if (sb) {
      const ratio = sb.totalRupas / sb.requiredRupas;
      pc.shadbala = { totalRupas: sb.totalRupas, requiredRupas: sb.requiredRupas, ratio, meetsRequired: ratio >= 1, provisional: true, rule: { ruleId: 'TEST-S2', source: 'BPHS ch. 27', status: 'provisional' } };
    }
    return pc;
  });
}

interface Fixture {
  input: InterpretationInput;
  planets: PlanetCondition[];
}

async function buildFixture(b: Birth, opts: { sadeSati: boolean; shadbala: boolean }): Promise<Fixture> {
  const raw: AstroChart = await new ChartCalculator().calculateChart(
    { date: b.date, time: b.time, timezone: b.timezone, latitude: b.latitude, longitude: b.longitude },
    DEFAULT_ASTROLOGY_CONFIG,
  );
  const natal = normalizeAstroChart(raw);
  const vc = new VargaCalculator();
  const vargas: Partial<Record<VargaType, VargaChart>> = {};
  for (const v of ['D1', 'D9', 'D10'] as VargaType[]) vargas[v] = vc.calculateVarga(raw, v);
  const vimshottari = new DashaCalculator().calculateForChart(raw, { maxLevel: 2, targetDate: new Date(AS_OF) });
  const ashtakavarga = new AshtakavargaCalculator().calculate(raw);
  const report = new YogaCalculator().evaluateYogas(raw);
  const yogas = [...(report.detectedYogas ?? []), ...(report.formedButCancelledYogas ?? [])];
  const shadbala: Partial<Record<PlanetName, ShadbalaInput>> = {};
  if (opts.shadbala) {
    const sb = new ShadbalaCalculator().calculate(raw);
    for (const p of Object.values(sb.planets)) {
      if (p) shadbala[name(String(p.planet))] = { totalRupas: p.totalRupas, requiredRupas: p.minimumRequirementRupas };
    }
  }
  const transits = {
    JUPITER: await signPeriods(PlanetSymbol.JUPITER, AS_OF, 12),
    SATURN: await signPeriods(PlanetSymbol.SATURN, AS_OF, 12),
  };
  const moon = natal.planets.find((p) => p.name === PlanetSymbol.MOON)!;
  const input: InterpretationInput = {
    snapshotId: 'test',
    subject: { dateOfBirth: b.dateOfBirth, timeOfBirth: b.timeOfBirth, latitude: b.latitude, longitude: b.longitude, timezone: b.timezone },
    engineVersion: 'test',
    conventions: {},
    conventionsProvisional: true,
    asOfIso: AS_OF,
    natal,
    vargas,
    vimshottari,
    ashtakavarga,
    yogas,
    transits,
  };
  if (opts.shadbala) input.shadbala = shadbala;
  if (opts.sadeSati) {
    input.sadeSati = await new SadeSatiPeriodsCalculator().calculate({ natalMoonLongitude: moon.absoluteDegree, startIso: AS_OF, endIso: '2038-11-20T00:00:00.000Z' });
  }
  return { input, planets: planetConditions(natal, vargas, opts.shadbala ? shadbala : {}) };
}

const emptyFacts: FactView = {
  has: () => false,
  get: (): FactItem | undefined => undefined,
  resolve: () => [],
};

const byId = (ys: YogaAssessment[], id: string): YogaAssessment => {
  const y = ys.find((x) => x.yogaId === id);
  if (!y) throw new Error(`yoga ${id} not assessed; got ${ys.map((x) => x.yogaId).join(', ')}`);
  return y;
};
const has = (y: YogaAssessment, planet: PlanetName, code: string, direction?: 'support' | 'weaken') =>
  y.strengthFactors.some((f) => f.planet === planet && f.conditionCode === code && (!direction || f.direction === direction));

const dashas = (a: Activation[]) => a.filter((x): x is DashaActivation => x.kind === 'dasha');

// ---------------------------------------------------------------------------
// Rule table
// ---------------------------------------------------------------------------

describe('yoga rule table (rules/yoga-rules.ts)', () => {
  it('every S4 and S6 rule is a schema-valid InterpretationRule with a source', () => {
    for (const r of [...S4_RULES, ...S6_RULES]) {
      expect(() => InterpretationRuleSchema.parse(r)).not.toThrow();
      expect(r.sources[0].length).toBeGreaterThan(10);
    }
    const ids = [...S4_RULES, ...S6_RULES].map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no factor row is approved (all provisional or pending-client until client sign-off)', () => {
    for (const r of YOGA_FACTOR_RULES) expect(['provisional', 'pending-client']).toContain(r.status);
    for (const r of ENGINE_FLAG_RULES) expect(r.status).not.toBe('approved');
  });

  it('family-specific rows override generic rows (internal consistency)', () => {
    expect(applicableFactorRule('gajakesari', 'Jupiter', 'D1_ENEMY_SIGN')?.tier).toBe('major');
    expect(applicableFactorRule('gajakesari', 'Moon', 'D1_ENEMY_SIGN')?.tier).toBe('minor');
    expect(applicableFactorRule('viparita', 'Saturn', 'IN_DUSTHANA')).toBeUndefined();
    expect(applicableFactorRule('dhana', 'Venus', 'JOINED_WITH_8TH_OR_11TH_LORD')).toBeUndefined();
  });

  it('maps engine ids to families', () => {
    expect(yogaFamily('YOGA_RAJA_H10_H5')).toBe('raja');
    expect(yogaFamily('YOGA_DHARMA_KARMADHIPATI')).toBe('raja');
    expect(yogaFamily('YOGA_VESI')).toBe('solar-flank');
    expect(yogaFamily('YOGA_SARALA')).toBe('viparita');
    expect(yogaFamily('YOGA_NABHASA_KEDARA')).toBe('nabhasa');
    expect(yogaFamily('YOGA_AMALA')).toBe('amala');
    expect(applicableFactorRule('amala', 'Jupiter', 'IN_KENDRA_OR_TRIKONA')).toBeUndefined();
    expect(applicableFactorRule('mahapurusha', 'Venus', 'D1_OWN_EXALTED_MT')).toBeUndefined();
    expect(yogaFactId('YOGA_RAJA_H10_H5')).toBe('yoga.raja-h10-h5');
  });
});

// ---------------------------------------------------------------------------
// Golden chart
// ---------------------------------------------------------------------------

describe('golden chart (Apeksha Singh) — S4 yoga assessment', () => {
  let fx: Fixture;
  let yogas: YogaAssessment[];

  beforeAll(async () => {
    fx = await buildFixture(GOLDEN, { sadeSati: true, shadbala: true });
    yogas = runS4YogaAssessment(fx.input, emptyFacts, { planets: fx.planets });
  }, 120_000);

  it('assesses the 8 detected yogas plus formed-but-cancelled Kemadruma; never the one-way Raja 7+9', () => {
    const ids = yogas.map((y) => y.yogaId).sort();
    expect(ids).toEqual(
      ['YOGA_BUDHA_ADITYA', 'YOGA_DHANA_H2_H11', 'YOGA_GAJAKESARI', 'YOGA_KEMADRUMA', 'YOGA_NABHASA_KEDARA', 'YOGA_RAJA_H10_H5', 'YOGA_RAJA_H1_H9', 'YOGA_RAJA_H7_H5', 'YOGA_SARALA', 'YOGA_VESI'].sort(),
    );
    for (const y of yogas) {
      expect(y.formed).toBe(true);
      expect(y.provisional).toBe(true);
      expect(y.factId).toMatch(REGISTRY_ID_PATTERN);
      for (const f of y.strengthFactors) for (const id of f.factIds) expect(id).toMatch(REGISTRY_ID_PATTERN);
    }
  });

  it('Gajakesari: moderate–weak; the Moon is the weak pillar (independent: audit 04 §3)', () => {
    const y = byId(yogas, 'YOGA_GAJAKESARI');
    expect(['moderate', 'weak']).toContain(y.yogaClass);
    expect(y.formation.keyPlanets).toEqual(['Moon', 'Jupiter']);
    // Moon: 8th house, enemy sign, waning, Shadbala below the BPHS minimum.
    expect(has(y, 'Moon', 'IN_DUSTHANA', 'weaken')).toBe(true);
    expect(has(y, 'Moon', 'ENEMY_SIGN', 'weaken')).toBe(true);
    expect(y.strengthFactors.some((f) => f.planet === 'Moon' && f.kind === 'paksha' && f.direction === 'weaken')).toBe(true);
    expect(has(y, 'Moon', 'SHADBALA_BELOW_REQUIRED', 'weaken')).toBe(true);
    // Jupiter: none of the BPHS qualifiers holds; great-friend sign supports.
    expect(has(y, 'Jupiter', 'DEBILITATED')).toBe(false);
    expect(has(y, 'Jupiter', 'COMBUST')).toBe(false);
    expect(has(y, 'Jupiter', 'GREAT_FRIEND_SIGN', 'support')).toBe(true);
    expect(y.yogaClass).not.toBe('strong');
  });

  it('Budha-Aditya: weak–moderate; Mercury combust at ~12.6° within the provisional 14° orb (independent: audit 04 §3)', () => {
    const y = byId(yogas, 'YOGA_BUDHA_ADITYA');
    expect(['weak', 'moderate']).toContain(y.yogaClass);
    const c = y.strengthFactors.find((f) => f.planet === 'Mercury' && f.kind === 'combustion');
    expect(c?.direction).toBe('weaken');
    expect(c?.tier).toBe('major');
    expect(c?.rule.ruleId).toBe('INT-YF-201');
    expect(typeof c?.observed).toBe('number');
    expect(c!.observed as number).toBeGreaterThan(12);
    expect(c!.observed as number).toBeLessThan(14);
    expect(has(y, 'Sun', 'GREAT_ENEMY_SIGN', 'weaken')).toBe(true);
  });

  it('Vesi: malefic (papa) variant modifier; occupants Mars and Saturn (independent: BPHS ch. 38)', () => {
    const y = byId(yogas, 'YOGA_VESI');
    expect(y.modifiers.map((m) => m.code)).toContain('YOGA_MALEFIC_OCCUPANT');
    expect(y.modifiers.map((m) => m.code)).not.toContain('YOGA_BENEFIC_OCCUPANT');
    expect(y.formation.keyPlanets).toEqual(expect.arrayContaining(['Mars', 'Saturn']));
    expect(y.conditions.find((c) => c.conditionCode === 'YOGA_MALEFIC_OCCUPANT')?.direction).toBe('context');
    expect(y.yogaClass).not.toBe('strong');
  });

  it('Sarala: conditional results (Saturn also rules the 7th; joined with Mars) and weak–moderate (independent: audit 04 §3)', () => {
    const y = byId(yogas, 'YOGA_SARALA');
    expect(['weak', 'moderate']).toContain(y.yogaClass);
    const mods = y.modifiers.map((m) => m.code);
    expect(mods).toContain('YOGA_DUAL_LORDSHIP');
    expect(mods).toContain('YOGA_DUSTHANA_LORD_ASSOCIATION');
    // Dusthana placement is the formation of a Viparita yoga, never a weakening factor here.
    expect(has(y, 'Saturn', 'IN_DUSTHANA')).toBe(false);
  });

  it('Raja 10+5 (Mars Yogakaraka by ownership): weak — 12th house, joined with the 8th lord Saturn (independent: audit 04 §3)', () => {
    const y = byId(yogas, 'YOGA_RAJA_H10_H5');
    expect(y.formation.relation).toBe('ownership');
    expect(y.conditions.map((c) => c.conditionCode)).toContain('YOGAKARAKA_BY_OWNERSHIP');
    expect(y.yogaClass).toBe('weak');
    expect(has(y, 'Mars', 'IN_DUSTHANA', 'weaken')).toBe(true);
    const assoc = y.strengthFactors.find((f) => f.conditionCode === 'YOGA_DUSTHANA_LORD_ASSOCIATION');
    expect(assoc?.planet).toBe('Mars');
    expect(String(assoc?.observed)).toContain('Saturn');
    expect(y.classTrace.some((t) => t.startsWith('D2 weak'))).toBe(true);
  });

  it('Raja 7+5 (Saturn + Mars conjunct) and Raja 1+9 are not strong', () => {
    expect(byId(yogas, 'YOGA_RAJA_H7_H5').formation.relation).toBe('conjunction');
    expect(byId(yogas, 'YOGA_RAJA_H7_H5').yogaClass).toBe('weak');
    expect(byId(yogas, 'YOGA_RAJA_H1_H9').formation.relation).toBe('mutual-aspect');
    expect(['weak', 'moderate']).toContain(byId(yogas, 'YOGA_RAJA_H1_H9').yogaClass);
  });

  it('Dhana 2+11 (Sun + Venus): moderate at best — Venus own sign but deeply combust (independent: audit 04 §3)', () => {
    const y = byId(yogas, 'YOGA_DHANA_H2_H11');
    expect(y.yogaClass).toBe('moderate');
    expect(has(y, 'Venus', 'OWN_SIGN', 'support')).toBe(true);
    const c = y.strengthFactors.find((f) => f.planet === 'Venus' && f.conditionCode === 'COMBUST');
    expect(c?.tier).toBe('major');
    expect(c!.observed as number).toBeLessThan(1);
  });

  it('Kemadruma: formed and cancelled by a kendra from the Moon (independent: audit 04 §3)', () => {
    const y = byId(yogas, 'YOGA_KEMADRUMA');
    expect(y.yogaClass).toBe('cancelled');
    expect(y.cancellations.find((c) => c.id === 'KEMADRUMA_BHANGA_KENDRA_FROM_MOON')?.satisfied).toBe(true);
    expect(y.conditions.map((c) => c.conditionCode)).toContain('YOGA_CANCELLED');
    expect(y.strengthFactors).toEqual([]);
  });

  it('no golden yoga is strong (audit 04 §3: "none is unambiguously strong")', () => {
    for (const y of yogas) expect(y.yogaClass).not.toBe('strong');
  });

  it('activation: Jupiter-formed yogas are active in the current Jupiter MD; Saturn ones in the current Saturn AD', () => {
    const gk = byId(yogas, 'YOGA_GAJAKESARI');
    const md = gk.activations.find((a) => a.planet === 'Jupiter' && a.level === 'mahadasha' && a.isCurrent);
    expect(md?.startIso.slice(0, 7)).toBe('2024-10');
    expect(md?.endIso.slice(0, 7)).toBe('2040-10');
    expect(gk.conditions.map((c) => c.conditionCode)).toContain('YOGA_ACTIVE_MAHADASHA');
    const sarala = byId(yogas, 'YOGA_SARALA');
    expect(sarala.activations.some((a) => a.planet === 'Saturn' && a.level === 'antardasha' && a.isCurrent)).toBe(true);
    // Dhana via Venus/Sun: the Venus MD is decades away (2083).
    const dhana = byId(yogas, 'YOGA_DHANA_H2_H11');
    expect(dhana.activations.find((a) => a.planet === 'Venus' && a.level === 'mahadasha')?.startIso.slice(0, 4)).toBe('2083');
  });

  it('is deterministic', () => {
    const again = runS4YogaAssessment(fx.input, emptyFacts, { planets: fx.planets });
    expect(JSON.stringify(again)).toBe(JSON.stringify(yogas));
  });

  it('degrades without Shadbala: no Shadbala factors, and "strong" is blocked by unknown Shadbala', async () => {
    const noSb = await buildFixture(GOLDEN, { sadeSati: false, shadbala: false });
    const ys = runS4YogaAssessment(noSb.input, emptyFacts, { planets: noSb.planets });
    for (const y of ys) expect(y.strengthFactors.some((f) => f.kind === 'shadbala-ratio')).toBe(false);
    expect(byId(ys, 'YOGA_RAJA_H10_H5').yogaClass).toBe('weak');
    expect(byId(ys, 'YOGA_KEMADRUMA').yogaClass).toBe('cancelled');
  }, 120_000);

  it('works on YogaResults without the optional engine `assessment` field', () => {
    const stripped: InterpretationInput = { ...fx.input, yogas: fx.input.yogas.filter((y) => y.isDetected).map(({ assessment: _a, ...rest }) => rest) };
    const ys = runS4YogaAssessment(stripped, emptyFacts, { planets: fx.planets });
    const vesi = byId(ys, 'YOGA_VESI');
    expect(vesi.modifiers.map((m) => m.code)).toContain('YOGA_MALEFIC_OCCUPANT'); // computed variant
    const sarala = byId(ys, 'YOGA_SARALA');
    expect(sarala.modifiers.map((m) => m.code)).toContain('YOGA_DUAL_LORDSHIP');
    expect(sarala.modifiers.map((m) => m.code)).toContain('YOGA_DUSTHANA_LORD_ASSOCIATION'); // conjunction fallback
    expect(byId(ys, 'YOGA_RAJA_H10_H5').yogaClass).toBe('weak');
  });
});

describe('golden chart — S6 activation', () => {
  let fx: Fixture;
  let acts: Activation[];

  beforeAll(async () => {
    fx = await buildFixture(GOLDEN, { sadeSati: true, shadbala: true });
    const yogas = runS4YogaAssessment(fx.input, emptyFacts, { planets: fx.planets });
    acts = runS6Activation(fx.input, emptyFacts, { planets: fx.planets, yogas, lifeStage: deriveLifeStage(fx.input) });
  }, 120_000);

  it('current MD Jupiter (rules 6, 9; in the 2nd) and AD Saturn (rules 7, 8; in the 12th) with yogas (independent: audit 05 §1b)', () => {
    const cur = dashas(acts).filter((a) => a.isCurrent);
    const md = cur.find((a) => a.level === 'mahadasha')!;
    const ad = cur.find((a) => a.level === 'antardasha')!;
    expect(md.lord).toBe('Jupiter');
    expect(md.housesRuled).toEqual([6, 9]);
    expect(md.houseOccupied).toBe(2);
    expect(md.yogasActivated).toEqual(expect.arrayContaining(['YOGA_GAJAKESARI', 'YOGA_RAJA_H1_H9']));
    expect(md.ageAtStart).toBe(20);
    expect(ad.lord).toBe('Saturn');
    expect(ad.parentLord).toBe('Jupiter');
    expect(ad.housesRuled).toEqual([7, 8]);
    expect(ad.houseOccupied).toBe(12);
    expect(ad.yogasActivated).toEqual(expect.arrayContaining(['YOGA_SARALA', 'YOGA_VESI', 'YOGA_RAJA_H7_H5']));
    expect(ad.yogasActivated).not.toContain('YOGA_KEMADRUMA');
    // Jupiter–Saturn AD: 2026-11-19T21:17Z → 2029-06-02 (audit 05 engine check).
    expect(ad.startIso.slice(0, 10)).toBe('2026-11-19');
    expect(ad.endIso.slice(0, 10)).toBe('2029-06-02');
    expect(ad.id).toBe('s6.dasha.ad.jupiter.saturn');
    expect(ad.conditions.map((c) => c.conditionCode)).toEqual(expect.arrayContaining(['AD_LORD', 'PERIOD_LORD_RULES_HOUSE', 'PERIOD_LORD_OCCUPIES_HOUSE', 'YOGA_ACTIVE_ANTARDASHA']));
  });

  it('MD–AD mutual position is a fact only (Saturn is the 11th from Jupiter; Jupiter the 3rd from Saturn)', () => {
    const pos = acts.find((a): a is MdAdPositionActivation => a.kind === 'md-ad-position' && a.isCurrent)!;
    expect(pos.mdLord).toBe('Jupiter');
    expect(pos.adLord).toBe('Saturn');
    expect(pos.adFromMd).toBe(11);
    expect(pos.mdFromAd).toBe(3);
    expect(pos.conditions.every((c) => c.direction === 'context')).toBe(true);
    expect(pos.rule.ruleId).toBe('INT-A-002');
  });

  it('life-stage gating: Venus MD 2083+ is tagged at age 79, never dropped; Jupiter MD is not gated', () => {
    const mds = dashas(acts).filter((a) => a.level === 'mahadasha');
    expect(mds.length).toBe(fx.input.vimshottari.mahadashas.length);
    const venus = mds.find((a) => a.lord === 'Venus')!;
    expect(venus.startIso.slice(0, 4)).toBe('2083');
    expect(venus.ageAtStart).toBe(79);
    expect(venus.conditions.map((c) => c.conditionCode)).toContain('LIFE_STAGE_GATED');
    const jup = mds.find((a) => a.lord === 'Jupiter')!;
    expect(jup.conditions.map((c) => c.conditionCode)).not.toContain('LIFE_STAGE_GATED');
    for (const m of mds) {
      expect(m.conditions.some((c) => c.conditionCode === 'LIFE_STAGE_GATED')).toBe(m.ageAtStart >= LIFE_STAGE_HORIZON_AGE);
    }
  });

  it('reports ADs of the current and next MD only from asOf on (none of the past)', () => {
    const ads = dashas(acts).filter((a) => a.level === 'antardasha');
    expect(ads.every((a) => Date.parse(a.endIso) > Date.parse(AS_OF))).toBe(true);
    expect(new Set(ads.map((a) => a.parentLord))).toEqual(new Set(['Jupiter', 'Saturn']));
    expect(ads.filter((a) => a.parentLord === 'Saturn').length).toBe(9);
  });

  it('Saturn transits Pisces = the 9th from the Cancer Lagna at 2026-11-20 (NOT the 12th; audit 05 F2)', () => {
    const sat = acts.find((a): a is TransitOverNatalActivation => a.kind === 'transit-over-natal' && a.planet === 'Saturn' && a.isCurrent)!;
    expect(sat.sign).toBe('Pisces');
    expect(sat.houseFromAsc).toBe(9);
    expect(sat.houseFromAsc).not.toBe(12);
    expect(sat.houseFromMoon).toBe(2);
    expect(sat.factIds).toContain('transit.saturn.01');
  });

  it('Saturn-from-Moon: the 2nd from the Aquarius Moon = last Sade Sati segment, neutral fact (engine sade-sati-periods)', () => {
    const cur = acts.find((a): a is SaturnFromMoonActivation => a.kind === 'saturn-from-moon' && a.isCurrent)!;
    expect(cur.phase).toBe('second');
    expect(cur.houseFromMoon).toBe(2);
    expect(cur.isSadeSati).toBe(true);
    expect(cur.saturnSign).toBe('Pisces');
    expect(cur.factIds[0]).toMatch(/^transit\.saturn-from-moon\.\d{2}$/);
    expect(cur.conditions[0].conditionCode).toBe('SATURN_2ND_FROM_MOON');
    expect(cur.conditions[0].direction).toBe('context');
  });

  it('derives the same Saturn-from-Moon phase from the Saturn sign periods when sadeSati is absent', async () => {
    const noSs = await buildFixture(GOLDEN, { sadeSati: false, shadbala: false });
    const a = runS6Activation(noSs.input, emptyFacts, { planets: noSs.planets, yogas: [], lifeStage: deriveLifeStage(noSs.input) });
    const cur = a.find((x): x is SaturnFromMoonActivation => x.kind === 'saturn-from-moon' && x.isCurrent)!;
    expect(cur.phase).toBe('second');
    expect(cur.factIds[0]).toBe('transit.saturn.01');
    // Next: Saturn into Aries = 3rd from the Moon → no phase; the 4th (Taurus) is listed later.
    expect(a.some((x) => x.kind === 'saturn-from-moon' && x.phase === 'fourth')).toBe(true);
  }, 120_000);

  it('transit-over-natal facts are consistent with the natal chart (internal consistency)', () => {
    const asc = fx.input.natal.ascendant.rashiIndex;
    for (const t of acts.filter((a): a is TransitOverNatalActivation => a.kind === 'transit-over-natal')) {
      expect(t.houseFromAsc).toBe(signCount(asc, SIGNS.indexOf(t.sign) + 1));
      for (const p of t.overPlanets) expect(fx.input.natal.planets.find((np) => name(String(np.name)) === p)?.sign).toBe(t.sign);
    }
    // Jupiter at asOf is in Leo, over natal Jupiter (lord of the 6th and 9th), then re-enters Cancer (audit 05 F12).
    const jup = acts.find((a): a is TransitOverNatalActivation => a.kind === 'transit-over-natal' && a.planet === 'Jupiter' && a.isCurrent)!;
    expect(jup.sign).toBe('Leo');
    expect(jup.houseFromAsc).toBe(2);
    expect(jup.overPlanets).toEqual(['Jupiter']);
    expect(jup.overLordOf).toEqual([6, 9]);
    const next = acts.find((a): a is TransitOverNatalActivation => a.kind === 'transit-over-natal' && a.planet === 'Jupiter' && !a.isCurrent)!;
    expect(next.sign).toBe('Cancer');
    expect(next.enteredRetrograde).toBe(true);
    expect(next.houseFromAsc).toBe(1);
    expect(next.overLordOf).toEqual([]);
  });

  it('ids are unique and registry-shaped; output is deterministic', async () => {
    const ids = acts.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(REGISTRY_ID_PATTERN);
    for (const a of acts) for (const f of a.factIds) expect(f).toMatch(REGISTRY_ID_PATTERN);
    const yogas = runS4YogaAssessment(fx.input, emptyFacts, { planets: fx.planets });
    const again = runS6Activation(fx.input, emptyFacts, { planets: fx.planets, yogas, lifeStage: deriveLifeStage(fx.input) });
    expect(JSON.stringify(again)).toBe(JSON.stringify(acts));
  });
});

// ---------------------------------------------------------------------------
// Chart B (Delhi, Virgo Lagna, Capricorn Moon)
// ---------------------------------------------------------------------------

describe('chart B (Delhi 1990) — S4/S6', () => {
  let fx: Fixture;
  let yogas: YogaAssessment[];
  let acts: Activation[];

  beforeAll(async () => {
    fx = await buildFixture(CHART_B, { sadeSati: true, shadbala: true });
    yogas = runS4YogaAssessment(fx.input, emptyFacts, { planets: fx.planets });
    acts = runS6Activation(fx.input, emptyFacts, { planets: fx.planets, yogas, lifeStage: deriveLifeStage(fx.input) });
  }, 120_000);

  it('Lagna Virgo, Moon Capricorn (independent: scratchpad engine-chartB / indep check)', () => {
    expect(fx.input.natal.ascendant.sign).toBe('Virgo');
    expect(fx.input.natal.planets.find((p) => p.name === PlanetSymbol.MOON)?.sign).toBe('Capricorn');
  });

  it('every assessment has a valid class and a trace that ends in the deciding step', () => {
    expect(yogas.length).toBeGreaterThan(0);
    for (const y of yogas) {
      expect(['strong', 'moderate', 'weak', 'cancelled']).toContain(y.yogaClass);
      expect(y.classTrace.length).toBeGreaterThan(0);
      const last = y.classTrace[y.classTrace.length - 1];
      expect(last.startsWith(y.yogaClass === 'cancelled' ? 'D1' : y.yogaClass === 'weak' ? 'D2' : y.yogaClass === 'strong' ? 'D3' : 'D4')).toBe(true);
    }
  });

  it('Saturn in Pisces at asOf: 7th from the Virgo Lagna, 3rd from the Moon → no Saturn-from-Moon phase now', () => {
    const sat = acts.find((a): a is TransitOverNatalActivation => a.kind === 'transit-over-natal' && a.planet === 'Saturn' && a.isCurrent)!;
    expect(sat.sign).toBe('Pisces');
    expect(sat.houseFromAsc).toBe(7);
    expect(sat.houseFromMoon).toBe(3);
    expect(acts.some((a) => a.kind === 'saturn-from-moon' && a.isCurrent)).toBe(false);
  });

  it('native is 36 at asOf; MDs starting at 60+ are tagged', () => {
    expect(deriveLifeStage(fx.input).ageYears).toBe(36);
    const mds = dashas(acts).filter((a) => a.level === 'mahadasha');
    expect(mds.some((m) => m.ageAtStart >= LIFE_STAGE_HORIZON_AGE && m.conditions.some((c) => c.conditionCode === 'LIFE_STAGE_GATED'))).toBe(true);
    expect(mds.filter((m) => m.isCurrent).length).toBe(1);
  });
});

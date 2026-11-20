/**
 * S6 activation (proposal §2 S6; decisions 4 and 6).
 *
 * Emits facts about WHEN natal themes are activated. Nothing here grades a period:
 *   - Vimshottari MD/AD periods: for each period lord, the houses it rules, occupies and
 *     aspects, its D10 house, its S2 conditions and the S4 yogas it forms; the native's age at
 *     the period start and end. Periods are never dropped; those that start at or after the
 *     life-stage horizon (age 60) are tagged LIFE_STAGE_GATED (decision 6).
 *   - MD–AD mutual position: sign count from the MD lord to the AD lord and back. A FACT only;
 *     whether it is favourable is a client question (not assessed).
 *   - Saturn-from-Moon phase (12th/1st/2nd = Sade Sati; 4th; 8th) from the engine's
 *     `sade-sati-periods` when supplied, otherwise derived from the Saturn sign periods and the
 *     natal Moon sign. Neutral wording only (decision 4; no-dosha stance).
 *   - Slow transits (Jupiter, Saturn) over natal houses counted from the Lagna and the Moon,
 *     natal lords and natal planets. No double-transit rule (decision 4).
 *
 * Pure and deterministic: asOf comes from the input, IDs from `stageItemId`.
 */
import type { PlanetSymbol, DashaPeriod } from '@astro/astrology-engine';
import type { FactView, InterpretationInput, LifeStage } from '../input';
import { completedYears } from '../input';
import { stageItemId } from '../ids';
import type { RunS6Activation } from '../stages';
import {
  PLANET_NAMES,
  type Activation,
  type ConditionCode,
  type ConditionEntry,
  type DashaActivation,
  type InterpretationRule,
  type MdAdPositionActivation,
  type PlanetCondition,
  type PlanetName,
  type RuleRef,
  type SaturnFromMoonActivation,
  type SaturnFromMoonPhase,
  type TransitOverNatalActivation,
  type YogaAssessment,
} from '../types';

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

/** Age at period start from which a period is tagged as beyond the plausible horizon. */
export const LIFE_STAGE_HORIZON_AGE = 60;

export const S6_RULE_IDS = {
  DASHA_LORD: 'INT-A-001',
  MD_AD_POSITION: 'INT-A-002',
  LIFE_STAGE: 'INT-A-003',
  SATURN_FROM_MOON: 'INT-A-004',
  TRANSIT_OVER_NATAL: 'INT-A-005',
} as const;

export const S6_RULES: readonly InterpretationRule[] = [
  {
    id: S6_RULE_IDS.DASHA_LORD,
    version: '1.0.0',
    stage: 'S6',
    status: 'provisional',
    sources: ['BPHS ch. 46-51 (Vimshottari results judged from the period lord\'s lordship, placement and aspects; Santhanam numbering, verify); audit 05 F13'],
    requiredFacts: ['dasha.md.*', 'planet.*.d1.lordship', 'planet.*.d1.house'],
    description: 'Period lord activation profile: houses ruled, occupied and aspected, D10 house, yogas formed, age at start.',
  },
  {
    id: S6_RULE_IDS.MD_AD_POSITION,
    version: '1.0.0',
    stage: 'S6',
    status: 'provisional',
    sources: ['BPHS ch. 46-51 (antardasha lord counted from the mahadasha lord; verify); fact only, favourability not assessed (client question)'],
    requiredFacts: ['dasha.current.ad', 'planet.*.d1.sign'],
    description: 'MD–AD mutual position (sign count both ways). Fact only; not assessed.',
  },
  {
    id: S6_RULE_IDS.LIFE_STAGE,
    version: '1.0.0',
    stage: 'S6',
    status: 'approved',
    decisionRef: 'decision-6',
    sources: ['User decision 6 (2026-11-20): age/life-stage-aware gating; never point "first earnings" at dashas after age 60; audit 05 F1'],
    requiredFacts: ['dasha.md.*'],
    description: `Tag (never drop) periods starting at age ${LIFE_STAGE_HORIZON_AGE} or later as beyond the plausible horizon.`,
  },
  {
    id: S6_RULE_IDS.SATURN_FROM_MOON,
    version: '1.0.0',
    stage: 'S6',
    status: 'provisional',
    decisionRef: 'decision-4',
    sources: ['Engine sade-sati-periods (Saturn in the 12th, 1st, 2nd sign from the natal Moon; 4th and 8th tabulated); Phaladeepika ch. 26 Gochara (verify); neutral wording (decision 4, D-006)'],
    requiredFacts: ['planet.moon.d1.sign', 'transit.saturn.*'],
    description: 'Saturn-from-Moon phase (Sade Sati segments, 4th, 8th). Neutral facts.',
  },
  {
    id: S6_RULE_IDS.TRANSIT_OVER_NATAL,
    version: '1.0.0',
    stage: 'S6',
    status: 'provisional',
    decisionRef: 'decision-4',
    sources: ['Phaladeepika ch. 26 Gochara (transits counted from the Lagna and the Moon, whole sign; verify); decision 4: no double-transit rule'],
    requiredFacts: ['transit.*', 'house.*.d1.sign'],
    description: 'Jupiter and Saturn sign periods over natal houses (from the Lagna and the Moon), natal lords and planets.',
  },
];

function ruleRef(ruleId: string): RuleRef {
  const r = S6_RULES.find((x) => x.id === ruleId);
  if (!r) throw new Error(`Unknown S6 rule ${ruleId}`);
  return { ruleId: r.id, source: r.sources[0], status: r.status };
}

// ---------------------------------------------------------------------------
// Shared helpers (also used by S4 for yoga activation windows)
// ---------------------------------------------------------------------------

export const SIGN_NAMES = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

/** 'MOON' → 'Moon'. Undefined for anything that is not one of the nine grahas. */
export function toPlanetName(symbol: string): PlanetName | undefined {
  const s = symbol.trim().toLowerCase();
  return PLANET_NAMES.find((p) => p.toLowerCase() === s);
}

export function toPlanetSymbol(name: PlanetName): PlanetSymbol {
  return name.toUpperCase() as PlanetSymbol;
}

/** Sign count from `fromSign` to `toSign` (1–12, whole sign). */
export function signCount(fromSign: number, toSign: number): number {
  return ((toSign - fromSign + 120) % 12) + 1;
}

export const pad2 = (n: number): string => String(n).padStart(2, '0');

const ms = (iso: string): number => Date.parse(iso);

/** start ≤ asOf < end. */
export function containsInstant(startIso: string, endIso: string, asOfIso: string): boolean {
  const t = ms(asOfIso);
  return ms(startIso) <= t && t < ms(endIso);
}

/** One Vimshottari period with its registry fact ID. */
export interface DashaPeriodRef {
  level: 'mahadasha' | 'antardasha';
  lord: PlanetName;
  parentLord?: PlanetName;
  /** 1-based index of the mahadasha in `vimshottari.mahadashas` (the registry's `dasha.md.NN`). */
  mdIndex: number;
  /** 1-based order of the antardasha within its mahadasha. */
  adIndex?: number;
  startIso: string;
  endIso: string;
  /** `dasha.md.NN` (exists) or `dasha.ad.NN.MM` (A5 adds it). */
  factId: string;
}

/** All MDs and their ADs, in chronological order (MD, then its ADs). */
export function listDashaPeriods(input: InterpretationInput): DashaPeriodRef[] {
  const out: DashaPeriodRef[] = [];
  input.vimshottari.mahadashas.forEach((md: DashaPeriod, i: number) => {
    const mdLord = toPlanetName(String(md.lord));
    if (!mdLord) return;
    const mdIndex = i + 1;
    out.push({ level: 'mahadasha', lord: mdLord, mdIndex, startIso: md.startDateIso, endIso: md.endDateIso, factId: `dasha.md.${pad2(mdIndex)}` });
    (md.subPeriods ?? []).forEach((ad: DashaPeriod, j: number) => {
      const adLord = toPlanetName(String(ad.lord));
      if (!adLord) return;
      out.push({
        level: 'antardasha',
        lord: adLord,
        parentLord: mdLord,
        mdIndex,
        adIndex: j + 1,
        startIso: ad.startDateIso,
        endIso: ad.endDateIso,
        factId: `dasha.ad.${pad2(mdIndex)}.${pad2(j + 1)}`,
      });
    });
  });
  return out;
}

/** 1-based index of the MD containing asOf (0 when none; e.g. asOf outside the tree). */
export function currentMdIndex(input: InterpretationInput): number {
  const i = input.vimshottari.mahadashas.findIndex((md) => containsInstant(md.startDateIso, md.endDateIso, input.asOfIso));
  return i + 1;
}

/**
 * Periods S6 reports: every MD (so later ones can be tagged, never dropped), and the ADs of
 * the current and the next MD that have not ended by asOf.
 */
export function selectReportedPeriods(input: InterpretationInput): DashaPeriodRef[] {
  const cur = currentMdIndex(input);
  const asOf = ms(input.asOfIso);
  return listDashaPeriods(input).filter((p) => {
    if (p.level === 'mahadasha') return true;
    if (cur === 0) return false;
    return (p.mdIndex === cur || p.mdIndex === cur + 1) && ms(p.endIso) > asOf;
  });
}

class IdAllocator {
  private readonly used = new Set<string>();
  take(base: string, disambiguator: string): string {
    let id = base;
    if (this.used.has(id)) id = `${base}.${disambiguator}`;
    this.used.add(id);
    return id;
  }
}

const uniq = (xs: string[]): string[] => [...new Set(xs)];

function ctx(factId: string, conditionCode: ConditionCode, ruleId: string): ConditionEntry {
  return { factId, conditionCode, ruleId, direction: 'context' };
}

// ---------------------------------------------------------------------------
// Dasha activations
// ---------------------------------------------------------------------------

function ageAtIso(lifeStage: LifeStage, iso: string): number {
  return Math.max(0, completedYears(lifeStage.birthDate, iso.slice(0, 10)));
}

function dashaActivation(
  input: InterpretationInput,
  p: DashaPeriodRef,
  planets: PlanetCondition[],
  yogas: YogaAssessment[],
  lifeStage: LifeStage,
  ids: IdAllocator,
): DashaActivation {
  const symbol = toPlanetSymbol(p.lord);
  const natal = input.natal.planets.find((np) => toPlanetName(String(np.name)) === p.lord);
  const housesRuled = [...(natal?.lordship ?? [])].sort((a, b) => a - b);
  const houseOccupied = natal?.house ?? 0;
  const housesAspected = [...(natal?.aspectsCast ?? [])].sort((a, b) => a - b);
  const d10 = input.vargas.D10
    ? Object.values(input.vargas.D10.placements).find((pl) => String(pl.planet) === String(symbol))
    : undefined;
  const d10House = d10?.house ?? null;
  const yogasActivated = yogas
    .filter((y) => y.formed && y.yogaClass !== 'cancelled' && y.formation.keyPlanets.includes(p.lord))
    .map((y) => y.yogaId);
  const ageAtStart = ageAtIso(lifeStage, p.startIso);
  const ageAtEnd = ageAtIso(lifeStage, p.endIso);
  const k = p.lord.toLowerCase();
  const level = p.level;

  const conditions: ConditionEntry[] = [];
  const rid = S6_RULE_IDS.DASHA_LORD;
  conditions.push(ctx(p.factId, level === 'mahadasha' ? 'MD_LORD' : 'AD_LORD', rid));
  if (housesRuled.length) conditions.push(ctx(`planet.${k}.d1.lordship`, 'PERIOD_LORD_RULES_HOUSE', rid));
  if (houseOccupied) conditions.push(ctx(`planet.${k}.d1.house`, 'PERIOD_LORD_OCCUPIES_HOUSE', rid));
  if (housesAspected.length) conditions.push(ctx(`planet.${k}.d1.aspects-cast`, 'PERIOD_LORD_ASPECTS_HOUSE', rid));
  if (d10House !== null) conditions.push(ctx(`planet.${k}.d10.house`, 'PERIOD_LORD_D10_LINK', rid));
  for (const y of yogas.filter((yy) => yogasActivated.includes(yy.yogaId))) {
    conditions.push(ctx(y.factId, level === 'mahadasha' ? 'YOGA_ACTIVE_MAHADASHA' : 'YOGA_ACTIVE_ANTARDASHA', rid));
  }
  if (ageAtStart >= LIFE_STAGE_HORIZON_AGE) {
    conditions.push(ctx(`${p.factId}.age`, 'LIFE_STAGE_GATED', S6_RULE_IDS.LIFE_STAGE));
  }
  // The period lord's own S2 condition (directions preserved).
  const pc = planets.find((x) => x.planet === p.lord);
  if (pc) conditions.push(...pc.conditions);

  const idBase =
    level === 'mahadasha'
      ? stageItemId('S6', 'dasha', 'md', p.lord)
      : stageItemId('S6', 'dasha', 'ad', p.parentLord ?? 'none', p.lord);

  const activation: DashaActivation = {
    kind: 'dasha',
    id: ids.take(idBase, p.startIso.slice(0, 10)),
    level,
    lord: p.lord,
    housesRuled,
    houseOccupied,
    housesAspected,
    d10House,
    yogasActivated,
    ageAtStart,
    ageAtEnd,
    startIso: p.startIso,
    endIso: p.endIso,
    isCurrent: containsInstant(p.startIso, p.endIso, input.asOfIso),
    conditions,
    factIds: uniq([p.factId, ...conditions.map((c) => c.factId), ...(pc?.factIds ?? [])]),
    rule: ruleRef(rid),
  };
  if (p.parentLord) activation.parentLord = p.parentLord;
  return activation;
}

function mdAdPosition(input: InterpretationInput, p: DashaPeriodRef, ids: IdAllocator): MdAdPositionActivation | null {
  if (p.level !== 'antardasha' || !p.parentLord) return null;
  const sign = (name: PlanetName) => input.natal.planets.find((np) => toPlanetName(String(np.name)) === name)?.rashiIndex;
  const mdSign = sign(p.parentLord);
  const adSign = sign(p.lord);
  if (!mdSign || !adSign) return null;
  const rid = S6_RULE_IDS.MD_AD_POSITION;
  const factIds = uniq([p.factId, `planet.${p.parentLord.toLowerCase()}.d1.sign`, `planet.${p.lord.toLowerCase()}.d1.sign`]);
  return {
    kind: 'md-ad-position',
    id: ids.take(stageItemId('S6', 'md-ad', p.parentLord, p.lord), p.startIso.slice(0, 10)),
    mdLord: p.parentLord,
    adLord: p.lord,
    adFromMd: signCount(mdSign, adSign),
    mdFromAd: signCount(adSign, mdSign),
    startIso: p.startIso,
    endIso: p.endIso,
    isCurrent: containsInstant(p.startIso, p.endIso, input.asOfIso),
    // Fact only (not assessed): direction `context`.
    conditions: [ctx(p.factId, 'MD_AD_MUTUAL_POSITION', rid)],
    factIds,
    rule: ruleRef(rid),
  };
}

// ---------------------------------------------------------------------------
// Saturn from the Moon
// ---------------------------------------------------------------------------

const PHASES: Record<number, { phase: SaturnFromMoonPhase; code: ConditionCode }> = {
  12: { phase: 'twelfth', code: 'SATURN_12TH_FROM_MOON' },
  1: { phase: 'over-moon', code: 'SATURN_OVER_MOON' },
  2: { phase: 'second', code: 'SATURN_2ND_FROM_MOON' },
  4: { phase: 'fourth', code: 'SATURN_4TH_FROM_MOON' },
  8: { phase: 'eighth', code: 'SATURN_8TH_FROM_MOON' },
};

interface SaturnSegment {
  signIndex: number;
  startIso: string;
  endIso: string;
  factId: string;
}

/**
 * Saturn segments with their fact IDs.
 * - Engine `sadeSati` supplied: every segment of every cycle plus `fourthAndEighth`, sorted by
 *   start, numbered 1-based → `transit.saturn-from-moon.NN` (A5 registers these).
 * - Otherwise: the Saturn sign periods → `transit.saturn.NN` (existing registry IDs).
 */
function saturnSegments(input: InterpretationInput): SaturnSegment[] {
  if (input.sadeSati) {
    const all = [...input.sadeSati.cycles.flatMap((c) => c.segments), ...input.sadeSati.fourthAndEighth]
      .slice()
      .sort((a, b) => ms(a.startIso) - ms(b.startIso) || a.rashiIndex - b.rashiIndex);
    return all.map((s, i) => ({ signIndex: s.rashiIndex, startIso: s.startIso, endIso: s.endIso, factId: `transit.saturn-from-moon.${pad2(i + 1)}` }));
  }
  return (input.transits.SATURN ?? []).map((t, i) => ({ signIndex: t.signIndex, startIso: t.startIso, endIso: t.endIso, factId: `transit.saturn.${pad2(i + 1)}` }));
}

function saturnFromMoon(input: InterpretationInput, ids: IdAllocator): SaturnFromMoonActivation[] {
  const moon = input.natal.planets.find((p) => toPlanetName(String(p.name)) === 'Moon');
  if (!moon) return [];
  const asOf = ms(input.asOfIso);
  const rid = S6_RULE_IDS.SATURN_FROM_MOON;
  const out: SaturnFromMoonActivation[] = [];
  for (const seg of saturnSegments(input)) {
    if (ms(seg.endIso) <= asOf) continue;
    const house = signCount(moon.rashiIndex, seg.signIndex);
    const ph = PHASES[house];
    if (!ph) continue;
    const factIds = uniq([seg.factId, 'planet.moon.d1.sign']);
    out.push({
      kind: 'saturn-from-moon',
      id: ids.take(stageItemId('S6', 'saturn-from-moon', seg.factId.split('.').pop() ?? '00'), seg.startIso.slice(0, 10)),
      phase: ph.phase,
      houseFromMoon: house as SaturnFromMoonActivation['houseFromMoon'],
      isSadeSati: house === 12 || house === 1 || house === 2,
      saturnSign: SIGN_NAMES[seg.signIndex - 1],
      startIso: seg.startIso,
      endIso: seg.endIso,
      isCurrent: containsInstant(seg.startIso, seg.endIso, input.asOfIso),
      conditions: [ctx(seg.factId, ph.code, rid)],
      factIds,
      rule: ruleRef(rid),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Slow transits over natal points
// ---------------------------------------------------------------------------

function transitsOverNatal(input: InterpretationInput, ids: IdAllocator): TransitOverNatalActivation[] {
  const asc = input.natal.ascendant.rashiIndex;
  const moon = input.natal.planets.find((p) => toPlanetName(String(p.name)) === 'Moon');
  const rid = S6_RULE_IDS.TRANSIT_OVER_NATAL;
  const out: TransitOverNatalActivation[] = [];
  const asOf = ms(input.asOfIso);
  for (const [key, planet] of [['JUPITER', 'Jupiter'], ['SATURN', 'Saturn']] as const) {
    (input.transits[key] ?? []).forEach((t, i) => {
      if (ms(t.endIso) <= asOf) return;
      const factId = `transit.${planet.toLowerCase()}.${pad2(i + 1)}`;
      const houseFromAsc = signCount(asc, t.signIndex);
      const houseFromMoon = moon ? signCount(moon.rashiIndex, t.signIndex) : 0;
      const overPlanets = input.natal.planets
        .filter((np) => np.rashiIndex === t.signIndex)
        .map((np) => toPlanetName(String(np.name)))
        .filter((n): n is PlanetName => n !== undefined)
        .sort((a, b) => PLANET_NAMES.indexOf(a) - PLANET_NAMES.indexOf(b));
      const overLordOf = input.natal.houses
        .filter((h) => input.natal.planets.find((np) => toPlanetName(String(np.name)) === toPlanetName(String(h.lord)))?.rashiIndex === t.signIndex)
        .map((h) => h.number)
        .sort((a, b) => a - b);
      const conditions: ConditionEntry[] = [ctx(factId, 'TRANSIT_OVER_NATAL_HOUSE', rid)];
      for (const h of overLordOf) conditions.push(ctx(`house.${h}.d1.lord-house`, 'TRANSIT_OVER_NATAL_LORD', rid));
      for (const p of overPlanets) conditions.push(ctx(`planet.${p.toLowerCase()}.d1.sign`, 'TRANSIT_OVER_NATAL_PLANET', rid));
      out.push({
        kind: 'transit-over-natal',
        id: ids.take(stageItemId('S6', 'transit', planet, pad2(i + 1)), t.startIso.slice(0, 10)),
        planet,
        sign: SIGN_NAMES[t.signIndex - 1],
        houseFromAsc,
        houseFromMoon,
        overLordOf,
        overPlanets,
        enteredRetrograde: t.enteredRetrograde,
        startIso: t.startIso,
        endIso: t.endIso,
        isCurrent: containsInstant(t.startIso, t.endIso, input.asOfIso),
        conditions,
        factIds: uniq([factId, `house.${houseFromAsc}.d1.sign`, ...conditions.map((c) => c.factId)]),
        rule: ruleRef(rid),
      });
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Stage
// ---------------------------------------------------------------------------

/**
 * Order: dasha periods chronologically (each AD followed by its MD–AD position), then the
 * Saturn-from-Moon segments, then the transit periods (Jupiter, then Saturn).
 * `facts` is not consulted: every fact ID is derived from the input with the registry's
 * grammar; IDs the registry lacks today are listed in scratchpad A3-fact-ids.md (A5).
 */
export const runS6Activation: RunS6Activation = (input, _facts: FactView, deps) => {
  const ids = new IdAllocator();
  const out: Activation[] = [];
  for (const p of selectReportedPeriods(input)) {
    out.push(dashaActivation(input, p, deps.planets, deps.yogas, deps.lifeStage, ids));
    const pos = mdAdPosition(input, p, ids);
    if (pos) out.push(pos);
  }
  out.push(...saturnFromMoon(input, ids));
  out.push(...transitsOverNatal(input, ids));
  return out;
};

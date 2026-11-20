/**
 * S4 yoga assessment (proposal §2 S4; audit 04 §5; decision 7).
 *
 * Starts from the engine's YogaResults and adds, per formed yoga:
 *   - formation evidence (satisfied engine conditions, relation, key planets);
 *   - strength factors on the key planets, each from a cited row of `rules/yoga-rules.ts`
 *     (direction support/weaken, tier major/minor; never a number that is summed);
 *   - modifiers that change the KIND of result (papa/shubha occupant, Viparita conditions);
 *   - cancellations (engine flags, each mapped to a `bhanga` or `qualifier` row);
 *   - a class from the documented set logic (`YOGA_CLASS_PROCEDURE`), with a trace;
 *   - activation windows: the Vimshottari MD/AD of the key planets.
 *
 * Planet facts come from the S2 `PlanetCondition`s (deps). The engine's optional
 * `YogaResult.assessment` (2026-11 engine fixes) supplies key planets, relations, the occupant
 * variant and the cancellation flags; every one of them has a fallback, so the stage also works
 * on YogaResults without `assessment`.
 *
 * Yogas included: `isDetected`, or `assessment.formed` (formed-but-cancelled, e.g. Kemadruma).
 * Yogas that never formed (e.g. a one-way-aspect Raja pair) are left out.
 */
import type { YogaResult } from '@astro/astrology-engine';
import type { FactView, InterpretationInput } from '../input';
import { idSegment } from '../ids';
import type { RunS4YogaAssessment } from '../stages';
import type {
  ConditionCode,
  ConditionEntry,
  PlanetCondition,
  PlanetName,
  YogaActivationWindow,
  YogaAssessment,
  YogaCancellation,
  YogaClass,
  YogaFormationEvidence,
  YogaModifier,
  YogaRelation,
  YogaStrengthFactor,
} from '../types';
import {
  FAMILIES_WITHOUT_FACTORS,
  S4_RULE_IDS,
  YOGA_CLASS_PROCEDURE,
  YOGA_FACTOR_TESTS,
  applicableFactorRule,
  engineFlagRule,
  factorRuleRef,
  s4RuleRef,
  yogaFamily,
  type YogaFactorRule,
  type YogaFactorTest,
  type YogaFamily,
} from '../rules/yoga-rules';
import {
  containsInstant,
  currentMdIndex,
  listDashaPeriods,
  toPlanetName,
  toPlanetSymbol,
} from './activation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const KENDRA = [1, 4, 7, 10];
const TRIKONA = [1, 5, 9];
const DUSTHANA = [6, 8, 12];
const KENDRA_TRIKONA = [1, 4, 5, 7, 9, 10];
const NATURAL_BENEFICS: readonly PlanetName[] = ['Jupiter', 'Venus', 'Mercury'];
const NODES: readonly PlanetName[] = ['Rahu', 'Ketu'];

/** Registry fact ID of a yoga: same slug as report-engine `evidence-registry.ts`. */
export function yogaFactId(yogaId: string): string {
  return `yoga.${idSegment(yogaId.replace(/^YOGA_/, ''))}`;
}

const uniq = <T>(xs: T[]): T[] => [...new Set(xs)];

function keyPlanetsOf(y: YogaResult): PlanetName[] {
  const fromAssessment = y.assessment?.keyPlanets?.map((s) => toPlanetName(String(s)));
  const raw = fromAssessment ?? y.evidence.involvedPlanets.map((p) => toPlanetName(String(p.planet)));
  return uniq(raw.filter((p): p is PlanetName => p !== undefined));
}

function relationOf(y: YogaResult, family: YogaFamily): YogaRelation {
  const primary = y.assessment?.relations?.[0] ?? y.evidence.relationships[0]?.relationshipType;
  switch (primary) {
    case 'CONJUNCTION':
      return 'conjunction';
    case 'MUTUAL_ASPECT':
      return 'mutual-aspect';
    case 'SIGN_EXCHANGE':
      return 'exchange';
    case 'OWNERSHIP':
      return 'ownership';
    case 'ONE_WAY_ASPECT':
      return 'one-way-aspect';
    default:
      return family === 'nabhasa' ? 'distribution' : 'placement';
  }
}

const RELATION_CODE: Partial<Record<YogaRelation, ConditionCode>> = {
  conjunction: 'YOGA_RELATION_CONJUNCTION',
  'mutual-aspect': 'YOGA_RELATION_MUTUAL_ASPECT',
  exchange: 'YOGA_RELATION_EXCHANGE',
  ownership: 'YOGA_RELATION_OWNERSHIP',
};

/** Benefic/malefic occupant variant (BPHS ch. 37/38). Engine value first, then computed. */
function variantOf(y: YogaResult, family: YogaFamily, keyPlanets: PlanetName[]): 'BENEFIC' | 'MALEFIC' | 'MIXED' | undefined {
  if (family !== 'solar-flank' && family !== 'lunar-flank') return undefined;
  if (y.assessment?.variant) return y.assessment.variant;
  const pivot: PlanetName = family === 'solar-flank' ? 'Sun' : 'Moon';
  const occupants = keyPlanets.filter((p) => p !== pivot);
  if (!occupants.length) return undefined;
  const nb = occupants.filter((p) => NATURAL_BENEFICS.includes(p)).length;
  return nb === occupants.length ? 'BENEFIC' : nb === 0 ? 'MALEFIC' : 'MIXED';
}

interface Shadbala {
  ratio: number;
  meets: boolean;
  factId: string;
}

function shadbalaOf(input: InterpretationInput, y: YogaResult, pc: PlanetCondition | undefined, planet: PlanetName): Shadbala | null {
  const factId = `planet.${planet.toLowerCase()}.shadbala`;
  if (pc?.shadbala) return { ratio: pc.shadbala.ratio, meets: pc.shadbala.meetsRequired, factId };
  const s = input.shadbala?.[planet];
  if (s && s.requiredRupas > 0) {
    const ratio = s.totalRupas / s.requiredRupas;
    return { ratio, meets: ratio >= 1, factId };
  }
  const f = y.assessment?.planetFactors.find((pf) => toPlanetName(String(pf.planet)) === planet)?.shadbala;
  if (f && typeof f.ratio === 'number') return { ratio: f.ratio, meets: f.ratio >= 1, factId };
  return null;
}

function hasNeechaBhanga(input: InterpretationInput, pc: PlanetCondition): boolean {
  if (pc.conditions.some((c) => c.conditionCode === 'NEECHA_BHANGA')) return true;
  const id = `YOGA_NEECHA_BHANGA_${toPlanetSymbol(pc.planet)}`;
  return input.yogas.some((y) => y.id === id && y.isDetected);
}

function natalOf(input: InterpretationInput, planet: PlanetName) {
  return input.natal.planets.find((p) => toPlanetName(String(p.name)) === planet);
}

/** Other grahas (not nodes) in the same sign as `planet`. */
function signMates(input: InterpretationInput, planet: PlanetName): PlanetName[] {
  const me = natalOf(input, planet);
  if (!me) return [];
  return input.natal.planets
    .filter((p) => p.rashiIndex === me.rashiIndex)
    .map((p) => toPlanetName(String(p.name)))
    .filter((p): p is PlanetName => p !== undefined && p !== planet && !NODES.includes(p));
}

const lordshipsOf = (input: InterpretationInput, planet: PlanetName): number[] => natalOf(input, planet)?.lordship ?? [];

interface TestResult {
  observed: string | number | boolean;
  code: ConditionCode;
  factIds: string[];
}

/**
 * Evaluates one factor predicate for one key planet. Returns null when the predicate does not
 * hold or the data it needs is absent (a missing fact never becomes a factor).
 */
function evaluateTest(
  test: YogaFactorTest,
  rule: YogaFactorRule,
  planet: PlanetName,
  pc: PlanetCondition,
  input: InterpretationInput,
  y: YogaResult,
): TestResult | null {
  const k = planet.toLowerCase();
  const dignity = pc.dignity.value;
  const dignityFact = pc.dignity.factId || `planet.${k}.d1.dignity`;
  const houseFact = `planet.${k}.d1.house`;
  const lordshipFact = `planet.${k}.d1.lordship`;
  const fixed = (code: ConditionCode): ConditionCode => rule.conditionCode ?? code;

  switch (test) {
    case 'D1_DEBILITATED':
      return dignity === 'DEBILITATED' && !hasNeechaBhanga(input, pc)
        ? { observed: dignity, code: fixed('DEBILITATED'), factIds: [dignityFact] }
        : null;
    case 'D1_COMBUST':
      return pc.combustion?.combust
        ? { observed: pc.combustion.distanceDeg ?? true, code: fixed('COMBUST'), factIds: uniq([pc.combustion.factId || `planet.${k}.d1.combust`, `planet.${k}.d1.combust-distance`]) }
        : null;
    case 'D1_NOT_COMBUST':
      return pc.combustion && !pc.combustion.combust
        ? { observed: pc.combustion.distanceDeg ?? false, code: fixed('YOGA_KEY_PLANET_SUPPORTED'), factIds: uniq([pc.combustion.factId || `planet.${k}.d1.combust`, `planet.${k}.d1.combust-distance`]) }
        : null;
    case 'D1_ENEMY_SIGN':
      if (dignity === 'ENEMY') return { observed: dignity, code: rule.conditionCode ?? 'ENEMY_SIGN', factIds: [dignityFact] };
      if (dignity === 'GREAT_ENEMY') return { observed: dignity, code: rule.conditionCode ?? 'GREAT_ENEMY_SIGN', factIds: [dignityFact] };
      return null;
    case 'D1_FRIEND_SIGN':
      if (dignity === 'FRIEND') return { observed: dignity, code: rule.conditionCode ?? 'FRIEND_SIGN', factIds: [dignityFact] };
      if (dignity === 'GREAT_FRIEND') return { observed: dignity, code: rule.conditionCode ?? 'GREAT_FRIEND_SIGN', factIds: [dignityFact] };
      return null;
    case 'D1_OWN_EXALTED_MT':
      if (dignity === 'EXALTED' || dignity === 'MOOLATRIKONA' || dignity === 'OWN_SIGN') {
        return { observed: dignity, code: rule.conditionCode ?? dignity, factIds: [dignityFact] };
      }
      return null;
    case 'IN_DUSTHANA':
      return DUSTHANA.includes(pc.house) ? { observed: pc.house, code: fixed('IN_DUSTHANA'), factIds: [houseFact] } : null;
    case 'IN_KENDRA_OR_TRIKONA':
      if (KENDRA.includes(pc.house)) return { observed: pc.house, code: rule.conditionCode ?? 'IN_KENDRA', factIds: [houseFact] };
      if (TRIKONA.includes(pc.house)) return { observed: pc.house, code: rule.conditionCode ?? 'IN_TRIKONA', factIds: [houseFact] };
      return null;
    case 'SHADBALA_BELOW_REQUIRED':
    case 'SHADBALA_MEETS_REQUIRED': {
      if (NODES.includes(planet)) return null;
      const s = shadbalaOf(input, y, pc, planet);
      if (!s) return null;
      const wantMeets = test === 'SHADBALA_MEETS_REQUIRED';
      return s.meets === wantMeets
        ? { observed: Number(s.ratio.toFixed(4)), code: fixed(wantMeets ? 'SHADBALA_MEETS_REQUIRED' : 'SHADBALA_BELOW_REQUIRED'), factIds: [s.factId] }
        : null;
    }
    case 'D9_DEBILITATED': {
      const d9 = pc.vargaDignity.d9;
      return d9?.value === 'DEBILITATED' ? { observed: `${d9.sign} (D9)`, code: fixed('D9_DEBILITATED'), factIds: d9.factIds } : null;
    }
    case 'D9_OWN_OR_EXALTED': {
      const d9 = pc.vargaDignity.d9;
      if (d9?.value === 'EXALTED') return { observed: `${d9.sign} (D9)`, code: rule.conditionCode ?? 'D9_EXALTED', factIds: d9.factIds };
      if (d9?.value === 'OWN_SIGN') return { observed: `${d9.sign} (D9)`, code: rule.conditionCode ?? 'D9_OWN_SIGN', factIds: d9.factIds };
      return null;
    }
    case 'VARGOTTAMA':
      return pc.vargottama
        ? { observed: true, code: fixed('VARGOTTAMA'), factIds: [`planet.${k}.d1.sign`, `planet.${k}.d9.sign`] }
        : null;
    case 'MOON_WANING':
    case 'MOON_WAXING': {
      if (planet !== 'Moon') return null;
      const sun = natalOf(input, 'Sun');
      const moon = natalOf(input, 'Moon');
      if (!sun || !moon) return null;
      const elongation = (((moon.absoluteDegree - sun.absoluteDegree) % 360) + 360) % 360;
      const waning = elongation > 180;
      if (waning !== (test === 'MOON_WANING')) return null;
      return { observed: `${waning ? 'waning' : 'waxing'} (${elongation.toFixed(1)}° from the Sun)`, code: fixed(waning ? 'YOGA_KEY_PLANET_WEAKENED' : 'YOGA_KEY_PLANET_SUPPORTED'), factIds: ['planet.moon.d1.paksha'] };
    }
    case 'AVASTHA_MRITA': {
      if (NODES.includes(planet)) return null;
      const av = natalOf(input, planet)?.avastha?.baladi;
      return av === 'MRITA' ? { observed: av, code: fixed('YOGA_KEY_PLANET_WEAKENED'), factIds: [`planet.${k}.d1.avastha`] } : null;
    }
    case 'OWNS_8TH_OR_11TH': {
      const owns = lordshipsOf(input, planet);
      if (owns.includes(8)) return { observed: `owns ${owns.join(', ')}`, code: rule.conditionCode ?? 'OWNS_8TH', factIds: [lordshipFact] };
      if (owns.includes(11)) return { observed: `owns ${owns.join(', ')}`, code: rule.conditionCode ?? 'OWNS_11TH', factIds: [lordshipFact] };
      return null;
    }
    case 'JOINED_WITH_8TH_OR_11TH_LORD': {
      const mates = signMates(input, planet).filter((m) => lordshipsOf(input, m).some((h) => h === 8 || h === 11));
      if (!mates.length) return null;
      return {
        observed: mates.map((m) => `${m} (lord of ${lordshipsOf(input, m).join(', ')})`).join('; '),
        code: fixed('YOGA_DUSTHANA_LORD_ASSOCIATION'),
        factIds: [`planet.${k}.d1.conjunctions`, ...mates.map((m) => `planet.${m.toLowerCase()}.d1.lordship`)],
      };
    }
    case 'DUSTHANA_LORD_OWNS_KENDRA_OR_TRIKONA': {
      const owns = lordshipsOf(input, planet);
      const good = owns.filter((h) => KENDRA_TRIKONA.includes(h));
      return good.length ? { observed: `owns ${owns.join(', ')}`, code: fixed('YOGA_DUAL_LORDSHIP'), factIds: [lordshipFact] } : null;
    }
    case 'DUSTHANA_LORD_JOINS_KENDRA_OR_TRIKONA_LORD': {
      const flag = y.assessment?.cancellations.find((c) => c.id === 'DUSTHANA_LORD_ASSOCIATED_WITH_KENDRA_TRIKONA_LORD');
      if (flag) {
        return flag.satisfied
          ? { observed: flag.observed, code: fixed('YOGA_DUSTHANA_LORD_ASSOCIATION'), factIds: [`planet.${k}.d1.conjunctions`, `planet.${k}.d1.aspected-by`] }
          : null;
      }
      // Fallback (no engine flag): conjunction only.
      const mates = signMates(input, planet).filter((m) => lordshipsOf(input, m).some((h) => KENDRA_TRIKONA.includes(h)));
      if (!mates.length) return null;
      return {
        observed: mates.map((m) => `${m} (lord of ${lordshipsOf(input, m).join(', ')}): conjunction`).join('; '),
        code: fixed('YOGA_DUSTHANA_LORD_ASSOCIATION'),
        factIds: [`planet.${k}.d1.conjunctions`, ...mates.map((m) => `planet.${m.toLowerCase()}.d1.lordship`)],
      };
    }
    case 'JOINED_WITH_LUMINARY': {
      const lum = signMates(input, planet).filter((m) => m === 'Sun' || m === 'Moon');
      return lum.length ? { observed: lum.join(', '), code: fixed('YOGA_KEY_PLANET_WEAKENED'), factIds: [`planet.${k}.d1.conjunctions`] } : null;
    }
  }
}

function strengthFactors(
  input: InterpretationInput,
  y: YogaResult,
  family: YogaFamily,
  keyPlanets: PlanetName[],
  planets: PlanetCondition[],
): YogaStrengthFactor[] {
  if (FAMILIES_WITHOUT_FACTORS.has(family)) return [];
  const out: YogaStrengthFactor[] = [];
  for (const planet of keyPlanets) {
    const pc = planets.find((p) => p.planet === planet);
    if (!pc) continue;
    for (const test of YOGA_FACTOR_TESTS) {
      const rule = applicableFactorRule(family, planet, test);
      if (!rule) continue;
      const r = evaluateTest(test, rule, planet, pc, input, y);
      if (!r) continue;
      out.push({
        planet,
        kind: rule.kind,
        observed: r.observed,
        direction: rule.direction,
        tier: rule.tier,
        conditionCode: r.code,
        factIds: uniq(r.factIds),
        rule: factorRuleRef(rule),
      });
    }
  }
  return out;
}

function modifiers(
  family: YogaFamily,
  variant: 'BENEFIC' | 'MALEFIC' | 'MIXED' | undefined,
  factors: YogaStrengthFactor[],
): YogaModifier[] {
  const out: YogaModifier[] = [];
  if (variant) {
    const rule = s4RuleRef(S4_RULE_IDS.MODIFIER_VARIANT);
    if (variant === 'MALEFIC' || variant === 'MIXED') {
      out.push({ code: 'YOGA_MALEFIC_OCCUPANT', description: 'Papa (malefic) variant: the flanking occupants are natural malefics; the reading is directed accordingly, not as a benefic yoga.', rule });
    }
    if (variant === 'BENEFIC' || variant === 'MIXED') {
      out.push({ code: 'YOGA_BENEFIC_OCCUPANT', description: 'Shubha (benefic) variant: the flanking occupants are natural benefics.', rule });
    }
  }
  if (family === 'viparita') {
    const rule = s4RuleRef(S4_RULE_IDS.MODIFIER_VIPARITA);
    if (factors.some((f) => f.conditionCode === 'YOGA_DUAL_LORDSHIP')) {
      out.push({ code: 'YOGA_DUAL_LORDSHIP', description: 'Conditional result: the dusthana lord also owns a kendra or trikona, so it also harms the good house it rules.', rule });
    }
    if (factors.some((f) => f.conditionCode === 'YOGA_DUSTHANA_LORD_ASSOCIATION')) {
      out.push({ code: 'YOGA_DUSTHANA_LORD_ASSOCIATION', description: 'Conditional result: the dusthana lord is associated with a kendra or trikona lord, which dilutes the "reverse" result.', rule });
    }
  }
  return out;
}

function cancellationsOf(y: YogaResult): { list: YogaCancellation[]; bhanga: boolean } {
  const list: YogaCancellation[] = [];
  let bhanga = false;
  for (const flag of y.assessment?.cancellations ?? []) {
    const r = engineFlagRule(flag.id);
    if (flag.satisfied && r.effect === 'bhanga' && r.status !== 'pending-client') bhanga = true;
    list.push({ id: flag.id, satisfied: flag.satisfied, observed: flag.observed, rule: { ruleId: r.id, source: r.source, status: r.status } });
  }
  return { list, bhanga };
}

/** The documented set logic (rules/yoga-rules.ts `YOGA_CLASS_PROCEDURE`). */
function classify(
  cancelled: boolean,
  family: YogaFamily,
  keyPlanets: PlanetName[],
  factors: YogaStrengthFactor[],
  hasShadbala: (p: PlanetName) => boolean | null,
): { yogaClass: YogaClass; trace: string[] } {
  const trace: string[] = [];
  if (cancelled) {
    trace.push('D1 cancelled: a classical bhanga for this yoga is satisfied');
    return { yogaClass: 'cancelled', trace };
  }
  trace.push('D1 not cancelled');
  const counted = factors.filter((f) => f.rule.status !== 'pending-client');
  const excluded = factors.length - counted.length;
  if (excluded) trace.push(`${excluded} pending-client factor(s) reported but not counted`);
  if (FAMILIES_WITHOUT_FACTORS.has(family) || keyPlanets.length === 0) {
    trace.push('D4 moderate: formation-only (no key planets or no factor table for this family; strength not graded)');
    return { yogaClass: 'moderate', trace };
  }
  const mw = counted.filter((f) => f.tier === 'major' && f.direction === 'weaken');
  const ms = counted.filter((f) => f.tier === 'major' && f.direction === 'support');
  const label = (fs: YogaStrengthFactor[]) => fs.map((f) => `${f.planet}:${f.conditionCode}`).join(', ') || 'none';
  trace.push(`MW = {${label(mw)}}; MS = {${label(ms)}}`);
  if (mw.length >= YOGA_CLASS_PROCEDURE.weakMinMajorWeaken && ms.length === 0) {
    trace.push(`D2 weak: |MW| ≥ ${YOGA_CLASS_PROCEDURE.weakMinMajorWeaken} and MS = ∅`);
    return { yogaClass: 'weak', trace };
  }
  trace.push('D2 not weak');
  if (mw.length === 0 && ms.length > 0) {
    const grahas = keyPlanets.filter((p) => !NODES.includes(p));
    const unknown = grahas.filter((p) => hasShadbala(p) === null);
    const below = grahas.filter((p) => hasShadbala(p) === false);
    if (unknown.length === 0 && below.length === 0) {
      trace.push('D3 strong: MW = ∅, MS ≠ ∅, every key graha meets its required Shadbala');
      return { yogaClass: 'strong', trace };
    }
    trace.push(
      unknown.length
        ? `D3 not strong: Shadbala not supplied for ${unknown.join(', ')}`
        : `D3 not strong: Shadbala below required for ${below.join(', ')}`,
    );
  } else {
    trace.push('D3 not strong: MW ≠ ∅ or MS = ∅');
  }
  trace.push('D4 moderate');
  return { yogaClass: 'moderate', trace };
}

/** MD/AD windows of the key planets: every MD; ADs of the current and next MD not yet ended. */
function activationWindows(input: InterpretationInput, keyPlanets: PlanetName[]): YogaActivationWindow[] {
  if (!keyPlanets.length) return [];
  const rule = s4RuleRef(S4_RULE_IDS.ACTIVATION);
  const cur = currentMdIndex(input);
  const asOf = Date.parse(input.asOfIso);
  return listDashaPeriods(input)
    .filter((p) => keyPlanets.includes(p.lord))
    .filter((p) => p.level === 'mahadasha' || (cur > 0 && (p.mdIndex === cur || p.mdIndex === cur + 1) && Date.parse(p.endIso) > asOf))
    .map((p) => ({
      planet: p.lord,
      level: p.level,
      startIso: p.startIso,
      endIso: p.endIso,
      isCurrent: containsInstant(p.startIso, p.endIso, input.asOfIso),
      factIds: [p.factId],
      rule,
    }));
}

function assessOne(input: InterpretationInput, y: YogaResult, planets: PlanetCondition[]): YogaAssessment {
  const family = yogaFamily(y.id);
  const factId = yogaFactId(y.id);
  const keyPlanets = keyPlanetsOf(y);
  const relation = relationOf(y, family);
  const formationRule = { ...s4RuleRef(S4_RULE_IDS.FORMATION), source: y.convention || s4RuleRef(S4_RULE_IDS.FORMATION).source };
  const formation: YogaFormationEvidence = {
    satisfiedConditions: y.evidence.conditions.filter((c) => c.satisfied).map((c) => c.description),
    relation,
    keyPlanets,
    rule: formationRule,
  };
  const factors = strengthFactors(input, y, family, keyPlanets, planets);
  const variant = variantOf(y, family, keyPlanets);
  const mods = modifiers(family, variant, factors);
  const { list: cancellations, bhanga } = cancellationsOf(y);
  const cancelled = y.assessment?.cancelled === true || bhanga;
  const hasShadbala = (p: PlanetName): boolean | null => {
    const s = shadbalaOf(input, y, planets.find((pc) => pc.planet === p), p);
    return s ? s.meets : null;
  };
  const { yogaClass, trace } = classify(cancelled, family, keyPlanets, factors, hasShadbala);
  const activations = activationWindows(input, keyPlanets);

  // Stage conditions (A4 feeds them to the conflict policy). Modifiers are `context`: they
  // change the kind of result, not its strength. Pending-client factors are left out.
  const conditions: ConditionEntry[] = [
    { factId, conditionCode: 'YOGA_FORMED', ruleId: S4_RULE_IDS.FORMATION, direction: 'context' },
  ];
  const relCode = RELATION_CODE[relation];
  if (relCode) conditions.push({ factId, conditionCode: relCode, ruleId: S4_RULE_IDS.FORMATION, direction: 'context' });
  if (relation === 'ownership') {
    conditions.push({ factId, conditionCode: 'YOGAKARAKA_BY_OWNERSHIP', ruleId: S4_RULE_IDS.FORMATION, direction: 'context' });
  }
  if (cancelled) conditions.push({ factId, conditionCode: 'YOGA_CANCELLED', ruleId: S4_RULE_IDS.CLASS, direction: 'challenges' });
  for (const f of factors) {
    if (f.rule.status === 'pending-client') continue;
    conditions.push({ factId: f.factIds[0], conditionCode: f.conditionCode, ruleId: f.rule.ruleId, direction: f.direction === 'support' ? 'supports' : 'challenges' });
  }
  for (const m of mods) conditions.push({ factId, conditionCode: m.code, ruleId: m.rule.ruleId, direction: 'context' });
  for (const a of activations.filter((w) => w.isCurrent)) {
    conditions.push({ factId: a.factIds[0], conditionCode: a.level === 'mahadasha' ? 'YOGA_ACTIVE_MAHADASHA' : 'YOGA_ACTIVE_ANTARDASHA', ruleId: S4_RULE_IDS.ACTIVATION, direction: 'context' });
  }

  return {
    yogaId: y.id,
    factId,
    name: y.canonicalName,
    formed: y.isDetected || y.assessment?.formed === true,
    formation,
    strengthFactors: factors,
    modifiers: mods,
    cancellations,
    yogaClass,
    classTrace: trace,
    activations,
    conditions,
    provisional: true,
  };
}

/**
 * Output order = input order of `input.yogas` (engine order), filtered to formed yogas.
 * `facts` is not consulted: fact IDs follow the registry grammar; missing ones are listed for
 * A5 in scratchpad A3-fact-ids.md.
 */
export const runS4YogaAssessment: RunS4YogaAssessment = (input, _facts: FactView, deps) =>
  input.yogas
    .filter((y) => y.isDetected || y.assessment?.formed === true)
    .map((y) => assessOne(input, y, deps.planets));

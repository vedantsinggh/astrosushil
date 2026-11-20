/**
 * Career pack result builders (S7/S8). Each builder reads the stage outputs, collects the
 * supporting and challenging conditions of every factor of its question, resolves them with the
 * conflict policy (`ctx.resolve`) and renders a closed-set conclusion from `templates.ts`.
 *
 * Set logic only: no weights, no counts, no single-heuristic verdicts. A multi-factor question
 * (a career dimension) resolves each factor on its own subject first, so a precedence rule never
 * crosses from one planet to another; the standing conditions of all factors then give the class
 * (supporting and challenging both standing → 'mixed').
 *
 * Builders only use rules present in `ctx.rules` (the pipeline leaves pending-client rules out
 * unless a test asks for them), so an unsourced factor is never rendered.
 */
import { applicablePrecedenceRules } from '../../conflict/policy';
import { sortQualifications, toConflictInput } from '../../conflict/resolve';
import { buildInterpretationId } from '../../ids';
import type { PackBuildContext } from '../../stages';
import type {
  Activation,
  AppliedPrecedence,
  ConditionCode,
  ConditionEntry,
  DashaActivation,
  EvidenceLink,
  HouseAssessment,
  InterpretationResult,
  PlanetCondition,
  PlanetName,
  QualificationCode,
  Resolution,
  SaturnFromMoonActivation,
  StrengthClass,
  TimeRelevance,
  TransitOverNatalActivation,
  VargaSignDignity,
  YogaAssessment,
} from '../../types';
import { signFrom, signLordName, signName } from '../../util/count';
import {
  CONDITION_PHRASES,
  DIMENSIONS,
  STRENGTH_PHRASES,
  assessmentCode,
  aspectsText,
  d10HouseLordQuestion,
  d10HouseLordText,
  d10LordCode,
  d10TenthLordQuestion,
  d10TenthLordText,
  d1d10Question,
  d1d10Text,
  dimensionConclusionText,
  earningsQuestion,
  earningsText,
  fieldsQuestion,
  fieldsText,
  houseQuestions,
  lordPlacementText,
  mdAdQuestion,
  mdAdText,
  occupantsText,
  ordinal,
  periodQuestion,
  periodText,
  placementCode,
  planetDignityCode,
  planetQuestion,
  planetText,
  saturnMoonQuestion,
  saturnMoonText,
  savText,
  transitQuestion,
  transitText,
  vargottamaQuestion,
  vargottamaText,
  yogaQuestion,
  yogaText,
  type D1D10AgreementCode,
  type DimensionKey,
  type PeriodSlot,
  type SaturnMoonCode,
  type SavCode,
  type YogaCode,
} from './templates';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Houses with a `career.house-N` topic (proposal §8). */
export const CAREER_HOUSES = [1, 2, 6, 7, 10, 11] as const;
/** D10 houses whose lords are read (CAR-002). */
export const D10_LORD_HOUSES = [1, 6, 7, 10, 11] as const;
/** Trine lords (CAR-018). */
export const TRINE_HOUSES = [1, 5, 9] as const;

/** CAR-005: career-relevant yoga categories and ids (same filter as report-engine career-calc). */
const CAREER_YOGA_CATEGORIES = new Set(['RAJA', 'DHANA', 'MAHAPURUSHA', 'SURYA', 'NEECHA_BHANGA', 'PARIVARTANA', 'VIPARITA']);
const CAREER_YOGA_IDS = new Set([
  'YOGA_GAJAKESARI',
  'YOGA_CHANDRA_MANGALA',
  'YOGA_AMALA',
  'YOGA_DHARMA_KARMADHIPATI',
  'YOGA_LAKSHMI',
  'YOGA_SARASWATI',
  'YOGA_BUDHA_ADITYA',
]);

/** Working-age window for the earnings window (INT-T-003; provisional, client question Q-G-3). */
export const EARNINGS_MIN_AGE = 16;
export const EARNINGS_MAX_AGE = 60;

/** CAR-015 career links of a period lord. */
const CAREER_LINK_HOUSES = [2, 6, 10, 11] as const;
const CAREER_D10_HOUSES = [1, 10, 11] as const;

/** Planet-strength codes used when a planet is one factor of a wider question. */
const STRENGTH_CODES: ReadonlySet<ConditionCode> = new Set<ConditionCode>([
  'EXALTED',
  'MOOLATRIKONA',
  'OWN_SIGN',
  'GREAT_FRIEND_SIGN',
  'FRIEND_SIGN',
  'NEUTRAL_SIGN',
  'ENEMY_SIGN',
  'GREAT_ENEMY_SIGN',
  'DEBILITATED',
  'NEECHA_BHANGA',
  'D9_EXALTED',
  'D9_OWN_SIGN',
  'D9_DEBILITATED',
  'D10_EXALTED',
  'D10_OWN_SIGN',
  'D10_DEBILITATED',
  'VARGOTTAMA',
  'COMBUST',
  'RETROGRADE',
  'SHADBALA_MEETS_REQUIRED',
  'SHADBALA_BELOW_REQUIRED',
]);
const D10_DIGNITY_CODES: ReadonlySet<ConditionCode> = new Set<ConditionCode>(['D10_EXALTED', 'D10_OWN_SIGN', 'D10_DEBILITATED']);
const PLACEMENT_IN_CODES: ReadonlySet<ConditionCode> = new Set<ConditionCode>(['IN_KENDRA', 'IN_TRIKONA', 'IN_DUSTHANA', 'IN_UPACHAYA']);
const LORD_PLACEMENT_CODES: ReadonlySet<ConditionCode> = new Set<ConditionCode>([
  'LORD_IN_KENDRA',
  'LORD_IN_TRIKONA',
  'LORD_IN_DUSTHANA',
  'LORD_IN_UPACHAYA',
  'LORD_IN_OTHER',
  'LORD_IN_OWN_HOUSE',
]);
const SAV_CONDITION_CODES: ReadonlySet<ConditionCode> = new Set<ConditionCode>(['SAV_ABOVE_28', 'SAV_AT_28', 'SAV_BELOW_28']);
const OCCUPANT_CODES: ReadonlySet<ConditionCode> = new Set<ConditionCode>(['HOUSE_OCCUPIED', 'HOUSE_EMPTY', 'OCCUPANT_FUNCTIONAL_FAVOURABLE', 'OCCUPANT_FUNCTIONAL_CHALLENGING']);
const ASPECT_CODES: ReadonlySet<ConditionCode> = new Set<ConditionCode>(['HOUSE_ASPECTED', 'HOUSE_NOT_ASPECTED', 'ASPECT_FROM_FUNCTIONAL_FAVOURABLE', 'ASPECT_FROM_FUNCTIONAL_CHALLENGING']);

// ---------------------------------------------------------------------------
// Assessment helper (S7)
// ---------------------------------------------------------------------------

export interface Factor {
  /** Subject of the precedence check, e.g. 'planet.venus', 'house.10.lord'. */
  subject: string;
  conditions: readonly ConditionEntry[];
}

export interface Assessment {
  strengthClass: StrengthClass;
  supporting: EvidenceLink[];
  contradicting: EvidenceLink[];
  resolution?: Resolution;
  qualification: QualificationCode[];
  /** Applied precedence rule IDs and the stage rule IDs of the links. */
  ruleIds: string[];
  sources: string[];
  factIds: string[];
}

const byString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const linkKey = (l: EvidenceLink): string => `${l.factId}|${l.conditionCode}|${l.ruleId}`;
const strip = ({ factId, conditionCode, ruleId }: EvidenceLink): EvidenceLink => ({ factId, conditionCode, ruleId });

function dedupe(links: readonly EvidenceLink[]): EvidenceLink[] {
  const seen = new Map<string, EvidenceLink>();
  for (const l of links) if (!seen.has(linkKey(l))) seen.set(linkKey(l), strip(l));
  return [...seen.values()];
}

const enabled = (ctx: PackBuildContext, ruleId: string): boolean => ctx.rules[ruleId] !== undefined;

/** Conditions whose classifying rule is enabled in this run. */
function usable(ctx: PackBuildContext, conditions: readonly ConditionEntry[]): ConditionEntry[] {
  return conditions.filter((c) => enabled(ctx, c.ruleId));
}

/**
 * Resolve one question from its factors. One factor → the policy on that subject. Several
 * factors → the policy per factor subject, then set logic over the standing conditions of all
 * factors (precedence trigger codes are left out at that level so a rule never crosses subjects).
 */
export function assessFactors(ctx: PackBuildContext, subject: string, factors: readonly Factor[], assess = true): Assessment {
  const live = factors.map((f) => ({ subject: f.subject, conditions: usable(ctx, f.conditions) }));
  const factIds = new Set(live.flatMap((f) => f.conditions.map((c) => c.factId)));

  if (live.length === 1 || !assess) {
    const all = live.flatMap((f) => f.conditions);
    const input = toConflictInput(subject, all, assess);
    const out = ctx.resolve(input);
    const showResolution = out.resolution.applied.length > 0 || out.strengthClass === 'mixed';
    return {
      strengthClass: out.strengthClass,
      supporting: dedupe(input.supporting),
      contradicting: dedupe(input.contradicting),
      ...(showResolution ? { resolution: out.resolution } : {}),
      qualification: out.qualification,
      ruleIds: [...new Set([...out.ruleIds, ...all.map((c) => c.ruleId)])].sort(byString),
      sources: out.sources,
      factIds: [...factIds].sort(byString),
    };
  }

  const triggers = new Set<ConditionCode>(applicablePrecedenceRules(ctx.policy).map((r) => r.when.a));
  const standingS: EvidenceLink[] = [];
  const standingC: EvidenceLink[] = [];
  const overS: EvidenceLink[] = [];
  const overC: EvidenceLink[] = [];
  const applied: AppliedPrecedence[] = [];
  const qualification: QualificationCode[] = [];
  const crp = new Set<string>();
  const sources = new Set<string>();
  const stageRules = new Set<string>();

  for (const f of live) {
    for (const c of f.conditions) stageRules.add(c.ruleId);
    const input = toConflictInput(f.subject, f.conditions);
    const out = ctx.resolve(input);
    const over = new Set(out.overridden.map(linkKey));
    overS.push(...input.supporting.filter((l) => over.has(linkKey(l))));
    overC.push(...input.contradicting.filter((l) => over.has(linkKey(l))));
    standingS.push(...out.standingSupporting.filter((l) => !triggers.has(l.conditionCode)));
    standingC.push(...out.standingContradicting.filter((l) => !triggers.has(l.conditionCode)));
    applied.push(...out.resolution.applied);
    qualification.push(...out.qualification.filter((q) => q !== 'MIXED_INDICATORS'));
    out.ruleIds.forEach((id) => crp.add(id));
    out.sources.forEach((s) => sources.add(s));
  }

  const supporting = dedupe(standingS);
  const contradicting = dedupe(standingC);
  const top = ctx.resolve({ subject, supporting, contradicting, context: [] });
  let strengthClass = top.strengthClass;
  if (strengthClass === 'supported' && overC.length > 0) strengthClass = 'resolved-supported';
  if (strengthClass === 'challenged' && overS.length > 0) strengthClass = 'resolved-challenged';

  const appliedUnique = [...new Map(applied.map((a) => [`${a.precedenceRuleId}|${a.overrides}|${a.overridden}`, a])).values()].sort(
    (x, y) => byString(x.precedenceRuleId, y.precedenceRuleId) || byString(x.overridden, y.overridden),
  );
  const resolution: Resolution = { policyId: top.resolution.policyId, applied: appliedUnique, unresolved: top.resolution.unresolved };
  const showResolution = appliedUnique.length > 0 || strengthClass === 'mixed';

  return {
    strengthClass,
    supporting: dedupe([...supporting, ...overS]),
    contradicting: dedupe([...contradicting, ...overC]),
    ...(showResolution ? { resolution } : {}),
    qualification: sortQualifications([...qualification, ...top.qualification]),
    ruleIds: [...new Set([...crp, ...top.ruleIds, ...stageRules])].sort(byString),
    sources: [...sources, ...top.sources].sort(byString),
    factIds: [...factIds].sort(byString),
  };
}

/** Deterministic "because" sentence from the assessment. */
export function explain(a: Assessment, extra: readonly string[] = []): string {
  const phrase = (l: EvidenceLink) => `${CONDITION_PHRASES[l.conditionCode]} [${l.factId}]`;
  const parts: string[] = [`${STRENGTH_PHRASES[a.strengthClass]}`];
  if (a.supporting.length) parts.push(`supporting: ${a.supporting.map(phrase).join('; ')}`);
  if (a.contradicting.length) parts.push(`challenging: ${a.contradicting.map(phrase).join('; ')}`);
  for (const ap of a.resolution?.applied ?? []) {
    parts.push(`${ap.precedenceRuleId} sets aside "${CONDITION_PHRASES[ap.overridden]}" because of "${CONDITION_PHRASES[ap.overrides]}"`);
  }
  parts.push(...extra);
  return `${parts.join('. ')}.`;
}

// ---------------------------------------------------------------------------
// Result assembly
// ---------------------------------------------------------------------------

interface ResultSpec {
  topic: string;
  parts: string[];
  question: string;
  code: string;
  text: string;
  assessment: Assessment;
  packRuleIds: string[];
  extraRefs?: string[];
  extraExplanation?: string[];
  extraQualification?: QualificationCode[];
  extraSources?: string[];
  timeRelevance?: TimeRelevance;
}

function makeResult(ctx: PackBuildContext, spec: ResultSpec): InterpretationResult {
  const a = spec.assessment;
  const refs = new Set<string>([...a.factIds, ...a.supporting.map((l) => l.factId), ...a.contradicting.map((l) => l.factId)]);
  for (const r of spec.extraRefs ?? []) if (ctx.facts.has(r)) refs.add(r);
  if (spec.timeRelevance && spec.timeRelevance.kind !== 'natal') {
    for (const r of spec.timeRelevance.activatedBy) refs.add(r);
  }
  const ruleIds = [...new Set([...spec.packRuleIds, ...a.ruleIds])].sort(byString);
  const sources = new Set<string>([...a.sources, ...(spec.extraSources ?? [])]);
  for (const id of spec.packRuleIds) for (const s of ctx.rules[id]?.sources ?? []) sources.add(s);
  const provisional = ruleIds.some((id) => ctx.rules[id]?.status === 'provisional');
  return {
    id: buildInterpretationId(spec.topic, ...spec.parts),
    topic: spec.topic,
    question: spec.question,
    conclusion: { code: spec.code, text: spec.text },
    supporting: a.supporting,
    contradicting: a.contradicting,
    ruleIds,
    chartRefs: [...refs].sort(byString),
    strengthClass: a.strengthClass,
    timeRelevance: spec.timeRelevance ?? { kind: 'natal' },
    qualification: sortQualifications([
      ...ctx.stages.s1.qualification,
      ...a.qualification,
      ...(spec.extraQualification ?? []),
      ...(provisional ? (['PROVISIONAL_RULE'] as const) : []),
    ]),
    explanation: explain(a, spec.extraExplanation),
    ...(a.resolution ? { resolution: a.resolution } : {}),
    provisional,
    sources: [...sources].sort(byString),
  };
}

// ---------------------------------------------------------------------------
// Stage lookups
// ---------------------------------------------------------------------------

function planetOf(ctx: PackBuildContext, p: PlanetName): PlanetCondition {
  const found = ctx.stages.s2.find((x) => x.planet === p);
  if (!found) throw new Error(`INTERPRETATION_STAGE_MISSING: S2 has no ${p}`);
  return found;
}

function houseOf(ctx: PackBuildContext, n: number): HouseAssessment {
  const found = ctx.stages.s3.find((h) => h.house === n);
  if (!found) throw new Error(`INTERPRETATION_STAGE_MISSING: S3 has no house ${n}`);
  return found;
}

const withCodes = (conditions: readonly ConditionEntry[], codes: ReadonlySet<ConditionCode>): ConditionEntry[] =>
  conditions.filter((c) => codes.has(c.conditionCode));

const key = (p: PlanetName): string => p.toLowerCase();

/** D10 house lord (whole sign from the D10 ascendant); null when the D10 is absent. */
function d10HouseLord(ctx: PackBuildContext, n: number): { lord: PlanetName; sign: string } | null {
  const asc = ctx.input.vargas.D10?.ascendant?.rashiIndex;
  if (asc === undefined) return null;
  const rashi = signFrom(asc, n);
  return { lord: signLordName(rashi), sign: signName(rashi) };
}

// --- factors ---------------------------------------------------------------

const planetStrength = (ctx: PackBuildContext, p: PlanetName): Factor => ({
  subject: `planet.${key(p)}`,
  conditions: withCodes(planetOf(ctx, p).conditions, STRENGTH_CODES),
});
const lordStrength = (ctx: PackBuildContext, n: number): Factor => planetStrength(ctx, houseOf(ctx, n).lord);
const lordPlacement = (ctx: PackBuildContext, n: number): Factor => ({
  subject: `house.${n}.lord-house`,
  conditions: withCodes(houseOf(ctx, n).conditions, LORD_PLACEMENT_CODES),
});
const savFactor = (ctx: PackBuildContext, n: number): Factor => ({
  subject: `house.${n}.sav`,
  conditions: withCodes(houseOf(ctx, n).conditions, SAV_CONDITION_CODES),
});
const occupantsFactor = (ctx: PackBuildContext, n: number): Factor => ({
  subject: `house.${n}.occupants`,
  conditions: withCodes(houseOf(ctx, n).conditions, OCCUPANT_CODES),
});
const aspectsFactor = (ctx: PackBuildContext, n: number): Factor => ({
  subject: `house.${n}.aspects`,
  conditions: withCodes(houseOf(ctx, n).conditions, ASPECT_CODES),
});
function d10LordFactor(ctx: PackBuildContext, n: number): Factor[] {
  const d = d10HouseLord(ctx, n);
  if (!d) return [];
  return [{ subject: `d10.house-${n}.lord`, conditions: withCodes(planetOf(ctx, d.lord).conditions, D10_DIGNITY_CODES) }];
}

/** Formed career yogas (CAR-005), optionally restricted to engine categories. */
function careerYogas(ctx: PackBuildContext, categories?: readonly string[]): YogaAssessment[] {
  const byId = new Map(ctx.input.yogas.map((y) => [y.id, y]));
  return ctx.stages.s4
    .filter((y) => {
      if (!y.formed) return false;
      const engine = byId.get(y.yogaId);
      const category = engine?.category ?? '';
      const relevant = CAREER_YOGA_CATEGORIES.has(category) || CAREER_YOGA_IDS.has(y.yogaId);
      return relevant && (!categories || categories.includes(category));
    })
    .sort((a, b) => byString(a.factId, b.factId));
}

const yogaFactors = (ys: readonly YogaAssessment[]): Factor[] => ys.map((y) => ({ subject: y.factId, conditions: y.conditions }));
const YOGA_RULES = ['INT-CY-001', 'INT-CY-002'];

// ---------------------------------------------------------------------------
// Topic builders
// ---------------------------------------------------------------------------

export function buildHouseTopic(n: number) {
  const topic = `career.house-${n}`;
  return (ctx: PackBuildContext): InterpretationResult[] => {
    const h = houseOf(ctx, n);
    const q = houseQuestions(n);
    const lord = planetOf(ctx, h.lord);
    const pCode = placementCode(h.lordPlacementCategories);

    const lordConds = [
      ...withCodes(h.conditions, LORD_PLACEMENT_CODES),
      ...lord.conditions.filter((c) => !PLACEMENT_IN_CODES.has(c.conditionCode)),
    ];
    const results: InterpretationResult[] = [
      makeResult(ctx, {
        topic,
        parts: ['lord-placement'],
        question: q.lordPlacement,
        code: `LORD_IN_${pCode}`,
        text: lordPlacementText(n, h.lord, h.lordHouse, pCode),
        assessment: assessFactors(ctx, `house.${n}.lord`, [{ subject: `house.${n}.lord`, conditions: lordConds }]),
        packRuleIds: ['INT-H-001', 'INT-H-002'],
        extraRefs: [`house.${n}.d1.lord`, `house.${n}.d1.lord-house`],
      }),
    ];

    if (h.sav) {
      const code = (h.sav.comparison === 'above' ? 'SAV_ABOVE_28' : h.sav.comparison === 'below' ? 'SAV_BELOW_28' : 'SAV_AT_28') as SavCode;
      results.push(
        makeResult(ctx, {
          topic,
          parts: ['sav'],
          question: q.sav,
          code,
          text: savText(n, h.sav.bindus, code),
          assessment: assessFactors(ctx, `house.${n}.sav`, [savFactor(ctx, n)]),
          packRuleIds: ['INT-H-003'],
          extraRefs: [h.sav.factId],
        }),
      );
    }

    results.push(
      makeResult(ctx, {
        topic,
        parts: ['occupants'],
        question: q.occupants,
        code: h.occupants.length ? 'HOUSE_OCCUPIED' : 'HOUSE_EMPTY',
        text: occupantsText(n, h.occupants),
        assessment: assessFactors(ctx, `house.${n}.occupants`, [occupantsFactor(ctx, n)]),
        packRuleIds: ['INT-H-010'],
        extraRefs: [`house.${n}.d1.occupants`],
      }),
      makeResult(ctx, {
        topic,
        parts: ['aspects'],
        question: q.aspects,
        code: h.aspectedBy.length ? 'HOUSE_ASPECTED' : 'HOUSE_NOT_ASPECTED',
        text: aspectsText(n, h.aspectedBy),
        assessment: assessFactors(ctx, `house.${n}.aspects`, [aspectsFactor(ctx, n)]),
        packRuleIds: ['INT-H-011'],
      }),
    );
    return results;
  };
}

export function buildPlanetTopic(ctx: PackBuildContext): InterpretationResult[] {
  return ctx.stages.s2.map((p) =>
    makeResult(ctx, {
      topic: 'career.planet',
      parts: [key(p.planet)],
      question: planetQuestion(p.planet),
      code: planetDignityCode(p.dignity.value),
      text: planetText(p.planet, p.dignity.value, p.sign, p.house),
      assessment: assessFactors(ctx, `planet.${key(p.planet)}`, [{ subject: `planet.${key(p.planet)}`, conditions: p.conditions }]),
      packRuleIds: ['INT-P-001'],
      extraRefs: [p.dignity.factId, `planet.${key(p.planet)}.d1.sign`, `planet.${key(p.planet)}.d1.house`],
    }),
  );
}

export function buildYogaTopic(ctx: PackBuildContext): InterpretationResult[] {
  return careerYogas(ctx).map((y) => {
    const code = `YOGA_FORMED_${y.yogaClass.toUpperCase()}` as YogaCode;
    const current = y.activations.filter((w) => w.isCurrent);
    const useActivation = current.length > 0 && enabled(ctx, 'INT-CY-003');
    return makeResult(ctx, {
      topic: 'career.yoga',
      parts: [y.factId.replace(/^yoga\./, '')],
      question: yogaQuestion(y.name),
      code,
      text: yogaText(y.name, code),
      assessment: assessFactors(ctx, y.factId, [{ subject: y.factId, conditions: y.conditions }]),
      packRuleIds: [...YOGA_RULES, ...(useActivation ? ['INT-CY-003'] : [])],
      extraRefs: [y.factId, ...(useActivation ? current.flatMap((w) => w.factIds) : [])],
      extraExplanation: useActivation
        ? [`the ${current.map((w) => `${w.planet} ${w.level}`).join(' and ')} of a key planet of this yoga is running now`]
        : [],
    });
  });
}

export function buildD10Topic(ctx: PackBuildContext): InterpretationResult[] {
  const results: InterpretationResult[] = [];
  const s5 = ctx.stages.s5;
  const tHouse = s5.find((l) => l.kind === 'tenth-lord-d10-house');
  const tDignity = s5.find((l) => l.kind === 'tenth-lord-d10-dignity');
  if (tHouse && tHouse.planet && tHouse.divisional && tHouse.divisional.house !== null) {
    const dignity: VargaSignDignity = tDignity?.divisional?.dignity ?? 'NONE';
    const pCode = placementCode(houseCategories(tHouse.divisional.house));
    const factors: Factor[] = [{ subject: tHouse.id, conditions: tHouse.conditions }];
    if (tDignity) factors.push({ subject: tDignity.id, conditions: tDignity.conditions });
    // One planet: both links describe the D1 10th lord in the D10, so they share one subject.
    const assessment = assessFactors(ctx, `d10.tenth-lord`, [{ subject: 'd10.tenth-lord', conditions: factors.flatMap((f) => f.conditions) }]);
    results.push(
      makeResult(ctx, {
        topic: 'career.d10',
        parts: ['tenth-lord'],
        question: d10TenthLordQuestion,
        code: `IN_D10_${pCode}`,
        text: d10TenthLordText(tHouse.planet, tHouse.divisional.sign, tHouse.divisional.house, pCode, dignity),
        assessment,
        packRuleIds: ['INT-D-001'],
        extraRefs: [...tHouse.factIds, ...(tDignity?.factIds ?? [])],
      }),
    );
  }

  for (const n of D10_LORD_HOUSES) {
    const d = d10HouseLord(ctx, n);
    if (!d) continue;
    const vd = planetOf(ctx, d.lord).vargaDignity.d10;
    if (!vd) continue;
    const factors = d10LordFactor(ctx, n);
    results.push(
      makeResult(ctx, {
        topic: 'career.d10',
        parts: [`house-${n}`, 'lord'],
        question: d10HouseLordQuestion(n),
        code: d10LordCode(vd.value),
        text: d10HouseLordText(n, d.lord, vd.sign, vd.house, vd.value),
        assessment: assessFactors(ctx, `d10.house-${n}.lord`, factors),
        packRuleIds: ['INT-D-004'],
        extraRefs: [`career.d10.house.${n}.lord`, 'asc.d10.sign', ...vd.factIds],
      }),
    );
  }
  return results;
}

function houseCategories(house: number) {
  const out: Array<'kendra' | 'trikona' | 'dusthana' | 'upachaya'> = [];
  if ([1, 4, 7, 10].includes(house)) out.push('kendra');
  if ([1, 5, 9].includes(house)) out.push('trikona');
  if ([6, 8, 12].includes(house)) out.push('dusthana');
  if ([3, 6, 10, 11].includes(house)) out.push('upachaya');
  return out;
}

export function buildD1D10Topic(ctx: PackBuildContext): InterpretationResult[] {
  const results: InterpretationResult[] = [];
  const same = ctx.stages.s5.filter((l) => l.kind === 'same-lord-d1-d10');
  if (same.length > 0) {
    const lagna = same.find((l) => l.id.endsWith('house-1'))?.agreement === true;
    const tenth = same.find((l) => l.id.endsWith('house-10'))?.agreement === true;
    const code: D1D10AgreementCode = lagna && tenth ? 'SAME_LORD_LAGNA_AND_TENTH' : lagna ? 'SAME_LORD_LAGNA_ONLY' : tenth ? 'SAME_LORD_TENTH_ONLY' : 'NO_SAME_LORD';
    results.push(
      makeResult(ctx, {
        topic: 'career.d1-d10',
        parts: ['agreement'],
        question: d1d10Question,
        code,
        text: d1d10Text(code),
        assessment: assessFactors(ctx, 'd1-d10.agreement', [{ subject: 'd1-d10.agreement', conditions: same.flatMap((l) => l.conditions) }], false),
        packRuleIds: ['INT-D-003'],
        extraRefs: same.flatMap((l) => l.factIds),
      }),
    );
  }
  const varg = ctx.stages.s5.filter((l) => l.kind === 'vargottama');
  if (varg.length > 0) {
    const planets = varg.filter((l) => l.agreement === true && l.planet).map((l) => l.planet as PlanetName);
    results.push(
      makeResult(ctx, {
        topic: 'career.d1-d10',
        parts: ['vargottama'],
        question: vargottamaQuestion,
        code: planets.length ? 'VARGOTTAMA_PRESENT' : 'VARGOTTAMA_NONE',
        text: vargottamaText(planets),
        assessment: assessFactors(ctx, 'd1-d9.vargottama', [{ subject: 'd1-d9.vargottama', conditions: varg.flatMap((l) => l.conditions) }], false),
        packRuleIds: ['INT-D-002'],
        extraRefs: varg.filter((l) => l.agreement === true).flatMap((l) => l.factIds),
      }),
    );
  }
  return results;
}

// --- dimensions -------------------------------------------------------------

interface DimensionSpec {
  factors: Factor[];
  packRuleIds: string[];
  extraRefs?: string[];
  extraExplanation?: string[];
  extraQualification?: QualificationCode[];
}

function dimensionResult(ctx: PackBuildContext, dim: DimensionKey, spec: DimensionSpec): InterpretationResult {
  const topic = `career.${dim}`;
  const assessment = assessFactors(ctx, topic, spec.factors);
  const code = assessmentCode(assessment.strengthClass);
  return makeResult(ctx, {
    topic,
    parts: [],
    question: DIMENSIONS[dim].question,
    code,
    text: dimensionConclusionText(dim, code),
    assessment,
    packRuleIds: spec.packRuleIds,
    extraRefs: spec.extraRefs,
    extraExplanation: spec.extraExplanation,
    extraQualification: spec.extraQualification,
  });
}

/** CAR-006 comparison facts: context only, never a link (they decide nothing on their own). */
function savComparison(ctx: PackBuildContext, ruleId: 'INT-C-002' | 'INT-C-003', a: number, b: number) {
  const factId = ruleId === 'INT-C-002' ? 'career.sav.service-vs-partnership' : 'career.sav.effort-vs-gain';
  if (!enabled(ctx, ruleId)) return { refs: [] as string[], text: [] as string[], q: [] as QualificationCode[], rules: [] as string[] };
  const sa = houseOf(ctx, a).sav?.bindus;
  const sb = houseOf(ctx, b).sav?.bindus;
  if (sa === undefined || sb === undefined) return { refs: [], text: [], q: [], rules: [] };
  const rel = sa > sb ? 'higher than' : sa < sb ? 'lower than' : 'equal to';
  return {
    refs: [factId, `sav.house.${a}`, `sav.house.${b}`],
    text: [
      `context (practitioner heuristic, CAR-006): the ${ordinal(a)} house SAV (${sa}) is ${rel} the ${ordinal(b)} (${sb}); this comparison is one tendency and does not decide the result`,
    ],
    q: ['PRACTITIONER_HEURISTIC'] as QualificationCode[],
    rules: [ruleId],
  };
}

function sunSaturnContext(ctx: PackBuildContext) {
  if (!enabled(ctx, 'INT-C-001')) return { refs: [] as string[], text: [] as string[], rules: [] as string[] };
  const refs = ['career.gov.sun-saturn', 'career.gov.sun-tenth'].filter((r) => ctx.facts.has(r));
  if (refs.length === 0) return { refs: [], text: [], rules: [] };
  const text = refs.map((r) => {
    const v = ctx.facts.get(r)?.value;
    const empty = Array.isArray(v) && v.length === 0;
    const what = r.endsWith('sun-saturn') ? 'Sun–Saturn link' : 'Sun–10th-house link';
    return empty
      ? `context (CAR-016): no ${what}; this is "no specific indicator", not a negative indicator`
      : `context (CAR-016): ${what} present [${r}]`;
  });
  return { refs, text, rules: ['INT-C-001'] };
}

export function buildDimensionTopic(dim: DimensionKey) {
  return (ctx: PackBuildContext): InterpretationResult[] => {
    switch (dim) {
      case 'service-orientation': {
        const cmp = savComparison(ctx, 'INT-C-002', 6, 7);
        const gov = sunSaturnContext(ctx);
        return [
          dimensionResult(ctx, dim, {
            factors: [lordStrength(ctx, 6), lordPlacement(ctx, 6), savFactor(ctx, 6), planetStrength(ctx, 'Saturn'), ...d10LordFactor(ctx, 6)],
            packRuleIds: ['INT-CAR-001', ...cmp.rules, ...gov.rules],
            extraRefs: [...cmp.refs, ...gov.refs, 'house.6.d1.lord'],
            extraExplanation: [...gov.text, ...cmp.text],
            extraQualification: cmp.q,
          }),
        ];
      }
      case 'enterprise': {
        const cmp = savComparison(ctx, 'INT-C-002', 6, 7);
        return [
          dimensionResult(ctx, dim, {
            factors: [lordStrength(ctx, 7), lordPlacement(ctx, 7), savFactor(ctx, 7), planetStrength(ctx, 'Mercury'), ...d10LordFactor(ctx, 7)],
            packRuleIds: ['INT-CAR-002', ...cmp.rules],
            extraRefs: [...cmp.refs, 'house.7.d1.lord'],
            extraExplanation: cmp.text,
            extraQualification: cmp.q,
          }),
        ];
      }
      case 'leadership': {
        const raja = careerYogas(ctx, ['RAJA']);
        return [
          dimensionResult(ctx, dim, {
            factors: [planetStrength(ctx, 'Sun'), lordStrength(ctx, 10), lordPlacement(ctx, 10), lordStrength(ctx, 1), ...yogaFactors(raja)],
            packRuleIds: ['INT-CAR-003', ...(raja.length ? YOGA_RULES : [])],
            extraRefs: ['house.10.d1.lord', 'asc.d1.lord', ...raja.map((y) => y.factId)],
          }),
        ];
      }
      case 'analytical': {
        const extra: string[] = [];
        const refs: string[] = ['house.5.d1.lord'];
        const rules = ['INT-CAR-004'];
        const mars = planetOf(ctx, 'Mars');
        const saturn = planetOf(ctx, 'Saturn');
        if (enabled(ctx, 'INT-CAR-041') && mars.sign === saturn.sign && ctx.facts.has('career.bnn.conjunct')) {
          refs.push('career.bnn.conjunct');
          rules.push('INT-CAR-041');
          extra.push(`context (pending client review): Mars and Saturn share ${mars.sign}`);
        }
        return [
          dimensionResult(ctx, dim, {
            factors: [planetStrength(ctx, 'Mercury'), lordStrength(ctx, 5), lordPlacement(ctx, 5)],
            packRuleIds: rules,
            extraRefs: refs,
            extraExplanation: extra,
          }),
        ];
      }
      case 'financial-growth': {
        const cmp = savComparison(ctx, 'INT-C-003', 11, 10);
        const dhana = careerYogas(ctx, ['DHANA']);
        return [
          dimensionResult(ctx, dim, {
            factors: [
              lordStrength(ctx, 2),
              lordStrength(ctx, 11),
              savFactor(ctx, 2),
              savFactor(ctx, 11),
              planetStrength(ctx, 'Jupiter'),
              ...yogaFactors(dhana),
            ],
            packRuleIds: ['INT-CAR-005', ...cmp.rules, ...(dhana.length ? YOGA_RULES : [])],
            extraRefs: [...cmp.refs, 'house.2.d1.lord', 'house.11.d1.lord', ...dhana.map((y) => y.factId)],
            extraExplanation: cmp.text,
            extraQualification: cmp.q,
          }),
        ];
      }
      case 'recognition': {
        const extra: string[] = [];
        const refs: string[] = ['house.10.d1.lord'];
        const rules = ['INT-CAR-006'];
        if (enabled(ctx, 'INT-CAR-061') && planetOf(ctx, 'Rahu').house === 10) {
          refs.push('planet.rahu.d1.house');
          rules.push('INT-CAR-061');
          extra.push('context (pending client review): Rahu occupies the 10th house');
        }
        return [
          dimensionResult(ctx, dim, {
            factors: [lordStrength(ctx, 10), savFactor(ctx, 10), occupantsFactor(ctx, 10), aspectsFactor(ctx, 10), ...d10LordFactor(ctx, 10)],
            packRuleIds: rules,
            extraRefs: refs,
            extraExplanation: extra,
          }),
        ];
      }
      case 'stability': {
        const extra: string[] = [];
        const refs: string[] = ['house.10.d1.lord-house', 'house.4.d1.lord'];
        const rules = ['INT-CAR-007'];
        if (enabled(ctx, 'INT-CAR-071')) {
          const q = ['career.vocation.house10.quality', 'career.vocation.lord10.quality'].filter((r) => ctx.facts.has(r));
          if (q.length) {
            refs.push(...q);
            rules.push('INT-CAR-071');
            extra.push('context (pending client review): sign quality of the 10th house and of the 10th lord');
          }
        }
        return [
          dimensionResult(ctx, dim, {
            factors: [lordPlacement(ctx, 10), savFactor(ctx, 10), lordStrength(ctx, 4)],
            packRuleIds: rules,
            extraRefs: refs,
            extraExplanation: extra,
          }),
        ];
      }
      case 'obstacles':
        return [
          dimensionResult(ctx, dim, {
            factors: [
              lordPlacement(ctx, 10),
              lordStrength(ctx, 10),
              occupantsFactor(ctx, 10),
              aspectsFactor(ctx, 10),
              ...d10LordFactor(ctx, 1),
              ...d10LordFactor(ctx, 10),
            ],
            packRuleIds: ['INT-CAR-008'],
            extraRefs: ['house.10.d1.lord'],
            extraExplanation: ['challenging indicators are read as effort areas, not afflictions (D-006)'],
          }),
        ];
      case 'transitions':
        return [
          dimensionResult(ctx, dim, {
            factors: [lordStrength(ctx, 5), lordStrength(ctx, 8), lordStrength(ctx, 9)],
            packRuleIds: ['INT-CAR-009'],
            extraRefs: ['house.5.d1.lord', 'house.8.d1.lord', 'house.9.d1.lord'],
            extraExplanation: ['the 5th is the 8th from the 10th and the 9th is the 12th from the 10th (bhavat bhavam, CAR-009)'],
          }),
        ];
    }
  };
}

export function buildFieldsTopic(ctx: PackBuildContext): InterpretationResult[] {
  const lords = TRINE_HOUSES.map((n) => ({ n, lord: houseOf(ctx, n).lord }));
  const factors: Factor[] = [];
  const seen = new Set<PlanetName>();
  for (const { n, lord } of lords) {
    factors.push(lordPlacement(ctx, n));
    if (!seen.has(lord)) factors.push(lordStrength(ctx, n));
    seen.add(lord);
  }
  const assessment = assessFactors(ctx, 'career.fields', factors);
  const code = assessmentCode(assessment.strengthClass);
  return [
    makeResult(ctx, {
      topic: 'career.fields',
      parts: [],
      question: fieldsQuestion,
      code,
      text: fieldsText(lords, code),
      assessment,
      packRuleIds: ['INT-F-001'],
      extraRefs: TRINE_HOUSES.map((n) => `house.${n}.d1.lord`),
    }),
  ];
}

// --- timing -----------------------------------------------------------------

const dashas = (ctx: PackBuildContext, level: DashaActivation['level']): DashaActivation[] =>
  ctx.stages.s6
    .filter((a): a is DashaActivation => a.kind === 'dasha' && a.level === level)
    .sort((a, b) => byString(a.startIso, b.startIso));

function periodLabel(a: DashaActivation): string {
  return a.level === 'mahadasha' ? `the ${a.lord} Mahadasha` : `the ${a.parentLord ?? '?'}–${a.lord} Antardasha`;
}

function careerLinks(a: DashaActivation): string[] {
  const links: string[] = [];
  for (const h of a.housesRuled) if ((CAREER_LINK_HOUSES as readonly number[]).includes(h)) links.push(`rules the ${ordinal(h)}`);
  if ((CAREER_LINK_HOUSES as readonly number[]).includes(a.houseOccupied)) links.push(`occupies the ${ordinal(a.houseOccupied)}`);
  if (a.housesAspected.includes(10)) links.push('aspects the 10th');
  if (a.d10House !== null && (CAREER_D10_HOUSES as readonly number[]).includes(a.d10House)) links.push(`is in D10 house ${a.d10House}`);
  return links;
}

function periodResult(ctx: PackBuildContext, slot: PeriodSlot, a: DashaActivation): InterpretationResult {
  const links = careerLinks(a);
  const assessment = assessFactors(ctx, a.id, [
    { subject: a.id, conditions: a.conditions },
    planetStrength(ctx, a.lord),
  ]);
  return makeResult(ctx, {
    topic: 'career.period',
    parts: [slot],
    question: periodQuestion(slot),
    code: links.length ? 'PERIOD_LORD_LINKED_TO_CAREER_HOUSES' : 'PERIOD_LORD_NOT_LINKED_TO_CAREER_HOUSES',
    text: periodText(slot, periodLabel(a), a.startIso, a.endIso, a.ageAtStart, a.ageAtEnd, links),
    assessment,
    packRuleIds: ['INT-T-001'],
    extraRefs: a.factIds,
    extraExplanation: ['the period lord gives the results of the houses it rules, occupies and aspects, read with its natal condition (CAR-015)'],
    timeRelevance: { kind: 'period', startIso: a.startIso, endIso: a.endIso, activatedBy: [...a.factIds].sort(byString) },
  });
}

export function buildPeriodTopic(ctx: PackBuildContext): InterpretationResult[] {
  const results: InterpretationResult[] = [];
  const mds = dashas(ctx, 'mahadasha');
  const ads = dashas(ctx, 'antardasha');
  const md = mds.find((a) => a.isCurrent);
  const ad = ads.find((a) => a.isCurrent);
  if (md) {
    results.push(periodResult(ctx, 'md', md));
    const next = mds.find((a) => a.startIso >= md.endIso);
    if (next) results.push(periodResult(ctx, 'next', next));
  }
  if (ad) {
    results.push(periodResult(ctx, 'ad', ad));
    const next = ads.find((a) => a.startIso >= ad.endIso);
    if (next) results.push(periodResult(ctx, 'next-ad', next));
  }

  const pos = ctx.stages.s6.find((a) => a.kind === 'md-ad-position' && a.isCurrent);
  if (pos && pos.kind === 'md-ad-position') {
    results.push(
      makeResult(ctx, {
        topic: 'career.period',
        parts: ['md-ad'],
        question: mdAdQuestion,
        code: `AD_LORD_${pos.adFromMd}_FROM_MD_LORD`,
        text: mdAdText(pos.mdLord, pos.adLord, pos.adFromMd, pos.mdFromAd),
        assessment: assessFactors(ctx, pos.id, [{ subject: pos.id, conditions: pos.conditions }], false),
        packRuleIds: ['INT-T-002'],
        extraRefs: pos.factIds,
        timeRelevance: { kind: 'period', startIso: pos.startIso, endIso: pos.endIso, activatedBy: [...pos.factIds].sort(byString) },
      }),
    );
  }

  // Earnings window (CAR-010), age-gated (never after 60).
  const earningsLords = new Set<PlanetName>([houseOf(ctx, 2).lord, houseOf(ctx, 11).lord]);
  const candidates = [...mds, ...ads]
    .filter((a) => earningsLords.has(a.lord) && a.ageAtEnd > EARNINGS_MIN_AGE && a.ageAtStart < EARNINGS_MAX_AGE)
    .sort((a, b) => byString(a.startIso, b.startIso) || byString(a.level, b.level));
  const first = candidates[0];
  const gate = `age window ${EARNINGS_MIN_AGE}–${EARNINGS_MAX_AGE} (provisional, client question Q-G-3); the native is ${ctx.lifeStage.ageYears} as of ${ctx.lifeStage.asOfDate}`;
  results.push(
    makeResult(ctx, {
      topic: 'career.period',
      parts: ['earnings-window'],
      question: earningsQuestion,
      code: first ? 'EARNINGS_WINDOW_IDENTIFIED' : 'NO_EARNINGS_WINDOW_IN_WORKING_AGE',
      text: earningsText(
        first ? { label: periodLabel(first), startIso: first.startIso, endIso: first.endIso, ageAtStart: first.ageAtStart, ageAtEnd: first.ageAtEnd } : null,
        EARNINGS_MIN_AGE,
        EARNINGS_MAX_AGE,
      ),
      assessment: assessFactors(ctx, 'period.earnings-window', [{ subject: 'period.earnings-window', conditions: first?.conditions ?? [] }], false),
      packRuleIds: ['INT-T-003'],
      extraRefs: ['house.2.d1.lord', 'house.11.d1.lord', ...(first?.factIds ?? [])],
      extraExplanation: [gate],
      timeRelevance: first
        ? { kind: 'period', startIso: first.startIso, endIso: first.endIso, activatedBy: [...first.factIds].sort(byString) }
        : { kind: 'natal' },
    }),
  );
  return results;
}

const SATURN_PHASE_CODES: Readonly<Record<SaturnFromMoonActivation['phase'], SaturnMoonCode>> = {
  twelfth: 'SADE_SATI_TWELFTH_FROM_MOON',
  'over-moon': 'SADE_SATI_OVER_MOON',
  second: 'SADE_SATI_SECOND_FROM_MOON',
  fourth: 'SATURN_FOURTH_FROM_MOON',
  eighth: 'SATURN_EIGHTH_FROM_MOON',
};

export function buildTransitTopic(ctx: PackBuildContext): InterpretationResult[] {
  const results: InterpretationResult[] = [];
  const current = (a: Activation): boolean => a.isCurrent;
  for (const planet of ['Jupiter', 'Saturn'] as const) {
    const t = ctx.stages.s6.find(
      (a): a is TransitOverNatalActivation => a.kind === 'transit-over-natal' && a.planet === planet && current(a),
    );
    if (!t) continue;
    results.push(
      makeResult(ctx, {
        topic: 'career.transit',
        parts: [key(planet), 'current'],
        question: transitQuestion(planet),
        code: `TRANSIT_HOUSE_${t.houseFromAsc}_FROM_ASC`,
        text: transitText(planet, t.sign, t.startIso, t.endIso, t.houseFromAsc, t.houseFromMoon, ctx.lifeStage.asOfDate),
        assessment: assessFactors(ctx, t.id, [{ subject: t.id, conditions: t.conditions }], false),
        packRuleIds: ['INT-T-010'],
        extraRefs: t.factIds,
        extraExplanation: [
          t.overLordOf.length ? `the transited sign holds the natal lord(s) of house(s) ${t.overLordOf.join(', ')}` : 'the transited sign holds no natal house lord',
          t.overPlanets.length ? `natal ${t.overPlanets.join(', ')} in the transited sign` : 'no natal planet in the transited sign',
        ],
        timeRelevance: { kind: 'period', startIso: t.startIso, endIso: t.endIso, activatedBy: [...t.factIds].sort(byString) },
      }),
    );
  }

  const phase = ctx.stages.s6.find((a): a is SaturnFromMoonActivation => a.kind === 'saturn-from-moon' && current(a));
  const code: SaturnMoonCode = phase ? SATURN_PHASE_CODES[phase.phase] : 'NO_SATURN_MOON_PHASE';
  results.push(
    makeResult(ctx, {
      topic: 'career.transit',
      parts: ['saturn', 'from-moon'],
      question: saturnMoonQuestion,
      code,
      text: saturnMoonText(code, phase ? { startIso: phase.startIso, endIso: phase.endIso } : null, ctx.lifeStage.asOfDate),
      assessment: assessFactors(ctx, 'transit.saturn-from-moon', [{ subject: 'transit.saturn-from-moon', conditions: phase?.conditions ?? [] }], false),
      packRuleIds: ['INT-T-011'],
      extraRefs: ['planet.moon.d1.sign', ...(phase?.factIds ?? [])],
      extraExplanation: ['stated as a neutral timing fact (D-006)'],
      timeRelevance: phase
        ? { kind: 'period', startIso: phase.startIso, endIso: phase.endIso, activatedBy: [...phase.factIds].sort(byString) }
        : { kind: 'natal' },
    }),
  );
  return results;
}

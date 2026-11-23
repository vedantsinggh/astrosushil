/**
 * Interpretation validators (proposal §5 V1, V2, V4, V5, V6, plus the report
 * audit's automatable checks: positive spin on absence, dates, life stage).
 *
 * Inputs are the topic, the untrusted payload, the evidence registry and the
 * claim-validator result (which says which claims are verified). Every check is
 * deterministic and rule-based; nothing here calls an LLM.
 *
 * Severity:
 * - topics that opted in to interpretation results (`topic.interpretations`
 *   non-empty): the V-checks are errors, as in proposal §5;
 * - legacy topics: only the low-noise checks run, and only as warnings, so a
 *   legacy topic's pass/fail outcome never changes here.
 */
import type { InterpretationResult, StrengthClass } from '@astro/prediction-engine';
import { STRENGTH_CLASSES } from '@astro/prediction-engine';
import { EvidenceItem, GeneratedTopicPayload, ReportTopic, TopicValidationResult, ValidationIssue } from '../contracts';
import { EvidenceRegistry } from '../evidence/evidence-registry';
import { isEarlyCareerAge } from '../life-stage';
import { formatBusinessDate } from '../snapshot/chart-snapshot';
import { splitSentences, topicText } from './editorial-validator';
import { hindiDatesToEnglish } from './hindi-chart-terms';
import { hindiOverlap, hindiRestatesConclusion, hindiSentenceCovers } from './hindi-coverage';
import {
  extractHindiProseAges,
  HINDI_ABSENCE_TERMS,
  HINDI_ADVANTAGE_TERMS,
  HINDI_CHART_ENTITY,
  HINDI_DERIVED_PATTERNS,
  HINDI_INVENTED_RULE_PATTERNS,
  HINDI_SENIORITY_TERMS,
  HINDI_SIDE_LABEL,
  hindiClassificationDenied,
  hindiJudgementTerm,
  hindiSideIsChallenging,
} from './hindi-judgement-lexicon';
import { hasDevanagari } from './hindi-lexicon';
import {
  ABSENCE_TERMS,
  ADVANTAGE_TERMS,
  CHART_ENTITY,
  DENIED_CLASSIFICATION_BEFORE,
  DERIVED_TERMS,
  findJudgementTerms,
  findOneSidedIntensifier,
  hasMixedMarker,
  INVENTED_RULE_PATTERNS,
  isCompatible,
  JUDGEMENT_TERMS,
  JudgementHit,
  JudgementPolarity,
  SENIORITY_TERMS,
} from './judgement-lexicon';

export const INTERPRETATION_ID_PREFIX = 'interp.';

/**
 * Up to this age, seniority framing (board level, retirement, mentoring juniors)
 * is flagged. One shared product default (platform/life-stage.ts), the same age the
 * career early-career topic variant uses; provisional, pending client review.
 */
export { EARLY_CAREER_MAX_AGE } from '../life-stage';

// ---------------------------------------------------------------------------
// Topic opt-in
// ---------------------------------------------------------------------------

/**
 * Interpretation patterns of a topic. `interpretations` is added to ReportTopic
 * by the platform contracts (A1 field name); it is read structurally here so
 * that topics parsed before the field existed behave as legacy topics.
 */
export function topicInterpretationPatterns(topic: ReportTopic): string[] {
  const value = (topic as ReportTopic & { interpretations?: unknown }).interpretations;
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

export function isInterpretationTopic(topic: ReportTopic): boolean {
  return topicInterpretationPatterns(topic).length > 0;
}

// ---------------------------------------------------------------------------
// Reading interpretation evidence
// ---------------------------------------------------------------------------

/** What the prompt and the validators need to know about one interpretation result. */
export interface InterpretationView {
  id: string;
  conclusionCode: string;
  conclusionText: string;
  strengthClass: StrengthClass | undefined;
  timing: string;
  qualification: string;
  explanation: string;
  ruleIds: string[];
  supportedBy: string[];
  contradictedBy: string[];
}

const LABEL_RE = /^(.*?) \[([a-z-]+)(?:;\s*([^;\]]*))?(?:;\s*([^\]]*))?\](?: — because (.*))?$/s;

function asStrengthClass(v: string | undefined): StrengthClass | undefined {
  return v !== undefined && (STRENGTH_CLASSES as readonly string[]).includes(v) ? (v as StrengthClass) : undefined;
}

export function ruleIdsFromSource(source: string): string[] {
  if (!source.startsWith('interpretation:')) return [];
  return source.slice('interpretation:'.length).split(',').map((r) => r.trim()).filter(Boolean);
}

function timingText(result: InterpretationResult): string {
  const t = result.timeRelevance;
  if (t.kind === 'natal') return 'natal (lifelong tendency)';
  if (t.kind === 'period') return `period ${formatBusinessDate(t.startIso)} to ${formatBusinessDate(t.endIso)}`;
  return `current as of ${formatBusinessDate(t.asOfIso)}`;
}

/**
 * View of an interpretation evidence item. The registry label carries the class,
 * timing and qualification (A1 contract); when the full result is available its
 * structured fields are used instead, including the supporting and contradicting facts.
 */
export function interpretationView(item: EvidenceItem, result?: InterpretationResult): InterpretationView {
  const m = LABEL_RE.exec(item.label);
  const fromLabel: InterpretationView = {
    id: item.id,
    conclusionCode: String(item.value),
    conclusionText: m ? m[1] : item.label,
    strengthClass: asStrengthClass(m?.[2]),
    timing: m?.[3]?.trim() ?? '',
    qualification: m?.[4]?.trim() ?? '',
    explanation: m?.[5]?.trim() ?? '',
    ruleIds: ruleIdsFromSource(item.source),
    supportedBy: [],
    contradictedBy: [],
  };
  if (!result || result.id !== item.id) return fromLabel;
  return {
    id: result.id,
    conclusionCode: result.conclusion.code,
    conclusionText: result.conclusion.text,
    strengthClass: result.strengthClass,
    timing: timingText(result),
    qualification: result.qualification.join(', '),
    explanation: result.explanation,
    ruleIds: [...result.ruleIds],
    supportedBy: [...new Set(result.supporting.map((l) => l.factId))],
    contradictedBy: [...new Set(result.contradicting.map((l) => l.factId))],
  };
}

/** Interpretation items in the registry matched by the topic's patterns, sorted by id. */
export function topicInterpretationItems(topic: ReportTopic, registry: EvidenceRegistry): EvidenceItem[] {
  const patterns = topicInterpretationPatterns(topic);
  if (!patterns.length) return [];
  return registry
    .resolve(patterns)
    .filter((i) => i.kind === 'interpretation' || i.id.startsWith(INTERPRETATION_ID_PREFIX))
    .sort((a, b) => a.id.localeCompare(b.id));
}

// ---------------------------------------------------------------------------
// Coverage: does a sentence restate a verified claim?
// ---------------------------------------------------------------------------

const COVER_STOP = new Set(['the', 'a', 'an', 'of', 'in', 'to', 'and', 'or', 'is', 'are', 'your', 'you', 'its', 'by', 'for', 'with', 'from', 'on', 'as', 'at', 'this', 'that', 'which', 'it']);
function words(text: string): string[] {
  // The Devanagari block without its danda marks (। ॥), which are punctuation.
  return text.toLowerCase().split(/[^a-z0-9ऀ-ॣ०-ॿ]+/).filter((w) => w.length > 1 && !COVER_STOP.has(w));
}
function norm(text: string): string {
  return words(text).join(' ');
}

/** A Hindi sentence set against an English statement, label or conclusion (the usual case in a Hindi edition). */
const crossLanguage = (sentence: string, english: string): boolean => hasDevanagari(sentence) && !hasDevanagari(english);

/**
 * A sentence is covered by a claim when one contains the other, or when ≥70% of the claim's content words appear in the sentence.
 * A Hindi sentence is compared with an English statement on anchors and glossary words (hindi-coverage.ts).
 */
export function sentenceCoveredBy(sentence: string, statement: string): boolean {
  if (crossLanguage(sentence, statement)) return hindiSentenceCovers(sentence, statement);
  const s = norm(sentence);
  const c = norm(statement);
  if (!s || !c) return false;
  if (s.includes(c) || c.includes(s)) return true;
  const sw = new Set(words(sentence));
  const cw = [...new Set(words(statement))];
  return cw.length > 0 && cw.filter((w) => sw.has(w)).length / cw.length >= 0.7;
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const MONTH_INDEX: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};
const MONTH_RE = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const pad = (n: number) => String(n).padStart(2, '0');

interface ProseDate {
  text: string;
  /** Inclusive day range the expression denotes, as YYYY-MM-DD. */
  from: string;
  to: string;
  precision: 'day' | 'month' | 'year';
}

function lastDay(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * Dates in prose: ISO days, "19 Nov 2026", "November 19, 2026", "November 2026", and standalone years.
 * Hindi month names and Devanagari digits are read the same way ("20 नवंबर 2026", "नवंबर २०२६").
 */
export function extractProseDates(input: string): ProseDate[] {
  const text = hindiDatesToEnglish(input);
  const out: ProseDate[] = [];
  const taken: Array<[number, number]> = [];
  const free = (a: number, b: number) => !taken.some(([x, y]) => a < y && b > x);
  const add = (m: RegExpExecArray, d: Omit<ProseDate, 'text'>) => {
    if (!free(m.index, m.index + m[0].length)) return;
    taken.push([m.index, m.index + m[0].length]);
    out.push({ text: m[0], ...d });
  };
  const month = (s: string) => MONTH_INDEX[s.toLowerCase().slice(0, s.toLowerCase().startsWith('sept') ? 4 : 3)];
  let m: RegExpExecArray | null;
  const iso = /\b((?:19|20|21)\d{2})-(\d{2})-(\d{2})\b/g;
  while ((m = iso.exec(text))) add(m, { from: m[0], to: m[0], precision: 'day' });
  const dmy = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH_RE}\\.?,?\\s+((?:19|20|21)\\d{2})\\b`, 'gi');
  while ((m = dmy.exec(text))) {
    const d = `${m[3]}-${pad(month(m[2]))}-${pad(Number(m[1]))}`;
    add(m, { from: d, to: d, precision: 'day' });
  }
  const mdy = new RegExp(`\\b${MONTH_RE}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+((?:19|20|21)\\d{2})\\b`, 'gi');
  while ((m = mdy.exec(text))) {
    const d = `${m[3]}-${pad(month(m[1]))}-${pad(Number(m[2]))}`;
    add(m, { from: d, to: d, precision: 'day' });
  }
  const my = new RegExp(`\\b${MONTH_RE}\\.?,?\\s+((?:19|20|21)\\d{2})\\b`, 'gi');
  while ((m = my.exec(text))) {
    const y = Number(m[2]);
    const mo = month(m[1]);
    add(m, { from: `${y}-${pad(mo)}-01`, to: `${y}-${pad(mo)}-${pad(lastDay(y, mo))}`, precision: 'month' });
  }
  const yr = /\b((?:19|20|21)\d{2})\b/g;
  while ((m = yr.exec(text))) add(m, { from: `${m[1]}-01-01`, to: `${m[1]}-12-31`, precision: 'year' });
  return out;
}

/** All day-precision dates named by an evidence item (value strings and label). */
function evidenceDays(item: EvidenceItem): string[] {
  const out = new Set<string>();
  const values = Array.isArray(item.value) ? item.value : [item.value];
  for (const v of values) if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) out.add(v);
  for (const d of extractProseDates(item.label)) if (d.precision === 'day') out.add(d.from);
  return [...out].sort();
}

const shiftDay = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Judgement backing (V1): what may justify an evaluative word
// ---------------------------------------------------------------------------

/**
 * Yoga results carry a second vocabulary, the provisional yoga class in the conclusion code
 * (`YOGA_FORMED_STRONG|WEAK`): "a weak classification" restates YOGA_FORMED_WEAK even when the
 * set-logic class is mixed. MODERATE and CANCELLED have no lexicon term.
 */
const YOGA_CLASS_POLARITY: Readonly<Record<string, JudgementPolarity>> = {
  YOGA_FORMED_STRONG: 'positive',
  YOGA_FORMED_WEAK: 'negative',
};

/** Whether a judgement term may restate an interpretation view (its strength class, or a yoga's own class). */
export function viewCompatible(polarity: JudgementPolarity, v: InterpretationView, text?: string): boolean {
  if (v.strengthClass && isCompatible(polarity, v.strengthClass, text)) return true;
  return YOGA_CLASS_POLARITY[v.conclusionCode] === polarity;
}

/** Main clause of a fact label: the text before any parenthesis, bracket or " — because". */
function factClause(label: string): string {
  return label.split(/ \(| \[| — because /)[0];
}

/**
 * How a judgement term is found in prose and in evidence labels. Evidence labels are English, so a
 * Hindi term is looked for in them by the English lexicon words it stands for.
 */
function termPatterns(term: string): { prose: RegExp; fact: RegExp } | undefined {
  const en = JUDGEMENT_TERMS.find((t) => t.term === term)?.pattern;
  if (en) return { prose: en, fact: en };
  const hi = hindiJudgementTerm(term);
  return hi ? { prose: hi.pattern, fact: hi.english } : undefined;
}

/** A fact (not an interpretation) whose own value or main label clause contains the term. */
function factStatesTerm(item: EvidenceItem, pattern: RegExp): boolean {
  if (item.kind === 'interpretation' || item.id.startsWith(INTERPRETATION_ID_PREFIX)) return false;
  const values = Array.isArray(item.value) ? item.value : [item.value];
  return pattern.test(factClause(item.label)) || values.some((v) => typeof v === 'string' && pattern.test(v));
}

/** Share of a text's content words that appear in the sentence. */
function overlap(sentence: string, text: string): number {
  const sw = new Set(words(sentence));
  const tw = [...new Set(words(text))];
  return tw.length ? tw.filter((w) => sw.has(w)).length / tw.length : 0;
}

const PLANET_OR_SIGN = /^(?:sun|moon|mars|mercury|jupiter|venus|saturn|rahu|ketu|aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)$/;
const stem6 = (w: string) => w.slice(0, 6);

/**
 * The sentence restates an interpretation's conclusion: every anchor of the conclusion (house
 * numbers and other numbers, planet and sign names; chart names like "d10" excluded) appears in the
 * text, and at least 60% of the conclusion's content words do (compared on 6-letter stems, so
 * "debilitation" matches "debilitated"). Parentheticals of the conclusion are ignored.
 */
export function restatesConclusion(text: string, conclusion: string): boolean {
  if (crossLanguage(text, conclusion)) return hindiRestatesConclusion(text, conclusion);
  const main = conclusion.replace(/\s*\([^)]*\)/g, '');
  const cw = [...new Set(words(main))];
  if (!cw.length) return false;
  const tw = new Set(words(text));
  const ts = new Set([...tw].map(stem6));
  const anchors = cw.filter((w) => (/\d/.test(w) && !/^d\d+$/.test(w)) || PLANET_OR_SIGN.test(w));
  if (!anchors.every((w) => tw.has(w))) return false;
  return cw.filter((w) => ts.has(stem6(w))).length / cw.length >= 0.6;
}

/** "supporting/challenging indicators" names one side of a mixed result; it is a structural label, not a new judgement. */
const SIDE_LABEL = /\b(?:supporting|challenging)\s+(?:indicators?|factors?|side)\b|\bon the (?:supporting|challenging) side\b/i;

export interface JudgementBackingContext {
  /** Evidence ids cited by the verified claims that restate this sentence (or by the claim itself). */
  citedIds: string[];
  /** Items in the topic's scope (facts and interpretations). */
  scope: EvidenceItem[];
  view: (id: string) => InterpretationView | undefined;
}

/**
 * A judgement term is backed by a deterministic source other than a covering interp claim when:
 * (a) a fact cited by a covering verified claim states the term ("functionally challenging" for
 *     planet.saturn.d1.functional-nature = challenging);
 * (b) the sentence restates an in-scope fact whose main label clause contains the term (at least
 *     60% of that clause's content words appear in the sentence);
 * (c) the sentence restates an in-scope interpretation's conclusion (sentenceCoveredBy) and the
 *     term is compatible with that result;
 * (d) the term names a side ("challenging indicators") of an in-scope mixed result whose
 *     explanation lists that side.
 * A free-floating term ("a potent gathering of planets", "exceptionally strong") has none of these.
 */
export function judgementBacked(hit: JudgementHit, sentence: string, ctx: JudgementBackingContext): boolean {
  const patterns = termPatterns(hit.term);
  if (!patterns) return false;
  const { prose, fact } = patterns;
  const hindi = hasDevanagari(sentence);
  const share = (label: string) => (crossLanguage(sentence, label) ? hindiOverlap(sentence, label) : overlap(sentence, label));
  const cited = ctx.citedIds.map((id) => ctx.scope.find((i) => i.id === id)).filter((i): i is EvidenceItem => i !== undefined);
  if (cited.some((i) => factStatesTerm(i, fact))) return true;
  if (ctx.scope.some((i) => factStatesTerm(i, fact) && prose.test(sentence) && share(factClause(i.label)) >= 0.6)) return true;
  const views = ctx.scope.map((i) => ctx.view(i.id)).filter((v): v is InterpretationView => v !== undefined);
  if (views.some((v) => restatesConclusion(sentence, v.conclusionText) && viewCompatible(hit.polarity, v, sentence))) return true;
  const side = SIDE_LABEL.exec(sentence) ?? (hindi ? HINDI_SIDE_LABEL.exec(sentence) : null);
  if (side && prose.test(side[0])) {
    const which = /challenging/i.test(side[0]) || hindiSideIsChallenging(side[0]) ? 'challenging:' : 'supporting:';
    if (views.some((v) => v.strengthClass === 'mixed' && v.explanation.includes(which))) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface InterpretationValidationOptions {
  /** Evidence patterns this topic may cite (as passed to validateGeneratedTopic). */
  allowedEvidence: string[];
  /** Full interpretation results, when the caller has them (adds structure; optional). */
  results?: readonly InterpretationResult[];
}

function backingText(item: EvidenceItem): string {
  return `${item.id} ${item.kind} ${item.label} ${Array.isArray(item.value) ? item.value.join(' ') : String(item.value)}`;
}

/**
 * Interpretation and narration checks for one topic. Returns issues only; the
 * caller merges them into the topic result (an error fails the topic).
 */
export function validateInterpretationTopic(
  topic: ReportTopic,
  payload: GeneratedTopicPayload,
  registry: EvidenceRegistry,
  validation: TopicValidationResult,
  opts: InterpretationValidationOptions
): ValidationIssue[] {
  const optedIn = isInterpretationTopic(topic);
  const sev = (strict: boolean): ValidationIssue['severity'] => (optedIn && strict ? 'error' : 'warning');
  const issues: ValidationIssue[] = [];
  const sentences = splitSentences(topicText(payload));
  const verifiedClaims = validation.claims.filter((c) => c.status === 'verified');
  const resultById = new Map((opts.results ?? []).map((r) => [r.id, r] as const));
  const view = (id: string): InterpretationView | undefined => {
    const item = registry.get(id);
    return item && (item.kind === 'interpretation' || id.startsWith(INTERPRETATION_ID_PREFIX)) ? interpretationView(item, resultById.get(id)) : undefined;
  };
  const interpClasses = (evidenceIds: string[]) =>
    evidenceIds.map(view).filter((v): v is InterpretationView => v !== undefined);
  const coveringInterpClaims = (sentence: string) =>
    verifiedClaims.filter((c) => interpClasses(c.evidenceIds).length > 0 && sentenceCoveredBy(sentence, c.statement));
  // V1 backing by restated facts (judgementBacked): the topic's scope, resolved once.
  const scopeItems = optedIn ? registry.resolve(opts.allowedEvidence) : [];
  const backed = (hit: JudgementHit, text: string, citedIds: string[]) => judgementBacked(hit, text, { citedIds, scope: scopeItems, view });

  if (optedIn) {
    // Unverifiable claims citing an interpretation are errors for opted-in topics (proposal §5).
    for (const c of validation.claims) {
      if (c.status === 'unverifiable' && c.evidenceIds.some((id) => id.startsWith(INTERPRETATION_ID_PREFIX))) {
        issues.push({ severity: 'error', code: 'INTERPRETATION_CLAIM_UNVERIFIABLE', message: `Claim cites an interpretation but does not restate its conclusion: "${c.statement.slice(0, 120)}"` });
      }
    }

    // V1: judgement terms in claims must match the cited result's class.
    for (const c of verifiedClaims) {
      const views = interpClasses(c.evidenceIds);
      if (!views.length) continue;
      for (const hit of findJudgementTerms(c.statement)) {
        if (views.some((v) => viewCompatible(hit.polarity, v, c.statement))) continue;
        // A term that restates a cited fact's own value ("functionally challenging") is not a new judgement.
        if (backed(hit, c.statement, c.evidenceIds)) continue;
        issues.push({
          severity: 'error', code: 'JUDGEMENT_CLASS_MISMATCH',
          message: `"${hit.term}" is not compatible with ${views.map((v) => `${v.id} (${v.strengthClass ?? 'unknown'})`).join(', ')}: "${c.statement.slice(0, 120)}"`,
        });
      }
      // V2: mixed honesty.
      const mixed = views.filter((v) => v.strengthClass === 'mixed');
      if (mixed.length) {
        const intens = findOneSidedIntensifier(c.statement);
        if (intens) {
          issues.push({ severity: 'error', code: 'MIXED_RESULT_OVERSTATED', message: `"${intens}" overstates a mixed result (${mixed.map((v) => v.id).join(', ')}): "${c.statement.slice(0, 120)}"` });
        }
      }
    }

    // V1 in prose: an evaluative sentence about a chart factor must restate a verified interp claim of a compatible class.
    sentences.forEach((s, idx) => {
      const allHits = findJudgementTerms(s);
      if (!allHits.length || !(CHART_ENTITY.test(s) || HINDI_CHART_ENTITY.test(s))) return;
      // A judgement may continue the previous sentence ("The 7th house has 26 bindus … . This is below
      // the benchmark, a challenged score."): when the sentence alone restates no claim, the previous
      // sentence and this one together may. The class must still be compatible.
      const windowText = idx > 0 ? `${sentences[idx - 1]} ${s}` : s;
      let covering = coveringInterpClaims(s);
      if (!covering.length && windowText !== s) covering = coveringInterpClaims(windowText);
      const coveringViews = covering.flatMap((c) => interpClasses(c.evidenceIds));
      // Terms compatible with a covering interp claim are checked below; the rest need another
      // deterministic backing (a restated fact value, a restated in-scope result, a side label).
      const citedIds = verifiedClaims.filter((c) => sentenceCoveredBy(s, c.statement) || sentenceCoveredBy(windowText, c.statement)).flatMap((c) => c.evidenceIds);
      const hits = allHits.filter((h) => coveringViews.some((v) => viewCompatible(h.polarity, v, s)) || !(backed(h, s, citedIds) || backed(h, windowText, citedIds)));
      if (!hits.length) return;
      if (!covering.length) {
        issues.push({ severity: 'error', code: 'UNSUPPORTED_JUDGEMENT', message: `Evaluative sentence ("${hits[0].term}") is not a verified claim citing an interp.* result: "${s.slice(0, 140)}"` });
        return;
      }
      const classes = coveringViews.map((v) => v.strengthClass);
      for (const hit of hits) {
        if (!coveringViews.some((v) => viewCompatible(hit.polarity, v, s))) {
          issues.push({ severity: 'error', code: 'JUDGEMENT_CLASS_MISMATCH', message: `"${hit.term}" is not compatible with the cited result class (${classes.join(', ')}): "${s.slice(0, 140)}"` });
        }
      }
      if (classes.includes('mixed')) {
        const intens = findOneSidedIntensifier(s);
        if (intens) issues.push({ severity: 'error', code: 'MIXED_RESULT_OVERSTATED', message: `"${intens}" overstates a mixed result: "${s.slice(0, 140)}"` });
      }
    });

    // V2: every cited mixed result must be acknowledged as two-sided somewhere in its claims or the covering prose.
    const citedMixed = new Set(verifiedClaims.flatMap((c) => interpClasses(c.evidenceIds)).filter((v) => v.strengthClass === 'mixed').map((v) => v.id));
    for (const id of [...citedMixed].sort()) {
      const claimsFor = verifiedClaims.filter((c) => c.evidenceIds.includes(id));
      const acknowledged =
        claimsFor.some((c) => hasMixedMarker(c.statement)) ||
        sentences.some((s) => hasMixedMarker(s) && claimsFor.some((c) => sentenceCoveredBy(s, c.statement)));
      if (!acknowledged) {
        issues.push({ severity: 'error', code: 'MIXED_RESULT_NOT_ACKNOWLEDGED', message: `${id} is mixed; the narrative must say that it cuts both ways` });
      }
    }

    // V5: interpretations named exactly (no trailing *) must be cited by a verified claim.
    const verifiedIds = new Set(validation.verifiedEvidenceIds);
    for (const pattern of topicInterpretationPatterns(topic)) {
      if (pattern.endsWith('*')) continue;
      for (const item of registry.resolve([pattern])) {
        if (!verifiedIds.has(item.id)) {
          issues.push({ severity: 'error', code: 'REQUIRED_INTERPRETATION_NOT_CITED', message: `No verified claim cites ${item.id}` });
        }
      }
    }
  }

  // V4: derived terms must be backed by a cited fact or interpretation of that kind.
  const citedItems = verifiedClaims.flatMap((c) => c.evidenceIds).map((id) => registry.get(id)).filter((i): i is EvidenceItem => i !== undefined);
  for (const d of DERIVED_TERMS) {
    const hindiPattern = HINDI_DERIVED_PATTERNS[d.term];
    const s = sentences.find((x) => d.pattern.test(x) || (hindiPattern !== undefined && hindiPattern.test(x)));
    if (!s) continue;
    if (!citedItems.some((i) => d.backing.test(backingText(i)))) {
      issues.push({ severity: sev(true), code: 'DERIVED_TERM_UNSUPPORTED', message: `"${d.term}" is used but no verified claim cites a fact or interpretation of that kind: "${s.slice(0, 140)}"` });
    }
  }

  // V6: invented-rule phrasing.
  for (const s of sentences) {
    const p = INVENTED_RULE_PATTERNS.find((re) => re.test(s)) ?? HINDI_INVENTED_RULE_PATTERNS.find((re) => re.test(s));
    if (p && !(optedIn && coveringInterpClaims(s).length)) {
      issues.push({ severity: 'warning', code: 'INVENTED_RULE_PHRASING', message: `Sentence states a general rule without a cited interpretation: "${s.slice(0, 140)}"` });
    }
  }

  // No positive spin on absence (audit F11 / V12).
  for (const s of sentences) {
    const adv = ADVANTAGE_TERMS.exec(s);
    if (!adv || !ABSENCE_TERMS.test(s)) continue;
    // "does not treat an empty house as an advantage" denies the spin (golden run 2).
    if (DENIED_CLASSIFICATION_BEFORE.test(s.slice(0, adv.index))) continue;
    if (optedIn && coveringInterpClaims(s).length) continue;
    issues.push({ severity: sev(true), code: 'ABSENCE_PRESENTED_AS_ADVANTAGE', message: `An empty or unaspected factor is presented as an advantage ("${adv[0]}") without an interpretation: "${s.slice(0, 140)}"` });
  }
  // The same rule for Hindi prose: "खाली भाव … सरलता देता है". "… लाभ नहीं माना जाता" denies the spin.
  for (const s of sentences) {
    if (!hasDevanagari(s) || !HINDI_ABSENCE_TERMS.test(s)) continue;
    const adv = [...s.matchAll(new RegExp(HINDI_ADVANTAGE_TERMS.source, 'gu'))].find((m) => !hindiClassificationDenied(s, m.index ?? 0, m[0].length));
    if (!adv) continue;
    if (optedIn && coveringInterpClaims(s).length) continue;
    issues.push({ severity: sev(true), code: 'ABSENCE_PRESENTED_AS_ADVANTAGE', message: `An empty or unaspected factor is presented as an advantage ("${adv[0]}") without an interpretation: "${s.slice(0, 140)}"` });
  }

  // Life stage (audit F4 / V10): seniority framing needs a life stage that supports it.
  const lifeStage = registry.resolve(opts.allowedEvidence).find((i) => isLifeStageItem(i));
  if (lifeStage) {
    const age = lifeStageAge(lifeStage);
    if (age !== undefined && isEarlyCareerAge(age)) {
      const s = sentences.find((x) => SENIORITY_TERMS.test(x) || HINDI_SENIORITY_TERMS.test(x));
      if (s) issues.push({ severity: sev(true), code: 'LIFE_STAGE_MISMATCH', message: `Seniority framing for a native aged ${age}: "${s.slice(0, 140)}"` });
    }
  }

  // Ages in prose (audit F1 drift): an age written in words or digits should lie within an age range
  // named by the topic's evidence. Warning only; nothing fails on it.
  const ageRanges = evidenceAgeRanges(registry.resolve(opts.allowedEvidence));
  if (ageRanges.length) {
    const proseText = sentences.join(' ');
    for (const a of [...extractProseAges(proseText), ...extractHindiProseAges(proseText)]) {
      if (!ageRanges.some(([lo, hi]) => lo <= a.age && a.age <= hi)) {
        issues.push({ severity: 'warning', code: 'AGE_NOT_IN_EVIDENCE', message: `"${a.text}" (${a.age}) is not an age named by this topic's evidence` });
      }
    }
  }

  // Dates: every date in prose must lie within a dated period in the topic's evidence.
  const scope = registry.resolve(opts.allowedEvidence);
  const periods = scope.map(evidenceDays).filter((d) => d.length > 0).map((d) => [d[0], d[d.length - 1]] as const);
  // Integration guard: duck-typed evidence stores (apps/api RashiEvidenceStore) have no natal snapshot.
  const asOf = (registry as Partial<Pick<EvidenceRegistry, 'snapshot'>>).snapshot?.asOfIso?.slice(0, 10);
  for (const d of extractProseDates(sentences.join(' '))) {
    // One day of tolerance: evidence dates are UTC days, prose may use the local day.
    const inside = periods.some(([a, b]) => d.to >= shiftDay(a, -1) && d.from <= shiftDay(b, 1)) || (asOf !== undefined && d.from <= asOf && asOf <= d.to);
    if (!inside) {
      const strict = d.precision === 'day';
      issues.push({
        severity: sev(strict), code: 'DATE_OUTSIDE_EVIDENCE',
        message: `"${d.text}" does not fall within any dated period in this topic's evidence${periods.length ? '' : ' (the topic has no dated evidence)'}`,
      });
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Ages written in prose (audit F1 drift): warning only
// ---------------------------------------------------------------------------

const UNITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen',
  'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** "twenty-nine" → 29, "29" → 29; undefined for anything else (0–99 in words). */
export function ageNumber(token: string): number | undefined {
  const t = token.toLowerCase().trim();
  if (/^\d{1,3}$/.test(t)) return Number(t);
  const u = UNITS.indexOf(t);
  if (u >= 0) return u;
  const m = /^([a-z]+)(?:[- ]([a-z]+))?$/.exec(t);
  if (!m) return undefined;
  const tens = TENS.indexOf(m[1]);
  if (tens < 2) return undefined;
  if (!m[2]) return tens * 10;
  const unit = UNITS.indexOf(m[2]);
  return unit >= 1 && unit <= 9 ? tens * 10 + unit : undefined;
}

const AGE_WORD = `(?:\\d{1,3}|(?:${TENS.filter(Boolean).join('|')})(?:[- ](?:${UNITS.slice(1, 10).join('|')}))?|${UNITS.slice(1).join('|')})`;
const PROSE_AGE_RE = new RegExp(`\\b(?:aged?|ages)\\s+(?:of\\s+)?(?:around\\s+|about\\s+|roughly\\s+|approximately\\s+)?(${AGE_WORD})\\b|\\b(${AGE_WORD})[- ]years?[- ]old\\b`, 'gi');

/** Ages stated in prose ("around age twenty-nine", "22 years old"). */
export function extractProseAges(text: string): Array<{ text: string; age: number }> {
  const out: Array<{ text: string; age: number }> = [];
  for (const m of text.matchAll(PROSE_AGE_RE)) {
    const age = ageNumber(m[1] ?? m[2]);
    if (age !== undefined) out.push({ text: m[0], age });
  }
  return out;
}

/** Age ranges named by evidence: "ages 28–30", "age 22", "from age 20 to age 36", "22 years old", numeric life-stage values. */
export function evidenceAgeRanges(items: readonly EvidenceItem[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const i of items) {
    if (isLifeStageItem(i) && typeof i.value === 'number') out.push([i.value, i.value]);
    for (const m of i.label.matchAll(/\bages?\s+(\d{1,3})(?:\s*(?:–|-|to)\s*(?:age\s+)?(\d{1,3}))?/gi)) {
      const a = Number(m[1]);
      out.push([a, m[2] !== undefined ? Number(m[2]) : a]);
    }
    for (const m of i.label.matchAll(/\b(\d{1,3})\s+years?\s+old\b/gi)) out.push([Number(m[1]), Number(m[1])]);
    if (i.kind === 'dasha-age' && Array.isArray(i.value)) {
      const [a, b] = i.value.map(Number);
      if (Number.isFinite(a) && Number.isFinite(b)) out.push([a, b]);
    }
  }
  return out;
}

/** Life-stage evidence (A4/A5): an id segment `life-stage` or `age`, or kind `life-stage`. */
export function isLifeStageItem(item: EvidenceItem): boolean {
  return item.kind === 'life-stage' || /(?:^|\.)(?:life-stage|age)(?:\.|$)/.test(item.id);
}

function lifeStageAge(item: EvidenceItem): number | undefined {
  if (typeof item.value === 'number') return item.value;
  const m = /\b(\d{1,3})\s*(?:years?|yrs?)\b|\baged?\s+(\d{1,3})\b/i.exec(`${item.label} ${String(item.value)}`);
  return m ? Number(m[1] ?? m[2]) : undefined;
}

/**
 * Judgement lexicon (closed lists).
 *
 * Deterministic vocabularies used by the interpretation validators
 * (docs/report-system/decisions/interpretation.md, proposal §5 V1–V6) and by the
 * editorial overstatement rule. Every list here is closed: a term that is not
 * listed is not checked. Extending a list is a reviewed change, never a runtime
 * decision.
 *
 * The LLM is a formatting engine (AGENTS.md §1.4). An evaluative word about a
 * chart factor ("strong", "challenging", "mixed") is a judgement, and a
 * judgement may only restate a deterministic interpretation result whose
 * `strengthClass` is compatible with the word.
 */
import type { StrengthClass } from '@astro/prediction-engine';

export type JudgementPolarity = 'positive' | 'negative' | 'mixed' | 'neutral';

export interface JudgementTerm {
  /** Canonical term, used in messages. */
  term: string;
  /** Matches the term (case-insensitive, word bounded). */
  pattern: RegExp;
  polarity: JudgementPolarity;
}

const POSITIVE: readonly string[] = [
  'strong', 'stronger', 'strongest', 'exceptional', 'exceptionally', 'excellent', 'powerful', 'robust',
  'favourable', 'favorable', 'favours', 'favors', 'supportive', 'supported', 'auspicious', 'blessed', 'fortunate',
  'advantageous', 'advantage', 'beneficial', 'well placed', 'well-placed', 'dignified', 'empowered', 'potent',
];
const NEGATIVE: readonly string[] = [
  'weak', 'weaker', 'weakest', 'weakened', 'weakness', 'challenging', 'challenged', 'difficult', 'demanding',
  'adverse', 'unfavourable', 'unfavorable', 'afflicted', 'troubled', 'obstructed', 'hindered', 'strained',
  'compromised', 'impaired', 'poorly placed',
];
const MIXED: readonly string[] = ['mixed', 'balanced', 'two-sided', 'double-edged', 'ambivalent'];
const NEUTRAL: readonly string[] = ['neutral'];

function termPattern(term: string): RegExp {
  const body = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[- ]/g, '[- ]');
  return new RegExp(`\\b${body}\\b`, 'i');
}

function build(list: readonly string[], polarity: JudgementPolarity): JudgementTerm[] {
  return list.map((term) => ({ term, pattern: termPattern(term), polarity }));
}

/** V1: the closed judgement lexicon. */
export const JUDGEMENT_TERMS: readonly JudgementTerm[] = [
  ...build(POSITIVE, 'positive'),
  ...build(NEGATIVE, 'negative'),
  ...build(MIXED, 'mixed'),
  ...build(NEUTRAL, 'neutral'),
];

/** Which strength classes each polarity may restate. */
export const COMPATIBLE_CLASSES: Readonly<Record<JudgementPolarity, readonly StrengthClass[]>> = {
  positive: ['supported', 'resolved-supported'],
  negative: ['challenged', 'resolved-challenged'],
  mixed: ['mixed'],
  neutral: ['neutral', 'not-assessed'],
};

/** A negation within three words before a term turns it into a non-judgement ("not especially strong"). */
const NEGATION_BEFORE = /\b(?:not|no|neither|nor|never|without|isn't|is not|aren't|are not)\b(?:\s+\S+){0,2}\s*$/i;

/**
 * "does not treat an empty house as an advantage", "never regards an unaspected house as protected":
 * the term is the object of a denied classification, not a judgement (seventh-house, eleventh-house,
 * golden run 2). Bounded to one clause and 60 characters.
 */
export const DENIED_CLASSIFICATION_BEFORE =
  /\b(?:not|never|no longer)\s+(?:treat|treats|treated|regard|regards|regarded|count|counts|counted|see|sees|present|presents|presented|read|reads|consider|considers|considered|describe|describes|described)\b[^,;:.]{0,60}\bas\s+(?:an?\s+|being\s+)?(?:\w+\s+)?$/i;

/** Chart entities; V1 only applies to sentences that evaluate a chart factor. */
export const CHART_ENTITY =
  /\b(?:sun|moon|mars|mercury|jupiter|venus|saturn|rahu|ketu|ascendant|lagna|house|houses|lord|lordship|sign|yoga|yogas|dasha|mahadasha|antardasha|transit|placement|chart|d10|d9|navamsa|dasamsa|planet|planets|karaka|amatyakaraka|atmakaraka|bindus?|sarvashtakavarga|ashtakavarga)\b/i;

export interface JudgementHit {
  term: string;
  polarity: JudgementPolarity;
}

/** Non-negated judgement terms in a sentence, in lexicon order (deterministic). */
export function findJudgementTerms(sentence: string): JudgementHit[] {
  const hits: JudgementHit[] = [];
  for (const t of JUDGEMENT_TERMS) {
    const m = t.pattern.exec(sentence);
    if (!m) continue;
    const before = sentence.slice(0, m.index);
    if (NEGATION_BEFORE.test(before) || DENIED_CLASSIFICATION_BEFORE.test(before)) continue;
    hits.push({ term: t.term, polarity: t.polarity });
  }
  return hits;
}

/**
 * Whether a judgement term may restate a result of class `cls`. A `mixed` result
 * may be described with one-sided words only inside a sentence that says both
 * sides (MIXED_MARKERS), e.g. "it favours research but works against visibility".
 */
export function isCompatible(polarity: JudgementPolarity, cls: StrengthClass, text?: string): boolean {
  if (COMPATIBLE_CLASSES[polarity].includes(cls)) return true;
  return cls === 'mixed' && (polarity === 'positive' || polarity === 'negative') && text !== undefined && MIXED_MARKERS.test(text);
}

/** V2: one-sided intensifiers that a claim citing a `mixed` result must not use. */
export const ONE_SIDED_INTENSIFIERS =
  /\b(?:exceptionally|extremely|highly|very strong|very weak|overwhelmingly|decisively|unquestionably|undeniably|clearly (?:strong|weak|favourable|favorable|supportive)|entirely|completely|purely|wholly|thoroughly|remarkably|immensely|truly (?:strong|exceptional))\b/i;

/** V2: phrases that honestly acknowledge a two-sided result. */
export const MIXED_MARKERS =
  /\b(?:mixed|both|on the one hand|on the other hand|however|but|while|whereas|although|though|yet|balanced|two-sided|double-edged|offset|offsets|tempered|tempers|alongside|at the same time|counterweight|in tension)\b/i;

/**
 * Overstatement / guarantee lexicon (audit V7; editorial-validator GUARANTEE extension).
 * A yoga, dasha or transit is a potential, never a promise.
 */
export const OVERSTATEMENT =
  /\b(?:ensures?|ensuring|grants?(?: you)?|granting|endows?|endowing|guarantee[ds]?|guaranteeing|assured(?:ly)?|effortless(?:ly)?|unshakeable|unshakable|destined|certainly will|will certainly|is bound to|are bound to|rock-solid|infallibl[ey])\b/i;

/** Sentences in a predictive context (yoga, dasha, transit) where overstatement is always an error. */
export const PREDICTIVE_CONTEXT = /\b(?:yogas?|dashas?|mahadashas?|antardashas?|bhuktis?|transits?|transiting|gochar|sade\s*sati|period)\b/i;

/**
 * V4: terms naming a deterministic derivation. Each must be backed by a cited
 * fact or interpretation whose id, kind, label or value names the derivation.
 */
export interface DerivedTerm {
  term: string;
  /** Finds the term in prose. */
  pattern: RegExp;
  /** Matches `id kind label value` of an evidence item that backs the term. */
  backing: RegExp;
}

export const DERIVED_TERMS: readonly DerivedTerm[] = [
  { term: 'dispositor', pattern: /\bdispositors?\b/i, backing: /dispositor/i },
  { term: 'yogakaraka', pattern: /\byoga[- ]?karakas?\b/i, backing: /yoga[- ]?karaka/i },
  { term: 'vargottama', pattern: /\bvargottam(?:a|am)\b/i, backing: /vargottam/i },
  { term: 'Sade Sati', pattern: /\bsade[- ]?sati\b/i, backing: /sade[- ]?sati|saturn-from-moon/i },
  { term: 'kendra', pattern: /\bkendras?\b|\bangular houses?\b/i, backing: /kendra/i },
  { term: 'trikona', pattern: /\btrikonas?\b|\btrines?\b/i, backing: /trikona|trine/i },
  { term: 'exchange', pattern: /\b(?:sign exchange|exchange of signs|mutual exchange|parivartana)\b/i, backing: /exchange|parivartana/i },
];

/** V6: phrasing that announces a general rule. Must be backed by a cited interpretation. */
export const INVENTED_RULE_PATTERNS: readonly RegExp[] = [
  /\b(?:generally|usually|typically|normally|classically|traditionally) (?:requires?|demands?|needs?|means?|indicates?|signif(?:y|ies)|dictates?)\b/i,
  /\bclassically means\b[^.]*\bmust\b/i,
  /\b(?:the|a) (?:classical |traditional )?rule (?:is|says|states)\b/i,
  /\bas a (?:general )?rule\b/i,
  /\b(?:texts|classics|tradition) (?:say|says|state|states|hold|holds) that\b[^.]*\b(?:must|always|never)\b/i,
];

/** "No positive spin on absence": an absence of planets or aspects ... */
export const ABSENCE_TERMS =
  /\b(?:empty|unoccupied|vacant|no planets?|without (?:any )?planets?|free (?:of|from) (?:planetary )?(?:occupants?|planets?)|unaspected|no (?:planetary )?aspects?|receives? no (?:planetary )?aspects?|untouched by)\b/i;
/** ... presented as an advantage. */
export const ADVANTAGE_TERMS =
  /\b(?:simplicity|simple|uncomplicated|free (?:of|from) (?:\w+ )?(?:friction|conflict|tension|interference|pressure|drives?)|protected|protection|advantage|advantageous|benefit|beneficial|clean|clear path|smooth(?:er|ly)?|less prone|untroubled|unobstructed|unencumbered|unhindered|undisturbed|freedom)\b/i;

/** Seniority wording that needs a life stage that supports it (audit V10). */
export const SENIORITY_TERMS =
  /\b(?:board[- ]level|boardroom|retirement|retire|c-suite|executive leadership|mentoring (?:younger|junior) colleagues|governance officer|late career|twilight of your career)\b/i;

/** SAV/BAV misdefinition ("support from transiting planets"), banned in every topic. */
export const ASHTAKAVARGA_TERM = /\b(?:bindus?|sarvashtakavarga|ashtakavarga|bhinnashtakavarga|SAV|BAV)\b/i;
export const TRANSITING_PLANETS_SOURCE =
  /\b(?:from|by|of|through)\s+(?:all\s+(?:the\s+)?|the\s+)?(?:transiting|moving|passing|current(?:ly transiting)?)\s+planets\b|\btransiting planets\s+(?:give|gives|contribute|contributes|provide|provides|bestow|bestows|send|sends|lend|lends|offer|offers)\b/i;

/**
 * Negation or contrast that denies the phrase right after it ("rather than support given by
 * transiting planets", "they are not support from transiting planets", "instead of effortless
 * gains"). At most four words may sit between the marker and the phrase. "not only / not just /
 * not merely" is an intensifier, not a denial.
 */
const DENIAL_BEFORE =
  /\b(?:not(?!\s+(?:only|just|merely)\b)|never|no|nor|neither|isn't|aren't|rather than|instead of|as opposed to|unlike|independent(?:ly)? of)\b(?:\s+[\w'’-]+){0,4}\s*$/i;
/** A denial only reaches the end of its own clause. */
const CLAUSE_BOUNDARY = /[,;:()—–]|\b(?:but|whereas|however|yet)\b/gi;

/** True when the phrase starting at `index` in `sentence` is denied by a negation or contrast in the same clause. */
export function deniedInClause(sentence: string, index: number): boolean {
  const before = sentence.slice(0, index);
  let start = 0;
  for (const m of before.matchAll(CLAUSE_BOUNDARY)) start = (m.index ?? 0) + m[0].length;
  return DENIAL_BEFORE.test(before.slice(start));
}

/**
 * True when a sentence defines Ashtakavarga bindus as support from transiting planets
 * (calculation audit A1). The negated, correct form ("a natal tally rather than support given by
 * transiting planets") is not a misdefinition.
 */
export function misdefinesAshtakavarga(sentence: string): boolean {
  if (!ASHTAKAVARGA_TERM.test(sentence)) return false;
  const re = new RegExp(TRANSITING_PLANETS_SOURCE.source, 'gi');
  for (const m of sentence.matchAll(re)) if (!deniedInClause(sentence, m.index ?? 0)) return true;
  return false;
}

/** First overstatement term in a sentence that is not denied ("rather than effortless gains" is not one). */
export function findOverstatement(sentence: string): RegExpExecArray | null {
  const re = new RegExp(OVERSTATEMENT.source, 'gi');
  for (const m of sentence.matchAll(re)) {
    if (deniedInClause(sentence, m.index ?? 0)) continue;
    // "Review contracts periodically to ensure transparency": a purpose clause in advice promises
    // nothing. In a predictive sentence (yoga, dasha, transit, period) it is still an overstatement.
    if (/^ensure$/i.test(m[0]) && /\bto\s+$/i.test(sentence.slice(0, m.index ?? 0)) && !PREDICTIVE_CONTEXT.test(sentence)) continue;
    return m as RegExpExecArray;
  }
  return null;
}

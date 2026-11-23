/**
 * Editorial safeguards (AGENTS.md + docs/report-system §10).
 *
 * Blocks fear-based dosha language, guaranteed outcomes, medical/financial/legal
 * certainty, foreign branding and leaked reference-sample identities, and flags
 * cross-topic repetition.
 */
import { GeneratedTopicPayload, ValidationIssue } from '../contracts';
import { devanagariShare, findHindiOverstatement, hasDevanagari, HINDI_PREDICTIVE_CONTEXT, HINDI_RULES, HINDI_STOPWORDS, matchHindiRule, misdefinesAshtakavargaHindi } from './hindi-lexicon';
import { findOverstatement, misdefinesAshtakavarga, PREDICTIVE_CONTEXT } from './judgement-lexicon';

interface Rule {
  code: string;
  severity: 'error' | 'warning';
  pattern: RegExp;
  message: string;
}

const RULES: Rule[] = [
  { code: 'FEAR_LANGUAGE', severity: 'error', pattern: /(?<!\b(?:not|no|never|nor|isn't|is not|rather than|instead of)\s(?:an?\s|a\s)?)\b(curse[ds]?|cursed|doomed|destroy(?:s|ed)? your|catastroph\w*|calamit\w*|inauspicious fate|evil eye|black magic)\b/i, message: 'Fear-based language is not permitted' },
  { code: 'DOSHA_AS_AFFLICTION', severity: 'error', pattern: /\b(suffer(?:s|ing)? from|afflicted by|victim of)\s+(?:a\s+|the\s+)?(?:manglik|mangal|kaal\s*sarp|pitra|nadi|kemadruma|sade\s*sati)/i, message: 'Doshas must not be framed as afflictions (Astro Sushil does not believe in doshas)' },
  { code: 'GUARANTEE', severity: 'error', pattern: /\b(guarantee[ds]?|certainly will|will definitely|100\s?%|without (?:any )?doubt you will|is destined to fail|never marry|will die)\b/i, message: 'Guaranteed or absolute outcomes are not permitted' },
  { code: 'MEDICAL_CERTAINTY', severity: 'error', pattern: /\b(will (?:get|develop|suffer)\s+(?:cancer|diabetes|disease|illness)|diagnos\w+)\b/i, message: 'Medical predictions are not permitted' },
  { code: 'FINANCIAL_CERTAINTY', severity: 'error', pattern: /\b(will (?:become|be) (?:rich|wealthy|a millionaire)|guaranteed returns?|lottery)\b/i, message: 'Financial certainty is not permitted' },
  { code: 'REMEDY_SALES', severity: 'error', pattern: /\b(buy|purchase|order|invest in|get yourself)\b[^.]{0,40}\b(gem|gemstone|stone|sapphire|ruby|emerald|pearl|coral|diamond|hessonite|cat's eye|rudraksha?|yantra|puja|pooja|kavach|bracelet)s?\b|\bcoupon\b|\bdiscount\b/i, message: 'Remedy sales language is not permitted' },
  { code: 'FOREIGN_BRAND', severity: 'error', pattern: /\b(arun pandit|gemsmantra|astroarunpandit)\b/i, message: 'Third-party brand mentioned' },
  { code: 'REFERENCE_IDENTITY_LEAK', severity: 'error', pattern: /\b(puneet|bulandshahr|ananya iyer)\b/i, message: 'Reference/sample native identity leaked into content' },
  { code: 'PLACEHOLDER', severity: 'error', pattern: /\b(lorem ipsum|TODO|TBD|\[insert|\{\{|N\/A)\b/, message: 'Placeholder text' },
  { code: 'AI_SELF_REFERENCE', severity: 'error', pattern: /\b(as an ai|language model|i cannot|i'm unable)\b/i, message: 'Model self-reference' },
  { code: 'INVENTED_HISTORY', severity: 'warning', pattern: /\b(when you were (?:a child|young)|you (?:once|previously) (?:told|said)|as you know from your past)\b/i, message: 'Possible invented personal history' },
];

export function topicText(p: GeneratedTopicPayload): string {
  return [p.lead, ...p.paragraphs, ...p.bullets, p.takeaway ?? ''].join('\n');
}

/** Split prose into sentences (English and Hindi danda). Deterministic. */
export function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?।])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
}

export interface EditorialOptions {
  /** True for topics that opted in to interpretation results (stricter severities). */
  interpretationTopic?: boolean;
  /** Language of the edition. A Hindi edition must be written in Devanagari. */
  language?: 'en' | 'hi';
}

/** Below this share of Devanagari letters a Hindi passage counts as written in the wrong language or script. */
const MIN_DEVANAGARI_SHARE = 0.7;

export function validateEditorial(payload: GeneratedTopicPayload, opts: EditorialOptions = {}): ValidationIssue[] {
  const text = topicText(payload);
  const issues: ValidationIssue[] = [];
  for (const r of RULES) {
    const m = r.pattern.exec(text);
    if (m) issues.push({ severity: r.severity, code: r.code, message: `${r.message}: "${m[0]}"` });
  }
  const hindi = hasDevanagari(text);
  if (hindi) {
    for (const r of HINDI_RULES) {
      const hit = matchHindiRule(r, text);
      if (hit && !issues.some((i) => i.code === r.code)) issues.push({ severity: r.severity, code: r.code, message: `${r.message}: "${hit}"` });
    }
  }
  if (opts.language === 'hi') {
    for (const part of [payload.lead, ...payload.paragraphs, ...payload.bullets, payload.takeaway ?? '']) {
      if (part.trim().length >= 20 && devanagariShare(part) < MIN_DEVANAGARI_SHARE) {
        issues.push({ severity: 'error', code: 'WRONG_LANGUAGE', message: `A Hindi edition must be written in Hindi (Devanagari): "${part.slice(0, 80)}"` });
        break;
      }
    }
  }
  const guarantee = RULES.find((r) => r.code === 'GUARANTEE')!.pattern;
  const hindiGuarantee = HINDI_RULES.find((r) => r.code === 'GUARANTEE')!;
  for (const s of splitSentences(text)) {
    if (hindi) {
      const overHi = findHindiOverstatement(s);
      if (overHi && !matchHindiRule(hindiGuarantee, s)) {
        const severity = opts.interpretationTopic || HINDI_PREDICTIVE_CONTEXT.test(s) ? 'error' : 'warning';
        issues.push({ severity, code: 'OVERSTATEMENT', message: `Overstated or guaranteed outcome ("${overHi[0]}"): "${s.slice(0, 120)}"` });
      }
      if (misdefinesAshtakavargaHindi(s)) {
        issues.push({
          severity: 'error', code: 'ASHTAKAVARGA_MISDEFINED',
          message: `Ashtakavarga bindus are natal points from the eight contributors, not support from transiting planets: "${s.slice(0, 120)}"`,
        });
      }
    }
    // Overstatement lexicon (audit V7): a yoga, dasha or transit is a potential, never a promise.
    // A denied term ("rather than effortless gains", "does not ensure") is not an overstatement.
    const over = findOverstatement(s);
    if (over && !guarantee.test(s)) {
      const severity = opts.interpretationTopic || PREDICTIVE_CONTEXT.test(s) ? 'error' : 'warning';
      issues.push({ severity, code: 'OVERSTATEMENT', message: `Overstated or guaranteed outcome ("${over[0]}"): "${s.slice(0, 120)}"` });
    }
    // Canonical Sarvashtakavarga definition (calculation audit A1): bindus are natal; transits are judged against them.
    // The negated, correct wording ("a natal tally rather than support given by transiting planets") passes.
    if (misdefinesAshtakavarga(s)) {
      issues.push({
        severity: 'error', code: 'ASHTAKAVARGA_MISDEFINED',
        message: `Ashtakavarga bindus are natal points from the eight contributors, not support from transiting planets: "${s.slice(0, 120)}"`,
      });
    }
  }
  // Intra-topic duplicated sentences.
  const seen = new Set<string>();
  for (const s of splitSentences(text)) {
    const k = normKey(s);
    if (k.length > 40 && seen.has(k)) {
      issues.push({ severity: 'warning', code: 'REPEATED_SENTENCE', message: `Repeated: "${s.slice(0, 80)}"` });
    }
    seen.add(k);
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Repetition
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'into', 'as', 'is', 'are',
  'was', 'were', 'be', 'been', 'being', 'it', 'its', 'this', 'that', 'these', 'those', 'your', 'you', 'yours', 'their', 'there',
  'which', 'who', 'whom', 'what', 'where', 'when', 'while', 'than', 'then', 'so', 'such', 'can', 'may', 'might', 'will', 'would',
  'should', 'could', 'has', 'have', 'had', 'do', 'does', 'did', 'not', 'no', 'also', 'more', 'most', 'very', 'about', 'through',
  'over', 'under', 'within', 'across', 'how', 'here', 'own', 'one', 'often', 'tends', 'tend', 'suggests', 'suggest',
  ...HINDI_STOPWORDS,
]);

function stem(w: string): string {
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

/** Normalised content tokens of a sentence (lower-case, stop words removed, light stemming). */
export function sentenceTokens(sentence: string): string[] {
  return sentence
    .toLowerCase()
    .split(/[^a-z0-9ऀ-ॿ]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(stem);
}

function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

function bigrams(tokens: string[]): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i + 1 < tokens.length; i++) out.add(`${tokens[i]} ${tokens[i + 1]}`);
  return out;
}

export interface RepetitionOptions {
  /** Unigram Jaccard at or above this is a near duplicate. */
  unigramThreshold?: number;
  /** Bigram (2-token shingle) Jaccard at or above this is a near duplicate. */
  bigramThreshold?: number;
  /** Sentences with fewer content tokens are ignored. */
  minTokens?: number;
}

export const DEFAULT_REPETITION_OPTIONS: Required<RepetitionOptions> = { unigramThreshold: 0.7, bigramThreshold: 0.6, minTokens: 6 };

interface Fingerprint {
  topicId: string;
  sentence: string;
  uni: Set<string>;
  bi: Set<string>;
}

function fingerprints(p: GeneratedTopicPayload, minTokens: number): Fingerprint[] {
  const out: Fingerprint[] = [];
  for (const sentence of splitSentences(topicText(p))) {
    const tokens = sentenceTokens(sentence);
    if (tokens.length < minTokens) continue;
    out.push({ topicId: p.topicId, sentence, uni: new Set(tokens), bi: bigrams(tokens) });
  }
  return out;
}

/** Deterministic near-duplicate score of two sentences: max(unigram Jaccard, bigram Jaccard) as [uni, bi]. */
export function sentenceSimilarity(a: string, b: string): { unigram: number; bigram: number } {
  const ta = sentenceTokens(a);
  const tb = sentenceTokens(b);
  return { unigram: jaccard(new Set(ta), new Set(tb)), bigram: jaccard(bigrams(ta), bigrams(tb)) };
}

export interface NearDuplicate {
  topicId: string;
  sentence: string;
  otherTopicId: string;
  otherSentence: string;
  similarity: number;
}

function isNear(a: Fingerprint, b: Fingerprint, o: Required<RepetitionOptions>): number | null {
  const uni = jaccard(a.uni, b.uni);
  const bi = jaccard(a.bi, b.bi);
  if (uni >= o.unigramThreshold || bi >= o.bigramThreshold) return Math.round(Math.max(uni, bi) * 1000) / 1000;
  return null;
}

/**
 * Sentences of `payload` that nearly duplicate a sentence of an earlier topic.
 * Used by the narrator for opted-in topics (error) and by report-level checks.
 */
export function findNearDuplicatesAgainst(
  payload: GeneratedTopicPayload,
  earlier: GeneratedTopicPayload[],
  options: RepetitionOptions = {}
): NearDuplicate[] {
  const o = { ...DEFAULT_REPETITION_OPTIONS, ...options };
  const prior = earlier.filter((p) => p.topicId !== payload.topicId).flatMap((p) => fingerprints(p, o.minTokens));
  const out: NearDuplicate[] = [];
  for (const f of fingerprints(payload, o.minTokens)) {
    for (const g of prior) {
      const sim = isNear(f, g, o);
      if (sim !== null) {
        out.push({ topicId: f.topicId, sentence: f.sentence, otherTopicId: g.topicId, otherSentence: g.sentence, similarity: sim });
        break; // one report per sentence: the earliest matching topic
      }
    }
  }
  return out;
}

/** All near-duplicate sentence pairs across topics of a report, in payload order. */
export function findNearDuplicates(payloads: GeneratedTopicPayload[], options: RepetitionOptions = {}): NearDuplicate[] {
  const out: NearDuplicate[] = [];
  payloads.forEach((p, i) => out.push(...findNearDuplicatesAgainst(p, payloads.slice(0, i), options)));
  return out;
}

/**
 * Cross-topic repetition: identical (normalised, ≥60 characters) or near-duplicate
 * sentences used in more than one topic. Same shape as before; near duplicates
 * are grouped under the earlier sentence.
 */
function normKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z\u0900-\u097F ]/g, '').replace(/\s+/g, ' ').trim();
}

export function findCrossTopicRepetition(payloads: GeneratedTopicPayload[]): Array<{ sentence: string; topics: string[] }> {
  const index = new Map<string, Set<string>>();
  for (const p of payloads) {
    for (const s of splitSentences(topicText(p))) {
      const k = normKey(s);
      if (k.length < 60) continue;
      if (!index.has(k)) index.set(k, new Set());
      index.get(k)!.add(p.topicId);
    }
  }
  const exact = [...index.entries()].filter(([, t]) => t.size > 1).map(([sentence, t]) => ({ sentence, topics: [...t] }));
  const exactKeys = new Set(exact.map((e) => e.sentence));
  const near = new Map<string, Set<string>>();
  for (const d of findNearDuplicates(payloads)) {
    if (exactKeys.has(normKey(d.otherSentence))) continue;
    if (!near.has(d.otherSentence)) near.set(d.otherSentence, new Set([d.otherTopicId]));
    near.get(d.otherSentence)!.add(d.topicId);
  }
  return [...exact, ...[...near.entries()].map(([sentence, t]) => ({ sentence, topics: [...t] }))];
}

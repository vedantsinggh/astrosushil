/**
 * Deterministic repair of a generated topic that failed validation.
 *
 * When the validators reject individual sentences (an evaluative sentence with
 * no verified backing, a sentence that contradicts the chart, a near-duplicate,
 * an overstatement) the cheapest correct fix is to remove exactly those
 * sentences and validate again, instead of paying the model to rewrite the
 * whole topic. Nothing is added or reworded: the result contains only text the
 * model wrote and the validators accept. Claims that did not verify are
 * dropped the same way, so sentences that depended on them are re-checked
 * without that support.
 *
 * Problems that are not about one sentence (too short, a required
 * interpretation never cited, a mixed result never acknowledged) cannot be
 * repaired here and still go back to the model.
 */
import { GeneratedTopicPayload, TopicValidationResult, ValidationIssue } from '../contracts';
import { splitSentences } from '../validation/editorial-validator';

/** Error codes whose message ends with the offending sentence (or claim statement) in quotes. */
const SENTENCE_SCOPED = new Set([
  'UNSUPPORTED_JUDGEMENT',
  'JUDGEMENT_CLASS_MISMATCH',
  'MIXED_RESULT_OVERSTATED',
  'DERIVED_TERM_UNSUPPORTED',
  'ABSENCE_PRESENTED_AS_ADVANTAGE',
  'LIFE_STAGE_MISMATCH',
  'NEAR_DUPLICATE_ACROSS_TOPICS',
  'OVERSTATEMENT',
  'NARRATIVE_CONTRADICTS_CHART',
  'NARRATIVE_CONTRADICTS_TRANSIT',
  'INTERPRETATION_CLAIM_UNVERIFIABLE',
]);

/** Errors that removing unverified claims resolves or turns into sentence-scoped errors. */
const CLAIM_SCOPED = new Set(['REJECTED_CLAIMS']);

export function isRepairable(issues: ValidationIssue[]): boolean {
  const errors = issues.filter((i) => i.severity === 'error');
  return errors.length > 0 && errors.every((i) => SENTENCE_SCOPED.has(i.code) || CLAIM_SCOPED.has(i.code));
}

/** The quoted sentence prefix a validator message ends with, if any. */
export function quotedSentence(message: string): string | undefined {
  if (!message.endsWith('"')) return undefined;
  const start = Math.max(message.lastIndexOf(': "'), message.lastIndexOf('— "'));
  if (start < 0) return undefined;
  const text = message.slice(start + 3, -1).trim();
  return text.length >= 12 ? text : undefined;
}

export interface RepairStep {
  payload: GeneratedTopicPayload;
  /** Narrative sentences removed in this step. */
  removedSentences: string[];
  removedClaims: number;
}

/**
 * One repair step: drop unverified claims and the sentences named by the
 * sentence-scoped errors. Returns undefined when nothing could be removed or
 * the removal would break the payload's shape (e.g. the lead itself is at fault).
 */
export function repairOnce(payload: GeneratedTopicPayload, validation: TopicValidationResult, issues: ValidationIssue[]): RepairStep | undefined {
  const prefixes = issues
    .filter((i) => i.severity === 'error' && SENTENCE_SCOPED.has(i.code))
    .map((i) => quotedSentence(i.message))
    .filter((p): p is string => p !== undefined);
  const hit = (s: string) => prefixes.some((p) => s.startsWith(p));

  const unverified = new Set(validation.claims.filter((c) => c.status !== 'verified').map((c) => c.statement));
  const claims = payload.claims.filter((c) => !unverified.has(c.statement) && !hit(c.statement));
  const removedClaims = payload.claims.length - claims.length;

  const removedSentences: string[] = [];
  const strip = (text: string): string => {
    const kept = splitSentences(text).filter((s) => {
      if (!hit(s)) return true;
      removedSentences.push(s);
      return false;
    });
    return kept.join(' ');
  };
  const lead = strip(payload.lead);
  if (lead.length < 10) return undefined; // the opening sentence cannot be dropped
  const paragraphs = payload.paragraphs.map(strip).filter((p) => p.length >= 20);
  if (!paragraphs.length) return undefined;
  const bullets = payload.bullets.map(strip).filter((b) => b.length >= 5);
  const takeaway = payload.takeaway === undefined ? undefined : strip(payload.takeaway) || undefined;

  if (!removedSentences.length && !removedClaims) return undefined;
  return { payload: { ...payload, lead, paragraphs, bullets, takeaway, claims }, removedSentences, removedClaims };
}

export function countSentences(p: GeneratedTopicPayload): number {
  return splitSentences([p.lead, ...p.paragraphs, ...p.bullets, p.takeaway ?? ''].join('\n')).length;
}

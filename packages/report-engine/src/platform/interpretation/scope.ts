/**
 * Interpretation scope of a report topic (proposal §5, topic opt-in).
 *
 * A topic opts in by listing `interpretations` patterns. For such a topic:
 *   allowedEvidence = required ∪ optional ∪ interpretations ∪ chartRefs(matched results)
 * For every other topic the scope is exactly the legacy `[...required, ...optional]`, so its
 * evidence fingerprint, prompt and cache key are byte-identical to before.
 *
 * Also: life-stage topic variants (product defaults; see contracts `TopicVariantSchema`).
 */
import type { InterpretationResult } from '@astro/prediction-engine';
import { AgeWindow, ReportTopic, TopicVariant } from '../contracts';
import { EvidenceRegistry } from '../evidence/evidence-registry';
import { sha256, stableStringify } from '../snapshot/chart-snapshot';

export function isInterpretationTopic(topic: Pick<ReportTopic, 'interpretations'>): boolean {
  return (topic.interpretations ?? []).length > 0;
}

/** Results matched by the topic's patterns, sorted by ID. Empty when not opted in or no pack ran. */
export function matchedInterpretations(topic: Pick<ReportTopic, 'interpretations'>, registry: EvidenceRegistry): InterpretationResult[] {
  const index = registry.interpretation;
  if (!index || !isInterpretationTopic(topic)) return [];
  const out: InterpretationResult[] = [];
  for (const [id, r] of index.byId) if (EvidenceRegistry.matches(id, topic.interpretations)) out.push(r);
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

/** Evidence patterns/IDs the topic may cite (see file comment). */
export function topicAllowedEvidence(topic: Pick<ReportTopic, 'requiredEvidence' | 'optionalEvidence' | 'interpretations'>, registry: EvidenceRegistry): string[] {
  const legacy = [...topic.requiredEvidence, ...topic.optionalEvidence];
  if (!isInterpretationTopic(topic)) return legacy;
  const out = [...legacy];
  const seen = new Set(out);
  const push = (x: string) => {
    if (!seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  };
  for (const p of topic.interpretations) push(p);
  for (const r of matchedInterpretations(topic, registry)) for (const ref of [...r.chartRefs].sort()) push(ref);
  return out;
}

/**
 * Fingerprint of the conclusions an opted-in topic narrates (for `TopicCacheKeyParts.
 * interpretationFingerprint`). `undefined` for legacy topics, so their cache key is unchanged
 * (stableStringify drops undefined keys).
 */
export function interpretationFingerprint(topic: Pick<ReportTopic, 'interpretations'>, registry: EvidenceRegistry): string | undefined {
  if (!isInterpretationTopic(topic)) return undefined;
  const index = registry.interpretation;
  const results = matchedInterpretations(topic, registry).map((r) => ({
    id: r.id, code: r.conclusion.code, strengthClass: r.strengthClass, qualification: r.qualification,
    time: r.timeRelevance, ruleIds: r.ruleIds, chartRefs: r.chartRefs,
  }));
  return sha256(stableStringify({
    patterns: topic.interpretations,
    schemaVersion: index?.set.schemaVersion ?? null,
    rulesetVersion: index?.set.rulesetVersion ?? null,
    results,
  })).slice(0, 24);
}

// ---------------------------------------------------------------------------
// Life-stage variants
// ---------------------------------------------------------------------------

export function inAgeWindow(age: number, w: AgeWindow): boolean {
  return (w.minAge === undefined || age >= w.minAge) && (w.maxAge === undefined || age <= w.maxAge);
}

/** The first variant whose window contains `age`, or undefined. */
export function selectTopicVariant(topic: Pick<ReportTopic, 'variants'>, age: number): TopicVariant | undefined {
  return (topic.variants ?? []).find((v) => inAgeWindow(age, v.when));
}

/** The topic as narrated for a native of `age` (completed years). Topics without a matching variant are returned unchanged. */
export function applyTopicVariant<T extends ReportTopic>(topic: T, age: number | undefined): { topic: T; variant?: string } {
  if (age === undefined) return { topic };
  const v = selectTopicVariant(topic, age);
  if (!v) return { topic };
  const objective = [v.objective ?? topic.objective, v.objectiveAppend].filter(Boolean).join(' ');
  return {
    topic: { ...topic, title: v.title ?? topic.title, subtitle: v.subtitle ?? topic.subtitle, objective },
    variant: v.id,
  };
}

/** Completed age at the report date from the registry's `native.age`, when registered. */
export function nativeAge(registry: EvidenceRegistry): number | undefined {
  const v = registry.get('native.age')?.value;
  return typeof v === 'number' ? v : undefined;
}

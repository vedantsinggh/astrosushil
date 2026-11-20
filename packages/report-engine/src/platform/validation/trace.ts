/**
 * Statement → evidence traceability (proposal §5).
 *
 * Pure function: for each claim of a generated topic, list the evidence it
 * cites, the interpretation results among them, and the rule IDs behind those
 * results (from the registry `source` field, `interpretation:<ruleIds>`).
 * The orchestrator writes the result to `TopicManifestEntry.trace`.
 */
import type { GeneratedTopicPayload, TopicValidationResult } from '../contracts';
import type { EvidenceRegistry } from '../evidence/evidence-registry';
import { INTERPRETATION_ID_PREFIX, ruleIdsFromSource } from './interpretation-validator';

export interface TraceEntry {
  statement: string;
  evidenceIds: string[];
  interpretationIds: string[];
  ruleIds: string[];
}

/**
 * Build the trace of a payload. Only evidence IDs that exist in the registry
 * are listed. When `validation` is given, only verified claims are traced
 * (an unverified claim is not a trustworthy statement → evidence link).
 */
export function buildTrace(payload: GeneratedTopicPayload, registry: EvidenceRegistry, validation?: TopicValidationResult): TraceEntry[] {
  const verified = validation
    ? new Set(validation.claims.filter((c) => c.status === 'verified').map((c) => `${c.statement}\u0000${c.evidenceIds.join(',')}`))
    : undefined;
  const out: TraceEntry[] = [];
  for (const claim of payload.claims) {
    if (verified && !verified.has(`${claim.statement}\u0000${claim.evidenceIds.join(',')}`)) continue;
    const evidenceIds = [...new Set(claim.evidenceIds.filter((id) => registry.has(id)))];
    const interps = evidenceIds.filter((id) => id.startsWith(INTERPRETATION_ID_PREFIX) || registry.get(id)?.kind === 'interpretation');
    const ruleIds = [...new Set(interps.flatMap((id) => ruleIdsFromSource(registry.get(id)!.source)))].sort();
    out.push({ statement: claim.statement, evidenceIds, interpretationIds: interps, ruleIds });
  }
  return out;
}

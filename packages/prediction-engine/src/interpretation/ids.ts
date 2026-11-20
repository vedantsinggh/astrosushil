/**
 * Deterministic identifiers for the interpretation layer.
 *
 * IDs are derived from content only (topic key, subject, rule ID): no counters, no
 * wall-clock time. Result IDs follow the evidence-registry grammar
 * (`/^[a-z0-9]+(\.[a-z0-9-]+)+$/`, report-engine contracts.ts) so they can be registered
 * as `interp.*` evidence items.
 */
import { createHash } from 'node:crypto';
import type { ConflictPolicy, InterpretationRule } from './types';

/** Evidence-registry ID grammar (report-engine `EvidenceItemSchema.id`). */
export const REGISTRY_ID_PATTERN = /^[a-z0-9]+(\.[a-z0-9-]+)+$/;

export const INTERPRETATION_ID_PREFIX = 'interp';

/**
 * JSON with sorted object keys; `undefined` object properties are dropped. Same output as
 * report-engine `stableStringify` (chart-snapshot.ts), duplicated to avoid a package cycle.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(',')}}`;
}

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/** Lower-case slug for one ID segment: runs of other characters become '-'. */
export function idSegment(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class InterpretationIdError extends Error {
  constructor(message: string) {
    super(`INTERPRETATION_ID_INVALID: ${message}`);
  }
}

function joinSegments(head: string, parts: string[]): string {
  const segments = parts.flatMap((p) => p.split('.')).map(idSegment);
  if (segments.some((s) => s.length === 0)) {
    throw new InterpretationIdError(`empty segment in ${JSON.stringify(parts)}`);
  }
  const id = [head, ...segments].join('.');
  if (!REGISTRY_ID_PATTERN.test(id)) throw new InterpretationIdError(id);
  return id;
}

/**
 * Result ID: `interp.<topic>.<parts…>`, e.g.
 * `buildInterpretationId('career.house-10', 'lord-placement')` → `interp.career.house-10.lord-placement`.
 * Dots inside `topic` or `parts` separate segments; each segment is slugged.
 */
export function buildInterpretationId(topic: string, ...parts: string[]): string {
  return joinSegments(INTERPRETATION_ID_PREFIX, [topic, ...parts]);
}

/** Rule ID as an ID segment: 'INT-H-001' → 'int-h-001'. */
export function ruleSegment(ruleId: string): string {
  return idSegment(ruleId);
}

/**
 * ID for a stage output item (DivisionalLink, Activation…), e.g.
 * `stageItemId('S6', 'dasha', 'ad', 'jupiter', 'saturn')` → `s6.dasha.ad.jupiter.saturn`.
 */
export function stageItemId(stage: string, ...parts: string[]): string {
  if (parts.length === 0) throw new InterpretationIdError(`stage ${stage} needs at least one part`);
  return joinSegments(idSegment(stage), parts);
}

/** Is `id` an interpretation result ID? */
export function isInterpretationId(id: string): boolean {
  return id.startsWith(`${INTERPRETATION_ID_PREFIX}.`) && REGISTRY_ID_PATTERN.test(id);
}

/** Length of `rulesetVersion` (hex characters). */
export const RULESET_VERSION_LENGTH = 12;

/**
 * `sha256(stableStringify({ rules, policy }))[:12]`. Rules are sorted by ID first, so the
 * order in which a pack lists them does not matter. Any change to a rule (version, status,
 * sources, required facts, description) or to the policy changes the version.
 */
export function computeRulesetVersion(rules: readonly InterpretationRule[], policy: ConflictPolicy): string {
  const sortedRules = [...rules].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const ids = new Set<string>();
  for (const r of sortedRules) {
    if (ids.has(r.id)) throw new InterpretationIdError(`duplicate rule id ${r.id}`);
    ids.add(r.id);
  }
  const sortedPolicy: ConflictPolicy = {
    ...policy,
    rules: [...policy.rules].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  };
  return sha256Hex(stableStringify({ rules: sortedRules, policy: sortedPolicy })).slice(0, RULESET_VERSION_LENGTH);
}

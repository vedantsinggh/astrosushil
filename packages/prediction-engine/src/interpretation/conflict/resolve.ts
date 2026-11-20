/**
 * S7 conflict resolution (proposal §4). Pure, set logic only, no weights.
 *
 * 1. Collect the supporting (S) and contradicting (C) condition codes of one subject, plus
 *    neutral `context` codes.
 * 2. A precedence rule (approved or provisional; `a-overrides-b`) applies when its `a` code is
 *    standing on one side (or in context) and a `b` code is on the opposite side (either side
 *    for a context `a`). The `b` code is set aside and recorded in `Resolution.applied`.
 *    An `a` code that is itself set aside does not override anything (rules are acyclic,
 *    checked by `validateConflictPolicy`, so the outcome does not depend on order).
 * 3. Classify what remains:
 *      S'≠∅, C'=∅  → 'supported', or 'resolved-supported' when C was non-empty before step 2;
 *      S'=∅, C'≠∅  → 'challenged', or 'resolved-challenged' when S was non-empty before step 2;
 *      S'≠∅, C'≠∅  → 'mixed' with MIXED_INDICATORS (default: present both);
 *      S'=∅, C'=∅  → 'neutral'.
 *    `assess: false` → 'not-assessed' (descriptive rule; nothing is applied).
 */
import {
  QUALIFICATION_CODES,
  type ConditionCode,
  type ConditionEntry,
  type ConflictInput,
  type ConflictOutcome,
  type ConflictPolicy,
  type EvidenceLink,
  type PrecedenceRule,
  type QualificationCode,
  type StrengthClass,
  type AppliedPrecedence,
} from '../types';
import { applicablePrecedenceRules, validateConflictPolicy } from './policy';

type Side = 'S' | 'C';

const byString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function uniqueSorted<T extends string>(values: Iterable<T>): T[] {
  return [...new Set(values)].sort(byString);
}

/** Sort qualifications in their declared order (stable, deterministic). */
export function sortQualifications(codes: Iterable<QualificationCode>): QualificationCode[] {
  const order = (q: QualificationCode) => QUALIFICATION_CODES.indexOf(q);
  return [...new Set(codes)].sort((a, b) => order(a) - order(b));
}

/** Split stage `ConditionEntry[]` into a `ConflictInput` (drops the direction field). */
export function toConflictInput(subject: string, conditions: readonly ConditionEntry[], assess = true): ConflictInput {
  const strip = ({ factId, conditionCode, ruleId }: ConditionEntry): EvidenceLink => ({ factId, conditionCode, ruleId });
  return {
    subject,
    supporting: conditions.filter((c) => c.direction === 'supports').map(strip),
    contradicting: conditions.filter((c) => c.direction === 'challenges').map(strip),
    context: conditions.filter((c) => c.direction === 'context').map(strip),
    assess,
  };
}

export function policyRef(policy: ConflictPolicy): string {
  return `${policy.id}@${policy.version}`;
}

/** Resolve one subject's conditions against the policy. Pure and deterministic. */
export function runConflictResolution(input: ConflictInput, policy: ConflictPolicy): ConflictOutcome {
  validateConflictPolicy(policy);
  const policyId = policyRef(policy);
  const supporting = [...input.supporting];
  const contradicting = [...input.contradicting];
  const context = [...(input.context ?? [])];

  if (input.assess === false) {
    return {
      subject: input.subject,
      strengthClass: 'not-assessed',
      standingSupporting: supporting,
      standingContradicting: contradicting,
      overridden: [],
      resolution: { policyId, applied: [], unresolved: [] },
      qualification: [],
      ruleIds: [],
      sources: [],
    };
  }

  const codes: Record<Side, Set<ConditionCode>> = {
    S: new Set(supporting.map((l) => l.conditionCode)),
    C: new Set(contradicting.map((l) => l.conditionCode)),
  };
  const contextCodes = new Set(context.map((l) => l.conditionCode));
  const rules = [...applicablePrecedenceRules(policy)].sort((a, b) => byString(a.id, b.id));
  const opposite = (side: Side): Side => (side === 'S' ? 'C' : 'S');

  // removedBy(side, code): the rules (with their standing `a`) that set this code aside.
  const memo = new Map<string, PrecedenceRule[]>();
  const removedBy = (side: Side, code: ConditionCode): PrecedenceRule[] => {
    const key = `${side}:${code}`;
    const cached = memo.get(key);
    if (cached) return cached;
    memo.set(key, []); // acyclic policy; placeholder guards against re-entry
    const hits = rules.filter((r) => {
      if (!r.when.b.includes(code)) return false;
      const a = r.when.a;
      if (contextCodes.has(a)) return true;
      const aSide = opposite(side);
      return codes[aSide].has(a) && removedBy(aSide, a).length === 0;
    });
    memo.set(key, hits);
    return hits;
  };

  const applied: AppliedPrecedence[] = [];
  const appliedRules = new Map<string, PrecedenceRule>();
  const removed: Record<Side, Set<ConditionCode>> = { S: new Set(), C: new Set() };
  for (const side of ['S', 'C'] as const) {
    for (const code of [...codes[side]].sort(byString)) {
      const hits = removedBy(side, code);
      if (hits.length === 0) continue;
      removed[side].add(code);
      for (const r of hits) {
        appliedRules.set(r.id, r);
        applied.push({ precedenceRuleId: r.id, overrides: r.when.a, overridden: code, source: r.source });
      }
    }
  }
  applied.sort((x, y) => byString(x.precedenceRuleId, y.precedenceRuleId) || byString(x.overridden, y.overridden));

  const standingSupporting = supporting.filter((l) => !removed.S.has(l.conditionCode));
  const standingContradicting = contradicting.filter((l) => !removed.C.has(l.conditionCode));
  const overridden = [
    ...supporting.filter((l) => removed.S.has(l.conditionCode)),
    ...contradicting.filter((l) => removed.C.has(l.conditionCode)),
  ];

  const sNow = standingSupporting.length > 0;
  const cNow = standingContradicting.length > 0;
  let strengthClass: StrengthClass;
  if (sNow && cNow) strengthClass = 'mixed';
  else if (sNow) strengthClass = contradicting.length > 0 ? 'resolved-supported' : 'supported';
  else if (cNow) strengthClass = supporting.length > 0 ? 'resolved-challenged' : 'challenged';
  else strengthClass = 'neutral';

  const unresolved: ConditionCode[] =
    strengthClass === 'mixed'
      ? uniqueSorted([...standingSupporting, ...standingContradicting].map((l) => l.conditionCode))
      : [];

  const qualification: QualificationCode[] = [];
  if (strengthClass === 'mixed') qualification.push('MIXED_INDICATORS');
  for (const r of appliedRules.values()) {
    if (r.status === 'provisional') qualification.push('PROVISIONAL_RULE');
    qualification.push(...r.adds);
  }

  return {
    subject: input.subject,
    strengthClass,
    standingSupporting,
    standingContradicting,
    overridden,
    resolution: { policyId, applied, unresolved },
    qualification: sortQualifications(qualification),
    ruleIds: uniqueSorted(appliedRules.keys()),
    sources: uniqueSorted([...appliedRules.values()].map((r) => r.source)),
  };
}

/** Resolve many subjects; output order follows input order. */
export function runConflictResolutions(inputs: readonly ConflictInput[], policy: ConflictPolicy): ConflictOutcome[] {
  return inputs.map((i) => runConflictResolution(i, policy));
}

/**
 * Conflict policy CRP (data, not code). Methodology:
 * docs/report-system/decisions/interpretation.md §"Conflict policy".
 *
 * Default: `present-both`. A conflict between supporting and contradicting conditions is
 * resolved only by a cited precedence rule; otherwise the result is 'mixed' and the reader
 * is told the indicators are mixed. No numeric weights anywhere.
 *
 * Seed rules CRP-001…003 (user decision 2026-11-20) apply but are provisional until the
 * client reviews them. CRP-1xx rows record known conflicts that stay `present-both`; they
 * are client questions, never applied.
 */
import type { ConflictPolicy, PrecedenceRule } from '../types';

export const CONFLICT_POLICY_ID = 'CRP';
export const CONFLICT_POLICY_VERSION = '1.0.0';

export const PRECEDENCE_RULES: readonly PrecedenceRule[] = [
  {
    id: 'CRP-001',
    when: { a: 'NEECHA_BHANGA', b: ['DEBILITATED'], sameSubject: true },
    outcome: 'a-overrides-b',
    adds: ['CANCELLATION_APPLIED'],
    source:
      'Neecha-bhanga (cancellation of debility): Phaladeepika ch. 7 and BPHS Neecha-bhanga verses ' +
      '(chapter and verse numbers to verify against Santhanam); route detected by the engine',
    status: 'provisional',
    description: 'An engine-detected neecha bhanga sets aside the debility of the same planet.',
  },
  {
    id: 'CRP-002',
    when: { a: 'LAGNA_LORD', b: ['OWNS_6TH', 'OWNS_8TH', 'OWNS_12TH'], sameSubject: true },
    outcome: 'a-overrides-b',
    adds: [],
    source: 'BPHS ch. 34 v. 9 (Santhanam; verify); Laghu Parashari 2.8 (verify)',
    status: 'provisional',
    description: 'The Lagna lord is not made challenging by also owning a dusthana (6th, 8th or 12th).',
  },
  {
    id: 'CRP-003',
    when: { a: 'LUMINARY', b: ['OWNS_8TH'], sameSubject: true },
    outcome: 'a-overrides-b',
    adds: [],
    source: 'Laghu Parashari ch. 2 (the Sun and the Moon incur no 8th-lord blemish; verse to verify)',
    status: 'provisional',
    description: 'The Sun and the Moon incur no blemish from owning the 8th house.',
  },
  // --- Known conflicts kept as present-both (client questions; never applied) ------------
  {
    id: 'CRP-101',
    when: { a: 'OWN_SIGN', b: ['COMBUST'], sameSubject: true },
    outcome: 'present-both',
    adds: [],
    source: 'No cited precedence; client question Q-CRP-1',
    status: 'pending-client',
    description: 'Own sign vs combustion (golden chart: Venus in Taurus 0.4° from the Sun).',
  },
  {
    id: 'CRP-102',
    when: { a: 'EXALTED', b: ['COMBUST'], sameSubject: true },
    outcome: 'present-both',
    adds: [],
    source: 'No cited precedence; client question Q-CRP-1',
    status: 'pending-client',
    description: 'Exaltation vs combustion.',
  },
  {
    id: 'CRP-103',
    when: { a: 'SAV_ABOVE_28', b: ['LORD_IN_DUSTHANA'], sameSubject: true },
    outcome: 'present-both',
    adds: [],
    source: 'No cited precedence; client question Q-CRP-2',
    status: 'pending-client',
    description: 'High house SAV vs the house lord placed in a dusthana.',
  },
  {
    id: 'CRP-104',
    when: { a: 'SHADBALA_MEETS_REQUIRED', b: ['COMBUST'], sameSubject: true },
    outcome: 'present-both',
    adds: [],
    source: 'No cited precedence; engine Shadbala ignores combustion (audit 04 §2); client question Q-CRP-3',
    status: 'pending-client',
    description: 'Shadbala meets the BPHS requirement vs combustion.',
  },
  {
    id: 'CRP-105',
    when: { a: 'YOGAKARAKA_BY_OWNERSHIP', b: ['IN_DUSTHANA'], sameSubject: true },
    outcome: 'present-both',
    adds: [],
    source: 'No cited precedence; client question Q-CRP-4',
    status: 'pending-client',
    description: 'Yogakaraka by ownership vs placement in a dusthana (golden chart: Mars in the 12th).',
  },
];

export const CONFLICT_POLICY: ConflictPolicy = {
  id: CONFLICT_POLICY_ID,
  version: CONFLICT_POLICY_VERSION,
  rules: [...PRECEDENCE_RULES],
};

export class ConflictPolicyError extends Error {
  constructor(message: string) {
    super(`CONFLICT_POLICY_INVALID: ${message}`);
  }
}

/**
 * Structural checks: unique IDs, no rule overriding its own code, and no cycle among the
 * rules that can apply (status approved/provisional, outcome a-overrides-b). A cycle would
 * make the outcome depend on evaluation order, so it is rejected.
 */
export function validateConflictPolicy(policy: ConflictPolicy): void {
  const ids = new Set<string>();
  for (const r of policy.rules) {
    if (ids.has(r.id)) throw new ConflictPolicyError(`duplicate rule id ${r.id}`);
    ids.add(r.id);
    if (r.when.b.length === 0) throw new ConflictPolicyError(`${r.id}: empty b`);
    if (r.when.b.includes(r.when.a)) throw new ConflictPolicyError(`${r.id}: ${r.when.a} overrides itself`);
    if (!r.source.trim()) throw new ConflictPolicyError(`${r.id}: missing source`);
  }
  const edges = new Map<string, string[]>();
  for (const r of applicablePrecedenceRules(policy)) {
    edges.set(r.when.a, [...(edges.get(r.when.a) ?? []), ...r.when.b]);
  }
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (node: string, path: string[]): void => {
    const s = state.get(node);
    if (s === 'done') return;
    if (s === 'visiting') throw new ConflictPolicyError(`precedence cycle ${[...path, node].join(' > ')}`);
    state.set(node, 'visiting');
    for (const next of edges.get(node) ?? []) visit(next, [...path, node]);
    state.set(node, 'done');
  };
  for (const node of [...edges.keys()].sort()) visit(node, []);
}

/** Rules the resolver may apply: a-overrides-b with status approved or provisional. */
export function applicablePrecedenceRules(policy: ConflictPolicy): PrecedenceRule[] {
  return policy.rules.filter((r) => r.outcome === 'a-overrides-b' && r.status !== 'pending-client');
}

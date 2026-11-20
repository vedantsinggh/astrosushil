import { describe, it, expect } from 'vitest';
import {
  CONFLICT_POLICY,
  ConflictPolicyError,
  PRECEDENCE_RULES,
  applicablePrecedenceRules,
  validateConflictPolicy,
} from '../conflict/policy';
import { runConflictResolution, runConflictResolutions, toConflictInput, policyRef } from '../conflict/resolve';
import { ConflictPolicySchema } from '../schema';
import type {
  ConditionCode,
  ConflictInput,
  ConflictPolicy,
  EvidenceLink,
  PrecedenceRule,
  StrengthClass,
} from '../types';

/** Evidence link helper; fact IDs follow the registry grammar. */
const link = (code: ConditionCode, factId = `planet.venus.d1.${code.toLowerCase().replace(/_/g, '-')}`): EvidenceLink => ({
  factId,
  conditionCode: code,
  ruleId: 'INT-TEST-001',
});

const subject = (s: ConditionCode[], c: ConditionCode[], context: ConditionCode[] = []): ConflictInput => ({
  subject: 'planet.test',
  supporting: s.map((x) => link(x)),
  contradicting: c.map((x) => link(x)),
  context: context.map((x) => link(x)),
});

const rule = (id: string, a: ConditionCode, b: ConditionCode[], status: PrecedenceRule['status'] = 'approved'): PrecedenceRule => ({
  id,
  when: { a, b, sameSubject: true },
  outcome: 'a-overrides-b',
  adds: [],
  source: `test source ${id}`,
  status,
  description: `test rule ${id}`,
});

const policy = (rules: PrecedenceRule[]): ConflictPolicy => ({ id: 'TEST', version: '0.0.1', rules });

describe('conflict policy CRP (data)', () => {
  it('is schema-valid and passes structural validation', () => {
    expect(ConflictPolicySchema.parse(CONFLICT_POLICY)).toEqual(CONFLICT_POLICY);
    expect(() => validateConflictPolicy(CONFLICT_POLICY)).not.toThrow();
  });

  it('seeds exactly CRP-001..003 as applicable, provisional, cited precedence rules', () => {
    const applicable = applicablePrecedenceRules(CONFLICT_POLICY);
    expect(applicable.map((r) => r.id)).toEqual(['CRP-001', 'CRP-002', 'CRP-003']);
    for (const r of applicable) {
      expect(r.status).toBe('provisional');
      expect(r.source.length).toBeGreaterThan(10);
    }
    expect(applicable[0].when).toEqual({ a: 'NEECHA_BHANGA', b: ['DEBILITATED'], sameSubject: true });
    expect(applicable[1].when).toEqual({ a: 'LAGNA_LORD', b: ['OWNS_6TH', 'OWNS_8TH', 'OWNS_12TH'], sameSubject: true });
    expect(applicable[2].when).toEqual({ a: 'LUMINARY', b: ['OWNS_8TH'], sameSubject: true });
  });

  it('keeps every other known conflict as present-both and pending-client (never applied)', () => {
    const others = PRECEDENCE_RULES.filter((r) => !['CRP-001', 'CRP-002', 'CRP-003'].includes(r.id));
    expect(others.length).toBeGreaterThan(0);
    for (const r of others) {
      expect(r.outcome).toBe('present-both');
      expect(r.status).toBe('pending-client');
    }
  });

  it('contains no numeric weights anywhere', () => {
    const numbers: number[] = [];
    JSON.stringify(CONFLICT_POLICY, (_k, v) => {
      if (typeof v === 'number') numbers.push(v);
      return v;
    });
    expect(numbers).toEqual([]);
  });

  it('rejects duplicate IDs, self-overrides, empty b and cycles', () => {
    expect(() => validateConflictPolicy(policy([rule('CRP-901', 'COMBUST', ['OWN_SIGN']), rule('CRP-901', 'EXALTED', ['COMBUST'])]))).toThrow(
      ConflictPolicyError,
    );
    expect(() => validateConflictPolicy(policy([rule('CRP-901', 'COMBUST', ['COMBUST'])]))).toThrow(/overrides itself/);
    expect(() => validateConflictPolicy(policy([rule('CRP-901', 'COMBUST', [])]))).toThrow(/empty b/);
    expect(() =>
      validateConflictPolicy(policy([rule('CRP-901', 'COMBUST', ['OWN_SIGN']), rule('CRP-902', 'OWN_SIGN', ['COMBUST'])])),
    ).toThrow(/cycle/);
    // A cycle through a pending-client rule cannot apply, so it is allowed.
    expect(() =>
      validateConflictPolicy(
        policy([rule('CRP-901', 'COMBUST', ['OWN_SIGN']), rule('CRP-902', 'OWN_SIGN', ['COMBUST'], 'pending-client')]),
      ),
    ).not.toThrow();
    expect(() => runConflictResolution(subject([], []), policy([rule('CRP-901', 'COMBUST', ['COMBUST'])]))).toThrow();
  });
});

describe('runConflictResolution: class outcomes (CRP policy)', () => {
  const run = (s: ConditionCode[], c: ConditionCode[], ctx: ConditionCode[] = []) =>
    runConflictResolution(subject(s, c, ctx), CONFLICT_POLICY);

  it('supported: only supporting conditions', () => {
    const o = run(['OWN_SIGN', 'IN_KENDRA'], []);
    expect(o.strengthClass).toBe('supported');
    expect(o.qualification).toEqual([]);
    expect(o.resolution).toEqual({ policyId: 'CRP@1.0.0', applied: [], unresolved: [] });
    expect(o.ruleIds).toEqual([]);
  });

  it('challenged: only contradicting conditions', () => {
    const o = run([], ['COMBUST', 'IN_DUSTHANA']);
    expect(o.strengthClass).toBe('challenged');
    expect(o.qualification).toEqual([]);
    expect(o.standingContradicting.map((l) => l.conditionCode)).toEqual(['COMBUST', 'IN_DUSTHANA']);
  });

  it('neutral: no supporting or contradicting conditions (context alone does not count)', () => {
    expect(run([], []).strengthClass).toBe('neutral');
    expect(run([], [], ['RETROGRADE', 'NATURAL_BENEFIC']).strengthClass).toBe('neutral');
  });

  it('not-assessed: descriptive rule, nothing applied', () => {
    const o = runConflictResolution({ ...subject(['NEECHA_BHANGA'], ['DEBILITATED']), assess: false }, CONFLICT_POLICY);
    expect(o.strengthClass).toBe('not-assessed');
    expect(o.resolution.applied).toEqual([]);
    expect(o.overridden).toEqual([]);
    expect(o.qualification).toEqual([]);
  });

  it('mixed by default (present-both): golden Venus, own sign vs combust', () => {
    const o = run(['OWN_SIGN'], ['COMBUST'], ['RETROGRADE']);
    expect(o.strengthClass).toBe('mixed');
    expect(o.qualification).toEqual(['MIXED_INDICATORS']);
    expect(o.resolution.applied).toEqual([]);
    expect(o.resolution.unresolved).toEqual(['COMBUST', 'OWN_SIGN']);
    // CRP-101 documents this conflict but is present-both/pending-client: never applied.
    expect(o.ruleIds).toEqual([]);
  });

  it('CRP-001: neecha bhanga sets aside debility → resolved-supported, cancellation + provisional', () => {
    const o = run(['NEECHA_BHANGA'], ['DEBILITATED']);
    expect(o.strengthClass).toBe('resolved-supported');
    expect(o.resolution.applied).toEqual([
      { precedenceRuleId: 'CRP-001', overrides: 'NEECHA_BHANGA', overridden: 'DEBILITATED', source: PRECEDENCE_RULES[0].source },
    ]);
    expect(o.resolution.unresolved).toEqual([]);
    expect(o.qualification).toEqual(['PROVISIONAL_RULE', 'CANCELLATION_APPLIED']);
    expect(o.ruleIds).toEqual(['CRP-001']);
    expect(o.overridden.map((l) => l.conditionCode)).toEqual(['DEBILITATED']);
    expect(o.standingContradicting).toEqual([]);
  });

  it('CRP-001 with another unrelated contradiction → still mixed, with the precedence recorded', () => {
    const o = run(['NEECHA_BHANGA'], ['DEBILITATED', 'COMBUST']);
    expect(o.strengthClass).toBe('mixed');
    expect(o.resolution.unresolved).toEqual(['COMBUST', 'NEECHA_BHANGA']);
    expect(o.resolution.applied.map((a) => a.precedenceRuleId)).toEqual(['CRP-001']);
    expect(o.qualification).toEqual(['PROVISIONAL_RULE', 'MIXED_INDICATORS', 'CANCELLATION_APPLIED']);
  });

  it('CRP-002: the Lagna lord is not challenged by 6th, 8th or 12th ownership', () => {
    // Aries/Libra: Lagna lord owns the 8th; Taurus/Scorpio: the 6th; Aquarius: the 12th.
    for (const owns of ['OWNS_8TH', 'OWNS_6TH', 'OWNS_12TH'] as const) {
      const o = run(['LAGNA_LORD'], [owns]);
      expect(o.strengthClass).toBe('resolved-supported');
      expect(o.resolution.applied).toEqual([
        { precedenceRuleId: 'CRP-002', overrides: 'LAGNA_LORD', overridden: owns, source: PRECEDENCE_RULES[1].source },
      ]);
      expect(o.qualification).toEqual(['PROVISIONAL_RULE']);
    }
  });

  it('CRP-002 does not cover 3rd/11th ownership', () => {
    const o = run(['LAGNA_LORD'], ['OWNS_11TH']);
    expect(o.strengthClass).toBe('mixed');
    expect(o.resolution.applied).toEqual([]);
  });

  it('CRP-003: a luminary (context) incurs no 8th-lord blemish', () => {
    // Capricorn Lagna: the Sun owns only the 8th → nothing left standing → neutral, with the resolution recorded.
    const sun = run([], ['OWNS_8TH'], ['LUMINARY']);
    expect(sun.strengthClass).toBe('neutral');
    expect(sun.resolution.applied.map((a) => [a.precedenceRuleId, a.overrides, a.overridden])).toEqual([
      ['CRP-003', 'LUMINARY', 'OWNS_8TH'],
    ]);
    expect(sun.qualification).toEqual(['PROVISIONAL_RULE']);
    // With a supporting placement the class settles to support.
    expect(run(['IN_KENDRA'], ['OWNS_8TH'], ['LUMINARY']).strengthClass).toBe('resolved-supported');
    // The exemption is for the 8th only.
    expect(run([], ['OWNS_6TH'], ['LUMINARY']).strengthClass).toBe('challenged');
    // Without the luminary context the 8th ownership stands.
    expect(run([], ['OWNS_8TH']).strengthClass).toBe('challenged');
  });

  it('an overriding code on the same side does nothing', () => {
    const o = run([], ['DEBILITATED', 'NEECHA_BHANGA']);
    expect(o.strengthClass).toBe('challenged');
    expect(o.resolution.applied).toEqual([]);
  });
});

describe('runConflictResolution: precedence mechanics (test policies)', () => {
  it('resolved-challenged: a contradicting code overrides a supporting one (approved → no PROVISIONAL_RULE)', () => {
    const o = runConflictResolution(subject(['OWN_SIGN'], ['COMBUST']), policy([rule('CRP-901', 'COMBUST', ['OWN_SIGN'])]));
    expect(o.strengthClass).toBe('resolved-challenged');
    expect(o.qualification).toEqual([]);
    expect(o.resolution).toEqual({
      policyId: 'TEST@0.0.1',
      applied: [{ precedenceRuleId: 'CRP-901', overrides: 'COMBUST', overridden: 'OWN_SIGN', source: 'test source CRP-901' }],
      unresolved: [],
    });
  });

  it('a pending-client a-overrides-b rule is never applied', () => {
    const o = runConflictResolution(
      subject(['OWN_SIGN'], ['COMBUST']),
      policy([rule('CRP-901', 'COMBUST', ['OWN_SIGN'], 'pending-client')]),
    );
    expect(o.strengthClass).toBe('mixed');
    expect(o.resolution.applied).toEqual([]);
  });

  it('an overridden code cannot override (chain X>Y>Z), independent of rule order', () => {
    // X = EXALTED (S) overrides Y = COMBUST (C); Y would override Z = OWN_SIGN (S) but is set aside.
    const r1 = rule('CRP-901', 'EXALTED', ['COMBUST']);
    const r2 = rule('CRP-902', 'COMBUST', ['OWN_SIGN']);
    const input = subject(['EXALTED', 'OWN_SIGN'], ['COMBUST']);
    const a = runConflictResolution(input, policy([r1, r2]));
    const b = runConflictResolution(input, policy([r2, r1]));
    expect(a.strengthClass).toBe('resolved-supported');
    expect(a.standingSupporting.map((l) => l.conditionCode)).toEqual(['EXALTED', 'OWN_SIGN']);
    expect(a.resolution.applied.map((x) => x.precedenceRuleId)).toEqual(['CRP-901']);
    expect({ ...b, resolution: { ...b.resolution, policyId: 'x' } }).toEqual({
      ...a,
      resolution: { ...a.resolution, policyId: 'x' },
    });
  });

  it('several codes overridden by one rule are all recorded, sorted', () => {
    const o = runConflictResolution(
      subject(['LAGNA_LORD'], ['OWNS_12TH', 'OWNS_6TH']),
      CONFLICT_POLICY,
    );
    expect(o.strengthClass).toBe('resolved-supported');
    expect(o.resolution.applied.map((a) => a.overridden)).toEqual(['OWNS_12TH', 'OWNS_6TH']);
    expect(o.ruleIds).toEqual(['CRP-002']);
    expect(o.sources).toEqual([PRECEDENCE_RULES[1].source]);
  });
});

describe('runConflictResolution: determinism and helpers', () => {
  it('same input → same output; link order does not change class, resolution or qualification', () => {
    const input = subject(['NEECHA_BHANGA', 'IN_KENDRA'], ['DEBILITATED', 'COMBUST'], ['RETROGRADE']);
    const reversed: ConflictInput = {
      ...input,
      supporting: [...input.supporting].reverse(),
      contradicting: [...input.contradicting].reverse(),
    };
    const a = runConflictResolution(input, CONFLICT_POLICY);
    expect(runConflictResolution(input, CONFLICT_POLICY)).toEqual(a);
    const b = runConflictResolution(reversed, CONFLICT_POLICY);
    expect(b.strengthClass).toBe(a.strengthClass);
    expect(b.resolution).toEqual(a.resolution);
    expect(b.qualification).toEqual(a.qualification);
    expect(b.ruleIds).toEqual(a.ruleIds);
  });

  it('does not mutate its input', () => {
    const input = subject(['NEECHA_BHANGA'], ['DEBILITATED']);
    const copy = JSON.parse(JSON.stringify(input));
    runConflictResolution(input, CONFLICT_POLICY);
    expect(input).toEqual(copy);
  });

  it('toConflictInput splits stage conditions by direction', () => {
    const ci = toConflictInput('planet.mars', [
      { factId: 'planet.mars.d1.house', conditionCode: 'IN_DUSTHANA', ruleId: 'R-1', direction: 'challenges' },
      { factId: 'planet.mars.d1.lordship', conditionCode: 'YOGAKARAKA_BY_OWNERSHIP', ruleId: 'R-2', direction: 'supports' },
      { factId: 'planet.mars.d1.retrograde', conditionCode: 'RETROGRADE', ruleId: 'R-3', direction: 'context' },
    ]);
    expect(ci).toEqual({
      subject: 'planet.mars',
      supporting: [{ factId: 'planet.mars.d1.lordship', conditionCode: 'YOGAKARAKA_BY_OWNERSHIP', ruleId: 'R-2' }],
      contradicting: [{ factId: 'planet.mars.d1.house', conditionCode: 'IN_DUSTHANA', ruleId: 'R-1' }],
      context: [{ factId: 'planet.mars.d1.retrograde', conditionCode: 'RETROGRADE', ruleId: 'R-3' }],
      assess: true,
    });
    // Golden Mars: Yogakaraka by ownership vs 12th house → mixed (CRP-105 is present-both).
    expect(runConflictResolution(ci, CONFLICT_POLICY).strengthClass).toBe('mixed');
  });

  it('runConflictResolutions keeps input order; policyRef formats id@version', () => {
    const out = runConflictResolutions([subject(['OWN_SIGN'], []), subject([], ['COMBUST'])], CONFLICT_POLICY);
    expect(out.map((o) => o.strengthClass)).toEqual<StrengthClass[]>(['supported', 'challenged']);
    expect(policyRef(CONFLICT_POLICY)).toBe('CRP@1.0.0');
  });
});

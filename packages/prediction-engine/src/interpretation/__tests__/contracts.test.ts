import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import {
  CONDITION_CODES,
  INTERPRETATION_SCHEMA_VERSION,
  QUALIFICATION_CODES,
  STRENGTH_CLASSES,
  type InterpretationResult,
  type InterpretationRule,
  type InterpretationSet,
} from '../types';
import { InterpretationResultSchema, InterpretationRuleSchema, InterpretationSetSchema } from '../schema';
import {
  INTERPRETATION_ID_PREFIX,
  InterpretationIdError,
  REGISTRY_ID_PATTERN,
  buildInterpretationId,
  computeRulesetVersion,
  idSegment,
  isInterpretationId,
  ruleSegment,
  stableStringify,
  stageItemId,
} from '../ids';
import { InterpretationInputError, ageAt, completedYears, deriveLifeStage } from '../input';
import { CONFLICT_POLICY } from '../conflict/policy';
import * as barrel from '../../index';

const result = (over: Partial<InterpretationResult> = {}): InterpretationResult => ({
  id: 'interp.career.house-10.lord-placement',
  topic: 'career.house-10',
  question: 'Where is the 10th lord placed?',
  conclusion: { code: 'LORD_IN_DUSTHANA', text: 'The 10th lord Mars is placed in the 12th house, a dusthana.' },
  supporting: [],
  contradicting: [{ factId: 'house.10.d1.lord-house', conditionCode: 'LORD_IN_DUSTHANA', ruleId: 'INT-H-001' }],
  ruleIds: ['INT-H-001'],
  chartRefs: ['house.10.d1.lord', 'house.10.d1.lord-house'],
  strengthClass: 'challenged',
  timeRelevance: { kind: 'natal' },
  qualification: ['PROVISIONAL_CONVENTION'],
  explanation: 'The 12th house is a dusthana (BPHS).',
  provisional: false,
  sources: ['BPHS ch. 11'],
  ...over,
});

const ruleFixture = (over: Partial<InterpretationRule> = {}): InterpretationRule => ({
  id: 'INT-H-001',
  version: '1.0.0',
  stage: 'S3',
  status: 'approved',
  sources: ['BPHS ch. 11 (house categories)'],
  requiredFacts: ['house.*.d1.lord-house'],
  description: 'House lord placement category (kendra/trikona/dusthana/upachaya).',
  ...over,
});

describe('closed vocabularies (proposal §3)', () => {
  it('strength classes and qualification codes are exactly the §3 sets', () => {
    expect([...STRENGTH_CLASSES]).toEqual([
      'supported', 'challenged', 'mixed', 'resolved-supported', 'resolved-challenged', 'neutral', 'not-assessed',
    ]);
    expect([...QUALIFICATION_CODES]).toEqual([
      'BIRTH_TIME_SENSITIVE', 'PROVISIONAL_CONVENTION', 'PROVISIONAL_RULE', 'MIXED_INDICATORS',
      'CANCELLATION_APPLIED', 'PRACTITIONER_HEURISTIC',
    ]);
    expect(INTERPRETATION_SCHEMA_VERSION).toBe('1.0.0');
  });

  it('condition codes are unique UPPER_SNAKE codes', () => {
    expect(new Set(CONDITION_CODES).size).toBe(CONDITION_CODES.length);
    for (const c of CONDITION_CODES) expect(c).toMatch(/^[A-Z0-9_]+$/);
  });
});

describe('zod schemas', () => {
  it('accepts a well-formed result and set', () => {
    expect(InterpretationResultSchema.parse(result())).toEqual(result());
    const set: InterpretationSet = {
      schemaVersion: INTERPRETATION_SCHEMA_VERSION,
      rulesetVersion: 'abcdef012345',
      snapshotId: 'f'.repeat(32),
      results: [
        result(),
        result({
          id: 'interp.career.planet.venus.condition',
          topic: 'career.planet',
          strengthClass: 'mixed',
          supporting: [{ factId: 'planet.venus.d1.dignity', conditionCode: 'OWN_SIGN', ruleId: 'INT-P-001' }],
          contradicting: [{ factId: 'planet.venus.d1.combust', conditionCode: 'COMBUST', ruleId: 'INT-P-002' }],
          chartRefs: ['planet.venus.d1.dignity', 'planet.venus.d1.combust'],
          qualification: ['MIXED_INDICATORS'],
          resolution: { policyId: 'CRP@1.0.0', applied: [], unresolved: ['COMBUST', 'OWN_SIGN'] },
          timeRelevance: {
            kind: 'period',
            startIso: '2024-10-14T05:00:00.000Z',
            endIso: '2040-10-14T05:00:00.000Z',
            activatedBy: ['dasha.md.03'],
          },
        }),
      ],
      rejected: [{ ruleId: 'INT-Y-009', reason: 'pending-client' }],
    };
    expect(InterpretationSetSchema.parse(set)).toEqual(set);
  });

  it('rejects contract violations', () => {
    const bad = (r: unknown) => InterpretationResultSchema.safeParse(r).success;
    expect(bad(result({ id: 'career.house-10' }))).toBe(false); // not interp.*
    expect(bad(result({ id: 'interp.Career.House10' }))).toBe(false); // registry grammar
    expect(bad({ ...result(), weight: 0.7 })).toBe(false); // strict: no extra fields (no weights)
    expect(bad(result({ strengthClass: 'strong' as never }))).toBe(false);
    expect(bad(result({ qualification: ['VERY_STRONG' as never] }))).toBe(false);
    expect(
      bad(result({ contradicting: [{ factId: 'house.10.d1.lord-house', conditionCode: 'AFFLICTED' as never, ruleId: 'X-1' }] })),
    ).toBe(false); // closed condition codes
    expect(bad(result({ chartRefs: ['house.10.d1.lord'] }))).toBe(false); // linked fact missing from chartRefs
    expect(bad(result({ strengthClass: 'mixed', qualification: [] }))).toBe(false); // mixed needs MIXED_INDICATORS
    expect(bad(result({ qualification: ['PROVISIONAL_RULE'], provisional: false }))).toBe(false);
    expect(bad(result({ ruleIds: [] }))).toBe(false);
    expect(
      InterpretationSetSchema.safeParse({
        schemaVersion: '1.0.0', rulesetVersion: 'abcdef012345', snapshotId: 's', results: [result(), result()], rejected: [],
      }).success,
    ).toBe(false); // duplicate result IDs
    expect(
      InterpretationSetSchema.safeParse({ schemaVersion: '1.0.0', rulesetVersion: 'xyz', snapshotId: 's', results: [], rejected: [] }).success,
    ).toBe(false);
  });

  it('validates rules', () => {
    expect(InterpretationRuleSchema.parse(ruleFixture())).toEqual(ruleFixture());
    expect(InterpretationRuleSchema.safeParse(ruleFixture({ status: 'draft' as never })).success).toBe(false);
    expect(InterpretationRuleSchema.safeParse(ruleFixture({ sources: [] })).success).toBe(false); // every rule cites
    expect(InterpretationRuleSchema.safeParse(ruleFixture({ id: 'int-h-1' })).success).toBe(false);
  });
});

describe('deterministic IDs', () => {
  it('builds registry-grammar interp IDs from topic and parts', () => {
    expect(buildInterpretationId('career.house-10', 'lord-placement')).toBe('interp.career.house-10.lord-placement');
    expect(buildInterpretationId('career.yoga', 'Gaja Kesari', ruleSegment('INT-Y-001'))).toBe(
      'interp.career.yoga.gaja-kesari.int-y-001',
    );
    expect(REGISTRY_ID_PATTERN.test(buildInterpretationId('career.service-orientation'))).toBe(true);
    expect(() => buildInterpretationId('career..x')).toThrow(InterpretationIdError);
    expect(() => buildInterpretationId('career', '---')).toThrow(InterpretationIdError);
    expect(INTERPRETATION_ID_PREFIX).toBe('interp');
  });

  it('stage item IDs and helpers', () => {
    expect(stageItemId('S6', 'dasha', 'ad', 'Jupiter', 'Saturn')).toBe('s6.dasha.ad.jupiter.saturn');
    expect(() => stageItemId('S6')).toThrow(InterpretationIdError);
    expect(idSegment('  Raja Yoga (10+5) ')).toBe('raja-yoga-10-5');
    expect(isInterpretationId('interp.career.house-10')).toBe(true);
    expect(isInterpretationId('planet.venus.d1.sign')).toBe(false);
  });

  it('stableStringify sorts keys and drops undefined (same as report-engine)', () => {
    expect(stableStringify({ b: 1, a: [2, { d: undefined, c: 'x' }], e: null })).toBe('{"a":[2,{"c":"x"}],"b":1,"e":null}');
  });

  it('rulesetVersion = sha256(stableStringify({rules sorted by id, policy}))[:12] (independent recompute)', () => {
    const r1 = ruleFixture();
    const r2 = ruleFixture({ id: 'INT-C-001', stage: 'S8', status: 'provisional', requiredFacts: [] });
    const policy = { id: 'P', version: '1.0.0', rules: [] };
    // Hand-written canonical JSON (keys sorted, rules sorted by id), hashed independently.
    const canonical =
      '{"policy":{"id":"P","rules":[],"version":"1.0.0"},"rules":[' +
      '{"description":"House lord placement category (kendra/trikona/dusthana/upachaya).","id":"INT-C-001","requiredFacts":[],"sources":["BPHS ch. 11 (house categories)"],"stage":"S8","status":"provisional","version":"1.0.0"},' +
      '{"description":"House lord placement category (kendra/trikona/dusthana/upachaya).","id":"INT-H-001","requiredFacts":["house.*.d1.lord-house"],"sources":["BPHS ch. 11 (house categories)"],"stage":"S3","status":"approved","version":"1.0.0"}]}';
    const expected = createHash('sha256').update(canonical).digest('hex').slice(0, 12);
    expect(computeRulesetVersion([r1, r2], policy)).toBe(expected);
    expect(computeRulesetVersion([r2, r1], policy)).toBe(expected); // order-independent
  });

  it('rulesetVersion changes with rule status or policy, and rejects duplicate rule IDs', () => {
    const base = computeRulesetVersion([ruleFixture()], CONFLICT_POLICY);
    expect(base).toMatch(/^[0-9a-f]{12}$/);
    expect(computeRulesetVersion([ruleFixture({ status: 'provisional' })], CONFLICT_POLICY)).not.toBe(base);
    expect(computeRulesetVersion([ruleFixture()], { ...CONFLICT_POLICY, version: '1.0.1' })).not.toBe(base);
    expect(() => computeRulesetVersion([ruleFixture(), ruleFixture()], CONFLICT_POLICY)).toThrow(InterpretationIdError);
  });
});

describe('life stage (age gating input)', () => {
  const golden = { subject: { dateOfBirth: '2004-06-08' }, asOfIso: '2026-11-20T00:00:00.000Z' };

  it('golden subject is 22 on 2026-11-20 (hand-checked)', () => {
    expect(deriveLifeStage(golden)).toEqual({ ageYears: 22, birthDate: '2004-06-08', asOfDate: '2026-11-20' });
  });

  it('counts completed years around the birthday', () => {
    expect(completedYears('2004-06-08', '2026-06-07')).toBe(21);
    expect(completedYears('2004-06-08', '2026-06-08')).toBe(22);
    expect(completedYears('2004-02-29', '2005-02-28')).toBe(0);
    expect(completedYears('2004-02-29', '2005-03-01')).toBe(1);
    expect(ageAt(golden, '2064-10-14T05:00:00.000Z')).toBe(60);
  });

  it('honours an explicit lifeStage and rejects asOf before birth', () => {
    const override = { ageYears: 30, birthDate: '1990-01-01', asOfDate: '2020-01-01' };
    expect(deriveLifeStage({ ...golden, lifeStage: override })).toBe(override);
    expect(() => deriveLifeStage({ subject: { dateOfBirth: '2004-06-08' }, asOfIso: '2003-01-01T00:00:00Z' })).toThrow(
      InterpretationInputError,
    );
    expect(() => completedYears('08/06/2004', '2026-11-20')).toThrow(InterpretationInputError);
  });
});

describe('package barrel', () => {
  it('exports the interpretation contracts from @astro/prediction-engine', () => {
    expect(barrel.CONFLICT_POLICY).toBe(CONFLICT_POLICY);
    expect(typeof barrel.runConflictResolution).toBe('function');
    expect(typeof barrel.computeRulesetVersion).toBe('function');
    expect(typeof barrel.deriveLifeStage).toBe('function');
    expect(barrel.InterpretationResultSchema).toBe(InterpretationResultSchema);
  });
});

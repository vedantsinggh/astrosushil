/**
 * Report module contract.
 *
 * Every report type is a self-contained module in `platform/reports/<id>/`:
 * its definition, its deterministic blocks, any extra deterministic
 * calculations it needs (`extend`, using @astro/astrology-engine only) and the
 * evidence those calculations contribute. Shared infrastructure (snapshot,
 * core evidence, narrator, validators, renderer, QA) is never copied per report.
 */
import type { InterpretationPack } from '@astro/prediction-engine';
import { ReportDefinitionInput } from './contracts';
import { AddEvidence, EvidenceRegistry } from './evidence/evidence-registry';
import { HindiEdition, ReportLanguage } from './i18n/hindi';
import { BlockRenderer } from './render/blocks';
import { ChartSnapshot } from './snapshot/chart-snapshot';

export type ImplementationStatus =
  | 'fully-implemented-validated'
  | 'implemented-partially-validated'
  | 'partially-implemented'
  | 'not-implemented'
  | 'blocked';

export interface ExtendContext {
  snapshot: ChartSnapshot;
  partner?: ChartSnapshot;
}

export interface ReportModule {
  definition: ReportDefinitionInput;
  /** Deterministic blocks referenced by this module's `data` topics. Keys should be prefixed with the report id. */
  blocks?: Record<string, BlockRenderer>;
  /** Extra deterministic calculations (async), stored in BlockContext.ext. */
  extend?: (ctx: ExtendContext) => Promise<Record<string, unknown>>;
  /** Report-specific evidence derived from the snapshot and `extend` output. IDs should be namespaced. */
  evidence?: (add: AddEvidence, ctx: ExtendContext & { ext: Record<string, unknown>; registry: EvidenceRegistry }) => void;
  /**
   * Deterministic interpretation layer (opt-in). When present, `runInterpretation` runs after the
   * module's evidence contributor and every result is registered as `interp.*` evidence
   * (platform/interpretation/register.ts). Modules without it behave exactly as before.
   */
  interpretation?: { pack: InterpretationPack };
  /**
   * Hindi display text for this report. When present the report can be generated in Hindi
   * (`language: 'hi'`); structure, evidence and objectives are those of `definition`.
   */
  hindi?: HindiEdition;
  /**
   * Full definitions of this report in further languages, for a report whose text is built from
   * two-language specs instead of a `hindi` overlay (the numerology family: Fortune is written in
   * Hindi and supplies its English edition here). An edition must match `definition` in id, report
   * types, requirements and every topic's id, kind, block, objective and evidence; the registry
   * rejects one that does not.
   */
  editions?: Partial<Record<ReportLanguage, ReportDefinitionInput>>;
  status: ImplementationStatus;
  statusEvidence: string;
}

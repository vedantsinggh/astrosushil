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
import { HindiEdition } from './i18n/hindi';
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
  status: ImplementationStatus;
  statusEvidence: string;
}

/**
 * Report orchestrator — the end-to-end pipeline:
 *   definition → snapshot → evidence → (blocks | LLM narrative → validation)
 *   → assembly → XeLaTeX → PDF QA → manifest.
 *
 * Status is derived from what actually happened: a report is `completed` only
 * if every topic was produced and validated and the PDF passed QA.
 */
import { createHash, randomUUID } from 'crypto';
import {
  PLATFORM_VERSION,
  ReportDefinition,
  ReportManifest,
  ReportManifestSchema,
  TopicManifestEntry,
  ValidationIssue,
} from './contracts';
import { EvidenceRegistry } from './evidence/evidence-registry';
import { LlmNarrator, TopicOutcome } from './llm/narrator';
import { PROMPT_VERSION } from './llm/prompts';
import { runPdfQa } from './qa/pdf-qa';
import { ReportModule } from './module';
import { ReportRegistry, validateModule } from './registry';
import { CORE_BLOCKS } from './render/blocks';
import { assembleDocument, compileLatex, ResolvedTopic } from './render/document';
import { formatDate } from './render/latex';
import { buildChartSnapshot, SubjectInput } from './snapshot/chart-snapshot';
import { findCrossTopicRepetition } from './validation/editorial-validator';

export interface GenerateReportRequest {
  definitionId: string;
  /** Use this module instead of the registered one (for developing unregistered reports). */
  module?: ReportModule;
  subject: SubjectInput;
  /** Second native, required when the definition has requires.partner. */
  partner?: SubjectInput;
  narrator: LlmNarrator;
  /** Evaluation date for dashas/transits (defaults to today). */
  asOf?: Date;
  /** Topic IDs whose cached narrative should be discarded and regenerated. */
  regenerateTopics?: string[];
  reportId?: string;
  llmProviderLabel?: string;
  /**
   * The ReportType being fulfilled, when the definition serves several
   * (see `additionalReportTypes`). Recorded in the manifest. Defaults to the
   * definition's primary type.
   */
  reportType?: string;
  /**
   * Cancels the run between steps (sections, PDF compile). Work already
   * finished (cached topics) is kept; the run throws ReportGenerationAbortedError.
   */
  signal?: AbortSignal;
  /**
   * Progress callback (presentation only; never affects the report content).
   * Called with `phase: 'narrative'` once before the first section (0 done) and
   * again each time a narrative topic settles (cached topics count immediately),
   * then once with `phase: 'compile'` before the PDF is compiled.
   * `completedTopics` never decreases within a run. Errors thrown here are ignored.
   */
  onProgress?: (event: ReportProgressEvent) => void;
}

export interface ReportProgressEvent {
  phase: 'narrative' | 'compile';
  /** Narrative (LLM) topics settled so far: cached, generated, skipped or finally failed. */
  completedTopics: number;
  totalTopics: number;
}

export class ReportGenerationAbortedError extends Error {
  readonly code = 'GENERATION_ABORTED';
  constructor(stage: string) {
    super(`GENERATION_ABORTED: report generation was cancelled before ${stage}`);
  }
}

function throwIfAborted(signal: AbortSignal | undefined, stage: string): void {
  if (signal?.aborted) throw new ReportGenerationAbortedError(stage);
}

export interface GenerateReportResult {
  manifest: ReportManifest;
  pdf?: Buffer;
  tex: string;
}

/** Published list prices used for estimates only (USD per 1M tokens). Override via env. */
function priceBasis(): { input: number; output: number; label: string } {
  const input = Number(process.env.REPORT_LLM_PRICE_INPUT_PER_MTOK ?? 0.5);
  const output = Number(process.env.REPORT_LLM_PRICE_OUTPUT_PER_MTOK ?? 3.0);
  return { input, output, label: `Estimate at $${input}/1M input and $${output}/1M output+thinking tokens (configurable list-price assumption, not provider billing).` };
}

const FORBIDDEN_IN_PDF = [/arun pandit/i, /gemsmantra/i, /puneet/i, /lorem ipsum/i, /zero-data-leakage/i, /undefined|NaN/];

export async function generateReport(req: GenerateReportRequest): Promise<GenerateReportResult> {
  const module = req.module ?? ReportRegistry.entry(req.definitionId).module;
  const def = validateModule(module);
  const reportId = req.reportId ?? `rpt_${randomUUID()}`;
  if (def.requires.partner && !req.partner) throw new Error('SNAPSHOT_INPUT_INVALID: this report requires partner birth details');
  const reportType = req.reportType ?? def.reportType;
  if (reportType !== def.reportType && !def.additionalReportTypes.includes(reportType)) {
    throw new Error(`REPORT_TYPE_MISMATCH: definition ${def.id} does not serve ${reportType}`);
  }
  const snapOpts = {
    asOf: req.asOf, requireBirthTime: def.requires.birthTime,
    vargas: [...new Set(['D1', ...def.requires.vargas])] as typeof def.requires.vargas,
    transitYears: def.requires.transitYears,
  };
  const snapshot = await buildChartSnapshot(req.subject, snapOpts);
  const partner = def.requires.partner && req.partner ? await buildChartSnapshot(req.partner, snapOpts) : undefined;
  const ext = module.extend ? await module.extend({ snapshot, partner }) : {};
  const registry = new EvidenceRegistry(snapshot, {
    partner,
    contributors: module.evidence ? [(add, reg) => module.evidence!(add, { snapshot, partner, ext, registry: reg })] : [],
  });
  const blocks = { ...CORE_BLOCKS, ...(module.blocks ?? {}) };
  const blockCtx = { snapshot, registry, partner, ext };

  const topicEntries: TopicManifestEntry[] = [];
  const resolvedSections: Array<{ section: (typeof def.sections)[number]; topics: ResolvedTopic[] }> = [];
  const priorSummaries: string[] = [];
  const payloads: NonNullable<TopicOutcome['payload']>[] = [];

  const totalTopics = def.sections.reduce((n, s) => n + s.topics.filter((t) => t.kind === 'narrative').length, 0);
  const settledTopics = new Set<string>();
  const emitProgress = (phase: ReportProgressEvent['phase']) => {
    if (!req.onProgress) return;
    try {
      req.onProgress({ phase, completedTopics: settledTopics.size, totalTopics });
    } catch {
      // progress reporting must never break generation
    }
  };
  const settle = (topicId: string) => {
    if (settledTopics.has(topicId)) return;
    settledTopics.add(topicId);
    emitProgress('narrative');
  };
  emitProgress('narrative');

  for (const section of def.sections) {
    throwIfAborted(req.signal, `section ${section.id}`);
    const narrativeTopics = section.topics.filter((t) => t.kind === 'narrative');
    const outcomes = new Map<string, TopicOutcome>();
    if (narrativeTopics.length) {
      const ctx = {
        definition: def, registry, subjectRef: snapshot.subjectRef, topics: narrativeTopics, sectionTitle: section.title,
        priorSummaries: [...priorSummaries], onTopicSettled: settle,
      };
      if (req.regenerateTopics?.length) await req.narrator.invalidate(ctx, req.regenerateTopics);
      for (const o of await req.narrator.generateBatch(ctx)) outcomes.set(o.topic.id, o);
      // Topics that finally failed are settled too (the batch is over for them).
      for (const t of narrativeTopics) settle(t.id);
    }

    const resolved: ResolvedTopic[] = [];
    for (const topic of section.topics) {
      if (topic.kind === 'narrative') {
        const o = outcomes.get(topic.id)!;
        const ok = (o.status === 'generated' || o.status === 'cached') && o.payload;
        if (ok) {
          resolved.push({ topic, kind: 'narrative', payload: o.payload! });
          payloads.push(o.payload!);
          priorSummaries.push(`${topic.title}: ${o.payload!.lead}`);
        } else {
          resolved.push({ topic, kind: 'unavailable', reason: 'the interpretation did not pass our accuracy checks and is being regenerated.' });
        }
        const counts = o.validation
          ? {
              verified: o.validation.claims.filter((c) => c.status === 'verified').length,
              rejected: o.validation.claims.filter((c) => c.status === 'rejected').length,
              unverifiable: o.validation.claims.filter((c) => c.status === 'unverifiable').length,
            }
          : undefined;
        topicEntries.push({
          topicId: topic.id, sectionId: section.id, provenance: 'llm', status: o.status,
          provider: req.narrator.providerId, model: o.model ?? req.narrator.model, promptVersion: PROMPT_VERSION,
          cacheKey: o.cacheKey, cacheHit: o.status === 'cached', sourceGenerationId: o.sourceGenerationId,
          evidenceIds: o.evidenceIds, verifiedEvidenceIds: o.validation?.verifiedEvidenceIds ?? [],
          claimCounts: counts,
          issues: [...(o.validation?.issues ?? []), ...o.editorialIssues],
          tokens: o.status === 'cached' ? undefined : o.tokens,
          latencyMs: o.status === 'cached' ? undefined : o.latencyMs,
          attempts: o.attempts, error: o.error,
        });
      } else {
        // data, educational and editorial topics are all rendered from blocks; provenance follows the kind.
        const provenance = topic.kind === 'data' ? 'deterministic' : topic.kind === 'educational' ? 'static-educational' : 'editorial';
        const okStatus = topic.kind === 'data' ? 'deterministic' : 'static';
        try {
          const block = blocks[topic.block!](blockCtx);
          const missing = block.evidenceIds.filter((id) => !registry.has(id));
          if (missing.length) throw new Error(`Block cited unknown evidence: ${missing.join(', ')}`);
          resolved.push({ topic, kind: 'block', block });
          topicEntries.push({ topicId: topic.id, sectionId: section.id, provenance, status: okStatus, evidenceIds: block.evidenceIds, verifiedEvidenceIds: block.evidenceIds, issues: [] });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          resolved.push({ topic, kind: 'unavailable', reason: 'the required chart data is not available.' });
          topicEntries.push({ topicId: topic.id, sectionId: section.id, provenance, status: 'failed', evidenceIds: [], verifiedEvidenceIds: [], issues: [], error: message });
        }
      }
    }
    resolvedSections.push({ section, topics: resolved });
  }

  // Cross-topic repetition is reported (warning) for editorial review.
  const repetition = findCrossTopicRepetition(payloads);
  for (const rep of repetition) {
    for (const t of rep.topics) {
      topicEntries.find((e) => e.topicId === t)?.issues.push({ severity: 'warning', code: 'CROSS_TOPIC_REPETITION', message: rep.sentence.slice(0, 120) });
    }
  }

  const tex = assembleDocument({
    definition: def,
    cover: {
      clientName: req.partner && def.requires.partner ? `${req.subject.name} & ${req.partner.name}` : req.subject.name,
      dateOfBirth: formatDate(req.subject.dateOfBirth),
      timeOfBirth: req.subject.timeOfBirth,
      placeName: req.subject.placeName,
      generatedOn: formatDate(snapshot.asOfIso),
      partner: partner && req.partner
        ? { name: req.partner.name, dateOfBirth: formatDate(req.partner.dateOfBirth), timeOfBirth: req.partner.timeOfBirth, placeName: req.partner.placeName }
        : undefined,
    },
    llmProviderLabel: req.llmProviderLabel ?? 'Google Gemini',
    sections: resolvedSections,
  });

  let pdf: Buffer | undefined;
  let pdfMeta: ReportManifest['pdf'];
  let compileError: string | undefined;
  emitProgress('compile');
  throwIfAborted(req.signal, 'PDF compilation');
  try {
    pdf = (await compileLatex(tex)).pdf;
    const requiredHeadings = def.sections.map((s) => s.title.replace(/&/g, '&'));
    const qa = await runPdfQa({ pdf, requiredHeadings, forbidden: FORBIDDEN_IN_PDF, minPages: 8 });
    pdfMeta = {
      pageCount: qa.pageCount, bytes: pdf.length, sha256: createHash('sha256').update(pdf).digest('hex'),
      qaPassed: qa.passed, qaIssues: qa.issues,
    };
  } catch (err) {
    compileError = err instanceof Error ? err.message : String(err);
  }

  const live = topicEntries.filter((t) => t.provenance === 'llm' && t.status !== 'cached' && t.tokens);
  const sum = (k: 'input' | 'output' | 'thinking') => live.reduce((a, t) => a + (t.tokens?.[k] ?? 0), 0);
  const price = priceBasis();
  const inputTokens = sum('input');
  const outputTokens = sum('output');
  const thinkingTokens = sum('thinking');

  const anyFailed = topicEntries.some((t) => t.status === 'failed' || t.status === 'skipped-missing-evidence');
  const status: ReportManifest['status'] = !pdf || compileError ? 'failed' : anyFailed || !pdfMeta?.qaPassed ? 'partial' : 'completed';
  const issues: ValidationIssue[] = compileError ? [{ severity: 'error', code: 'COMPILE_FAILED', message: compileError.slice(0, 600) }] : [];

  const manifest = ReportManifestSchema.parse({
    platformVersion: PLATFORM_VERSION,
    reportId,
    subjectRef: snapshot.subjectRef,
    definitionId: def.id,
    reportType,
    specVersion: def.specVersion,
    generatedAtIso: new Date().toISOString(),
    status,
    chart: {
      snapshotId: registry.snapshotId, engineVersion: snapshot.engineVersion, conventions: snapshot.conventions,
      conventionsProvisional: snapshot.conventionsProvisional, evidenceCount: registry.size,
    },
    topics: topicEntries,
    usage: {
      liveCalls: new Set(live.map((t) => t.sourceGenerationId).filter(Boolean)).size,
      cachedCalls: topicEntries.filter((t) => t.status === 'cached').length,
      inputTokens, outputTokens, thinkingTokens,
      estimatedCostUsd: Number(((inputTokens * price.input + (outputTokens + thinkingTokens) * price.output) / 1e6).toFixed(4)),
      costBasis: price.label,
    },
    pdf: pdfMeta ?? (issues.length ? { pageCount: 0, bytes: 0, sha256: '', qaPassed: false, qaIssues: issues } : undefined),
  });
  return { manifest, pdf, tex };
}

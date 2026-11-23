/**
 * Report orchestrator — the end-to-end pipeline:
 *   definition → snapshot → evidence → (blocks | LLM narrative → validation)
 *   → assembly → XeLaTeX → PDF QA → manifest.
 *
 * Status is derived from what actually happened: a report is `completed` only
 * if every topic was produced and validated and the PDF passed QA.
 */
import { createHash, randomUUID } from 'crypto';
import { deriveLifeStage } from '@astro/prediction-engine';
import {
  PLATFORM_VERSION,
  ReportDefinition,
  ReportManifest,
  ReportManifestSchema,
  ReportTopic,
  TopicManifestEntry,
  ValidationIssue,
} from './contracts';
import { AddEvidence, EvidenceRegistry } from './evidence/evidence-registry';
import { buildInterpretationExtras, interpretationContributor, InterpretationExtras } from './interpretation/register';
import { applyTopicVariant, isInterpretationTopic } from './interpretation/scope';
import { buildTrace } from './validation/trace';
import { LlmCallRecord, LlmNarrator, TopicOutcome } from './llm/narrator';
import { PROMPT_VERSION } from './llm/prompts';
import { runPdfQa } from './qa/pdf-qa';
import { ReportModule } from './module';
import { ReportLanguage } from './i18n/hindi';
import { localizedDefinition, moduleLanguages, ReportRegistry } from './registry';
import { CORE_BLOCKS } from './render/blocks';
import { assembleDocument, compileLatex, ResolvedTopic } from './render/document';
import { planIllustrations, signForRashiIndex } from './render/illustrations';
import { dateLabel } from './render/blocks.hindi';
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
  /** Report language. Defaults to the definition's own; `REPORT_LANGUAGE_NOT_AVAILABLE` when the report has no such edition. */
  language?: ReportLanguage;
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

/**
 * Published Gemini Developer API list prices, paid tier, standard (non-batch) calls,
 * USD per 1M tokens; output includes thinking tokens. Read from
 * https://ai.google.dev/gemini-api/docs/pricing on 2026-11-23. Estimates only.
 * gemini-3.8-flash and gemini-3.6-flash are listed to double on 2027-01-01.
 */
export const MODEL_LIST_PRICES: Readonly<Record<string, { input: number; output: number }>> = {
  'gemini-3.8-flash': { input: 0.75, output: 3.75 },
  'gemini-3.6-flash': { input: 0.75, output: 3.75 },
  'gemini-3.5-flash-lite': { input: 0.3, output: 2.5 },
  'gemini-3.1-flash-lite': { input: 0.25, output: 1.5 },
};

/** Price for one model: env override (applies to every model), else list price, else undefined. */
export function priceFor(model: string): { input: number; output: number } | undefined {
  const envIn = process.env.REPORT_LLM_PRICE_INPUT_PER_MTOK;
  const envOut = process.env.REPORT_LLM_PRICE_OUTPUT_PER_MTOK;
  if (envIn !== undefined && envOut !== undefined) return { input: Number(envIn), output: Number(envOut) };
  return MODEL_LIST_PRICES[model.replace(/^models\//, '')];
}

/** Totals and per-model cost estimate for a run's provider calls (rejected attempts included). */
export function summariseUsage(calls: readonly LlmCallRecord[]) {
  type Row = { model: string; calls: number; inputTokens: number; outputTokens: number; thinkingTokens: number; estimatedCostUsd: number };
  const by = new Map<string, Row>();
  const unpriced = new Set<string>();
  for (const c of calls) {
    const row = by.get(c.model) ?? { model: c.model, calls: 0, inputTokens: 0, outputTokens: 0, thinkingTokens: 0, estimatedCostUsd: 0 };
    row.calls += 1;
    row.inputTokens += c.inputTokens;
    row.outputTokens += c.outputTokens;
    row.thinkingTokens += c.thinkingTokens;
    const price = priceFor(c.model);
    if (price) row.estimatedCostUsd += (c.inputTokens * price.input + (c.outputTokens + c.thinkingTokens) * price.output) / 1e6;
    else unpriced.add(c.model);
    by.set(c.model, row);
  }
  const byModel = [...by.values()].map((r) => ({ ...r, estimatedCostUsd: Number(r.estimatedCostUsd.toFixed(4)) }));
  const total = (k: 'inputTokens' | 'outputTokens' | 'thinkingTokens') => byModel.reduce((a, r) => a + r[k], 0);
  const priced = byModel.filter((r) => !unpriced.has(r.model)).map((r) => {
    const p = priceFor(r.model)!;
    return `${r.model} $${p.input}/$${p.output}`;
  });
  return {
    byModel,
    inputTokens: total('inputTokens'), outputTokens: total('outputTokens'), thinkingTokens: total('thinkingTokens'),
    estimatedCostUsd: Number(byModel.reduce((a, r) => a + r.estimatedCostUsd, 0).toFixed(4)),
    costBasis:
      `Estimate from list prices per 1M input / output+thinking tokens${priced.length ? ` (${priced.join('; ')})` : ''}; not provider billing.` +
      (unpriced.size ? ` No list price known for: ${[...unpriced].join(', ')} (counted as $0; set REPORT_LLM_PRICE_INPUT_PER_MTOK and REPORT_LLM_PRICE_OUTPUT_PER_MTOK).` : ''),
    firstCallAtIso: calls[0]?.atIso,
    lastCallAtIso: calls[calls.length - 1]?.atIso,
  };
}

/** Statement → evidence → interp → rule trace (proposal §5); opted-in topics with a payload only. */
function outcomeTrace(topic: ReportTopic, o: TopicOutcome, registry: EvidenceRegistry): TopicManifestEntry['trace'] {
  if (!isInterpretationTopic(topic) || !o.payload) return undefined;
  const trace = buildTrace(o.payload, registry, o.validation);
  return trace.length ? trace : undefined;
}

const FORBIDDEN_IN_PDF = [/arun pandit/i, /gemsmantra/i, /puneet/i, /lorem ipsum/i, /zero-data-leakage/i, /undefined|NaN/];

export async function generateReport(req: GenerateReportRequest): Promise<GenerateReportResult> {
  const module = req.module ?? ReportRegistry.entry(req.definitionId).module;
  const def = localizedDefinition(module, req.language);
  const reportId = req.reportId ?? `rpt_${randomUUID()}`;
  const callsBefore = req.narrator.calls.length;
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
  const contributors: Array<(add: AddEvidence, reg: EvidenceRegistry) => void> = [];
  if (module.evidence) contributors.push((add, reg) => module.evidence!(add, { snapshot, partner, ext, registry: reg }));
  // Interpretation runs after the module contributors so every chartRef it cites already exists.
  if (module.interpretation) {
    const fromExt = ext.interpretationExtras as InterpretationExtras | undefined;
    const extras = fromExt ?? await buildInterpretationExtras(snapshot, { transitYears: def.requires.transitYears });
    contributors.push(interpretationContributor({ pack: module.interpretation.pack, extras }));
  }
  const registry = new EvidenceRegistry(snapshot, { partner, contributors });
  // Life-stage topic variants (product defaults) use the native's completed age at the report date.
  const hasVariants = def.sections.some((s) => s.topics.some((t) => t.variants.length > 0));
  const nativeAge = hasVariants
    ? deriveLifeStage({ subject: { dateOfBirth: snapshot.subject.dateOfBirth }, asOfIso: snapshot.asOfIso }).ageYears
    : undefined;
  const variantOf = new Map<string, string>();
  const blocks = { ...CORE_BLOCKS, ...(module.blocks ?? {}) };
  const blockCtx = { snapshot, registry, partner, ext, lang: def.language };

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

  for (const rawSection of def.sections) {
    throwIfAborted(req.signal, `section ${rawSection.id}`);
    const section = {
      ...rawSection,
      topics: rawSection.topics.map((t) => {
        const applied = applyTopicVariant(t, nativeAge);
        if (applied.variant) variantOf.set(t.id, applied.variant);
        return applied.topic;
      }),
    };
    const narrativeTopics = section.topics.filter((t) => t.kind === 'narrative');
    const outcomes = new Map<string, TopicOutcome>();
    if (narrativeTopics.length) {
      const ctx = {
        definition: def, registry, subjectRef: snapshot.subjectRef, topics: narrativeTopics, sectionTitle: section.title,
        priorSummaries: [...priorSummaries], onTopicSettled: settle,
        interpretationResults: registry.interpretation?.set.results, priorPayloads: [...payloads],
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
          resolved.push({ topic, kind: 'unavailable', reason: def.language === 'hi' ? 'यह विवेचन हमारी सटीकता की जाँच में सफल नहीं हुआ और इसे दोबारा तैयार किया जा रहा है।' : 'the interpretation did not pass our accuracy checks and is being regenerated.' });
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
          variant: variantOf.get(topic.id), trace: outcomeTrace(topic, o, registry),
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

  /** A cover date in the report language. */
  const coverDate = (iso: string) => dateLabel(def.language, formatDate(iso));
  const tex = assembleDocument({
    definition: def,
    cover: {
      clientName: req.partner && def.requires.partner ? `${req.subject.name} & ${req.partner.name}` : req.subject.name,
      dateOfBirth: coverDate(req.subject.dateOfBirth),
      timeOfBirth: req.subject.timeOfBirth,
      placeName: req.subject.placeName,
      generatedOn: coverDate(snapshot.asOfIso),
      partner: partner && req.partner
        ? { name: req.partner.name, dateOfBirth: coverDate(req.partner.dateOfBirth), timeOfBirth: req.partner.timeOfBirth, placeName: req.partner.placeName }
        : undefined,
    },
    llmProviderLabel: req.llmProviderLabel ?? 'Google Gemini',
    sections: resolvedSections,
    // Pictures are chosen by fixed rules from titles and the native's Ascendant and Moon signs.
    // Pictures are matched on the English titles, so both editions of a report carry the same pictures.
    illustrations: planIllustrations(def.language !== 'en' && moduleLanguages(module).includes('en') ? localizedDefinition(module, 'en') : def, {
      lagna: signForRashiIndex(snapshot.natal.ascendant.rashiIndex),
      moon: signForRashiIndex(snapshot.natal.planets.find((p) => p.name === 'MOON')?.rashiIndex),
    }),
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
  const usage = summariseUsage(req.narrator.calls.slice(callsBefore));

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
    interpretation: registry.interpretation
      ? {
          schemaVersion: registry.interpretation.set.schemaVersion,
          rulesetVersion: registry.interpretation.set.rulesetVersion,
          resultCount: registry.interpretation.set.results.length,
        }
      : undefined,
    topics: topicEntries,
    usage: {
      liveCalls: new Set(live.map((t) => t.sourceGenerationId).filter(Boolean)).size,
      cachedCalls: topicEntries.filter((t) => t.status === 'cached').length,
      ...usage,
    },
    pdf: pdfMeta ?? (issues.length ? { pageCount: 0, bytes: 0, sha256: '', qaPassed: false, qaIssues: issues } : undefined),
  });
  return { manifest, pdf, tex };
}

/**
 * Test-only substitute for one platform generation run, so worker/queue tests
 * exercise delivery, fencing and retry logic without calling a paid LLM.
 * The bytes are a minimal PDF-shaped buffer, never delivered outside tests.
 */
import { vi } from 'vitest';
import { careerReportWorker } from '../../src/services/report-worker.service';

type PlatformResult = Awaited<ReturnType<typeof careerReportWorker.generatePlatformReport>>;

export function fakePlatformResult(reportType: string, status: 'completed' | 'partial' | 'failed' = 'completed'): PlatformResult {
  const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(4096, 0x20), Buffer.from('\n%%EOF\n')]);
  const manifest = {
    status,
    reportType,
    topics: status === 'completed' ? [] : [{ topicId: 'test-topic', sectionId: 'test', provenance: 'llm', status: 'failed', evidenceIds: [], verifiedEvidenceIds: [], issues: [] }],
    pdf: status === 'failed' ? undefined : { pageCount: 12, bytes: pdf.length, sha256: 'test', qaPassed: status === 'completed', qaIssues: [] },
    usage: { liveCalls: 0, cachedCalls: 0, inputTokens: 0, outputTokens: 0, thinkingTokens: 0, estimatedCostUsd: 0, costBasis: 'test' },
  };
  return { manifest, pdf: status === 'failed' ? undefined : pdf, tex: '' } as unknown as PlatformResult;
}

/** Makes every worker generation return a completed test result for the report's own type. */
export function stubPlatformGeneration(status: 'completed' | 'partial' | 'failed' = 'completed') {
  return vi
    .spyOn(careerReportWorker, 'generatePlatformReport')
    .mockImplementation(async (input) => fakePlatformResult(input.reportType, status));
}

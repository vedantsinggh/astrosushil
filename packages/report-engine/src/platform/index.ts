/** Public API of the universal report platform. */
export * from './contracts';
export * from './module';
export { ReportRegistry, MODULES, validateModule, servedReportTypes, indexReportTypes } from './registry';
export { generateReport, ReportGenerationAbortedError } from './orchestrator';
export type { GenerateReportRequest, GenerateReportResult, ReportProgressEvent } from './orchestrator';
export { LlmNarrator, DEFAULT_NARRATOR_CONFIG } from './llm/narrator';
export type { NarratorConfig } from './llm/narrator';
export { FileTopicCacheStore, InMemoryTopicCacheStore, topicCacheKey } from './llm/topic-cache';
export type { TopicCacheStore, CachedTopicEntry, TopicCacheKeyParts } from './llm/topic-cache';
export { OfflineTestProvider } from './llm/offline-test-provider';
export type { SubjectInput, ChartSnapshot } from './snapshot/chart-snapshot';
export { SnapshotInputError, businessAsOfDate } from './snapshot/chart-snapshot';

/**
 * Builds the admin "report pipeline debug" view (`GET /api/v1/admin/reports/:id`) from a report row.
 *
 * Pure: every database / storage / engine lookup is done by the caller and passed in, so the shape the
 * admin page reads (apps/admin/app/reports/[id]/page.tsx) is fixed by unit tests.
 */

export const STUCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes in a non-terminal state = STUCK

const TERMINAL_STATUSES = ['COMPLETED', 'FAILED'];

/** Worker statuses in execution order (report-worker.service.ts / report-progress.ts). */
const STATUS_ORDER = ['PENDING', 'QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING', 'COMPLETED'];

export type StageStatus = 'COMPLETED' | 'RUNNING' | 'FAILED' | 'PENDING' | 'SKIPPED';

export interface PipelineStage {
  id: string;
  key: string;
  name: string;
  status: StageStatus;
  description: string;
  details: Record<string, string | number | boolean | null>;
}

export interface DiagnosticsReportRow {
  id: string;
  userId: string;
  birthProfileId: string;
  reportType: string;
  status: string;
  stage: string | null;
  progress: number;
  reportVersion: string;
  calculationVersion: string;
  language: string;
  s3Url: string | null;
  storageKey: string | null;
  fileName: string | null;
  fileSize: number | null;
  pageCount: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  lastAttemptErrorCode: string | null;
  lastAttemptErrorMessage: string | null;
  generationFailures: number;
  executionAttempts: number;
  recoveryAttempts: number;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  failedAt: Date | null;
  lastAttemptAt: Date | null;
}

export interface DiagnosticsBirthProfile {
  id: string;
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  placeName: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
  updatedAt: Date;
}

export interface DiagnosticsInput {
  report: DiagnosticsReportRow;
  user: { id: string; email: string | null; fullName: string | null } | null;
  birthProfile: DiagnosticsBirthProfile | null;
  chartCalculated: boolean;
  /** Whether the PDF object exists in the active store (local disk in development, S3/R2 in production). */
  pdfAvailable: boolean;
  storageProvider: string;
  activeJobs: Array<{ id: string; status: string; stage: string | null; createdAt: Date }>;
  now: Date;
}

interface StageDef {
  key: string;
  name: string;
  description: string;
  /** Worker status during which this stage runs; null for checks that are not a worker status. */
  runsDuring: string | null;
}

const STAGES: StageDef[] = [
  { key: 'profile', name: 'Birth Profile', description: 'The birth profile the report is generated for exists and is readable.', runsDuring: null },
  { key: 'chart', name: 'Chart Calculation', description: 'The astrology engine calculates the birth chart (re-run live for this view).', runsDuring: 'CALCULATING' },
  { key: 'analysis', name: 'Analysis', description: 'Deterministic rules and the narrative sections of the report are produced.', runsDuring: 'ANALYZING' },
  { key: 'rendering', name: 'Rendering', description: 'Report data is bound to the document template.', runsDuring: 'RENDERING' },
  { key: 'compiling', name: 'PDF Compilation', description: 'The document is compiled into a PDF.', runsDuring: 'COMPILING' },
  { key: 'uploading', name: 'Upload', description: 'The PDF is uploaded to object storage.', runsDuring: 'UPLOADING' },
  { key: 'delivery', name: 'Storage & Delivery', description: 'The PDF is present in storage and downloadable.', runsDuring: null },
];

function metadataRecord(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? (metadata as Record<string, unknown>) : {};
}

/** Index in STATUS_ORDER of the last worker stage the report reached; -1 when unknown. */
function reachedIndex(report: DiagnosticsReportRow): number {
  if (report.status === 'FAILED') {
    return report.stage ? STATUS_ORDER.indexOf(report.stage) : -1;
  }
  return STATUS_ORDER.indexOf(report.status);
}

function workerStageStatus(def: StageDef, report: DiagnosticsReportRow, reached: number, failedIdx: number): StageStatus {
  const own = STATUS_ORDER.indexOf(def.runsDuring as string);
  if (report.status === 'FAILED') {
    if (failedIdx < 0) return 'SKIPPED';
    if (own < failedIdx) return 'COMPLETED';
    if (own === failedIdx) return 'FAILED';
    return 'SKIPPED';
  }
  if (reached > own) return 'COMPLETED';
  if (reached === own) return 'RUNNING';
  return 'PENDING';
}

export function buildReportDiagnostics(input: DiagnosticsInput) {
  const { report, user, birthProfile, chartCalculated, pdfAvailable, storageProvider, activeJobs, now } = input;
  const isFailed = report.status === 'FAILED';
  const isCompleted = report.status === 'COMPLETED';
  const isStuck = !TERMINAL_STATUSES.includes(report.status) && now.getTime() - report.createdAt.getTime() > STUCK_TIMEOUT_MS;
  const reached = reachedIndex(report);
  const meta = metadataRecord(report.metadata);

  // A failure whose stage the worker did not record is pinned to the first stage after the live checks.
  const failedIdx = isFailed ? (reached >= 0 ? reached : STATUS_ORDER.indexOf('ANALYZING')) : -1;

  const pipelineStages: PipelineStage[] = STAGES.map((def, idx) => {
    let status: StageStatus;
    let details: PipelineStage['details'] = {};

    if (def.key === 'profile') {
      status = birthProfile ? 'COMPLETED' : 'FAILED';
      details = { birthProfileId: report.birthProfileId, profileName: birthProfile?.name ?? null };
    } else if (def.key === 'chart') {
      status = !birthProfile ? 'SKIPPED' : chartCalculated ? 'COMPLETED' : 'FAILED';
      details = { liveRecalculation: chartCalculated ? 'OK' : 'FAILED', calculationVersion: report.calculationVersion };
    } else if (def.key === 'delivery') {
      status = pdfAvailable ? 'COMPLETED' : isCompleted || isFailed ? 'FAILED' : 'PENDING';
      details = {
        storageProvider,
        storageKey: report.storageKey,
        fileName: report.fileName,
        fileSize: report.fileSize,
        pageCount: report.pageCount,
        pdfAvailable,
      };
    } else {
      status = workerStageStatus(def, report, reached, failedIdx);
      details = { workerStatus: def.runsDuring };
      if (status === 'RUNNING') details.progress = report.progress;
      if (def.key === 'analysis' && typeof meta.progressDetail === 'string') details.progressDetail = meta.progressDetail;
      if (status === 'FAILED') {
        details.errorCode = report.errorCode;
        details.errorMessage = report.errorMessage;
      }
    }

    return { id: `stage-${idx + 1}`, key: def.key, name: def.name, status, description: def.description, details };
  });

  const failedStage = pipelineStages.find((s) => s.status === 'FAILED');
  const errorDiagnostics =
    isFailed || report.errorCode
      ? {
          errorCode: report.errorCode || 'UNKNOWN_ERROR',
          errorMessage: report.errorMessage || 'Report generation failed',
          failedStage: failedStage?.name ?? 'Unknown',
          failedAt: (report.failedAt ?? report.updatedAt).toISOString(),
          technicalDetails: [
            `status=${report.status} stage=${report.stage ?? 'n/a'} progress=${report.progress}`,
            `lastAttemptErrorCode=${report.lastAttemptErrorCode ?? 'n/a'}`,
            `lastAttemptErrorMessage=${report.lastAttemptErrorMessage ?? 'n/a'}`,
            `generationFailures=${report.generationFailures} executionAttempts=${report.executionAttempts} recoveryAttempts=${report.recoveryAttempts}`,
            `lastAttemptAt=${report.lastAttemptAt ? report.lastAttemptAt.toISOString() : 'n/a'}`,
          ].join('\n'),
        }
      : null;

  const timeline: Array<{ event: string; timestamp: string }> = [{ event: 'Report requested', timestamp: report.createdAt.toISOString() }];
  if (typeof meta.enqueuedAt === 'string') timeline.push({ event: 'Enqueued', timestamp: meta.enqueuedAt });
  if (report.lastAttemptAt) timeline.push({ event: 'Last worker attempt', timestamp: report.lastAttemptAt.toISOString() });
  if (report.completedAt) timeline.push({ event: 'Completed', timestamp: report.completedAt.toISOString() });
  if (report.failedAt) timeline.push({ event: 'Failed', timestamp: report.failedAt.toISOString() });
  timeline.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const endAt = report.completedAt ?? report.failedAt;

  return {
    report: {
      id: report.id,
      userId: report.userId,
      birthProfileId: report.birthProfileId,
      reportType: report.reportType,
      status: isStuck ? 'STUCK' : report.status,
      originalStatus: report.status,
      stage: report.stage,
      progress: report.progress,
      language: report.language,
      reportVersion: report.reportVersion,
      templateVersion: null as string | null,
      generatorVersion: null as string | null,
      calculationVersion: report.calculationVersion,
      s3Url: report.s3Url,
      storageKey: report.storageKey,
      fileName: report.fileName,
      fileSize: report.fileSize,
      pageCount: report.pageCount,
      errorCode: report.errorCode,
      errorMessage: report.errorMessage,
      isStuck,
      pdfAvailable,
      /** Kept for older admin builds; true when the PDF exists in the active store. */
      pdfAvailableOnDisk: pdfAvailable,
      storageProvider,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
      completedAt: report.completedAt ? report.completedAt.toISOString() : null,
      failedAt: report.failedAt ? report.failedAt.toISOString() : null,
      totalDurationMs: endAt ? endAt.getTime() - report.createdAt.getTime() : null,
    },
    user,
    birthProfileSnapshot: birthProfile
      ? {
          id: birthProfile.id,
          name: birthProfile.name,
          dateOfBirth: birthProfile.dateOfBirth,
          timeOfBirth: birthProfile.timeOfBirth,
          placeName: birthProfile.placeName,
          latitude: birthProfile.latitude,
          longitude: birthProfile.longitude,
          timezone: birthProfile.timezone,
          profileVersionAtGeneration: report.calculationVersion,
          isProfileModifiedSinceReport: birthProfile.updatedAt.getTime() > report.createdAt.getTime(),
        }
      : null,
    cacheInfo: {
      source: 'QUEUE_WORKER',
      cacheKey: `${report.userId}:${report.birthProfileId}:${report.reportType}:${report.language}`,
      serverCacheEnabled: false,
      message: 'Every report is generated by the queue worker; no server-side PDF cache is used.',
    },
    duplicateActiveJobs: {
      activeJobCount: activeJobs.length,
      jobs: activeJobs.map((j) => ({ id: j.id, status: j.status, stage: j.stage ?? j.status, createdAt: j.createdAt.toISOString() })),
    },
    errorDiagnostics,
    pipelineStages,
    timeline,
  };
}

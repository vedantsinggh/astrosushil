import { describe, expect, it } from 'vitest';
import { buildReportDiagnostics, DiagnosticsInput, DiagnosticsReportRow } from '../../src/modules/admin/report-diagnostics';

const created = new Date('2026-11-28T10:00:00.000Z');

function row(overrides: Partial<DiagnosticsReportRow> = {}): DiagnosticsReportRow {
  return {
    id: '85e99c69-9f42-49f6-a405-fce908a49e55',
    userId: 'user-1',
    birthProfileId: 'bp-1',
    reportType: 'CAREER',
    status: 'COMPLETED',
    stage: 'COMPLETED',
    progress: 100,
    reportVersion: '1.0.0',
    calculationVersion: '1.0.0',
    language: 'en',
    s3Url: null,
    storageKey: 'reports/career/r1/report.pdf',
    fileName: 'report.pdf',
    fileSize: 1234,
    pageCount: 20,
    errorCode: null,
    errorMessage: null,
    lastAttemptErrorCode: null,
    lastAttemptErrorMessage: null,
    generationFailures: 0,
    executionAttempts: 1,
    recoveryAttempts: 0,
    metadata: null,
    createdAt: created,
    updatedAt: new Date('2026-11-28T10:01:00.000Z'),
    completedAt: new Date('2026-11-28T10:01:00.000Z'),
    failedAt: null,
    lastAttemptAt: null,
    ...overrides,
  };
}

function input(overrides: Partial<DiagnosticsInput> = {}): DiagnosticsInput {
  return {
    report: row(),
    user: { id: 'user-1', email: 'u@example.com', fullName: 'U' },
    birthProfile: {
      id: 'bp-1',
      name: 'Asha',
      dateOfBirth: '1990-01-01',
      timeOfBirth: '10:00',
      placeName: 'Delhi',
      latitude: 28.6,
      longitude: 77.2,
      timezone: 'Asia/Kolkata',
      updatedAt: new Date('2026-11-01T00:00:00.000Z'),
    },
    chartCalculated: true,
    pdfAvailable: true,
    storageProvider: 'local',
    activeJobs: [],
    now: new Date('2026-11-28T10:02:00.000Z'),
    ...overrides,
  };
}

describe('buildReportDiagnostics', () => {
  it('returns every section the admin pipeline page reads', () => {
    const d = buildReportDiagnostics(input());
    expect(d.duplicateActiveJobs).toEqual({ activeJobCount: 0, jobs: [] });
    expect(d.user?.email).toBe('u@example.com');
    expect(d.birthProfileSnapshot?.name).toBe('Asha');
    expect(d.cacheInfo.serverCacheEnabled).toBe(false);
    expect(d.errorDiagnostics).toBeNull();
    expect(d.pipelineStages).toHaveLength(7);
    expect(d.pipelineStages.every((s) => s.status === 'COMPLETED')).toBe(true);
    expect(d.pipelineStages.map((s) => s.id)).toEqual(['stage-1', 'stage-2', 'stage-3', 'stage-4', 'stage-5', 'stage-6', 'stage-7']);
    expect(d.report.totalDurationMs).toBe(60_000);
    expect(d.report.pdfAvailable).toBe(true);
    expect(d.timeline[0].event).toBe('Report requested');
  });

  it('marks the running stage and later stages pending for an in-flight report', () => {
    const d = buildReportDiagnostics(input({ report: row({ status: 'RENDERING', stage: 'RENDERING', progress: 60, completedAt: null }), pdfAvailable: false }));
    const byKey = Object.fromEntries(d.pipelineStages.map((s) => [s.key, s.status]));
    expect(byKey).toEqual({
      profile: 'COMPLETED',
      chart: 'COMPLETED',
      analysis: 'COMPLETED',
      rendering: 'RUNNING',
      compiling: 'PENDING',
      uploading: 'PENDING',
      delivery: 'PENDING',
    });
    expect(d.report.totalDurationMs).toBeNull();
  });

  it('flags a non-terminal report older than five minutes as stuck', () => {
    const d = buildReportDiagnostics(input({ report: row({ status: 'ANALYZING', stage: 'ANALYZING', completedAt: null }), now: new Date('2026-11-28T10:06:00.000Z') }));
    expect(d.report.isStuck).toBe(true);
    expect(d.report.status).toBe('STUCK');
    expect(d.report.originalStatus).toBe('ANALYZING');
  });

  it('reports a failure with error diagnostics and skips later stages', () => {
    const d = buildReportDiagnostics(
      input({
        report: row({
          status: 'FAILED',
          stage: 'COMPILING',
          completedAt: null,
          failedAt: new Date('2026-11-28T10:03:00.000Z'),
          errorCode: 'PDF_COMPILE_FAILED',
          errorMessage: 'compile error',
          lastAttemptErrorMessage: 'xelatex exited 1',
        }),
        pdfAvailable: false,
      })
    );
    const byKey = Object.fromEntries(d.pipelineStages.map((s) => [s.key, s.status]));
    expect(byKey.compiling).toBe('FAILED');
    expect(byKey.rendering).toBe('COMPLETED');
    expect(byKey.uploading).toBe('SKIPPED');
    expect(byKey.delivery).toBe('FAILED');
    expect(d.errorDiagnostics?.errorCode).toBe('PDF_COMPILE_FAILED');
    expect(d.errorDiagnostics?.failedStage).toBe('PDF Compilation');
    expect(d.errorDiagnostics?.technicalDetails).toContain('xelatex exited 1');
  });

  it('counts overlapping active jobs for the same user, profile and type', () => {
    const jobs = [
      { id: 'a', status: 'QUEUED', stage: 'QUEUED', createdAt: created },
      { id: 'b', status: 'ANALYZING', stage: null, createdAt: created },
    ];
    const d = buildReportDiagnostics(input({ activeJobs: jobs }));
    expect(d.duplicateActiveJobs.activeJobCount).toBe(2);
    expect(d.duplicateActiveJobs.jobs[1].stage).toBe('ANALYZING');
  });

  it('handles a missing birth profile without throwing', () => {
    const d = buildReportDiagnostics(input({ birthProfile: null, chartCalculated: false }));
    expect(d.birthProfileSnapshot).toBeNull();
    expect(d.pipelineStages[0].status).toBe('FAILED');
    expect(d.pipelineStages[1].status).toBe('SKIPPED');
  });
});

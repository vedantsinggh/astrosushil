/**
 * The runner hands the report's language to the platform generator. The generator
 * and the LLM provider are substituted, so nothing is generated and no LLM is called.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const generateReport = vi.hoisted(() => vi.fn());

vi.mock('@astro/report-engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@astro/report-engine')>();
  return { ...actual, reportPlatform: { ...actual.reportPlatform, generateReport } };
});

vi.mock('@astro/prediction-engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@astro/prediction-engine')>();
  return { ...actual, GeminiAiProvider: class { isConfigured = true; } };
});

import { reportPlatform } from '@astro/report-engine';
import { runPlatformReport, PlatformInputError } from '../../src/services/platform-report.runner';

const profile = {
  name: 'Asha Rao', dateOfBirth: '1990-04-12', timeOfBirth: '06:30:00', latitude: 28.6139, longitude: 77.209,
  timezone: 'Asia/Kolkata', placeName: 'New Delhi',
};
const run = (language?: 'en' | 'hi') =>
  runPlatformReport({ reportId: 'rep-1', reportType: 'KUNDLI', userId: 'user-1', profile, ...(language ? { language } : {}) });

describe('platform report runner: language', () => {
  beforeEach(() => {
    generateReport.mockReset();
    generateReport.mockResolvedValue({ manifest: { status: 'completed', usage: {} } });
  });
  afterEach(() => vi.restoreAllMocks());

  it('passes the stored language to the generator', async () => {
    vi.spyOn(reportPlatform.ReportRegistry, 'languages').mockReturnValue(['en', 'hi']);
    await run('hi');
    expect(generateReport).toHaveBeenCalledTimes(1);
    expect(generateReport.mock.calls[0][0]).toMatchObject({ reportType: 'KUNDLI', reportId: 'rep-1', language: 'hi' });
  });

  it('generates in English when no language is given', async () => {
    await run();
    expect(generateReport.mock.calls[0][0].language).toBe('en');
  });

  it('stops before generation when the report has no such edition', async () => {
    vi.spyOn(reportPlatform.ReportRegistry, 'languages').mockReturnValue(['en']);
    const err = await run('hi').catch((e) => e);
    expect(err).toBeInstanceOf(PlatformInputError);
    expect(err.code).toBe('REPORT_LANGUAGE_NOT_AVAILABLE');
    expect(generateReport).not.toHaveBeenCalled();
  });

  it('maps the generator error for a missing edition to the same code', async () => {
    vi.spyOn(reportPlatform.ReportRegistry, 'languages').mockReturnValue(['en', 'hi']);
    generateReport.mockRejectedValue(new Error('REPORT_LANGUAGE_NOT_AVAILABLE: kundli is not available in hi'));
    const err = await run('hi').catch((e) => e);
    expect(err).toBeInstanceOf(PlatformInputError);
    expect(err.code).toBe('REPORT_LANGUAGE_NOT_AVAILABLE');
  });
});

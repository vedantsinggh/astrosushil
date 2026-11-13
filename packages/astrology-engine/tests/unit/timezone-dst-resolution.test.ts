import { describe, it, expect } from 'vitest';
import { normalizeBirthTime, validateBirthDetails } from '../../src/validation/birth-details.validator';
import {
  BirthDetailsValidationError,
  BirthTimeNonexistentError,
  BirthTimeAmbiguousError,
} from '../../src/errors/astrology.error';
import { ChartCalculator } from '../../src/chart/chart-calculator';
import { AstrologyConfig } from '../../src/configuration/astrology-config';

describe('Phase 2A: Timezone & DST Resolution Forensic Regression Suite', () => {
  const defaultConfig: AstrologyConfig = {
    zodiacType: 'SIDEREAL',
    ayanamsa: 'LAHIRI',
    houseSystem: 'PLACIDUS',
  };

  // 1. Control Case: Asia/Kolkata (no DST, UTC+05:30)
  it('Control: accurately normalizes Asia/Kolkata without DST shift', () => {
    const details = {
      date: { year: 1990, month: 8, day: 15 },
      time: { hour: 14, minute: 30, second: 0 },
      timezone: 'Asia/Kolkata',
      latitude: 28.6139,
      longitude: 77.209,
    };

    const normalized = normalizeBirthTime(details);
    // 14:30:00 IST = 09:00:00.000Z
    expect(normalized.utcIsoString).toBe('1990-08-15T09:00:00.000Z');
    expect(normalized.timezoneOffsetMinutes).toBe(330);
    expect(normalized.isDaylightSaving).toBe(false);
  });

  // 2. New York Winter Standard Time (EST = UTC-5)
  it('US Eastern Winter: accurately normalizes America/New_York standard time (EST = UTC-5)', () => {
    const details = {
      date: { year: 2020, month: 1, day: 15 },
      time: { hour: 12, minute: 0, second: 0 },
      timezone: 'America/New_York',
      latitude: 40.7128,
      longitude: -74.006,
    };

    const normalized = normalizeBirthTime(details);
    // 12:00:00 EST = 17:00:00.000Z
    expect(normalized.utcIsoString).toBe('2020-01-15T17:00:00.000Z');
    expect(normalized.timezoneOffsetMinutes).toBe(-300);
    expect(normalized.isDaylightSaving).toBe(false);
  });

  // 3. New York Summer Daylight Time (EDT = UTC-4)
  it('US Eastern Summer: accurately normalizes America/New_York daylight saving time (EDT = UTC-4)', () => {
    const details = {
      date: { year: 2020, month: 7, day: 15 },
      time: { hour: 12, minute: 0, second: 0 },
      timezone: 'America/New_York',
      latitude: 40.7128,
      longitude: -74.006,
    };

    const normalized = normalizeBirthTime(details);
    // 12:00:00 EDT = 16:00:00.000Z
    expect(normalized.utcIsoString).toBe('2020-07-15T16:00:00.000Z');
    expect(normalized.timezoneOffsetMinutes).toBe(-240);
    expect(normalized.isDaylightSaving).toBe(true);
  });

  // 4. Spring-Forward Valid Time After Jump (Reproduction of reported 2020-03-08 03:30 NY bug)
  it('Reported Bug Fix: 2020-03-08 03:30 America/New_York resolves to 07:30:00Z (not 08:30:00Z)', async () => {
    const details = {
      date: { year: 2020, month: 3, day: 8 },
      time: { hour: 3, minute: 30, second: 0 },
      timezone: 'America/New_York',
      latitude: 40.7128,
      longitude: -74.006,
    };

    const normalized = normalizeBirthTime(details);

    // Independent oracle check: On 2020-03-08 in New York, 02:00 jumped to 03:00 (EDT active, UTC-4).
    // Therefore local 03:30 EDT = 03:30 - (-4h) = 07:30:00Z.
    // The previous defective code returned 08:30:00Z due to circular offset lookup.
    expect(normalized.utcIsoString).toBe('2020-03-08T07:30:00.000Z');
    expect(normalized.timezoneOffsetMinutes).toBe(-240);
    expect(normalized.isDaylightSaving).toBe(true);

    // Verify resulting Ascendant against an independent ground-truth UTC calculation
    const calc = new ChartCalculator();
    const chartFromLocal = await calc.calculateChart(details, defaultConfig);

    const groundTruthUtcDetails = {
      date: { year: 2020, month: 3, day: 8 },
      time: { hour: 7, minute: 30, second: 0 },
      timezone: 'UTC',
      latitude: 40.7128,
      longitude: -74.006,
    };
    const chartFromGroundTruthUtc = await calc.calculateChart(groundTruthUtcDetails, defaultConfig);

    // Both must yield the exact same Ascendant longitude (zero difference)
    expect(chartFromLocal.ascendant.longitude).toBeCloseTo(chartFromGroundTruthUtc.ascendant.longitude, 6);
    expect(chartFromLocal.ascendant.rashiIndex).toBe(chartFromGroundTruthUtc.ascendant.rashiIndex);
    expect(chartFromLocal.ascendant.pada).toBe(chartFromGroundTruthUtc.ascendant.pada);
  });

  // 5. Spring-Forward Nonexistent Time (e.g. 2020-03-08 02:30 skipped during clock jump)
  it('Spring-Forward Gap: rejects nonexistent local time (2020-03-08 02:30 America/New_York)', async () => {
    const nonexistentDetails = {
      date: { year: 2020, month: 3, day: 8 },
      time: { hour: 2, minute: 30, second: 0 },
      timezone: 'America/New_York',
      latitude: 40.7128,
      longitude: -74.006,
    };

    // Must throw BirthTimeNonexistentError
    expect(() => normalizeBirthTime(nonexistentDetails)).toThrowError(BirthTimeNonexistentError);

    // Safeguard check: ChartCalculator must reject nonexistent times without generating a fake chart
    const calc = new ChartCalculator();
    await expect(calc.calculateChart(nonexistentDetails, defaultConfig)).rejects.toThrowError(
      BirthTimeNonexistentError
    );
  });

  // 6. Autumn Fall-Back Ambiguous Time (e.g. 2020-11-01 01:30 occurs twice)
  it('Fall-Back Ambiguity: detects ambiguous time and requires explicit disambiguation', () => {
    const ambiguousDetails = {
      date: { year: 2020, month: 11, day: 1 },
      time: { hour: 1, minute: 30, second: 0 },
      timezone: 'America/New_York',
      latitude: 40.7128,
      longitude: -74.006,
    };

    // When no disambiguation is provided, must throw BirthTimeAmbiguousError
    let caughtError: BirthTimeAmbiguousError | null = null;
    try {
      normalizeBirthTime(ambiguousDetails);
    } catch (err) {
      if (err instanceof BirthTimeAmbiguousError) {
        caughtError = err;
      }
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError!.candidates.length).toBe(2);
    expect(caughtError!.candidates[0].utcIsoString).toBe('2020-11-01T05:30:00.000Z'); // Daylight (EDT)
    expect(caughtError!.candidates[0].offsetMinutes).toBe(-240);
    expect(caughtError!.candidates[1].utcIsoString).toBe('2020-11-01T06:30:00.000Z'); // Standard (EST)
    expect(caughtError!.candidates[1].offsetMinutes).toBe(-300);

    // With explicit disambiguation 'earlier' / 'daylight'
    const daylightNormalized = normalizeBirthTime({
      ...ambiguousDetails,
      disambiguation: 'earlier',
    });
    expect(daylightNormalized.utcIsoString).toBe('2020-11-01T05:30:00.000Z');
    expect(daylightNormalized.timezoneOffsetMinutes).toBe(-240);
    expect(daylightNormalized.isDaylightSaving).toBe(true);

    // With explicit disambiguation 'later' / 'standard'
    const standardNormalized = normalizeBirthTime({
      ...ambiguousDetails,
      disambiguation: 'later',
    });
    expect(standardNormalized.utcIsoString).toBe('2020-11-01T06:30:00.000Z');
    expect(standardNormalized.timezoneOffsetMinutes).toBe(-300);
    expect(standardNormalized.isDaylightSaving).toBe(false);
  });

  // 7. UTC Timezone (zero offset)
  it('UTC: correctly processes pure UTC timezone without offset', () => {
    const details = {
      date: { year: 2021, month: 6, day: 1 },
      time: { hour: 10, minute: 15, second: 30 },
      timezone: 'UTC',
      latitude: 51.4769,
      longitude: 0.0,
    };

    const normalized = normalizeBirthTime(details);
    expect(normalized.utcIsoString).toBe('2021-06-01T10:15:30.000Z');
    expect(normalized.timezoneOffsetMinutes).toBe(0);
  });

  // 8. Historical Timezone Offset Changes (e.g., Nepal +05:45 offset)
  it('Historical / Fractional: handles 45-minute offset in Asia/Kathmandu (+05:45)', () => {
    const details = {
      date: { year: 2015, month: 4, day: 25 },
      time: { hour: 11, minute: 56, second: 0 },
      timezone: 'Asia/Kathmandu',
      latitude: 27.7172,
      longitude: 85.324,
    };

    const normalized = normalizeBirthTime(details);
    // 11:56 Nepal - 5h45m = 06:11:00 UTC
    expect(normalized.utcIsoString).toBe('2015-04-25T06:11:00.000Z');
    expect(normalized.timezoneOffsetMinutes).toBe(345); // 5 * 60 + 45 = 345
  });

  // 9. Date-Boundary Transitions (Cross-midnight local to UTC conversion)
  it('Date Boundary: correctly handles date rollover across UTC midnight', () => {
    // 01:30 in Tokyo (UTC+9) on Jan 2 is 16:30 UTC on Jan 1
    const tokyoDetails = {
      date: { year: 2022, month: 1, day: 2 },
      time: { hour: 1, minute: 30, second: 0 },
      timezone: 'Asia/Tokyo',
      latitude: 35.6762,
      longitude: 139.6503,
    };
    const tokyoNormalized = normalizeBirthTime(tokyoDetails);
    expect(tokyoNormalized.utcIsoString).toBe('2022-01-01T16:30:00.000Z');
    expect(tokyoNormalized.timezoneOffsetMinutes).toBe(540);

    // 23:30 in Honolulu (UTC-10) on Dec 31 is 09:30 UTC on Jan 1 next year
    const honoluluDetails = {
      date: { year: 2021, month: 12, day: 31 },
      time: { hour: 23, minute: 30, second: 0 },
      timezone: 'Pacific/Honolulu',
      latitude: 21.3069,
      longitude: -157.8583,
    };
    const honoluluNormalized = normalizeBirthTime(honoluluDetails);
    expect(honoluluNormalized.utcIsoString).toBe('2022-01-01T09:30:00.000Z');
    expect(honoluluNormalized.timezoneOffsetMinutes).toBe(-600);
  });

  // 10. Invalid Timezone Identifiers
  it('Validation Safeguard: rejects invalid IANA timezone strings with structured error', () => {
    const invalidDetails = {
      date: { year: 1995, month: 5, day: 10 },
      time: { hour: 10, minute: 0, second: 0 },
      timezone: 'Fake/Unknown_City',
      latitude: 20.0,
      longitude: 78.0,
    };

    expect(() => validateBirthDetails(invalidDetails)).toThrowError(BirthDetailsValidationError);
    expect(() => normalizeBirthTime(invalidDetails)).toThrowError(BirthDetailsValidationError);
  });

  // 11. Seconds Preservation
  it('Precision: preserves exact seconds in UTC ISO string and Julian Day number', () => {
    const details = {
      date: { year: 2005, month: 9, day: 20 },
      time: { hour: 8, minute: 14, second: 47 },
      timezone: 'Europe/Paris',
      latitude: 48.8566,
      longitude: 2.3522,
    };

    const normalized = normalizeBirthTime(details);
    // Paris in September is CEST (UTC+2) -> 08:14:47 CEST = 06:14:47 UTC
    expect(normalized.utcIsoString).toBe('2005-09-20T06:14:47.000Z');
    // Ensure seconds fraction is reflected in Julian Day
    const expectedJD = Date.UTC(2005, 8, 20, 6, 14, 47) / 86400000 + 2440587.5;
    expect(normalized.julianDayUT).toBeCloseTo(expectedJD, 8);
  });
});

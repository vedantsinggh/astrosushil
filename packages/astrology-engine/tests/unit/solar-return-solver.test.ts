import { describe, it, expect } from 'vitest';
import {
  SolarReturnSolver,
  normalizeAngularDelta,
  julianDayToUtcDate,
  utcDateToJulianDay,
} from '../../src/varshaphala/solar-return.solver';
import { BirthDetails } from '../../src/input/birth-details';

describe('SolarReturnSolver & Angular Math', () => {
  describe('normalizeAngularDelta (0°/360° boundary wraparound)', () => {
    it('should correctly compute short distance across 0°/360° boundary', () => {
      // 359.9° to 0.1° is +0.2° (short forward delta), NOT -359.8°
      const delta1 = normalizeAngularDelta(0.1, 359.9);
      expect(delta1).toBeCloseTo(0.2, 5);

      // 0.1° to 359.9° is -0.2° (short backward delta)
      const delta2 = normalizeAngularDelta(359.9, 0.1);
      expect(delta2).toBeCloseTo(-0.2, 5);

      // Exact match
      expect(normalizeAngularDelta(125.5, 125.5)).toBe(0);

      // Opposite (180°)
      expect(Math.abs(normalizeAngularDelta(180, 0))).toBe(180);
    });
  });

  describe('Julian Day conversions', () => {
    it('should convert J2000 epoch accurately', () => {
      const j2000 = new Date('2000-01-01T12:00:00.000Z');
      const jd = utcDateToJulianDay(j2000);
      expect(jd).toBeCloseTo(2451545.0, 4);

      const dateBack = julianDayToUtcDate(jd);
      expect(dateBack.toISOString()).toBe(j2000.toISOString());
    });
  });

  describe('Solar Return Solving', () => {
    const sampleBirthDetails: BirthDetails = {
      date: { year: 1990, month: 5, day: 15 },
      time: { hour: 14, minute: 30, second: 0 },
      latitude: 28.6139,
      longitude: 77.209,
      timezone: 'Asia/Kolkata',
      placeName: 'New Delhi, India',
    };

    it('should solve Solar Return with sub-arcsecond precision (< 1e-6 degrees error)', async () => {
      const solver = new SolarReturnSolver();
      const birthJD = utcDateToJulianDay(new Date('1990-05-15T09:00:00.000Z'));
      const sunState = await solver.getSiderealSunLongitude(birthJD);
      const natalSunLon = sunState.longitude;

      const targetYear = 2026;
      const result = await solver.solveSolarReturn(
        natalSunLon,
        birthJD,
        1990,
        targetYear,
        {
          latitude: 28.6139,
          longitude: 77.209,
          timezone: 'Asia/Kolkata',
        }
      );

      expect(result.targetYear).toBe(2026);
      expect(result.age).toBe(36);
      expect(result.angularErrorDegrees).toBeLessThan(1e-6);
      expect(result.solarReturnSunLongitude).toBeCloseTo(natalSunLon, 5);
      expect(result.solarReturnUtcIso).toBeDefined();
      expect(result.solarReturnLocalIso).toBeDefined();
      expect(result.timezone).toBe('Asia/Kolkata');
      expect(result.iterations).toBeGreaterThan(0);
      expect(result.iterations).toBeLessThan(15);
    });

    it('should solve Solar Return for leap year target', async () => {
      const solver = new SolarReturnSolver();
      const birthJD = utcDateToJulianDay(new Date('1990-05-15T09:00:00.000Z'));
      const sunState = await solver.getSiderealSunLongitude(birthJD);
      const natalSunLon = sunState.longitude;

      // Leap year 2024
      const result2024 = await solver.solveSolarReturn(
        natalSunLon,
        birthJD,
        1990,
        2024,
        {
          latitude: 28.6139,
          longitude: 77.209,
          timezone: 'Asia/Kolkata',
        }
      );

      expect(result2024.targetYear).toBe(2024);
      expect(result2024.angularErrorDegrees).toBeLessThan(1e-6);
      const returnDate = new Date(result2024.solarReturnUtcIso);
      expect(returnDate.getUTCFullYear()).toBe(2024);
      expect(returnDate.getUTCMonth()).toBe(4); // May (0-indexed 4)
    });

    it('should solve for Sun near 0° / 360° boundary (Aries/Pisces cusp)', async () => {
      const solver = new SolarReturnSolver();
      // Mid April Sun near 0° sidereal
      const testBirthJD = utcDateToJulianDay(new Date('1995-04-14T06:00:00.000Z'));
      const sunState = await solver.getSiderealSunLongitude(testBirthJD);

      const result = await solver.solveSolarReturn(
        sunState.longitude,
        testBirthJD,
        1995,
        2030,
        {
          latitude: 19.076,
          longitude: 72.8777,
          timezone: 'Asia/Kolkata',
        }
      );

      expect(result.targetYear).toBe(2030);
      expect(result.angularErrorDegrees).toBeLessThan(1e-6);
      expect(result.solarReturnSunLongitude).toBeCloseTo(sunState.longitude, 5);
    });

    it('should throw clear error when targetYear precedes birthYear', async () => {
      const solver = new SolarReturnSolver();
      await expect(
        solver.solveSolarReturn(100.0, 2450000.0, 2000, 1999, {
          latitude: 0,
          longitude: 0,
          timezone: 'UTC',
        })
      ).rejects.toThrow(/cannot precede birth year/);
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  AYANAMSA_DEFINITIONS,
  computeAyanamsa,
  computeMeanAyanamsaTT,
  generalPrecessionInLongitudeArcsec,
  UnsupportedAyanamsaError,
  resolveAyanamsaSystem,
} from '../../src/ayanamsa/ayanamsa';
import { nutationInLongitudeDegrees } from '../../src/ayanamsa/ayanamsa';
import * as Astronomy from 'astronomy-engine';
import { ChartCalculator } from '../../src/chart/chart-calculator';
import { DEFAULT_ASTROLOGY_CONFIG, CLIENT_CONFIRMATION_REQUIRED } from '../../src/configuration/astrology-config';
import { UnconfirmedMethodologyError } from '../../src/errors/astrology.error';
import { PlanetSymbol } from '../../src/planets/planet.types';
import { BENCHMARK_REFERENCE_CHARTS, REF_CHART_001_SOURCE } from '../fixtures/reference-charts';
import { referenceTrueLahiriDeg } from '../fixtures/ayanamsa-reference';

/**
 * Ayanamsa definitions (client decision ADR-017) checked against published values.
 *
 * SOURCES
 *  [IAE27] Indian Astronomical Ephemeris 2027, Positional Astronomy Centre (IMD), Kolkata,
 *          https://packolkata.imd.gov.in/download/IAE2027.zip (downloaded 2026-11-20):
 *          p. 382 mean-ayanamsa polynomial, J2000 value 23°51'25".53; p. 423 "TRUE AYANAMSA FOR
 *          5h 29m" (IST = 23:59 UT of the previous day), "True Ayanamsa = Mean Ayanamsa + nutation".
 *  [SE]    Swiss Ephemeris documentation §2.8 (https://www.astro.com/swisseph/swisseph.htm, read
 *          2026-11-20): ICRC value 23°15'00".658 on 1956-03-21 0h TT is a TRUE ayanamsa; official
 *          IAE value for 1900 = 22°27'38"; Krishnamurti No. 5 = 22.363889° on 1900-01-01;
 *          KP New (No. 45) "72-73" higher" than No. 5 with modern precession; Fagan-Bradley
 *          24°02'31".36 at 1950.0.
 *  [RAMAN] B.V. Raman, "A Manual of Hindu Astrology" §49, Examples 1-2 (archive.org item
 *          in.ernet.dli.2015.509148): 1912 -> 21°10'55", 1918 -> 21°15'57".
 *
 * TOLERANCES
 *  - IAE table / J2000 / ICRC: 0.5" (engine IAU 2000B nutation vs the IAE's full nutation;
 *    measured differences are below 0.2").
 *  - IAE 1900 value (printed to 1"): 1".
 *  - Raman's rule uses 50 1/3"/yr instead of IAU precession (~50.27"/yr) and whole years: 3".
 *  - KP New vs KSK: 72.5" +/- 2" (the IAU 2006 polynomial extrapolated to 291 CE vs Vondrák 2011).
 */

const ARCSEC = 1 / 3600;
const dms = (d: number, m: number, s: number) => d + m / 60 + s / 3600;

/** JD (UT) of a Gregorian calendar date at hh:mm UT. */
function jdUT(y: number, mo: number, d: number, hh = 0, mm = 0): number {
  return Date.UTC(y, mo - 1, d, hh, mm) / 86400000 + 2440587.5;
}

describe('Lahiri (true Chitrapaksha, ICRC) ayanamsa', () => {
  it('reproduces the ICRC definition: 23°15\'00".658 TRUE on 1956-03-21 0h TT', () => {
    const def = AYANAMSA_DEFINITIONS.LAHIRI;
    expect(def.epochJulianDayTT).toBe(2435553.5);
    expect(def.valueAtEpochIsTrue).toBe(true);
    // Evaluate at the epoch in TT: mean + nutation must give back the anchor exactly.
    const mean = computeMeanAyanamsaTT(2435553.5, 'LAHIRI');
    const a = computeAyanamsa(2435553.5 - 31.4 / 86400, 'LAHIRI'); // Delta T 1956 ~ 31.4 s
    expect(Math.abs(a.trueDegrees - dms(23, 15, 0.658))).toBeLessThan(0.05 * ARCSEC);
    expect(Math.abs(a.meanDegrees - mean)).toBeLessThan(0.05 * ARCSEC);
  });

  it('matches the IAE J2000.0 mean ayanamsa 23°51\'25".53 [IAE27 p. 382]', () => {
    expect(Math.abs(computeMeanAyanamsaTT(2451545.0, 'LAHIRI') - dms(23, 51, 25.53))).toBeLessThan(0.5 * ARCSEC);
  });

  it.each([
    // [IAE27 p. 423] true ayanamsa at 5h29m IST (= previous day 23:59 UT)
    ['2027-01-01', jdUT(2026, 12, 31, 23, 59), dms(24, 14, 13.9)],
    ['2027-05-01', jdUT(2027, 4, 30, 23, 59), dms(24, 14, 30.5)],
    ['2027-08-29', jdUT(2027, 8, 28, 23, 59), dms(24, 14, 50.4)],
    ['2027-12-27', jdUT(2027, 12, 26, 23, 59), dms(24, 15, 7.3)],
    ['2028-04-25', jdUT(2028, 4, 24, 23, 59), dms(24, 15, 23.2)],
  ])('matches the IAE 2027 true-ayanamsa table on %s within 0.5"', (_d, jd, published) => {
    expect(Math.abs(computeAyanamsa(jd, 'LAHIRI').trueDegrees - published)).toBeLessThan(0.5 * ARCSEC);
  });

  it('matches the official IAE value for 1900 (22°27\'38", mean) within 1" [SE §2.8.5]', () => {
    expect(Math.abs(computeMeanAyanamsaTT(2415020.0, 'LAHIRI') - dms(22, 27, 38))).toBeLessThan(1 * ARCSEC);
  });

  it('matches the REF_CHART_001 fixture value (1990-05-15 09:00 UT)', () => {
    const a = computeAyanamsa(REF_CHART_001_SOURCE.julianDayUT, 'LAHIRI');
    expect(Math.abs(a.trueDegrees - REF_CHART_001_SOURCE.lahiriAyanamsa)).toBeLessThan(REF_CHART_001_SOURCE.ayanamsaToleranceDeg);
    expect(Math.abs(a.meanDegrees - REF_CHART_001_SOURCE.lahiriMeanAyanamsa)).toBeLessThan(REF_CHART_001_SOURCE.ayanamsaToleranceDeg);
  });

  it('agrees with the independent IAE-formula reference every 5 years 1900-2100', () => {
    for (let y = 1900; y <= 2100; y += 5) {
      const jd = jdUT(y, 1, 1);
      expect(Math.abs(computeAyanamsa(jd).trueDegrees - referenceTrueLahiriDeg(jd)), String(y)).toBeLessThan(0.0003);
    }
  });

  it('documents the change from the pre-0.2.0 linear approximation: at most 0.013° over 1900-2100', () => {
    let maxDiff = 0;
    for (let y = 1900; y <= 2100; y += 1) {
      const jd = jdUT(y, 1, 1);
      const linear = 23.85 + (0.01396 * (jd - 2451545.0)) / 365.25;
      maxDiff = Math.max(maxDiff, Math.abs(computeAyanamsa(jd).trueDegrees - linear));
    }
    expect(maxDiff).toBeGreaterThan(0.008);
    expect(maxDiff).toBeLessThan(0.013);
  });

  it('applies the same IAU 2000B nutation as the astronomy-engine planetary frame (local copy, no cache use)', () => {
    for (const jdTT of [2415020.0, 2435553.5, 2451545.0, 2461042.5, 2488069.5]) {
      const e = Astronomy.e_tilt(Astronomy.AstroTime.FromTerrestrialTime(jdTT - 2451545.0)).dpsi / 3600;
      expect(Math.abs(nutationInLongitudeDegrees(jdTT) - e)).toBeLessThan(1e-12);
    }
  });

  it('uses the IAU 2006 precession polynomial (Capitaine et al. 2003): 5028.796195"/century at J2000', () => {
    expect(generalPrecessionInLongitudeArcsec(0)).toBe(0);
    expect(generalPrecessionInLongitudeArcsec(1)).toBeCloseTo(5028.796195 + 1.1054348 + 0.00007964 - 0.000023857 - 0.0000000383, 9);
  });
});

describe('Other selectable ayanamsas', () => {
  it.each([
    [1912, dms(21, 10, 55)],
    [1918, dms(21, 15, 57)],
  ])('Raman: %i matches "A Manual of Hindu Astrology" §49 within 3"', (year, published) => {
    expect(Math.abs(computeAyanamsa(jdUT(year, 1, 1), 'RAMAN').meanDegrees - published)).toBeLessThan(3 * ARCSEC);
  });

  it('Krishnamurti (KSK): 22.363889° on 1900-01-01 [SE §2.8.6 No. 5]', () => {
    expect(computeMeanAyanamsaTT(2415020.0, 'KRISHNAMURTI')).toBeCloseTo(22.363889, 9);
  });

  it('KP New (zero 291 CE): 72.5" +/- 2" above KSK at any date [SE §2.8.6 No. 45]', () => {
    for (const jd of [2415020.0, 2451545.0, 2469807.5]) {
      const diff = (computeMeanAyanamsaTT(jd, 'KP') - computeMeanAyanamsaTT(jd, 'KRISHNAMURTI')) * 3600;
      expect(Math.abs(diff - 72.5)).toBeLessThan(2);
    }
    // and about 4.6' below Lahiri (SE: the Krishnamurti ayanamshas are 4-6' below Lahiri)
    const belowLahiri = (computeMeanAyanamsaTT(2451545.0, 'LAHIRI') - computeMeanAyanamsaTT(2451545.0, 'KP')) * 60;
    expect(belowLahiri).toBeGreaterThan(4);
    expect(belowLahiri).toBeLessThan(5);
  });

  it('Fagan-Bradley: 24°02\'31".36 at B1950.0 [SE §2.8.2]', () => {
    expect(computeMeanAyanamsaTT(2433282.4235, 'FAGAN_BRADLEY')).toBeCloseTo(dms(24, 2, 31.36), 9);
  });

  it('every system includes the same nutation and differs from Lahiri by a constant (same precession)', () => {
    const a1 = computeAyanamsa(jdUT(1950, 6, 1), 'RAMAN');
    const b1 = computeAyanamsa(jdUT(1950, 6, 1), 'LAHIRI');
    const a2 = computeAyanamsa(jdUT(2050, 6, 1), 'RAMAN');
    const b2 = computeAyanamsa(jdUT(2050, 6, 1), 'LAHIRI');
    expect(a1.nutationInLongitudeDegrees).toBe(b1.nutationInLongitudeDegrees);
    expect(Math.abs((a1.trueDegrees - b1.trueDegrees) - (a2.trueDegrees - b2.trueDegrees))).toBeLessThan(1e-9);
  });

  it('rejects unknown systems and resolves missing ones to the default', () => {
    expect(() => computeAyanamsa(2451545, 'YUKTESHWAR' as any)).toThrow(UnsupportedAyanamsaError);
    expect(resolveAyanamsaSystem(undefined)).toBe('LAHIRI');
    expect(() => resolveAyanamsaSystem('FOO')).toThrow(UnsupportedAyanamsaError);
  });
});

describe('ChartCalculator ayanamsa option', () => {
  const fixture = BENCHMARK_REFERENCE_CHARTS[0];
  const calc = new ChartCalculator();

  it('defaults to true Lahiri when the config omits the ayanamsa, and reports it in metadata', async () => {
    const { ayanamsa: _omit, ...rest } = DEFAULT_ASTROLOGY_CONFIG;
    const withDefault = await calc.calculateChart(fixture.birthDetails, DEFAULT_ASTROLOGY_CONFIG);
    const omitted = await calc.calculateChart(fixture.birthDetails, rest as any);
    expect(withDefault.metadata.ayanamsa?.system).toBe('LAHIRI');
    expect(omitted.metadata.ayanamsa?.system).toBe('LAHIRI');
    expect(omitted.planets[PlanetSymbol.MOON].longitude).toBe(withDefault.planets[PlanetSymbol.MOON].longitude);
    expect(Math.abs(withDefault.metadata.ayanamsa!.trueDegrees - REF_CHART_001_SOURCE.lahiriAyanamsa)).toBeLessThan(0.0003);
  });

  it('shifts every longitude by the ayanamsa difference when another system is selected', async () => {
    const lahiri = await calc.calculateChart(fixture.birthDetails, DEFAULT_ASTROLOGY_CONFIG);
    const raman = await calc.calculateChart(fixture.birthDetails, { ...DEFAULT_ASTROLOGY_CONFIG, ayanamsa: 'RAMAN' });
    const delta = lahiri.metadata.ayanamsa!.trueDegrees - raman.metadata.ayanamsa!.trueDegrees;
    expect(delta).toBeGreaterThan(1.4); // Raman is ~1.43° below Lahiri in 1990
    for (const p of [PlanetSymbol.SUN, PlanetSymbol.MOON, PlanetSymbol.SATURN, PlanetSymbol.RAHU]) {
      const d = (((raman.planets[p].longitude - lahiri.planets[p].longitude) % 360) + 360) % 360;
      expect(Math.abs(d - delta), p).toBeLessThan(1e-9);
    }
    const dAsc = (((raman.ascendant!.longitude - lahiri.ascendant!.longitude) % 360) + 360) % 360;
    expect(Math.abs(dAsc - delta)).toBeLessThan(1e-9);
  });

  it('still rejects an unconfirmed ayanamsa', async () => {
    await expect(
      calc.calculateChart(fixture.birthDetails, { ...DEFAULT_ASTROLOGY_CONFIG, ayanamsa: CLIENT_CONFIRMATION_REQUIRED })
    ).rejects.toThrow(UnconfirmedMethodologyError);
  });

  it('is deterministic', async () => {
    const a = await calc.calculateChart(fixture.birthDetails, { ...DEFAULT_ASTROLOGY_CONFIG, ayanamsa: 'KP' });
    const b = await calc.calculateChart(fixture.birthDetails, { ...DEFAULT_ASTROLOGY_CONFIG, ayanamsa: 'KP' });
    expect(a.planets).toEqual(b.planets);
    expect(a.ascendant).toEqual(b.ascendant);
    expect(a.metadata.ayanamsa).toEqual(b.metadata.ayanamsa);
  });
});

import { describe, it, expect } from 'vitest';
import { ChartCalculator } from '../../src/chart/chart-calculator';
import { AstronomyEngineAdapter } from '../../src/ephemeris/astronomy-engine.adapter';
import { MockEphemerisProvider } from '../../src/ephemeris/mock-ephemeris.provider';
import { PlanetSymbol } from '../../src/planets/planet.types';
import { getRashiByLongitude } from '../../src/zodiac/rashi';
import { getNakshatraByLongitude, getPada } from '../../src/nakshatra/nakshatra';
import { normalizeBirthTime } from '../../src/validation/birth-details.validator';
import { BENCHMARK_REFERENCE_CHARTS, REF_CHART_001_SOURCE as SRC } from '../fixtures/reference-charts';

/**
 * Guards REF_CHART_001 against drifting away from the real sky.
 * Independent source: JPL Horizons + Meeus mean node + IAE true Lahiri ayanamsa (see fixture file).
 * Tolerances: tropical 0.01 deg, ayanamsa 0.0003 deg, sidereal 0.0103 deg (see REF_CHART_001_SOURCE).
 */
const fixture = BENCHMARK_REFERENCE_CHARTS[0];
const VEDIC = [
  PlanetSymbol.SUN, PlanetSymbol.MOON, PlanetSymbol.MARS, PlanetSymbol.MERCURY, PlanetSymbol.JUPITER,
  PlanetSymbol.VENUS, PlanetSymbol.SATURN, PlanetSymbol.RAHU, PlanetSymbol.KETU,
] as const;

function angDiff(a: number, b: number): number {
  return Math.abs((((a - b) % 360) + 540) % 360 - 180);
}

function sourceTropical(p: PlanetSymbol): number {
  if (p === PlanetSymbol.RAHU) return SRC.meanNodeTropical;
  if (p === PlanetSymbol.KETU) return (SRC.meanNodeTropical + 180) % 360;
  return SRC.horizonsTropical[p as keyof typeof SRC.horizonsTropical].longitude;
}


describe('REF_CHART_001 matches the independent reference source', () => {
  it('birth instant is 1990-05-15 09:00 UT (JD 2448026.875)', () => {
    const t = normalizeBirthTime(fixture.birthDetails);
    expect(t.julianDayUT).toBeCloseTo(fixture.expected.julianDayUT, 6);
    expect(fixture.expected.julianDayUT).toBe(SRC.julianDayUT);
  });

  it('every fixture sidereal longitude = Horizons/Meeus tropical - IAE Lahiri ayanamsa (true; mean for nodes)', () => {
    for (const p of VEDIC) {
      const expected = fixture.expected.planets[p];
      expect(expected, p).toBeDefined();
      const isNode = p === PlanetSymbol.RAHU || p === PlanetSymbol.KETU;
      const ayanamsa = isNode ? SRC.lahiriMeanAyanamsa : SRC.lahiriAyanamsa;
      expect(angDiff(expected.longitude, sourceTropical(p) - ayanamsa), p).toBeLessThan(1e-6);
    }
  });

  it('fixture rashi / nakshatra / pada labels are consistent with its longitudes', () => {
    for (const p of VEDIC) {
      const e = fixture.expected.planets[p];
      expect(getRashiByLongitude(e.longitude).index, p).toBe(e.rashiIndex);
      expect(getRashiByLongitude(e.longitude).sanskritName, p).toBe(e.rashiName);
      expect(getNakshatraByLongitude(e.longitude).index, p).toBe(e.nakshatraIndex);
      expect(getNakshatraByLongitude(e.longitude).name, p).toBe(e.nakshatraName);
      expect(getPada(e.longitude), p).toBe(e.pada);
    }
  });

  it('fixture retrograde flags follow the sign of the Horizons daily motion', () => {
    for (const p of VEDIC) {
      if (p === PlanetSymbol.RAHU || p === PlanetSymbol.KETU) {
        expect(fixture.expected.planets[p].isRetrograde).toBe(true);
        continue;
      }
      const motion = SRC.horizonsTropical[p as keyof typeof SRC.horizonsTropical].dailyMotion;
      expect(fixture.expected.planets[p].isRetrograde, p).toBe(motion < 0);
    }
  });

  it('astronomical sanity: Sun just past Vrishabha Sankranti, Moon waning ~6 days after Full Moon', () => {
    const sun = fixture.expected.planets[PlanetSymbol.SUN].longitude;
    expect(sun).toBeGreaterThan(30);
    expect(sun).toBeLessThan(31); // ~0.96 deg/day => Sankranti within the previous day
    const elong = (((fixture.expected.planets[PlanetSymbol.MOON].longitude - sun) % 360) + 360) % 360;
    expect(elong).toBeGreaterThan(180); // waning (Krishna paksha)
    expect(elong).toBeLessThan(260);
  });

  it(`engine tropical positions match Horizons within ${SRC.tropicalToleranceDeg} deg`, () => {
    const adapter = new AstronomyEngineAdapter();
    for (const p of VEDIC) {
      const raw = adapter.getPlanetaryPosition(p, SRC.julianDayUT);
      expect(angDiff(raw.longitude, sourceTropical(p)), p).toBeLessThan(SRC.tropicalToleranceDeg);
    }
  });

  it(`engine true Lahiri ayanamsa is within ${SRC.ayanamsaToleranceDeg} deg of the IAE value`, async () => {
    // Engine ayanamsa measured as engine tropical Sun - engine sidereal Sun (no formula duplicated here).
    const chart = await new ChartCalculator().calculateChart(fixture.birthDetails, fixture.config);
    const tropicalSun = new AstronomyEngineAdapter().getPlanetaryPosition(PlanetSymbol.SUN, SRC.julianDayUT).longitude;
    const engineAyanamsa = (((tropicalSun - chart.planets[PlanetSymbol.SUN].longitude) % 360) + 360) % 360;
    expect(Math.abs(engineAyanamsa - SRC.lahiriAyanamsa)).toBeLessThan(SRC.ayanamsaToleranceDeg);
  });

  it.each([
    ['AstronomyEngineAdapter', () => new ChartCalculator()],
    ['MockEphemerisProvider defaults', () => new ChartCalculator(new MockEphemerisProvider())],
  ])(`%s chart matches the fixture (sidereal within ${SRC.siderealToleranceDeg} deg, labels exact)`, async (_n, make) => {
    const chart = await make().calculateChart(fixture.birthDetails, fixture.config);
    for (const p of VEDIC) {
      const e = fixture.expected.planets[p];
      const got = chart.planets[p];
      expect(angDiff(got.longitude, e.longitude), p).toBeLessThan(SRC.siderealToleranceDeg);
      expect(got.rashiIndex, p).toBe(e.rashiIndex);
      expect(got.nakshatraIndex, p).toBe(e.nakshatraIndex);
      expect(got.pada, p).toBe(e.pada);
      expect(got.isRetrograde, p).toBe(e.isRetrograde);
    }
  });
});

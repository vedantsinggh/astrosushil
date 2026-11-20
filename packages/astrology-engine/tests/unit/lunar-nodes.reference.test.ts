import { describe, it, expect } from 'vitest';
import * as Astronomy from 'astronomy-engine';
import { calculateLunarNodes, meanLunarNodeLongitudeTT, trueLunarNodeLongitudeTT } from '../../src/rahu-ketu/lunar-nodes';
import { computeAyanamsa } from '../../src/ayanamsa/ayanamsa';
import { ChartCalculator } from '../../src/chart/chart-calculator';
import { DEFAULT_ASTROLOGY_CONFIG } from '../../src/configuration/astrology-config';
import { PlanetSymbol } from '../../src/planets/planet.types';
import { BENCHMARK_REFERENCE_CHARTS, REF_CHART_001_SOURCE } from '../fixtures/reference-charts';

/**
 * Lunar nodes (client decision ADR-017): MEAN node by default, TRUE (osculating) node selectable.
 *
 * MEAN NODE reference: IERS Conventions (2010) eq. 5.43, Delaunay argument F5 (Simon et al. 1994),
 *   Omega = 450160.398036" - 6962890.5431" t + 7.4722" t^2 + 0.007702" t^3 - 0.00005939" t^4,
 * an independent published expression from the Meeus eq. 47.7 the engine uses.
 * Tolerance 0.001° (the two series differ by < 1" over 1900-2100).
 *
 * TRUE NODE reference: JPL Horizons osculating elements of the Moon, fetched 2026-11-20:
 *   https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND='301'&OBJ_DATA='NO'
 *     &MAKE_EPHEM='YES'&EPHEM_TYPE='ELEMENTS'&CENTER='500@399'&REF_PLANE='ECLIPTIC'
 *     &REF_SYSTEM='J2000'&TLIST='<jd>'&TLIST_TYPE='JD'&TIME_TYPE='TDB'&OUT_UNITS='KM-S'
 * OM and IN are referred to the J2000 ecliptic; the test rotates the orbit normal to the ecliptic
 * and MEAN equinox of date (astronomy-engine frame rotations) before comparing. Tolerance 0.005°
 * (measured: <= 0.003°). Meeus' 5-term true-node correction was NOT adopted: it differs from these
 * Horizons values by up to 0.40°.
 */
const HORIZONS_OSCULATING: Array<{ jdTDB: number; IN: number; OM: number }> = [
  { jdTDB: 2415020.5, IN: 5.25157038233439, OM: 261.801846008478 },
  { jdTDB: 2433282.5, IN: 5.022704921345473, OM: 13.23683594105058 },
  { jdTDB: 2448026.875, IN: 5.046167020327196, OM: 310.4022071472151 },
  { jdTDB: 2451545.0, IN: 5.240273000309245, OM: 123.9580554371928 },
  { jdTDB: 2460676.5, IN: 5.004154175941119, OM: 0.531732989166472 },
  { jdTDB: 2488069.5, IN: 5.049304816240098, OM: 348.4205607247989 },
];

const D2R = Math.PI / 180;
const angDiff = (a: number, b: number) => Math.abs((((a - b) % 360) + 540) % 360 - 180);

/** Horizons J2000-ecliptic node -> node on the ecliptic of date, mean equinox of date (degrees). */
function horizonsNodeOfDate(jdTDB: number, inc: number, om: number): number {
  const t = Astronomy.AstroTime.FromTerrestrialTime(jdTDB - 2451545.0);
  const i = inc * D2R;
  const o = om * D2R;
  let n = new Astronomy.Vector(Math.sin(i) * Math.sin(o), -Math.sin(i) * Math.cos(o), Math.cos(i), t);
  n = Astronomy.RotateVector(Astronomy.Rotation_ECL_EQJ(), n);
  n = Astronomy.RotateVector(Astronomy.Rotation_EQJ_EQD(t), n);
  n = Astronomy.RotateVector(Astronomy.Rotation_EQD_ECT(t), n);
  const trueEquinox = Math.atan2(n.x, -n.y) / D2R;
  return ((trueEquinox - Astronomy.e_tilt(t).dpsi / 3600) % 360 + 360) % 360;
}

function iersMeanNode(jdTT: number): number {
  const t = (jdTT - 2451545.0) / 36525;
  const arcsec = 450160.398036 - 6962890.5431 * t + 7.4722 * t * t + 0.007702 * t ** 3 - 0.00005939 * t ** 4;
  return ((arcsec / 3600) % 360 + 360) % 360;
}

describe('Mean lunar node (Meeus eq. 47.7)', () => {
  it('matches the IERS 2010 / Simon et al. 1994 mean node within 0.001° every 10 years 1900-2100', () => {
    for (let y = 1900; y <= 2100; y += 10) {
      const jd = 2451545.0 + (y - 2000) * 365.25;
      expect(angDiff(meanLunarNodeLongitudeTT(jd), iersMeanNode(jd)), String(y)).toBeLessThan(0.001);
    }
  });

  it('reproduces the REF_CHART_001 hand evaluation of eq. 47.7 (311.3425338°)', () => {
    // The fixture evaluated eq. 47.7 at T = -0.0963210130 (JD 2448026.875 taken as TT).
    expect(angDiff(meanLunarNodeLongitudeTT(REF_CHART_001_SOURCE.julianDayUT), REF_CHART_001_SOURCE.meanNodeTropical)).toBeLessThan(1e-6);
  });

  it('moves retrograde at about 3.18\'/day and Ketu is opposite Rahu', () => {
    const n = calculateLunarNodes(2451545.0, 'MEAN_NODE');
    expect(n.speedLongitude).toBeCloseTo(-0.05295, 4);
    expect(angDiff(n.ketuLongitude, n.rahuLongitude + 180)).toBeLessThan(1e-9);
  });
});

describe('True (osculating) lunar node', () => {
  it.each(HORIZONS_OSCULATING)('matches the JPL Horizons osculating node at JD $jdTDB within 0.005°', ({ jdTDB, IN, OM }) => {
    expect(angDiff(trueLunarNodeLongitudeTT(jdTDB), horizonsNodeOfDate(jdTDB, IN, OM))).toBeLessThan(0.005);
  });

  it('stays within the ~1.7° envelope around the mean node and Ketu is opposite Rahu', () => {
    for (let jd = 2451545.0; jd < 2451545.0 + 400; jd += 7) {
      const t = calculateLunarNodes(jd, 'TRUE_NODE');
      const m = calculateLunarNodes(jd, 'MEAN_NODE');
      expect(angDiff(t.rahuLongitude, m.rahuLongitude)).toBeLessThan(1.8);
      expect(angDiff(t.ketuLongitude, t.rahuLongitude + 180)).toBeLessThan(1e-9);
    }
  });
});

describe('ChartCalculator node option', () => {
  const fixture = BENCHMARK_REFERENCE_CHARTS[0];
  const calc = new ChartCalculator();

  it('uses the mean node by default and reports nodeType', async () => {
    const chart = await calc.calculateChart(fixture.birthDetails, DEFAULT_ASTROLOGY_CONFIG);
    expect(chart.metadata.nodeType).toBe('MEAN_NODE');
    const mean = calculateLunarNodes(fixture.expected.julianDayUT, 'MEAN_NODE').rahuLongitude;
    const meanAyanamsa = computeAyanamsa(fixture.expected.julianDayUT).meanDegrees;
    expect(angDiff(chart.planets[PlanetSymbol.RAHU].longitude, mean - meanAyanamsa)).toBeLessThan(1e-9);
  });

  it('applies the true node when selected (sidereal = osculating node - mean ayanamsa)', async () => {
    const chart = await calc.calculateChart(fixture.birthDetails, { ...DEFAULT_ASTROLOGY_CONFIG, nodeCalculation: 'TRUE_NODE' });
    expect(chart.metadata.nodeType).toBe('TRUE_NODE');
    const nodes = calculateLunarNodes(fixture.expected.julianDayUT, 'TRUE_NODE');
    const meanAyanamsa = computeAyanamsa(fixture.expected.julianDayUT).meanDegrees;
    expect(angDiff(chart.planets[PlanetSymbol.RAHU].longitude, nodes.rahuLongitude - meanAyanamsa)).toBeLessThan(1e-9);
    expect(angDiff(chart.planets[PlanetSymbol.KETU].longitude, chart.planets[PlanetSymbol.RAHU].longitude + 180)).toBeLessThan(1e-9);
    expect(chart.planets[PlanetSymbol.RAHU].isRetrograde).toBe(nodes.speedLongitude < 0);
    // Horizons check for this same instant (JD 2448026.875): true node 310.2577°, mean 311.3425°.
    expect(angDiff(nodes.rahuLongitude, horizonsNodeOfDate(2448026.875, 5.046167020327196, 310.4022071472151))).toBeLessThan(0.005);
  });
});

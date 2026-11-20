import { describe, it, expect } from 'vitest';
import {
  calculatePlacidusCuspsTropical,
  calculateSripatiBhavas,
  calculateHouseAngles,
  houseOfLongitude,
  PlacidusUndefinedError,
  mcFromArmc,
} from '../../src/houses/house-cusps';
import { ChartCalculator } from '../../src/chart/chart-calculator';
import { ChartVariantsCalculator } from '../../src/chart/chart-variants.calculator';
import { KPCalculator } from '../../src/kp/kp-calculator';
import { DEFAULT_ASTROLOGY_CONFIG } from '../../src/configuration/astrology-config';
import { computeAyanamsa } from '../../src/ayanamsa/ayanamsa';
import { PlanetSymbol } from '../../src/planets/planet.types';
import { BENCHMARK_REFERENCE_CHARTS } from '../fixtures/reference-charts';

/**
 * House cusps (client decision ADR-017).
 *
 * PLACIDUS reference: Max Heindel, "Simplified Scientific Tables of Houses, Latitudes 25 to 60
 * Degrees North and South" (Rosicrucian Fellowship, 1919; public domain scan:
 * https://archive.org/download/Book1964LouisMacNeiceAstrology/Book_1919_%20Heindel_Simplified%20scientific%20tables%20of%20houses.pdf),
 * Placidus tables computed for the obliquity of the time (23°27'):
 *   - p. 27, Latitude 28° N, sidereal time 0h 0m 0s: 10 Ari 0, 11 Tau 5, 12 Gem 10, Asc Can 11°56', 2 Leo 5, 3 Leo 29
 *   - p. 111, Latitude 51° N, sidereal time 0h 0m 0s: 10 Ari 0, 11 Tau 9, 12 Gem 22, Asc Can 26°10', 2 Leo 12, 3 Vir 2
 *   - Introduction (worked example, Melbourne): Latitude 38°, sidereal time 16h 59m 10s:
 *     10 Sag 16, 11 Cap 8, 12 Aqu 1, Asc Pis 5°27', 2 Ari 20, 3 Tau 22
 *   - South latitude rule (Introduction): add 12h to the sidereal time and read the north table
 *     into houses 4-9, i.e. 51° S at 12h has Asc = Cap 26°10'.
 * Tolerances: intermediate cusps are printed to whole degrees by hand computation (1919), so 1°;
 * the ascendant is printed to 1', so 2'.
 *
 * SRIPATI reference: B.V. Raman, "A Manual of Hindu Astrology", ch. X, Examples 22-26 (Standard
 * Horoscope, archive.org item in.ernet.dli.2015.509148): from Lagna 294°57' and Madhya Lagna
 * (MC) 214°55' the book derives every bhava madhya and arambha sandhi to 1". Tolerance 1".
 */

const SIGN = { Ari: 0, Tau: 30, Gem: 60, Can: 90, Leo: 120, Vir: 150, Lib: 180, Sco: 210, Sag: 240, Cap: 270, Aqu: 300, Pis: 330 };
type Sign = keyof typeof SIGN;
const at = (s: Sign, d: number, m = 0) => SIGN[s] + d + m / 60;
const angDiff = (a: number, b: number) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
const dms = (d: number, m: number, s: number) => d + m / 60 + s / 3600;
const HEINDEL_OBLIQUITY = 23 + 27 / 60;

describe('Placidus cusps vs Heindel (1919) Tables of Houses', () => {
  const rows: Array<{ name: string; lat: number; stHours: number; cusps: Record<number, number>; asc: number }> = [
    {
      name: '28° N, ST 0h',
      lat: 28,
      stHours: 0,
      cusps: { 10: at('Ari', 0), 11: at('Tau', 5), 12: at('Gem', 10), 2: at('Leo', 5), 3: at('Leo', 29) },
      asc: at('Can', 11, 56),
    },
    {
      name: '51° N, ST 0h',
      lat: 51,
      stHours: 0,
      cusps: { 10: at('Ari', 0), 11: at('Tau', 9), 12: at('Gem', 22), 2: at('Leo', 12), 3: at('Vir', 2) },
      asc: at('Can', 26, 10),
    },
    {
      name: '38° N, ST 16h59m10s (worked example)',
      lat: 38,
      stHours: 16 + 59 / 60 + 10 / 3600,
      cusps: { 10: at('Sag', 16), 11: at('Cap', 8), 12: at('Aqu', 1), 2: at('Ari', 20), 3: at('Tau', 22) },
      asc: at('Pis', 5, 27),
    },
    {
      name: '51° S, ST 12h (south-latitude rule)',
      lat: -51,
      stHours: 12,
      cusps: { 10: at('Lib', 0), 11: at('Sco', 9), 12: at('Sag', 22), 2: at('Aqu', 12), 3: at('Pis', 2) },
      asc: at('Cap', 26, 10),
    },
  ];

  it.each(rows)('$name', ({ lat, stHours, cusps, asc }) => {
    const c = calculatePlacidusCuspsTropical(stHours * 15, lat, HEINDEL_OBLIQUITY);
    expect(angDiff(c[0], asc)).toBeLessThan(2 / 60);
    for (const [house, published] of Object.entries(cusps)) {
      expect(angDiff(c[Number(house) - 1], published), `cusp ${house}`).toBeLessThan(1);
    }
    // opposite cusps
    for (let h = 1; h <= 6; h++) expect(angDiff(c[h + 5], c[h - 1] + 180)).toBeLessThan(1e-9);
  });

  it('each intermediate cusp has completed exactly 1/3 or 2/3 of its own semi-arc (Placidus definition)', () => {
    const lat = 28.6139;
    const eps = 23.44;
    const armc = 123.456;
    const c = calculatePlacidusCuspsTropical(armc, lat, eps);
    const D = Math.PI / 180;
    const raDec = (lambda: number) => {
      const ra = Math.atan2(Math.sin(lambda * D) * Math.cos(eps * D), Math.cos(lambda * D)) / D;
      const dec = Math.asin(Math.sin(eps * D) * Math.sin(lambda * D)) / D;
      return { ra: ((ra % 360) + 360) % 360, dec };
    };
    const semiArc = (dec: number) => 90 + Math.asin(Math.tan(lat * D) * Math.tan(dec * D)) / D; // diurnal
    const hourAngleEast = (ra: number) => (((ra - armc) % 360) + 360) % 360; // degrees east of meridian
    // 11 and 12: east of the upper meridian by 1/3 and 2/3 of the diurnal semi-arc
    for (const [idx, frac] of [[10, 1 / 3], [11, 2 / 3]] as const) {
      const { ra, dec } = raDec(c[idx]);
      expect(Math.abs(hourAngleEast(ra) - frac * semiArc(dec))).toBeLessThan(1e-7);
    }
    // 2 and 3: below the horizon, 2/3 and 1/3 of the nocturnal semi-arc before the lower meridian
    for (const [idx, frac] of [[1, 2 / 3], [2, 1 / 3]] as const) {
      const { ra, dec } = raDec(c[idx]);
      expect(Math.abs(hourAngleEast(ra) - (180 - frac * (180 - semiArc(dec))))).toBeLessThan(1e-7);
    }
  });

  it('is undefined beyond the polar circle: clear PlacidusUndefinedError, no silent fallback', () => {
    expect(() => calculatePlacidusCuspsTropical(45, 66.0, 23.44)).not.toThrow();
    expect(() => calculatePlacidusCuspsTropical(45, 66.6, 23.44)).toThrow(PlacidusUndefinedError);
    expect(() => calculatePlacidusCuspsTropical(45, -70, 23.44)).toThrow(PlacidusUndefinedError);
    try {
      calculatePlacidusCuspsTropical(45, 69.65, 23.44); // Tromsø
    } catch (e) {
      expect((e as PlacidusUndefinedError).code).toBe('PLACIDUS_UNDEFINED_AT_LATITUDE');
      expect((e as Error).message).toContain('66.56');
    }
  });
});

describe('Sripati bhavas vs Raman, "A Manual of Hindu Astrology" Examples 22-26', () => {
  const { madhya, arambhaSandhi } = calculateSripatiBhavas(dms(294, 57, 0), dms(214, 55, 0));
  const MADHYA = [
    dms(294, 57, 0), dms(328, 16, 20), dms(1, 35, 40), dms(34, 55, 0), dms(61, 35, 40), dms(88, 16, 20),
    dms(114, 57, 0), dms(148, 16, 20), dms(181, 35, 40), dms(214, 55, 0), dms(241, 35, 40), dms(268, 16, 20),
  ];
  // Example 26 gives bhavas I-VI; "those of the rest could be obtained by adding 180°".
  const SANDHI_I_VI = [dms(281, 36, 40), dms(311, 36, 40), dms(344, 56, 0), dms(18, 15, 20), dms(48, 15, 20), dms(74, 56, 0)];
  const SANDHI = [...SANDHI_I_VI, ...SANDHI_I_VI.map((s) => (s + 180) % 360)];

  it.each(MADHYA.map((m, i) => [i + 1, m]))('bhava %i madhya', (h, m) => {
    expect(angDiff(madhya[(h as number) - 1], m as number)).toBeLessThan(1 / 3600);
  });

  it.each(SANDHI.map((s, i) => [i + 1, s]))('bhava %i arambha sandhi', (h, s) => {
    expect(angDiff(arambhaSandhi[(h as number) - 1], s as number)).toBeLessThan(1 / 3600);
  });

  it('places a point in the bhava whose sandhi interval contains it', () => {
    expect(houseOfLongitude(dms(311, 36, 30), arambhaSandhi)).toBe(1); // just before Viramasandhi of I
    expect(houseOfLongitude(dms(311, 36, 50), arambhaSandhi)).toBe(2);
    expect(houseOfLongitude(0, arambhaSandhi)).toBe(3); // 344°56' .. 18°15'20"
  });
});

describe('Engine charts use the real MC', () => {
  const fixture = BENCHMARK_REFERENCE_CHARTS[0];

  it('chart midheaven = tropical MC from the meridian - mean ayanamsa', async () => {
    const chart = await new ChartCalculator().calculateChart(fixture.birthDetails, DEFAULT_ASTROLOGY_CONFIG);
    const angles = calculateHouseAngles(fixture.expected.julianDayUT, fixture.birthDetails.latitude, fixture.birthDetails.longitude);
    expect(angDiff(angles.mcTropical, mcFromArmc(angles.armcDegrees, angles.obliquityDegrees))).toBe(0);
    const mean = computeAyanamsa(fixture.expected.julianDayUT).meanDegrees;
    expect(angDiff(chart.midheaven!.longitude, angles.mcTropical - mean)).toBeLessThan(1e-9);
  });

  it('Sripati Bhava Chalit: madhya 1 = Lagna, madhya 10 = MC, planets placed by sandhis (not whole signs)', async () => {
    const chart = await new ChartCalculator().calculateChart(fixture.birthDetails, DEFAULT_ASTROLOGY_CONFIG);
    const sripati = new ChartVariantsCalculator().calculateAllVariants(chart).bhavaSripati.chart;
    const expected = calculateSripatiBhavas(chart.ascendant!.longitude, chart.midheaven!.longitude);
    expect(angDiff(sripati.houses[0].cuspLongitude, chart.ascendant!.longitude)).toBeLessThan(1e-4);
    expect(angDiff(sripati.houses[9].cuspLongitude, chart.midheaven!.longitude)).toBeLessThan(1e-4);
    for (const h of sripati.houses) {
      expect(angDiff(h.startLongitude, expected.arambhaSandhi[h.number - 1])).toBeLessThan(1e-4);
      expect(angDiff(h.endLongitude, expected.arambhaSandhi[h.number % 12])).toBeLessThan(1e-4);
    }
    for (const p of sripati.planets) {
      expect(p.house, p.name).toBe(houseOfLongitude(p.absoluteDegree, expected.arambhaSandhi));
      expect(sripati.houses[p.house - 1].occupants).toContain(p.name);
    }
  });

  it('KP cusps are true Placidus in the chart zodiac; planets are placed between cusps', async () => {
    const chart = await new ChartCalculator().calculateChart(fixture.birthDetails, DEFAULT_ASTROLOGY_CONFIG);
    const kp = new KPCalculator().calculateKP(chart, new Date('1990-05-15T09:00:00Z'), true);
    expect(kp.cuspSystem).toBe('PLACIDUS');
    expect(kp.ayanamsaType).toBe('LAHIRI');
    expect(Math.abs(kp.ayanamsaValue - chart.metadata.ayanamsa!.trueDegrees)).toBeLessThan(1e-6);
    const angles = calculateHouseAngles(fixture.expected.julianDayUT, fixture.birthDetails.latitude, fixture.birthDetails.longitude);
    const mean = chart.metadata.ayanamsa!.meanDegrees;
    const placidus = calculatePlacidusCuspsTropical(angles.armcDegrees, fixture.birthDetails.latitude, angles.obliquityDegrees);
    kp.cusps.forEach((c, i) => expect(angDiff(c.cuspLongitude, placidus[i] - mean), `cusp ${i + 1}`).toBeLessThan(1e-4));
    expect(angDiff(kp.cusps[0].cuspLongitude, chart.ascendant!.longitude)).toBeLessThan(1e-4);
    expect(angDiff(kp.cusps[9].cuspLongitude, chart.midheaven!.longitude)).toBeLessThan(1e-4);
    const starts = kp.cusps.map((c) => c.cuspLongitude);
    for (const p of [PlanetSymbol.SUN, PlanetSymbol.MOON, PlanetSymbol.SATURN]) {
      expect(kp.planets[p].house, p).toBe(houseOfLongitude(kp.planets[p].longitude, starts));
    }
  });

  it('KP report fails clearly above the polar circle', async () => {
    const polar = { ...fixture.birthDetails, latitude: 69.65, longitude: 18.96, timezone: 'Europe/Oslo', placeName: 'Tromsø' };
    const chart = await new ChartCalculator().calculateChart(polar, DEFAULT_ASTROLOGY_CONFIG);
    expect(() => new KPCalculator().calculateKP(chart, new Date('1990-05-15T09:00:00Z'), true)).toThrow(PlacidusUndefinedError);
  });
});

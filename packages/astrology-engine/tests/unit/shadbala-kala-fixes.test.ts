/**
 * Kala Bala fixes (BPHS ch. 27, Santhanam; B.V. Raman, "Graha and Bhava Balas"):
 * Ayana Bala on the sayana longitude, Abda/Masa Bala, proportional Nathonnata, Tribhaga/Hora from
 * real sunrise/sunset, Vedic (sunrise-based) weekday, combustion exposed outside Shadbala.
 *
 * Independent expected values: calendar facts (weekdays of known dates, JDN of J2000), the traditional
 * Friday start of Kali Yuga, and closed-form arithmetic of the BPHS formulas. Values computed from the
 * engine's own sunrise (golden chart sunrise/hora/third) are INTERNAL-CONSISTENCY checks: no published
 * worked example (e.g. Raman's 16 Oct 1918 chart) has been reproduced digit-for-digit here.
 */
import { describe, it, expect } from 'vitest';
import { PlanetSymbol } from '../../src/planets/planet.types';
import { AstroChart } from '../../src/chart/astro-chart.types';
import { ChartCalculator } from '../../src/chart/chart-calculator';
import { DEFAULT_ASTROLOGY_CONFIG } from '../../src/configuration/astrology-config';
import {
  calculateAyanaBala,
  calculateNathonnathaBala,
  calculateTribhagaBala,
  calculateAbdaBala,
  calculateMasaBala,
  calculateKalaBala,
} from '../../src/strength/kala-bala';
import {
  civilDateToJdn,
  jdnWeekday,
  abdaMasaLords,
  KALI_EPOCH_JDN,
  resolveKalaTimeContext,
} from '../../src/strength/kala-time-context';
import { ShadbalaCalculator } from '../../src/strength/shadbala-calculator';
import { SHADBALA_PLANETS } from '../../src/strength/strength.types';

const GOLDEN = {
  name: 'golden',
  date: { year: 2004, month: 6, day: 8 },
  time: { hour: 8, minute: 30, second: 0 },
  timezone: 'Asia/Kolkata',
  latitude: 26.4295,
  longitude: 82.5343,
};

async function chartFor(time: { hour: number; minute: number; second: number }): Promise<AstroChart> {
  return new ChartCalculator().calculateChart({ ...GOLDEN, time }, DEFAULT_ASTROLOGY_CONFIG);
}

describe('Calendar primitives (independent)', () => {
  it('JDN and weekday', () => {
    expect(civilDateToJdn({ year: 2000, month: 1, day: 1 })).toBe(2451545); // J2000 civil day
    expect(jdnWeekday(2451545)).toBe(6); // 1 Jan 2000 = Saturday
    expect(jdnWeekday(civilDateToJdn({ year: 2004, month: 6, day: 8 }))).toBe(2); // Tuesday
    expect(jdnWeekday(civilDateToJdn({ year: 1918, month: 10, day: 16 }))).toBe(3); // Wednesday
  });

  it('Kali epoch is a Friday (traditional start of Kali Yuga)', () => {
    expect(jdnWeekday(KALI_EPOCH_JDN)).toBe(5);
  });

  it('Abda/Masa lords step by 360 mod 7 = 3 and 30 mod 7 = 2 weekdays', () => {
    expect(abdaMasaLords(0)).toEqual({ abdaLord: PlanetSymbol.VENUS, masaLord: PlanetSymbol.VENUS });
    expect(abdaMasaLords(359).abdaLord).toBe(PlanetSymbol.VENUS);
    expect(abdaMasaLords(360).abdaLord).toBe(PlanetSymbol.MOON); // Fri + 3 = Mon
    expect(abdaMasaLords(30).masaLord).toBe(PlanetSymbol.SUN); // Fri + 2 = Sun
    expect(abdaMasaLords(60).masaLord).toBe(PlanetSymbol.MARS); // Fri + 4 = Tue
  });
});

describe('Kala Bala component formulas (BPHS ch. 27)', () => {
  it('Ayana Bala uses the sayana longitude when an ayanamsa is given', () => {
    // Sayana 90° → declination = ε = 23.44° → north-strong: (24 + 23.44) / 48 × 60 = 59.3
    expect(calculateAyanaBala(PlanetSymbol.SUN, 90 - 23.9, 23.9)).toBeCloseTo(59.3, 3);
    expect(calculateAyanaBala(PlanetSymbol.SATURN, 90 - 23.9, 23.9)).toBeCloseTo(0.7, 3);
    // Sayana 0° → declination 0 → 30 for everyone
    expect(calculateAyanaBala(PlanetSymbol.JUPITER, 360 - 23.9, 23.9)).toBeCloseTo(30, 3);
    // Backward compatible: no ayanamsa → longitude treated as given
    expect(calculateAyanaBala(PlanetSymbol.SUN, 90)).toBeCloseTo(59.3, 3);
  });

  it('Nathonnata is proportional to unnata (time from midnight)', () => {
    expect(calculateNathonnathaBala(PlanetSymbol.SUN, true, 12)).toBe(60);
    expect(calculateNathonnathaBala(PlanetSymbol.MOON, true, 12)).toBe(0);
    expect(calculateNathonnathaBala(PlanetSymbol.SUN, false, 0)).toBe(0);
    expect(calculateNathonnathaBala(PlanetSymbol.SATURN, false, 0)).toBe(60);
    expect(calculateNathonnathaBala(PlanetSymbol.VENUS, true, 6)).toBe(30);
    expect(calculateNathonnathaBala(PlanetSymbol.MARS, true, 9)).toBe(15);
    expect(calculateNathonnathaBala(PlanetSymbol.MERCURY, false, 3)).toBe(60);
  });

  it('Tribhaga by explicit third: day Mercury/Sun/Saturn, night Moon/Venus/Mars, Jupiter always', () => {
    expect(calculateTribhagaBala(PlanetSymbol.MERCURY, true, 0, 0)).toBe(60);
    expect(calculateTribhagaBala(PlanetSymbol.SUN, true, 0, 1)).toBe(60);
    expect(calculateTribhagaBala(PlanetSymbol.SATURN, true, 0, 2)).toBe(60);
    expect(calculateTribhagaBala(PlanetSymbol.MOON, false, 0, 0)).toBe(60);
    expect(calculateTribhagaBala(PlanetSymbol.VENUS, false, 0, 1)).toBe(60);
    expect(calculateTribhagaBala(PlanetSymbol.MARS, false, 0, 2)).toBe(60);
    expect(calculateTribhagaBala(PlanetSymbol.MARS, true, 0, 2)).toBe(0);
    expect(calculateTribhagaBala(PlanetSymbol.JUPITER, false, 0, 1)).toBe(60);
  });

  it('Abda = 15 and Masa = 30 virupas to their lords', () => {
    expect(calculateAbdaBala(PlanetSymbol.MARS, PlanetSymbol.MARS)).toBe(15);
    expect(calculateAbdaBala(PlanetSymbol.SUN, PlanetSymbol.MARS)).toBe(0);
    expect(calculateMasaBala(PlanetSymbol.JUPITER, PlanetSymbol.JUPITER)).toBe(30);
    expect(calculateMasaBala(PlanetSymbol.SUN, PlanetSymbol.JUPITER)).toBe(0);
  });
});

describe('Sunrise-based time context, golden chart (08 Jun 2004 08:30 IST, Akbarpur)', () => {
  it('day birth on Tuesday; Ahargana from the Kali epoch', async () => {
    const ctx = resolveKalaTimeContext(await chartFor({ hour: 8, minute: 30, second: 0 }));
    expect(ctx.source).toBe('SOLAR');
    expect(ctx.isDayBirth).toBe(true);
    expect(ctx.vedicWeekday).toBe(2); // Tuesday (independent calendar fact)
    expect(ctx.ahargana).toBe(2453165 - KALI_EPOCH_JDN); // JDN of 8 Jun 2004 = 2453165
    expect(ctx.ahargana).toBe(1864699);
    // Ayanamsa: true Chitrapaksha Lahiri ≈ 23.916° for 2004.44 (calculation audit 03 §C)
    expect(ctx.ayanamsaDegrees).toBeCloseTo(23.916, 2);
    // Sunrise at Akbarpur on 8 Jun ≈ 05:06 IST (internal consistency; solar-day verified vs USNO)
    const riseIstMin = (Date.parse(ctx.sunriseIso!) / 60000 + 330) % 1440;
    expect(riseIstMin).toBeGreaterThan(4 * 60 + 55);
    expect(riseIstMin).toBeLessThan(5 * 60 + 15);
  });

  it('internal consistency: 3.4 h after sunrise → first third of the day, third hora (Mars, Sun, Venus)', async () => {
    const ctx = resolveKalaTimeContext(await chartFor({ hour: 8, minute: 30, second: 0 }));
    expect(ctx.tribhagaPart).toBe(0);
    expect(ctx.horaIndex).toBe(2);
    expect(ctx.horaLord).toBe(PlanetSymbol.VENUS);
    expect(ctx.unnataHours).toBeGreaterThan(8.3);
    expect(ctx.unnataHours).toBeLessThan(8.7);
  });

  it('a birth before sunrise belongs to the previous Vedic weekday and the last third of the night', async () => {
    const ctx = resolveKalaTimeContext(await chartFor({ hour: 4, minute: 0, second: 0 }));
    expect(ctx.isDayBirth).toBe(false);
    expect(ctx.vedicWeekday).toBe(1); // Monday, although the civil date is Tuesday
    expect(ctx.vedicDate).toEqual({ year: 2004, month: 6, day: 7 });
    expect(ctx.tribhagaPart).toBe(2);
  });

  it('Kala Bala total includes Abda and Masa; Vara follows the Vedic weekday', async () => {
    const chart = await chartFor({ hour: 8, minute: 30, second: 0 });
    const ctx = resolveKalaTimeContext(chart);
    for (const p of SHADBALA_PLANETS) {
      const k = calculateKalaBala(p, chart, ctx);
      const sum =
        k.nathonnathaBala + k.pakshaBala + k.tribhagaBala + (k.abdaBala ?? 0) + (k.masaBala ?? 0) +
        k.varaBala + k.horaBala + k.ayanaBala + k.yuddhaBala;
      expect(k.total).toBeCloseTo(sum, 3);
      expect(k.abdaBala).toBe(p === ctx.abdaLord ? 15 : 0);
      expect(k.masaBala).toBe(p === ctx.masaLord ? 30 : 0);
      expect(k.varaBala).toBe(p === PlanetSymbol.MARS ? 45 : 0); // Tuesday
    }
  });
});

describe('Shadbala report: combustion exposed, never added', () => {
  it('golden Venus is combust at ~0.38° and the total excludes any combustion term', async () => {
    const report = new ShadbalaCalculator().calculateShadbala(await chartFor({ hour: 8, minute: 30, second: 0 }));
    expect(report.kalaContext?.source).toBe('SOLAR');
    const venus = report.planets[PlanetSymbol.VENUS]!;
    expect(venus.combustion?.isCombust).toBe(true);
    expect(venus.combustion?.distanceFromSun).toBeCloseTo(0.38, 1);
    expect(report.planets[PlanetSymbol.SUN]!.combustion).toBeUndefined();
    for (const s of report.summary) {
      const sum = s.sthanaBala.total + s.digBala + s.kalaBala.total + s.cheshtaBala + s.naisargikaBala + s.drikBala;
      expect(s.totalShashtiamsas).toBeCloseTo(sum, 3);
    }
  });

  it('falls back deterministically when the birth instant or location is missing', () => {
    const chart = {
      metadata: { normalizedTime: {} },
      birthDetails: { date: { year: 2004, month: 6, day: 8 }, time: { hour: 4, minute: 0, second: 0 } },
      planets: {},
    } as unknown as AstroChart;
    const ctx = resolveKalaTimeContext(chart);
    expect(ctx.source).toBe('FALLBACK');
    expect(ctx.vedicWeekday).toBe(1); // before the 06:00 approximate sunrise → Monday
    expect(ctx.isDayBirth).toBe(false);
  });
});

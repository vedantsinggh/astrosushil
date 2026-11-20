import { describe, it, expect } from 'vitest';
import { calculateTithiPravesha } from '../../src/tajika-extended';
import { BirthDetails } from '../../src/input/birth-details';

/**
 * Independent check of the Tithi Pravesha instant against JPL Horizons (https://ssd.jpl.nasa.gov/api/horizons.api),
 * fetched 2026-11-20: geocentric (CENTER='500@399'), QUANTITIES='31' (apparent ecliptic-of-date longitude), TIME_TYPE='UT',
 * Sun COMMAND='10', Moon COMMAND='301'. Elongation (Moon − Sun) is ayanamsa-free, so tropical Horizons values compare directly.
 * Nothing below is taken from engine output.
 */
const BIRTH: BirthDetails = {
  date: { year: 1990, month: 5, day: 15 },
  time: { hour: 14, minute: 30, second: 0 }, // 09:00 UT
  timezone: 'Asia/Kolkata',
  latitude: 28.6139,
  longitude: 77.209,
  placeName: 'New Delhi, India',
};

// Horizons at 1990-05-15 09:00 UT: Sun 54.2755655, Moon 295.6195136 -> natal elongation 241.3439481.
const NATAL_ELONG_HORIZONS = 295.6195136 - 54.2755655;

// Horizons, 2026-06-05, UT minutes after 22:00 -> [Sun, Moon] ecliptic longitude.
const HORIZONS_2026: Array<[number, number, number]> = [
  [30, 75.2669547, 316.5119428],
  [34, 75.2696135, 316.5458955],
  [38, 75.2722722, 316.5798498],
  [40, 75.2736015, 316.5968275],
  [42, 75.2749309, 316.6138057],
  [44, 75.2762603, 316.6307842],
  [46, 75.2775896, 316.6477631],
  [50, 75.2802484, 316.6817221],
  [56, 75.2842364, 316.7326637],
];

function horizonsElongAt(minute: number): number {
  for (let i = 0; i < HORIZONS_2026.length - 1; i++) {
    const [m0, s0, l0] = HORIZONS_2026[i];
    const [m1, s1, l1] = HORIZONS_2026[i + 1];
    if (minute >= m0 && minute <= m1) {
      const f = (minute - m0) / (m1 - m0);
      return l0 + f * (l1 - l0) - (s0 + f * (s1 - s0));
    }
  }
  throw new Error('outside Horizons table');
}

describe('Tithi Pravesha (ADR-016 §6, provisional)', () => {
  it('finds the 2026 instant whose Sun–Moon elongation equals the natal one, matching JPL Horizons', async () => {
    const r = await calculateTithiPravesha(BIRTH, 2026);

    // Horizons root by linear interpolation (elongation is linear to <1e-6° over 2 minutes).
    let lo = 30;
    let hi = 56;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      if (horizonsElongAt(mid) < NATAL_ELONG_HORIZONS) lo = mid;
      else hi = mid;
    }
    const horizonsRootMs = Date.UTC(2026, 5, 5, 22, 0, 0) + lo * 60000; // ~22:42:39 UT
    const engineMs = Date.parse(r.moment.utcIso);

    // Tolerance: 120 s of time (~0.02° of elongation at ~12.2°/day relative motion).
    expect(Math.abs(engineMs - horizonsRootMs)).toBeLessThan(120_000);

    // Same check expressed in elongation, using Horizons at the engine's instant: within 0.02°.
    const engineMinute = (engineMs - Date.UTC(2026, 5, 5, 22, 0, 0)) / 60000;
    expect(Math.abs(horizonsElongAt(engineMinute) - NATAL_ELONG_HORIZONS)).toBeLessThan(0.02);

    // Natal elongation vs Horizons within 0.01°; natal tithi = floor(241.34 / 12) + 1 = 21 (Krishna Shashthi).
    expect(Math.abs(r.natal.elongation - NATAL_ELONG_HORIZONS)).toBeLessThan(0.01);
    expect(r.natal.tithiIndex).toBe(21);
    expect(r.moment.tithiIndex).toBe(21);

    // Sun sign: Horizons tropical Sun 75.27° minus Lahiri ayanamsa (~24.2° in 2026) = ~51.1° -> Taurus (2);
    // natal 54.28° − ~23.7° = ~30.56° -> Taurus. The other elongation match (2026-05-07) has the Sun in Aries and is rejected.
    expect(r.natal.sunRashiIndex).toBe(2);
    expect(r.moment.sunRashiIndex).toBe(2);
    expect(r.moment.sunSignMatchesNatal).toBe(true);
    expect(r.candidates.some((c) => !c.sunSignMatchesNatal)).toBe(true);

    // Local time = UT + 05:30.
    expect(r.moment.utcOffsetMinutes).toBe(330);
    expect(r.moment.localIso.startsWith('2026-06-06T04:1')).toBe(true);
    expect(r.chart.birthDetails.utcDateTime).toBe(r.moment.utcIso);
    expect(r.provisional).toBe(true);
    expect(r.source).toMatch(/Tithi Pravesha/);
  }, 60000);

  it('is deterministic', async () => {
    const a = await calculateTithiPravesha(BIRTH, 2030);
    const b = await calculateTithiPravesha(BIRTH, 2030);
    expect(a.moment.utcIso).toBe(b.moment.utcIso);
    expect(Math.abs(a.moment.elongationResidual)).toBeLessThan(1e-4);
  }, 60000);

  it('rejects a target year before birth', async () => {
    await expect(calculateTithiPravesha(BIRTH, 1980)).rejects.toThrow();
  });
});

import { describe, it, expect } from 'vitest';
import {
  ChartCalculator,
  AstronomyEngineAdapter,
  DEFAULT_ASTROLOGY_CONFIG,
  RahuKetuCalculator,
  PlanetSymbol,
} from '../../src/index';

describe('RahuKetuCalculator Unit Tests', () => {
  const chartCalculator = new ChartCalculator(new AstronomyEngineAdapter());

  const puneetBirthDetails = {
    date: { year: 1983, month: 12, day: 28 },
    time: { hour: 4, minute: 45, second: 0 },
    timezone: 'Asia/Kolkata',
    latitude: 28.4069,
    longitude: 77.8498,
    placeName: 'Bulandshahr, India',
  };

  it('calculates deterministic Rahu and Ketu coordinates and verifies 180° opposition', async () => {
    const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);
    const result = RahuKetuCalculator.calculateRahuKetuAnalysis(chart);

    // Rahu in Taurus (Vrishabha), House 7 from Scorpio Lagna
    expect(result.nodalPlacement.rahu.signIndex).toBe(2);
    expect(result.nodalPlacement.rahu.sign).toContain('Vrishabha');
    expect(result.nodalPlacement.rahu.sign).toContain('Taurus');
    expect(result.nodalPlacement.rahu.house).toBe(7);
    expect(result.nodalPlacement.rahu.houseFormatted).toBe('7th House');
    expect(result.nodalPlacement.rahu.nakshatra).toBe('Rohini');
    expect(result.nodalPlacement.rahu.pada).toBe(4);
    expect(result.nodalPlacement.rahu.dignity).toBe('Exalted (Uchcha)');
    expect(result.nodalPlacement.rahu.isRetrograde).toBe(true);

    // Ketu in Scorpio (Vrischika), House 1 from Scorpio Lagna
    expect(result.nodalPlacement.ketu.signIndex).toBe(8);
    expect(result.nodalPlacement.ketu.sign).toContain('Vrischika');
    expect(result.nodalPlacement.ketu.sign).toContain('Scorpio');
    expect(result.nodalPlacement.ketu.house).toBe(1);
    expect(result.nodalPlacement.ketu.houseFormatted).toBe('1st House');
    expect(result.nodalPlacement.ketu.nakshatra).toBe('Jyeshtha');
    expect(result.nodalPlacement.ketu.pada).toBe(2);
    expect(result.nodalPlacement.ketu.dignity).toBe('Exalted (Uchcha)');
    expect(result.nodalPlacement.ketu.isRetrograde).toBe(true);

    // Strict 180.00° Nodal Axis Separation (MEAN_NODE convention)
    expect(result.nodalPlacement.axisSeparation).toBe(180.0);
  });

  it('calculates 5th, 7th, 9th special Parashari aspects for both Rahu and Ketu', async () => {
    const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);
    const result = RahuKetuCalculator.calculateRahuKetuAnalysis(chart);

    // Rahu Aspects from Taurus (2):
    // 5th -> Virgo (6, House 11)
    // 7th -> Scorpio (8, House 1)
    // 9th -> Capricorn (10, House 3)
    expect(result.nodalAspects.rahuAspects).toHaveLength(3);
    const [r5, r7, r9] = result.nodalAspects.rahuAspects;
    expect(r5.aspectNumber).toBe(5);
    expect(r5.signIndex).toBe(6);
    expect(r5.house).toBe(11);
    expect(r7.aspectNumber).toBe(7);
    expect(r7.signIndex).toBe(8);
    expect(r7.house).toBe(1);
    expect(r9.aspectNumber).toBe(9);
    expect(r9.signIndex).toBe(10);
    expect(r9.house).toBe(3);

    // Ketu Aspects from Scorpio (8):
    // 5th -> Pisces (12, House 5)
    // 7th -> Taurus (2, House 7)
    // 9th -> Cancer (4, House 9)
    expect(result.nodalAspects.ketuAspects).toHaveLength(3);
    const [k5, k7, k9] = result.nodalAspects.ketuAspects;
    expect(k5.aspectNumber).toBe(5);
    expect(k5.signIndex).toBe(12);
    expect(k5.house).toBe(5);
    expect(k7.aspectNumber).toBe(7);
    expect(k7.signIndex).toBe(2);
    expect(k7.house).toBe(7);
    expect(k9.aspectNumber).toBe(9);
    expect(k9.signIndex).toBe(4);
    expect(k9.house).toBe(9);
  });

  it('evaluates Venus-Ketu conjunction and Moon sign relation for reference chart', async () => {
    const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);
    const result = RahuKetuCalculator.calculateRahuKetuAnalysis(chart);

    // Ketu conjoined with Venus in Scorpio
    expect(result.nodalConjunctions.ketuConjunctions).toContain('VENUS');
    expect(result.nodalConjunctions.interpretation).toContain('Venus and Ketu conjoin');

    // Relative to Virgo Moon (6):
    // Rahu in Taurus (2) = 9th from Moon
    // Ketu in Scorpio (8) = 3rd from Moon
    expect(result.moonSignRelation.rahuHouseFromMoon).toBe(9);
    expect(result.moonSignRelation.ketuHouseFromMoon).toBe(3);
  });

  it('evaluates 2025-2026 and 2026-2028 transit cycles from Lagna and Moon', async () => {
    const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);
    const result = RahuKetuCalculator.calculateRahuKetuAnalysis(chart);

    // 2025-2026 Transit: Aquarius Rahu (11) & Leo Ketu (5)
    expect(result.transit2025_2026.rahuSignIndex).toBe(11);
    expect(result.transit2025_2026.rahuHouseFromLagna).toBe(4);
    expect(result.transit2025_2026.rahuHouseFromMoon).toBe(6); // Upachaya favorable
    expect(result.transit2025_2026.ketuSignIndex).toBe(5);
    expect(result.transit2025_2026.ketuHouseFromLagna).toBe(10);
    expect(result.transit2025_2026.ketuHouseFromMoon).toBe(12);

    // 2026-2028 Transit: Capricorn Rahu (10) & Cancer Ketu (4)
    expect(result.transit2026_2028.rahuSignIndex).toBe(10);
    expect(result.transit2026_2028.rahuHouseFromLagna).toBe(3); // Upachaya favorable
    expect(result.transit2026_2028.rahuHouseFromMoon).toBe(5);
    expect(result.transit2026_2028.ketuSignIndex).toBe(4);
    expect(result.transit2026_2028.ketuHouseFromLagna).toBe(9);
    expect(result.transit2026_2028.ketuHouseFromMoon).toBe(11);
  });

  it('verifies 2025–2030 MEAN_NODE timeline, strict 180° opposition and dynamic reference date labeling', async () => {
    const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);

    // 1. Canonical reference date (2026-11-10T13:18:00Z / 18:48 IST) -> Cycle 1 is active
    const canonicalTimestamp = '2026-11-10T13:18:00Z';
    const curResult = RahuKetuCalculator.calculateRahuKetuAnalysis(chart, false, canonicalTimestamp);
    expect(curResult.referenceDateIso).toBe(new Date(canonicalTimestamp).toISOString());
    expect(curResult.currentCycle.rahuSignIndex).toBe(11);
    expect(curResult.currentCycle.ketuSignIndex).toBe(5);
    expect(curResult.transitTimeline).toHaveLength(3);

    const c1 = curResult.transitTimeline[0];
    const c2 = curResult.transitTimeline[1];
    const c3 = curResult.transitTimeline[2];

    expect(c1.status).toBe('CURRENT');
    expect(c1.startDateIso).toBe('2025-05-18T17:24:31Z');
    expect(c1.endDateIso).toBe('2026-12-05T20:22:35Z');
    expect(c2.status).toBe('UPCOMING');
    expect(c2.startDateIso).toBe('2026-12-05T20:22:35Z');
    expect(c2.endDateIso).toBe('2028-06-23T23:20:42Z');
    expect(c3.status).toBe('UPCOMING');

    // 2. Future reference date (January 15, 2027) -> Cycle 1 completed, Cycle 2 active
    const futureResult = RahuKetuCalculator.calculateRahuKetuAnalysis(chart, false, '2027-01-15T00:00:00Z');
    expect(futureResult.currentCycle.rahuSignIndex).toBe(10); // Capricorn
    expect(futureResult.currentCycle.ketuSignIndex).toBe(4);  // Cancer
    expect(futureResult.transitTimeline[0].status).toBe('COMPLETED');
    expect(futureResult.transitTimeline[1].status).toBe('CURRENT');
    expect(futureResult.transitTimeline[2].status).toBe('UPCOMING');
  });

  it('handles untimed birth profile without corrupting zodiacal or transit calculations', async () => {
    const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);
    const untimedResult = RahuKetuCalculator.calculateRahuKetuAnalysis(chart, true);

    expect(untimedResult.nodalPlacement.rahu.house).toBeNull();
    expect(untimedResult.nodalPlacement.rahu.houseFormatted).toContain('Indeterminate');
    expect(untimedResult.nodalPlacement.ketu.house).toBeNull();
    expect(untimedResult.nodalPlacement.ketu.houseFormatted).toContain('Indeterminate');

    // Nodal separation and Moon relation remain deterministic
    expect(untimedResult.nodalPlacement.axisSeparation).toBe(180.0);
    expect(untimedResult.moonSignRelation.rahuHouseFromMoon).toBe(9);
    expect(untimedResult.moonSignRelation.ketuHouseFromMoon).toBe(3);
    expect(untimedResult.transit2025_2026.rahuHouseFromMoon).toBe(6);
    expect(untimedResult.transit2026_2028.rahuHouseFromMoon).toBe(5);
  });
});

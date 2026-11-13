import { describe, it, expect } from 'vitest';
import {
  ChartCalculator,
  AstronomyEngineAdapter,
  DEFAULT_ASTROLOGY_CONFIG,
  JupiterCalculator,
  PlanetSymbol,
} from '../../src/index';

describe('JupiterCalculator Unit Tests', () => {
  const chartCalculator = new ChartCalculator(new AstronomyEngineAdapter());

  const puneetBirthDetails = {
    date: { year: 1983, month: 12, day: 28 },
    time: { hour: 4, minute: 45, second: 0 },
    timezone: 'Asia/Kolkata',
    latitude: 28.4069,
    longitude: 77.8498,
    placeName: 'Bulandshahr, India',
  };

  it('calculates deterministic natal Jupiter coordinates for canonical Puneet Kumar fixture', async () => {
    const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);
    const result = JupiterCalculator.calculateJupiterAnalysis(chart);

    // Natal Jupiter in Sagittarius (Dhanu), signIndex 9
    expect(result.jupiterPlacement.signIndex).toBe(9);
    expect(result.jupiterPlacement.sign).toContain('Dhanu');
    expect(result.jupiterPlacement.sign).toContain('Sagittarius');
    expect(result.jupiterPlacement.signLord).toBe(PlanetSymbol.JUPITER);
    expect(result.jupiterPlacement.house).toBe(2);
    expect(result.jupiterPlacement.houseFormatted).toBe('2nd House');
    expect(result.jupiterPlacement.nakshatra).toBe('Mula');
    expect(result.jupiterPlacement.pada).toBe(1);
    expect(result.jupiterPlacement.dignity).toBe('Moolatrikona');
    expect(result.jupiterPlacement.isRetrograde).toBe(false);
    expect(result.jupiterPlacement.lordship).toEqual([2, 5]); // Houses 2 and 5 for Scorpio Lagna
  });

  it('calculates 5th, 7th, 9th special Parashari aspects of natal Jupiter', async () => {
    const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);
    const result = JupiterCalculator.calculateJupiterAnalysis(chart);

    expect(result.jupiterAspects.aspects).toHaveLength(3);
    const [asp5, asp7, asp9] = result.jupiterAspects.aspects;

    // 5th aspect from Sagittarius (9) -> Aries (1, House 6)
    expect(asp5.aspectNumber).toBe(5);
    expect(asp5.signIndex).toBe(1);
    expect(asp5.house).toBe(6);
    expect(asp5.sign).toContain('Mesha');

    // 7th aspect from Sagittarius (9) -> Gemini (3, House 8)
    expect(asp7.aspectNumber).toBe(7);
    expect(asp7.signIndex).toBe(3);
    expect(asp7.house).toBe(8);
    expect(asp7.sign).toContain('Mithuna');

    // 9th aspect from Sagittarius (9) -> Leo (5, House 10)
    expect(asp9.aspectNumber).toBe(9);
    expect(asp9.signIndex).toBe(5);
    expect(asp9.house).toBe(10);
    expect(asp9.sign).toContain('Simha');
  });

  it('evaluates exact 56-point Jupiter Bhinnashtakavarga (BAV)', async () => {
    const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);
    const result = JupiterCalculator.calculateJupiterAnalysis(chart);

    expect(result.jupiterAshtakavarga.total).toBe(56); // Classical Parashari Jupiter BAV total is strictly 56
    expect(result.jupiterAshtakavarga.bindus).toHaveLength(12);
    expect(result.jupiterAshtakavarga.bindus.reduce((a, b) => a + b, 0)).toBe(56);

    // Gemini (Index 2) bindus and Cancer (Index 3) bindus
    expect(result.jupiterAshtakavarga.currentGeminiPoints).toBe(result.jupiterAshtakavarga.bindus[2]);
    expect(result.jupiterAshtakavarga.cancerPoints).toBe(result.jupiterAshtakavarga.bindus[3]);
    expect(result.jupiterAshtakavarga.cancerPoints).toBeGreaterThanOrEqual(4); // Auspicious in Cancer
  });

  it('evaluates Gemini and Cancer transit relationships from Lagna and Moon', async () => {
    const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);
    const result = JupiterCalculator.calculateJupiterAnalysis(chart);

    // For Scorpio Lagna (8) & Virgo Moon (6):
    // Gemini (3): House 8 from Lagna, House 10 from Moon
    expect(result.geminiTransit.signIndex).toBe(3);
    expect(result.geminiTransit.houseFromLagna).toBe(8);
    expect(result.geminiTransit.houseFromMoon).toBe(10);
    expect(result.geminiTransit.aspects).toHaveLength(3);

    // Cancer (4): House 9 from Lagna, House 11 from Moon
    expect(result.cancerTransit.signIndex).toBe(4);
    expect(result.cancerTransit.houseFromLagna).toBe(9);
    expect(result.cancerTransit.houseFromMoon).toBe(11);
    expect(result.cancerTransit.aspects).toHaveLength(3);
  });

  it('evaluates October 31, 2026 Leo ingress and dynamic reference date transit transitions', async () => {
    const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);

    // 1. Reference date during Cancer Exaltation (e.g., August 15, 2026)
    const cancerResult = JupiterCalculator.calculateJupiterAnalysis(chart, false, '2026-08-15T00:00:00Z');
    expect(cancerResult.currentTransit.signIndex).toBe(4);
    expect(cancerResult.currentTransit.sign).toContain('Cancer');
    const cancerPhase = cancerResult.transitTimeline.find((t) => t.phaseName.includes('Phase 4'));
    expect(cancerPhase?.status).toBe('CURRENT');
    const leoPhase = cancerResult.transitTimeline.find((t) => t.phaseName.includes('Phase 5'));
    expect(leoPhase?.status).toBe('UPCOMING');

    // 2. Canonical reference timestamp: 2026-11-10T13:18:00Z (18:48 IST)
    const canonicalTimestamp = '2026-11-10T13:18:00Z';
    const leoResult = JupiterCalculator.calculateJupiterAnalysis(chart, false, canonicalTimestamp);
    expect(leoResult.referenceDateIso).toBe(new Date(canonicalTimestamp).toISOString());
    expect(leoResult.leoTransit.signIndex).toBe(5);
    expect(leoResult.leoTransit.houseFromLagna).toBe(10); // House 10 from Scorpio Lagna
    expect(leoResult.leoTransit.houseFromMoon).toBe(12);  // House 12 from Virgo Moon
    expect(leoResult.currentTransit.signIndex).toBe(5);
    expect(leoResult.currentTransit.sign).toContain('Leo');

    const prevCancerPhase = leoResult.transitTimeline.find((t) => t.phaseName.includes('Phase 4'));
    expect(prevCancerPhase?.status).toBe('COMPLETED');
    const activeLeoPhase = leoResult.transitTimeline.find((t) => t.phaseName.includes('Phase 5'));
    expect(activeLeoPhase?.status).toBe('CURRENT');
    expect(activeLeoPhase?.startDateIso).toBe('2026-10-31T04:46:58Z');

    // 3. Reference date during retrograde Cancer re-entry (e.g., March 1, 2027)
    const retroResult = JupiterCalculator.calculateJupiterAnalysis(chart, false, '2027-03-01T00:00:00Z');
    expect(retroResult.currentTransit.signIndex).toBe(4);
    const retroCancerPhase = retroResult.transitTimeline.find((t) => t.phaseName.includes('Phase 6'));
    expect(retroCancerPhase?.status).toBe('CURRENT');
    expect(retroCancerPhase?.motion).toBe('RETROGRADE');

    // 4. Complete 2028–2029 Jupiter timeline verification (Phases 11, 12, 13)
    expect(leoResult.transitTimeline).toHaveLength(13);
    const p11 = leoResult.transitTimeline.find((t) => t.phaseName.includes('Phase 11'));
    const p12 = leoResult.transitTimeline.find((t) => t.phaseName.includes('Phase 12'));
    const p13 = leoResult.transitTimeline.find((t) => t.phaseName.includes('Phase 13'));

    expect(p11).toBeDefined();
    expect(p11?.startDateIso).toBe('2028-12-26T05:53:54Z');
    expect(p11?.endDateIso).toBe('2029-03-29T11:24:55Z');
    expect(p11?.motion).toBe('DIRECT');
    expect(p11?.signIndex).toBe(7); // Libra

    expect(p12).toBeDefined();
    expect(p12?.startDateIso).toBe('2029-03-29T11:24:55Z');
    expect(p12?.endDateIso).toBe('2029-08-24T17:48:30Z');
    expect(p12?.motion).toBe('RETROGRADE');
    expect(p12?.signIndex).toBe(6); // Virgo

    expect(p13).toBeDefined();
    expect(p13?.startDateIso).toBe('2029-08-24T17:48:30Z');
    expect(p13?.endDateIso).toBe('2030-01-24T18:15:07Z');
    expect(p13?.motion).toBe('DIRECT');
    expect(p13?.signIndex).toBe(7); // Libra

    // 5. Test 2029 retrograde Virgo re-entry active status
    const virgo2029Result = JupiterCalculator.calculateJupiterAnalysis(chart, false, '2029-05-15T00:00:00Z');
    expect(virgo2029Result.currentTransit.signIndex).toBe(6);
    expect(virgo2029Result.currentTransit.sign).toContain('Virgo');
    const activeVirgoPhase = virgo2029Result.transitTimeline.find((t) => t.phaseName.includes('Phase 12'));
    expect(activeVirgoPhase?.status).toBe('CURRENT');

    // 6. Test late 2029 direct Libra culmination active status
    const libra2029Result = JupiterCalculator.calculateJupiterAnalysis(chart, false, '2029-10-15T00:00:00Z');
    expect(libra2029Result.currentTransit.signIndex).toBe(7);
    expect(libra2029Result.currentTransit.sign).toContain('Libra');
    const activeLibraPhase = libra2029Result.transitTimeline.find((t) => t.phaseName.includes('Phase 13'));
    expect(activeLibraPhase?.status).toBe('CURRENT');
  });

  it('handles untimed birth profile without corrupting zodiacal or transit calculations', async () => {
    const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);
    const untimedResult = JupiterCalculator.calculateJupiterAnalysis(chart, true);

    expect(untimedResult.jupiterPlacement.house).toBeNull();
    expect(untimedResult.jupiterPlacement.houseFormatted).toContain('Indeterminate');
    expect(untimedResult.jupiterPlacement.lordship).toEqual([]);

    // Moon relation, sign, and BAV remain deterministic
    expect(untimedResult.jupiterPlacement.signIndex).toBe(9);
    expect(untimedResult.moonSignRelation.houseFromMoon).toBe(4);
    expect(untimedResult.jupiterAshtakavarga.total).toBe(56);
    expect(untimedResult.geminiTransit.houseFromMoon).toBe(10);
    expect(untimedResult.cancerTransit.houseFromMoon).toBe(11);
  });
});

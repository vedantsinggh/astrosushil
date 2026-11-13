import { describe, it, expect } from 'vitest';
import { ChartCalculator } from '../../src/chart/chart-calculator';
import { AstronomyEngineAdapter } from '../../src/ephemeris/astronomy-engine.adapter';
import { DEFAULT_ASTROLOGY_CONFIG } from '../../src/configuration/astrology-config';
import { SaturnCalculator } from '../../src/saturn/saturn-calculator';

describe('SaturnCalculator Unit Tests', () => {
  const chartCalculator = new ChartCalculator(new AstronomyEngineAdapter());

  const puneetBirthDetails = {
    date: { year: 1983, month: 12, day: 28 },
    time: { hour: 4, minute: 45, second: 0 },
    timezone: 'Asia/Kolkata',
    latitude: 28.407,
    longitude: 77.8498,
    placeName: 'Bulandshahr, India',
  };

  it('correctly calculates Puneet Kumar canonical reference Saturn metrics', async () => {
    const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);
    const result = SaturnCalculator.calculateSaturnAnalysis(chart, false);

    // 1. Placement verification
    expect(result.saturnPlacement.sign).toBe('Tula'); // Libra
    expect(result.saturnPlacement.signIndex).toBe(7);
    expect(result.saturnPlacement.house).toBe(12); // Scorpio Lagna -> Libra is 12th house
    expect(result.saturnPlacement.houseFormatted).toBe('12th House');
    expect(result.saturnPlacement.nakshatra).toBe('Swati');
    expect(result.saturnPlacement.pada).toBe(4);
    expect(result.saturnPlacement.dignity).toBe('Exalted (Uchcha)');
    expect(result.saturnPlacement.isRetrograde).toBe(false);
    expect(result.saturnPlacement.isCombust).toBe(false);
    expect(result.saturnPlacement.lordship).toEqual([3, 4]); // Capricorn=3rd, Aquarius=4th

    // 2. Aspects verification (3rd, 7th, 10th)
    expect(result.saturnAspects.aspects).toHaveLength(3);
    const [asp3, asp7, asp10] = result.saturnAspects.aspects;
    expect(asp3.aspectNumber).toBe(3);
    expect(asp3.house).toBe(2);
    expect(asp3.sign).toBe('Dhanu'); // Sagittarius

    expect(asp7.aspectNumber).toBe(7);
    expect(asp7.house).toBe(6);
    expect(asp7.sign).toBe('Mesha'); // Aries

    expect(asp10.aspectNumber).toBe(10);
    expect(asp10.house).toBe(9);
    expect(asp10.sign).toBe('Karka'); // Cancer

    // 3. Moon relationship & Nakshatra verification
    expect(result.moonSignRelation.moonSign).toContain('Kanya'); // Virgo Moon
    expect(result.moonSignRelation.moonNakshatra).toBe('Chitra');
    expect(result.moonSignRelation.moonPada).toBe(2);
    expect(result.moonSignRelation.moonNakshatraLord).toBe('MARS');
    expect(result.moonSignRelation.houseFromMoon).toBe(2); // Libra is 2nd from Virgo
    expect(result.moonSignRelation.saturnRelationToMoonLord).toBe('Natural Friend'); // Mercury & Saturn

    // Saturn's natal Nakshatra verification
    expect(result.saturnPlacement.nakshatra).toBe('Swati');
    expect(result.saturnPlacement.pada).toBe(4);
    expect(result.saturnNakshatraAnalysis.nakshatra).toBe('Swati');
    expect(result.saturnNakshatraAnalysis.pada).toBe(4);
    expect(result.saturnNakshatraAnalysis.lord).toBe('RAHU');

    // 4. Ashtakavarga
    expect(result.saturnAshtakavarga.total).toBe(39);
    expect(result.saturnAshtakavarga.bindus).toHaveLength(12);
    // Libra is sign 7 (index 6)
    expect(result.saturnAshtakavarga.natalHousePoints).toBe(result.saturnAshtakavarga.bindus[6]);
    // Pisces is sign 12 (index 11)
    expect(result.saturnAshtakavarga.currentTransitHousePoints).toBe(result.saturnAshtakavarga.bindus[11]);

    // 5. Sade Sati
    expect(result.sadeSatiPhases.isActive).toBe(false);
    expect(result.sadeSatiPhases.firstCycle).toHaveLength(3);
    expect(result.sadeSatiPhases.secondCycle).toHaveLength(3);

    // 6. Kantak Shani
    expect(result.kantakShani.isActiveFromMoon).toBe(true); // 7th from Moon is Kantak Shani
    expect(result.kantakShani.houseFromMoon).toBe(7);
    expect(result.kantakShani.isAshtamaShani).toBe(false);
    expect(result.kantakShani.transitCategory).toBe('KANTAK_SHANI');
  });

  it('independently verifies classical Parashari 12-sign Saturn Bhinnashtakavarga (BAV)', async () => {
    const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);
    const result = SaturnCalculator.calculateSaturnAnalysis(chart, false);

    // Independent expected distribution derived by manually summing classical BAV benefic rules
    // (BPHS Ch. 66) for planetary placements in Puneet Kumar's chart:
    // Sun: Sag (9), Moon: Vir (6), Mars: Vir (6), Mercury: Sag (9),
    // Jupiter: Sag (9), Venus: Sco (8), Saturn: Lib (7), Lagna: Sco (8)
    const expectedBindus = [
      3, // 1: Aries   (Ju + Ve + Lagna)
      2, // 2: Taurus  (Ju + Me)
      2, // 3: Gemini  (Ma + Su)
      4, // 4: Cancer  (Ma + Su + Me + Mo)
      4, // 5: Leo     (Sa + Ma + Me + Lagna)
      4, // 6: Virgo   (Su + Ve + Me + Lagna)
      4, // 7: Libra   (Ju + Su + Ve + Me) [Natal Saturn]
      5, // 8: Scorpio (Ju + Ma + Me + Mo + Lagna) [Lagna]
      2, // 9: Sagittarius (Sa + Su)
      3, // 10: Capricorn (Ma + Su + Lagna)
      4, // 11: Aquarius (Sa + Ma + Mo + Lagna)
      2, // 12: Pisces (Sa + Su) [Current Saturn Transit]
    ];

    expect(result.saturnAshtakavarga.bindus).toEqual(expectedBindus);
    expect(result.saturnAshtakavarga.total).toBe(39);

    // Verify key sign invariants
    expect(result.saturnAshtakavarga.natalHousePoints).toBe(4); // Libra (Sign 7) = 4
    expect(result.saturnAshtakavarga.currentTransitHousePoints).toBe(2); // Pisces (Sign 12) = 2

    // Verify matrix rows and total contributions per contributor
    const expectedContributorTotals: Record<string, number> = {
      Saturn: 4,
      Jupiter: 4,
      Mars: 6,
      Sun: 7,
      Venus: 3,
      Mercury: 6,
      Moon: 3,
      Lagna: 6,
    };

    let totalFromMatrix = 0;
    for (const row of result.saturnAshtakavarga.matrix) {
      const rowSum = row.bindus.reduce((a, b) => a + b, 0);
      expect(rowSum).toBe(expectedContributorTotals[row.contributor]);
      totalFromMatrix += rowSum;
    }
    expect(totalFromMatrix).toBe(39);
  });

  it('independently classifies all 12 transit houses from natal Moon with strict boundary checks', () => {
    const virgoMoonIndex = 6;
    const scorpioAscIndex = 8;

    // 12th from Moon: Leo (5) -> Sade Sati Rising
    const h12 = SaturnCalculator.classifyTransitRelationship(virgoMoonIndex, 5, scorpioAscIndex);
    expect(h12.houseFromMoon).toBe(12);
    expect(h12.isSadeSati).toBe(true);
    expect(h12.sadeSatiPhase).toContain('Rising');
    expect(h12.isKantakShani).toBe(false);
    expect(h12.isAshtamaShani).toBe(false);
    expect(h12.transitCategory).toBe('SADE_SATI');

    // 1st from Moon: Virgo (6) -> Sade Sati Peak / Janma Shani
    const h1 = SaturnCalculator.classifyTransitRelationship(virgoMoonIndex, 6, scorpioAscIndex);
    expect(h1.houseFromMoon).toBe(1);
    expect(h1.isSadeSati).toBe(true);
    expect(h1.sadeSatiPhase).toContain('Peak');
    expect(h1.isKantakShani).toBe(false);
    expect(h1.isAshtamaShani).toBe(false);
    expect(h1.transitCategory).toBe('SADE_SATI');

    // 2nd from Moon: Libra (7) -> Sade Sati Setting
    const h2 = SaturnCalculator.classifyTransitRelationship(virgoMoonIndex, 7, scorpioAscIndex);
    expect(h2.houseFromMoon).toBe(2);
    expect(h2.isSadeSati).toBe(true);
    expect(h2.sadeSatiPhase).toContain('Setting');
    expect(h2.isKantakShani).toBe(false);
    expect(h2.isAshtamaShani).toBe(false);
    expect(h2.transitCategory).toBe('SADE_SATI');

    // 3rd from Moon: Scorpio (8) -> Upachaya Favorable
    const h3 = SaturnCalculator.classifyTransitRelationship(virgoMoonIndex, 8, scorpioAscIndex);
    expect(h3.houseFromMoon).toBe(3);
    expect(h3.isSadeSati).toBe(false);
    expect(h3.isKantakShani).toBe(false);
    expect(h3.isAshtamaShani).toBe(false);
    expect(h3.transitCategory).toBe('UPACHAYA_FAVORABLE');

    // 4th from Moon: Sagittarius (9) -> Kantak Shani (Ardha-Ashtama)
    const h4 = SaturnCalculator.classifyTransitRelationship(virgoMoonIndex, 9, scorpioAscIndex);
    expect(h4.houseFromMoon).toBe(4);
    expect(h4.isSadeSati).toBe(false);
    expect(h4.isKantakShani).toBe(true);
    expect(h4.kantakType).toContain('Ardha-Ashtama');
    expect(h4.isAshtamaShani).toBe(false);
    expect(h4.transitCategory).toBe('KANTAK_SHANI');

    // 5th from Moon: Capricorn (10) -> Neutral / Trikona
    const h5 = SaturnCalculator.classifyTransitRelationship(virgoMoonIndex, 10, scorpioAscIndex);
    expect(h5.houseFromMoon).toBe(5);
    expect(h5.isSadeSati).toBe(false);
    expect(h5.isKantakShani).toBe(false);
    expect(h5.isAshtamaShani).toBe(false);
    expect(h5.transitCategory).toBe('NEUTRAL');

    // 6th from Moon: Aquarius (11) -> Upachaya Favorable
    const h6 = SaturnCalculator.classifyTransitRelationship(virgoMoonIndex, 11, scorpioAscIndex);
    expect(h6.houseFromMoon).toBe(6);
    expect(h6.isSadeSati).toBe(false);
    expect(h6.isKantakShani).toBe(false);
    expect(h6.isAshtamaShani).toBe(false);
    expect(h6.transitCategory).toBe('UPACHAYA_FAVORABLE');

    // 7th from Moon: Pisces (12) -> Kantak Shani (Saptama) [Current Puneet Transit]
    const h7 = SaturnCalculator.classifyTransitRelationship(virgoMoonIndex, 12, scorpioAscIndex);
    expect(h7.houseFromMoon).toBe(7);
    expect(h7.isSadeSati).toBe(false);
    expect(h7.isKantakShani).toBe(true);
    expect(h7.kantakType).toContain('Saptama');
    expect(h7.isAshtamaShani).toBe(false);
    expect(h7.transitCategory).toBe('KANTAK_SHANI');

    // 8th from Moon: Aries (1) -> Ashtama Shani [Upcoming 2027 Puneet Transit]
    const h8 = SaturnCalculator.classifyTransitRelationship(virgoMoonIndex, 1, scorpioAscIndex);
    expect(h8.houseFromMoon).toBe(8);
    expect(h8.isSadeSati).toBe(false);
    expect(h8.isKantakShani).toBe(false);
    expect(h8.isAshtamaShani).toBe(true);
    expect(h8.transitCategory).toBe('ASHTAMA_SHANI');

    // 9th from Moon: Taurus (2) -> Neutral / Trikona
    const h9 = SaturnCalculator.classifyTransitRelationship(virgoMoonIndex, 2, scorpioAscIndex);
    expect(h9.houseFromMoon).toBe(9);
    expect(h9.isSadeSati).toBe(false);
    expect(h9.isKantakShani).toBe(false);
    expect(h9.isAshtamaShani).toBe(false);
    expect(h9.transitCategory).toBe('NEUTRAL');

    // 10th from Moon: Gemini (3) -> Kantak Shani (Karma)
    const h10 = SaturnCalculator.classifyTransitRelationship(virgoMoonIndex, 3, scorpioAscIndex);
    expect(h10.houseFromMoon).toBe(10);
    expect(h10.isSadeSati).toBe(false);
    expect(h10.isKantakShani).toBe(true);
    expect(h10.kantakType).toContain('Karma');
    expect(h10.isAshtamaShani).toBe(false);
    expect(h10.transitCategory).toBe('KANTAK_SHANI');

    // 11th from Moon: Cancer (4) -> Upachaya Favorable
    const h11 = SaturnCalculator.classifyTransitRelationship(virgoMoonIndex, 4, scorpioAscIndex);
    expect(h11.houseFromMoon).toBe(11);
    expect(h11.isSadeSati).toBe(false);
    expect(h11.isKantakShani).toBe(false);
    expect(h11.isAshtamaShani).toBe(false);
    expect(h11.transitCategory).toBe('UPACHAYA_FAVORABLE');
  });

  it('properly handles untimed birth profiles (isTimeUnknown = true)', async () => {
    const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);
    const result = SaturnCalculator.calculateSaturnAnalysis(chart, true);

    expect(result.saturnPlacement.house).toBeNull();
    expect(result.saturnPlacement.houseFormatted).toBe('Indeterminate (Unknown Birth Time)');
    expect(result.saturnPlacement.lordship).toEqual([]);

    // Aspects houses must also be null, but signs preserved
    result.saturnAspects.aspects.forEach((asp) => {
      expect(asp.house).toBeNull();
      expect(asp.sign).toBeDefined();
    });

    // Moon relation preserved because Moon position is present
    expect(result.moonSignRelation.houseFromMoon).toBe(2);
    expect(result.saturnAshtakavarga.total).toBe(39);
  });
});

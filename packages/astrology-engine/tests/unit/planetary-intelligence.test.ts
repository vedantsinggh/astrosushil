import { describe, it, expect } from 'vitest';
import {
  PlanetSymbol,
  calculatePlanetaryDignity,
  isExalted,
  isDebilitated,
  isMoolatrikona,
  isOwnSign,
  getNaturalRelationship,
  getTemporalRelationship,
  getCompoundRelationship,
  calculatePlanetaryAspects,
  getAspectedHouses,
  calculateCombustion,
  getCombustionThreshold,
  calculateBaladiAvastha,
  calculateJagratadiAvastha,
  calculatePlanetaryAvastha,
  calculateCharaKarakas,
  calculatePlanetaryWars,
  calculateConjunctions,
  PlanetaryIntelligenceCalculator,
} from '../../src/planets';

describe('Phase 2B: Planetary Intelligence Unit Tests', () => {
  describe('1. Planetary Dignity (Classical BPHS Standards)', () => {
    it('correctly identifies exaltation across all classical planets', () => {
      expect(isExalted(PlanetSymbol.SUN, 1)).toBe(true);  // Aries
      expect(isExalted(PlanetSymbol.MOON, 2)).toBe(true); // Taurus
      expect(isExalted(PlanetSymbol.MARS, 10)).toBe(true); // Capricorn
      expect(isExalted(PlanetSymbol.MERCURY, 6)).toBe(true); // Virgo
      expect(isExalted(PlanetSymbol.JUPITER, 4)).toBe(true); // Cancer
      expect(isExalted(PlanetSymbol.VENUS, 12)).toBe(true); // Pisces
      expect(isExalted(PlanetSymbol.SATURN, 7)).toBe(true); // Libra
      expect(isExalted(PlanetSymbol.RAHU, 2)).toBe(true); // Taurus
      expect(isExalted(PlanetSymbol.KETU, 8)).toBe(true); // Scorpio

      // Non-exalted
      expect(isExalted(PlanetSymbol.SUN, 2)).toBe(false);
      expect(isExalted(PlanetSymbol.MARS, 1)).toBe(false);
    });

    it('correctly identifies debilitation across all classical planets', () => {
      expect(isDebilitated(PlanetSymbol.SUN, 7)).toBe(true);   // Libra
      expect(isDebilitated(PlanetSymbol.MOON, 8)).toBe(true);  // Scorpio
      expect(isDebilitated(PlanetSymbol.MARS, 4)).toBe(true);  // Cancer
      expect(isDebilitated(PlanetSymbol.MERCURY, 12)).toBe(true); // Pisces
      expect(isDebilitated(PlanetSymbol.JUPITER, 10)).toBe(true); // Capricorn
      expect(isDebilitated(PlanetSymbol.VENUS, 6)).toBe(true);  // Virgo
      expect(isDebilitated(PlanetSymbol.SATURN, 1)).toBe(true); // Aries
      expect(isDebilitated(PlanetSymbol.RAHU, 8)).toBe(true);   // Scorpio
      expect(isDebilitated(PlanetSymbol.KETU, 2)).toBe(true);   // Taurus
    });

    it('correctly identifies classical Moolatrikona zones', () => {
      // Sun in Leo 0-20° is Moolatrikona, 20-30° is Own Sign
      expect(isMoolatrikona(PlanetSymbol.SUN, 5, 10)).toBe(true);
      expect(isMoolatrikona(PlanetSymbol.SUN, 5, 25)).toBe(false);

      // Mars in Aries 0-12° is Moolatrikona, 12-30° is Own Sign
      expect(isMoolatrikona(PlanetSymbol.MARS, 1, 8)).toBe(true);
      expect(isMoolatrikona(PlanetSymbol.MARS, 1, 20)).toBe(false);

      // Moon in Taurus 3-30° is Moolatrikona (0-3° is exaltation)
      expect(isMoolatrikona(PlanetSymbol.MOON, 2, 10)).toBe(true);
      expect(isMoolatrikona(PlanetSymbol.MOON, 2, 2)).toBe(false);

      // Jupiter in Sagittarius 0-10°
      expect(isMoolatrikona(PlanetSymbol.JUPITER, 9, 5)).toBe(true);
      expect(isMoolatrikona(PlanetSymbol.JUPITER, 9, 15)).toBe(false);

      // Venus in Libra 0-15°
      expect(isMoolatrikona(PlanetSymbol.VENUS, 7, 10)).toBe(true);
      expect(isMoolatrikona(PlanetSymbol.VENUS, 7, 25)).toBe(false);

      // Saturn in Aquarius 0-20°
      expect(isMoolatrikona(PlanetSymbol.SATURN, 11, 15)).toBe(true);
      expect(isMoolatrikona(PlanetSymbol.SATURN, 11, 25)).toBe(false);
    });

    it('correctly identifies Own Sign outside Moolatrikona', () => {
      expect(isOwnSign(PlanetSymbol.SUN, 5, 25)).toBe(true); // Leo > 20°
      expect(isOwnSign(PlanetSymbol.MARS, 8, 15)).toBe(true); // Scorpio
      expect(isOwnSign(PlanetSymbol.JUPITER, 12, 15)).toBe(true); // Pisces
      expect(isOwnSign(PlanetSymbol.SATURN, 10, 15)).toBe(true); // Capricorn
      expect(isOwnSign(PlanetSymbol.VENUS, 2, 15)).toBe(true); // Taurus
    });

    it('calculates full 5-fold compound dignity (Panchadha Sambandha)', () => {
      // Sun in Sagittarius (ruled by Jupiter). Jupiter is Natural Friend of Sun.
      // If Jupiter is in sign 11 (Aquarius) -> distance from Sagittarius (9) to Aquarius (11) is 3 signs (temporal friend)
      // Natural Friend + Temporal Friend = GREAT_FRIEND
      const positionsGreatFriend = {
        [PlanetSymbol.JUPITER]: { rashiIndex: 11 },
      };
      expect(calculatePlanetaryDignity(PlanetSymbol.SUN, 9, 15, positionsGreatFriend)).toBe('GREAT_FRIEND');

      // If Jupiter is in sign 1 (Aries) -> distance from Sagittarius (9) to Aries (1) is 5 signs (temporal enemy)
      // Natural Friend + Temporal Enemy = NEUTRAL
      const positionsNeutral = {
        [PlanetSymbol.JUPITER]: { rashiIndex: 1 },
      };
      expect(calculatePlanetaryDignity(PlanetSymbol.SUN, 9, 15, positionsNeutral)).toBe('NEUTRAL');

      // Mercury in Virgo 10° is Exalted
      expect(calculatePlanetaryDignity(PlanetSymbol.MERCURY, 6, 10)).toBe('EXALTED');
      // Mercury in Virgo 18° is Moolatrikona
      expect(calculatePlanetaryDignity(PlanetSymbol.MERCURY, 6, 18)).toBe('MOOLATRIKONA');
      // Mercury in Virgo 25° is Own Sign
      expect(calculatePlanetaryDignity(PlanetSymbol.MERCURY, 6, 25)).toBe('OWN_SIGN');
    });
  });

  describe('2. Planetary Relationships (Naisargika, Tatkalika, Panchadha)', () => {
    it('verifies classical Naisargika (Natural) relationships', () => {
      expect(getNaturalRelationship(PlanetSymbol.SUN, PlanetSymbol.MOON)).toBe('FRIEND');
      expect(getNaturalRelationship(PlanetSymbol.SUN, PlanetSymbol.MARS)).toBe('FRIEND');
      expect(getNaturalRelationship(PlanetSymbol.SUN, PlanetSymbol.JUPITER)).toBe('FRIEND');
      expect(getNaturalRelationship(PlanetSymbol.SUN, PlanetSymbol.MERCURY)).toBe('NEUTRAL');
      expect(getNaturalRelationship(PlanetSymbol.SUN, PlanetSymbol.VENUS)).toBe('ENEMY');
      expect(getNaturalRelationship(PlanetSymbol.SUN, PlanetSymbol.SATURN)).toBe('ENEMY');

      // Moon views Sun and Mercury as Friends, none as Natural Enemies among 7 planets
      expect(getNaturalRelationship(PlanetSymbol.MOON, PlanetSymbol.SUN)).toBe('FRIEND');
      expect(getNaturalRelationship(PlanetSymbol.MOON, PlanetSymbol.MERCURY)).toBe('FRIEND');
      expect(getNaturalRelationship(PlanetSymbol.MOON, PlanetSymbol.MARS)).toBe('NEUTRAL');
      expect(getNaturalRelationship(PlanetSymbol.MOON, PlanetSymbol.JUPITER)).toBe('NEUTRAL');
      expect(getNaturalRelationship(PlanetSymbol.MOON, PlanetSymbol.VENUS)).toBe('NEUTRAL');
      expect(getNaturalRelationship(PlanetSymbol.MOON, PlanetSymbol.SATURN)).toBe('NEUTRAL');
    });

    it('calculates Tatkalika (Temporal) relationships based on sign distance', () => {
      // Planet 1 in Sign 1 (Aries)
      // Signs 2, 3, 4, 10, 11, 12 are Temporal Friends
      expect(getTemporalRelationship(1, 2)).toBe('FRIEND');
      expect(getTemporalRelationship(1, 3)).toBe('FRIEND');
      expect(getTemporalRelationship(1, 4)).toBe('FRIEND');
      expect(getTemporalRelationship(1, 10)).toBe('FRIEND');
      expect(getTemporalRelationship(1, 11)).toBe('FRIEND');
      expect(getTemporalRelationship(1, 12)).toBe('FRIEND');

      // Signs 1, 5, 6, 7, 8, 9 are Temporal Enemies
      expect(getTemporalRelationship(1, 1)).toBe('ENEMY');
      expect(getTemporalRelationship(1, 5)).toBe('ENEMY');
      expect(getTemporalRelationship(1, 6)).toBe('ENEMY');
      expect(getTemporalRelationship(1, 7)).toBe('ENEMY');
      expect(getTemporalRelationship(1, 8)).toBe('ENEMY');
      expect(getTemporalRelationship(1, 9)).toBe('ENEMY');
    });

    it('combines into Panchadha Sambandha correctly', () => {
      expect(getCompoundRelationship('FRIEND', 'FRIEND')).toBe('GREAT_FRIEND');
      expect(getCompoundRelationship('FRIEND', 'ENEMY')).toBe('NEUTRAL');
      expect(getCompoundRelationship('NEUTRAL', 'FRIEND')).toBe('FRIEND');
      expect(getCompoundRelationship('NEUTRAL', 'ENEMY')).toBe('ENEMY');
      expect(getCompoundRelationship('ENEMY', 'FRIEND')).toBe('NEUTRAL');
      expect(getCompoundRelationship('ENEMY', 'ENEMY')).toBe('GREAT_ENEMY');
    });
  });

  describe('3. Planetary Aspects (Graha Drishti)', () => {
    it('verifies standard 7th aspect for all planets', () => {
      const sunAspects = getAspectedHouses(PlanetSymbol.SUN, 1);
      expect(sunAspects).toEqual([{ house: 7, aspectType: 'OPPOSITION_7TH' }]);

      const moonAspects = getAspectedHouses(PlanetSymbol.MOON, 4);
      expect(moonAspects).toEqual([{ house: 10, aspectType: 'OPPOSITION_7TH' }]);
    });

    it('verifies special Mars aspects (4th, 7th, 8th)', () => {
      const marsAspects = getAspectedHouses(PlanetSymbol.MARS, 1);
      const aspectHouses = marsAspects.map((a) => a.house);
      expect(aspectHouses).toContain(4);
      expect(aspectHouses).toContain(7);
      expect(aspectHouses).toContain(8);
      expect(marsAspects).toHaveLength(3);
    });

    it('verifies special Jupiter aspects (5th, 7th, 9th)', () => {
      const jupAspects = getAspectedHouses(PlanetSymbol.JUPITER, 1);
      const aspectHouses = jupAspects.map((a) => a.house);
      expect(aspectHouses).toContain(5);
      expect(aspectHouses).toContain(7);
      expect(aspectHouses).toContain(9);
      expect(jupAspects).toHaveLength(3);
    });

    it('verifies special Saturn aspects (3rd, 7th, 10th)', () => {
      const satAspects = getAspectedHouses(PlanetSymbol.SATURN, 2);
      const aspectHouses = satAspects.map((a) => a.house);
      expect(aspectHouses).toContain(4);  // 3rd from 2 is 4
      expect(aspectHouses).toContain(8);  // 7th from 2 is 8
      expect(aspectHouses).toContain(11); // 10th from 2 is 11
      expect(satAspects).toHaveLength(3);
    });

    it('calculates full mutual aspect grid across chart planets', () => {
      const planets = [
        { planet: PlanetSymbol.MARS, rashiIndex: 1, house: 1, longitude: 15 },
        { planet: PlanetSymbol.JUPITER, rashiIndex: 7, house: 7, longitude: 195 },
        { planet: PlanetSymbol.SATURN, rashiIndex: 4, house: 4, longitude: 105 },
      ];

      const { aspectsCast, aspectsReceived, aspectedHouses } = calculatePlanetaryAspects(planets);

      // Mars in House 1 aspects Houses 4, 7, 8
      expect(aspectedHouses.get(PlanetSymbol.MARS)).toEqual([7, 4, 8]);

      // Jupiter in House 7 is aspected by Mars (7th aspect)
      const jupReceived = aspectsReceived.get(PlanetSymbol.JUPITER);
      expect(jupReceived?.some((a) => a.sourcePlanet === PlanetSymbol.MARS)).toBe(true);

      // Saturn in House 4 is aspected by Mars (4th special aspect)
      const satReceived = aspectsReceived.get(PlanetSymbol.SATURN);
      expect(satReceived?.some((a) => a.sourcePlanet === PlanetSymbol.MARS && a.aspectType === 'SPECIAL_4TH')).toBe(true);
    });
  });

  describe('4. Precision Combustion (Asta)', () => {
    it('verifies Sun, Rahu, and Ketu are never combust', () => {
      expect(calculateCombustion(PlanetSymbol.SUN, 45, 45).isCombust).toBe(false);
      expect(calculateCombustion(PlanetSymbol.RAHU, 45, 45).isCombust).toBe(false);
      expect(calculateCombustion(PlanetSymbol.KETU, 45, 45).isCombust).toBe(false);
    });

    it('verifies classical combustion thresholds', () => {
      expect(getCombustionThreshold(PlanetSymbol.MOON)).toBe(12.0);
      expect(getCombustionThreshold(PlanetSymbol.MARS)).toBe(17.0);
      expect(getCombustionThreshold(PlanetSymbol.MERCURY, false)).toBe(14.0);
      expect(getCombustionThreshold(PlanetSymbol.MERCURY, true)).toBe(12.0);
      expect(getCombustionThreshold(PlanetSymbol.VENUS, false)).toBe(10.0);
      expect(getCombustionThreshold(PlanetSymbol.VENUS, true)).toBe(8.0);
      expect(getCombustionThreshold(PlanetSymbol.JUPITER)).toBe(11.0);
      expect(getCombustionThreshold(PlanetSymbol.SATURN)).toBe(15.0);
    });

    it('correctly calculates combustion state with retrograde sensitivity', () => {
      const sunLong = 50.0;

      // Mars at 60° (diff = 10° <= 17°) -> Combust
      expect(calculateCombustion(PlanetSymbol.MARS, 60.0, sunLong).isCombust).toBe(true);
      // Mars at 70° (diff = 20° > 17°) -> Not combust
      expect(calculateCombustion(PlanetSymbol.MARS, 70.0, sunLong).isCombust).toBe(false);

      // Mercury at 63° (diff = 13°)
      // Direct (threshold 14°) -> Combust
      expect(calculateCombustion(PlanetSymbol.MERCURY, 63.0, sunLong, false).isCombust).toBe(true);
      // Retrograde (threshold 12°) -> Not combust
      expect(calculateCombustion(PlanetSymbol.MERCURY, 63.0, sunLong, true).isCombust).toBe(false);

      // Angular boundary wrapping around 0°/360°
      // Sun at 2° and Saturn at 350° (diff = 12° <= 15°) -> Combust
      expect(calculateCombustion(PlanetSymbol.SATURN, 350.0, 2.0).isCombust).toBe(true);
    });
  });

  describe('5. Planetary Avasthas (Baladi & Jagratadi)', () => {
    it('calculates Baladi Avastha in Odd signs', () => {
      // Sign 1 (Aries, Odd)
      expect(calculateBaladiAvastha(1, 3.0).baladi).toBe('BALA');
      expect(calculateBaladiAvastha(1, 8.0).baladi).toBe('KUMARA');
      expect(calculateBaladiAvastha(1, 15.0).baladi).toBe('YUVA');
      expect(calculateBaladiAvastha(1, 21.0).baladi).toBe('VRIDDHA');
      expect(calculateBaladiAvastha(1, 27.0).baladi).toBe('MRITA');
    });

    it('calculates Baladi Avastha in Even signs (reversed order)', () => {
      // Sign 2 (Taurus, Even)
      expect(calculateBaladiAvastha(2, 3.0).baladi).toBe('MRITA');
      expect(calculateBaladiAvastha(2, 8.0).baladi).toBe('VRIDDHA');
      expect(calculateBaladiAvastha(2, 15.0).baladi).toBe('YUVA');
      expect(calculateBaladiAvastha(2, 21.0).baladi).toBe('KUMARA');
      expect(calculateBaladiAvastha(2, 27.0).baladi).toBe('BALA');
    });

    it('calculates Jagratadi Avastha based on dignity', () => {
      expect(calculateJagratadiAvastha('EXALTED')).toBe('JAGRATA');
      expect(calculateJagratadiAvastha('MOOLATRIKONA')).toBe('JAGRATA');
      expect(calculateJagratadiAvastha('OWN_SIGN')).toBe('JAGRATA');

      expect(calculateJagratadiAvastha('GREAT_FRIEND')).toBe('SWAPNA');
      expect(calculateJagratadiAvastha('FRIEND')).toBe('SWAPNA');
      expect(calculateJagratadiAvastha('NEUTRAL')).toBe('SWAPNA');

      expect(calculateJagratadiAvastha('ENEMY')).toBe('SUSHUPTI');
      expect(calculateJagratadiAvastha('GREAT_ENEMY')).toBe('SUSHUPTI');
      expect(calculateJagratadiAvastha('DEBILITATED')).toBe('SUSHUPTI');
    });
  });

  describe('6. Chara Karakas (Parashari 7-Karaka System)', () => {
    it('ranks planets descending by degree within sign', () => {
      const degrees = {
        [PlanetSymbol.SUN]: 28.5,
        [PlanetSymbol.MOON]: 24.2,
        [PlanetSymbol.MARS]: 19.8,
        [PlanetSymbol.MERCURY]: 15.1,
        [PlanetSymbol.JUPITER]: 12.4,
        [PlanetSymbol.VENUS]: 7.6,
        [PlanetSymbol.SATURN]: 2.1,
      };

      const karakas = calculateCharaKarakas(degrees);
      expect(karakas).toHaveLength(7);

      expect(karakas[0].planet).toBe(PlanetSymbol.SUN);
      expect(karakas[0].code).toBe('AK');
      expect(karakas[0].karaka).toBe('ATMAKARAKA');

      expect(karakas[1].planet).toBe(PlanetSymbol.MOON);
      expect(karakas[1].code).toBe('AmK');

      expect(karakas[2].planet).toBe(PlanetSymbol.MARS);
      expect(karakas[2].code).toBe('BK');

      expect(karakas[3].planet).toBe(PlanetSymbol.MERCURY);
      expect(karakas[3].code).toBe('MK');

      expect(karakas[4].planet).toBe(PlanetSymbol.JUPITER);
      expect(karakas[4].code).toBe('PK');

      expect(karakas[5].planet).toBe(PlanetSymbol.VENUS);
      expect(karakas[5].code).toBe('GK');

      expect(karakas[6].planet).toBe(PlanetSymbol.SATURN);
      expect(karakas[6].code).toBe('DK');
      expect(karakas[6].karaka).toBe('DARAKARAKA');
    });

    it('breaks ties deterministically by canonical planetary priority', () => {
      const degrees = {
        [PlanetSymbol.MARS]: 15.0,
        [PlanetSymbol.SUN]: 15.0, // Identical degree to Mars
        [PlanetSymbol.MOON]: 10.0,
      };

      const karakas = calculateCharaKarakas(degrees);
      // Sun takes precedence over Mars
      expect(karakas[0].planet).toBe(PlanetSymbol.SUN);
      expect(karakas[0].code).toBe('AK');
      expect(karakas[1].planet).toBe(PlanetSymbol.MARS);
      expect(karakas[1].code).toBe('AmK');
    });
  });

  describe('7. Graha Yuddha (Planetary War) & Conjunctions', () => {
    it('detects Graha Yuddha when two true planets are within 1 degree', () => {
      const planets = [
        { planet: PlanetSymbol.MARS, longitude: 45.2, latitude: 1.5, rashiIndex: 2 },
        { planet: PlanetSymbol.VENUS, longitude: 45.8, latitude: -0.8, rashiIndex: 2 },
      ];

      const wars = calculatePlanetaryWars(planets);
      expect(wars).toHaveLength(1);
      expect(wars[0].longitudinalSeparation).toBeCloseTo(0.6, 2);
      // Mars has higher northern latitude (1.5 > -0.8) -> Mars is victor
      expect(wars[0].victor).toBe(PlanetSymbol.MARS);
      expect(wars[0].defeated).toBe(PlanetSymbol.VENUS);
    });

    it('does not trigger Graha Yuddha for Sun, Moon, or Nodes', () => {
      const planets = [
        { planet: PlanetSymbol.SUN, longitude: 45.2, latitude: 0.0, rashiIndex: 2 },
        { planet: PlanetSymbol.MARS, longitude: 45.4, latitude: 1.5, rashiIndex: 2 },
      ];

      const wars = calculatePlanetaryWars(planets);
      expect(wars).toHaveLength(0); // Sun cannot enter Graha Yuddha
    });

    it('identifies conjunctions and tight conjunctions within 3.5 degrees', () => {
      const planets = [
        { planet: PlanetSymbol.JUPITER, longitude: 120.0, latitude: 0.5, rashiIndex: 5 },
        { planet: PlanetSymbol.VENUS, longitude: 122.5, latitude: -1.0, rashiIndex: 5 },
        { planet: PlanetSymbol.MARS, longitude: 128.0, latitude: 1.2, rashiIndex: 5 },
      ];

      const conjunctions = calculateConjunctions(planets);
      expect(conjunctions).toHaveLength(3);

      const jupVen = conjunctions.find(
        (c) => (c.planet1 === PlanetSymbol.JUPITER && c.planet2 === PlanetSymbol.VENUS)
      );
      expect(jupVen?.angularSeparation).toBe(2.5);
      expect(jupVen?.isTight).toBe(true);

      const jupMars = conjunctions.find(
        (c) => (c.planet1 === PlanetSymbol.JUPITER && c.planet2 === PlanetSymbol.MARS)
      );
      expect(jupMars?.angularSeparation).toBe(8.0);
      expect(jupMars?.isTight).toBe(false);
    });
  });

  describe('8. Planetary Intelligence Calculator (Unified Orchestration)', () => {
    it('generates a complete, structured PlanetaryIntelligenceReport', () => {
      const calc = new PlanetaryIntelligenceCalculator();

      const facts = [
        { planet: PlanetSymbol.SUN, longitude: 45.0, rashiIndex: 2, degreeInRashi: 15.0, house: 2, latitude: 0, speedLongitude: 0.98, isRetrograde: false },
        { planet: PlanetSymbol.MOON, longitude: 110.0, rashiIndex: 4, degreeInRashi: 20.0, house: 4, latitude: 4.2, speedLongitude: 13.1, isRetrograde: false },
        { planet: PlanetSymbol.MARS, longitude: 280.0, rashiIndex: 10, degreeInRashi: 10.0, house: 10, latitude: -1.1, speedLongitude: 0.65, isRetrograde: false },
        { planet: PlanetSymbol.MERCURY, longitude: 52.0, rashiIndex: 2, degreeInRashi: 22.0, house: 2, latitude: 1.8, speedLongitude: -0.2, isRetrograde: true },
        { planet: PlanetSymbol.JUPITER, longitude: 95.0, rashiIndex: 4, degreeInRashi: 5.0, house: 4, latitude: 0.2, speedLongitude: 0.08, isRetrograde: false },
        { planet: PlanetSymbol.VENUS, longitude: 350.0, rashiIndex: 12, degreeInRashi: 20.0, house: 12, latitude: -2.3, speedLongitude: 1.1, isRetrograde: false },
        { planet: PlanetSymbol.SATURN, longitude: 200.0, rashiIndex: 7, degreeInRashi: 20.0, house: 7, latitude: 2.1, speedLongitude: 0.04, isRetrograde: false },
        { planet: PlanetSymbol.RAHU, longitude: 320.0, rashiIndex: 11, degreeInRashi: 20.0, house: 11, latitude: 0.0, speedLongitude: -0.05, isRetrograde: true },
        { planet: PlanetSymbol.KETU, longitude: 140.0, rashiIndex: 5, degreeInRashi: 20.0, house: 5, latitude: 0.0, speedLongitude: -0.05, isRetrograde: true },
      ];

      const report = calc.calculateFromFacts(facts);

      expect(report.planets).toBeDefined();
      expect(report.charaKarakas).toHaveLength(7);
      expect(report.conjunctions.length).toBeGreaterThanOrEqual(1);

      // Sun
      const sun = report.planets[PlanetSymbol.SUN]!;
      expect(sun.planet).toBe(PlanetSymbol.SUN);
      expect(sun.combustion.isCombust).toBe(false);
      expect(sun.avastha.baladi).toBeDefined();
      expect(sun.aspectedHouses.length).toBeGreaterThanOrEqual(1);

      // Mars (in Capricorn -> Exalted)
      const mars = report.planets[PlanetSymbol.MARS]!;
      expect(mars.dignity).toBe('EXALTED');
      expect(mars.aspectedHouses).toHaveLength(3); // 4th, 7th, 8th

      // Mercury (diff from Sun: 52 - 45 = 7° <= 12° for retrograde) -> Combust
      const mercury = report.planets[PlanetSymbol.MERCURY]!;
      expect(mercury.combustion.isCombust).toBe(true);
      expect(mercury.isRetrograde).toBe(true);

      // Saturn (in Libra -> Exalted)
      const saturn = report.planets[PlanetSymbol.SATURN]!;
      expect(saturn.dignity).toBe('EXALTED');

      // Venus (in Pisces -> Exalted)
      const venus = report.planets[PlanetSymbol.VENUS]!;
      expect(venus.dignity).toBe('EXALTED');

      // Jupiter (in Cancer -> Exalted)
      const jupiter = report.planets[PlanetSymbol.JUPITER]!;
      expect(jupiter.dignity).toBe('EXALTED');
    });
  });
});

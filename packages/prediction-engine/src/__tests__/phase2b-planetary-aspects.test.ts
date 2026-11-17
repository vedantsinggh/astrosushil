import { describe, it, expect } from 'vitest';
import { normalizeAstroChart } from '@astro/astrology-engine';
import { careerEvidenceEngine } from '../services/career-evidence.engine';
import { careerAnalysisValidator } from '../validation/career-analysis.validator';
import { MockCareerAnalysisProvider } from '../providers/mock-career-analysis.provider';
import { CareerAnalysisInput, PlanetaryEvidenceItem, HouseEvidenceItem, AspectEvidenceRecord } from '../types/evidence.types';

describe('Phase 2B: Planetary Aspect Evidence Integration & Interpretation Integrity', () => {
  // Independent Truth Tables for Vedic Parashari Drishti
  // Formula: targetHouse = ((sourceHouse - 1 + (ordinal - 1)) % 12) + 1
  const SATURN_EXPECTED_ASPECTS: Record<number, number[]> = {
    1: [3, 7, 10],
    2: [4, 8, 11],
    3: [5, 9, 12],
    4: [6, 10, 1],
    5: [7, 11, 2],
    6: [8, 12, 3],
    7: [9, 1, 4],
    8: [10, 2, 5],
    9: [11, 3, 6],
    10: [12, 4, 7],
    11: [1, 5, 8],
    12: [2, 6, 9],
  };

  const JUPITER_EXPECTED_ASPECTS: Record<number, number[]> = {
    1: [5, 7, 9],
    2: [6, 8, 10],
    3: [7, 9, 11],
    4: [8, 10, 12],
    5: [9, 11, 1],
    6: [10, 12, 2],
    7: [11, 1, 3],
    8: [12, 2, 4],
    9: [1, 3, 5],
    10: [2, 4, 6],
    11: [3, 5, 7],
    12: [4, 6, 8],
  };

  const MARS_EXPECTED_ASPECTS: Record<number, number[]> = {
    1: [4, 7, 8],
    2: [5, 8, 9],
    3: [6, 9, 10],
    4: [7, 10, 11],
    5: [8, 11, 12],
    6: [9, 12, 1],
    7: [10, 1, 2],
    8: [11, 2, 3],
    9: [12, 3, 4],
    10: [1, 4, 5],
    11: [2, 5, 6],
    12: [3, 6, 7],
  };

  const SEVENTH_OPPOSITION_EXPECTED: Record<number, number> = {
    1: 7, 2: 8, 3: 9, 4: 10, 5: 11, 6: 12,
    7: 1, 8: 2, 9: 3, 10: 4, 11: 5, 12: 6,
  };

  // Helper to construct deterministic normalized charts
  function createTestChartWithPlanet(planetName: string, houseNumber: number, signName: string) {
    const signs = [
      'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
    ];
    const ascSign = 'Aries';

    const planets = [
      { name: 'Sun', sign: 'Aries', degree: 10, house: 1, retrograde: false },
      { name: 'Moon', sign: 'Taurus', degree: 10, house: 2, retrograde: false },
      { name: 'Mars', sign: 'Gemini', degree: 10, house: 3, retrograde: false },
      { name: 'Mercury', sign: 'Cancer', degree: 10, house: 4, retrograde: false },
      { name: 'Jupiter', sign: 'Leo', degree: 10, house: 5, retrograde: false },
      { name: 'Venus', sign: 'Virgo', degree: 10, house: 6, retrograde: false },
      { name: 'Saturn', sign: 'Libra', degree: 10, house: 7, retrograde: false },
      { name: 'Rahu', sign: 'Scorpio', degree: 10, house: 8, retrograde: true },
      { name: 'Ketu', sign: 'Taurus', degree: 10, house: 2, retrograde: true },
    ];

    // Override the target planet
    const target = planets.find((p) => p.name.toUpperCase() === planetName.toUpperCase());
    if (target) {
      target.house = houseNumber;
      target.sign = signName;
    }

    const rawChart: any = {
      ascendant: { sign: ascSign, degree: 15.0 },
      planets,
      houses: Array.from({ length: 12 }, (_, i) => ({
        houseNumber: i + 1,
        sign: signs[i],
        degree: 15.0,
      })),
    };

    return normalizeAstroChart(rawChart);
  }

  // 1. Saturn Aspects Across All 12 Houses
  it('1. Correctly calculates Saturn 3rd, 7th, and 10th aspects across all 12 source houses', () => {
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    for (let h = 1; h <= 12; h++) {
      const chart = createTestChartWithPlanet('Saturn', h, signs[h - 1]);
      const evidence = careerEvidenceEngine.buildCareerAnalysisInput(chart);
      const saturnEv = evidence.planetaryEvidence.find((p) => p.planet.toUpperCase() === 'SATURN');

      expect(saturnEv).toBeDefined();
      expect(saturnEv!.aspects).toEqual(SATURN_EXPECTED_ASPECTS[h]);
      expect(saturnEv!.aspectRecords).toHaveLength(3);
      expect(saturnEv!.aspectRecords.map((r) => r.aspectOrdinal)).toEqual([3, 7, 10]);
      expect(saturnEv!.aspectRecords.map((r) => r.targetHouse)).toEqual(SATURN_EXPECTED_ASPECTS[h]);
      expect(saturnEv!.aspectRecords.every((r) => r.tradition === 'Parashari')).toBe(true);
      expect(saturnEv!.aspectRecords.every((r) => r.calculationReference.includes('BPHS'))).toBe(true);
    }
  });

  // 2. Jupiter Aspects Across All 12 Houses
  it('2. Correctly calculates Jupiter 5th, 7th, and 9th aspects across all 12 source houses', () => {
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    for (let h = 1; h <= 12; h++) {
      const chart = createTestChartWithPlanet('Jupiter', h, signs[h - 1]);
      const evidence = careerEvidenceEngine.buildCareerAnalysisInput(chart);
      const jupEv = evidence.planetaryEvidence.find((p) => p.planet.toUpperCase() === 'JUPITER');

      expect(jupEv).toBeDefined();
      expect(jupEv!.aspects).toEqual(JUPITER_EXPECTED_ASPECTS[h]);
      expect(jupEv!.aspectRecords).toHaveLength(3);
      expect(jupEv!.aspectRecords.map((r) => r.aspectOrdinal)).toEqual([5, 7, 9]);
      expect(jupEv!.aspectRecords.map((r) => r.targetHouse)).toEqual(JUPITER_EXPECTED_ASPECTS[h]);
    }
  });

  // 3. Mars Aspects Across All 12 Houses
  it('3. Correctly calculates Mars 4th, 7th, and 8th aspects across all 12 source houses', () => {
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    for (let h = 1; h <= 12; h++) {
      const chart = createTestChartWithPlanet('Mars', h, signs[h - 1]);
      const evidence = careerEvidenceEngine.buildCareerAnalysisInput(chart);
      const marsEv = evidence.planetaryEvidence.find((p) => p.planet.toUpperCase() === 'MARS');

      expect(marsEv).toBeDefined();
      expect(marsEv!.aspects).toEqual(MARS_EXPECTED_ASPECTS[h]);
      expect(marsEv!.aspectRecords).toHaveLength(3);
      expect(marsEv!.aspectRecords.map((r) => r.aspectOrdinal)).toEqual([4, 7, 8]);
      expect(marsEv!.aspectRecords.map((r) => r.targetHouse)).toEqual(MARS_EXPECTED_ASPECTS[h]);
    }
  });

  // 4. Standard 7th Aspects for Sun, Moon, Mercury, Venus Across All 12 Houses
  it('4. Correctly calculates standard 7th opposition aspects for Sun, Moon, Mercury, and Venus across all 12 houses', () => {
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const standardPlanets = ['Sun', 'Moon', 'Mercury', 'Venus'];

    for (const pName of standardPlanets) {
      for (let h = 1; h <= 12; h++) {
        const chart = createTestChartWithPlanet(pName, h, signs[h - 1]);
        const evidence = careerEvidenceEngine.buildCareerAnalysisInput(chart);
        const pEv = evidence.planetaryEvidence.find((p) => p.planet.toUpperCase() === pName.toUpperCase());

        expect(pEv).toBeDefined();
        expect(pEv!.aspects).toEqual([SEVENTH_OPPOSITION_EXPECTED[h]]);
        expect(pEv!.aspectRecords).toHaveLength(1);
        expect(pEv!.aspectRecords[0].aspectOrdinal).toBe(7);
        expect(pEv!.aspectRecords[0].targetHouse).toBe(SEVENTH_OPPOSITION_EXPECTED[h]);
      }
    }
  });

  // 5. Rahu and Ketu Exclusion Under Standard Parashari Tradition
  it('5. Strictly excludes Rahu and Ketu from casting Parashari aspects', () => {
    const chart = createTestChartWithPlanet('Rahu', 4, 'Cancer');
    const evidence = careerEvidenceEngine.buildCareerAnalysisInput(chart);

    const rahuEv = evidence.planetaryEvidence.find((p) => p.planet.toUpperCase() === 'RAHU');
    const ketuEv = evidence.planetaryEvidence.find((p) => p.planet.toUpperCase() === 'KETU');

    expect(rahuEv).toBeDefined();
    expect(rahuEv!.aspects).toEqual([]);
    expect(rahuEv!.aspectRecords).toEqual([]);

    expect(ketuEv).toBeDefined();
    expect(ketuEv!.aspects).toEqual([]);
    expect(ketuEv!.aspectRecords).toEqual([]);
  });

  // 6. House Evidence: Aspects Received by All 12 Houses
  it('6. Correctly maps received aspects into houseEvidence for all 12 houses without counting occupants as aspects', () => {
    // Chart:
    // Sun in H1 -> aspects H7
    // Jupiter in H1 -> aspects H5, H7, H9
    // Saturn in H1 -> aspects H3, H7, H10
    // Mars in H1 -> aspects H4, H7, H8
    const rawChart: any = {
      ascendant: { sign: 'Aries', degree: 15.0 },
      planets: [
        { name: 'Sun', sign: 'Aries', degree: 10, house: 1, retrograde: false },
        { name: 'Mars', sign: 'Aries', degree: 12, house: 1, retrograde: false },
        { name: 'Jupiter', sign: 'Aries', degree: 14, house: 1, retrograde: false },
        { name: 'Saturn', sign: 'Aries', degree: 16, house: 1, retrograde: false },
        { name: 'Moon', sign: 'Aries', degree: 18, house: 1, retrograde: false },
        { name: 'Mercury', sign: 'Aries', degree: 20, house: 1, retrograde: false },
        { name: 'Venus', sign: 'Aries', degree: 22, house: 1, retrograde: false },
        { name: 'Rahu', sign: 'Aries', degree: 24, house: 1, retrograde: true },
        { name: 'Ketu', sign: 'Libra', degree: 24, house: 7, retrograde: true },
      ],
      houses: Array.from({ length: 12 }, (_, i) => ({
        houseNumber: i + 1,
        sign: 'Aries',
        degree: 15.0,
      })),
    };

    const normalized = normalizeAstroChart(rawChart);
    const evidence = careerEvidenceEngine.buildCareerAnalysisInput(normalized);

    // House 1 occupants: Sun, Mars, Jupiter, Saturn, Moon, Mercury, Venus, Rahu
    const h1 = evidence.houseEvidence.find((h) => h.houseNumber === 1);
    expect(h1).toBeDefined();
    expect(h1!.occupants).toContain('SUN');
    expect(h1!.occupants).toContain('SATURN');
    // None of the House 1 planets aspect House 1
    expect(h1!.aspects).toEqual([]);
    expect(h1!.aspectRecords).toEqual([]);

    // House 3 receives Saturn's 3rd aspect
    const h3 = evidence.houseEvidence.find((h) => h.houseNumber === 3);
    expect(h3!.aspectRecords.some((r) => r.sourcePlanet.toUpperCase() === 'SATURN' && r.aspectOrdinal === 3)).toBe(true);

    // House 4 receives Mars's 4th aspect
    const h4 = evidence.houseEvidence.find((h) => h.houseNumber === 4);
    expect(h4!.aspectRecords.some((r) => r.sourcePlanet.toUpperCase() === 'MARS' && r.aspectOrdinal === 4)).toBe(true);

    // House 5 receives Jupiter's 5th aspect
    const h5 = evidence.houseEvidence.find((h) => h.houseNumber === 5);
    expect(h5!.aspectRecords.some((r) => r.sourcePlanet.toUpperCase() === 'JUPITER' && r.aspectOrdinal === 5)).toBe(true);

    // House 7 receives 7th opposition from Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn (7 planets)
    const h7 = evidence.houseEvidence.find((h) => h.houseNumber === 7);
    expect(h7!.aspectRecords).toHaveLength(7);
    expect(h7!.aspectRecords.map((r) => r.sourcePlanet.toUpperCase())).toEqual([
      'SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN',
    ]);

    // House 8 receives Mars's 8th aspect
    const h8 = evidence.houseEvidence.find((h) => h.houseNumber === 8);
    expect(h8!.aspectRecords.some((r) => r.sourcePlanet.toUpperCase() === 'MARS' && r.aspectOrdinal === 8)).toBe(true);

    // House 9 receives Jupiter's 9th aspect
    const h9 = evidence.houseEvidence.find((h) => h.houseNumber === 9);
    expect(h9!.aspectRecords.some((r) => r.sourcePlanet.toUpperCase() === 'JUPITER' && r.aspectOrdinal === 9)).toBe(true);

    // House 10 receives Saturn's 10th aspect
    const h10 = evidence.houseEvidence.find((h) => h.houseNumber === 10);
    expect(h10!.aspectRecords.some((r) => r.sourcePlanet.toUpperCase() === 'SATURN' && r.aspectOrdinal === 10)).toBe(true);

    // Houses 2, 6, 11, 12 receive no aspects
    expect(evidence.houseEvidence.find((h) => h.houseNumber === 2)!.aspects).toEqual([]);
    expect(evidence.houseEvidence.find((h) => h.houseNumber === 6)!.aspects).toEqual([]);
    expect(evidence.houseEvidence.find((h) => h.houseNumber === 11)!.aspects).toEqual([]);
    expect(evidence.houseEvidence.find((h) => h.houseNumber === 12)!.aspects).toEqual([]);
  });

  // 7. Evidence Cross-Consistency: 1-to-1 Match Between Planetary Aspects Cast and House Aspects Received
  it('7. Guarantees 100% mathematical cross-consistency between planetary aspects cast and house aspects received', () => {
    const chart = createTestChartWithPlanet('Saturn', 10, 'Capricorn');
    const evidence = careerEvidenceEngine.buildCareerAnalysisInput(chart);

    const valResult = careerAnalysisValidator.validateAspectEvidence(evidence);
    expect(valResult.isValid).toBe(true);
    expect(valResult.errors).toHaveLength(0);
  });

  // 8. Validator Rejects Unsupported Planetary Relationships
  it('8. Validator rejects unsupported aspect ordinals for planets (e.g. Venus 5th aspect, Sun 10th aspect)', () => {
    const invalidInput: any = {
      planetaryEvidence: [
        {
          planet: 'Venus',
          house: 1,
          aspects: [5],
          aspectRecords: [
            {
              sourcePlanet: 'Venus',
              sourceSign: 'Aries',
              sourceHouse: 1,
              targetHouse: 5,
              targetSign: 'Leo',
              aspectType: '5th aspect',
              aspectOrdinal: 5, // Invalid for Venus
              tradition: 'Parashari',
              calculationReference: 'BPHS Ch. 26',
            },
          ],
        },
      ],
      houseEvidence: [
        {
          houseNumber: 5,
          aspectRecords: [
            {
              sourcePlanet: 'Venus',
              sourceSign: 'Aries',
              sourceHouse: 1,
              targetHouse: 5,
              targetSign: 'Leo',
              aspectType: '5th aspect',
              aspectOrdinal: 5,
              tradition: 'Parashari',
              calculationReference: 'BPHS Ch. 26',
            },
          ],
        },
      ],
    };

    const valResult = careerAnalysisValidator.validateAspectEvidence(invalidInput);
    expect(valResult.isValid).toBe(false);
    expect(valResult.errors.some((e) => e.includes('Unsupported aspect ordinal 5 for planet Venus'))).toBe(true);
  });

  // 9. Validator Rejects Contradictory Target Houses / Math Errors
  it('9. Validator rejects incorrect aspect target offset math', () => {
    const corruptedMathInput: any = {
      planetaryEvidence: [
        {
          planet: 'Saturn',
          house: 1,
          aspects: [4],
          aspectRecords: [
            {
              sourcePlanet: 'Saturn',
              sourceSign: 'Aries',
              sourceHouse: 1,
              targetHouse: 4, // Corrupted: 3rd aspect from H1 should be H3, not H4
              targetSign: 'Cancer',
              aspectType: '3rd aspect',
              aspectOrdinal: 3,
              tradition: 'Parashari',
              calculationReference: 'BPHS Ch. 26',
            },
          ],
        },
      ],
      houseEvidence: [],
    };

    const valResult = careerAnalysisValidator.validateAspectEvidence(corruptedMathInput);
    expect(valResult.isValid).toBe(false);
    expect(valResult.errors.some((e) => e.includes('Incorrect aspect offset for Saturn'))).toBe(true);
  });

  // 10. Validator Rejects Duplicate Aspect Records
  it('10. Validator rejects duplicate aspect records on planets and houses', () => {
    const duplicateAspectRecord: AspectEvidenceRecord = {
      sourcePlanet: 'Saturn',
      sourceSign: 'Aries',
      sourceHouse: 1,
      targetHouse: 3,
      targetSign: 'Gemini',
      aspectType: '3rd aspect',
      aspectOrdinal: 3,
      tradition: 'Parashari',
      calculationReference: 'BPHS Ch. 26',
    };

    const duplicateInput: any = {
      planetaryEvidence: [
        {
          planet: 'Saturn',
          house: 1,
          aspects: [3, 3],
          aspectRecords: [duplicateAspectRecord, duplicateAspectRecord],
        },
      ],
      houseEvidence: [],
    };

    const valResult = careerAnalysisValidator.validateAspectEvidence(duplicateInput);
    expect(valResult.isValid).toBe(false);
    expect(valResult.errors.some((e) => e.includes('Duplicate aspect ordinal 3'))).toBe(true);
  });

  // 11. Validator Rejects Missing Provenance
  it('11. Validator rejects aspect records with missing tradition or calculation provenance', () => {
    const missingProvenanceInput: any = {
      planetaryEvidence: [
        {
          planet: 'Jupiter',
          house: 1,
          aspects: [5],
          aspectRecords: [
            {
              sourcePlanet: 'Jupiter',
              sourceSign: 'Aries',
              sourceHouse: 1,
              targetHouse: 5,
              targetSign: 'Leo',
              aspectType: '5th aspect',
              aspectOrdinal: 5,
              tradition: '', // Missing
              calculationReference: '', // Missing
            },
          ],
        },
      ],
      houseEvidence: [],
    };

    const valResult = careerAnalysisValidator.validateAspectEvidence(missingProvenanceInput);
    expect(valResult.isValid).toBe(false);
    expect(valResult.errors.some((e) => e.includes('Missing tradition provenance'))).toBe(true);
    expect(valResult.errors.some((e) => e.includes('Missing calculation reference'))).toBe(true);
  });

  // 12. MockCareerAnalysisProvider Produces Valid Interpretations with Real Aspect Evidence
  it('12. MockCareerAnalysisProvider formats valid aspect evidence without fabrication', async () => {
    const chart = createTestChartWithPlanet('Saturn', 10, 'Capricorn');
    const evidence = careerEvidenceEngine.buildCareerAnalysisInput(chart);

    const provider = new MockCareerAnalysisProvider();
    const analysis = await provider.analyze(evidence);

    expect(analysis).toBeDefined();
    expect(analysis.houseInterpretations).toHaveLength(12);
    expect(analysis.planetInterpretations).toHaveLength(9);

    // Verify House 12 interpretation mentions Saturn's aspect
    const h12Int = analysis.houseInterpretations.find((h) => h.houseNumber === 12);
    expect(h12Int?.houseMeaning.toUpperCase()).toContain('SATURN (3RD ASPECT FROM HOUSE 10');

    // Verify Saturn planet interpretation mentions aspects cast
    const satInt = analysis.planetInterpretations.find((p) => p.planet.toUpperCase() === 'SATURN');
    expect(satInt?.careerSignificance).toContain('3rd aspect on House 12');
    expect(satInt?.careerSignificance).toContain('7th aspect on House 4');
    expect(satInt?.careerSignificance).toContain('10th aspect on House 7');

    // Run through careerAnalysisValidator
    const valResult = careerAnalysisValidator.validate(analysis, evidence);
    expect(valResult.isValid).toBe(true);
    expect(valResult.errors).toHaveLength(0);
  });

  // 13. Chart With Empty Aspect House Does Not Receive Invented Aspect Interpretations
  it('13. Houses with no aspect evidence do not receive invented aspect statements in interpretation', async () => {
    // In our test chart, House 2 receives no aspects
    const chart = createTestChartWithPlanet('Saturn', 10, 'Capricorn');
    const evidence = careerEvidenceEngine.buildCareerAnalysisInput(chart);

    const h2Ev = evidence.houseEvidence.find((h) => h.houseNumber === 2);
    expect(h2Ev!.aspects).toHaveLength(0);
    expect(h2Ev!.aspectRecords).toHaveLength(0);

    const provider = new MockCareerAnalysisProvider();
    const analysis = await provider.analyze(evidence);

    const h2Int = analysis.houseInterpretations.find((h) => h.houseNumber === 2);
    expect(h2Int?.houseMeaning).toContain('No major planetary aspects');
    expect(h2Int?.houseMeaning).not.toContain('Saturn (');
    expect(h2Int?.houseMeaning).not.toContain('Jupiter (');
    expect(h2Int?.houseMeaning).not.toContain('Mars (');
  });
});

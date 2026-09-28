import { describe, it, expect } from 'vitest';
import { normalizeAstroChart, AstroChart } from '@astro/astrology-engine';
import { careerEvidenceEngine, CareerEvidenceEngine } from '../services/career-evidence.engine';

describe('CareerEvidenceEngine Test Suite', () => {
  // Verified Aarav Sharma Chart Fixture
  const aaravSharmaChartFixture: AstroChart = {
    ascendant: {
      sign: 'Aries',
      degree: 15.42,
      nakshatra: 'Bharani',
      pada: 1,
    },
    planets: [
      { name: 'Sun', sign: 'Leo', degree: 10.5, house: 5, nakshatra: 'Magha', pada: 4, retrograde: false },
      { name: 'Moon', sign: 'Taurus', degree: 22.1, house: 2, nakshatra: 'Rohini', pada: 3, retrograde: false },
      { name: 'Mars', sign: 'Aries', degree: 5.0, house: 1, nakshatra: 'Ashwini', pada: 2, retrograde: false },
      { name: 'Mercury', sign: 'Virgo', degree: 12.8, house: 6, nakshatra: 'Hasta', pada: 1, retrograde: false },
      { name: 'Jupiter', sign: 'Sagittarius', degree: 18.3, house: 9, nakshatra: 'Mula', pada: 2, retrograde: false },
      { name: 'Venus', sign: 'Libra', degree: 29.4, house: 7, nakshatra: 'Vishakha', pada: 3, retrograde: false },
      { name: 'Saturn', sign: 'Capricorn', degree: 8.2, house: 10, nakshatra: 'Uttara Ashadha', pada: 4, retrograde: true },
      { name: 'Rahu', sign: 'Gemini', degree: 14.1, house: 3, nakshatra: 'Ardra', pada: 2, retrograde: true },
      { name: 'Ketu', sign: 'Sagittarius', degree: 14.1, house: 9, nakshatra: 'Purva Ashadha', pada: 1, retrograde: true },
    ],
    houses: [
      { houseNumber: 1, sign: 'Aries', degree: 15.42 },
      { houseNumber: 2, sign: 'Taurus', degree: 15.42 },
      { houseNumber: 3, sign: 'Gemini', degree: 15.42 },
      { houseNumber: 4, sign: 'Cancer', degree: 15.42 },
      { houseNumber: 5, sign: 'Leo', degree: 15.42 },
      { houseNumber: 6, sign: 'Virgo', degree: 15.42 },
      { houseNumber: 7, sign: 'Libra', degree: 15.42 },
      { houseNumber: 8, sign: 'Scorpio', degree: 15.42 },
      { houseNumber: 9, sign: 'Sagittarius', degree: 15.42 },
      { houseNumber: 10, sign: 'Capricorn', degree: 15.42 },
      { houseNumber: 11, sign: 'Aquarius', degree: 15.42 },
      { houseNumber: 12, sign: 'Pisces', degree: 15.42 },
    ],
  };

  it('1. Should extract deterministic Career Axis evidence from NormalizedChart', () => {
    const normalized = normalizeAstroChart(aaravSharmaChartFixture);
    const result = careerEvidenceEngine.buildCareerAnalysisInput(normalized);

    expect(result.careerAxis.ascendantSign).toBe('Aries');
    expect(result.careerAxis.ascendantLord).toBe('Mars');
    expect(result.careerAxis.houseTenSign).toBe('Capricorn');
    expect(result.careerAxis.houseTenLord).toBe('Saturn');
    expect(result.careerAxis.houseTenLordHouse).toBe(10);
    expect(result.careerAxis.supportingFactors.length).toBeGreaterThan(0);
    expect(result.careerAxis.strength).toBeDefined();
  });

  it('2. Should evaluate Income / Financial evidence without specific career predictions', () => {
    const normalized = normalizeAstroChart(aaravSharmaChartFixture);
    const result = careerEvidenceEngine.buildCareerAnalysisInput(normalized);

    expect(result.incomeEvidence.wealthHouseSign).toBe('Taurus');
    expect(result.incomeEvidence.wealthHouseLord).toBe('Venus');
    expect(result.incomeEvidence.gainsHouseSign).toBe('Aquarius');
    expect(result.incomeEvidence.gainsHouseLord).toBe('Saturn');
    expect(result.incomeEvidence.relevantPlanets).toContain('JUPITER');
    expect(result.incomeEvidence.wealthHouseStrength).toBe('STRONG'); // Venus exalted/own sign in Libra
  });

  it('3. Should evaluate Work / Service evidence (6th house, Saturn, Mars)', () => {
    const normalized = normalizeAstroChart(aaravSharmaChartFixture);
    const result = careerEvidenceEngine.buildCareerAnalysisInput(normalized);

    expect(result.workEnvironmentEvidence.houseSixSign).toBe('Virgo');
    expect(result.workEnvironmentEvidence.houseSixLord).toBe('Mercury');
    expect(result.workEnvironmentEvidence.saturnPlacement.house).toBe(10);
    expect(result.workEnvironmentEvidence.marsPlacement.house).toBe(1);
    expect(result.workEnvironmentEvidence.operationalDiscipline).toBe('STRONG');
  });

  it('4. Should evaluate Leadership evidence (Sun, Mars, Saturn)', () => {
    const normalized = normalizeAstroChart(aaravSharmaChartFixture);
    const result = careerEvidenceEngine.buildCareerAnalysisInput(normalized);

    expect(result.leadershipEvidence.sunPlacement.sign).toBe('Leo');
    expect(result.leadershipEvidence.sunPlacement.dignity).toBe('OWN_SIGN');
    expect(result.leadershipEvidence.strength).toBe('STRONG');
    expect(result.leadershipEvidence.authorityIndicators.length).toBeGreaterThan(0);
  });

  it('5. Should evaluate Analytical and Technical evidence (Mercury in Virgo exalted)', () => {
    const normalized = normalizeAstroChart(aaravSharmaChartFixture);
    const result = careerEvidenceEngine.buildCareerAnalysisInput(normalized);

    expect(result.analyticalEvidence.mercuryPlacement.sign).toBe('Virgo');
    expect(result.analyticalEvidence.mercuryPlacement.dignity).toBe('EXALTED');
    expect(result.analyticalEvidence.strength).toBe('STRONG');
    expect(result.analyticalEvidence.analysisIndicators.length).toBeGreaterThan(0);
  });

  it('6. Should evaluate Communication, Creativity, Research, Entrepreneurship, International, & Networking evidence', () => {
    const normalized = normalizeAstroChart(aaravSharmaChartFixture);
    const result = careerEvidenceEngine.buildCareerAnalysisInput(normalized);

    expect(result.communicationEvidence.houseTwoSign).toBe('Taurus');
    expect(result.creativityEvidence.houseFiveSign).toBe('Leo');
    expect(result.researchEvidence.houseEightSign).toBe('Scorpio');
    expect(result.entrepreneurshipEvidence.houseTenSign).toBe('Capricorn');
    expect(result.internationalEvidence.houseTwelveSign).toBe('Pisces');
    expect(result.networkingEvidence.houseElevenSign).toBe('Aquarius');
  });

  it('7. Should construct structured evidence for all 9 planets and 7 career houses', () => {
    const normalized = normalizeAstroChart(aaravSharmaChartFixture);
    const result = careerEvidenceEngine.buildCareerAnalysisInput(normalized);

    expect(result.planetaryEvidence.length).toBe(9);
    const saturnEv = result.planetaryEvidence.find((p) => p.planet === 'Saturn');
    expect(saturnEv?.house).toBe(10);
    expect(saturnEv?.retrograde).toBe(true);

    expect(result.houseEvidence.length).toBe(7);
    const houseTenEv = result.houseEvidence.find((h) => h.houseNumber === 10);
    expect(houseTenEv?.sign).toBe('Capricorn');
  });

  it('8. Should handle unsupported Yoga and missing Dasha gracefully', () => {
    const normalized = normalizeAstroChart(aaravSharmaChartFixture);
    const result = careerEvidenceEngine.buildCareerAnalysisInput(normalized);

    expect(result.yogaEvidence.status).toBe('UNAVAILABLE');
    expect(result.yogaEvidence.unsupportedYogas).toContain('Gaja Kesari Yoga');
    expect(result.timingEvidence.status).toBe('UNAVAILABLE');
  });

  it('9. Should detect conflicting factors accurately without hiding contradictions', () => {
    const normalized = normalizeAstroChart(aaravSharmaChartFixture);
    const result = careerEvidenceEngine.buildCareerAnalysisInput(normalized);

    expect(result.evidenceConflicts.conflictingFactors).toBeDefined();
  });

  it('10. Should assign PARTIAL confidence when core chart exists but Dasha/Yoga info is missing', () => {
    const normalized = normalizeAstroChart(aaravSharmaChartFixture);
    const result = careerEvidenceEngine.buildCareerAnalysisInput(normalized);

    expect(result.confidence).toBe('PARTIAL');
  });

  it('11. Should assign INSUFFICIENT confidence when core chart is incomplete', () => {
    const incompleteChart: any = {
      ascendant: null,
      planets: [],
      houses: [],
    };
    const result = careerEvidenceEngine.buildCareerAnalysisInput(incompleteChart);

    expect(result.confidence).toBe('INSUFFICIENT');
  });

  it('12. Should NEVER output hardcoded job titles like "software engineer" or "doctor"', () => {
    const normalized = normalizeAstroChart(aaravSharmaChartFixture);
    const result = careerEvidenceEngine.buildCareerAnalysisInput(normalized);

    const jsonString = JSON.stringify(result).toLowerCase();
    expect(jsonString).not.toContain('software engineer');
    expect(jsonString).not.toContain('doctor');
    expect(jsonString).not.toContain('lawyer');
  });
});

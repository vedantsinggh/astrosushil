import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { normalizeAstroChart } from '@astro/astrology-engine';
import { careerEvidenceEngine } from '../services/career-evidence.engine';
import { MockCareerAnalysisProvider } from '../providers/mock-career-analysis.provider';
import { OpenRouterCareerAnalysisProvider } from '../providers/openrouter-career-analysis.provider';
import { careerAnalysisValidator } from '../validation/career-analysis.validator';
import { CareerAnalysisInput, CareerAnalysis } from '../types/evidence.types';

describe('LLM Career Analyst OpenRouter Provider & Validation Suite', () => {
  const aaravSharmaFixture: any = {
    ascendant: { sign: 'Aries', degree: 15.42, nakshatra: 'Bharani', pada: 1 },
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

  let normalizedChart: any;
  let analysisInput: CareerAnalysisInput;

  beforeAll(() => {
    normalizedChart = normalizeAstroChart(aaravSharmaFixture);
    analysisInput = careerEvidenceEngine.buildCareerAnalysisInput(normalizedChart);
  });

  it('1. Should generate valid CareerAnalysis using MockCareerAnalysisProvider fallback', async () => {
    const provider = new MockCareerAnalysisProvider();
    const result = await provider.analyze(analysisInput);

    expect(result.executiveCareerSummary).toBeDefined();
    expect(result.careerIdentity).toContain('Aries Ascendant');
    expect(result.houseInterpretations).toBeDefined();
    expect(result.planetInterpretations).toBeDefined();
    expect(result.recommendedFields?.length).toBeGreaterThan(0);
  });

  it('2. Should use Mock provider gracefully when OpenRouter API key is unconfigured', async () => {
    const provider = new OpenRouterCareerAnalysisProvider({ apiKey: '' });
    const result = await provider.analyze(analysisInput);

    expect(result.executiveCareerSummary).toBeDefined();
    expect(result.recommendedFields?.length).toBeGreaterThan(0);
  });

  it('3. Should reject invalid JSON or non-object payloads', () => {
    const valResult = careerAnalysisValidator.validate(null, analysisInput);
    expect(valResult.isValid).toBe(false);
    expect(valResult.errors[0]).toContain('not a valid object');
  });

  it('4. Should reject responses containing guaranteed predictions or forbidden tropes', () => {
    const invalidPayload = {
      executiveCareerSummary: 'You will become rich and wealthy beyond imagination.',
      executiveDecisionThemes: 'Themes',
      executiveRecommendations: 'Recs',
      careerIdentity: 'Identity',
      professionalPersonality: 'Personality',
      naturalStrengths: 'Strengths',
      professionalChallenges: 'Challenges',
      careerDNAAnalysis: 'DNA',
      planetarySynthesis: 'Synthesis',
      yogaAnalysis: 'Yogas',
      employmentEntrepreneurshipAnalysis: 'Analysis',
      leadershipAnalysis: 'Leadership',
      technicalAnalyticalAptitude: 'Aptitude',
      creativeCommunicationBusinessAptitude: 'Creative',
      researchPotential: 'Research',
      sectorFit: 'Fit',
      internationalCareer: 'you will definitely move abroad next year.',
      workEnvironment: 'Env',
      careerFieldsAnalysis: 'Fields',
      topCareerDirections: 'Directions',
      moneyIncomePattern: 'Pattern',
      relationshipsNetworking: 'Networking',
      recommendations: 'Recs',
      actionPlanSummary: 'Plan',
      finalSynthesis: 'Synthesis',
    };

    const valResult = careerAnalysisValidator.validate(invalidPayload, analysisInput);
    expect(valResult.isValid).toBe(false);
    expect(valResult.errors.some((e) => e.includes('Forbidden guaranteed prediction'))).toBe(true);
  });

  it('5. Should reject responses referencing invalid evidence IDs', async () => {
    const mockProvider = new MockCareerAnalysisProvider();
    const res = await mockProvider.analyze(analysisInput);

    const corruptRes = {
      ...res,
      recommendedFields: [
        {
          field: 'Test Field',
          rank: 'PRIMARY' as const,
          rationale: 'Test',
          supportingEvidence: 'Test',
          suitableFunctions: ['test'],
          suitableWorkMode: 'test',
          potentialChallenge: 'test',
          timingRelevance: 'test',
          evidenceIds: ['invalid-nonexistent-evidence-id-999'],
        },
      ],
    };

    const valResult = careerAnalysisValidator.validate(corruptRes, analysisInput);
    expect(valResult.isValid).toBe(false);
    expect(valResult.errors.some((e) => e.includes('Invalid evidence ID'))).toBe(true);
  });
});

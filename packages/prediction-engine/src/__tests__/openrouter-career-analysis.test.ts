import { describe, it, expect, beforeAll, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { normalizeAstroChart } from '@astro/astrology-engine';
import { careerEvidenceEngine } from '../services/career-evidence.engine';
import { MockCareerAnalysisProvider } from '../providers/mock-career-analysis.provider';
import { OpenRouterCareerAnalysisProvider } from '../providers/openrouter-career-analysis.provider';
import { careerAnalysisValidator } from '../validation/career-analysis.validator';
import { CareerAnalysisInput, CareerAnalysis } from '../types/evidence.types';
import { CAREER_ANALYST_SYSTEM_PROMPT } from '../prompts/career-analyst.prompt';

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
    expect(result.careerIdentity).toContain('Ascendant in Aries');
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

  it('6. Should execute exactly maxRetries total HTTP requests on transient errors without exceeding limit', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const provider = new OpenRouterCareerAnalysisProvider({
        apiKey: 'sk-or-test-key',
        maxRetries: 3,
        timeoutMs: 5000,
      });

      let requestCount = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        requestCount++;
        return {
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          text: async () => 'Service Unavailable',
        } as any;
      });

      await expect(provider.analyze(analysisInput)).rejects.toThrow(/OPENROUTER_ANALYSIS_FAILED/);
      // maxRetries = 3 means exactly 3 total attempts (1 initial + 2 retries), NEVER 4
      expect(requestCount).toBe(3);
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  it('7. Should abort immediately after exactly 1 HTTP request on non-transient HTTP 401 error', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const provider = new OpenRouterCareerAnalysisProvider({
        apiKey: 'sk-or-invalid-key',
        maxRetries: 3,
      });

      let requestCount = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        requestCount++;
        return {
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: async () => 'Invalid API Key',
        } as any;
      });

      await expect(provider.analyze(analysisInput)).rejects.toThrow(/OPENROUTER_ANALYSIS_FAILED/);
      // Non-transient 401 error aborts immediately after 1 attempt
      expect(requestCount).toBe(1);
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  it('8. Should reject immediately with 0 HTTP requests when credentials are missing in production', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const provider = new OpenRouterCareerAnalysisProvider({
        apiKey: '',
      });

      let requestCount = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        requestCount++;
        return {} as any;
      });

      await expect(provider.analyze(analysisInput)).rejects.toThrow(/AI_CREDENTIALS_MISSING/);
      expect(requestCount).toBe(0);
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  // =========================================================================
  // Strict Evidence Contract & Field Validation Tests (Phase 2B.4 Remediation)
  // =========================================================================
  describe('Strict Evidence Contract & Required Field Validator Tests', () => {
    let validAnalysis: CareerAnalysis;

    beforeAll(async () => {
      const mockProvider = new MockCareerAnalysisProvider();
      validAnalysis = await mockProvider.analyze(analysisInput);
    });

    it('9. Should reject missing evidenceIds in house interpretation', () => {
      const corrupt = JSON.parse(JSON.stringify(validAnalysis));
      delete corrupt.houseInterpretations[0].evidenceIds;
      const res = careerAnalysisValidator.validate(corrupt, analysisInput);
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes('evidenceIds (must be a non-empty array)'))).toBe(true);
    });

    it('10. Should reject non-array evidenceIds in house interpretation', () => {
      const corrupt = JSON.parse(JSON.stringify(validAnalysis));
      corrupt.houseInterpretations[0].evidenceIds = 'house-1'; // string instead of array
      const res = careerAnalysisValidator.validate(corrupt, analysisInput);
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes('evidenceIds (must be a non-empty array)'))).toBe(true);
    });

    it('11. Should reject empty array evidenceIds in house interpretation', () => {
      const corrupt = JSON.parse(JSON.stringify(validAnalysis));
      corrupt.houseInterpretations[0].evidenceIds = [];
      const res = careerAnalysisValidator.validate(corrupt, analysisInput);
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes('evidenceIds (must be a non-empty array)'))).toBe(true);
    });

    it('12. Should reject non-string, empty, or whitespace-only evidence IDs', () => {
      const corruptA = JSON.parse(JSON.stringify(validAnalysis));
      corruptA.houseInterpretations[0].evidenceIds = ['   '];
      const resA = careerAnalysisValidator.validate(corruptA, analysisInput);
      expect(resA.isValid).toBe(false);
      expect(resA.errors.some((e) => e.includes('non-string, empty, or whitespace-only evidence ID'))).toBe(true);

      const corruptB = JSON.parse(JSON.stringify(validAnalysis));
      corruptB.houseInterpretations[0].evidenceIds = [123];
      const resB = careerAnalysisValidator.validate(corruptB, analysisInput);
      expect(resB.isValid).toBe(false);
      expect(resB.errors.some((e) => e.includes('non-string, empty, or whitespace-only evidence ID'))).toBe(true);
    });

    it('13. Should reject missing or empty supportingEvidence for house interpretation', () => {
      const corrupt = JSON.parse(JSON.stringify(validAnalysis));
      delete corrupt.houseInterpretations[0].supportingEvidence;
      delete corrupt.houseInterpretations[0].evidence;
      const res = careerAnalysisValidator.validate(corrupt, analysisInput);
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes('supportingEvidence'))).toBe(true);
    });

    it('14. Should reject missing or empty placementSummary for planet interpretation', () => {
      const corrupt = JSON.parse(JSON.stringify(validAnalysis));
      delete corrupt.planetInterpretations[0].placementSummary;
      delete corrupt.planetInterpretations[0].summary;
      delete corrupt.planetInterpretations[0].placement;
      const res = careerAnalysisValidator.validate(corrupt, analysisInput);
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes('placementSummary'))).toBe(true);
    });

    it('15. Should reject missing evidenceIds or empty array in planet interpretation', () => {
      const corruptA = JSON.parse(JSON.stringify(validAnalysis));
      delete corruptA.planetInterpretations[0].evidenceIds;
      const resA = careerAnalysisValidator.validate(corruptA, analysisInput);
      expect(resA.isValid).toBe(false);
      expect(resA.errors.some((e) => e.includes('evidenceIds (must be a non-empty array)'))).toBe(true);

      const corruptB = JSON.parse(JSON.stringify(validAnalysis));
      corruptB.planetInterpretations[0].evidenceIds = [];
      const resB = careerAnalysisValidator.validate(corruptB, analysisInput);
      expect(resB.isValid).toBe(false);
      expect(resB.errors.some((e) => e.includes('evidenceIds (must be a non-empty array)'))).toBe(true);
    });

    it('15A. Test A: Should reject house interpretation referencing a valid planetary evidence ID (opposite category)', () => {
      const corrupt = JSON.parse(JSON.stringify(validAnalysis));
      // Pick actual planetary evidence ID from analysisInput (planet-mars)
      const validPlanetaryId = `planet-${analysisInput.planetaryEvidence[2].planet.toLowerCase()}`;
      expect(analysisInput.planetaryEvidence.some((p) => `planet-${p.planet.toLowerCase()}` === validPlanetaryId)).toBe(true);

      corrupt.houseInterpretations[0].evidenceIds = [validPlanetaryId];
      const res = careerAnalysisValidator.validate(corrupt, analysisInput);
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes(`Invalid evidence ID referenced in House 1 interpretation: "${validPlanetaryId}"`))).toBe(true);
    });

    it('15B. Test B: Should reject planet interpretation referencing a valid house evidence ID (opposite category)', () => {
      const corrupt = JSON.parse(JSON.stringify(validAnalysis));
      // Pick actual house evidence ID from analysisInput (house-1)
      const validHouseId = `house-${analysisInput.houseEvidence[0].houseNumber}`;
      expect(analysisInput.houseEvidence.some((h) => `house-${h.houseNumber}` === validHouseId)).toBe(true);

      corrupt.planetInterpretations[0].evidenceIds = [validHouseId];
      const res = careerAnalysisValidator.validate(corrupt, analysisInput);
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes(`Invalid evidence ID referenced in Planet SUN interpretation: "${validHouseId}"`))).toBe(true);
    });

    it('15C. Should accept valid same-category evidence IDs for houses and planets', () => {
      const validCopy = JSON.parse(JSON.stringify(validAnalysis));
      // House 1 uses actual house evidence ID
      validCopy.houseInterpretations[0].evidenceIds = [`house-${analysisInput.houseEvidence[0].houseNumber}`];
      // Planet SUN uses actual planetary evidence ID
      validCopy.planetInterpretations[0].evidenceIds = [`planet-${analysisInput.planetaryEvidence[0].planet.toLowerCase()}`];

      const res = careerAnalysisValidator.validate(validCopy, analysisInput);
      expect(res.isValid).toBe(true);
      expect(res.errors.length).toBe(0);
    });

    it('15D. Career analyst system prompt instructions and examples do not encourage cross-category evidence references', () => {
      // Prompt explicitly documents category restrictions
      expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('Do NOT cite planetary evidence IDs in house interpretations');
      expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('Do NOT cite house evidence IDs in planet interpretations');
      expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('May reference evidence across categories');

      // Prompt house interpretation example does NOT contain cross-category planetary evidence IDs
      expect(CAREER_ANALYST_SYSTEM_PROMPT).not.toContain('"evidenceIds": ["house-1", "planet-mars"]');
      expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('"evidenceIds": ["house-1"]');
      expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('"evidenceIds": ["planet-sun"]');
    });
  });

  // =========================================================================
  // Production Provider Parse Seam & Response Handling Path Tests
  // =========================================================================
  describe('OpenRouter Production Parser Seam & Response Handling Pipeline', () => {
    let validAnalysis: CareerAnalysis;
    let validRawJson: string;
    let markdownWrappedJson: string;

    beforeAll(async () => {
      const mockProvider = new MockCareerAnalysisProvider();
      validAnalysis = await mockProvider.analyze(analysisInput);
      validRawJson = JSON.stringify(validAnalysis);
      markdownWrappedJson = '```json\n' + validRawJson + '\n```';
    });

    it('16. Production parseJsonContent seam parses valid raw JSON string', () => {
      const provider = new OpenRouterCareerAnalysisProvider({ apiKey: 'sk-test' });
      const parsed = provider.parseJsonContent(validRawJson);
      expect(parsed).toBeDefined();
      expect(parsed.executiveCareerSummary).toBe(validAnalysis.executiveCareerSummary);
      expect(parsed.houseInterpretations.length).toBe(12);
      expect(parsed.planetInterpretations.length).toBe(9);
    });

    it('17. Production parseJsonContent seam parses markdown-wrapped JSON string', () => {
      const provider = new OpenRouterCareerAnalysisProvider({ apiKey: 'sk-test' });
      const parsed = provider.parseJsonContent(markdownWrappedJson);
      expect(parsed).toBeDefined();
      expect(parsed.careerIdentity).toBe(validAnalysis.careerIdentity);
      expect(parsed.houseInterpretations.length).toBe(12);
    });

    it('18. Production parseJsonContent seam throws INVALID_JSON_RESPONSE on malformed JSON', () => {
      const provider = new OpenRouterCareerAnalysisProvider({ apiKey: 'sk-test' });
      expect(() => provider.parseJsonContent('{ broken unclosed json')).toThrow(/INVALID_JSON_RESPONSE/);
    });

    it('19. End-to-end provider response path succeeds with valid raw JSON response', async () => {
      const provider = new OpenRouterCareerAnalysisProvider({
        apiKey: 'sk-test-key',
        maxRetries: 1,
        allowMockFallback: false,
      });

      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: validRawJson }, finish_reason: 'stop' }],
            usage: { completion_tokens: 1500, reasoning_tokens: 0 },
            model: 'poolside/laguna-s-2.1:free',
          }),
        } as any;
      });

      const result = await provider.analyze(analysisInput);
      expect(result).toBeDefined();
      expect(result.houseInterpretations?.length).toBe(12);
      expect(result.planetInterpretations?.length).toBe(9);
      expect(result.executiveCareerSummary).toBe(validAnalysis.executiveCareerSummary);
    });

    it('20. End-to-end provider response path succeeds with markdown-wrapped JSON response', async () => {
      const provider = new OpenRouterCareerAnalysisProvider({
        apiKey: 'sk-test-key',
        maxRetries: 1,
        allowMockFallback: false,
      });

      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: markdownWrappedJson }, finish_reason: 'stop' }],
            usage: { completion_tokens: 1500, reasoning_tokens: 0 },
            model: 'poolside/laguna-s-2.1:free',
          }),
        } as any;
      });

      const result = await provider.analyze(analysisInput);
      expect(result).toBeDefined();
      expect(result.houseInterpretations?.length).toBe(12);
      expect(result.planetInterpretations?.length).toBe(9);
    });

    it('21. Provider response missing House 12 reaches validator and is rejected without converting to mock report', async () => {
      const corrupt = JSON.parse(validRawJson);
      corrupt.houseInterpretations = corrupt.houseInterpretations.filter((h: any) => h.houseNumber !== 12);
      const corruptJson = JSON.stringify(corrupt);

      const provider = new OpenRouterCareerAnalysisProvider({
        apiKey: 'sk-test-key',
        maxRetries: 1,
        allowMockFallback: false,
      });

      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: corruptJson }, finish_reason: 'stop' }],
            usage: { completion_tokens: 1500, reasoning_tokens: 0 },
            model: 'poolside/laguna-s-2.1:free',
          }),
        } as any;
      });

      await expect(provider.analyze(analysisInput)).rejects.toThrow(/Validation failed.*House 12/);
    });

    it('22. Provider response missing Ketu reaches validator and is rejected without converting to mock report', async () => {
      const corrupt = JSON.parse(validRawJson);
      corrupt.planetInterpretations = corrupt.planetInterpretations.filter((p: any) => p.planet.toUpperCase() !== 'KETU');
      const corruptJson = JSON.stringify(corrupt);

      const provider = new OpenRouterCareerAnalysisProvider({
        apiKey: 'sk-test-key',
        maxRetries: 1,
        allowMockFallback: false,
      });

      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: corruptJson }, finish_reason: 'stop' }],
            usage: { completion_tokens: 1500, reasoning_tokens: 0 },
            model: 'poolside/laguna-s-2.1:free',
          }),
        } as any;
      });

      await expect(provider.analyze(analysisInput)).rejects.toThrow(/Validation failed.*KETU/);
    });

    it('23. Provider response with invalid evidence ID reaches validator and is rejected without converting to mock report', async () => {
      const corrupt = JSON.parse(validRawJson);
      corrupt.houseInterpretations[0].evidenceIds = ['invalid-evidence-hallucinated-xyz-999'];
      const corruptJson = JSON.stringify(corrupt);

      const provider = new OpenRouterCareerAnalysisProvider({
        apiKey: 'sk-test-key',
        maxRetries: 1,
        allowMockFallback: false,
      });

      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: corruptJson }, finish_reason: 'stop' }],
            usage: { completion_tokens: 1500, reasoning_tokens: 0 },
            model: 'poolside/laguna-s-2.1:free',
          }),
        } as any;
      });

      await expect(provider.analyze(analysisInput)).rejects.toThrow(/Validation failed.*Invalid evidence ID/);
    });

    it('24. Provider response with malformed unparseable JSON is rejected without converting to mock report', async () => {
      const malformedJson = '```json\n{ "executiveCareerSummary": "Incomplete json string without closing';

      const provider = new OpenRouterCareerAnalysisProvider({
        apiKey: 'sk-test-key',
        maxRetries: 1,
        allowMockFallback: false,
      });

      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: malformedJson }, finish_reason: 'stop' }],
            usage: { completion_tokens: 100, reasoning_tokens: 0 },
            model: 'poolside/laguna-s-2.1:free',
          }),
        } as any;
      });

      await expect(provider.analyze(analysisInput)).rejects.toThrow(/INVALID_JSON_RESPONSE|OPENROUTER_ANALYSIS_FAILED/);
    });
  });
});

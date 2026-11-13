import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { normalizeAstroChart } from '@astro/astrology-engine';
import {
  CAREER_ANALYST_SYSTEM_PROMPT,
  careerAnalysisValidator,
  careerEvidenceEngine,
  MockCareerAnalysisProvider,
  CareerAnalysis,
  CareerAnalysisInput,
} from '@astro/prediction-engine';
import {
  mapNormalizedChartToCareerReportData,
  generateReportDataTex,
  pdfQaValidator,
  FORBIDDEN_PLACEHOLDERS,
  LocalXeLatexCompiler,
} from '../index';

describe('Phase 2B.4 Career Prompt and Mapper Synchronization Suite', () => {
  const aaravSharmaChartFixture: any = {
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
    normalizedChart = normalizeAstroChart(aaravSharmaChartFixture);
    analysisInput = careerEvidenceEngine.buildCareerAnalysisInput(normalizedChart);
  });

  // =========================================================================
  // 1. Prompt requests structured house and planetary interpretations
  // =========================================================================
  it('1. Prompt requests structured house and planetary interpretations with strict evidence grounding', () => {
    // Assert houseInterpretations instructions are present in prompt
    expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('houseInterpretations');
    expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('exactly 12 items for houses 1 through 12');
    expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('houseNumber');
    expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('houseMeaning');
    expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('careerRelevance');
    expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('supportingEvidence');
    expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('constructiveExpression');
    expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('potentialChallenge');
    expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('practicalInterpretation');

    // Assert planetInterpretations instructions are present in prompt
    expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('planetInterpretations');
    expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('exactly 9 items for Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, and Ketu');
    expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('placementSummary');
    expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('careerSignificance');
    expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('potentialPressure');
    expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('placementSpecificInterpretation');
    expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('practicalCareerImplication');

    // Assert strict anti-hallucination and evidence grounding instructions
    expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('NEVER calculate, invent, or guess planetary positions');
    expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('grounded in the supplied houseEvidence');
    expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('grounded in the supplied planetaryEvidence');

    // Assert strict category isolation in prompt instructions and examples
    expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('EVIDENCE TRACEABILITY & CATEGORY ISOLATION');
    expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('Do NOT cite planetary evidence IDs in house interpretations');
    expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('Do NOT cite house evidence IDs in planet interpretations');
    expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('May reference evidence across categories');

    // Assert that the house interpretation example does NOT contain cross-category planetary evidence IDs
    expect(CAREER_ANALYST_SYSTEM_PROMPT).not.toContain('"evidenceIds": ["house-1", "planet-mars"]');
    expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('"evidenceIds": ["house-1"]');
    expect(CAREER_ANALYST_SYSTEM_PROMPT).toContain('"evidenceIds": ["planet-sun"]');
  });

  // =========================================================================
  // 2. Valid AI response passes schema validation
  // =========================================================================
  it('2. Valid AI response passes schema validation and preserves all fields', async () => {
    const mockProvider = new MockCareerAnalysisProvider();
    const mockAnalysis = await mockProvider.analyze(analysisInput);

    const validationResult = careerAnalysisValidator.validate(
      mockAnalysis,
      analysisInput
    );

    expect(validationResult.isValid).toBe(true);
    expect(validationResult.errors.length).toBe(0);
    expect(validationResult.sanitizedAnalysis).toBeDefined();
    expect(validationResult.sanitizedAnalysis?.houseInterpretations?.length).toBe(12);
    expect(validationResult.sanitizedAnalysis?.planetInterpretations?.length).toBe(9);
  });

  // =========================================================================
  // 3. Missing or malformed structured fields are rejected or explicitly marked unavailable
  // =========================================================================
  it('3. Missing or malformed structured fields are rejected by validation', async () => {
    const mockProvider = new MockCareerAnalysisProvider();
    const validAnalysis = await mockProvider.analyze(analysisInput);

    // Case A: Missing houseInterpretations entirely
    const missingHouses = { ...validAnalysis, houseInterpretations: undefined };
    const resA = careerAnalysisValidator.validate(missingHouses, analysisInput);
    expect(resA.isValid).toBe(false);
    expect(resA.errors.some((e) => e.includes('houseInterpretations'))).toBe(true);

    // Case B: Incomplete houseInterpretations (only 11 houses)
    const incompleteHouses = {
      ...validAnalysis,
      houseInterpretations: validAnalysis.houseInterpretations.slice(0, 11),
    };
    const resB = careerAnalysisValidator.validate(incompleteHouses, analysisInput);
    expect(resB.isValid).toBe(false);
    expect(resB.errors.some((e) => e.includes('12'))).toBe(true);

    // Case C: Missing planetInterpretations entirely
    const missingPlanets = { ...validAnalysis, planetInterpretations: undefined };
    const resC = careerAnalysisValidator.validate(missingPlanets, analysisInput);
    expect(resC.isValid).toBe(false);
    expect(resC.errors.some((e) => e.includes('planetInterpretations'))).toBe(true);

    // Case D: Incomplete planetInterpretations (only 8 planets, missing Ketu)
    const incompletePlanets = {
      ...validAnalysis,
      planetInterpretations: validAnalysis.planetInterpretations.filter((p) => p.planet.toUpperCase() !== 'KETU'),
    };
    const resD = careerAnalysisValidator.validate(incompletePlanets, analysisInput);
    expect(resD.isValid).toBe(false);
    expect(resD.errors.some((e) => e.toLowerCase().includes('ketu'))).toBe(true);

    // Case E: Malformed empty field in house interpretation
    const malformedHouse = {
      ...validAnalysis,
      houseInterpretations: validAnalysis.houseInterpretations.map((h, i) =>
        i === 0 ? { ...h, careerRelevance: '' } : h
      ),
    };
    const resE = careerAnalysisValidator.validate(malformedHouse, analysisInput);
    expect(resE.isValid).toBe(false);
    expect(resE.errors.some((e) => e.includes('careerRelevance'))).toBe(true);

    // Case F: Invalid hallucinated evidence ID
    const hallucinatedEvidence = {
      ...validAnalysis,
      houseInterpretations: validAnalysis.houseInterpretations.map((h, i) =>
        i === 0 ? { ...h, evidenceIds: ['ev-hallucinated-xyz-999'] } : h
      ),
    };
    const resF = careerAnalysisValidator.validate(hallucinatedEvidence, analysisInput);
    expect(resF.isValid).toBe(false);
    expect(resF.errors.some((e) => e.toLowerCase().includes('invalid evidence id'))).toBe(true);

    // Case G: Missing evidenceIds in house interpretation
    const missingEvidenceIdsHouse = {
      ...validAnalysis,
      houseInterpretations: validAnalysis.houseInterpretations.map((h, i) => {
        if (i === 0) {
          const copy = { ...h };
          delete (copy as any).evidenceIds;
          return copy;
        }
        return h;
      }),
    };
    const resG = careerAnalysisValidator.validate(missingEvidenceIdsHouse, analysisInput);
    expect(resG.isValid).toBe(false);
    expect(resG.errors.some((e) => e.includes('evidenceIds (must be a non-empty array)'))).toBe(true);

    // Case H: Non-array evidenceIds in house interpretation
    const nonArrayEvidenceIdsHouse = {
      ...validAnalysis,
      houseInterpretations: validAnalysis.houseInterpretations.map((h, i) =>
        i === 0 ? { ...h, evidenceIds: 'house-1' as any } : h
      ),
    };
    const resH = careerAnalysisValidator.validate(nonArrayEvidenceIdsHouse, analysisInput);
    expect(resH.isValid).toBe(false);
    expect(resH.errors.some((e) => e.includes('evidenceIds (must be a non-empty array)'))).toBe(true);

    // Case I: Empty array evidenceIds in house interpretation
    const emptyEvidenceIdsHouse = {
      ...validAnalysis,
      houseInterpretations: validAnalysis.houseInterpretations.map((h, i) =>
        i === 0 ? { ...h, evidenceIds: [] } : h
      ),
    };
    const resI = careerAnalysisValidator.validate(emptyEvidenceIdsHouse, analysisInput);
    expect(resI.isValid).toBe(false);
    expect(resI.errors.some((e) => e.includes('evidenceIds (must be a non-empty array)'))).toBe(true);

    // Case J: Missing supportingEvidence in house interpretation
    const missingSupportingEvidence = {
      ...validAnalysis,
      houseInterpretations: validAnalysis.houseInterpretations.map((h, i) => {
        if (i === 0) {
          const copy = { ...h };
          delete (copy as any).supportingEvidence;
          delete (copy as any).evidence;
          return copy;
        }
        return h;
      }),
    };
    const resJ = careerAnalysisValidator.validate(missingSupportingEvidence, analysisInput);
    expect(resJ.isValid).toBe(false);
    expect(resJ.errors.some((e) => e.includes('supportingEvidence'))).toBe(true);

    // Case K: Missing placementSummary in planet interpretation
    const missingPlacementSummary = {
      ...validAnalysis,
      planetInterpretations: validAnalysis.planetInterpretations.map((p, i) => {
        if (i === 0) {
          const copy = { ...p };
          delete (copy as any).placementSummary;
          delete (copy as any).summary;
          delete (copy as any).placement;
          return copy;
        }
        return p;
      }),
    };
    const resK = careerAnalysisValidator.validate(missingPlacementSummary, analysisInput);
    expect(resK.isValid).toBe(false);
    expect(resK.errors.some((e) => e.includes('placementSummary'))).toBe(true);

    // Case L: Missing or empty evidenceIds in planet interpretation
    const missingEvidenceIdsPlanet = {
      ...validAnalysis,
      planetInterpretations: validAnalysis.planetInterpretations.map((p, i) => {
        if (i === 0) {
          const copy = { ...p };
          delete (copy as any).evidenceIds;
          return copy;
        }
        return p;
      }),
    };
    const resL = careerAnalysisValidator.validate(missingEvidenceIdsPlanet, analysisInput);
    expect(resL.isValid).toBe(false);
    expect(resL.errors.some((e) => e.includes('evidenceIds (must be a non-empty array)'))).toBe(true);
  });

  // =========================================================================
  // 4. Mapper correctly maps house interpretations
  // =========================================================================
  it('4. Mapper correctly maps personalized house interpretations into house models', async () => {
    const mockProvider = new MockCareerAnalysisProvider();
    const baseAnalysis = await mockProvider.analyze(analysisInput);

    // Inject unique personalized markers into house interpretations
    const customHouses = baseAnalysis.houseInterpretations.map((h) => ({
      ...h,
      houseMeaning: `Personalized meaning for House ${h.houseNumber} of client.`,
      careerRelevance: `Strategic domain leverage in House ${h.houseNumber}.`,
      supportingEvidence: `Verified astrological alignment for House ${h.houseNumber}.`,
      constructiveExpression: `Constructive manifestation in House ${h.houseNumber}.`,
      potentialChallenge: `Frictional tension point for House ${h.houseNumber}.`,
      practicalInterpretation: `Direct operational application for House ${h.houseNumber}.`,
    }));

    const analysis: CareerAnalysis = {
      ...baseAnalysis,
      houseInterpretations: customHouses,
    };

    const reportData = mapNormalizedChartToCareerReportData(
      normalizedChart,
      analysis,
      { clientName: 'Aarav Sharma' }
    );

    const houseList = Object.values(reportData.houses);
    expect(houseList.length).toBe(12);

    for (let i = 1; i <= 12; i++) {
      const houseModel = houseList.find((h) => h.houseNumber === i);
      expect(houseModel).toBeDefined();
      expect(houseModel?.careerInterpretation).toBe(`Personalized meaning for House ${i} of client.`);
      expect(houseModel?.constructiveExpression).toBe(`Constructive manifestation in House ${i}.`);
      expect(houseModel?.challenge).toBe(`Frictional tension point for House ${i}.`);
      expect(houseModel?.practicalInterpretation).toBe(`Direct operational application for House ${i}.`);
      expect(houseModel?.status).toBe('VERIFIED');
    }
  });

  // =========================================================================
  // 5. Mapper correctly maps planetary interpretations
  // =========================================================================
  it('5. Mapper correctly maps personalized planetary interpretations into planet models', async () => {
    const mockProvider = new MockCareerAnalysisProvider();
    const baseAnalysis = await mockProvider.analyze(analysisInput);

    // Inject unique personalized markers into planet interpretations
    const customPlanets = baseAnalysis.planetInterpretations.map((p) => ({
      ...p,
      careerSignificance: `Distinguished career significance of ${p.planet.toUpperCase()} in client chart.`,
      constructiveExpression: `Optimal constructive deployment of ${p.planet.toUpperCase()} energies.`,
      potentialPressure: `Subtle psychological tension or stress associated with ${p.planet.toUpperCase()}.`,
      placementSpecificInterpretation: `Exact astrological placement synthesis for ${p.planet.toUpperCase()}.`,
      practicalCareerImplication: `Definitive tactical workplace implication of ${p.planet.toUpperCase()}.`,
    }));

    const analysis: CareerAnalysis = {
      ...baseAnalysis,
      planetInterpretations: customPlanets,
    };

    const reportData = mapNormalizedChartToCareerReportData(
      normalizedChart,
      analysis,
      { clientName: 'Aarav Sharma' }
    );

    const planetsList = Object.values(reportData.planets);
    expect(planetsList.length).toBe(9);

    const canonicalPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
    for (const planetName of canonicalPlanets) {
      const planetModel = planetsList.find((p) => p.name.toUpperCase() === planetName.toUpperCase());
      expect(planetModel).toBeDefined();
      expect(planetModel?.careerSignificance).toBe(`Distinguished career significance of ${planetName.toUpperCase()} in client chart.`);
      expect(planetModel?.constructiveExpression).toBe(`Optimal constructive deployment of ${planetName.toUpperCase()} energies.`);
      expect(planetModel?.potentialChallenge).toBe(`Subtle psychological tension or stress associated with ${planetName.toUpperCase()}.`);
      expect(planetModel?.placementInterpretation).toBe(`Exact astrological placement synthesis for ${planetName.toUpperCase()}.`);
      expect(planetModel?.practicalCareerInterpretation).toBe(`Definitive tactical workplace implication of ${planetName.toUpperCase()}.`);
      expect(planetModel?.status).toBe('VERIFIED');
    }
  });

  // =========================================================================
  // 6. No generic static fallback is silently presented as personalized AI analysis
  // =========================================================================
  it('6. Does not silently present generic static fallback when interpretations are missing', () => {
    // When analysis has empty or missing interpretations
    const partialAnalysis: any = {
      executiveCareerSummary: 'Summary without structured interpretations',
      houseInterpretations: undefined,
      planetInterpretations: undefined,
    };

    const reportData = mapNormalizedChartToCareerReportData(
      normalizedChart,
      partialAnalysis,
      { clientName: 'Aarav Sharma' }
    );

    // Verify houses and planets are explicitly marked with unavailable placeholder
    for (const h of Object.values(reportData.houses)) {
      expect(h.careerInterpretation).toBe('Personalized interpretation unavailable');
      expect(h.constructiveExpression).toBe('Personalized interpretation unavailable');
    }

    for (const p of Object.values(reportData.planets)) {
      expect(p.careerSignificance).toBe('Personalized interpretation unavailable');
      expect(p.constructiveExpression).toBe('Personalized interpretation unavailable');
    }

    // Verify FORBIDDEN_PLACEHOLDERS includes 'Personalized interpretation unavailable'
    expect(FORBIDDEN_PLACEHOLDERS).toContain('Personalized interpretation unavailable');

    // Verify pdfQaValidator rejects documents containing 'Personalized interpretation unavailable'
    const forbiddenTex = `\\newcommand{\\HouseOneCareerInterpretation}{Personalized interpretation unavailable}`;
    const qaResult = pdfQaValidator.validatePdf({
      pdfBuffer: Buffer.from('%PDF-1.4 header dummy content'),
      reportDataTex: forbiddenTex,
      minPageCount: 1,
    });
    expect(qaResult.isValid).toBe(false);
    expect(qaResult.errors.some((e) => e.includes('Personalized interpretation unavailable'))).toBe(true);
  });

  // =========================================================================
  // 7. Mock and production provider contracts remain compatible
  // =========================================================================
  it('7. Mock provider produces payload strictly adhering to schema and evidence constraints', async () => {
    const mockProvider = new MockCareerAnalysisProvider();
    const result = await mockProvider.analyze(analysisInput);

    expect(result.houseInterpretations.length).toBe(12);
    expect(result.planetInterpretations.length).toBe(9);

    // Verify all evidence IDs in mock result exist in the allowed set
    const allowedIds = new Set<string>();
    allowedIds.add('work-environment-evidence');
    for (const h of analysisInput.houseEvidence) {
      allowedIds.add(`house-${h.houseNumber}`);
    }
    for (const p of analysisInput.planetaryEvidence) {
      allowedIds.add(`planet-${p.planet.toLowerCase()}`);
    }

    for (const h of result.houseInterpretations) {
      for (const id of h.evidenceIds) {
        expect(allowedIds.has(id)).toBe(true);
      }
    }

    for (const p of result.planetInterpretations) {
      for (const id of p.evidenceIds) {
        expect(allowedIds.has(id)).toBe(true);
      }
    }
  });

  // =========================================================================
  // 8. Existing 10 career horizon/priority fields remain intact
  // =========================================================================
  it('8. Existing 10 career horizon and priority fields remain intact and correctly mapped', async () => {
    const mockProvider = new MockCareerAnalysisProvider();
    const baseAnalysis = await mockProvider.analyze(analysisInput);

    const customAnalysis: CareerAnalysis = {
      ...baseAnalysis,
      primaryProfessionalPriority: 'Deliver flagship architectural mandate with full autonomy.',
      technicalSkillPriority: 'Enterprise distributed systems and cloud governance.',
      communicationSkillPriority: 'Executive board-level business case presentation.',
      leadershipSkillPriority: 'Empowering specialized domain teams without micromanaging.',
      networkSkillPriority: 'Cultivating senior investor and CTO advisory relationships.',
      mistakeToAvoid: 'Getting bogged down in tactical bug-fixes rather than system design.',
      thirtyDayFocus: 'Audit active commitments and cancel 3 low-leverage initiatives.',
      ninetyDayFocus: 'Ship core prototype for the flagship analytics platform.',
      oneYearFocus: 'Formal appointment to VP of Architecture or advisory equivalent.',
      threeYearDirection: 'Founding an independent high-yield strategic consulting practice.',
    };

    const reportData = mapNormalizedChartToCareerReportData(
      normalizedChart,
      customAnalysis,
      { clientName: 'Aarav Sharma' }
    );

    // Verify all 10 fields mapped into roadmaps and direct properties
    expect(reportData.careerAnalysis.roadmapThirtyDay.focus).toBe(customAnalysis.thirtyDayFocus);
    expect(reportData.careerAnalysis.roadmapThirtyDay.skills).toBe(customAnalysis.technicalSkillPriority);
    expect(reportData.careerAnalysis.roadmapThirtyDay.immediateActions).toBe(customAnalysis.primaryProfessionalPriority);
    expect(reportData.careerAnalysis.roadmapThirtyDay.risks).toBe(customAnalysis.mistakeToAvoid);

    expect(reportData.careerAnalysis.roadmapNinetyDay.focus).toBe(customAnalysis.ninetyDayFocus);
    expect(reportData.careerAnalysis.roadmapNinetyDay.skills).toBe(customAnalysis.communicationSkillPriority);

    expect(reportData.careerAnalysis.roadmapOneYear.focus).toBe(customAnalysis.oneYearFocus);
    expect(reportData.careerAnalysis.roadmapOneYear.skills).toBe(customAnalysis.leadershipSkillPriority);

    expect(reportData.careerAnalysis.roadmapThreeYear.focus).toBe(customAnalysis.threeYearDirection);
    expect(reportData.careerAnalysis.roadmapThreeYear.skills).toBe(customAnalysis.networkSkillPriority);
  });

  // =========================================================================
  // 9. Actual generated Career PDF contains the structured analysis
  // =========================================================================
  it('9. Actual generated Career PDF contains the structured house and planetary analysis', async () => {
    const mockProvider = new MockCareerAnalysisProvider();
    const baseAnalysis = await mockProvider.analyze(analysisInput);

    const customAnalysis: CareerAnalysis = {
      ...baseAnalysis,
      houseInterpretations: baseAnalysis.houseInterpretations.map((h) =>
        h.houseNumber === 1
          ? {
              ...h,
              houseMeaning: 'Dynamic entrepreneurial leadership and decisive domain initiatives.',
            }
          : h.houseNumber === 10
          ? {
              ...h,
              houseMeaning: 'High-visibility executive mandate commanding organizational respect.',
            }
          : h
      ),
      planetInterpretations: baseAnalysis.planetInterpretations.map((p) =>
        p.planet.toUpperCase() === 'SUN'
          ? {
              ...p,
              careerSignificance: 'Natural authority in enterprise governance and executive representation.',
            }
          : p.planet.toUpperCase() === 'MARS'
          ? {
              ...p,
              careerSignificance: 'High-octane operational execution and formidable competitive resilience.',
            }
          : p
      ),
    };

    const reportData = mapNormalizedChartToCareerReportData(
      normalizedChart,
      customAnalysis,
      { clientName: 'Aarav Sharma', reportId: 'phase2b4-pdf-verification' }
    );

    const texOutput = generateReportDataTex(reportData);
    const compiler = new LocalXeLatexCompiler(path.resolve(__dirname, '../../templates'));

    const compilationResult = await compiler.compileReport({
      reportId: 'phase2b4-pdf-verification',
      reportDataTex: texOutput,
      minPageCount: 1,
      timeoutMs: 120000,
    });

    expect(compilationResult.pdfBuffer).toBeInstanceOf(Buffer);
    expect(compilationResult.pdfBuffer.length).toBeGreaterThan(1000);
    expect(compilationResult.pdfBuffer.subarray(0, 5).toString()).toBe('%PDF-');

    const artifactPath = path.join(__dirname, '../../../../phase2b4_career_report_test.pdf');
    fs.writeFileSync(artifactPath, compilationResult.pdfBuffer);
    expect(fs.existsSync(artifactPath)).toBe(true);

    const text = execSync(`pdftotext "${artifactPath}" -`, { encoding: 'utf-8' });

    // Verify structured house interpretations in generated PDF text
    expect(text).toContain('Dynamic entrepreneurial leadership');
    expect(text).toContain('High-visibility executive mandate');

    // Verify structured planetary interpretations in generated PDF text
    expect(text).toContain('Natural authority in enterprise governance');
    expect(text).toContain('High-octane operational execution');

    // Verify 10 priority/horizon fields in generated PDF text
    expect(text).toContain('Practical Career Roadmap');
    expect(text).toContain('30-Day Direction');
    expect(text).toContain('3-Year Horizon');
  }, 120000);
});

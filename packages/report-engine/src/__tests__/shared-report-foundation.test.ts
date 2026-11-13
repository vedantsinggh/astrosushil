import { describe, it, expect, vi } from 'vitest';
import {
  VerifiedAstrologyEvidence,
  validateVerifiedAstrologyEvidence,
  AstrologyEvidenceValidationError,
  ReportSectionComposer,
  ReportCompositionError,
  sharedInterpretationPipeline,
  InterpretationPipelineError,
  sharedReportPdfRenderer,
  SharedReportDocument,
} from '../index';

describe('Shared Report-Engine Foundation Test Suite', () => {
  const validEvidenceFixture: VerifiedAstrologyEvidence = {
    snapshotId: 'SNAP-2026-TEST-001',
    calculationVersion: '1.0.0',
    providerName: 'AstroSushil Engine',
    calculationTimestampIso: '2026-11-07T12:00:00Z',
    config: {
      zodiacType: 'SIDEREAL',
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
      nodeCalculation: 'MEAN_NODE',
      planetaryCalculationMode: 'GEOCENTRIC',
    },
    birthDetails: {
      name: 'Aditi Sharma',
      dateOfBirth: '1995-10-24',
      timeOfBirth: '10:15:00',
      placeName: 'Jaipur, Rajasthan, India',
      latitude: 26.9124,
      longitude: 75.7873,
      timezone: 'Asia/Kolkata',
    },
    ascendant: {
      sign: 'Scorpio',
      signIndex: 8,
      degree: 14.32,
      nakshatra: 'Anuradha',
      pada: 4,
      lord: 'Mars',
    },
    planets: [
      { planet: 'SUN', sign: 'Libra', signIndex: 7, degree: 6.45, house: 12, nakshatra: 'Chitra', pada: 4, isRetrograde: false, dignity: 'DEBILITATED' },
      { planet: 'MOON', sign: 'Libra', signIndex: 7, degree: 28.12, house: 12, nakshatra: 'Vishakha', pada: 3, isRetrograde: false, dignity: 'NEUTRAL' },
      { planet: 'MARS', sign: 'Scorpio', signIndex: 8, degree: 19.8, house: 1, nakshatra: 'Jyeshtha', pada: 1, isRetrograde: false, dignity: 'OWN_SIGN' },
      { planet: 'MERCURY', sign: 'Libra', signIndex: 7, degree: 18.05, house: 12, nakshatra: 'Swati', pada: 4, isRetrograde: false, dignity: 'FRIENDLY' },
      { planet: 'JUPITER', sign: 'Scorpio', signIndex: 8, degree: 22.4, house: 1, nakshatra: 'Jyeshtha', pada: 2, isRetrograde: false, dignity: 'FRIENDLY' },
      { planet: 'VENUS', sign: 'Scorpio', signIndex: 8, degree: 2.1, house: 1, nakshatra: 'Vishakha', pada: 4, isRetrograde: false, dignity: 'NEUTRAL' },
      { planet: 'SATURN', sign: 'Aquarius', signIndex: 11, degree: 24.5, house: 4, nakshatra: 'Purva Bhadrapada', pada: 2, isRetrograde: true, dignity: 'MOOLATRIKONA' },
      { planet: 'RAHU', sign: 'Libra', signIndex: 7, degree: 2.9, house: 12, nakshatra: 'Chitra', pada: 3, isRetrograde: true },
      { planet: 'KETU', sign: 'Aries', signIndex: 1, degree: 2.9, house: 6, nakshatra: 'Ashwini', pada: 1, isRetrograde: true },
    ],
    houses: [
      { houseNumber: 1, sign: 'Scorpio', signIndex: 8, degree: 14.32, lord: 'Mars', occupants: ['MARS', 'JUPITER', 'VENUS'] },
      { houseNumber: 2, sign: 'Sagittarius', signIndex: 9, degree: 14.32, lord: 'Jupiter', occupants: [] },
      { houseNumber: 3, sign: 'Capricorn', signIndex: 10, degree: 14.32, lord: 'Saturn', occupants: [] },
      { houseNumber: 4, sign: 'Aquarius', signIndex: 11, degree: 14.32, lord: 'Saturn', occupants: ['SATURN'] },
      { houseNumber: 5, sign: 'Pisces', signIndex: 12, degree: 14.32, lord: 'Jupiter', occupants: [] },
      { houseNumber: 6, sign: 'Aries', signIndex: 1, degree: 14.32, lord: 'Mars', occupants: ['KETU'] },
      { houseNumber: 7, sign: 'Taurus', signIndex: 2, degree: 14.32, lord: 'Venus', occupants: [] },
      { houseNumber: 8, sign: 'Gemini', signIndex: 3, degree: 14.32, lord: 'Mercury', occupants: [] },
      { houseNumber: 9, sign: 'Cancer', signIndex: 4, degree: 14.32, lord: 'Moon', occupants: [] },
      { houseNumber: 10, sign: 'Leo', signIndex: 5, degree: 14.32, lord: 'Sun', occupants: [] },
      { houseNumber: 11, sign: 'Virgo', signIndex: 6, degree: 14.32, lord: 'Mercury', occupants: [] },
      { houseNumber: 12, sign: 'Libra', signIndex: 7, degree: 14.32, lord: 'Venus', occupants: ['SUN', 'MOON', 'MERCURY', 'RAHU'] },
    ],
    dashas: {
      currentMahadasha: 'JUPITER',
      currentAntardasha: 'SATURN',
      currentPratyantardasha: 'MERCURY',
      startDate: '2024-06-15',
      endDate: '2026-12-28',
      timeline: [
        { planet: 'JUPITER', startDate: '2016-01-01', endDate: '2032-01-01', isCurrent: true },
      ],
    },
    transits: [
      { planet: 'SATURN', sign: 'Aquarius', degree: 18.2, houseFromLagna: 4, houseFromMoon: 5, isRetrograde: false },
      { planet: 'JUPITER', sign: 'Taurus', degree: 20.4, houseFromLagna: 7, houseFromMoon: 8, isRetrograde: false },
    ],
    domainFacts: {
      CAREER: [
        { source: '10TH_HOUSE', factText: 'Leo on 10th house, Sun as 10th Lord placed in 12th house Libra (debilitated)', strength: 'HIGH' },
        { source: 'MARS_PLACEMENT', factText: 'Mars in 1st house in own sign Scorpio forming Ruchaka Yoga', strength: 'HIGH' },
      ],
    },
  };

  // =========================================================================
  // 1. STRUCTURED ASTROLOGY EVIDENCE VALIDATION TESTS
  // =========================================================================
  describe('1. Structured Astrology Evidence Validation', () => {
    it('1.1 Should successfully validate complete and canonical astrological evidence', () => {
      expect(() => validateVerifiedAstrologyEvidence(validEvidenceFixture)).not.toThrow();
    });

    it('1.2 Should reject non-canonical astrological conventions (e.g. TROPICAL or PLACIDUS)', () => {
      const invalidConventions = {
        ...validEvidenceFixture,
        config: {
          ...validEvidenceFixture.config,
          zodiacType: 'TROPICAL' as any,
          houseSystem: 'PLACIDUS' as any,
        },
      };

      expect(() => validateVerifiedAstrologyEvidence(invalidConventions)).toThrowError(AstrologyEvidenceValidationError);
      try {
        validateVerifiedAstrologyEvidence(invalidConventions);
      } catch (err: any) {
        expect(err.validationErrors.some((e: string) => e.includes('SIDEREAL'))).toBe(true);
        expect(err.validationErrors.some((e: string) => e.includes('WHOLE_SIGN'))).toBe(true);
      }
    });

    it('1.3 Should reject evidence with missing required classical planets (e.g. missing Saturn)', () => {
      const missingSaturn = {
        ...validEvidenceFixture,
        planets: validEvidenceFixture.planets.filter((p) => p.planet !== 'SATURN'),
      };

      expect(() => validateVerifiedAstrologyEvidence(missingSaturn)).toThrowError(AstrologyEvidenceValidationError);
      try {
        validateVerifiedAstrologyEvidence(missingSaturn);
      } catch (err: any) {
        expect(err.validationErrors.some((e: string) => e.includes('Missing required classical planet: SATURN'))).toBe(true);
      }
    });

    it('1.4 Should reject forbidden placeholder strings like "N/A" or "unknown" in placements', () => {
      const placeholderEvidence = {
        ...validEvidenceFixture,
        ascendant: {
          ...validEvidenceFixture.ascendant,
          sign: 'N/A',
        },
      };

      expect(() => validateVerifiedAstrologyEvidence(placeholderEvidence)).toThrowError(AstrologyEvidenceValidationError);
    });

    it('1.5 Should enforce degree range: rejects degree >= 30.0', () => {
      const invalidDegree = {
        ...validEvidenceFixture,
        planets: validEvidenceFixture.planets.map((p) => (p.planet === 'MARS' ? { ...p, degree: 31.5 } : p)),
      };

      expect(() => validateVerifiedAstrologyEvidence(invalidDegree)).toThrowError(AstrologyEvidenceValidationError);
    });

    it('1.6 Should enforce incomplete houses (fewer than 12 houses)', () => {
      const incompleteHouses = {
        ...validEvidenceFixture,
        houses: validEvidenceFixture.houses.slice(0, 11),
      };

      expect(() => validateVerifiedAstrologyEvidence(incompleteHouses)).toThrowError(AstrologyEvidenceValidationError);
    });

    it('1.7 Should enforce Dashas when requireDashas option is enabled', () => {
      const noDashas = { ...validEvidenceFixture, dashas: undefined };
      expect(() => validateVerifiedAstrologyEvidence(noDashas, { requireDashas: true })).toThrowError(
        AstrologyEvidenceValidationError
      );
    });
  });

  // =========================================================================
  // 2. REPORT SECTION COMPOSITION TESTS
  // =========================================================================
  describe('2. Report Section Composition', () => {
    it('2.1 Should compose sections in strict ascending order and attach standard author/disclaimer blocks', async () => {
      const composer = new ReportSectionComposer();

      composer.registerSection({
        id: 'SEC_PLANETARY',
        title: 'Planetary Placements Overview',
        category: 'ASTRONOMICAL',
        order: 2,
        isRequired: true,
        evaluate: (ctx) => ({
          id: 'SEC_PLANETARY',
          title: 'Planetary Placements Overview',
          category: 'ASTRONOMICAL',
          order: 2,
          isRequired: true,
          status: 'VERIFIED',
          summary: `Ascendant in ${ctx.evidence.ascendant.sign}`,
          content: 'Verified planetary placement synthesis.',
          evidenceRefs: ['ASC_SCORPIO', 'SUN_LIBRA'],
        }),
      });

      composer.registerSection({
        id: 'SEC_EXECUTIVE',
        title: 'Executive Chart Summary',
        category: 'OVERVIEW',
        order: 1,
        isRequired: true,
        evaluate: () => ({
          id: 'SEC_EXECUTIVE',
          title: 'Executive Chart Summary',
          category: 'OVERVIEW',
          order: 1,
          isRequired: true,
          status: 'VERIFIED',
          summary: 'High executive summary',
          content: 'Detailed summary',
          evidenceRefs: ['ALL_HOUSES'],
        }),
      });

      const metadata = {
        reportId: 'REP-TEST-123',
        reportType: 'CAREER',
        title: 'Career Intelligence Report',
        version: '1.0.0',
        generationTimestampIso: '2026-11-07T12:00:00Z',
        clientName: 'Aditi Sharma',
      };

      const doc = await composer.compose(metadata, validEvidenceFixture);

      expect(doc.sections.length).toBe(2);
      expect(doc.sections[0].id).toBe('SEC_EXECUTIVE');
      expect(doc.sections[0].order).toBe(1);
      expect(doc.sections[1].id).toBe('SEC_PLANETARY');
      expect(doc.sections[1].order).toBe(2);

      // Verifies mandatory inclusion of Author Message, Methodology Note, and Legal Disclaimer
      expect(doc.authorMessage.authorName).toBe('Sushil Kumaar Singh');
      expect(doc.methodologyNote.body).toContain('Lahiri');
      expect(doc.legalDisclaimer.body).toContain('educational');
    });

    it('2.2 Should fail composition if a required section throws or is UNAVAILABLE', async () => {
      const composer = new ReportSectionComposer();

      composer.registerSection({
        id: 'SEC_REQUIRED_FAIL',
        title: 'Core Required Section',
        category: 'CORE',
        order: 1,
        isRequired: true,
        evaluate: () => {
          throw new Error('Database connection dropped while fetching rule');
        },
      });

      const metadata = {
        reportId: 'REP-TEST-FAIL',
        reportType: 'CAREER',
        title: 'Career Report',
        version: '1.0.0',
        generationTimestampIso: '2026-11-07T12:00:00Z',
        clientName: 'Aditi Sharma',
      };

      await expect(composer.compose(metadata, validEvidenceFixture)).rejects.toThrowError(ReportCompositionError);
    });

    it('2.3 Should mark optional section as UNAVAILABLE without failing report generation or inventing fake content', async () => {
      const composer = new ReportSectionComposer();

      composer.registerSection({
        id: 'SEC_REQUIRED',
        title: 'Core Placements',
        category: 'CORE',
        order: 1,
        isRequired: true,
        evaluate: () => ({
          id: 'SEC_REQUIRED',
          title: 'Core Placements',
          category: 'CORE',
          order: 1,
          isRequired: true,
          status: 'VERIFIED',
          summary: 'Verified placements',
          evidenceRefs: ['ASC_SCORPIO'],
        }),
      });

      composer.registerSection({
        id: 'SEC_OPTIONAL_UNAVAILABLE',
        title: 'Advanced Prashna Analysis',
        category: 'OPTIONAL',
        order: 2,
        isRequired: false,
        evaluate: () => {
          throw new Error('Prashna time query was not supplied');
        },
      });

      const metadata = {
        reportId: 'REP-TEST-OPT',
        reportType: 'HOROSCOPE',
        title: 'Personalised Horoscope',
        version: '1.0.0',
        generationTimestampIso: '2026-11-07T12:00:00Z',
        clientName: 'Aditi Sharma',
      };

      const doc = await composer.compose(metadata, validEvidenceFixture);

      expect(doc.sections.length).toBe(2);
      expect(doc.sections[0].status).toBe('VERIFIED');
      expect(doc.sections[1].status).toBe('UNAVAILABLE');
      expect(doc.sections[1].isRequired).toBe(false);
      expect(doc.sections[1].unavailableReason).toContain('Prashna time query was not supplied');
    });

    it('2.4 Should enforce evidence traceability: rejects VERIFIED section with empty evidenceRefs', async () => {
      const composer = new ReportSectionComposer();

      composer.registerSection({
        id: 'SEC_UNTRACEABLE',
        title: 'Untraceable Section',
        category: 'PREDICTION',
        order: 1,
        isRequired: true,
        evaluate: () => ({
          id: 'SEC_UNTRACEABLE',
          title: 'Untraceable Section',
          category: 'PREDICTION',
          order: 1,
          isRequired: true,
          status: 'VERIFIED',
          summary: 'Summary without proof',
          evidenceRefs: [], // Missing evidence references!
        }),
      });

      const metadata = {
        reportId: 'REP-TRACE',
        reportType: 'CAREER',
        title: 'Career Report',
        version: '1.0.0',
        generationTimestampIso: '2026-11-07T12:00:00Z',
        clientName: 'Aditi Sharma',
      };

      await expect(composer.compose(metadata, validEvidenceFixture)).rejects.toThrowError(
        'provides zero evidence references'
      );
    });
  });

  // =========================================================================
  // 3. SHARED INTERPRETATION PIPELINE TESTS
  // =========================================================================
  describe('3. Shared Interpretation Pipeline', () => {
    it('3.1 Should successfully format prompt context, invoke AI provider, validate response, and assemble section', async () => {
      const mockAiCaller = vi.fn().mockResolvedValue({
        summary: 'Mars in Scorpio in the 1st house creates strong resilience and executive command.',
        careerIdentity: 'Dynamic leader with high technical problem-solving capabilities.',
      });

      const section = await sharedInterpretationPipeline.executeSectionInterpretation(validEvidenceFixture, {
        sectionId: 'SEC_LEADERSHIP',
        title: 'Executive Leadership Capacity',
        category: 'CAREER',
        order: 3,
        isRequired: true,
        contextBuilder: (ev) => ({
          systemPrompt: 'You are an explanatory assistant format. Do not calculate.',
          userPrompt: `Analyze Mars in ${ev.ascendant.sign}`,
          evidenceFacts: ['MARS_IN_SCORPIO_HOUSE_1', 'RUCHAKA_YOGA'],
        }),
        aiCaller: mockAiCaller,
        outputParser: (raw: any) => raw,
        outputValidator: (parsed, ev) => {
          if (!parsed.summary) throw new Error('Summary is required in AI response');
        },
        sectionMapper: (parsed) => ({
          id: 'SEC_LEADERSHIP',
          title: 'Executive Leadership Capacity',
          category: 'CAREER',
          order: 3,
          isRequired: true,
          status: 'VERIFIED',
          summary: parsed.summary,
          content: parsed.careerIdentity,
          evidenceRefs: ['MARS_IN_SCORPIO_HOUSE_1', 'RUCHAKA_YOGA'],
        }),
      });

      expect(mockAiCaller).toHaveBeenCalledTimes(1);
      expect(section.status).toBe('VERIFIED');
      expect(section.summary).toContain('Mars in Scorpio');
      expect(section.evidenceRefs).toEqual(['MARS_IN_SCORPIO_HOUSE_1', 'RUCHAKA_YOGA']);
    });

    it('3.2 Should retry on transient provider error and succeed on second attempt', async () => {
      let callCount = 0;
      const transientAiCaller = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('503 Service Unavailable / Gateway Timeout');
        }
        return {
          summary: 'Recovered interpretation after transient network timeout.',
        };
      });

      const section = await sharedInterpretationPipeline.executeSectionInterpretation(validEvidenceFixture, {
        sectionId: 'SEC_RETRY',
        title: 'Retry Verification Section',
        category: 'GENERAL',
        order: 1,
        isRequired: true,
        maxRetries: 2,
        retryDelayMs: 10,
        contextBuilder: () => ({
          systemPrompt: 'System',
          userPrompt: 'User',
          evidenceFacts: ['TEST_FACT'],
        }),
        aiCaller: transientAiCaller,
        outputParser: (raw: any) => raw,
        outputValidator: (parsed) => {
          if (!parsed.summary) throw new Error('Missing summary');
        },
        sectionMapper: (parsed) => ({
          id: 'SEC_RETRY',
          title: 'Retry Verification Section',
          category: 'GENERAL',
          order: 1,
          isRequired: true,
          status: 'VERIFIED',
          summary: parsed.summary,
          evidenceRefs: ['TEST_FACT'],
        }),
      });

      expect(transientAiCaller).toHaveBeenCalledTimes(2);
      expect(section.status).toBe('VERIFIED');
      expect(section.summary).toContain('Recovered interpretation');
    });

    it('3.3 Should throw InterpretationPipelineError without empty fallback when retries exhausted for required section', async () => {
      const failingAiCaller = vi.fn().mockRejectedValue(new Error('AI Model rate limited / quota exhausted'));

      await expect(
        sharedInterpretationPipeline.executeSectionInterpretation(validEvidenceFixture, {
          sectionId: 'SEC_FAIL',
          title: 'Failing Required Section',
          category: 'CRITICAL',
          order: 1,
          isRequired: true,
          maxRetries: 1,
          retryDelayMs: 10,
          contextBuilder: () => ({
            systemPrompt: 'System',
            userPrompt: 'User',
            evidenceFacts: ['FACT_1'],
          }),
          aiCaller: failingAiCaller,
          outputParser: (raw) => raw,
          outputValidator: () => {},
          sectionMapper: () => ({} as any),
        })
      ).rejects.toThrowError(InterpretationPipelineError);
    });
  });

  // =========================================================================
  // 4. PDF RENDERING FOUNDATION TESTS
  // =========================================================================
  describe('4. PDF Rendering Foundation', () => {
    it('4.1 Should render a multi-page vector PDF buffer with valid PDF 1.4 header and footer', async () => {
      const composer = new ReportSectionComposer();

      composer.registerSection({
        id: 'SEC_1',
        title: 'Core Planetary Dynamics',
        category: 'DYNAMICS',
        order: 1,
        isRequired: true,
        evaluate: () => ({
          id: 'SEC_1',
          title: 'Core Planetary Dynamics',
          category: 'DYNAMICS',
          order: 1,
          isRequired: true,
          status: 'VERIFIED',
          summary: 'Detailed summary of planetary placements across 12 Whole Sign houses.',
          content: 'The 10th house is governed by the Sun, creating natural ambition and executive presence. Mars placed in the 1st house confers vitality and sharp strategic intellect.',
          evidenceRefs: ['SUN_12TH', 'MARS_1ST'],
          tables: [
            {
              id: 'TBL_PLANETS',
              title: 'Classical Planetary Coordinates (Whole Sign, Lahiri)',
              headers: ['Planet', 'Sign', 'Degree', 'House', 'Nakshatra'],
              rows: [
                { cells: ['Sun', 'Libra', '6.45°', '12', 'Chitra'] },
                { cells: ['Moon', 'Libra', '28.12°', '12', 'Vishakha'] },
                { cells: ['Mars', 'Scorpio', '19.80°', '1', 'Jyeshtha'] },
                { cells: ['Jupiter', 'Scorpio', '22.40°', '1', 'Jyeshtha'] },
                { cells: ['Saturn', 'Aquarius', '24.50°', '4', 'P.Bhadra'] },
              ],
            },
          ],
        }),
      });

      const metadata = {
        reportId: 'REP-PDF-001',
        reportType: 'CAREER',
        title: 'Vedic Career Dossier',
        subtitle: 'Authoritative Classical Vedic Analysis',
        version: '1.0.0',
        generationTimestampIso: '2026-11-07T12:00:00Z',
        clientName: 'Aditi Sharma',
      };

      const doc = await composer.compose(metadata, validEvidenceFixture);
      const pdfBuffer = sharedReportPdfRenderer.renderToBuffer(doc);

      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(1000);

      const pdfString = pdfBuffer.toString('binary');
      // 1. PDF 1.4 compliance
      expect(pdfString.startsWith('%PDF-1.4')).toBe(true);
      expect(pdfString.includes('%%EOF')).toBe(true);

      // 2. Client & calculation metadata
      expect(pdfString.includes('Aditi Sharma')).toBe(true);
      expect(pdfString.includes('Jaipur, Rajasthan, India')).toBe(true);
      expect(pdfString.includes('SIDEREAL')).toBe(true);
      expect(pdfString.includes('LAHIRI')).toBe(true);
      expect(pdfString.includes('WHOLE_SIGN')).toBe(true);

      // 3. Author message and disclaimer
      expect(pdfString.includes('Sushil Kumaar Singh')).toBe(true);
      expect(pdfString.includes('AUTHORITATIVE DISCLAIMER & TERMS OF GUIDANCE')).toBe(true);

      // 4. Table content
      expect(pdfString.includes('Chitra')).toBe(true);
      expect(pdfString.includes('Jyeshtha')).toBe(true);
    });
  });
});

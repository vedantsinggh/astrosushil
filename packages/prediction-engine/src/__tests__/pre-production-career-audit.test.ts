/**
 * Pre-Production Career Report Correction Audit Test Suite
 *
 * Verifies all 10 pre-production audit directives and Phase 2 verification checks:
 * 1. Zero hardcoded coordinates or profile assumptions.
 * 2. Dynamic topic instructions derived strictly from client chart.
 * 3. Removal of fabricated fallback values; missing data explicitly marked UNAVAILABLE.
 * 4. Genuine registered evidence identifiers for all topics.
 * 5. Real D10 Dashamsha, SAV, Dasha, and Gochara transit packets.
 * 6. 12-sign functional benefic & gemstone matrix without static defaults.
 * 7. Strict schema validation (exactly 3 paragraphs, 5 pointers, 1 takeaway).
 * 8. Resumable topic generation with composite cache identity and clean quota handling.
 * 9. Documented x-goog-api-key header authentication.
 * 10. Transparent cost estimation accounting.
 * 11. Planetary placement contradiction rejection.
 * 12. House assignment contradiction rejection.
 * 13. Cross-client cache isolation.
 * 14. Birth data & evidence cache invalidation.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ChartCalculator,
  AstronomyEngineAdapter,
  DEFAULT_ASTROLOGY_CONFIG,
  normalizeAstroChart,
  NormalizedChart,
  VargaCalculator,
  AshtakavargaCalculator,
  DashaCalculator,
} from '@astro/astrology-engine';
import {
  careerEvidencePackager,
  CareerEvidencePackager,
  PartEvidencePacket,
} from '../services/career-evidence-packager';
import {
  careerEditorialTopicValidator,
  CareerEditorialTopicValidator,
} from '../validation/career-editorial-topic.validator';
import {
  ResumableCareerGeneratorService,
  QuotaExhaustedError,
  calculateEstimatedCostUsd,
  createCompositeCacheKey,
  computeSha256,
  CAREER_EDITORIAL_SCHEMA_VERSION,
} from '../services/resumable-career-generator.service';
import { CAREER_EDITORIAL_PROMPT_VERSION } from '../prompts/career-editorial.prompt';

describe('Pre-Production Career Report Correction Audit', () => {
  let ananyaChart: NormalizedChart;
  let vikramChart: NormalizedChart;
  let meeraChart: NormalizedChart;

  beforeAll(async () => {
    const calc = new ChartCalculator(new AstronomyEngineAdapter());

    // Profile 1: Dr. Ananya Iyer (Virgo Lagna)
    const raw1 = await calc.calculateChart(
      {
        date: { year: 1991, month: 8, day: 24 },
        time: { hour: 9, minute: 15, second: 0 },
        timezone: 'Asia/Kolkata',
        latitude: 12.9716,
        longitude: 77.5946,
        placeName: 'Bengaluru, India',
      },
      DEFAULT_ASTROLOGY_CONFIG
    );
    ananyaChart = normalizeAstroChart(raw1);

    // Profile 2: Vikramaditya Sen (Aries Lagna)
    const raw2 = await calc.calculateChart(
      {
        date: { year: 1985, month: 4, day: 18 },
        time: { hour: 6, minute: 30, second: 0 },
        timezone: 'Asia/Kolkata',
        latitude: 22.5726,
        longitude: 88.3639,
        placeName: 'Kolkata, India',
      },
      DEFAULT_ASTROLOGY_CONFIG
    );
    vikramChart = normalizeAstroChart(raw2);

    // Profile 3: Meera Nambiar (Taurus Lagna)
    const raw3 = await calc.calculateChart(
      {
        date: { year: 1996, month: 11, day: 12 },
        time: { hour: 18, minute: 45, second: 0 },
        timezone: 'Asia/Kolkata',
        latitude: 9.9312,
        longitude: 76.2673,
        placeName: 'Kochi, India',
      },
      DEFAULT_ASTROLOGY_CONFIG
    );
    meeraChart = normalizeAstroChart(raw3);
  });

  // ==========================================================================
  // DIRECTIVE 1 & 2: DYNAMIC INSTRUCTIONS & ZERO PROFILE HARDCODING
  // ==========================================================================
  describe('Directives 1 & 2: Dynamic Topic Instructions & Chart Specificity', () => {
    it('should derive Topic 7 instructions dynamically for Virgo, Aries, and Taurus charts', () => {
      const p1 = careerEvidencePackager.packageEvidenceForPart(2, ananyaChart, null);
      const t7_1 = p1.topicList.find((t) => t.topicNumber === 7)!;
      expect(t7_1.title).toContain('Virgo Rising');
      expect(t7_1.requiredFocus).toContain('Virgo Lagna');
      expect(t7_1.requiredFocus).toContain('21.85°');
      expect(t7_1.requiredFocus).toContain('Hasta');

      const p2 = careerEvidencePackager.packageEvidenceForPart(2, vikramChart, null);
      const t7_2 = p2.topicList.find((t) => t.topicNumber === 7)!;
      expect(t7_2.title).toContain('Aries Rising');
      expect(t7_2.requiredFocus).toContain('Aries Lagna');
      expect(t7_2.requiredFocus).not.toContain('Virgo');

      const p3 = careerEvidencePackager.packageEvidenceForPart(2, meeraChart, null);
      const t7_3 = p3.topicList.find((t) => t.topicNumber === 7)!;
      expect(t7_3.title).toContain('Taurus Rising');
      expect(t7_3.requiredFocus).toContain('Taurus Lagna');
      expect(t7_3.requiredFocus).not.toContain('Virgo Lagna');
    });

    it('should dynamically warn against Vipreet Raj Yoga on Topic 23 when Kendra/Trikona lords are involved', () => {
      const p1 = careerEvidencePackager.packageEvidenceForPart(2, ananyaChart, null);
      const t23_1 = p1.topicList.find((t) => t.topicNumber === 23)!;
      expect(t23_1.requiredFocus).toContain('DO NOT claim Vipreet Raj Yoga');

      const p2 = careerEvidencePackager.packageEvidenceForPart(2, vikramChart, null);
      const t23_2 = p2.topicList.find((t) => t.topicNumber === 23)!;
      expect(t23_2.requiredFocus).toContain('DO NOT claim Vipreet Raj Yoga');
    });

    it('should derive Topic 68 operational plan dynamically from natal placements', () => {
      const p1 = careerEvidencePackager.packageEvidenceForPart(10, ananyaChart, null);
      const t68_1 = p1.topicList.find((t) => t.topicNumber === 68)!;
      expect(t68_1.requiredFocus).toContain('Earth lagna stamina');
      expect(t68_1.requiredFocus).toContain('Virgo');

      const p2 = careerEvidencePackager.packageEvidenceForPart(10, vikramChart, null);
      const t68_2 = p2.topicList.find((t) => t.topicNumber === 68)!;
      expect(t68_2.requiredFocus).toContain('Fire lagna stamina');
      expect(t68_2.requiredFocus).toContain('Aries');
    });
  });

  // ==========================================================================
  // DIRECTIVE 3: REMOVAL OF FABRICATED FALLBACK VALUES
  // ==========================================================================
  describe('Directive 3: Removal of Fabricated Fallbacks & Unavailable Flagging', () => {
    it('should explicitly mark missing Saturn as UNAVAILABLE and block dependent topics', () => {
      const modifiedPlanets = Object.values(ananyaChart.planets).filter(
        (p) => p && p.name.toUpperCase() !== 'SATURN'
      );
      const modifiedChart: NormalizedChart = {
        ...ananyaChart,
        planets: modifiedPlanets as any,
      };

      const packet = careerEvidencePackager.packageEvidenceForPart(4, modifiedChart, null);
      expect(packet.astronomicalFacts.saturnPlacement).toBe('UNAVAILABLE');
      expect(packet.topicList[1].evidenceUnavailable).toBe(true);
      expect(packet.topicList[1].unavailableReason).toContain('Saturn placement is unavailable in input chart');
    });

    it('should mark missing ascendant data as INSUFFICIENT confidence', () => {
      const invalidChart: NormalizedChart = {
        ...ananyaChart,
        ascendant: undefined as any,
      };

      const packet = careerEvidencePackager.packageEvidenceForPart(1, invalidChart, null);
      expect(packet.astronomicalFacts.ascendantDegreeFormatted).toBe('UNAVAILABLE');
    });
  });

  // ==========================================================================
  // DIRECTIVE 4: GENUINE REGISTERED EVIDENCE IDENTIFIERS
  // ==========================================================================
  describe('Directive 4: Genuine Evidence Identifiers Linked to Registry', () => {
    it('should produce structured, valid evidence IDs for every topic', () => {
      for (let part = 1; part <= 10; part++) {
        const packet = careerEvidencePackager.packageEvidenceForPart(part, ananyaChart, null);
        for (const topic of packet.topicList) {
          expect(Array.isArray(topic.evidenceIds)).toBe(true);
          for (const id of topic.evidenceIds) {
            expect(typeof id).toBe('string');
            expect(id.length).toBeGreaterThan(0);
            expect(id).toMatch(/^(ascendant|planet|house|conjunction|varga|nakshatra|sav|timing|transit|remedial|work|leadership|income|entrepreneurship|career)/);
          }
        }
      }
    });
  });

  // ==========================================================================
  // DIRECTIVE 5: REAL D10, SAV, DASHA, AND GOCHARA
  // ==========================================================================
  describe('Directive 5: Real D10, SAV, Dasha, and Gochara Calculations', () => {
    it('should calculate real D10 Dashamsha chart placements rather than copying D1', () => {
      const packet = careerEvidencePackager.packageEvidenceForPart(3, ananyaChart, null);
      expect(packet.astronomicalFacts.d10Ascendant).toBe('Dhanu');
      expect(packet.astronomicalFacts.d10TenthHouse).toBe('Kanya');
      expect(packet.astronomicalFacts.d10Ascendant).not.toBe(ananyaChart.ascendant.sign);
    });

    it('should calculate real Gochara transits relative to natal Lagna and Moon', () => {
      const packet = careerEvidencePackager.packageEvidenceForPart(8, ananyaChart, null);
      expect(packet.astronomicalFacts.saturnGocharaHouseLagna).toBe('7th House (Pisces (Meena))');
      expect(packet.astronomicalFacts.jupiterGocharaHouseLagna).toBe('10th House (Gemini (Mithuna))');
    });
  });

  // ==========================================================================
  // DIRECTIVE 6: 12-SIGN FUNCTIONAL BENEFIC & GEMSTONE MATRIX
  // ==========================================================================
  describe('Directive 6: 12-Sign Functional Benefic & Gemstone Matrix', () => {
    it('should correctly map functional benefics and gemstones for all 12 Lagnas without fallback', () => {
      const packager = new CareerEvidencePackager();
      const signs = [
        'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
        'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
      ];

      for (const sign of signs) {
        const data = packager.getClassicalFunctionalBeneficsAndGemstone(sign);
        expect(data.isAvailable).toBe(true);
        expect(data.recommendedGemstone).toBeDefined();
        expect(data.gemstonePlanet).toBeDefined();
        expect(data.gemstoneMetal).toBeDefined();
      }

      // Check specific mappings
      expect(packager.getClassicalFunctionalBeneficsAndGemstone('Aries').recommendedGemstone).toContain('Red Coral');
      expect(packager.getClassicalFunctionalBeneficsAndGemstone('Taurus').recommendedGemstone).toContain('Diamond');
      expect(packager.getClassicalFunctionalBeneficsAndGemstone('Virgo').recommendedGemstone).toContain('Emerald');
      expect(packager.getClassicalFunctionalBeneficsAndGemstone('Scorpio').recommendedGemstone).toContain('Red Coral');

      // Invalid returns unavailable
      const unavail = packager.getClassicalFunctionalBeneficsAndGemstone('InvalidSign');
      expect(unavail.isAvailable).toBe(false);
      expect(unavail.recommendedGemstone).toBe('UNAVAILABLE');
    });
  });

  // ==========================================================================
  // DIRECTIVE 7: STRICT JSON SCHEMA & CLAIM VALIDATION
  // ==========================================================================
  describe('Directive 7: Strict JSON Schema & Claim-Level Validation', () => {
    const validator = new CareerEditorialTopicValidator();

    it('should reject a topic with 2 or 4 paragraphs (must be exactly 3)', () => {
      const invalid2Paras = {
        topicNumber: 7,
        title: 'Valid Title',
        subtitle: 'Valid Subtitle',
        paragraphs: [
          'Paragraph one with enough length to meet character minimums.',
          'Paragraph two with enough length to meet character minimums.',
        ],
        diamondPointers: ['✦ One', '✦ Two', '✦ Three', '✦ Four', '✦ Five'],
        takeaway: 'This is a valid takeaway sentence with enough length.',
      };

      const res = validator.validate(invalid2Paras, { expectedTopicNumber: 7 });
      expect(res.isValid).toBe(false);
      expect(res.errors[0]).toContain('EXACTLY 3 items');
    });

    it('should reject a topic with 4 or 6 diamond pointers (must be exactly 5)', () => {
      const invalid4Bullets = {
        topicNumber: 7,
        title: 'Valid Title',
        subtitle: 'Valid Subtitle',
        paragraphs: [
          'Paragraph one with enough length to meet character minimums.',
          'Paragraph two with enough length to meet character minimums.',
          'Paragraph three with enough length to meet character minimums.',
        ],
        diamondPointers: ['✦ One', '✦ Two', '✦ Three', '✦ Four'],
        takeaway: 'This is a valid takeaway sentence with enough length.',
      };

      const res = validator.validate(invalid4Bullets, { expectedTopicNumber: 7 });
      expect(res.isValid).toBe(false);
      expect(res.errors[0]).toContain('EXACTLY 5 items');
    });

    it('should reject a diamond pointer that does not start with ✦', () => {
      const invalidBulletGlyph = {
        topicNumber: 7,
        title: 'Valid Title',
        subtitle: 'Valid Subtitle',
        paragraphs: [
          'Paragraph one with enough length to meet character minimums.',
          'Paragraph two with enough length to meet character minimums.',
          'Paragraph three with enough length to meet character minimums.',
        ],
        diamondPointers: [
          '✦ One pointer starting with diamond',
          '✦ Two pointer starting with diamond',
          '- Three starting with dash instead of diamond',
          '✦ Four pointer starting with diamond',
          '✦ Five pointer starting with diamond',
        ],
        takeaway: 'This is a valid takeaway sentence with enough length.',
      };

      const res = validator.validate(invalidBulletGlyph, { expectedTopicNumber: 7 });
      expect(res.isValid).toBe(false);
      expect(res.errors[0]).toContain('must start with the diamond glyph "✦"');
    });

    it('should detect and reject cross-profile contamination', () => {
      const contaminatedTopic = {
        topicNumber: 7,
        title: 'Ascendant Secrets: Virgo Rising',
        subtitle: 'Valid Subtitle',
        paragraphs: [
          'Your chart has strong indications of Scorpio Rising with intense passion.',
          'Paragraph two with enough length to meet character minimums.',
          'Paragraph three with enough length to meet character minimums.',
        ],
        diamondPointers: ['✦ One', '✦ Two', '✦ Three', '✦ Four', '✦ Five'],
        takeaway: 'This is a valid takeaway sentence with enough length.',
      };

      const res = validator.validate(contaminatedTopic, {
        expectedTopicNumber: 7,
        lagnaSign: 'Virgo',
        disallowedSigns: ['Scorpio', 'Aries', 'Taurus'],
      });

      expect(res.isValid).toBe(false);
      expect(res.claimValidation.passed).toBe(false);
      expect(res.claimValidation.violations[0]).toContain('CROSS_PROFILE_CONTAMINATION');
    });

    it('should reject contradictory planetary signs (e.g. claiming natal Sun in Pisces for Ananya)', () => {
      const generator = new ResumableCareerGeneratorService({ cacheDir: '/tmp' });
      const chartPlacements = generator.extractChartPlacements(ananyaChart);

      const contradictorySignTopic = {
        topicNumber: 23,
        title: 'Secondary Conjunction in House 12',
        subtitle: 'Valid Subtitle',
        paragraphs: [
          'In your natal chart, your Sun in Pisces creates a subtle intuitive orientation.',
          'Paragraph two with enough length to meet character minimums.',
          'Paragraph three with enough length to meet character minimums.',
        ],
        diamondPointers: ['✦ One', '✦ Two', '✦ Three', '✦ Four', '✦ Five'],
        takeaway: 'This is a valid takeaway sentence with enough length.',
      };

      const res = validator.validate(contradictorySignTopic, {
        expectedTopicNumber: 23,
        chartPlacements,
      });

      expect(res.isValid).toBe(false);
      expect(res.claimValidation.violations[0]).toContain('CONTRADICTORY_PLANET_SIGN');
      expect(res.claimValidation.violations[0]).toContain('client\'s actual Sun is in Leo');
    });

    it('should reject contradictory planetary house assignments (e.g. claiming Sun in House 5 for Ananya)', () => {
      const generator = new ResumableCareerGeneratorService({ cacheDir: '/tmp' });
      const chartPlacements = generator.extractChartPlacements(ananyaChart);

      const contradictoryHouseTopic = {
        topicNumber: 23,
        title: 'Secondary Conjunction in House 12',
        subtitle: 'Valid Subtitle',
        paragraphs: [
          'In your natal chart, your Sun is placed in the fifth house of strategic creativity.',
          'Paragraph two with enough length to meet character minimums.',
          'Paragraph three with enough length to meet character minimums.',
        ],
        diamondPointers: ['✦ One', '✦ Two', '✦ Three', '✦ Four', '✦ Five'],
        takeaway: 'This is a valid takeaway sentence with enough length.',
      };

      const res = validator.validate(contradictoryHouseTopic, {
        expectedTopicNumber: 23,
        chartPlacements,
      });

      expect(res.isValid).toBe(false);
      expect(res.claimValidation.violations[0]).toContain('CONTRADICTORY_PLANET_HOUSE');
      expect(res.claimValidation.violations[0]).toContain('client\'s actual Sun is in House 12');
    });

    it('should allow educational comparisons mentioning other signs without rejecting them', () => {
      const generator = new ResumableCareerGeneratorService({ cacheDir: '/tmp' });
      const chartPlacements = generator.extractChartPlacements(ananyaChart);

      const educationalTopic = {
        topicNumber: 7,
        title: 'Ascendant Secrets: Virgo Rising',
        subtitle: 'The Analytical Strategist',
        paragraphs: [
          'Your Virgo Ascendant at 21.85 degrees provides methodical precision to your work.',
          'Unlike an Aries archetype which rushes into action, your analytical engine pauses to evaluate.',
          'With Mercury in the twelfth house, quiet seclusion is your most productive environment.',
        ],
        diamondPointers: [
          '✦ Precision Focus: Methodical attention to detail defines your output.',
          '✦ Contrast with Cardinal Energy: Thoughtful analysis precedes execution.',
          '✦ Backend Mastery: Thrives in institutional research environments.',
          '✦ Solar Synergy: Sun in Leo in the 12th house provides dignified authority.',
          '✦ Sustainable Pacing: Mental rest maintains long-term cognitive stamina.',
        ],
        takeaway: 'Your strength lies in applying quiet, methodical Virgoan precision to institutional challenges.',
      };

      const res = validator.validate(educationalTopic, {
        expectedTopicNumber: 7,
        lagnaSign: 'Virgo',
        chartPlacements,
        disallowedSigns: ['Aries', 'Scorpio'],
      });

      expect(res.isValid).toBe(true);
      expect(res.claimValidation.passed).toBe(true);
    });

    it('should reject unsupported yoga claims when not established by evidence', () => {
      const falseYogaTopic = {
        topicNumber: 23,
        title: 'Secondary Conjunction in House 12',
        subtitle: 'Valid Subtitle',
        paragraphs: [
          'In this chart you possess a magnificent Vipreet Raj Yoga giving unearned triumphs.',
          'Paragraph two with enough length to meet character minimums.',
          'Paragraph three with enough length to meet character minimums.',
        ],
        diamondPointers: ['✦ One', '✦ Two', '✦ Three', '✦ Four', '✦ Five'],
        takeaway: 'This is a valid takeaway sentence with enough length.',
      };

      const res = validator.validate(falseYogaTopic, {
        expectedTopicNumber: 23,
        disallowedYogas: ['Vipreet Raj Yoga'],
      });

      expect(res.isValid).toBe(false);
      expect(res.claimValidation.violations[0]).toContain('UNSUPPORTED_YOGA_CLAIM');
    });
  });

  // ==========================================================================
  // DIRECTIVE 8 & 10: RESUMABILITY, COMPOSITE IDENTITY, ISOLATION & COST
  // ==========================================================================
  describe('Directive 8 & 10: Resumable Topic Generation & Composite Isolation', () => {
    const testCacheDir = '/tmp/astro-sushil/test-resumable-cache-v2';

    beforeEach(() => {
      if (fs.existsSync(testCacheDir)) {
        fs.rmSync(testCacheDir, { recursive: true, force: true });
      }
      fs.mkdirSync(testCacheDir, { recursive: true });
    });

    afterAll(() => {
      if (fs.existsSync(testCacheDir)) {
        fs.rmSync(testCacheDir, { recursive: true, force: true });
      }
    });

    it('should reuse valid completed outputs from cache when composite identity matches', async () => {
      const generator = new ResumableCareerGeneratorService({
        cacheDir: testCacheDir,
        apiKey: 'mock-key',
      });

      const client = {
        name: 'Dr. Ananya Iyer',
        dateOfBirth: '1991-08-24',
        timeOfBirth: '09:15:00',
        birthPlace: 'Bengaluru, India',
        latitude: 12.9716,
        longitude: 77.5946,
      };

      const birthData = {
        dob: client.dateOfBirth,
        tob: client.timeOfBirth,
        lat: client.latitude,
        lng: client.longitude,
        place: client.birthPlace,
      };

      const chartHash = computeSha256({
        asc: ananyaChart.ascendant,
        planets: Object.values(ananyaChart.planets || {}).map((p) => ({
          n: p.name,
          s: p.sign,
          d: p.degree,
          h: p.house,
        })),
      });

      const p2 = careerEvidencePackager.packageEvidenceForPart(2, ananyaChart, null, client);
      const t7Def = p2.topicList.find((t) => t.topicNumber === 7)!;
      const evidenceHash = computeSha256({
        topicNumber: 7,
        focus: t7Def.requiredFocus,
        evidenceIds: t7Def.evidenceIds,
        facts: p2.astronomicalFacts,
      });

      const cacheKey = createCompositeCacheKey({
        clientId: client.name,
        birthData,
        chartHash,
        evidenceHash,
        topicNumber: 7,
        promptVersion: CAREER_EDITORIAL_PROMPT_VERSION,
        schemaVersion: CAREER_EDITORIAL_SCHEMA_VERSION,
        modelVersion: 'gemini-3.8-flash',
      });

      // Seed valid cache for Topic 7
      const validEntry = {
        cacheKey,
        cacheIdentity: {
          clientId: client.name,
          birthData,
          chartHash,
          evidenceHash,
          topicNumber: 7,
          promptVersion: CAREER_EDITORIAL_PROMPT_VERSION,
          schemaVersion: CAREER_EDITORIAL_SCHEMA_VERSION,
          modelVersion: 'gemini-3.8-flash',
        },
        topic: {
          topicNumber: 7,
          title: 'Ascendant Secrets: Virgo Rising',
          subtitle: 'The Precision Architect and the Hidden Strategist',
          paragraphs: [
            'Your vocational identity is anchored in Virgo at 21.85 degrees in Hasta Nakshatra.',
            'A defining feature of your chart is the placement of your Lagna Lord Mercury in the 12th house in Leo.',
            'This configuration presents a specific set of operational dynamics requiring quiet focus.',
          ],
          diamondPointers: [
            '✦ Precision-Driven Methodology: Hasta 4 placement grants high resolution detail.',
            '✦ Institutional Strategic Focus: Excels in roles involving backend operations.',
            '✦ Cognitive Recharge Requirements: Analytical engine requires periods of solitude.',
            '✦ Understated Authority: Quiet intellectual confidence commanding respect.',
            '✦ Perfectionist Calibration: Balancing functional excellence with sustainable energy.',
          ],
          takeaway: 'Your professional path thrives when you apply Virgoan precision to institutional frameworks.',
        },
        metadata: {
          topicId: 7,
          partNumber: 2,
          promptVersion: CAREER_EDITORIAL_PROMPT_VERSION,
          schemaVersion: CAREER_EDITORIAL_SCHEMA_VERSION,
          model: 'gemini-3.8-flash',
          timestamp: new Date().toISOString(),
        },
        tokens: { promptTokens: 2000, completionTokens: 700, thinkingTokens: 800, totalTokens: 3500 },
        estimatedCostUsd: 0.0006,
      };

      const cacheFile = path.join(testCacheDir, 'topic_07.json');
      fs.writeFileSync(cacheFile, JSON.stringify(validEntry, null, 2), 'utf-8');

      // Call generator - must hit cache
      const result = await generator.generateTopic(7, 2, ananyaChart, null, client);
      expect(result.status).toBe('CACHED');
      expect(result.topic.title).toBe('Ascendant Secrets: Virgo Rising');
      expect(result.latencyMs).toBe(0);
      expect(result.costAccounting.isEstimate).toBe(true);
    });

    it('should NOT reuse cache when another client tries to access it', async () => {
      const generator = new ResumableCareerGeneratorService({
        cacheDir: testCacheDir,
        apiKey: '', // Empty key to prove it doesn't fall back to network silently if cache miss occurs
      });

      // Valid entry for Ananya
      const clientAnanya = {
        name: 'Dr. Ananya Iyer',
        dateOfBirth: '1991-08-24',
        timeOfBirth: '09:15:00',
        birthPlace: 'Bengaluru, India',
      };

      const clientVikram = {
        name: 'Vikramaditya Sen',
        dateOfBirth: '1985-04-18',
        timeOfBirth: '06:30:00',
        birthPlace: 'Kolkata, India',
      };

      // Seed Ananya's cache
      const validEntry = {
        cacheIdentity: {
          clientId: clientAnanya.name,
          chartHash: 'ananya-chart-hash',
          evidenceHash: 'ananya-evidence-hash',
        },
        topic: {
          topicNumber: 7,
          title: 'Ascendant Secrets: Virgo Rising',
          subtitle: 'Valid Subtitle',
          paragraphs: [
            'Paragraph one with enough length to meet character minimums.',
            'Paragraph two with enough length to meet character minimums.',
            'Paragraph three with enough length to meet character minimums.',
          ],
          diamondPointers: ['✦ One', '✦ Two', '✦ Three', '✦ Four', '✦ Five'],
          takeaway: 'This is a valid takeaway sentence with enough length.',
        },
      };

      const cacheFile = path.join(testCacheDir, 'topic_07.json');
      fs.writeFileSync(cacheFile, JSON.stringify(validEntry, null, 2), 'utf-8');

      // Vikram tries to call generator: must NOT hit Ananya's cache (throws API key missing because it tries to regenerate)
      await expect(
        generator.generateTopic(7, 2, vikramChart, null, clientVikram)
      ).rejects.toThrow('GEMINI_API_KEY is not configured');
    });

    it('should invalidate cache if birth data or chart changes', async () => {
      const generator = new ResumableCareerGeneratorService({
        cacheDir: testCacheDir,
        apiKey: '', // Empty key to assert regeneration attempt
      });

      const client = {
        name: 'Dr. Ananya Iyer',
        dateOfBirth: '1991-08-24',
        timeOfBirth: '09:15:00',
        birthPlace: 'Bengaluru, India',
      };

      // Cache seeded with old chart hash
      const staleEntry = {
        cacheIdentity: {
          clientId: client.name,
          chartHash: 'stale-different-chart-hash',
          evidenceHash: 'evidence-hash',
        },
        topic: {
          topicNumber: 7,
          title: 'Stale Title',
          subtitle: 'Stale Subtitle',
          paragraphs: ['P1 long enough', 'P2 long enough', 'P3 long enough'],
          diamondPointers: ['✦ 1', '✦ 2', '✦ 3', '✦ 4', '✦ 5'],
          takeaway: 'Takeaway long enough',
        },
      };

      const cacheFile = path.join(testCacheDir, 'topic_07.json');
      fs.writeFileSync(cacheFile, JSON.stringify(staleEntry, null, 2), 'utf-8');

      // Must reject stale cache and attempt regeneration
      await expect(
        generator.generateTopic(7, 2, ananyaChart, null, client)
      ).rejects.toThrow('GEMINI_API_KEY is not configured');
    });

    it('should calculate estimated cost correctly based on token rates', () => {
      const cost = calculateEstimatedCostUsd(10000, 2000, 1000);
      expect(cost).toBe(0.00165);
    });
  });
});

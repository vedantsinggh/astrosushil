import { describe, it, expect } from 'vitest';
import { ChartCalculator, normalizeAstroChart } from '@astro/astrology-engine';
import { AstrologyEvidenceEngine, DeterministicPredictionEngine } from '@astro/prediction-engine';

describe('Phase 10 Astrology Intelligence & Evidence Engine Unit Tests', () => {
  const calculator = new ChartCalculator();
  const evidenceEngine = new AstrologyEvidenceEngine();
  const predictionEngine = new DeterministicPredictionEngine();

  // Known golden birth input (1990-05-15 14:30 IST, New Delhi)
  const goldenBirthDetails = {
    name: 'Golden Fixture',
    dateOfBirth: '1990-05-15',
    timeOfBirth: '14:30:00',
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
  };

  const activeConfig = {
    zodiacType: 'SIDEREAL' as const,
    ayanamsa: 'LAHIRI' as const,
    houseSystem: 'WHOLE_SIGN' as const,
    nodeCalculation: 'MEAN_NODE' as const,
    planetaryCalculationMode: 'GEOCENTRIC' as const,
    precisionDegrees: 0.0001,
    roundingRule: 'NEAREST' as const,
    dashaSystem: 'VIMSHOTTARI' as const,
  };

  it('1. Deterministic Chart Calculation produces complete, non-empty data vector', async () => {
    const rawChart = await calculator.calculateChart(goldenBirthDetails, activeConfig);
    const normalized = normalizeAstroChart(rawChart);

    expect(normalized.ascendant.sign).toBeDefined();
    expect(normalized.planets.length).toBeGreaterThanOrEqual(9);
    expect(normalized.houses.length).toBe(12);

    // Verify Sun is not an empty object
    const sun = normalized.planets.find((p) => p.name === 'SUN');
    expect(sun).toBeDefined();
    expect(sun?.sign).toBeDefined();
    expect(sun?.degree).toBeGreaterThanOrEqual(0);
  });

  it('2. Canonical AstrologySnapshot builds cleanly from chart', async () => {
    const rawChart = await calculator.calculateChart(goldenBirthDetails, activeConfig);
    const normalized = normalizeAstroChart(rawChart);
    const snapshot = evidenceEngine.createSnapshot(normalized);

    expect(snapshot.version).toBe('1.0.0');
    expect(snapshot.birthDetails.name).toBe('Golden Fixture');
    expect(snapshot.ascendant.sign).toBe(normalized.ascendant.sign);
    expect(snapshot.planets).toHaveLength(normalized.planets.length);
  });

  it('3. AstrologyEvidenceEngine extracts multi-domain deterministic evidence', async () => {
    const rawChart = await calculator.calculateChart(goldenBirthDetails, activeConfig);
    const normalized = normalizeAstroChart(rawChart);

    const careerEv = evidenceEngine.extractDomainEvidence(normalized, 'CAREER');
    expect(careerEv.domain).toBe('CAREER');
    expect(careerEv.supportingFacts.length).toBeGreaterThan(0);

    const moneyEv = evidenceEngine.extractDomainEvidence(normalized, 'MONEY');
    expect(moneyEv.domain).toBe('MONEY');
    expect(moneyEv.supportingFacts.length).toBeGreaterThan(0);

    const healthEv = evidenceEngine.extractDomainEvidence(normalized, 'HEALTH_GENERAL');
    expect(healthEv.domain).toBe('HEALTH_GENERAL');
    // Verify informational disclaimer presence
    const disclaimer = healthEv.supportingFacts.find((f) => f.source === 'DISCLAIMER');
    expect(disclaimer).toBeDefined();
    expect(disclaimer?.factText).toContain('INFORMATIONAL ONLY');
  });

  it('4. DeterministicPredictionEngine generates rule-based predictions & trace', async () => {
    const rawChart = await calculator.calculateChart(goldenBirthDetails, activeConfig);
    const normalized = normalizeAstroChart(rawChart);

    const { predictions, trace } = predictionEngine.generatePredictions(normalized, 'CAREER');

    expect(predictions.length).toBeGreaterThan(0);
    expect(trace.triggeredRules.length).toBeGreaterThan(0);
    expect(trace.llmUsed).toBe(false);

    const careerPred = predictions.find((p) => p.category === 'CAREER');
    expect(careerPred).toBeDefined();
    expect(careerPred?.confidence).toBeDefined();
    expect(careerPred?.underlyingEvidence.length).toBeGreaterThan(0);
  });

  it('5. Golden Fixture Repeatability: Identical inputs produce 100% identical outputs', async () => {
    const chartA = await calculator.calculateChart(goldenBirthDetails, activeConfig);
    const chartB = await calculator.calculateChart(goldenBirthDetails, activeConfig);

    const normA = normalizeAstroChart(chartA);
    const normB = normalizeAstroChart(chartB);

    expect(normA.ascendant.sign).toBe(normB.ascendant.sign);
    expect(normA.ascendant.degree).toBe(normB.ascendant.degree);

    const evA = evidenceEngine.extractDomainEvidence(normA, 'CAREER');
    const evB = evidenceEngine.extractDomainEvidence(normB, 'CAREER');

    expect(evA.supportingFacts.length).toBe(evB.supportingFacts.length);
    expect(evA.summaryNote).toBe(evB.summaryNote);
  });
});

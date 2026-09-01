import { NormalizedChart } from '@astro/astrology-engine';
import {
  AstrologySnapshot,
  DomainCategory,
  DeterministicPredictionItem,
  AstrologyExplanationTrace,
} from '../types/astrology-snapshot.types';
import { AstrologyEvidenceEngine } from './astrology-evidence.engine';

export class DeterministicPredictionEngine {
  private readonly evidenceEngine: AstrologyEvidenceEngine;

  constructor() {
    this.evidenceEngine = new AstrologyEvidenceEngine();
  }

  /**
   * Evaluates deterministic rules against chart evidence to generate predictions.
   * Does NOT call LLMs or generate random outputs.
   */
  public generatePredictions(
    chart: NormalizedChart,
    category?: DomainCategory
  ): {
    predictions: DeterministicPredictionItem[];
    trace: AstrologyExplanationTrace;
  } {
    const snapshot = this.evidenceEngine.createSnapshot(chart);
    const targetDomain: DomainCategory = category || 'CAREER';
    const evidence = this.evidenceEngine.extractDomainEvidence(chart, targetDomain);

    const predictions: DeterministicPredictionItem[] = [];
    const triggeredRules: string[] = [];

    // RULE P-CAREER-01: 10th Lord Placement
    const h10 = chart.houses.find((h) => h.number === 10);
    const h10LordPlanet = chart.planets.find((p) => p.name === h10?.lord);
    if (h10 && h10LordPlanet) {
      triggeredRules.push('RULE_P_CAREER_01_10TH_LORD');
      predictions.push({
        id: `pred-career-01-${Date.now()}`,
        category: 'CAREER',
        title: 'Professional Direction & Career Focus',
        confidence: h10LordPlanet.dignity === 'EXALTED' || h10LordPlanet.dignity === 'OWN_SIGN' ? 'VERY_HIGH' : 'HIGH',
        underlyingEvidence: [
          `10th House in ${h10.sign} ruled by ${h10.lord}`,
          `10th Lord ${h10.lord} placed in House ${h10LordPlanet.house} (${h10LordPlanet.sign}, ${h10LordPlanet.dignity})`,
        ],
        ruleCode: 'RULE_P_CAREER_01_10TH_LORD',
        interpretationText: `Career agenda is centered around House ${h10LordPlanet.house} themes, supported by ${h10.lord} placement in ${h10LordPlanet.sign}.`,
      });
    }

    // RULE P-MONEY-01: Wealth & Income Activation
    const h2 = chart.houses.find((h) => h.number === 2);
    const h11 = chart.houses.find((h) => h.number === 11);
    if (h2 && h11) {
      triggeredRules.push('RULE_P_MONEY_01_DHANA');
      predictions.push({
        id: `pred-money-01-${Date.now()}`,
        category: 'MONEY',
        title: 'Financial Growth & Revenue Potential',
        confidence: 'HIGH',
        underlyingEvidence: [
          `2nd House (Accumulated Wealth) in ${h2.sign}`,
          `11th House (Gains) in ${h11.sign}`,
        ],
        ruleCode: 'RULE_P_MONEY_01_DHANA',
        interpretationText: `Financial stability is anchored by 2nd house (${h2.sign}) accumulated assets and 11th house (${h11.sign}) regular income flows.`,
      });
    }

    // RULE P-PERSONALITY-01: Ascendant & Core Drive
    triggeredRules.push('RULE_P_PERSONALITY_01_ASCENDANT');
    predictions.push({
      id: `pred-personality-01-${Date.now()}`,
      category: 'PERSONALITY',
      title: 'Core Temperament & Drive',
      confidence: 'VERY_HIGH',
      underlyingEvidence: [
        `Ascendant in ${chart.ascendant.sign} (${chart.ascendant.nakshatra} Nakshatra)`,
        `Ascendant Lord ${chart.ascendant.lord} in House ${chart.ascendant.house}`,
      ],
      ruleCode: 'RULE_P_PERSONALITY_01_ASCENDANT',
      interpretationText: `Personal drive expresses through ${chart.ascendant.sign} qualities, emphasizing ${chart.ascendant.lord} governance.`,
    });

    const trace: AstrologyExplanationTrace = {
      domain: targetDomain,
      snapshotVersion: snapshot.version,
      evidenceFactsCount: evidence.supportingFacts.length,
      triggeredRules,
      rawAnalysis: { predictionsCount: predictions.length },
      llmUsed: false,
      timestamp: new Date().toISOString(),
    };

    return { predictions, trace };
  }
}

import { NormalizedChart, NormalizedPlanet, NormalizedHouse } from '@astro/astrology-engine';
import {
  AstrologySnapshot,
  DomainCategory,
  DomainEvidence,
  DomainEvidenceFact,
} from '../types/astrology-snapshot.types';
import { CareerEvidenceEngine } from './career-evidence.engine';

export class AstrologyEvidenceEngine {
  private readonly careerEngine: CareerEvidenceEngine;

  constructor() {
    this.careerEngine = new CareerEvidenceEngine();
  }

  /**
   * Build canonical AstrologySnapshot from NormalizedChart.
   */
  public createSnapshot(chart: NormalizedChart): AstrologySnapshot {
    return {
      version: '1.0.0',
      calculation: {
        calculationVersion: chart.calculation?.calculationVersion || '0.1.0',
        providerName: chart.calculation?.providerName || 'AstroSushil Engine',
        providerVersion: chart.calculation?.providerVersion || '1.0',
        calculationTimestampIso: chart.calculation?.calculationTimestampIso || new Date().toISOString(),
        normalizedTime: {
          utcIsoString: chart.calculation?.normalizedTime?.utcIsoString || new Date().toISOString(),
          julianDayUT: chart.calculation?.normalizedTime?.julianDayUT || 0,
          timezoneOffsetMinutes: chart.calculation?.normalizedTime?.timezoneOffsetMinutes || 330,
        },
        config: {
          zodiacType: chart.calculation?.config?.zodiacType || 'SIDEREAL',
          ayanamsa: chart.calculation?.config?.ayanamsa || 'LAHIRI',
          houseSystem: chart.calculation?.config?.houseSystem || 'WHOLE_SIGN',
          nodeCalculation: chart.calculation?.config?.nodeCalculation || 'MEAN_NODE',
          planetaryCalculationMode: chart.calculation?.config?.planetaryCalculationMode || 'GEOCENTRIC',
        },
      },
      birthDetails: {
        name: chart.birthDetails?.name || 'Valued Client',
        dateOfBirth: chart.birthDetails?.dateOfBirth || 'Not supplied',
        timeOfBirth: chart.birthDetails?.timeOfBirth || 'Not supplied',
        latitude: chart.birthDetails?.latitude || 28.6139,
        longitude: chart.birthDetails?.longitude || 77.209,
        timezone: chart.timezone || chart.birthDetails?.timezone || 'Asia/Kolkata',
        placeName: chart.birthDetails?.placeName || 'New Delhi, India',
      },
      ascendant: chart.ascendant,
      planets: chart.planets,
      houses: chart.houses,
      rashis: chart.rashis,
      nakshatras: chart.nakshatras,
    };
  }

  /**
   * Extract deterministic domain evidence for a given category.
   */
  public extractDomainEvidence(chart: NormalizedChart, domain: DomainCategory): DomainEvidence {
    switch (domain) {
      case 'CAREER':
        return this.extractCareerDomainEvidence(chart);
      case 'MONEY':
        return this.extractMoneyDomainEvidence(chart);
      case 'EDUCATION':
        return this.extractEducationDomainEvidence(chart);
      case 'RELATIONSHIPS':
        return this.extractRelationshipsDomainEvidence(chart);
      case 'HEALTH_GENERAL':
        return this.extractHealthDomainEvidence(chart);
      case 'PERSONALITY':
        return this.extractPersonalityDomainEvidence(chart);
      case 'TIMING':
      default:
        return this.extractTimingDomainEvidence(chart);
    }
  }

  // 1. CAREER
  private extractCareerDomainEvidence(chart: NormalizedChart): DomainEvidence {
    const careerInput = this.careerEngine.buildCareerAnalysisInput(chart);
    const supportingFacts: DomainEvidenceFact[] = careerInput.careerAxis.supportingFactors.map((f) => ({
      source: 'CAREER_AXIS',
      factText: f,
      relevanceStrength: 'HIGH',
      houseNumber: 10,
    }));

    return {
      domain: 'CAREER',
      confidence: careerInput.confidence === 'COMPLETE' ? 'COMPLETE' : 'PARTIAL',
      supportingFacts,
      conflictingFacts: careerInput.careerAxis.conflictingFactors.map((f) => ({
        source: 'CAREER_AXIS_CONFLICT',
        factText: f,
        relevanceStrength: 'MODERATE',
        houseNumber: 10,
      })),
      overallStrength: careerInput.careerAxis.strength === 'STRONG' ? 'HIGH' : 'MODERATE',
      summaryNote: `Career axis ruled by ${careerInput.careerAxis.houseTenLord} in House ${careerInput.careerAxis.houseTenLordHouse}`,
    };
  }

  // 2. MONEY / WEALTH
  private extractMoneyDomainEvidence(chart: NormalizedChart): DomainEvidence {
    const h2 = chart.houses.find((h) => h.number === 2);
    const h11 = chart.houses.find((h) => h.number === 11);
    const jupiter = chart.planets.find((p) => p.name === 'JUPITER');

    const supportingFacts: DomainEvidenceFact[] = [];
    if (h2) {
      supportingFacts.push({
        source: '2ND_HOUSE',
        factText: `2nd House (Accumulated Wealth) in ${h2.sign} ruled by ${h2.lord}`,
        relevanceStrength: 'HIGH',
        houseNumber: 2,
      });
    }
    if (h11) {
      supportingFacts.push({
        source: '11TH_HOUSE',
        factText: `11th House (Gains & Revenue) in ${h11.sign} ruled by ${h11.lord}`,
        relevanceStrength: 'HIGH',
        houseNumber: 11,
      });
    }
    if (jupiter) {
      supportingFacts.push({
        source: 'JUPITER_SIGNIFICATOR',
        factText: `Jupiter (Wealth Significator) in House ${jupiter.house} (${jupiter.sign}, ${jupiter.dignity})`,
        relevanceStrength: jupiter.dignity === 'EXALTED' || jupiter.dignity === 'OWN_SIGN' ? 'HIGH' : 'MODERATE',
        planet: 'JUPITER',
      });
    }

    return {
      domain: 'MONEY',
      confidence: 'COMPLETE',
      supportingFacts,
      conflictingFacts: [],
      overallStrength: 'HIGH',
      summaryNote: `Wealth and financial gains indicated by 2nd house (${h2?.sign}) and 11th house (${h11?.sign})`,
    };
  }

  // 3. EDUCATION / INTELLECT
  private extractEducationDomainEvidence(chart: NormalizedChart): DomainEvidence {
    const h5 = chart.houses.find((h) => h.number === 5);
    const h4 = chart.houses.find((h) => h.number === 4);
    const mercury = chart.planets.find((p) => p.name === 'MERCURY');

    const supportingFacts: DomainEvidenceFact[] = [];
    if (h5) {
      supportingFacts.push({
        source: '5TH_HOUSE',
        factText: `5th House (Intelligence & Memory) in ${h5.sign} ruled by ${h5.lord}`,
        relevanceStrength: 'HIGH',
        houseNumber: 5,
      });
    }
    if (h4) {
      supportingFacts.push({
        source: '4TH_HOUSE',
        factText: `4th House (Formal Education & Learning) in ${h4.sign} ruled by ${h4.lord}`,
        relevanceStrength: 'MODERATE',
        houseNumber: 4,
      });
    }
    if (mercury) {
      supportingFacts.push({
        source: 'MERCURY_INTELLECT',
        factText: `Mercury (Intellect Significator) in House ${mercury.house} (${mercury.sign}, ${mercury.dignity})`,
        relevanceStrength: mercury.dignity === 'EXALTED' || mercury.dignity === 'OWN_SIGN' ? 'HIGH' : 'MODERATE',
        planet: 'MERCURY',
      });
    }

    return {
      domain: 'EDUCATION',
      confidence: 'COMPLETE',
      supportingFacts,
      conflictingFacts: [],
      overallStrength: 'HIGH',
      summaryNote: `Educational aptitude grounded in 5th house (${h5?.sign}) and Mercury placement`,
    };
  }

  // 4. RELATIONSHIPS
  private extractRelationshipsDomainEvidence(chart: NormalizedChart): DomainEvidence {
    const h7 = chart.houses.find((h) => h.number === 7);
    const venus = chart.planets.find((p) => p.name === 'VENUS');

    const supportingFacts: DomainEvidenceFact[] = [];
    if (h7) {
      supportingFacts.push({
        source: '7TH_HOUSE',
        factText: `7th House (Partnerships) in ${h7.sign} ruled by ${h7.lord}`,
        relevanceStrength: 'HIGH',
        houseNumber: 7,
      });
    }
    if (venus) {
      supportingFacts.push({
        source: 'VENUS_SIGNIFICATOR',
        factText: `Venus (Relationship Significator) in House ${venus.house} (${venus.sign}, ${venus.dignity})`,
        relevanceStrength: venus.dignity === 'EXALTED' || venus.dignity === 'OWN_SIGN' ? 'HIGH' : 'MODERATE',
        planet: 'VENUS',
      });
    }

    return {
      domain: 'RELATIONSHIPS',
      confidence: 'COMPLETE',
      supportingFacts,
      conflictingFacts: [],
      overallStrength: 'MODERATE',
      summaryNote: `Relationship orientation governed by 7th house (${h7?.sign}) and Venus in House ${venus?.house}`,
    };
  }

  // 5. HEALTH_GENERAL (INFORMATIONAL ONLY - NO MEDICAL DIAGNOSIS)
  private extractHealthDomainEvidence(chart: NormalizedChart): DomainEvidence {
    const asc = chart.ascendant;
    const h6 = chart.houses.find((h) => h.number === 6);
    const sun = chart.planets.find((p) => p.name === 'SUN');

    const supportingFacts: DomainEvidenceFact[] = [
      {
        source: 'DISCLAIMER',
        factText: 'INFORMATIONAL ONLY: Astrology insights do NOT provide medical diagnosis or health treatment advice.',
        relevanceStrength: 'HIGH',
      },
      {
        source: 'ASCENDANT_VITALITY',
        factText: `Ascendant in ${asc.sign} (Ruled by ${asc.lord}) indicates constitutional baseline vitality`,
        relevanceStrength: 'HIGH',
        houseNumber: 1,
      },
    ];

    if (h6) {
      supportingFacts.push({
        source: '6TH_HOUSE_WELLNESS',
        factText: `6th House (Wellness Routines) in ${h6.sign} ruled by ${h6.lord}`,
        relevanceStrength: 'MODERATE',
        houseNumber: 6,
      });
    }

    if (sun) {
      supportingFacts.push({
        source: 'SUN_VITALITY',
        factText: `Sun (Vitality Significator) in House ${sun.house} (${sun.sign})`,
        relevanceStrength: 'MODERATE',
        planet: 'SUN',
      });
    }

    return {
      domain: 'HEALTH_GENERAL',
      confidence: 'COMPLETE',
      supportingFacts,
      conflictingFacts: [],
      overallStrength: 'MODERATE',
      summaryNote: 'Informational wellness indicators based on Ascendant vitality and 6th house routines.',
    };
  }

  // 6. PERSONALITY
  private extractPersonalityDomainEvidence(chart: NormalizedChart): DomainEvidence {
    const asc = chart.ascendant;
    const moon = chart.planets.find((p) => p.name === 'MOON');
    const sun = chart.planets.find((p) => p.name === 'SUN');

    const supportingFacts: DomainEvidenceFact[] = [
      {
        source: 'ASCENDANT_IDENTITY',
        factText: `Ascendant in ${asc.sign} (${asc.nakshatra} Nakshatra, Pada ${asc.pada})`,
        relevanceStrength: 'HIGH',
        houseNumber: 1,
      },
    ];

    if (moon) {
      supportingFacts.push({
        source: 'MOON_MIND',
        factText: `Moon (Mind & Emotions) in ${moon.sign} (${moon.nakshatra} Nakshatra, House ${moon.house})`,
        relevanceStrength: 'HIGH',
        planet: 'MOON',
      });
    }

    if (sun) {
      supportingFacts.push({
        source: 'SUN_SOUL',
        factText: `Sun (Core Ego & Will) in ${sun.sign} (House ${sun.house})`,
        relevanceStrength: 'HIGH',
        planet: 'SUN',
      });
    }

    return {
      domain: 'PERSONALITY',
      confidence: 'COMPLETE',
      supportingFacts,
      conflictingFacts: [],
      overallStrength: 'HIGH',
      summaryNote: `Personality core shaped by ${asc.sign} Ascendant, ${moon?.sign} Moon, and ${sun?.sign} Sun`,
    };
  }

  // 7. TIMING
  private extractTimingDomainEvidence(chart: NormalizedChart): DomainEvidence {
    const moon = chart.planets.find((p) => p.name === 'MOON');

    return {
      domain: 'TIMING',
      confidence: 'COMPLETE',
      supportingFacts: [
        {
          source: 'MOON_NAKSHATRA_TIMING',
          factText: `Birth Moon Nakshatra: ${moon?.nakshatra || 'Unknown'} (Pada ${moon?.pada || 1}) sets baseline Dasha timing`,
          relevanceStrength: 'HIGH',
        },
      ],
      conflictingFacts: [],
      overallStrength: 'MODERATE',
      summaryNote: `Vimshottari timing initialized from birth Moon in ${moon?.nakshatra}`,
    };
  }
}

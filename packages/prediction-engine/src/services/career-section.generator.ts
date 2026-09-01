import { CareerAnalysisInput } from '../types/evidence.types';

export interface SectionContextPayload {
  sectionName: string;
  relevantEvidence: Record<string, any>;
  guidanceNote: string;
}

export class CareerSectionGenerator {
  /**
   * Constructs section-specific context budgets to prevent token bloat and isolate LLM attention.
   */
  public buildSectionContext(sectionName: string, input: CareerAnalysisInput): SectionContextPayload {
    switch (sectionName) {
      case 'careerAxisAndIdentity':
        return {
          sectionName,
          relevantEvidence: {
            chartSummary: input.chartSummary,
            careerAxis: input.careerAxis,
            ascendantPlanet: input.planetaryEvidence.find((p) => p.planet.toUpperCase() === input.careerAxis.ascendantLord.toUpperCase()),
          },
          guidanceNote: 'Focus on Ascendant sign, lord, 10th house sign, 10th lord, and key house relationships.',
        };

      case 'leadershipAndWorkEnvironment':
        return {
          sectionName,
          relevantEvidence: {
            leadershipEvidence: input.leadershipEvidence,
            workEnvironmentEvidence: input.workEnvironmentEvidence,
            sun: input.planetaryEvidence.find((p) => p.planet === 'Sun'),
            mars: input.planetaryEvidence.find((p) => p.planet === 'Mars'),
            saturn: input.planetaryEvidence.find((p) => p.planet === 'Saturn'),
          },
          guidanceNote: 'Focus on authority indicators, routine structure, service orientation, and operational discipline.',
        };

      case 'analyticalAndTechnical':
        return {
          sectionName,
          relevantEvidence: {
            analyticalEvidence: input.analyticalEvidence,
            mercury: input.planetaryEvidence.find((p) => p.planet === 'Mercury'),
            houseFive: input.houseEvidence.find((h) => h.houseNumber === 5),
            houseSix: input.houseEvidence.find((h) => h.houseNumber === 6),
          },
          guidanceNote: 'Focus on analytical indicators, logic, problem solving, and technical depth without hardcoding software titles.',
        };

      case 'creativeAndCommunication':
        return {
          sectionName,
          relevantEvidence: {
            communicationEvidence: input.communicationEvidence,
            creativityEvidence: input.creativityEvidence,
            venus: input.planetaryEvidence.find((p) => p.planet === 'Venus'),
            moon: input.planetaryEvidence.find((p) => p.planet === 'Moon'),
          },
          guidanceNote: 'Focus on persuasion, negotiation, design, storytelling, and commercial interactions.',
        };

      case 'incomeAndEntrepreneurship':
        return {
          sectionName,
          relevantEvidence: {
            incomeEvidence: input.incomeEvidence,
            entrepreneurshipEvidence: input.entrepreneurshipEvidence,
            houseTwo: input.houseEvidence.find((h) => h.houseNumber === 2),
            houseEleven: input.houseEvidence.find((h) => h.houseNumber === 11),
          },
          guidanceNote: 'Focus on wealth/gains house strength and commercial initiative. Do NOT guarantee wealth or label as natural entrepreneur.',
        };

      case 'internationalAndNetworking':
        return {
          sectionName,
          relevantEvidence: {
            internationalEvidence: input.internationalEvidence,
            networkingEvidence: input.networkingEvidence,
            houseNine: input.houseEvidence.find((h) => h.houseNumber === 9),
            houseTwelve: input.houseEvidence.find((h) => h.houseNumber === 12),
          },
          guidanceNote: 'Focus on foreign connection indicators and network reach without claiming mandatory relocation.',
        };

      case 'timingAndYogas':
        return {
          sectionName,
          relevantEvidence: {
            timingEvidence: input.timingEvidence,
            yogaEvidence: input.yogaEvidence,
          },
          guidanceNote: 'If timing/yogas are UNAVAILABLE, state so clearly. Do NOT fabricate dates or yogas.',
        };

      default:
        return {
          sectionName,
          relevantEvidence: {
            chartSummary: input.chartSummary,
            careerAxis: input.careerAxis,
            evidenceConflicts: input.evidenceConflicts,
          },
          guidanceNote: 'Synthesize overall evidence themes and non-contradictory career alignment.',
        };
    }
  }
}

export const careerSectionGenerator = new CareerSectionGenerator();

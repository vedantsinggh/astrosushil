import { CareerAnalysis, CareerAnalysisInput } from '../types/evidence.types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedAnalysis?: CareerAnalysis;
}

export class CareerAnalysisValidator {
  /**
   * Validates a CareerAnalysis object against the strict anti-hallucination rules and evidence contract.
   */
  public validate(rawAnalysis: any, input: CareerAnalysisInput): ValidationResult {
    const errors: string[] = [];

    if (!rawAnalysis || typeof rawAnalysis !== 'object') {
      return { isValid: false, errors: ['Analysis payload is not a valid object'] };
    }

    // Unwrap root if nested
    let analysis = rawAnalysis;
    if (analysis.careerAnalysis && typeof analysis.careerAnalysis === 'object') {
      analysis = analysis.careerAnalysis;
    } else if (analysis.analysis && typeof analysis.analysis === 'object') {
      analysis = analysis.analysis;
    } else if (analysis.data && typeof analysis.data === 'object') {
      analysis = analysis.data;
    } else if (analysis.result && typeof analysis.result === 'object') {
      analysis = analysis.result;
    }

    // Alias mappings for minor key variations
    const aliases: Record<string, string[]> = {
      executiveCareerSummary: ['executiveSummary', 'summary', 'executive_career_summary'],
      executiveDecisionThemes: ['decisionThemes', 'decision_themes', 'executive_decision_themes'],
      executiveRecommendations: ['executive_recommendations', 'executiveRecs'],
      careerIdentity: ['identity', 'career_identity'],
      professionalPersonality: ['personality', 'professional_personality'],
      naturalStrengths: ['strengths', 'natural_strengths'],
      professionalChallenges: ['challenges', 'professional_challenges'],
      careerDNAAnalysis: ['careerDNA', 'dnaAnalysis', 'career_dna_analysis'],
      planetarySynthesis: ['planetary_synthesis', 'synthesis'],
      yogaAnalysis: ['yoga_analysis', 'yogas'],
      employmentEntrepreneurshipAnalysis: ['employmentEntrepreneurship', 'employment_entrepreneurship_analysis'],
      leadershipAnalysis: ['leadership', 'leadership_analysis'],
      technicalAnalyticalAptitude: ['technicalAnalytical', 'technical_analytical_aptitude'],
      creativeCommunicationBusinessAptitude: ['creativeCommunicationBusiness', 'creative_communication_business_aptitude'],
      researchPotential: ['research', 'research_potential'],
      sectorFit: ['sector_fit', 'sectors'],
      internationalCareer: ['international', 'international_career'],
      workEnvironment: ['environment', 'work_environment'],
      careerFieldsAnalysis: ['careerFields', 'career_fields_analysis'],
      topCareerDirections: ['topDirections', 'top_career_directions'],
      moneyIncomePattern: ['incomePattern', 'money_income_pattern'],
      relationshipsNetworking: ['networking', 'relationships_networking'],
      recommendations: ['recs', 'recommendationList'],
      actionPlanSummary: ['actionPlan', 'action_plan_summary'],
      finalSynthesis: ['final_synthesis', 'conclusion'],
    };

    for (const [key, aliasList] of Object.entries(aliases)) {
      if (!analysis[key] || (typeof analysis[key] === 'string' && analysis[key].trim().length === 0)) {
        for (const alias of aliasList) {
          if (analysis[alias] && typeof analysis[alias] === 'string' && analysis[alias].trim().length > 0) {
            analysis[key] = analysis[alias];
            break;
          }
        }
      }
    }

    // Unwrap array aliases if present
    if (!analysis.houseInterpretations) {
      if (Array.isArray(analysis.house_interpretations)) {
        analysis.houseInterpretations = analysis.house_interpretations;
      } else if (Array.isArray(analysis.houses)) {
        analysis.houseInterpretations = analysis.houses;
      } else if (Array.isArray(analysis.houseAnalysis)) {
        analysis.houseInterpretations = analysis.houseAnalysis;
      }
    }

    if (!analysis.planetInterpretations) {
      if (Array.isArray(analysis.planet_interpretations)) {
        analysis.planetInterpretations = analysis.planet_interpretations;
      } else if (Array.isArray(analysis.planets)) {
        analysis.planetInterpretations = analysis.planets;
      } else if (Array.isArray(analysis.planetaryInterpretations)) {
        analysis.planetInterpretations = analysis.planetaryInterpretations;
      } else if (Array.isArray(analysis.planetAnalysis)) {
        analysis.planetInterpretations = analysis.planetAnalysis;
      }
    }

    // 1. Check required primary fields
    const requiredStringFields = [
      'executiveCareerSummary',
      'executiveDecisionThemes',
      'executiveRecommendations',
      'careerIdentity',
      'professionalPersonality',
      'naturalStrengths',
      'professionalChallenges',
      'careerDNAAnalysis',
      'planetarySynthesis',
      'yogaAnalysis',
      'employmentEntrepreneurshipAnalysis',
      'leadershipAnalysis',
      'technicalAnalyticalAptitude',
      'creativeCommunicationBusinessAptitude',
      'researchPotential',
      'sectorFit',
      'internationalCareer',
      'workEnvironment',
      'careerFieldsAnalysis',
      'topCareerDirections',
      'moneyIncomePattern',
      'relationshipsNetworking',
      'recommendations',
      'actionPlanSummary',
      'finalSynthesis',
    ];

    for (const field of requiredStringFields) {
      if (!analysis[field] || typeof analysis[field] !== 'string' || analysis[field].trim().length === 0) {
        errors.push(`Missing or empty required field: ${field}`);
      }
    }

    // 2. Evidence ID Traceability & Set Collection
    const validEvidenceIds = this.collectValidEvidenceIds(input);
    const validHouseEvidenceIds = new Set<string>();
    for (const h of input.houseEvidence || []) {
      validHouseEvidenceIds.add(`house-${h.houseNumber}`);
    }
    const validPlanetaryEvidenceIds = new Set<string>();
    for (const p of input.planetaryEvidence || []) {
      validPlanetaryEvidenceIds.add(`planet-${p.planet.toLowerCase()}`);
    }

    // 3. Validate houseInterpretations (Structured contract for all 12 houses)
    if (!analysis.houseInterpretations || !Array.isArray(analysis.houseInterpretations)) {
      errors.push('Missing or invalid houseInterpretations: expected an array of 12 house interpretations');
    } else {
      if (analysis.houseInterpretations.length !== 12) {
        errors.push(`houseInterpretations must contain exactly 12 houses (received ${analysis.houseInterpretations.length})`);
      }
      for (let hNum = 1; hNum <= 12; hNum++) {
        const hItem = analysis.houseInterpretations.find(
          (h: any) => h && (h.houseNumber === hNum || h.house === hNum)
        );
        if (!hItem) {
          errors.push(`houseInterpretations is missing entry for House ${hNum}`);
          continue;
        }

        const houseNumVal = hItem.houseNumber ?? hItem.house;
        if (typeof houseNumVal !== 'number' || houseNumVal !== hNum) {
          errors.push(`House ${hNum} interpretation has invalid or missing houseNumber: ${JSON.stringify(houseNumVal)}`);
        } else {
          hItem.houseNumber = hNum;
        }

        const houseMeaning = hItem.houseMeaning ?? hItem.meaning ?? hItem.interpretation ?? hItem.analysis;
        if (typeof houseMeaning !== 'string' || houseMeaning.trim().length === 0) {
          errors.push(`House ${hNum} interpretation missing or empty required field: houseMeaning`);
        } else {
          hItem.houseMeaning = houseMeaning;
        }

        const careerRelevance = hItem.careerRelevance ?? hItem.relevance;
        if (typeof careerRelevance !== 'string' || careerRelevance.trim().length === 0) {
          errors.push(`House ${hNum} interpretation missing or empty required field: careerRelevance`);
        } else {
          hItem.careerRelevance = careerRelevance;
        }

        const supportingEvidence = hItem.supportingEvidence ?? hItem.evidence;
        if (typeof supportingEvidence !== 'string' || supportingEvidence.trim().length === 0) {
          errors.push(`House ${hNum} interpretation missing or empty required field: supportingEvidence`);
        } else {
          hItem.supportingEvidence = supportingEvidence;
        }

        const constructiveExpression = hItem.constructiveExpression ?? hItem.constructive;
        if (typeof constructiveExpression !== 'string' || constructiveExpression.trim().length === 0) {
          errors.push(`House ${hNum} interpretation missing or empty required field: constructiveExpression`);
        } else {
          hItem.constructiveExpression = constructiveExpression;
        }

        const potentialChallenge = hItem.potentialChallenge ?? hItem.challenge;
        if (typeof potentialChallenge !== 'string' || potentialChallenge.trim().length === 0) {
          errors.push(`House ${hNum} interpretation missing or empty required field: potentialChallenge`);
        } else {
          hItem.potentialChallenge = potentialChallenge;
        }

        const practicalInterpretation = hItem.practicalInterpretation ?? hItem.practical;
        if (typeof practicalInterpretation !== 'string' || practicalInterpretation.trim().length === 0) {
          errors.push(`House ${hNum} interpretation missing or empty required field: practicalInterpretation`);
        } else {
          hItem.practicalInterpretation = practicalInterpretation;
        }

        if (!hItem.evidenceIds || !Array.isArray(hItem.evidenceIds) || hItem.evidenceIds.length === 0) {
          errors.push(`House ${hNum} interpretation missing or empty required field: evidenceIds (must be a non-empty array)`);
        } else {
          for (const evId of hItem.evidenceIds) {
            if (typeof evId !== 'string' || evId.trim().length === 0) {
              errors.push(`House ${hNum} interpretation contains non-string, empty, or whitespace-only evidence ID: ${JSON.stringify(evId)}`);
              continue;
            }
            const trimmedId = evId.trim();
            if (!validHouseEvidenceIds.has(trimmedId)) {
              errors.push(`Invalid evidence ID referenced in House ${hNum} interpretation: "${evId}"`);
            }
          }
        }
      }
    }

    // 4. Validate planetInterpretations (Structured contract for all 9 canonical planets)
    const canonicalPlanets = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN', 'RAHU', 'KETU'];
    if (!analysis.planetInterpretations || !Array.isArray(analysis.planetInterpretations)) {
      errors.push('Missing or invalid planetInterpretations: expected an array of 9 planet interpretations');
    } else {
      if (analysis.planetInterpretations.length !== 9) {
        errors.push(`planetInterpretations must contain exactly 9 planets (received ${analysis.planetInterpretations.length})`);
      }
      for (const sym of canonicalPlanets) {
        const pItem = analysis.planetInterpretations.find(
          (p: any) => p && typeof p.planet === 'string' && p.planet.toUpperCase() === sym
        );
        if (!pItem) {
          errors.push(`planetInterpretations is missing entry for planet ${sym}`);
          continue;
        }

        const placementSummary = pItem.placementSummary ?? pItem.summary ?? pItem.placement;
        if (typeof placementSummary !== 'string' || placementSummary.trim().length === 0) {
          errors.push(`Planet ${sym} interpretation missing or empty required field: placementSummary`);
        } else {
          pItem.placementSummary = placementSummary;
        }

        const careerSignificance = pItem.careerSignificance ?? pItem.significance;
        if (typeof careerSignificance !== 'string' || careerSignificance.trim().length === 0) {
          errors.push(`Planet ${sym} interpretation missing or empty required field: careerSignificance`);
        } else {
          pItem.careerSignificance = careerSignificance;
        }

        const constructiveExpression = pItem.constructiveExpression ?? pItem.constructive;
        if (typeof constructiveExpression !== 'string' || constructiveExpression.trim().length === 0) {
          errors.push(`Planet ${sym} interpretation missing or empty required field: constructiveExpression`);
        } else {
          pItem.constructiveExpression = constructiveExpression;
        }

        const potentialPressure = pItem.potentialPressure ?? pItem.potentialChallenge ?? pItem.challenge;
        if (typeof potentialPressure !== 'string' || potentialPressure.trim().length === 0) {
          errors.push(`Planet ${sym} interpretation missing or empty required field: potentialPressure`);
        } else {
          pItem.potentialPressure = potentialPressure;
        }

        const placementSpecificInterpretation = pItem.placementSpecificInterpretation ?? pItem.placementInterpretation ?? pItem.placement;
        if (typeof placementSpecificInterpretation !== 'string' || placementSpecificInterpretation.trim().length === 0) {
          errors.push(`Planet ${sym} interpretation missing or empty required field: placementSpecificInterpretation`);
        } else {
          pItem.placementSpecificInterpretation = placementSpecificInterpretation;
        }

        const practicalCareerImplication = pItem.practicalCareerImplication ?? pItem.practicalCareerInterpretation ?? pItem.practical;
        if (typeof practicalCareerImplication !== 'string' || practicalCareerImplication.trim().length === 0) {
          errors.push(`Planet ${sym} interpretation missing or empty required field: practicalCareerImplication`);
        } else {
          pItem.practicalCareerImplication = practicalCareerImplication;
        }

        if (!pItem.evidenceIds || !Array.isArray(pItem.evidenceIds) || pItem.evidenceIds.length === 0) {
          errors.push(`Planet ${sym} interpretation missing or empty required field: evidenceIds (must be a non-empty array)`);
        } else {
          for (const evId of pItem.evidenceIds) {
            if (typeof evId !== 'string' || evId.trim().length === 0) {
              errors.push(`Planet ${sym} interpretation contains non-string, empty, or whitespace-only evidence ID: ${JSON.stringify(evId)}`);
              continue;
            }
            const trimmedId = evId.trim();
            if (!validPlanetaryEvidenceIds.has(trimmedId)) {
              errors.push(`Invalid evidence ID referenced in Planet ${sym} interpretation: "${evId}"`);
            }
          }
        }
      }
    }

    // 5. Anti-Hallucination: Check for forbidden guaranteed predictions or horoscope tropes
    const forbiddenPhrases = [
      'will become rich',
      'destined for success',
      'you will definitely move abroad',
      'guaranteed promotion',
      'the universe demands',
      'destiny guarantees',
    ];

    const jsonString = JSON.stringify(analysis).toLowerCase();
    for (const phrase of forbiddenPhrases) {
      if (jsonString.includes(phrase)) {
        errors.push(`Forbidden guaranteed prediction or cliché detected: "${phrase}"`);
      }
    }

    // 6. Anti-Hallucination: Verify missing Dasha data does not result in fabricated dates
    if (input.timingEvidence.status === 'UNAVAILABLE') {
      const yearMatch = jsonString.match(/\b(20[2-9][0-9])\b/g);
      if (yearMatch && yearMatch.length > 2) {
        errors.push(`Fabricated specific timing dates detected when Dasha status is UNAVAILABLE: ${yearMatch.join(', ')}`);
      }
    }

    // 7. Anti-Hallucination: Verify missing Yoga data does not result in active yoga claims
    if (input.yogaEvidence.status === 'UNAVAILABLE') {
      if (jsonString.includes('active raja yoga') || jsonString.includes('active dhana yoga')) {
        errors.push('Fabricated active Yoga claims detected when Yoga status is UNAVAILABLE');
      }
    }

    // 8. Evidence ID Traceability for recommendedFields
    if (analysis.recommendedFields && Array.isArray(analysis.recommendedFields)) {
      for (const field of analysis.recommendedFields) {
        if (field.evidenceIds && Array.isArray(field.evidenceIds)) {
          for (const evId of field.evidenceIds) {
            if (typeof evId !== 'string' || evId.trim().length === 0) {
              errors.push(`recommendedFields contains non-string, empty, or whitespace-only evidence ID: ${JSON.stringify(evId)}`);
              continue;
            }
            if (!validEvidenceIds.has(evId.trim())) {
              errors.push(`Invalid evidence ID referenced in recommendedFields: "${evId}"`);
            }
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedAnalysis: errors.length === 0 ? (analysis as CareerAnalysis) : undefined,
    };
  }

  private collectValidEvidenceIds(input: CareerAnalysisInput): Set<string> {
    const ids = new Set<string>();

    ids.add('career-axis');
    ids.add('career-axis-10th-house');
    ids.add('career-axis-ascendant');
    ids.add('income-evidence-2nd-house');
    ids.add('income-evidence-11th-house');
    ids.add('work-environment-6th-house');
    ids.add('work-environment-evidence');
    ids.add('leadership-evidence');
    ids.add('analytical-evidence');
    ids.add('communication-evidence');
    ids.add('creativity-evidence');
    ids.add('research-evidence');
    ids.add('entrepreneurship-evidence');
    ids.add('international-evidence');
    ids.add('networking-evidence');

    for (const p of input.planetaryEvidence) {
      ids.add(`planet-${p.planet.toLowerCase()}`);
    }

    for (const h of input.houseEvidence) {
      ids.add(`house-${h.houseNumber}`);
    }

    return ids;
  }
}

export const careerAnalysisValidator = new CareerAnalysisValidator();

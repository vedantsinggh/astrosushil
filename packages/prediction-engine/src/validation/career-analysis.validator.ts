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

    // 2. Anti-Hallucination: Check for forbidden guaranteed predictions or horoscope tropes
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

    // 3. Anti-Hallucination: Verify missing Dasha data does not result in fabricated dates
    if (input.timingEvidence.status === 'UNAVAILABLE') {
      const yearMatch = jsonString.match(/\b(20[2-9][0-9])\b/g);
      if (yearMatch && yearMatch.length > 2) {
        errors.push(`Fabricated specific timing dates detected when Dasha status is UNAVAILABLE: ${yearMatch.join(', ')}`);
      }
    }

    // 4. Anti-Hallucination: Verify missing Yoga data does not result in active yoga claims
    if (input.yogaEvidence.status === 'UNAVAILABLE') {
      if (jsonString.includes('active raja yoga') || jsonString.includes('active dhana yoga')) {
        errors.push('Fabricated active Yoga claims detected when Yoga status is UNAVAILABLE');
      }
    }

    // 5. Evidence ID Traceability Verification
    const validEvidenceIds = this.collectValidEvidenceIds(input);
    if (analysis.recommendedFields && Array.isArray(analysis.recommendedFields)) {
      for (const field of analysis.recommendedFields) {
        if (field.evidenceIds && Array.isArray(field.evidenceIds)) {
          for (const evId of field.evidenceIds) {
            if (!validEvidenceIds.has(evId)) {
              // Warn / record invalid evidence ID
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

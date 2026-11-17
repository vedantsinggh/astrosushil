/**
 * Astro Sushil - Editorial Content Schema & Evidence Packet Types
 * Phase 1F: Final Validation Closure - Strengthened Claim Validator & Structured Types
 *
 * Implements strict claim-level provenance, canonical 7-tier epistemic separation,
 * typed analytical claims for all narrative blocks (lead paragraphs, body paragraphs,
 * takeaways, strategies, cautions, and remedies), conjunction vs wide co-occupancy typing,
 * birth-time sensitivity qualification, and mandatory human review gatekeeper schemas.
 */

export type ChapterId =
  | 'ch01_orientation_blueprint'
  | 'ch02_mysteries_of_lagna'
  | 'ch03_tenth_house_mandate'
  | 'ch04_d10_dashamsha_map'
  | 'ch05_bhrigu_nandi_nadi'
  | 'ch06_career_voyage_seasons'
  | 'ch07_enterprise_government_private'
  | 'ch08_business_compass_wealth'
  | 'ch09_cosmic_clock_timing'
  | 'ch10_roadmap_remedies';

/**
 * Canonical Epistemic Tier taxonomy.
 * Must be used identically across schema, sample sections, evidence registry, and quality rubric.
 * Any tag outside these 7 values must be strictly rejected during validation.
 */
export type EpistemicTier =
  | 'CALCULATED_FACT'                 // Deterministic astronomical position under configured ephemeris
  | 'TRADITIONAL_SHASTRA'             // Classical Jyotish rule with documented textual provenance
  | 'NADI_PROGRESSION'                // Bhrigu Nandi Nadi degree sequence rule
  | 'MODERN_VOCATIONAL_EXTRAPOLATION' // Bridge translating classical archetype to 21st-century workplace
  | 'INTERPRETIVE_SYNTHESIS'          // Reconciled insight combining multiple chart factors
  | 'INTERPRETIVE_CONVENTION'         // Documented system configuration rule (e.g. orb threshold, house system)
  | 'DISPUTED_OR_UNVERIFIED';         // Speculative, contested, or unverified assertion (prohibited in active customer copy)

export const VALID_EPISTEMIC_TIERS: ReadonlySet<EpistemicTier> = new Set([
  'CALCULATED_FACT',
  'TRADITIONAL_SHASTRA',
  'NADI_PROGRESSION',
  'MODERN_VOCATIONAL_EXTRAPOLATION',
  'INTERPRETIVE_SYNTHESIS',
  'INTERPRETIVE_CONVENTION',
  'DISPUTED_OR_UNVERIFIED',
]);

/**
 * Classical Sanskrit textual source reference.
 */
export interface ClassicalSourceReference {
  source: 'BPHS' | 'PHALADEEPIKA' | 'SARAVALI' | 'BHRIGU_NANDI_NADI' | 'JAIMINI_UPADESA_SUTRAS' | 'TAITTIRIYA_BRAHMANA' | 'OTHER_CLASSICAL';
  chapterAndVerse?: string;
  sanskritCitation?: string;
  englishTranslation?: string;
}

/**
 * Atomic typed analytical claim structure.
 * Enforces claim-level provenance, epistemic tagging, and auditable evidence linkage.
 */
export interface AnalyticalClaim {
  claimId: string;
  claimText: string;
  epistemicTier: EpistemicTier;
  evidenceDependencies: string[]; // Must contain >= 1 registered evidence IDs
  classicalSourceReference?: ClassicalSourceReference; // Required if epistemicTier === 'TRADITIONAL_SHASTRA'
  qualificationOrUncertaintyNote?: string; // Optional qualification or birth-time sensitivity notice
}

/**
 * Structured paragraph comprising one or more typed analytical claims and the coherent rendered prose.
 */
export interface StructuredParagraph {
  paragraphId: string;
  paragraphType:
    | 'LEAD_EDITORIAL'
    | 'CORE_ANALYTICAL'
    | 'SYNTHESIS'
    | 'STRATEGY'
    | 'CAUTION'
    | 'BIRTH_TIME_QUALIFICATION'
    | 'REMEDIAL_RECOMMENDATION'
    | 'REMEDIAL_DISCLAIMER';
  claims: AnalyticalClaim[];
  renderedText: string;
}

/**
 * Structured Key Takeaway bullet item.
 */
export interface StructuredKeyTakeaway {
  takeawayId: string;
  iconType: 'STAR' | 'DIAMOND' | 'FLOURISH' | 'ARROW' | 'SQUARE';
  boldTitle: string;
  claim: AnalyticalClaim;
}

/**
 * Typed protocol step within a remedial recommendation.
 * Every step must be claim-linked to ensure traceable provenance.
 */
export interface RemedialProtocolStep {
  stepNumber: number;
  instructionText: string;
  claim: AnalyticalClaim;
}

/**
 * Structured Remedial recommendation item.
 * Substantive recommendations, protocol steps, and disclaimers are all strictly
 * backed by typed AnalyticalClaim objects to eliminate unvalidated free-text.
 */
export interface StructuredRemedialItem {
  remedyId: string;
  category: 'GEMSTONE' | 'RUDRAKSHA' | 'MANTRA' | 'VASTU' | 'LIFESTYLE' | 'SEVA';
  title: string;
  governingPlanetOrHouse: string;
  specificRecommendation: StructuredParagraph;
  practicalProtocol: RemedialProtocolStep[];
  ethicalDisclaimer: StructuredParagraph;
}

/**
 * Editorial translation of a classical epigraph.
 * Explicitly separates authenticated literal translation, editorial metaphrase,
 * and scholarly paraphrase, and links the translation to an AnalyticalClaim.
 */
export interface EditorialTranslation {
  translationText: string;
  translationType: 'AUTHENTICATED_LITERAL_TRANSLATION' | 'EDITORIAL_METAPHRIC_TRANSLATION' | 'SCHOLARLY_PARAPHRASE';
  claim: AnalyticalClaim;
}

/**
 * Classical epigraph preceding a chapter monograph.
 * Strictly separates original Sanskrit text, IAST transliteration, and provenance-linked translation.
 * Requires a named classical source, a specific chapter/verse location, and an auditable claim.
 */
export interface ChapterEpigraph {
  epigraphId: string;
  sanskritOriginal?: string;      // Devanagari script original text
  transliterationIast: string;    // Standard IAST (e.g. śarīraṃ varṇarūpaṃ...)
  classicalSourceReference: {
    source: ClassicalSourceReference['source'];
    chapterAndVerse: string;      // Specific identifiable textual location (e.g. "Ch. 11, Sloka 1")
    textualLocationIdentifier?: string;
  };
  editorialTranslation: EditorialTranslation;
}

/**
 * Planetary conjunction vs wide sign-based co-occupancy classification.
 * Note: These boundaries (<= 5°, 5° - 10°, > 10°) represent Astro Sushil's configured
 * editorial convention, adopted to ensure reproducible classification under Whole Sign reckoning.
 */
export type PlanetaryContactClassification =
  | 'CLOSE_CONJUNCTION'       // Separation <= 5°: intimate planetary ray blend
  | 'MODERATE_CONJUNCTION'    // Separation 5° - 10°: active interactive presence
  | 'WIDE_SIGN_COOCCUPANCY';  // Separation > 10°: same sign/house, distinct operational vectors

/**
 * Audit and provenance metadata for the underlying calculation engine.
 */
export interface CalculationEngineProvenance {
  calculationEngineVersion: string; // e.g. "@astro/astrology-engine v1.0.0"
  ephemerisSource: 'SWISSEPH' | 'ASTRONOMY_ENGINE';
  ayanamsaType: string;             // e.g. "Lahiri Sidereal"
  ayanamsaValueDegrees: number;     // e.g. 23.6284
  houseSystem: string;              // e.g. "Whole Sign (Rashi-Bhava)"
  calculationTimestampUtc: string;
  deterministicChartHash: string;   // SHA-256 of canonical NormalizedChart
}

/**
 * Atomic calculated chart fact derived strictly from NormalizedChart.
 */
export interface CalculatedChartFact {
  factId: string;
  factType: 'ASCENDANT' | 'PLANET' | 'HOUSE' | 'VARGA' | 'DASHA' | 'BALA' | 'ASHTAKAVARGA';
  name: string;
  sign: string;
  signIndex: number;                // 1-12
  house: number;                    // 1-12
  degreeInSign: number;             // Decimal degrees
  formattedDegree: string;          // e.g. "09° 06' 21\""
  nakshatra: string;
  nakshatraIndex: number;           // 1-27
  pada: number;                     // 1-4
  nakshatraLord: string;
  dignity: string;                  // EXALTED, EXALTED_SIGN, MOOLATRIKONA, SWAKSHETRA, FRIEND, NEUTRAL, ENEMY, DEBILITATED
  isExactExaltationDegree: boolean; // True ONLY if within 1° of deep exaltation degree (Paramochcha)
  isRetrograde: boolean;
  isCombust: boolean;
  aspectsReceived: string[];        // Standard Parashari aspects reaching this point
  aspectsCast: number[];            // Houses aspected by this planet
}

/**
 * Explicit interaction fact between two planets sharing a sign or casting aspects.
 */
export interface PlanetaryInteractionFact {
  interactionId: string;
  varga: 'D1' | 'D9' | 'D10';
  house: number;
  sign: string;
  planetA: string;
  planetB: string;
  angularSeparationDegrees: number;
  formattedSeparation: string;      // e.g. "19° 34' 17\""
  classification: PlanetaryContactClassification;
  orbThresholdRule: string;         // Reference to INTERPRETIVE_CONVENTIONS
  shastricImplications: string;
}

/**
 * Classical textual principle with documented provenance.
 */
export interface TraditionalShastricPrinciple {
  principleId: string;
  classicalSource: ClassicalSourceReference['source'];
  chapterAndVerse?: string;
  sanskritAphorism?: string;
  classicalTranslation: string;
  requiredFactIds: string[];        // Evidence dependencies: facts that MUST be present to invoke this rule
}

/**
 * Modern vocational mapping translating classical significations into modern workplaces.
 */
export interface ModernVocationalCorrelation {
  correlationId: string;
  targetIndustrySector: string;
  executiveFunction: string;
  workplaceDynamic: string;
  evidenceDependencies: string[];   // Fact IDs and Principle IDs grounding this extrapolation
}

/**
 * Explicit documentation of opposing chart influences to prevent contradictory hand-waving.
 */
export interface ChartContradictionOrTension {
  tensionId: string;
  opposingFactorA: { description: string; factIds: string[] };
  opposingFactorB: { description: string; factIds: string[] };
  reconciliationFramework: string;
}

/**
 * Birth-time sensitivity disclosure for divisional charts.
 */
export interface BirthTimeSensitivityNotice {
  chartVarga: 'D1' | 'D9' | 'D10' | 'D60';
  recordedTimeIso: string;
  testedAnchors: {
    timestamp: string;
    d1AscendantDegree: string;
    vargaAscendantSign: string;
    vargaAscendantDegree: string;
  }[];
  exactTransitionInterval: string;
  secondsToTransition: number;
  conditionalInterpretationStatement: string;
}

/**
 * Registered evidence entry in the Master Evidence Registry.
 */
export interface EvidenceRegistryRecord {
  id: string;
  description: string;
  canonicalTier: EpistemicTier;
  sourceOrCitation: string;
  engineOrVersion?: string;
  isDisputed?: boolean;
}

/**
 * Evidence packet dispatched to an individual chapter generator.
 */
export interface ChapterEvidencePacket {
  reportId: string;
  chapterId: ChapterId;
  clientMetadata: {
    clientName: string;
    dateOfBirth: string;
    timeOfBirth: string;
    birthPlace: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  provenance: CalculationEngineProvenance;
  calculatedFacts: Record<string, CalculatedChartFact>;
  planetaryInteractions: Record<string, PlanetaryInteractionFact>;
  traditionalPrinciples: TraditionalShastricPrinciple[];
  vocationalCorrelations: ModernVocationalCorrelation[];
  contradictoryInfluences: ChartContradictionOrTension[];
  birthTimeSensitivity?: BirthTimeSensitivityNotice;
  verifiedAspectWhitelist: {
    target: string;
    aspectingPlanet: string;
    fromHouse: number;
    aspectType: string;
    nature: 'BENEFIC' | 'MALEFIC' | 'NEUTRAL';
  }[];
  unavailableOrUntimedData: string[];
}

/**
 * Individual thematic section within a chapter monograph.
 */
export interface ThematicSection {
  sectionId: string;
  heading: string;
  subheading?: string;
  leadEditorialParagraph: StructuredParagraph;
  structuredParagraphs: StructuredParagraph[];
  takeaways?: StructuredKeyTakeaway[];
  practicalStrategy?: StructuredParagraph;
  developmentalCaution?: StructuredParagraph;
  birthTimeQualification?: StructuredParagraph;
  evidenceDependencies: string[];   // All fact/principle IDs referenced
}

/**
 * Record of any disputed, unsupported, or flagged claims.
 */
export interface DisputedClaimRecord {
  claimText: string;
  detectedReason: string;
  severity: 'CRITICAL' | 'WARNING';
  resolvedAction: 'REJECTED' | 'MODIFIED' | 'APPROVED_WITH_NOTE';
}

/**
 * Complete validated JSON output for an individual chapter monograph.
 */
export interface ChapterContentOutput {
  chapterId: ChapterId;
  chapterNumber: number;
  chapterTitle: string;
  chapterSubtitle: string;
  epigraph?: ChapterEpigraph;
  leadEditorialParagraph: StructuredParagraph;
  sections: ThematicSection[];
  remedies?: StructuredRemedialItem[];
  closingTransition: StructuredParagraph;
  allReferencedEvidenceIds: string[];
  disputedClaims: DisputedClaimRecord[];
  metadata: {
    generatedAt: string;
    modelUsed: string;
    promptVersion: string;
    inputEvidenceHash: string;
    outputContentHash: string;
    calculationProvenance: CalculationEngineProvenance;
    humanReviewStatus: 'PENDING_HUMAN_REVIEW' | 'REVIEWED_AND_ACCEPTED' | 'REJECTED';
    reviewedBy?: string;
    reviewedAt?: string;
    reviewerNotes?: string;
  };
}

/**
 * Claim-level validation error details.
 */
export interface ClaimValidationError {
  claimId: string;
  field: string;
  errorCode:
    | 'MISSING_EPISTEMIC_TIER'
    | 'INVALID_EPISTEMIC_TIER'
    | 'EMPTY_EVIDENCE_DEPENDENCIES'
    | 'NONEXISTENT_EVIDENCE_ID'
    | 'TIER_MISMATCH'
    | 'MISSING_TEXTUAL_PROVENANCE'
    | 'DISPUTED_CLAIM_PROHIBITED'
    | 'RENDERED_TEXT_DIVERGENCE'
    | 'UNSUPPORTED_REMEDY_PROSE'
    | 'UNVERIFIED_EPIGRAPH_TRANSLATION'
    | 'UNSUPPORTED_ASSERTION_IN_TITLE';
  message: string;
}

/**
 * Comprehensive Validation Report for a Chapter or Batch of Sections.
 */
export interface ChapterValidationReport {
  chapterId: string;
  totalClaimsProcessed: number;
  totalEvidenceDependenciesChecked: number;
  tierMismatchesCount: number;
  missingSourceReferencesCount: number;
  rejectedDisputedClaimsCount: number;
  renderedTextConsistencyFailuresCount: number;
  unregisteredEvidenceIdsCount: number;
  validationErrors: ClaimValidationError[];
  isValid: boolean;
}

/**
 * Validates an analytical claim against registered evidence IDs, canonical tiers, and shastric rules.
 */
export function validateAnalyticalClaim(
  claim: AnalyticalClaim,
  registry: Map<string, EvidenceRegistryRecord>,
  isCustomerFacing: boolean = true
): ClaimValidationError[] {
  const errors: ClaimValidationError[] = [];

  // Check 1: Epistemic Tier defined
  if (!claim.epistemicTier) {
    errors.push({
      claimId: claim.claimId,
      field: 'epistemicTier',
      errorCode: 'MISSING_EPISTEMIC_TIER',
      message: `Claim "${claim.claimId}" lacks an epistemicTier.`,
    });
    return errors;
  }

  // Check 2: Canonical Epistemic Tier membership
  if (!VALID_EPISTEMIC_TIERS.has(claim.epistemicTier)) {
    errors.push({
      claimId: claim.claimId,
      field: 'epistemicTier',
      errorCode: 'INVALID_EPISTEMIC_TIER',
      message: `Claim "${claim.claimId}" has invalid tier "${claim.epistemicTier}". Must be one of ${Array.from(VALID_EPISTEMIC_TIERS).join(', ')}.`,
    });
  }

  // Check 3: Non-empty evidence dependencies
  if (!claim.evidenceDependencies || claim.evidenceDependencies.length === 0) {
    errors.push({
      claimId: claim.claimId,
      field: 'evidenceDependencies',
      errorCode: 'EMPTY_EVIDENCE_DEPENDENCIES',
      message: `Claim "${claim.claimId}" must declare at least one evidence dependency.`,
    });
  } else {
    for (const depId of claim.evidenceDependencies) {
      const regRecord = registry.get(depId);
      // Check 4: Evidence ID exists in registry
      if (!regRecord) {
        errors.push({
          claimId: claim.claimId,
          field: 'evidenceDependencies',
          errorCode: 'NONEXISTENT_EVIDENCE_ID',
          message: `Claim "${claim.claimId}" references non-existent evidence ID "${depId}".`,
        });
      } else {
        // Check 5: Epistemic Tier matches registered canonical tier
        if (claim.epistemicTier !== regRecord.canonicalTier) {
          errors.push({
            claimId: claim.claimId,
            field: 'epistemicTier',
            errorCode: 'TIER_MISMATCH',
            message: `Claim "${claim.claimId}" tier (${claim.epistemicTier}) does not match registered canonical tier (${regRecord.canonicalTier}) for evidence ID "${depId}".`,
          });
        }
      }
    }
  }

  // Check 6: TRADITIONAL_SHASTRA textual provenance
  if (claim.epistemicTier === 'TRADITIONAL_SHASTRA') {
    if (!claim.classicalSourceReference || !claim.classicalSourceReference.source) {
      errors.push({
        claimId: claim.claimId,
        field: 'classicalSourceReference',
        errorCode: 'MISSING_TEXTUAL_PROVENANCE',
        message: `Claim "${claim.claimId}" is classified as TRADITIONAL_SHASTRA but lacks classicalSourceReference.source.`,
      });
    } else if (!claim.classicalSourceReference.chapterAndVerse || claim.classicalSourceReference.chapterAndVerse.trim() === '') {
      errors.push({
        claimId: claim.claimId,
        field: 'classicalSourceReference.chapterAndVerse',
        errorCode: 'MISSING_TEXTUAL_PROVENANCE',
        message: `Claim "${claim.claimId}" is classified as TRADITIONAL_SHASTRA but lacks specific chapterAndVerse citation.`,
      });
    }
  }

  // Check 7: Disputed claims prohibited in customer-facing content
  if (isCustomerFacing && claim.epistemicTier === 'DISPUTED_OR_UNVERIFIED') {
    errors.push({
      claimId: claim.claimId,
      field: 'epistemicTier',
      errorCode: 'DISPUTED_CLAIM_PROHIBITED',
      message: `Claim "${claim.claimId}" is classified as DISPUTED_OR_UNVERIFIED and cannot be presented as accepted customer-facing content.`,
    });
  }

  return errors;
}

/**
 * Validates a structured paragraph and ensures rendered text consistency with constituent claims.
 */
export function validateStructuredParagraph(
  paragraph: StructuredParagraph,
  registry: Map<string, EvidenceRegistryRecord>,
  isCustomerFacing: boolean = true
): ClaimValidationError[] {
  const errors: ClaimValidationError[] = [];

  if (!paragraph.claims || paragraph.claims.length === 0) {
    errors.push({
      claimId: paragraph.paragraphId,
      field: 'claims',
      errorCode: 'EMPTY_EVIDENCE_DEPENDENCIES',
      message: `Paragraph "${paragraph.paragraphId}" contains zero analytical claims.`,
    });
    return errors;
  }

  const renderedLower = (paragraph.renderedText || '').toLowerCase();

  for (const claim of paragraph.claims) {
    // Validate individual claim
    errors.push(...validateAnalyticalClaim(claim, registry, isCustomerFacing));

    // Check 8: Heuristic lexical-overlap divergence check.
    // IMPORTANT METHODOLOGICAL LIMITATION & SCOPE:
    // This lexical-overlap check is a shallow heuristic filter designed solely to flag gross
    // topic divergence (e.g., completely unrelated placeholder text or hallucinated topics).
    // It DOES NOT establish semantic equivalence.
    // It DOES NOT prove that every rendered sentence is supported.
    // It CANNOT replace human editorial review.
    // A passing overlap score (>= 0.25) must NEVER be described as "semantic validation".
    if (!renderedLower) {
      errors.push({
        claimId: claim.claimId,
        field: 'renderedText',
        errorCode: 'RENDERED_TEXT_DIVERGENCE',
        message: `Paragraph "${paragraph.paragraphId}" has empty renderedText.`,
      });
    } else {
      // Extract substantive words (> 4 chars, excluding stopwords) from claim text
      const stopwords = new Set(['about', 'their', 'there', 'which', 'would', 'could', 'should', 'under', 'these', 'those', 'where', 'while']);
      const claimWords = (claim.claimText.toLowerCase().match(/\b[a-z]{5,}\b/g) || [])
        .filter((w) => !stopwords.has(w));
      
      if (claimWords.length > 0) {
        const matchedWords = claimWords.filter((w) => renderedLower.includes(w));
        const overlapRatio = matchedWords.length / claimWords.length;
        if (overlapRatio < 0.25) {
          errors.push({
            claimId: claim.claimId,
            field: 'renderedText',
            errorCode: 'RENDERED_TEXT_DIVERGENCE',
            message: `Claim "${claim.claimId}" concepts diverge from paragraph "${paragraph.paragraphId}" renderedText (overlap ratio ${overlapRatio.toFixed(2)} < 0.25).`,
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Validates a structured remedial recommendation item.
 * Ensures that substantive recommendations, protocols, and disclaimers are claim-linked,
 * and that titles do not contain unsupported or fatalistic assertions.
 */
export function validateStructuredRemedialItem(
  remedy: StructuredRemedialItem,
  registry: Map<string, EvidenceRegistryRecord>,
  isCustomerFacing: boolean = true
): ClaimValidationError[] {
  const errors: ClaimValidationError[] = [];

  // 1. Title assertion check (no fatalistic or unsupported claims in title)
  const fatalisticTokens = ['guaranteed', 'curative', 'miracle', 'permanent protection', 'ensures', 'will cure', '100%'];
  const titleLower = remedy.title.toLowerCase();
  for (const token of fatalisticTokens) {
    if (titleLower.includes(token)) {
      errors.push({
        claimId: remedy.remedyId,
        field: 'title',
        errorCode: 'UNSUPPORTED_ASSERTION_IN_TITLE',
        message: `Remedy title "${remedy.title}" contains prohibited/unsupported fatalistic token "${token}".`,
      });
    }
  }

  // 2. Specific Recommendation must be a valid StructuredParagraph
  if (!remedy.specificRecommendation || !remedy.specificRecommendation.claims || remedy.specificRecommendation.claims.length === 0) {
    errors.push({
      claimId: remedy.remedyId,
      field: 'specificRecommendation',
      errorCode: 'UNSUPPORTED_REMEDY_PROSE',
      message: `Remedy "${remedy.remedyId}" specificRecommendation lacks valid analytical claims.`,
    });
  } else {
    errors.push(...validateStructuredParagraph(remedy.specificRecommendation, registry, isCustomerFacing));
  }

  // 3. Practical Protocol steps
  if (!remedy.practicalProtocol || remedy.practicalProtocol.length === 0) {
    errors.push({
      claimId: remedy.remedyId,
      field: 'practicalProtocol',
      errorCode: 'UNSUPPORTED_REMEDY_PROSE',
      message: `Remedy "${remedy.remedyId}" practicalProtocol must define at least one structured step.`,
    });
  } else {
    for (const step of remedy.practicalProtocol) {
      if (!step.instructionText || step.instructionText.trim() === '') {
        errors.push({
          claimId: `${remedy.remedyId}-step-${step.stepNumber}`,
          field: 'practicalProtocol.instructionText',
          errorCode: 'UNSUPPORTED_REMEDY_PROSE',
          message: `Remedy step ${step.stepNumber} in "${remedy.remedyId}" lacks instruction text.`,
        });
      }
      if (!step.claim) {
        errors.push({
          claimId: `${remedy.remedyId}-step-${step.stepNumber}`,
          field: 'practicalProtocol.claim',
          errorCode: 'UNSUPPORTED_REMEDY_PROSE',
          message: `Remedy step ${step.stepNumber} in "${remedy.remedyId}" lacks an analytical claim.`,
        });
      } else {
        errors.push(...validateAnalyticalClaim(step.claim, registry, isCustomerFacing));
      }
    }
  }

  // 4. Ethical Disclaimer
  if (!remedy.ethicalDisclaimer || !remedy.ethicalDisclaimer.claims || remedy.ethicalDisclaimer.claims.length === 0) {
    errors.push({
      claimId: remedy.remedyId,
      field: 'ethicalDisclaimer',
      errorCode: 'UNSUPPORTED_REMEDY_PROSE',
      message: `Remedy "${remedy.remedyId}" ethicalDisclaimer lacks structured analytical claims.`,
    });
  } else {
    errors.push(...validateStructuredParagraph(remedy.ethicalDisclaimer, registry, isCustomerFacing));
  }

  return errors;
}

/**
 * Validates a classical epigraph.
 * Requires a named classical source, identifiable chapter/verse location,
 * IAST transliteration, and a provenance-linked editorial translation claim.
 */
export function validateChapterEpigraph(
  epigraph: ChapterEpigraph,
  registry: Map<string, EvidenceRegistryRecord>,
  isCustomerFacing: boolean = true
): ClaimValidationError[] {
  const errors: ClaimValidationError[] = [];

  // 1. Classical source and verse required
  if (!epigraph.classicalSourceReference || !epigraph.classicalSourceReference.source) {
    errors.push({
      claimId: epigraph.epigraphId,
      field: 'classicalSourceReference.source',
      errorCode: 'MISSING_TEXTUAL_PROVENANCE',
      message: `Epigraph "${epigraph.epigraphId}" lacks a named classicalSourceReference.source.`,
    });
  }
  if (!epigraph.classicalSourceReference || !epigraph.classicalSourceReference.chapterAndVerse || epigraph.classicalSourceReference.chapterAndVerse.trim() === '') {
    errors.push({
      claimId: epigraph.epigraphId,
      field: 'classicalSourceReference.chapterAndVerse',
      errorCode: 'MISSING_TEXTUAL_PROVENANCE',
      message: `Epigraph "${epigraph.epigraphId}" lacks a specific chapterAndVerse location.`,
    });
  }

  // 2. Transliteration required
  if (!epigraph.transliterationIast || epigraph.transliterationIast.trim() === '') {
    errors.push({
      claimId: epigraph.epigraphId,
      field: 'transliterationIast',
      errorCode: 'MISSING_TEXTUAL_PROVENANCE',
      message: `Epigraph "${epigraph.epigraphId}" lacks IAST transliteration text.`,
    });
  }

  // 3. Editorial Translation must be provenance-linked
  if (!epigraph.editorialTranslation || !epigraph.editorialTranslation.translationText) {
    errors.push({
      claimId: epigraph.epigraphId,
      field: 'editorialTranslation.translationText',
      errorCode: 'UNVERIFIED_EPIGRAPH_TRANSLATION',
      message: `Epigraph "${epigraph.epigraphId}" lacks editorial translation text.`,
    });
  } else if (!epigraph.editorialTranslation.claim) {
    errors.push({
      claimId: epigraph.epigraphId,
      field: 'editorialTranslation.claim',
      errorCode: 'UNVERIFIED_EPIGRAPH_TRANSLATION',
      message: `Epigraph "${epigraph.epigraphId}" translation is not linked to an AnalyticalClaim.`,
    });
  } else {
    // Validate the underlying claim
    const claimErrors = validateAnalyticalClaim(epigraph.editorialTranslation.claim, registry, isCustomerFacing);
    errors.push(...claimErrors);

    // If marked as AUTHENTICATED_LITERAL_TRANSLATION, tier must be TRADITIONAL_SHASTRA
    if (
      epigraph.editorialTranslation.translationType === 'AUTHENTICATED_LITERAL_TRANSLATION' &&
      epigraph.editorialTranslation.claim.epistemicTier !== 'TRADITIONAL_SHASTRA'
    ) {
      errors.push({
        claimId: epigraph.editorialTranslation.claim.claimId,
        field: 'translationType',
        errorCode: 'UNVERIFIED_EPIGRAPH_TRANSLATION',
        message: `Epigraph "${epigraph.epigraphId}" claims AUTHENTICATED_LITERAL_TRANSLATION but claim is not TRADITIONAL_SHASTRA.`,
      });
    }
  }

  return errors;
}

/**
 * Validates a complete thematic section.
 */
export function validateThematicSection(
  section: ThematicSection,
  registry: Map<string, EvidenceRegistryRecord>,
  isCustomerFacing: boolean = true
): ClaimValidationError[] {
  const errors: ClaimValidationError[] = [];

  // 1. Lead Editorial Paragraph
  if (section.leadEditorialParagraph) {
    errors.push(...validateStructuredParagraph(section.leadEditorialParagraph, registry, isCustomerFacing));
  }

  // 2. Structured Body Paragraphs
  for (const para of section.structuredParagraphs) {
    errors.push(...validateStructuredParagraph(para, registry, isCustomerFacing));
  }

  // 3. Structured Key Takeaways
  if (section.takeaways) {
    for (const tk of section.takeaways) {
      errors.push(...validateAnalyticalClaim(tk.claim, registry, isCustomerFacing));
    }
  }

  // 4. Practical Strategy
  if (section.practicalStrategy) {
    errors.push(...validateStructuredParagraph(section.practicalStrategy, registry, isCustomerFacing));
  }

  // 5. Developmental Caution
  if (section.developmentalCaution) {
    errors.push(...validateStructuredParagraph(section.developmentalCaution, registry, isCustomerFacing));
  }

  // 6. Birth Time Qualification
  if (section.birthTimeQualification) {
    errors.push(...validateStructuredParagraph(section.birthTimeQualification, registry, isCustomerFacing));
  }

  return errors;
}

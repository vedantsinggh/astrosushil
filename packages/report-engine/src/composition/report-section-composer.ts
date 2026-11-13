import {
  VerifiedAstrologyEvidence,
  ReportSection,
  SharedReportDocument,
  SharedReportMetadata,
  STANDARD_AUTHOR_MESSAGE,
  STANDARD_METHODOLOGY_NOTE,
  STANDARD_LEGAL_DISCLAIMER,
} from '../types/shared-report-foundation.types';
import { validateVerifiedAstrologyEvidence } from '../validation/report-evidence.validator';

export class ReportCompositionError extends Error {
  public readonly code = 'REPORT_COMPOSITION_ERROR';
  public readonly sectionId?: string;

  constructor(message: string, sectionId?: string) {
    super(`Report Composition Error: ${message}${sectionId ? ` (Section: ${sectionId})` : ''}`);
    this.name = 'ReportCompositionError';
    this.sectionId = sectionId;
  }
}

export interface SectionEvaluatorContext {
  evidence: VerifiedAstrologyEvidence;
  metadata: SharedReportMetadata;
  customData?: Record<string, any>;
}

export interface ReportSectionDefinition {
  id: string;
  title: string;
  category: string;
  order: number;
  isRequired: boolean;
  evaluate: (ctx: SectionEvaluatorContext) => Promise<ReportSection> | ReportSection;
  validate?: (section: ReportSection, evidence: VerifiedAstrologyEvidence) => void;
}

export class ReportSectionComposer {
  private readonly sectionDefinitions: Map<string, ReportSectionDefinition> = new Map();

  /**
   * Registers a section definition in the composer pipeline.
   */
  public registerSection(definition: ReportSectionDefinition): this {
    if (this.sectionDefinitions.has(definition.id)) {
      throw new ReportCompositionError(`Duplicate section registration with id: ${definition.id}`, definition.id);
    }
    this.sectionDefinitions.set(definition.id, definition);
    return this;
  }

  /**
   * Clears registered sections (useful for isolated unit tests or dynamic builders).
   */
  public clearSections(): void {
    this.sectionDefinitions.clear();
  }

  /**
   * Composes a complete SharedReportDocument from authoritative evidence and registered sections.
   */
  public async compose(
    metadata: SharedReportMetadata,
    evidence: VerifiedAstrologyEvidence,
    customData?: Record<string, any>
  ): Promise<SharedReportDocument> {
    // 1. Authoritative verification of calculation evidence
    validateVerifiedAstrologyEvidence(evidence);

    // 2. Sort registered sections strictly by declared order
    const sortedDefs = Array.from(this.sectionDefinitions.values()).sort((a, b) => a.order - b.order);

    const composedSections: ReportSection[] = [];
    const context: SectionEvaluatorContext = {
      evidence,
      metadata,
      customData,
    };

    for (const def of sortedDefs) {
      try {
        const section = await def.evaluate(context);

        if (!section) {
          throw new Error('Section evaluator returned null or undefined');
        }

        // Section status verification
        if (def.isRequired && section.status === 'UNAVAILABLE') {
          throw new ReportCompositionError(
            `Required section "${def.title}" was marked UNAVAILABLE. Required sections must be verified.`,
            def.id
          );
        }

        // Run section-level custom validator if attached
        if (def.validate) {
          def.validate(section, evidence);
        }

        // Traceability verification: VERIFIED sections must cite evidence references
        if (section.status === 'VERIFIED' && (!section.evidenceRefs || section.evidenceRefs.length === 0)) {
          throw new ReportCompositionError(
            `Section "${def.title}" is marked VERIFIED but provides zero evidence references.`,
            def.id
          );
        }

        composedSections.push({
          ...section,
          id: def.id,
          order: def.order,
          isRequired: def.isRequired,
        });
      } catch (err: any) {
        if (def.isRequired) {
          // Required section failures halt generation - strictly no hallucination or empty fallback
          if (err instanceof ReportCompositionError) {
            throw err;
          }
          throw new ReportCompositionError(
            `Failed to evaluate required section "${def.title}": ${err?.message || 'unknown error'}`,
            def.id
          );
        }

        // Optional section failure: gracefully record as UNAVAILABLE without fabricating fake astrology
        composedSections.push({
          id: def.id,
          title: def.title,
          category: def.category,
          order: def.order,
          isRequired: false,
          status: 'UNAVAILABLE',
          summary: 'Section unavailable due to insufficient astronomical or chart calculation data.',
          content: 'This optional section could not be evaluated for this profile because the necessary astrological prerequisites are not present.',
          evidenceRefs: [],
          unavailableReason: err?.message || 'Prerequisite astrological evidence missing',
        });
      }
    }

    return {
      metadata,
      evidence,
      sections: composedSections,
      authorMessage: STANDARD_AUTHOR_MESSAGE,
      methodologyNote: STANDARD_METHODOLOGY_NOTE,
      legalDisclaimer: STANDARD_LEGAL_DISCLAIMER,
    };
  }
}

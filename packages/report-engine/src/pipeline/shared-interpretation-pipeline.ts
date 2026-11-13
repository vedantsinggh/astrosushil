import {
  VerifiedAstrologyEvidence,
  ReportSection,
  ReportSectionStatus,
} from '../types/shared-report-foundation.types';
import { validateVerifiedAstrologyEvidence } from '../validation/report-evidence.validator';

export class InterpretationPipelineError extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, code: string = 'INTERPRETATION_PIPELINE_ERROR', details?: any) {
    super(`Interpretation Pipeline Error: ${message}`);
    this.name = 'InterpretationPipelineError';
    this.code = code;
    this.details = details;
  }
}

export interface StructuredAiPromptContext {
  systemPrompt: string;
  userPrompt: string;
  evidenceFacts: string[];
}

export interface InterpretationGenerationOptions<TOutput = any> {
  sectionId: string;
  category: string;
  title: string;
  order: number;
  isRequired: boolean;
  contextBuilder: (evidence: VerifiedAstrologyEvidence) => StructuredAiPromptContext;
  aiCaller: (promptContext: StructuredAiPromptContext) => Promise<string | object>;
  outputParser: (rawOutput: string | object) => TOutput;
  outputValidator: (parsed: TOutput, evidence: VerifiedAstrologyEvidence) => void;
  sectionMapper: (parsed: TOutput, evidence: VerifiedAstrologyEvidence, promptContext: StructuredAiPromptContext) => ReportSection;
  maxRetries?: number;
  retryDelayMs?: number;
}

export class SharedInterpretationPipeline {
  /**
   * Executes deterministic evidence context extraction -> AI generation with retries ->
   * response validation & traceability -> structured ReportSection assembly.
   */
  public async executeSectionInterpretation<TOutput = any>(
    evidence: VerifiedAstrologyEvidence,
    options: InterpretationGenerationOptions<TOutput>
  ): Promise<ReportSection> {
    // 1. Evidence Verification
    validateVerifiedAstrologyEvidence(evidence);

    // 2. Build unambiguous prompt context from verified facts
    const promptContext = options.contextBuilder(evidence);
    if (!promptContext.evidenceFacts || promptContext.evidenceFacts.length === 0) {
      if (options.isRequired) {
        throw new InterpretationPipelineError(
          `Context construction failed: no verified evidence facts provided for required section "${options.title}"`,
          'MISSING_REQUIRED_EVIDENCE_FACTS',
          { sectionId: options.sectionId }
        );
      }
      return {
        id: options.sectionId,
        title: options.title,
        category: options.category,
        order: options.order,
        isRequired: false,
        status: 'UNAVAILABLE',
        summary: 'Section unavailable due to lack of domain-specific astrological evidence.',
        content: 'No verified domain astrological facts were available to formulate this optional analysis.',
        evidenceRefs: [],
        unavailableReason: 'Insufficient astrological evidence facts',
      };
    }

    // 3. AI Execution with exponential retry
    const maxRetries = options.maxRetries ?? 2;
    const baseDelay = options.retryDelayMs ?? 100;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const rawResponse = await options.aiCaller(promptContext);
        if (!rawResponse) {
          throw new InterpretationPipelineError('AI provider returned empty response', 'EMPTY_AI_RESPONSE');
        }

        // 4. Structured Output Parsing
        const parsed = options.outputParser(rawResponse);
        if (!parsed || typeof parsed !== 'object') {
          throw new InterpretationPipelineError('Failed to parse structured output from AI provider', 'INVALID_AI_STRUCTURE');
        }

        // 5. Response Validation & Claim Traceability
        options.outputValidator(parsed, evidence);

        // 6. Map to ReportSection
        const section = options.sectionMapper(parsed, evidence, promptContext);

        // Ensure status and evidenceRefs are properly set
        return {
          ...section,
          id: options.sectionId,
          title: options.title,
          category: options.category,
          order: options.order,
          isRequired: options.isRequired,
          status: section.status || 'VERIFIED',
          evidenceRefs: section.evidenceRefs && section.evidenceRefs.length > 0
            ? section.evidenceRefs
            : promptContext.evidenceFacts,
        };
      } catch (err: any) {
        lastError = err;
        if (attempt <= maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          await new Promise((res) => setTimeout(res, delay));
        }
      }
    }

    // Retries exhausted
    if (options.isRequired) {
      throw new InterpretationPipelineError(
        `Failed to generate verified interpretation for required section "${options.title}" after ${maxRetries + 1} attempts: ${lastError?.message}`,
        'INTERPRETATION_GENERATION_FAILED',
        { sectionId: options.sectionId, cause: lastError?.message }
      );
    }

    // For optional section: mark UNAVAILABLE
    return {
      id: options.sectionId,
      title: options.title,
      category: options.category,
      order: options.order,
      isRequired: false,
      status: 'UNAVAILABLE',
      summary: 'Section unavailable due to interpretation generation timeout or validation failure.',
      content: 'This optional section could not be finalized. No speculative content was substituted.',
      evidenceRefs: [],
      unavailableReason: lastError?.message || 'AI interpretation provider failure',
    };
  }
}

export const sharedInterpretationPipeline = new SharedInterpretationPipeline();

import { getGeminiCareerConfig, GeminiCareerConfig } from '../config/gemini-career.config';
import { CAREER_ANALYST_SYSTEM_PROMPT } from '../prompts/career-analyst.prompt';
import { CareerAnalysis, CareerAnalysisInput, CareerAnalysisProvider } from '../types/evidence.types';
import { careerAnalysisValidator } from '../validation/career-analysis.validator';
import { MockCareerAnalysisProvider } from './mock-career-analysis.provider';

export class GeminiCareerAnalysisProvider implements CareerAnalysisProvider {
  private readonly config: GeminiCareerConfig;

  constructor(customConfig?: Partial<GeminiCareerConfig>) {
    this.config = {
      ...getGeminiCareerConfig(),
      ...customConfig,
    };
  }

  public async analyze(input: CareerAnalysisInput): Promise<CareerAnalysis> {
    const isApiKeyValid = Boolean(
      this.config.apiKey &&
        this.config.apiKey.trim().length > 0 &&
        this.config.apiKey !== 'mock-key-dev'
    );

    if (!isApiKeyValid) {
      console.warn('[GeminiCareerAnalysisProvider] GEMINI_API_KEY not set. Using MockCareerAnalysisProvider.');
      return new MockCareerAnalysisProvider().analyze(input);
    }

    console.log('[CAREER_ANALYSIS_INPUT_CREATED]', {
      careerAxis: `${input.careerAxis.ascendantSign} Lagna, 10th House ${input.careerAxis.houseTenSign}`,
      timingStatus: input.timingEvidence.status,
      planetaryEvidenceCount: input.planetaryEvidence.length,
      houseEvidenceCount: input.houseEvidence.length,
    });

    let attempt = 0;
    let lastError: Error | null = null;
    let correctionPrompt: string | null = null;

    while (attempt <= this.config.maxRetries) {
      attempt++;
      try {
        const rawJsonText = await this.callGeminiApi(input, correctionPrompt);
        const parsed = this.parseJsonContent(rawJsonText);

        const validation = careerAnalysisValidator.validate(parsed, input);
        if (validation.isValid && validation.sanitizedAnalysis) {
          const a = validation.sanitizedAnalysis;
          console.log('[CAREER_ANALYSIS_RESPONSE_RECEIVED] Status: SUCCESS. Validation: VALID.');
          console.log('CareerAnalysis Section Lengths:', {
            executiveCareerSummary: a.executiveCareerSummary?.length || 0,
            executiveDecisionThemes: a.executiveDecisionThemes?.length || 0,
            careerIdentity: a.careerIdentity?.length || 0,
            professionalPersonality: a.professionalPersonality?.length || 0,
            planetarySynthesis: a.planetarySynthesis?.length || 0,
            sectorFit: a.sectorFit?.length || 0,
            actionPlanSummary: a.actionPlanSummary?.length || 0,
            finalSynthesis: a.finalSynthesis?.length || 0,
            houseInterpretationsCount: a.houseInterpretations?.length || 0,
            planetInterpretationsCount: a.planetInterpretations?.length || 0,
          });
          return a;
        }

        const validationErr = `Validation failed: ${validation.errors.join('; ')}`;
        console.warn(`[GeminiCareerAnalysisProvider] Attempt ${attempt} validation error: ${validationErr}`);

        if (attempt <= this.config.maxRetries) {
          correctionPrompt = `Your previous JSON response had validation errors: ${validationErr}. Please fix these errors and return valid JSON adhering strictly to the schema and anti-hallucination rules.`;
        }
      } catch (err: any) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(`[GeminiCareerAnalysisProvider] Attempt ${attempt} error:`, lastError.message);
      }
    }

    console.warn(`[GeminiCareerAnalysisProvider] Retries exhausted (${lastError?.message || 'validation failed'}). Falling back to deterministic MockCareerAnalysisProvider.`);
    return new MockCareerAnalysisProvider().analyze(input);
  }

  private async callGeminiApi(input: CareerAnalysisInput, correctionMessage?: string | null): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    const userPrompt = `
Synthesize the following deterministic CareerAnalysisInput object into a structured CareerAnalysis JSON response.

CAREER ANALYSIS INPUT:
${JSON.stringify(input, null, 2)}

${correctionMessage ? `CORRECTION INSTRUCTIONS:\n${correctionMessage}` : ''}
`.trim();

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      systemInstruction: {
        parts: [{ text: CAREER_ANALYST_SYSTEM_PROMPT }],
      },
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens,
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API HTTP Error ${response.status}: ${errText}`);
      }

      const json: any = await response.json();
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText || !rawText.trim()) {
        throw new Error('Gemini API returned empty candidate response.');
      }

      return rawText;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Gemini API request timed out after ${this.config.timeoutMs}ms.`);
      }
      throw err;
    }
  }

  private parseJsonContent(rawText: string): any {
    let cleaned = rawText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    cleaned = cleaned.trim();

    try {
      return JSON.parse(cleaned);
    } catch (_) {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new Error('Failed to parse response as JSON');
    }
  }
}

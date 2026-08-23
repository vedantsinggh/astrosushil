export interface JyotiActionPayload {
  type: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  parameters?: Record<string, any>;
}

export interface JyotiExplanationPayload {
  title: string;
  category: string;
  summary: string;
  detailedText: string;
  actionButtonText?: string;
  actionType?: string;
}

export interface LLMResponse {
  message: string;
  actions?: JyotiActionPayload[];
  explanation?: JyotiExplanationPayload;
}

export interface LLMProviderOptions {
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface LLMProvider {
  generateResponse(prompt: string, options?: LLMProviderOptions): Promise<LLMResponse>;
}

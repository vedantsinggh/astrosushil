export interface OpenRouterCareerConfig {
  apiKey: string;
  model: string;
  fallbackModels: string[];
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
  maxRetries: number;
  allowMockFallback?: boolean;
}

export function getOpenRouterCareerConfig(): OpenRouterCareerConfig {
  const apiKey =
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENROUTER_CAREER_API_KEY ||
    '';

  const model =
    process.env.OPENROUTER_MODEL ||
    process.env.OPENROUTER_CAREER_MODEL ||
    'poolside/laguna-s-2.1:free';

  const fallbackModels = (process.env.OPENROUTER_FALLBACK_MODELS || '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

  const defaultModels = fallbackModels.length > 0
    ? Array.from(new Set([model, ...fallbackModels])).slice(0, 3)
    : [model];

  const temperature = parseFloat(process.env.OPENROUTER_CAREER_TEMPERATURE || '0.2');
  const maxOutputTokens = parseInt(process.env.OPENROUTER_CAREER_MAX_TOKENS || '12000', 10);
  const timeoutMs = parseInt(process.env.OPENROUTER_CAREER_TIMEOUT_MS || '30000', 10);
  const maxRetries = parseInt(process.env.OPENROUTER_CAREER_MAX_RETRIES || '2', 10);
  const allowMockFallback =
    process.env.ALLOW_MOCK_FALLBACK === 'true' ||
    process.env.LLM_PROVIDER === 'mock';

  return {
    apiKey,
    model,
    fallbackModels: defaultModels,
    temperature: isNaN(temperature) ? 0.2 : temperature,
    maxOutputTokens: isNaN(maxOutputTokens) ? 4096 : maxOutputTokens,
    timeoutMs: isNaN(timeoutMs) ? 30000 : timeoutMs,
    maxRetries: isNaN(maxRetries) ? 2 : maxRetries,
    allowMockFallback,
  };
}

// Backward compatibility aliases
export type GeminiCareerConfig = OpenRouterCareerConfig;
export const getGeminiCareerConfig = getOpenRouterCareerConfig;

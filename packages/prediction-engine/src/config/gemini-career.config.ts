export interface GeminiCareerConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
  maxRetries: number;
}

export function getGeminiCareerConfig(): GeminiCareerConfig {
  const apiKey =
    process.env.GEMINI_CAREER_API_KEY ||
    process.env.GEMINI_API_KEY ||
    '';

  const model =
    process.env.GEMINI_CAREER_MODEL ||
    process.env.GEMINI_MODEL ||
    'gemini-1.5-pro';

  const temperature = parseFloat(process.env.GEMINI_CAREER_TEMPERATURE || '0.2');
  const maxOutputTokens = parseInt(process.env.GEMINI_CAREER_MAX_TOKENS || '8192', 10);
  const timeoutMs = parseInt(process.env.GEMINI_CAREER_TIMEOUT_MS || '60000', 10);
  const maxRetries = parseInt(process.env.GEMINI_CAREER_MAX_RETRIES || '2', 10);

  return {
    apiKey,
    model,
    temperature: isNaN(temperature) ? 0.2 : temperature,
    maxOutputTokens: isNaN(maxOutputTokens) ? 8192 : maxOutputTokens,
    timeoutMs: isNaN(timeoutMs) ? 60000 : timeoutMs,
    maxRetries: isNaN(maxRetries) ? 2 : maxRetries,
  };
}

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export async function checkOpenRouterConnectivity(): Promise<{
  provider: string;
  model: string;
  ok: boolean;
  statusText: string;
  latencyMs?: number;
}> {
  const provider = process.env.LLM_PROVIDER || 'openrouter';
  const model = process.env.OPENROUTER_MODEL || 'minimax/minimax-m3:free';
  const apiKey = process.env.OPENROUTER_API_KEY || '';

  if (!apiKey || apiKey.trim().length === 0 || apiKey === 'mock-key-dev') {
    return {
      provider,
      model,
      ok: false,
      statusText: 'FAIL (OPENROUTER_API_KEY is missing or unconfigured)',
    };
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const fallbackList = (process.env.OPENROUTER_FALLBACK_MODELS || '')
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    const candidateModels = Array.from(
      new Set([model, ...fallbackList, 'nvidia/nemotron-3.5-lightning:free', 'qwen/qwen3.8-27b:free'])
    ).slice(0, 3);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://astrosushil.com',
        'X-OpenRouter-Title': process.env.OPENROUTER_SITE_NAME || 'Astro Sushil',
      },
      body: JSON.stringify({
        model,
        models: candidateModels,
        messages: [{ role: 'user', content: 'Ping' }],
        max_tokens: 10,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      const redactedErr = errText.replaceAll(apiKey, '[REDACTED]');
      return {
        provider,
        model,
        ok: false,
        statusText: `FAIL (HTTP ${response.status}: ${redactedErr})`,
        latencyMs,
      };
    }

    const json: any = await response.json();
    const content = json?.choices?.[0]?.message?.content;

    if (content !== undefined) {
      return {
        provider,
        model,
        ok: true,
        statusText: 'OK',
        latencyMs,
      };
    }

    return {
      provider,
      model,
      ok: false,
      statusText: 'FAIL (Malformed response payload from OpenRouter)',
      latencyMs,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const errMsg = (err?.message || String(err)).replaceAll(apiKey, '[REDACTED]');
    return {
      provider,
      model,
      ok: false,
      statusText: `FAIL (${errMsg})`,
    };
  }
}

async function main() {
  console.log('Testing OpenRouter Connectivity...');
  const res = await checkOpenRouterConnectivity();
  console.log(`LLM provider: ${res.provider}`);
  console.log(`LLM model: ${res.model}`);
  console.log(`Connectivity: ${res.statusText}`);
  if (res.latencyMs !== undefined) {
    console.log(`Latency: ${res.latencyMs}ms`);
  }
  if (!res.ok) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

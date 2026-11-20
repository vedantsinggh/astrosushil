/**
 * Generate a report through the universal platform.
 *
 *   npx tsx packages/report-engine/src/scripts/generate-platform-report.ts \
 *     --report love --subject path/to/subject.json --out out-dir \
 *     [--provider offline|gemini] [--as-of 2026-11-18] [--regenerate topicA,topicB]
 *
 * --provider gemini spends API credit; the topic cache (REPORT_LLM_CACHE_DIR,
 * default .cache/report-llm) prevents paying twice for unchanged topics.
 */
import * as fs from 'fs';
import * as path from 'path';
import { GeminiAiProvider } from '@astro/prediction-engine';
import { DEFAULT_NARRATOR_CONFIG, LlmNarrator } from '../platform/llm/narrator';
import { OfflineTestProvider } from '../platform/llm/offline-test-provider';
import { FileTopicCacheStore } from '../platform/llm/topic-cache';
import { ReportModule } from '../platform/module';
import { generateReport } from '../platform/orchestrator';
import { SubjectInput } from '../platform/snapshot/chart-snapshot';

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

async function main() {
  const report = arg('report', 'love')!;
  const subjectPath = arg('subject');
  const outDir = path.resolve(arg('out', 'platform-output')!);
  const providerName = arg('provider', 'offline')!;
  const asOf = arg('as-of');
  if (!subjectPath) throw new Error('--subject <json> is required');
  const subject = JSON.parse(fs.readFileSync(subjectPath, 'utf-8')) as SubjectInput;
  const partnerPath = arg('partner');
  const partner = partnerPath ? (JSON.parse(fs.readFileSync(partnerPath, 'utf-8')) as SubjectInput) : undefined;

  const cacheDir = path.resolve(process.env.REPORT_LLM_CACHE_DIR ?? '.cache/report-llm', providerName);
  const provider = providerName === 'gemini' ? new GeminiAiProvider() : new OfflineTestProvider();
  if (!provider.isConfigured) throw new Error('Provider is not configured (GEMINI_API_KEY missing?)');
  const narrator = new LlmNarrator(provider, new FileTopicCacheStore(cacheDir), {
    ...DEFAULT_NARRATOR_CONFIG,
    model: providerName === 'gemini' ? DEFAULT_NARRATOR_CONFIG.model : 'offline-test',
  });

  // --module <path> loads an unregistered module (exports a *_MODULE constant) for development.
  const modulePath = arg('module');
  let module: ReportModule | undefined;
  if (modulePath) {
    const mod = (await import(path.resolve(modulePath))) as Record<string, unknown>;
    module = Object.entries(mod).find(([k]) => k.endsWith('_MODULE'))?.[1] as ReportModule | undefined;
    if (!module) throw new Error(`No *_MODULE export in ${modulePath}`);
  }

  const started = Date.now();
  const result = await generateReport({
    definitionId: report,
    module,
    subject,
    partner,
    narrator,
    asOf: asOf ? new Date(`${asOf}T00:00:00Z`) : undefined,
    regenerateTopics: arg('regenerate')?.split(','),
    llmProviderLabel: providerName === 'gemini' ? 'Google Gemini' : 'offline test provider (no AI used)',
  });

  fs.mkdirSync(outDir, { recursive: true });
  const base = path.join(outDir, `${report}-${result.manifest.subjectRef}`);
  fs.writeFileSync(`${base}.manifest.json`, JSON.stringify(result.manifest, null, 2));
  if (result.pdf) fs.writeFileSync(`${base}.pdf`, result.pdf);
  if (process.argv.includes('--keep-tex')) fs.writeFileSync(`${base}.tex`, result.tex);

  const m = result.manifest;
  const byStatus = m.topics.reduce<Record<string, number>>((a, t) => ((a[t.status] = (a[t.status] ?? 0) + 1), a), {});
  console.log(JSON.stringify({
    status: m.status, pages: m.pdf?.pageCount, qaPassed: m.pdf?.qaPassed, topics: byStatus,
    usage: m.usage, seconds: Math.round((Date.now() - started) / 1000), pdf: result.pdf ? `${base}.pdf` : null,
  }, null, 2));
  for (const t of m.topics.filter((x) => x.issues.some((i) => i.severity === 'error') || x.error)) {
    console.log(`- ${t.topicId}: ${t.error ?? ''} ${t.issues.filter((i) => i.severity === 'error').map((i) => `${i.code}: ${i.message}`).join(' | ').slice(0, 400)}`);
  }
  for (const i of m.pdf?.qaIssues ?? []) console.log(`QA ${i.severity} ${i.code}: ${i.message}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

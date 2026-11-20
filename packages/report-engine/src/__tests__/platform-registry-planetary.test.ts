/**
 * Registry aliases (additionalReportTypes), the Planetary Summary module,
 * orchestrator cancellation and the platform numerology facts.
 * No network and no paid API (offline test provider).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { ReportDefinitionSchema } from '../platform/contracts';
import { EvidenceRegistry } from '../platform/evidence/evidence-registry';
import { calculateBhagyank, calculateMulank, computeNumerology } from '../platform/evidence/numerology';
import { DEFAULT_NARRATOR_CONFIG, LlmNarrator } from '../platform/llm/narrator';
import { OfflineTestProvider } from '../platform/llm/offline-test-provider';
import { InMemoryTopicCacheStore } from '../platform/llm/topic-cache';
import { generateReport, ReportGenerationAbortedError } from '../platform/orchestrator';
import { indexReportTypes, ReportRegistry, servedReportTypes, validateModule } from '../platform/registry';
import { PLANETARY_SUMMARY_MODULE } from '../platform/reports/planetary-summary';
import { buildChartSnapshot, ChartSnapshot, SubjectInput } from '../platform/snapshot/chart-snapshot';

const AS_OF = new Date('2026-11-18T00:00:00Z');
const SUBJECT: SubjectInput = {
  name: 'Test Native C', gender: 'female', dateOfBirth: '1992-03-14', timeOfBirth: '09:20',
  placeName: 'Pune', latitude: 18.5204, longitude: 73.8567, timezone: 'Asia/Kolkata',
};
const offlineNarrator = () =>
  new LlmNarrator(new OfflineTestProvider(), new InMemoryTopicCacheStore(), { ...DEFAULT_NARRATOR_CONFIG, model: 'offline-test' });

/** Every ReportType the API may sell; CHILDBIRTH_FAMILY and GUPTA_NADI_DOSSIER have no genuine generator. */
const SELLABLE = [
  'KUNDLI', 'PLANETARY_SUMMARY', 'CAREER', 'CAREER_PROSITY', 'MARRIAGE_COMPATIBILITY', 'HOROSCOPE', 'FINANCE', 'LOVE',
  'FORTUNE', 'FORTUNE_PLUS', 'SATURN', 'JUPITER_TRANSIT', 'RAHU_KETU_TRANSIT', 'VARSHPHAL', 'BABY_NAME',
];

describe('registry report-type aliases', () => {
  it('serves CAREER_PROSITY with the career definition', () => {
    expect(ReportRegistry.byReportType('CAREER')?.id).toBe('career');
    expect(ReportRegistry.byReportType('CAREER_PROSITY')?.id).toBe('career');
    expect(servedReportTypes(ReportRegistry.get('career'))).toEqual(['CAREER', 'CAREER_PROSITY']);
  });

  it('covers every sellable ReportType and nothing without a generator', () => {
    for (const rt of SELLABLE) expect(ReportRegistry.byReportType(rt), rt).toBeDefined();
    expect(ReportRegistry.byReportType('CHILDBIRTH_FAMILY')).toBeUndefined();
    expect(ReportRegistry.byReportType('GUPTA_NADI_DOSSIER')).toBeUndefined();
    expect(new Set(ReportRegistry.reportTypes())).toEqual(new Set(SELLABLE));
  });

  it('defaults additionalReportTypes to an empty list', () => {
    expect(ReportRegistry.get('love').additionalReportTypes).toEqual([]);
  });

  it('rejects a ReportType claimed by two definitions', () => {
    const career = ReportRegistry.get('career');
    const clash = ReportDefinitionSchema.parse({ ...ReportRegistry.get('love'), additionalReportTypes: ['CAREER_PROSITY'] });
    expect(() => indexReportTypes([career, clash])).toThrow(/CAREER_PROSITY is served by both career and love/);
  });
});

describe('planetary-summary module', () => {
  let snapshot: ChartSnapshot;
  let registry: EvidenceRegistry;

  beforeAll(async () => {
    snapshot = await buildChartSnapshot(SUBJECT, { asOf: AS_OF, vargas: ['D1'], transitYears: 1 });
    registry = new EvidenceRegistry(snapshot);
  }, 60000);

  it('is registered for PLANETARY_SUMMARY and validates', () => {
    expect(ReportRegistry.byReportType('PLANETARY_SUMMARY')?.id).toBe('planetary-summary');
    expect(() => validateModule(PLANETARY_SUMMARY_MODULE)).not.toThrow();
  });

  it('has one narrative topic per planet and resolvable required evidence', () => {
    const def = validateModule(PLANETARY_SUMMARY_MODULE);
    const topics = def.sections.flatMap((s) => s.topics);
    for (const p of ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu']) {
      expect(topics.find((t) => t.id === `planet-${p}`)?.kind, p).toBe('narrative');
    }
    for (const t of topics.filter((x) => x.kind === 'narrative')) {
      for (const pattern of t.requiredEvidence) expect(registry.resolve([pattern]).length, `${t.id} → ${pattern}`).toBeGreaterThan(0);
    }
    for (const s of def.sections) expect(s.topics.length).toBeLessThanOrEqual(6);
  });

  it('planet table is deterministic and cites only registered evidence', () => {
    const block = PLANETARY_SUMMARY_MODULE.blocks!['planetary-summary-planet-table']({ snapshot, registry, ext: {} });
    expect(block.evidenceIds.filter((id) => !registry.has(id))).toEqual([]);
    const sun = snapshot.natal.planets.find((p) => p.name.toLowerCase() === 'sun')!;
    expect(block.tex).toContain(sun.sign);
    expect(PLANETARY_SUMMARY_MODULE.blocks!['planetary-summary-planet-table']({ snapshot, registry, ext: {} }).tex).toBe(block.tex);
  });

  it('generates end to end offline with PDF QA passing and records the requested report type', async () => {
    const { manifest, pdf } = await generateReport({
      definitionId: 'planetary-summary', subject: SUBJECT, narrator: offlineNarrator(), asOf: AS_OF, reportType: 'PLANETARY_SUMMARY',
    });
    expect(manifest.status).toBe('completed');
    expect(manifest.reportType).toBe('PLANETARY_SUMMARY');
    expect(pdf).toBeDefined();
    expect(manifest.pdf?.qaPassed).toBe(true);
    expect(manifest.topics.filter((t) => t.provenance === 'llm')).toHaveLength(11);
  }, 300000);
});

describe('orchestrator request guards', () => {
  it('rejects a reportType the definition does not serve', async () => {
    await expect(generateReport({ definitionId: 'planetary-summary', subject: SUBJECT, narrator: offlineNarrator(), asOf: AS_OF, reportType: 'CAREER' }))
      .rejects.toThrow(/REPORT_TYPE_MISMATCH/);
  });

  it('stops before any narrative work when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const run = generateReport({ definitionId: 'planetary-summary', subject: SUBJECT, narrator: offlineNarrator(), asOf: AS_OF, signal: controller.signal });
    await expect(run).rejects.toBeInstanceOf(ReportGenerationAbortedError);
  }, 60000);
});

describe('platform numerology', () => {
  it('computes Mulank and Bhagyank from an ISO date', () => {
    expect(computeNumerology('1992-03-14')).toEqual({ mulank: 5, bhagyank: 2 });
    expect(calculateMulank('1990-01-29')).toBe(2);
    expect(calculateBhagyank('1990-01-29')).toBe(4);
  });

  it('never substitutes a value for a malformed date', () => {
    expect(() => calculateMulank('14/03/1992')).toThrow(/NUMEROLOGY_INPUT_INVALID/);
    expect(() => calculateBhagyank('')).toThrow(/NUMEROLOGY_INPUT_INVALID/);
    expect(() => calculateMulank('1992-13-01')).toThrow(/NUMEROLOGY_INPUT_INVALID/);
  });
});

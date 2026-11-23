/**
 * Hindi editions of the Career and Love reports and the Hindi-capable core blocks
 * (docs/integration/hindi-reports-design.md). A Hindi block must show the same numbers and
 * report the same evidence as the English one, with no English words left for the reader.
 * No network, no paid API (synthetic subjects, offline provider).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import '../platform/index';
import { EvidenceRegistry, yogaConditionText } from '../platform/evidence/evidence-registry';
import { label } from '../platform/i18n/hindi';
import { DEFAULT_NARRATOR_CONFIG, LlmNarrator } from '../platform/llm/narrator';
import { OfflineTestProvider } from '../platform/llm/offline-test-provider';
import { InMemoryTopicCacheStore } from '../platform/llm/topic-cache';
import { generateReport } from '../platform/orchestrator';
import { ReportRegistry } from '../platform/registry';
import { BlockContext, BlockOutput, CORE_BLOCKS, kvTable } from '../platform/render/blocks';
import { dateLabel, ordinalHi, ordinalLabel, vargaMethodHi, weekdayLabel } from '../platform/render/blocks.hindi';
import { CAREER_MODULE } from '../platform/reports/career';
import {
  CAREER_HINDI_VARIANT_TITLES, careerLinkHi, durationHi, govLinkHi, YOGA_CONDITION_FALLBACK_HI, YOGA_NAME_FALLBACK_HI, yogaConditionHi, yogaNameHi,
} from '../platform/reports/career/career.hindi';
import { LOVE_MODULE } from '../platform/reports/love';
import { buildChartSnapshot, ChartSnapshot, SubjectInput } from '../platform/snapshot/chart-snapshot';

const DEVANAGARI = /[ऀ-ॿ]/;
const AS_OF = new Date('2026-11-18T00:00:00Z');
const SUBJECTS: SubjectInput[] = [
  { name: 'Career Test A', gender: 'male', dateOfBirth: '1990-07-14', timeOfBirth: '09:20', placeName: 'Pune', latitude: 18.5204, longitude: 73.8567, timezone: 'Asia/Kolkata' },
  { name: 'Career Test B', gender: 'female', dateOfBirth: '1978-02-03', timeOfBirth: '22:45', placeName: 'Chennai', latitude: 13.0827, longitude: 80.2707, timezone: 'Asia/Kolkata' },
  { name: 'Career Test C', gender: 'female', dateOfBirth: '2004-06-08', timeOfBirth: '08:30', placeName: 'Lucknow', latitude: 26.8467, longitude: 80.9462, timezone: 'Asia/Kolkata' },
  { name: 'Career Test D', gender: 'male', dateOfBirth: '1965-11-29', timeOfBirth: '15:05', placeName: 'Delhi', latitude: 28.61, longitude: 77.2, timezone: 'Asia/Kolkata' },
];

/** What a reader could see as English in block LaTeX: Latin words once commands, layout and chart codes are removed. */
function latinWords(texSource: string): string[] {
  const text = texSource
    .replace(/\\begin\{tabularx\}.*$/gm, '')
    .replace(/\\(begin|end)\{[A-Za-z]+\}/g, '')
    .replace(/\\[A-Za-z]+/g, '')
    .replace(/\{(Muted|Surface|Primary|Accent)[^}]*\}/g, '')
    .replace(/\d+(\.\d+)?(pt|mm)/g, '')
    .replace(/\bD\d+\b/g, '');
  return text.match(/[A-Za-z]{2,}/g) ?? [];
}

/** The distinct numbers a block prints (layout numbers are the same in both languages). */
const numbers = (texSource: string): string[] => [...new Set(texSource.match(/\d+(\.\d+)?/g) ?? [])].sort();

interface Built { snapshot: ChartSnapshot; ctx: BlockContext }
const built: Built[] = [];

beforeAll(async () => {
  for (const subject of SUBJECTS) {
    const snapshot = await buildChartSnapshot(subject, { asOf: AS_OF, vargas: ['D1', 'D9', 'D10'], transitYears: 10 });
    const ext = await CAREER_MODULE.extend!({ snapshot });
    const registry = new EvidenceRegistry(snapshot, { contributors: [(add, r) => CAREER_MODULE.evidence!(add, { snapshot, ext, registry: r })] });
    built.push({ snapshot, ctx: { snapshot, registry, ext } });
  }
}, 240000);

/** Renders a block in both languages for every subject and checks what must hold for any Hindi block. */
function expectHindiBlock(name: string, block: (ctx: BlockContext) => BlockOutput, opts: { numbers?: 'same' | 'subset' } = {}): void {
  for (const { ctx } of built) {
    const en = block(ctx);
    const hi = block({ ...ctx, lang: 'hi' });
    expect(block({ ...ctx, lang: 'en' }), name).toEqual(en);
    expect(hi.evidenceIds, name).toEqual(en.evidenceIds);
    expect(latinWords(hi.tex), `${name} tex`).toEqual([]);
    expect(hi.tex, name).toMatch(DEVANAGARI);
    if (opts.numbers === 'subset') for (const n of numbers(hi.tex)) expect(numbers(en.tex), `${name} number ${n}`).toContain(n);
    else expect(numbers(hi.tex), `${name} numbers`).toEqual(numbers(en.tex));
    expect(hi.method === undefined, name).toBe(en.method === undefined);
    if (hi.method !== undefined) {
      expect(hi.method, name).toMatch(DEVANAGARI);
      expect(latinWords(hi.method), `${name} method`).toEqual([]);
    }
  }
}

describe('Hindi editions of Career and Love', () => {
  it.each(['career', 'love'])('%s keeps structure, evidence and objectives and gives every title in Hindi', (id) => {
    const en = ReportRegistry.get(id);
    const hi = ReportRegistry.get(id, 'hi');
    expect(ReportRegistry.languages(id)).toEqual(['en', 'hi']);
    expect(hi.language).toBe('hi');
    for (const text of [hi.title, hi.subtitle, hi.description]) expect(text).toMatch(DEVANAGARI);
    expect(hi.sections.map((s) => s.id)).toEqual(en.sections.map((s) => s.id));
    for (const s of hi.sections) {
      expect(s.title, s.id).toMatch(DEVANAGARI);
      expect(s.kicker, s.id).toMatch(DEVANAGARI);
      if (s.intro) expect(s.intro, s.id).toMatch(DEVANAGARI);
      expect(latinWords([s.title, s.kicker, s.intro ?? ''].join(' ')), s.id).toEqual([]);
    }
    const shape = (def: typeof en) => def.sections.flatMap((s) => s.topics).map((t) => [t.id, t.kind, t.block, t.objective, t.requiredEvidence, t.optionalEvidence, t.interpretations, t.depth]);
    expect(shape(hi)).toEqual(shape(en));
    for (const t of hi.sections.flatMap((s) => s.topics)) {
      expect(t.title, t.id).toMatch(DEVANAGARI);
      expect(latinWords(`${t.title} ${t.subtitle ?? ''}`), t.id).toEqual([]);
    }
    expect(hi.writingGuidance.slice(0, en.writingGuidance.length)).toEqual(en.writingGuidance);
    expect(hi.reportType).toBe(en.reportType);
    expect(hi.additionalReportTypes).toEqual(en.additionalReportTypes);
  });

  it('has a Hindi title ready for every career topic variant that replaces a title', () => {
    const variants = ReportRegistry.get('career').sections.flatMap((s) => s.topics).flatMap((t) => t.variants.filter((v) => v.title).map((v) => [t.id, v.id]));
    expect(variants.length).toBeGreaterThan(0);
    for (const [topic, variant] of variants) expect(CAREER_HINDI_VARIANT_TITLES[topic]?.[variant], `${topic}/${variant}`).toMatch(DEVANAGARI);
  });
});

describe('Hindi helpers of the core blocks', () => {
  it('writes ordinals with the digit in the three forms Hindi needs', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 10, 12].map((n) => ordinalHi(n))).toEqual(['1ला', '2रा', '3रा', '4था', '5वाँ', '6ठा', '7वाँ', '10वाँ', '12वाँ']);
    expect([1, 4, 6, 10].map((n) => ordinalHi(n, 'oblique'))).toEqual(['1ले', '4थे', '6ठे', '10वें']);
    expect([3, 7, 9].map((n) => ordinalHi(n, 'feminine'))).toEqual(['3री', '7वीं', '9वीं']);
    expect(ordinalLabel('en', 11)).toBe('11th');
    expect(ordinalLabel('hi', 11)).toBe('11वाँ');
  });

  it('changes only the month of a date and leaves English untouched', () => {
    expect(dateLabel('hi', '20 Nov 2026')).toBe('20 नवंबर 2026');
    expect(dateLabel('hi', '02 Sept 2031 -- 05 May 2032')).toBe('02 सितंबर 2031 -- 05 मई 2032');
    expect(dateLabel('en', '20 Nov 2026')).toBe('20 Nov 2026');
    expect(weekdayLabel('hi', 'Thursday')).toBe('गुरुवार');
    expect(() => weekdayLabel('hi', 'Someday')).toThrow('HINDI_WEEKDAY_MISSING');
  });

  it('names a divisional chart in Hindi and never prints an untranslated rule', () => {
    expect(vargaMethodHi('D9', 'some new English rule')).toMatch(/^नवांश \(D9\)/);
    expect(latinWords(vargaMethodHi('D9', 'some new English rule'))).toEqual([]);
  });

  it('labels the key/value table by language, English by default', () => {
    expect(kvTable([['a', 'b']])).toContain('\\THd{Factor} & \\THd{Your chart}');
    expect(kvTable([['a', 'b']], 'en')).toBe(kvTable([['a', 'b']]));
    expect(kvTable([['क', 'ख']], 'hi')).toContain(`\\THd{${label('hi', 'Factor')}} & \\THd{${label('hi', 'Your chart')}}`);
  });
});

describe('Hindi core and love blocks', () => {
  it.each(Object.keys(CORE_BLOCKS))('core block %s', (key) => {
    expectHindiBlock(key, CORE_BLOCKS[key]);
  });

  it('prints Hindi abbreviations in a divisional chart', () => {
    const hi = CORE_BLOCKS['chart-d10']({ ...built[0].ctx, lang: 'hi' });
    expect(hi.tex).not.toMatch(/\b(Asc|Su|Mo|Ma|Me|Ju|Ve|Sa|Ra|Ke)\b/);
    expect(hi.method).toContain('दशमांश (D10)');
  });

  it.each(Object.keys(LOVE_MODULE.blocks!))('love block %s', (key) => {
    expectHindiBlock(key, LOVE_MODULE.blocks![key]);
  });
});

describe('Hindi career blocks', () => {
  it.each(Object.keys(CAREER_MODULE.blocks!).filter((k) => k !== 'career-yogas'))('career block %s', (key) => {
    expectHindiBlock(key, CAREER_MODULE.blocks![key]);
  });

  it('career block career-yogas lists the same yogas with Hindi names and conditions', () => {
    // The engine repeats some numbers inside one condition ("House 8 <-> House 1"); Hindi states each once.
    expectHindiBlock('career-yogas', CAREER_MODULE.blocks!['career-yogas'], { numbers: 'subset' });
    for (const { ctx } of built) {
      const rows = (out: BlockOutput) => (out.tex.match(/\\TCell\{\\textbf/g) ?? []).length;
      const block = CAREER_MODULE.blocks!['career-yogas'];
      expect(rows(block({ ...ctx, lang: 'hi' }))).toBe(rows(block(ctx)));
    }
  });

  it('gives every engine yoga a Hindi name and every observed condition a Hindi form', () => {
    for (const { snapshot } of built) {
      for (const y of snapshot.yogas) {
        const name = yogaNameHi(y.canonicalName);
        expect(name, y.canonicalName).not.toBe(YOGA_NAME_FALLBACK_HI);
        expect(latinWords(name), y.canonicalName).toEqual([]);
        if (!y.isDetected) continue;
        for (const c of y.evidence.conditions.filter((x) => x.satisfied)) {
          const text = yogaConditionText(c);
          expect(yogaConditionHi(text), text).not.toBe(YOGA_CONDITION_FALLBACK_HI);
          expect(latinWords(yogaConditionHi(text)), text).toEqual([]);
        }
      }
    }
    expect(yogaNameHi('Kemadruma Yoga (formed and cancelled)')).toBe('केमद्रुम योग (बना, पर भंग हुआ)');
    expect(yogaNameHi('Raja Yoga (Yogakaraka MARS: 10th Lord + 5th Lord)')).toBe('राज योग (योगकारक मंगल: 10वें भाव का स्वामी + 5वें भाव का स्वामी)');
    expect(yogaConditionHi('Lord of H9 (VENUS) and Lord of H10 (MERCURY) conjunct in Capricorn; in mutual aspect (7TH_MUTUAL_OPPOSITION)'))
      .toBe('9वें भाव का स्वामी (शुक्र) और 10वें भाव का स्वामी (बुध): मकर राशि में युति; परस्पर 7वीं दृष्टि');
  });

  it('never prints an engine text it has no Hindi form for', () => {
    expect(yogaNameHi('Some New Yoga')).toBe(YOGA_NAME_FALLBACK_HI);
    expect(yogaConditionHi('Some new engine condition: 4')).toBe(YOGA_CONDITION_FALLBACK_HI);
    expect(() => careerLinkHi('a new kind of link')).toThrow('HINDI_LABEL_MISSING');
    expect(() => govLinkHi('a new kind of link')).toThrow('HINDI_LABEL_MISSING');
  });

  it('puts the short calculation texts into Hindi with the same numbers', () => {
    expect(durationHi('2 years 2 months')).toBe('2 वर्ष 2 माह');
    expect(durationHi('1 year 1 month')).toBe('1 वर्ष 1 माह');
    expect(durationHi('10 days')).toBe('10 दिन');
    expect(careerLinkHi('rules the 2nd')).toBe('2रे भाव का स्वामी');
    expect(careerLinkHi('occupies the 11th')).toBe('11वें भाव में स्थित');
    expect(careerLinkHi('aspects the 10th')).toBe('10वें भाव पर दृष्टि');
    expect(careerLinkHi('D10 house 10')).toBe('D10 भाव 10');
    expect(careerLinkHi('rules the D10 10th')).toBe('D10 के 10वें भाव का स्वामी');
    expect(govLinkHi('Saturn aspects the Sun (3rd aspect)')).toBe('शनि की सूर्य पर 3री दृष्टि');
  });
});

describe('offline Hindi runs', () => {
  const narrator = () => new LlmNarrator(new OfflineTestProvider(), new InMemoryTopicCacheStore(), { ...DEFAULT_NARRATOR_CONFIG, model: 'offline-test' });

  it('generates the Love report in Hindi end to end with PDF QA passing', async () => {
    const { manifest, pdf, tex } = await generateReport({ definitionId: 'love', subject: SUBJECTS[0], narrator: narrator(), asOf: AS_OF, language: 'hi' });
    expect(manifest.status).toBe('completed');
    expect(pdf).toBeDefined();
    expect(manifest.pdf?.qaPassed).toBe(true);
    expect(tex).toContain('प्रेम एवं संबंध रिपोर्ट');
    expect(tex).toContain(label('hi', 'Your Mulank and its ruling planet'));
    expect(tex).not.toContain('Your Mulank and its ruling planet');
    expect(tex).not.toContain('\\THd{Factor}');
  }, 300000);

  it('renders every deterministic topic of the Career report in Hindi with PDF QA passing', async () => {
    const { manifest, pdf, tex } = await generateReport({ definitionId: 'career', subject: SUBJECTS[0], narrator: narrator(), asOf: AS_OF, language: 'hi' });
    // The offline placeholder prose cannot satisfy the interpretation validators (true in English too),
    // so only the deterministic layer and the page build are asserted here.
    expect(pdf).toBeDefined();
    expect(manifest.pdf?.qaPassed).toBe(true);
    const deterministic = manifest.topics.filter((t) => t.provenance === 'deterministic');
    expect(deterministic).toHaveLength(17);
    for (const t of deterministic) expect(t.status, t.topicId).toBe('deterministic');
    expect(tex).toContain('करियर रिपोर्ट');
    expect(tex).toContain(label('hi', 'Career links'));
    expect(tex).not.toContain('\\THd{Career links}');
    expect(tex).not.toContain('\\THd{Factor}');
  }, 300000);
});

/**
 * Both languages for the numerology family (Fortune, Fortune Plus, Baby Name):
 * the registry offers `en` and `hi` for each, the default edition of each is
 * unchanged, the two editions share structure, evidence and objectives, and
 * every block of the family prints the same numbers in Hindi as in English.
 * Synthetic subjects only. No network, no paid API (offline test provider).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { REPEATING_KARANAS, TITHI_NAMES, YOGA_NAMES } from '@astro/astrology-engine';
import type { AiGenerationOptions } from '@astro/prediction-engine';
import '../platform/index';
import { ReportDefinition } from '../platform/contracts';
import { EvidenceRegistry } from '../platform/evidence/evidence-registry';
import { DEFAULT_NARRATOR_CONFIG, LlmNarrator } from '../platform/llm/narrator';
import { OfflineTestProvider } from '../platform/llm/offline-test-provider';
import { InMemoryTopicCacheStore } from '../platform/llm/topic-cache';
import { ReportModule } from '../platform/module';
import { generateReport } from '../platform/orchestrator';
import { localizedDefinition, moduleLanguages, ReportRegistry, validateModule } from '../platform/registry';
import { BlockContext, CORE_BLOCKS } from '../platform/render/blocks';
import { numerologyBlocks } from '../platform/reports/_numerology-shared/blocks';
import { BABY_NAME_MODULE } from '../platform/reports/baby-name';
import { FORTUNE_MODULE } from '../platform/reports/fortune';
import { FORTUNE_DEFINITION, FORTUNE_DEFINITION_EN } from '../platform/reports/fortune/fortune.definition';
import { FORTUNE_PLUS_MODULE } from '../platform/reports/fortune-plus';
import { KARANA_HI, PANCHANG_YOGA_HI, TITHI_HI, yogaNameHi } from '../platform/reports/fortune-plus/fortune-plus.hindi';
import { buildChartSnapshot, ChartSnapshot, SubjectInput } from '../platform/snapshot/chart-snapshot';

const DEVANAGARI = /[ऀ-ॿ]/;
const AS_OF = new Date('2026-11-18T00:00:00Z');
const SUBJECT: SubjectInput & { candidateNames?: string[] } = {
  name: 'Aarav Mehta', gender: 'male', dateOfBirth: '1990-07-14', timeOfBirth: '08:30', placeName: 'Pune',
  latitude: 18.5204, longitude: 73.8567, timezone: 'Asia/Kolkata', candidateNames: ['Bhavya Mehta', 'Riya Mehta'],
};

const FAMILY: Array<[string, ReportModule, 'en' | 'hi']> = [
  ['fortune', FORTUNE_MODULE, 'hi'],
  ['fortune-plus', FORTUNE_PLUS_MODULE, 'en'],
  ['baby-name', BABY_NAME_MODULE, 'en'],
];

/** What the two editions of a report must have in common. */
const shape = (def: ReportDefinition) => ({
  id: def.id, reportType: def.reportType, specVersion: def.specVersion, requires: def.requires, theme: def.theme,
  sections: def.sections.map((s) => [s.id, s.topics.map((t) => [t.id, t.kind, t.block, t.objective, t.requiredEvidence, t.optionalEvidence, t.dependsOn, t.depth, t.referencePages, t.bonus])]),
});

describe.each(FAMILY)('%s in both languages', (id, module, own) => {
  it('is offered in English and Hindi, and its default edition is the one it always had', () => {
    expect(ReportRegistry.languages(id)).toEqual(['en', 'hi']);
    expect(moduleLanguages(module)).toEqual(['en', 'hi']);
    const def = ReportRegistry.get(id);
    expect(def.language).toBe(own);
    expect(ReportRegistry.get(id, own)).toEqual(def);
    expect(localizedDefinition(module)).toEqual(validateModule(module));
  });

  it('shares structure, blocks, evidence and objectives between the editions; only reader text differs', () => {
    const en = ReportRegistry.get(id, 'en');
    const hi = ReportRegistry.get(id, 'hi');
    expect(en.language).toBe('en');
    expect(hi.language).toBe('hi');
    expect(shape(hi)).toEqual(shape(en));
    for (const text of [hi.title, hi.subtitle, hi.description]) expect(text).toMatch(DEVANAGARI);
    for (const text of [en.title, en.subtitle, en.description]) expect(text).not.toMatch(DEVANAGARI);
    for (const s of hi.sections) {
      expect(s.title, s.id).toMatch(DEVANAGARI);
      expect(s.kicker, s.id).toMatch(DEVANAGARI);
      if (s.intro) expect(s.intro, s.id).toMatch(DEVANAGARI);
      for (const t of s.topics) {
        expect(t.title, t.id).toMatch(DEVANAGARI);
        if (t.subtitle) expect(t.subtitle, t.id).toMatch(DEVANAGARI);
      }
    }
    for (const s of en.sections) {
      expect(`${s.title} ${s.kicker} ${s.intro ?? ''}`, s.id).not.toMatch(DEVANAGARI);
      for (const t of s.topics) expect(`${t.title} ${t.subtitle ?? ''}`, t.id).not.toMatch(DEVANAGARI);
    }
    // Writing guidance is instructions to the model: English in both, with a Hindi-writing rule only in the Hindi edition.
    expect(hi.writingGuidance.join(' ')).toMatch(/Hindi/);
    expect(en.writingGuidance.join(' ')).not.toMatch(/Hindi|Devanagari/);
  });
});

describe('a full definition per language (ReportModule.editions)', () => {
  it('keeps the Hindi Fortune definition as the module definition and adds English beside it', () => {
    expect(FORTUNE_MODULE.definition).toBe(FORTUNE_DEFINITION);
    expect(FORTUNE_MODULE.editions?.en).toBe(FORTUNE_DEFINITION_EN);
    expect(ReportRegistry.get('fortune').title).toBe('भाग्य रिपोर्ट');
    expect(ReportRegistry.get('fortune', 'en').title).toBe('Fortune Report');
    expect(ReportRegistry.byReportType('FORTUNE')?.language).toBe('hi');
  });

  it('still serves only its own language without an edition', () => {
    const hindiOnly: ReportModule = { ...FORTUNE_MODULE, editions: undefined };
    expect(moduleLanguages(hindiOnly)).toEqual(['hi']);
    expect(() => localizedDefinition(hindiOnly, 'en')).toThrow('REPORT_LANGUAGE_NOT_AVAILABLE');
    expect(moduleLanguages({ ...FORTUNE_PLUS_MODULE, hindi: undefined })).toEqual(['en']);
  });

  it('rejects an edition that differs in structure, evidence, objectives or language', () => {
    const sections = FORTUNE_DEFINITION_EN.sections;
    const dropped: ReportModule = { ...FORTUNE_MODULE, editions: { en: { ...FORTUNE_DEFINITION_EN, sections: sections.slice(1) } } };
    expect(() => localizedDefinition(dropped, 'en')).toThrow('REPORT_EDITION_MISMATCH');
    const reworded: ReportModule = {
      ...FORTUNE_MODULE,
      editions: { en: { ...FORTUNE_DEFINITION_EN, sections: sections.map((s, i) => (i ? s : { ...s, topics: s.topics.map((t) => ({ ...t, objective: `${t.objective} More.` })) })) } },
    };
    expect(() => localizedDefinition(reworded, 'en')).toThrow('REPORT_EDITION_MISMATCH');
    const mislabelled: ReportModule = { ...FORTUNE_MODULE, editions: { en: { ...FORTUNE_DEFINITION_EN, language: 'hi' } } };
    expect(() => localizedDefinition(mislabelled, 'en')).toThrow('REPORT_EDITION_MISMATCH');
  });
});

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

async function build(module: ReportModule): Promise<{ snapshot: ChartSnapshot; registry: EvidenceRegistry; ext: Record<string, unknown> }> {
  const def = validateModule(module);
  const snapshot = await buildChartSnapshot(SUBJECT, {
    asOf: AS_OF, requireBirthTime: def.requires.birthTime,
    vargas: [...new Set(['D1', ...def.requires.vargas])] as typeof def.requires.vargas, transitYears: def.requires.transitYears,
  });
  const ext = module.extend ? await module.extend({ snapshot }) : {};
  const registry = new EvidenceRegistry(snapshot, { contributors: [(add, reg) => module.evidence!(add, { snapshot, ext, registry: reg })] });
  return { snapshot, registry, ext };
}

/**
 * English words that must not appear in a Hindi block. Latin that may remain: the client's and
 * candidates' names as entered, Chaldean letters, the transliterated mantra and chart codes.
 */
const ENGLISH = new RegExp(`\\b(${[
  'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu', 'Ascendant', 'Asc', 'Lagna',
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'January', 'February', 'November', 'December',
  'Name', 'Number', 'Numbers', 'Planet', 'Sign', 'House', 'house', 'Degree', 'Dignity', 'Nakshatra', 'nakshatra', 'Pada', 'pada', 'Tithi', 'Yoga', 'Karana',
  'Paksha', 'Shukla', 'Krishna', 'Cycle', 'Phase', 'From', 'Month', 'Total', 'Element', 'Value', 'Letters', 'Detail', 'Child', 'Gender', 'Boy', 'Girl',
  'Mulank', 'Bhagyank', 'Kua', 'Harmonious', 'Mixed', 'Supportive', 'Workable', 'Syllable', 'SYLLABLES', 'TRADITIONAL', 'CANDIDATE', 'Latin', 'Devanagari',
  'Mental', 'Physical', 'Emotional', 'Intuitive', 'North', 'South', 'East', 'West', 'Water', 'Wood', 'Fire', 'Earth', 'Metal',
  'the', 'and', 'with', 'your', 'you', 'not', 'none', 'are', 'for', 'friend', 'neutral', 'retrograde', 'lord', 'Lord', 'birth', 'before', 'position',
].join('|')})\\b`);

/** English ordinals that Hindi writes as words: "12th from Moon" is "चंद्र से बारहवीं राशि", "5th lord" is "पंचमेश". */
const ORDINALS_WORDED_IN_HINDI: Record<string, RegExp> = {
  'fortune-plus-sadesati': /\((12th|2nd) from Moon\)/g,
  'fortune-plus-remedies': /\b(5th|9th) lord\b/g,
};

/** Blocks whose English form prints Devanagari by design: mantras and the name syllables. */
const DEVANAGARI_IN_ENGLISH = /-(lucky-table|devotion|mantras|syllables)$/;

/** Every number a block prints ("08 Jun" and "8 जून" are the same number), sorted because Hindi word order differs. */
const numbers = (tex: string) => (tex.match(/\d+/g) ?? []).map(Number).sort((a, b) => a - b);

/**
 * Blocks whose numbers are not compared one to one: the Hindi yoga table lists the planets forming
 * each yoga where English quotes the engine's (English-only) conditions; the child's date of birth
 * is printed as "1990-07-14" in English and "14 जुलाई 1990" in Hindi; and the Love report's Jupiter
 * windows (render/blocks.ts, tested with that report) word "the 7th lord" as "उसके स्वामी".
 */
const NUMBERS_DIFFER_BY_DESIGN = new Set(['fortune-plus-yogas', 'baby-name-details', 'fortune-plus-jupiter-windows']);

describe.each(FAMILY)('%s blocks in Hindi', (id, module) => {
  let ctx: BlockContext;
  let def: ReportDefinition;
  const blocks = { ...CORE_BLOCKS, ...(module.blocks ?? {}) };
  beforeAll(async () => {
    ctx = await build(module);
    def = validateModule(module);
  }, 60000);

  const dataTopics = () => def.sections.flatMap((s) => s.topics).filter((t) => t.kind === 'data');

  it('print Hindi labels, the same evidence and the same numbers as English', () => {
    for (const t of dataTopics()) {
      const en = blocks[t.block!]({ ...ctx, lang: 'en' });
      const hi = blocks[t.block!]({ ...ctx, lang: 'hi' });
      expect(hi.evidenceIds, t.id).toEqual(en.evidenceIds);
      expect(hi.tex, t.id).toMatch(DEVANAGARI);
      expect(hi.tex, t.id).not.toMatch(/undefined|NaN/);
      expect(ENGLISH.exec(hi.tex)?.[0], `${t.id} prints English`).toBeUndefined();
      if (hi.method !== undefined) {
        expect(hi.method, t.id).toMatch(DEVANAGARI);
        expect(ENGLISH.exec(hi.method)?.[0], `${t.id} method note`).toBeUndefined();
      }
      if (!DEVANAGARI_IN_ENGLISH.test(t.block!)) expect(en.tex, t.id).not.toMatch(DEVANAGARI);
      const ordinal = ORDINALS_WORDED_IN_HINDI[t.block!];
      const english = ordinal ? en.tex.replace(ordinal, '') : en.tex;
      if (!NUMBERS_DIFFER_BY_DESIGN.has(t.block!)) expect(numbers(hi.tex), t.id).toEqual(numbers(english));
      if (t.block === 'baby-name-details') {
        expect(en.tex).toContain('1990-07-14, 08:30');
        expect(hi.tex).toContain('14 जुलाई 1990, 08:30');
      }
    }
  });

  it('follow the language of the edition being generated, and their own language when none is given', () => {
    const own = def.language;
    for (const t of dataTopics()) {
      const plain = blocks[t.block!](ctx);
      expect(plain.tex, t.id).toBe(blocks[t.block!]({ ...ctx, lang: own }).tex);
      expect(plain.method, t.id).toBe(blocks[t.block!]({ ...ctx, lang: own }).method);
    }
  });
});

describe('shared numerology blocks', () => {
  it('a block built for one language renders in the requested one', async () => {
    const ctx = await build(FORTUNE_MODULE);
    const builtHindi = numerologyBlocks('x', 'hi')['x-lucky-table'];
    const builtEnglish = numerologyBlocks('x', 'en')['x-lucky-table'];
    expect(builtHindi(ctx).tex).toContain('जन्म तिथि');
    expect(builtHindi({ ...ctx, lang: 'en' }).tex).toContain('Date of birth');
    expect(builtHindi({ ...ctx, lang: 'en' }).tex).toBe(builtEnglish(ctx).tex);
    expect(builtEnglish({ ...ctx, lang: 'hi' }).tex).toBe(builtHindi(ctx).tex);
  }, 60000);
});

describe('Fortune Plus Hindi vocabulary', () => {
  it('covers every tithi, panchang yoga and karana the engine can return', () => {
    for (const name of [...TITHI_NAMES, 'Amavasya']) expect(TITHI_HI[name], name).toMatch(DEVANAGARI);
    for (const name of YOGA_NAMES) expect(PANCHANG_YOGA_HI[name], name).toMatch(DEVANAGARI);
    for (const name of [...REPEATING_KARANAS, 'Kimstughna', 'Shakuni', 'Chatushpada', 'Naga']) expect(KARANA_HI[name], name).toMatch(DEVANAGARI);
  });

  it('names the yogas of the engine catalogue in Hindi, with their bracketed detail', () => {
    expect(yogaNameHi('Gajakesari Yoga')).toBe('गजकेसरी योग');
    expect(yogaNameHi('Neecha Bhanga Raja Yoga (MARS)')).toBe('नीच भंग राज योग (मंगल)');
    expect(yogaNameHi('Raja Yoga (Lagna Lord + 5th Lord)')).toBe('राज योग (लग्नेश + पंचमेश)');
    expect(yogaNameHi('Raja Yoga (Yogakaraka SATURN: 4th Lord + 5th Lord)')).toBe('राज योग (योगकारक शनि: चतुर्थेश + पंचमेश)');
    expect(yogaNameHi('Dhana Yoga (5th Lord (Lakshmi Sthana) + 9th Lord (Bhagya))')).toBe('धन योग (पंचमेश (लक्ष्मी स्थान) + नवमेश (भाग्य))');
    expect(yogaNameHi('Dhana Yoga (2nd Lord (Dhana) + 11th Lord (Labha))')).toBe('धन योग (द्वितीयेश (धन) + एकादशेश (लाभ))');
    expect(yogaNameHi('Adhi Yoga (Chandradhi)')).toBe('अधि योग (चंद्राधि)');
    expect(yogaNameHi('Shakata Yoga (Nabhasa)')).toBe('शकट योग (नाभस)');
    for (const name of ['Ruchaka', 'Bhadra', 'Hamsa', 'Malavya', 'Shasha', 'Dharma-Karmadhipati', 'Lakshmi', 'Saraswati', 'Sunapha', 'Anapha', 'Durudhara',
      'Kemadruma', 'Chandra-Mangala', 'Amala', 'Budha-Aditya', 'Vesi', 'Vosi', 'Ubhayachari', 'Parivartana', 'Harsha', 'Sarala', 'Vimala', 'Rajju', 'Musala',
      'Nala', 'Shringataka', 'Vihaga', 'Vallaki', 'Dama', 'Pasha', 'Kedara', 'Shula', 'Yuga', 'Gola']) {
      expect(yogaNameHi(`${name} Yoga`), name).not.toMatch(/[A-Za-z]/);
    }
  });

  it('refuses a yoga name it cannot put in Hindi instead of printing English', () => {
    expect(() => yogaNameHi('Some New Yoga')).toThrow('HINDI_YOGA_NAME_MISSING');
    expect(() => yogaNameHi('Raja Yoga (something unforeseen)')).toThrow('HINDI_YOGA_NAME_MISSING');
  });
});

describe('Baby Name in Hindi, end to end offline', () => {
  it('passes PDF QA and never sends the candidate names or the child\'s name to the model', async () => {
    const prompts: string[] = [];
    class RecordingProvider extends OfflineTestProvider {
      async generate(prompt: string, options?: AiGenerationOptions) {
        prompts.push(prompt);
        return super.generate(prompt, options);
      }
    }
    const narrator = new LlmNarrator(new RecordingProvider(), new InMemoryTopicCacheStore(), { ...DEFAULT_NARRATOR_CONFIG, model: 'offline-test' });
    const { manifest, pdf, tex } = await generateReport({ definitionId: 'baby-name', subject: SUBJECT, narrator, asOf: AS_OF, language: 'hi' });
    expect(manifest.status).toBe('completed');
    expect(pdf).toBeDefined();
    expect(manifest.pdf?.qaPassed).toBe(true);
    expect(prompts.length).toBeGreaterThan(0);
    for (const prompt of prompts) {
      expect(prompt).toContain('LANGUAGE: Write lead, paragraphs, bullets and takeaway in natural, warm Hindi');
      expect(prompt).not.toMatch(/Bhavya|Riya|Aarav|Mehta/);
    }
    // The names appear only in the deterministic tables, as the family wrote them.
    expect(tex).toContain('Bhavya Mehta');
    expect(tex).toContain('शिशु नामकरण रिपोर्ट');
  }, 300000);
});

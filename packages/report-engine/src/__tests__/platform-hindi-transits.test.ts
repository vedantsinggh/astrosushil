/**
 * Hindi editions of the planet-transit family (Saturn, Jupiter Transit, Rahu–Ketu Transit):
 * complete editions, blocks labelled in Hindi with the same numbers, dates and evidence ids
 * as English, English output untouched, and no fear language in the Hindi educational text.
 * No network, no LLM.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import '../platform/index';
import { EvidenceRegistry } from '../platform/evidence/evidence-registry';
import { ReportModule } from '../platform/module';
import { ReportRegistry } from '../platform/registry';
import { BlockContext, BlockOutput } from '../platform/render/blocks';
import { formatDate } from '../platform/render/latex';
import { JUPITER_TRANSIT_MODULE } from '../platform/reports/jupiter-transit';
import { BRIHASPATI_LEGEND_HI, JUPITER_HOUSES_HI, JUPITER_MANTRA_HI } from '../platform/reports/jupiter-transit/jupiter.hindi';
import { RAHU_KETU_TRANSIT_MODULE } from '../platform/reports/rahu-ketu-transit';
import { KETU_VERSE_HI, NODES_HOUSES_HI, NODES_LEGEND_HI, NODES_MANTRA_HI, NODES_MOTION_HI } from '../platform/reports/rahu-ketu-transit/rahu-ketu.hindi';
import { SATURN_MODULE } from '../platform/reports/saturn';
import { KANTAK_EXPLAINED_HI, SADE_SATI_EXPLAINED_HI, SATURN_KARMA_HI, SATURN_MANTRA_HI, SHANI_LEGENDS_HI } from '../platform/reports/saturn/saturn.hindi';
import {
  dateL,
  ord,
  REMEDY_PRINCIPLES,
  REMEDY_PRINCIPLES_HI,
  retroL,
  retroText,
  sharedTopicsHindi,
  spanL,
  spanText,
  StaticContent,
  staticBlock,
  tl,
} from '../platform/reports/_planet-transit-shared';
import { buildChartSnapshot, ChartSnapshot, SubjectInput } from '../platform/snapshot/chart-snapshot';
import { validateEditorial } from '../platform/validation/editorial-validator';

const DEVANAGARI = /[ऀ-ॿ]/;
const AS_OF = new Date('2026-11-18T00:00:00Z');
// Two natives so both branches of most blocks are exercised (Sade Sati active / not active, retrograde re-entries).
const SUBJECTS: SubjectInput[] = [
  { name: 'Aaa Bbb', gender: 'female', dateOfBirth: '1994-03-17', timeOfBirth: '06:42', placeName: 'Jaipur', latitude: 26.9124, longitude: 75.7873, timezone: 'Asia/Kolkata' },
  { name: 'Ccc Ddd', gender: 'male', dateOfBirth: '1971-08-29', timeOfBirth: '21:10', placeName: 'Pune', latitude: 18.5204, longitude: 73.8567, timezone: 'Asia/Kolkata' },
];
const MODULES: Array<[string, ReportModule]> = [
  ['saturn', SATURN_MODULE],
  ['jupiter-transit', JUPITER_TRANSIT_MODULE],
  ['rahu-ketu-transit', RAHU_KETU_TRANSIT_MODULE],
];

/** English words a Hindi block must not print (planets, signs, months and the fixed vocabulary of these blocks). */
const ENGLISH = new RegExp(
  '\\b(' +
    [
      'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu', 'Ascendant', 'Lagna', 'Asc',
      'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Sept', 'Oct', 'Nov', 'Dec',
      'house', 'House', 'sign', 'Sign', 'nakshatra', 'pada', 'lord', 'transit', 'Transit', 'Transiting', 'TRANSITING', 'retrograde', 'Retrograde', 'direct',
      'from', 'From', 'to', 'the', 'and', 'of', 'none', 'Yes', 'No', 'Name', 'Factor', 'Status', 'Dates', 'Age', 'Ages', 'Aspect', 'Total', 'BAV', 'SAV',
      'Cycle', 'Phase', 'Rising', 'Peak', 'Setting', 'Kantaka', 'Dhaiya', 'KANTAKA', 'DHAIYA', 'SADE', 'SATI', 'ROUND', 'AGES', 'today', 'years', 'bindus',
      'Active', 'Upcoming', 'supportive', 'balanced', 'Node', 'Method', 'Please', 'UTC', 'BPHS', 'TransitIngressSolver',
    ].join('|') +
    ')\\b'
);

/** Every number a block prints, in order of size; the table column widths (layout, not content) are left out. */
const numbers = (tex: string): string[] =>
  (tex.replace(/\\begin\{tabularx\}.*$/gm, '').match(/\d+(?:\.\d+)?/g) ?? []).sort();

interface Built { ctx: BlockContext; snapshot: ChartSnapshot }
const built: Record<string, Built[]> = {};

beforeAll(async () => {
  const snapshots = await Promise.all(SUBJECTS.map((s) => buildChartSnapshot(s, { asOf: AS_OF, vargas: ['D1'], transitYears: 3 })));
  for (const [id, m] of MODULES) {
    built[id] = [];
    for (const snapshot of snapshots) {
      const ext = await m.extend!({ snapshot });
      const registry = new EvidenceRegistry(snapshot, { contributors: [(add, reg) => m.evidence!(add, { snapshot, ext, registry: reg })] });
      built[id].push({ snapshot, ctx: { snapshot, registry, ext } });
    }
  }
}, 240000);

describe('Hindi editions of the planet-transit reports', () => {
  it.each(MODULES)('%s: keeps structure, evidence and objectives, and gives every title, subtitle and intro in Hindi', (id) => {
    const en = ReportRegistry.get(id);
    const hi = ReportRegistry.get(id, 'hi');
    expect(ReportRegistry.languages(id)).toEqual(['en', 'hi']);
    expect(hi.language).toBe('hi');
    for (const text of [hi.title, hi.subtitle, hi.description]) expect(text).toMatch(DEVANAGARI);
    expect(hi.sections.map((s) => s.id)).toEqual(en.sections.map((s) => s.id));
    hi.sections.forEach((s, i) => {
      expect(s.title, s.id).toMatch(DEVANAGARI);
      expect(s.title, s.id).not.toMatch(/[A-Za-z]/);
      expect(s.kicker, s.id).toMatch(DEVANAGARI);
      expect(Boolean(s.intro), s.id).toBe(Boolean(en.sections[i].intro));
      if (s.intro) expect(s.intro, s.id).not.toBe(en.sections[i].intro);
    });
    const enTopics = en.sections.flatMap((s) => s.topics);
    const hiTopics = hi.sections.flatMap((s) => s.topics);
    const facts = (t: (typeof enTopics)[number]) => [t.id, t.kind, t.objective, t.requiredEvidence, t.optionalEvidence, t.block, t.depth];
    expect(hiTopics.map(facts)).toEqual(enTopics.map(facts));
    hiTopics.forEach((t, i) => {
      expect(t.title, t.id).toMatch(DEVANAGARI);
      expect(t.title, t.id).not.toMatch(/[A-Za-z]/);
      expect(Boolean(t.subtitle), t.id).toBe(Boolean(enTopics[i].subtitle));
      if (t.subtitle) expect(t.subtitle, t.id).not.toMatch(/[A-Za-z]/);
    });
  });

  it('refuses a shared-topic title for an id the shared builders do not produce', () => {
    expect(sharedTopicsHindi('saturn', { 'saturn-house': 'शनि' })['saturn-house'].title).toBe('शनि');
    expect(() => sharedTopicsHindi('saturn', { 'saturn-unknown': 'शनि' })).toThrow('HINDI_SHARED_TOPIC_UNKNOWN');
    expect(sharedTopicsHindi('jupiter')['jupiter-a-retro'].subtitle).toMatch(DEVANAGARI);
  });
});

describe('Hindi dates, ordinals and spans', () => {
  it('prints the same day, month and year as English, with the month named in Hindi', () => {
    expect(dateL('en', '2004-06-08')).toBe(formatDate('2004-06-08'));
    expect(dateL('hi', '2004-06-08')).toBe('08 जून 2004');
    expect(dateL('hi', '2027-10-20T18:30:00.000Z')).toBe('20 अक्टूबर 2027');
    expect(dateL('hi', '2025-12-31T23:59:59.000Z')).toBe('31 दिसंबर 2025');
    expect(dateL('hi', '2026-01-01T00:00:00.000Z')).toBe('01 जनवरी 2026');
  });

  it('keeps the number of an ordinal as a digit', () => {
    expect(Array.from({ length: 12 }, (_, i) => ord('hi', i + 1))).toEqual(['1ला', '2रा', '3रा', '4था', '5वाँ', '6ठा', '7वाँ', '8वाँ', '9वाँ', '10वाँ', '11वाँ', '12वाँ']);
    expect(ord('en', 12)).toBe('12th');
  });

  it('words a span and a retrograde window in Hindi and leaves the English (evidence) wording alone', () => {
    const span = { signIndex: 12, sign: 'Pisces', startIso: '2027-10-20T00:00:00.000Z', endIso: '2028-02-23T00:00:00.000Z', enteredRetrograde: true, startClipped: false, endClipped: false };
    expect(spanL('en', span)).toBe(spanText(span));
    expect(spanL('hi', span)).toBe('20 अक्टूबर 2027 से 23 फ़रवरी 2028 तक (वक्री होकर पुनः प्रवेश)');
    expect(spanL('hi', { ...span, enteredRetrograde: false, startClipped: true, endClipped: true })).toBe('20 अक्टूबर 2027 के पहले से 23 फ़रवरी 2028 के बाद तक');
    const window = { startIso: '2027-08-09T00:00:00.000Z', endIso: '2027-12-24T00:00:00.000Z', startSign: 'Aries', endSign: 'Pisces' };
    expect(retroL('en', window)).toBe(retroText(window));
    expect(retroL('hi', window)).toBe('वक्री 09 अगस्त 2027 से 24 दिसंबर 2027 तक (मेष में वक्री, मीन में मार्गी)');
    expect(retroL('hi', { endIso: '2027-12-24T00:00:00.000Z' })).toBe('वक्री (पहले से वक्री) 24 दिसंबर 2027 तक');
  });

  it('refuses an untranslated label instead of printing English in a Hindi report', () => {
    expect(tl('en', 'Some new heading')).toBe('Some new heading');
    expect(() => tl('hi', 'Some new heading')).toThrow('HINDI_LABEL_MISSING');
  });
});

describe('Hindi blocks of the planet-transit reports', () => {
  const each = (fn: (id: string, blockId: string, en: BlockOutput, hi: BlockOutput, plain: BlockOutput) => void) => {
    for (const [id, m] of MODULES) {
      for (const { ctx } of built[id]) {
        for (const [blockId, block] of Object.entries(m.blocks ?? {})) {
          fn(id, blockId, block({ ...ctx, lang: 'en' }), block({ ...ctx, lang: 'hi' }), block(ctx));
        }
      }
    }
  };

  it('English output is the same whether the language is absent or English', () => {
    each((id, blockId, en, _hi, plain) => expect(en, `${id}/${blockId}`).toEqual(plain));
  });

  it('every block shows the same evidence ids in Hindi as in English', () => {
    each((id, blockId, en, hi) => expect(hi.evidenceIds, `${id}/${blockId}`).toEqual(en.evidenceIds));
  });

  it('every block is labelled in Hindi with no English words, in its table and in its method note', () => {
    each((id, blockId, _en, hi) => {
      expect(hi.tex, `${id}/${blockId}`).toMatch(DEVANAGARI);
      expect(hi.tex, `${id}/${blockId}`).not.toMatch(ENGLISH);
      expect(hi.method, `${id}/${blockId}`).toMatch(DEVANAGARI);
      expect(hi.method, `${id}/${blockId}`).not.toMatch(ENGLISH);
    });
  });

  it('every calculated block prints exactly the same numbers and dates in Hindi as in English', () => {
    each((id, blockId, en, hi) => {
      if (en.evidenceIds.length === 0) return; // educational text: wording, not calculated values
      expect(numbers(hi.tex), `${id}/${blockId}`).toEqual(numbers(en.tex));
      expect(numbers(hi.method ?? ''), `${id}/${blockId} method`).toEqual(numbers(en.method ?? ''));
    });
  });

  it('names the months of the Saturn timeline tables in Hindi and keeps their day and year', () => {
    const { ctx } = built.saturn[0];
    const en = SATURN_MODULE.blocks!['saturn-sadesati-cycles'](ctx).tex;
    const hi = SATURN_MODULE.blocks!['saturn-sadesati-cycles']({ ...ctx, lang: 'hi' }).tex;
    const dayYear = (s: string) => [...s.matchAll(/(\d{2}) \S+ (\d{4})/g)].map((m) => `${m[1]}-${m[2]}`);
    expect(dayYear(en).length).toBeGreaterThan(10);
    expect(dayYear(hi)).toEqual(dayYear(en));
    expect(hi).toMatch(/\d{2} (जनवरी|फ़रवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|अक्टूबर|नवंबर|दिसंबर) \d{4}/);
    const timeline = SATURN_MODULE.blocks!['saturn-lifetime-timeline']({ ...ctx, lang: 'hi' }).tex;
    for (const caption of ['आज', 'आयु (वर्ष)', 'चक्र 1', 'कंटक', 'ढैया']) expect(timeline).toContain(caption);
  });

  it('refuses to print English educational text in a Hindi report', () => {
    const { ctx } = built.saturn[0];
    expect(() => staticBlock(REMEDY_PRINCIPLES)({ ...ctx, lang: 'hi' })).toThrow('HINDI_STATIC_MISSING');
    expect(staticBlock(REMEDY_PRINCIPLES, REMEDY_PRINCIPLES_HI)({ ...ctx, lang: 'hi' }).tex).toMatch(DEVANAGARI);
    expect(staticBlock(REMEDY_PRINCIPLES)(ctx).tex).toContain('a remedy is a change in how you live');
  });
});

describe('Hindi educational text of the planet-transit reports', () => {
  const TEXTS: Array<[string, StaticContent]> = [
    ['remedy principles', REMEDY_PRINCIPLES_HI],
    ['shani legends', SHANI_LEGENDS_HI], ['saturn karma', SATURN_KARMA_HI], ['sade sati explained', SADE_SATI_EXPLAINED_HI],
    ['kantak explained', KANTAK_EXPLAINED_HI], ['saturn mantra', SATURN_MANTRA_HI],
    ['brihaspati legend', BRIHASPATI_LEGEND_HI], ['jupiter houses', JUPITER_HOUSES_HI], ['jupiter mantra', JUPITER_MANTRA_HI],
    ['nodes legend', NODES_LEGEND_HI], ['ketu verse', KETU_VERSE_HI], ['nodes houses', NODES_HOUSES_HI], ['nodes motion', NODES_MOTION_HI], ['nodes mantra', NODES_MANTRA_HI],
  ];

  it.each(TEXTS)('%s is written in Devanagari without Roman-script words', (_name, c) => {
    const all = [...c.paragraphs, ...(c.bullets ?? []).flat(), c.note ?? '', c.verse?.meaning ?? '', c.verse?.source ?? ''].filter(Boolean);
    for (const text of all) {
      expect(text).toMatch(DEVANAGARI);
      expect(text).not.toMatch(/[A-Za-z]/);
    }
    if (c.verse) expect(c.verse.transliteration).toBe('');
  });

  it.each(TEXTS)('%s never frames Sade Sati, Saturn or the nodes as fearful, a dosha or a curse', (_name, c) => {
    const texts = [...c.paragraphs, ...(c.bullets ?? []).map(([lead, text]) => `${lead} ${text}`), c.note ?? ''].filter(Boolean);
    for (const text of texts) {
      const codes = validateEditorial({ topicId: 't', lead: text, paragraphs: [], bullets: [], takeaway: undefined, claims: [] }, { language: 'hi' })
        .filter((i) => ['FEAR_LANGUAGE', 'DOSHA_AS_AFFLICTION', 'GUARANTEE', 'REMEDY_SALES', 'FINANCIAL_CERTAINTY'].includes(i.code))
        .map((i) => i.code);
      expect(codes, text.slice(0, 60)).toEqual([]);
    }
  });

  it('keeps the same shape as the English text (paragraphs, bullets, note, verse lines)', () => {
    const { ctx } = built.saturn[0];
    for (const [id, m] of MODULES) {
      for (const [blockId, block] of Object.entries(m.blocks ?? {})) {
        const en = block(built[id][0].ctx);
        if (en.evidenceIds.length || !en.method?.startsWith('Educational text')) continue;
        const hi = block({ ...built[id][0].ctx, lang: 'hi' });
        const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;
        expect(count(hi.tex, /\\par\}/g) - count(hi.tex, /\\itshape/g), `${id}/${blockId}`).toBe(count(en.tex, /\\par\}/g) - count(en.tex, /\\itshape/g));
        expect(count(hi.tex, /\\item /g), `${id}/${blockId}`).toBe(count(en.tex, /\\item /g));
        expect(count(hi.tex, /asCaution/g), `${id}/${blockId}`).toBe(count(en.tex, /asCaution/g));
      }
    }
    expect(ctx.lang).toBeUndefined();
  });
});

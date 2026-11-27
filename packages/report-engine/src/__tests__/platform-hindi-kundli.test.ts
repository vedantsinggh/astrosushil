/**
 * Hindi edition of the Premium Personalised Kundli (docs/integration/hindi-reports-design.md):
 * the edition is complete, every Kundli block labels itself in Hindi with the same numbers and
 * evidence ids as English, the vocabulary covers every value the engine can produce, and an
 * offline Hindi run passes PDF QA.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import {
  AMANTA_MASAS, GHAT_CHAKRA_TABLE, NAKSHATRA_NAMAKSHARAS, NAKSHATRA_YONIS, NAKSHATRAS, REPEATING_KARANAS, TITHI_NAMES, YOGA_NAMES,
} from '@astro/astrology-engine';
import '../platform/index';
import { EvidenceRegistry } from '../platform/evidence/evidence-registry';
import { DEFAULT_NARRATOR_CONFIG, LlmNarrator } from '../platform/llm/narrator';
import { OfflineTestProvider } from '../platform/llm/offline-test-provider';
import { InMemoryTopicCacheStore } from '../platform/llm/topic-cache';
import { generateReport } from '../platform/orchestrator';
import { ReportRegistry, validateModule } from '../platform/registry';
import { BlockContext, BlockOutput } from '../platform/render/blocks';
import { KUNDLI_BLOCKS, KUNDLI_MODULE } from '../platform/reports/kundli';
import {
  avakahadaIn, bracketed, dateIn, dateTimeIn, karanaIn, kl, listIn, mangalExceptionIn, masaIn, namaksharaIn, nityaYogaIn, ordHi, sanskritSignIn,
  tithiGroupIn, tithiIn, weekdayIn, yogaFamilyIn, yogaNameIn,
} from '../platform/reports/kundli/kundli.hindi';
import { buildChartSnapshot, SubjectInput } from '../platform/snapshot/chart-snapshot';

const AS_OF = new Date('2026-11-18T00:00:00Z');
// Synthetic subjects only.
const PUNE: SubjectInput = { name: 'Synthetic Native One', gender: 'male', dateOfBirth: '1991-03-14', timeOfBirth: '05:20', placeName: 'Pune', latitude: 18.5204, longitude: 73.8567, timezone: 'Asia/Kolkata' };
const TORONTO: SubjectInput = { name: 'Synthetic Native Two', gender: 'female', dateOfBirth: '1978-09-02', timeOfBirth: '22:40', placeName: 'Toronto', latitude: 43.6532, longitude: -79.3832, timezone: 'America/Toronto' };

const DEVANAGARI = /[ऀ-ॿ]/;
/** Blocks registered by the Kundli module but owned by render/blocks.ts (covered by that file's own tests). */
const NOT_KUNDLI_OWNED = ['kundli-marriage-windows'];
const OWNED = Object.keys(KUNDLI_BLOCKS).filter((id) => !NOT_KUNDLI_OWNED.includes(id));

async function build(subject: SubjectInput): Promise<BlockContext> {
  const def = validateModule(KUNDLI_MODULE);
  const snapshot = await buildChartSnapshot(subject, { asOf: AS_OF, vargas: def.requires.vargas, transitYears: def.requires.transitYears });
  const ext = await KUNDLI_MODULE.extend!({ snapshot });
  const registry = new EvidenceRegistry(snapshot, {
    contributors: [(add, reg) => KUNDLI_MODULE.evidence!(add, { snapshot, ext, registry: reg })],
  });
  return { snapshot, registry, ext };
}

/** What a reader sees of a block: LaTeX commands, environments, column specs, lengths and colour names removed. */
function visible(texSource: string): string {
  return texSource
    .replace(/\\(?:begin|end)\{[A-Za-z*]+\}/g, ' ')
    .replace(/\\[A-Za-z@]+\*?/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\{[^{}]*(?:linewidth|pt|mm)[^{}]*\}/g, ' ')
    .replace(/\b(?:Primary|Accent|Muted|Surface|Ink|Rule|Tint|white|rectangle|at)\b/g, ' ');
}

/** Latin words a Hindi reader would see, apart from chart codes (D1, D9, D-005), UTC and the client's own details. */
function latinWords(text: string, subject: SubjectInput): string[] {
  const own = new Set(`${subject.name} ${subject.placeName} ${subject.timezone}`.split(/[\s/]+/));
  return (text.match(/[A-Za-z][A-Za-z'-]*/g) ?? []).filter((w) => !own.has(w) && !/^(D-?|UTC-?|[Xclrp]+)$/.test(w));
}

const digits = (s: string | undefined) => (s ?? '').match(/\d+/g) ?? [];

let subjects: Array<{ subject: SubjectInput; ctx: BlockContext }>;
beforeAll(async () => {
  subjects = [{ subject: PUNE, ctx: await build(PUNE) }, { subject: TORONTO, ctx: await build(TORONTO) }];
}, 120000);

describe('Kundli Hindi edition', () => {
  it('has Hindi text for the report, every section and every topic, and keeps structure, evidence and objectives', () => {
    const en = ReportRegistry.get('kundli');
    const hi = ReportRegistry.get('kundli', 'hi');
    expect(ReportRegistry.languages('kundli')).toEqual(['en', 'hi']);
    expect(hi.language).toBe('hi');
    for (const text of [hi.title, hi.subtitle, hi.description]) {
      expect(text).toMatch(DEVANAGARI);
      expect(text).not.toMatch(/[A-Za-z]/);
    }
    expect(hi.sections.map((s) => s.id)).toEqual(en.sections.map((s) => s.id));
    hi.sections.forEach((s, i) => {
      expect(s.title, s.id).toMatch(DEVANAGARI);
      expect(s.kicker, s.id).toMatch(DEVANAGARI);
      expect(`${s.title} ${s.kicker} ${s.intro ?? ''}`, s.id).not.toMatch(/[A-Za-z]/);
      expect(Boolean(s.intro), s.id).toBe(Boolean(en.sections[i].intro));
    });
    const enTopics = en.sections.flatMap((s) => s.topics);
    const hiTopics = hi.sections.flatMap((s) => s.topics);
    expect(hiTopics).toHaveLength(82);
    expect(hiTopics.map((t) => [t.id, t.kind, t.objective, t.requiredEvidence, t.optionalEvidence, t.block, t.depth, t.dependsOn]))
      .toEqual(enTopics.map((t) => [t.id, t.kind, t.objective, t.requiredEvidence, t.optionalEvidence, t.block, t.depth, t.dependsOn]));
    hiTopics.forEach((t, i) => {
      expect(t.title, t.id).toMatch(DEVANAGARI);
      expect(`${t.title} ${t.subtitle ?? ''}`.replace(/\bD\d+\b/g, ''), t.id).not.toMatch(/[A-Za-z]/);
      expect(Boolean(t.subtitle), t.id).toBe(Boolean(enTopics[i].subtitle));
    });
    expect(new Set(hiTopics.map((t) => t.title)).size).toBe(hiTopics.length);
  });

  it('leaves the English definition untouched', () => {
    const en = ReportRegistry.get('kundli');
    expect(en.language).toBe('en');
    expect(en.title).toBe('Premium Personalised Kundli Report');
    expect(en.sections[0].topics[0].title).toBe('Birth Details and Astronomical Data');
  });
});

describe('Kundli blocks in Hindi', () => {
  it('covers every block the Kundli module owns', () => {
    expect(OWNED).toHaveLength(34);
  });

  it('shows the same evidence ids as English for every block', () => {
    for (const { ctx } of subjects) {
      for (const id of OWNED) {
        const en = KUNDLI_BLOCKS[id](ctx);
        const hi = KUNDLI_BLOCKS[id]({ ...ctx, lang: 'hi' });
        expect(hi.evidenceIds, id).toEqual(en.evidenceIds);
      }
    }
  });

  it('prints the same numbers as English, in the same order, in every table and method note', () => {
    for (const { ctx } of subjects) {
      for (const id of OWNED) {
        const en = KUNDLI_BLOCKS[id](ctx);
        const hi = KUNDLI_BLOCKS[id]({ ...ctx, lang: 'hi' });
        expect(digits(hi.method), `${id} method`).toEqual(digits(en.method));
        // The yoga table lists the forming planets in Hindi where English quotes the engine's condition sentences.
        if (id !== 'kundli-yoga-table') expect(digits(hi.tex), `${id} tex`).toEqual(digits(en.tex));
      }
    }
  });

  it('leaves no English word in any Hindi block or method note', () => {
    for (const { subject, ctx } of subjects) {
      for (const id of OWNED) {
        const hi = KUNDLI_BLOCKS[id]({ ...ctx, lang: 'hi' });
        expect(latinWords(visible(hi.tex), subject), `${id} tex`).toEqual([]);
        expect(latinWords(hi.method ?? '', subject), `${id} method`).toEqual([]);
        expect(hi.method, id).toMatch(DEVANAGARI);
        expect(hi.tex, id).toMatch(DEVANAGARI);
        expect(hi.tex, id).not.toMatch(/[क़-य़]/); // precomposed nukta letters break the Devanagari font switch
      }
    }
  });

  it('is deterministic and does not change the English output when the language is given explicitly', () => {
    const { ctx } = subjects[0];
    for (const id of OWNED) {
      expect(KUNDLI_BLOCKS[id]({ ...ctx, lang: 'en' }), id).toEqual(KUNDLI_BLOCKS[id](ctx));
      expect(KUNDLI_BLOCKS[id]({ ...ctx, lang: 'hi' }), id).toEqual(KUNDLI_BLOCKS[id]({ ...ctx, lang: 'hi' }));
    }
  });

  it('keeps the rows of the yoga table and names every detected yoga in Hindi', () => {
    for (const { ctx } of subjects) {
      const rows = (o: BlockOutput) => (o.tex.match(/\\\\$/gm) ?? []).length;
      const en = KUNDLI_BLOCKS['kundli-yoga-table'](ctx);
      const hi = KUNDLI_BLOCKS['kundli-yoga-table']({ ...ctx, lang: 'hi' });
      expect(rows(hi)).toBe(rows(en));
      for (const y of ctx.snapshot.yogas.filter((x) => x.isDetected)) expect(hi.tex).toContain(yogaNameIn('hi', y.canonicalName));
    }
  });

  it('writes the Mahadasha card as a Hindi sentence with the same house numbers', () => {
    const { ctx } = subjects[0];
    const hi = KUNDLI_BLOCKS['kundli-md-glance-1']({ ...ctx, lang: 'hi' });
    expect(hi.tex).toMatch(/महादशा/);
    expect(hi.tex).toMatch(/\d+(?:ले|रे|थे|ठे|वें) भाव में/);
    expect(hi.tex).toMatch(/पूर्ण हो चुकी|अभी चल रही है|आगे आने वाली/);
  });
});

describe('Kundli Hindi vocabulary', () => {
  it('covers every panchang value the engine can produce', () => {
    for (const t of [...TITHI_NAMES, 'Amavasya']) expect(tithiIn('hi', t), t).toMatch(DEVANAGARI);
    expect(YOGA_NAMES).toHaveLength(27);
    for (const y of YOGA_NAMES) expect(nityaYogaIn('hi', y), y).toMatch(DEVANAGARI);
    for (const k of [...REPEATING_KARANAS, 'Kimstughna', 'Shakuni', 'Chatushpada', 'Naga']) expect(karanaIn('hi', k), k).toMatch(DEVANAGARI);
    for (const m of Object.values(AMANTA_MASAS)) expect(masaIn('hi', m), m).toMatch(DEVANAGARI);
    for (const d of ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']) expect(weekdayIn('hi', d)).toMatch(/वार$/);
    expect(masaIn('hi', 'Magha')).toBe('माघ'); // the month, not the nakshatra मघा
  });

  it('covers every Avakahada and Ghatak value the engine can produce', () => {
    for (const y of Object.values(NAKSHATRA_YONIS)) expect(avakahadaIn('hi', y.yoni), y.yoni).toMatch(DEVANAGARI);
    for (const v of ['Brahmin', 'Kshatriya', 'Vaishya', 'Shudra', 'Chatushpada', 'Manava', 'Jalachara', 'Vanachara', 'Keeta', 'male', 'female',
      'Deva', 'Manushya', 'Rakshasa', 'Adi', 'Madhya', 'Antya', 'Agni', 'Prithvi', 'Vayu', 'Jala', 'Swarna (Gold)', 'Rajata (Silver)',
      'Tamra (Copper)', 'Loha (Iron)', 'Purva', 'Uttara', 'Bhoomi', 'Varun']) expect(avakahadaIn('hi', v), v).toMatch(DEVANAGARI);
    for (const n of NAKSHATRAS) {
      for (let pada = 1; pada <= 4; pada++) {
        expect(namaksharaIn('hi', NAKSHATRA_NAMAKSHARAS[n.index][pada - 1], n.name, pada), `${n.name} ${pada}`).toMatch(DEVANAGARI);
      }
    }
    for (const g of Object.values(GHAT_CHAKRA_TABLE)) {
      expect(masaIn('hi', g.masa)).toMatch(DEVANAGARI);
      expect(tithiGroupIn('hi', g.tithi)).not.toMatch(/[A-Za-z]/);
      expect(digits(tithiGroupIn('hi', g.tithi))).toEqual(digits(g.tithi));
      expect(weekdayIn('hi', bracketed(g.vara))).toMatch(/वार$/);
      expect(sanskritSignIn('hi', g.lagna.split(' ')[0])).toMatch(DEVANAGARI);
    }
  });

  it('names engine yogas in Hindi, including their bracketed detail, and refuses an unknown one', () => {
    expect(yogaNameIn('hi', 'Gajakesari Yoga')).toBe('गजकेसरी योग');
    expect(yogaNameIn('hi', 'Adhi Yoga (Chandradhi)')).toBe('अधि योग (चंद्राधि)');
    expect(yogaNameIn('hi', 'Shakata Yoga (Nabhasa)')).toBe('शकट योग (नाभस)');
    expect(yogaNameIn('hi', 'Raja Yoga (Lagna Lord + 9th Lord)')).toBe('राज योग (लग्नेश + भावेश 9)');
    expect(yogaNameIn('hi', 'Raja Yoga (Yogakaraka SATURN: 4th Lord + 5th Lord)')).toBe('राज योग (योगकारक शनि: भावेश 4 + भावेश 5)');
    expect(yogaNameIn('hi', 'Dhana Yoga (5th Lord (Lakshmi Sthana) + 9th Lord (Bhagya))')).toBe('धन योग (भावेश 5 (लक्ष्मी स्थान) + भावेश 9 (भाग्य))');
    expect(yogaNameIn('hi', 'Maha Parivartana Yoga (JUPITER-MOON)')).toBe('महा परिवर्तन योग (गुरु-चंद्र)');
    expect(yogaNameIn('hi', 'Neecha Bhanga Raja Yoga (MARS)')).toBe('नीच भंग राज योग (मंगल)');
    expect(yogaNameIn('en', 'Neecha Bhanga Raja Yoga (MARS)')).toBe('Neecha Bhanga Raja Yoga (MARS)');
    expect(() => yogaNameIn('hi', 'Unheard Yoga')).toThrow('HINDI_YOGA_NAME_MISSING');
    expect(() => yogaNameIn('hi', 'Raja Yoga (Something Else)')).toThrow('HINDI_YOGA_NAME_MISSING');
    for (const c of ['MAHAPURUSHA', 'RAJA', 'DHANA', 'CHANDRA', 'SURYA', 'NEECHA_BHANGA', 'PARIVARTANA', 'VIPARITA', 'NABHASA', 'AUSPICIOUS', 'INAUSPICIOUS', 'MISCELLANEOUS']) {
      expect(yogaFamilyIn('hi', c), c).toMatch(DEVANAGARI);
    }
  });

  it('translates the engine\'s Mangal exception sentences and keeps their numbers', () => {
    for (const s of ['Mars in own sign (Aries) in 1st house', 'Mars in own sign (Scorpio) in 4th/8th house', 'Mars in exalted sign (Capricorn) in 7th/8th house',
      'Mars in friendly sign (Leo) in 8th house', 'Mars in friendly sign (Sagittarius) in 12th house', 'Jupiter conjoined with Mars in the same house',
      'Benefic Jupiter aspects Mars (5th/7th/9th drishti)']) {
      expect(mangalExceptionIn('hi', s), s).not.toMatch(/[A-Za-z]/);
      expect(digits(mangalExceptionIn('hi', s)), s).toEqual(digits(s));
    }
    expect(() => mangalExceptionIn('hi', 'A new engine exception')).toThrow('HINDI_MANGAL_EXCEPTION_MISSING');
  });

  it('refuses an untranslated label, and writes ordinals, lists and dates in Hindi with the digits kept', () => {
    expect(() => kl('hi', 'Some new heading')).toThrow('HINDI_LABEL_MISSING');
    expect(kl('en', 'Some new heading')).toBe('Some new heading');
    expect(kl('hi', 'Planet')).toBe('ग्रह'); // shared glossary
    expect([1, 2, 3, 4, 5, 6, 7, 12].map((n) => ordHi(n, 'obl'))).toEqual(['1ले', '2रे', '3रे', '4थे', '5वें', '6ठे', '7वें', '12वें']);
    expect(ordHi(4, 'm')).toBe('4था');
    expect(ordHi(9, 'f')).toBe('9वीं');
    expect(listIn('hi', ['सूर्य', 'चंद्र', 'मंगल'])).toBe('सूर्य, चंद्र और मंगल');
    expect(listIn('en', ['Sun', 'Moon', 'Mars'])).toBe('Sun, Moon and Mars');
    expect(dateIn('hi', '2004-06-08')).toBe('08 जून 2004');
    expect(dateIn('en', '2004-06-08')).toBe('08 Jun 2004');
    for (let m = 1; m <= 12; m++) expect(dateIn('hi', `2001-${String(m).padStart(2, '0')}-15`)).toMatch(/^15 [ऀ-ॿ]+ 2001$/);
    expect(dateTimeIn('hi', '1991-09-13T23:50:00Z', 'Asia/Kolkata')).toBe('14 सितंबर 1991, 05:20');
  });
});

describe('Kundli Hindi report end to end', () => {
  it('generates offline in Hindi with PDF QA passing and Hindi headings in the PDF', async () => {
    const narrator = new LlmNarrator(new OfflineTestProvider(), new InMemoryTopicCacheStore(), { ...DEFAULT_NARRATOR_CONFIG, model: 'offline-test' });
    const { manifest, pdf, tex } = await generateReport({ definitionId: 'kundli', subject: PUNE, narrator, asOf: AS_OF, language: 'hi' });
    expect(manifest.status).toBe('completed');
    expect(pdf).toBeDefined();
    expect(manifest.pdf?.qaPassed).toBe(true);
    expect(manifest.topics.filter((t) => t.provenance === 'deterministic')).toHaveLength(37);
    expect(manifest.topics.filter((t) => t.status === 'failed' || t.error)).toEqual([]);
    expect(tex).toContain('प्रीमियम व्यक्तिगत कुंडली');
    expect(tex).toContain('अवकहड़ा चक्र');
    expect(tex).not.toContain('Avakahada Chakra');
  }, 600000);
});

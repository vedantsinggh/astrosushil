/**
 * Hindi editions of the annual reports (Varshphal and the Personalised
 * Horoscope): complete editions, every block labelled in Hindi with the same
 * numbers, dates and evidence ids as English, and English output unchanged
 * when no language is passed. No network, no LLM.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import {
  AMANTA_MASAS, NAKSHATRA_NAMAKSHARAS, NAKSHATRA_YONIS, NAKSHATRAS, REPEATING_KARANAS, TITHI_NAMES, VARA_LORDS, YOGA_NAMES,
} from '@astro/astrology-engine';
import { EvidenceRegistry, PLANETS } from '../platform/evidence/evidence-registry';
import { label } from '../platform/i18n/hindi';
import { ReportModule } from '../platform/module';
import { localizedDefinition, validateModule } from '../platform/registry';
import { BlockContext, kvTable } from '../platform/render/blocks';
import {
  avakahadaValueHi, coloursLabel, deityLabel, gemLabel, hindiDate, hindiDateTime, KARANA_HI, L, mantraLabel, MASA_HI, NAMAKSHARA_HI, ord,
  ordOblique, PANCHANGA_YOGA_HI, TITHI_HI, VARA_HI, weekdayLabel, YONI_HI,
} from '../platform/reports/_annual-shared/annual-shared.hindi';
import { GOCHARA_METHOD, PLANET_ASSOC } from '../platform/reports/_annual-shared/astro';
import { AvakahadaFacts } from '../platform/reports/_annual-shared/avakahada';
import { gocharaChip, kvTableL, localDate, localDateTime, transitRow } from '../platform/reports/_annual-shared/tables';
import { HOROSCOPE_ANNUAL_MODULE } from '../platform/reports/horoscope-annual';
import { HoroscopeYearData } from '../platform/reports/horoscope-annual/calc/horoscope-year';
import { factorText } from '../platform/reports/horoscope-annual/evidence';
import { factorTextHi, windowLabel } from '../platform/reports/horoscope-annual/horoscope-annual.hindi';
import { VARSHPHAL_MODULE } from '../platform/reports/varshphal';
import { varshphalRemedyNote } from '../platform/reports/varshphal/blocks';
import { officeSourceHi, officeTitleHi, sahamFormulaHi, sahamMeaningHi, sahamNameHi, tajikYogaLabel } from '../platform/reports/varshphal/varshphal.hindi';
import { SAHAM_MEANING } from '../platform/reports/varshphal/evidence';
import { buildChartSnapshot, SubjectInput } from '../platform/snapshot/chart-snapshot';

const AS_OF = new Date('2026-11-18T00:00:00Z');
const A: SubjectInput = { name: 'Annual Test A', gender: 'female', dateOfBirth: '1994-03-17', timeOfBirth: '06:42', placeName: 'Jaipur', latitude: 26.9124, longitude: 75.7873, timezone: 'Asia/Kolkata' };
const B: SubjectInput = { name: 'Annual Test B', gender: 'male', dateOfBirth: '1987-12-29', timeOfBirth: '04:30', placeName: 'Pune', latitude: 18.5204, longitude: 73.8567, timezone: 'Asia/Kolkata' };

const DEVANAGARI = /[ऀ-ॿ]/;
/** Every number printed (integers and decimals), sorted: Hindi word order may move a number, never change it. */
const numbers = (s: string) => (s.match(/\d+(?:\.\d+)?/g) ?? []).sort();
/** Latin words left in a block's LaTeX once commands, environments, colours, units and the client's own name and place are removed. */
function latinWords(texSource: string, subject: SubjectInput): string[] {
  const stripped = texSource
    .replace(/\\[A-Za-z]+/g, ' ')
    .split(subject.name).join(' ')
    .split(subject.placeName).join(' ')
    .replace(/\b(Surface|Muted|Primary|tabularx|longtable|minipage|center|asHighlight|asCard|asCaution)\b/g, ' ')
    .replace(/(\d)(pt|mm)\b/g, '$1');
  return stripped.match(/[A-Za-z]{2,}/g) ?? [];
}

async function runModule(module: ReportModule, subject: SubjectInput) {
  const def = validateModule(module);
  const snapshot = await buildChartSnapshot(subject, { asOf: AS_OF, vargas: def.requires.vargas as never, transitYears: def.requires.transitYears });
  const ext = await module.extend!({ snapshot });
  const registry = new EvidenceRegistry(snapshot, { contributors: [(add, reg) => module.evidence!(add, { snapshot, ext, registry: reg })] });
  return { def, snapshot, ext, registry, subject };
}
type Run = Awaited<ReturnType<typeof runModule>>;

function checkHindiBlocks(r: Run, module: ReportModule) {
  const en: BlockContext = { snapshot: r.snapshot, registry: r.registry, ext: r.ext };
  const hi: BlockContext = { ...en, lang: 'hi' };
  const ids = Object.keys(module.blocks ?? {});
  expect(ids.length).toBeGreaterThan(5);
  for (const id of ids) {
    const block = module.blocks![id];
    const e = block(en);
    const h = block(hi);
    expect(block({ ...en, lang: 'en' }), `${id}: explicit English`).toEqual(e);
    expect(h.evidenceIds, `${id}: evidence ids`).toEqual(e.evidenceIds);
    expect(numbers(h.tex), `${id}: numbers`).toEqual(numbers(e.tex));
    expect(h.tex, `${id}: Hindi text`).toMatch(DEVANAGARI);
    expect(latinWords(h.tex, r.subject), `${id}: English left in the table`).toEqual([]);
    expect(h.tex).not.toMatch(/undefined|NaN/);
    expect(Boolean(h.method), `${id}: method note`).toBe(Boolean(e.method));
    if (h.method) {
      expect(h.method, `${id}: method`).toMatch(DEVANAGARI);
      expect(h.method.match(/[A-Za-z]{2,}/g) ?? [], `${id}: English left in the method note`).toEqual([]);
    }
    // LaTeX structure is the same: only the words differ.
    const shape = (s: string) => (s.match(/\\(begin|end)\{[A-Za-z]+\}|\\\\|&/g) ?? []).join('');
    expect(shape(h.tex), `${id}: table shape`).toBe(shape(e.tex));
  }
}

function checkEdition(module: ReportModule) {
  const en = localizedDefinition(module);
  const hi = localizedDefinition(module, 'hi');
  expect(hi.language).toBe('hi');
  for (const text of [hi.title, hi.subtitle, hi.description]) {
    expect(text).toMatch(DEVANAGARI);
    expect(text).not.toMatch(/[A-Za-z]{2,}/);
  }
  expect(hi.sections.map((s) => s.id)).toEqual(en.sections.map((s) => s.id));
  const enTopics = en.sections.flatMap((s) => s.topics);
  const hiTopics = hi.sections.flatMap((s) => s.topics);
  const fixed = (t: (typeof enTopics)[number]) => [t.id, t.kind, t.objective, t.requiredEvidence, t.optionalEvidence, t.block, t.depth, t.dependsOn, t.bonus];
  expect(hiTopics.map(fixed)).toEqual(enTopics.map(fixed));
  for (const s of hi.sections) {
    for (const text of [s.title, s.kicker, s.intro]) {
      if (text === undefined) continue;
      expect(text, s.id).toMatch(DEVANAGARI);
      expect(text, s.id).not.toMatch(/[A-Za-z]{2,}/);
    }
  }
  for (const t of hiTopics) {
    expect(t.title, t.id).toMatch(DEVANAGARI);
    expect(t.title.replace(/\(D1\)/, ''), t.id).not.toMatch(/[A-Za-z]{2,}/);
    if (t.subtitle) expect(t.subtitle, t.id).not.toMatch(/[A-Za-z]{2,}/);
  }
  // The edition names nothing the definition does not have.
  const edition = module.hindi!;
  expect(Object.keys(edition.sections).sort()).toEqual(en.sections.map((s) => s.id).sort());
  expect(Object.keys(edition.topics).sort()).toEqual(enTopics.map((t) => t.id).sort());
  // Writing guidance stays English and keeps the definition's own rules first.
  expect(hi.writingGuidance.slice(0, en.writingGuidance.length)).toEqual(en.writingGuidance);
}

describe('annual shared vocabulary', () => {
  it('leaves English untouched when no language, or English, is passed', () => {
    const iso = '2026-06-08T03:05:00.000Z';
    expect(localDate(iso, 'Asia/Kolkata')).toBe('08 Jun 2026');
    expect(localDate(iso, 'Asia/Kolkata', 'en')).toBe('08 Jun 2026');
    expect(localDateTime(iso, 'Asia/Kolkata')).toBe('08 Jun 2026, 08:35');
    expect(gocharaChip('favourable')).toBe('\\textcolor{Primary}{\\textbf{Supportive}}');
    expect(gocharaChip('demanding')).toBe('\\textcolor{Muted}{Demanding}');
    expect(kvTableL('en', [['a', 'b']])).toBe(kvTable([['a', 'b']]));
    expect(L('en', 'Anything at all')).toBe('Anything at all');
    expect(ord('en', 3)).toBe('3rd');
    expect(varshphalRemedyNote().tex).toContain('A note on practices');
  });

  it('prints dates with Hindi month names and the same day, year and time', () => {
    const iso = '2026-06-08T03:05:00.000Z';
    expect(hindiDate(iso, 'Asia/Kolkata')).toBe('08 जून 2026');
    expect(hindiDateTime(iso, 'Asia/Kolkata')).toBe('08 जून 2026, 08:35');
    expect(localDate(iso, 'Asia/Kolkata', 'hi')).toBe('08 जून 2026');
    // Late evening UTC is the next day in India, in both languages.
    expect(localDate('2026-12-31T20:00:00.000Z', 'Asia/Kolkata')).toBe('01 Jan 2027');
    expect(localDate('2026-12-31T20:00:00.000Z', 'Asia/Kolkata', 'hi')).toBe('01 जनवरी 2027');
    for (let m = 0; m < 12; m++) {
      const d = new Date(Date.UTC(2027, m, 15, 6, 30)).toISOString();
      expect(numbers(localDateTime(d, 'Asia/Kolkata', 'hi'))).toEqual(numbers(localDateTime(d, 'Asia/Kolkata')));
      expect(localDateTime(d, 'Asia/Kolkata', 'hi')).not.toMatch(/[A-Za-z]/);
    }
  });

  it('writes ordinals with the same number', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 12].map((n) => ord('hi', n))).toEqual(['1ला', '2रा', '3रा', '4था', '5वाँ', '6ठा', '7वाँ', '12वाँ']);
    expect([1, 4, 6, 11].map((n) => ordOblique('hi', n))).toEqual(['1ले', '4थे', '6ठे', '11वें']);
  });

  it('refuses an untranslated label rather than printing English', () => {
    expect(() => L('hi', 'A heading nobody translated')).toThrow('HINDI_LABEL_MISSING');
    expect(L('hi', 'Planet')).toBe(label('hi', 'Planet')); // platform glossary is the fallback
    expect(L('hi', GOCHARA_METHOD)).toMatch(DEVANAGARI);
    expect(numbers(L('hi', GOCHARA_METHOD))).toEqual(numbers(GOCHARA_METHOD));
  });

  it('has a Hindi name for every Panchanga and Avakahada value the engine can produce', () => {
    for (const t of [...TITHI_NAMES, 'Amavasya']) expect(TITHI_HI[t], t).toBeTruthy();
    for (const y of YOGA_NAMES) expect(PANCHANGA_YOGA_HI[y], y).toBeTruthy();
    for (const v of VARA_LORDS) expect(VARA_HI[v.name], v.name).toBeTruthy();
    for (const k of [...REPEATING_KARANAS, 'Shakuni', 'Chatushpada', 'Naga', 'Kimstughna']) expect(KARANA_HI[k], k).toBeTruthy();
    for (const m of Object.values(AMANTA_MASAS)) expect(MASA_HI[m], m).toBeTruthy();
    for (const y of Object.values(NAKSHATRA_YONIS)) expect(YONI_HI[y.yoni], y.yoni).toBeTruthy();
    // One Devanagari syllable for each of the engine's 108 name syllables, in the engine's nakshatra order.
    for (const n of NAKSHATRAS) {
      expect(NAMAKSHARA_HI[n.name], n.name).toHaveLength(4);
      expect(NAKSHATRA_NAMAKSHARAS[n.index]).toHaveLength(4);
    }
    expect(Object.keys(NAMAKSHARA_HI)).toHaveLength(27);
  });

  it('names the planetary correspondences in Hindi', () => {
    for (const p of PLANETS) {
      const a = PLANET_ASSOC[p];
      for (const text of [weekdayLabel('hi', a.weekday), coloursLabel('hi', a.colours), gemLabel('hi', a.gem), deityLabel('hi', a.deity), mantraLabel('hi', a.mantra)]) {
        expect(text, p).toMatch(DEVANAGARI);
        expect(text, p).not.toMatch(/[A-Za-z]/);
      }
      expect(coloursLabel('hi', a.colours).split(', ')).toHaveLength(a.colours.split(', ').length);
      expect(coloursLabel('en', a.colours)).toBe(a.colours);
    }
    expect(coloursLabel('hi', '')).toBe('');
  });

  it('names Tajik yogas, Sahams and the five offices in Hindi', () => {
    expect(tajikYogaLabel('en', 'ITHASALA')).toBe('Ithasala');
    for (const t of ['ITHASALA', 'ISARPHA', 'NAKTA', 'YAMAYA', 'KAMBOOLA']) expect(tajikYogaLabel('hi', t)).toMatch(DEVANAGARI);
    for (const name of Object.keys(SAHAM_MEANING)) {
      expect(sahamNameHi(name)).toMatch(DEVANAGARI);
      expect(sahamMeaningHi(name)).toMatch(DEVANAGARI);
    }
    expect(sahamFormulaHi('Asc + Moon - Sun')).toBe('लग्न + चंद्र - सूर्य');
    expect(sahamFormulaHi('Asc + Punya - Jupiter')).toBe('लग्न + पुण्य - गुरु');
    expect(() => sahamFormulaHi('Asc + Pluto - Sun')).toThrow('HINDI_SAHAM_TERM_MISSING');
    expect(officeTitleHi('DINA_RATRI_PATI', true)).not.toBe(officeTitleHi('DINA_RATRI_PATI', false));
    expect(officeSourceHi('VARSHA_LAGNESHA', true, 'Ruler of Annual Ascendant (Scorpio)')).toBe('वर्ष लग्न (वृश्चिक) का स्वामी');
    expect(officeSourceHi('TRIRASHISHA', false, 'Tri-Rashi table ruler for Night return in Leo')).toContain('सिंह');
    expect(() => officeSourceHi('JANMESHA', true, 'Natal Lagna Lord unavailable for untimed birth profile')).toThrow('HINDI_OFFICE_SOURCE_MISSING');
  });
});

describe('Varshphal in Hindi', () => {
  let a: Run;
  let b: Run;
  beforeAll(async () => {
    a = await runModule(VARSHPHAL_MODULE, A);
    b = await runModule(VARSHPHAL_MODULE, B);
  }, 120000);

  it('has a complete Hindi edition with the structure, evidence and objectives of the English one', () => {
    checkEdition(VARSHPHAL_MODULE);
  });

  it('labels every block in Hindi with the same numbers, dates and evidence ids', () => {
    checkHindiBlocks(a, VARSHPHAL_MODULE);
    checkHindiBlocks(b, VARSHPHAL_MODULE);
  });

  it('prints the Tajik terms, month names and weekdays in Hindi', () => {
    const ctx: BlockContext = { snapshot: a.snapshot, registry: a.registry, ext: a.ext, lang: 'hi' };
    const blocks = VARSHPHAL_MODULE.blocks!;
    expect(blocks['varshphal-return'](ctx).tex).toContain('(मुंथा)');
    expect(blocks['varshphal-return'](ctx).tex).toContain('वर्ष लग्न');
    expect(blocks['varshphal-panchadhikari'](ctx).tex).toContain('वर्षेश');
    expect(blocks['varshphal-muntha'](ctx).tex).toContain('मुंथेश');
    expect(blocks['varshphal-sahams'](ctx).tex).toContain('पुण्य सहम');
    expect(blocks['varshphal-mudda'](ctx).method).toContain('मुद्दा दशा');
    const month = blocks['varshphal-month-01'](ctx).tex;
    expect(month).toMatch(/माह 1: \d{2} (जनवरी|फ़रवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|अक्टूबर|नवंबर|दिसंबर) \d{4} से/u);
    expect(month).toMatch(/(रवि|सोम|मंगल|बुध|गुरु|शुक्र|शनि)वार/);
    expect(month).toContain('8 में से');
    expect(blocks['varshphal-observances'](ctx).tex).toContain('पूर्णिमा');
    expect(blocks['varshphal-practice-note'](ctx).tex).toContain('साधनाओं के बारे में एक बात');
  });

  it('keeps the evidence labels in English', () => {
    for (const item of a.registry.all()) expect(item.label, item.id).not.toMatch(DEVANAGARI);
  });
});

describe('Personalised Horoscope in Hindi', () => {
  let a: Run;
  let b: Run;
  beforeAll(async () => {
    a = await runModule(HOROSCOPE_ANNUAL_MODULE, A);
    b = await runModule(HOROSCOPE_ANNUAL_MODULE, B);
  }, 120000);

  it('has a complete Hindi edition with the structure, evidence and objectives of the English one', () => {
    checkEdition(HOROSCOPE_ANNUAL_MODULE);
  });

  it('labels every block in Hindi with the same numbers, dates and evidence ids', () => {
    checkHindiBlocks(a, HOROSCOPE_ANNUAL_MODULE);
    checkHindiBlocks(b, HOROSCOPE_ANNUAL_MODULE);
  });

  it('names the windows and the transit facts in Hindi from the same dates', () => {
    const d = a.ext.horoscope as HoroscopeYearData;
    expect(d.windows.map((w) => windowLabel('en', w))).toEqual(d.windows.map((w) => w.label));
    expect(d.windows.map((w) => windowLabel('hi', w))).toEqual(['नवंबर 2026 – फ़रवरी 2027', 'मार्च 2027 – जून 2027', 'जुलाई 2027 – अक्टूबर 2027'].map((s) => s.normalize('NFC')));
    for (const w of d.windows) expect(numbers(windowLabel('hi', w))).toEqual(numbers(w.label));
    const factors = Object.values(d.areaFactors).flat(2);
    expect(factors.length).toBeGreaterThan(0);
    for (const f of factors) {
      const hi = factorTextHi(f, A.timezone);
      expect(numbers(hi)).toEqual(numbers(factorText(f, A.timezone)));
      expect(hi).not.toMatch(/[A-Za-z]/);
      expect(hi).toContain('गोचर');
    }
  });

  it('translates every row of the birth synopsis', () => {
    const f = a.ext.avakahada as AvakahadaFacts;
    const rows = ['Ascendant (Lagna)', 'Ascendant lord', 'Moon sign (Rashi)', 'Rashi lord', 'Nakshatra and pada', 'Nakshatra lord', 'Western Sun sign',
      'Name syllable (namakshara)', 'Tithi', 'Vara (weekday)', 'Yoga', 'Karana', 'Gana', 'Yoni', 'Nadi', 'Varna', 'Vashya', 'Tatva (element)', 'Paya', 'Yunja', 'Hansaka'];
    for (const row of rows) {
      const v = avakahadaValueHi(row, f, () => 'नक्षत्र');
      expect(v, row).toMatch(DEVANAGARI);
      expect(v, row).not.toMatch(/[A-Za-z]/);
      expect(L('hi', row), row).toMatch(DEVANAGARI);
    }
    expect(() => avakahadaValueHi('Unknown row', f, (n) => n)).toThrow('HINDI_AVAKAHADA_ROW_MISSING');
  });

  it('keeps a transit row in step with English', () => {
    const d = a.ext.horoscope as HoroscopeYearData;
    const p = d.transits.Jupiter[0];
    const en = transitRow(p, A.timezone);
    const hi = transitRow(p, A.timezone, true, 'hi');
    expect(transitRow(p, A.timezone, true, 'en')).toEqual(en);
    expect(hi).toHaveLength(en.length);
    expect(numbers(hi.join(' '))).toEqual(numbers(en.join(' ')));
    expect(hi[0]).toContain('गुरु');
    expect(transitRow(p, A.timezone, false, 'hi')).toHaveLength(en.length - 1);
  });
});

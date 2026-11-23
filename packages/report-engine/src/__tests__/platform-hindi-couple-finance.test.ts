/**
 * Hindi editions of the Finance and Couple Matching reports
 * (docs/integration/hindi-reports-design.md): complete editions, and every
 * block labelled in Hindi with the numbers and evidence ids of the English one.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { EvidenceRegistry } from '../platform/evidence/evidence-registry';
import { NAKSHATRA_HI } from '../platform/i18n/hindi';
import { ReportModule } from '../platform/module';
import { localizedDefinition, validateModule } from '../platform/registry';
import { BlockContext, BlockOutput } from '../platform/render/blocks';
import { classifyFunctionalNature, functionalReason, natureLabel, NATURE_LABEL } from '../platform/reports/_finance-couple-shared/functional-nature';
import { dayMonth, dayMonthText } from '../platform/reports/_finance-couple-shared/gochara';
import { dateText, namaksharaText, ord, ordOblique, term } from '../platform/reports/_finance-couple-shared/shared.hindi';
import { COUPLE_MATCHING_MODULE } from '../platform/reports/couple-matching';
import { COUPLE_HI, nadiExceptionText } from '../platform/reports/couple-matching/couple.hindi';
import { FINANCE_MODULE } from '../platform/reports/finance';
import { linkText, yogaConditionText, yogaNameText } from '../platform/reports/finance/finance.hindi';
import { formatDate } from '../platform/render/latex';
import { buildChartSnapshot, SubjectInput } from '../platform/snapshot/chart-snapshot';
import { validateEditorial } from '../platform/validation/editorial-validator';

const AS_OF = new Date('2026-11-18T00:00:00Z');
const MALE: SubjectInput = { name: 'Synthetic Male', gender: 'male', dateOfBirth: '1990-04-12', timeOfBirth: '09:35', placeName: 'Jaipur', latitude: 26.9124, longitude: 75.7873, timezone: 'Asia/Kolkata' };
const FEMALE: SubjectInput = { name: 'Synthetic Female', gender: 'female', dateOfBirth: '1993-11-02', timeOfBirth: '18:20', placeName: 'Kochi', latitude: 9.9312, longitude: 76.2673, timezone: 'Asia/Kolkata' };

const DEVANAGARI = /[ऀ-ॿ]/;

async function setup(module: ReportModule, subject: SubjectInput, partnerSubject?: SubjectInput) {
  const def = validateModule(module);
  const opts = { asOf: AS_OF, vargas: [...new Set(['D1', ...def.requires.vargas])] as typeof def.requires.vargas, transitYears: def.requires.transitYears };
  const snapshot = await buildChartSnapshot(subject, opts);
  const partner = partnerSubject ? await buildChartSnapshot(partnerSubject, opts) : undefined;
  const ext = module.extend ? await module.extend({ snapshot, partner }) : {};
  const registry = new EvidenceRegistry(snapshot, {
    partner,
    contributors: module.evidence ? [(add, reg) => module.evidence!(add, { snapshot, partner, ext, registry: reg })] : [],
  });
  const ctx: BlockContext = { snapshot, registry, partner, ext };
  return { def, ctx };
}

/** LaTeX structure words that are not reader-visible text. */
const STRUCTURE = new Set(('begin end center tabularx linewidth TableHead leavevmode THd TCell textbf rowcolor Surface bottomrule fontsize selectfont setlength tabcolsep ' +
  'raggedright arraybackslash minipage centering sffamily bfseries color Primary Accent par vspace mm hfill NorthChart SignNo asCard asHighlight CardTitle tikzpicture ' +
  'node anchor east west font at fill Rule rectangle textit itshape quad to ast pt').split(' '));
/** The client's name and place as entered. */
const ENTERED = new Set(['synthetic', 'male', 'female', 'jaipur', 'kochi']);

/** English (Latin-script) words a Hindi reader would see: everything except LaTeX structure, chart codes and entered names. */
function latinWords(text: string): string[] {
  return (text.match(/[A-Za-z]{2,}/g) ?? []).filter((w) => !STRUCTURE.has(w) && !ENTERED.has(w.toLowerCase()) && !/^D\d+$/.test(w));
}

/** Every number printed by a block, in sorted order (Hindi word order differs; the set of numbers must not). */
const numbers = (tex: string) => (tex.match(/\d+(?:\.\d+)?/g) ?? []).sort();

function compareBlocks(module: ReportModule, ctx: BlockContext) {
  const ids = Object.keys(module.blocks!);
  expect(ids.length).toBeGreaterThan(10);
  for (const id of ids) {
    const en: BlockOutput = module.blocks![id](ctx);
    const hi: BlockOutput = module.blocks![id]({ ...ctx, lang: 'hi' });
    expect(module.blocks![id]({ ...ctx, lang: 'en' }), id).toEqual(en);
    expect(hi.evidenceIds, id).toEqual(en.evidenceIds);
    expect(numbers(hi.tex), id).toEqual(numbers(en.tex));
    expect(latinWords(hi.tex), id).toEqual([]);
    expect(hi.tex, id).toMatch(DEVANAGARI);
    expect(hi.tex, id).not.toMatch(/undefined|NaN/);
    expect(hi.method, id).toMatch(DEVANAGARI);
    expect(latinWords(hi.method ?? ''), id).toEqual([]);
    // No precomposed nukta letters: they break the Devanagari font switch when not passed through tex().
    expect(hi.tex + hi.method, id).not.toMatch(/[क़-य़]/);
  }
}

function checkEdition(module: ReportModule) {
  const en = localizedDefinition(module);
  const hi = localizedDefinition(module, 'hi');
  expect(hi.language).toBe('hi');
  expect(hi.title).toMatch(DEVANAGARI);
  expect(hi.subtitle).toMatch(DEVANAGARI);
  expect(hi.description).toMatch(DEVANAGARI);
  expect(hi.sections.map((s) => s.id)).toEqual(en.sections.map((s) => s.id));
  for (const s of hi.sections) {
    expect(s.title, s.id).toMatch(DEVANAGARI);
    expect(s.kicker, s.id).toMatch(DEVANAGARI);
    if (s.intro) expect(latinWords(s.intro), s.id).toEqual([]);
    expect(latinWords(s.title + ' ' + s.kicker), s.id).toEqual([]);
  }
  const enTopics = en.sections.flatMap((s) => s.topics);
  const hiTopics = hi.sections.flatMap((s) => s.topics);
  expect(hiTopics.map((t) => [t.id, t.kind, t.objective, t.requiredEvidence, t.optionalEvidence, t.block, t.depth]))
    .toEqual(enTopics.map((t) => [t.id, t.kind, t.objective, t.requiredEvidence, t.optionalEvidence, t.block, t.depth]));
  for (const t of hiTopics) {
    expect(t.title, t.id).toMatch(DEVANAGARI);
    expect(latinWords(`${t.title} ${t.subtitle ?? ''}`), t.id).toEqual([]);
  }
  // The edition has no entries for ids the definition does not have.
  expect(Object.keys(module.hindi!.sections).sort()).toEqual(en.sections.map((s) => s.id).sort());
  expect(Object.keys(module.hindi!.topics).sort()).toEqual(enTopics.map((t) => t.id).sort());
  // The English writing guidance is kept and only added to.
  expect(hi.writingGuidance.slice(0, en.writingGuidance.length)).toEqual(en.writingGuidance);
}

describe('Finance report in Hindi', () => {
  let s: Awaited<ReturnType<typeof setup>>;
  beforeAll(async () => { s = await setup(FINANCE_MODULE, MALE); }, 120000);

  it('has a complete Hindi edition with the structure, evidence and objectives of the English one', () => {
    checkEdition(FINANCE_MODULE);
  });

  it('labels every block in Hindi with the same numbers and evidence ids', () => {
    compareBlocks(FINANCE_MODULE, s.ctx);
  });

  it('words engine yoga names, conditions and wealth links in Hindi without losing a house or planet', () => {
    expect(yogaNameText('hi', 'Lakshmi Yoga')).toBe('लक्ष्मी योग');
    const pairs = ['2nd Lord (Dhana) + 11th Lord (Labha)', 'Lagna Lord + 2nd Lord', 'Lagna Lord + 11th Lord', '5th Lord (Lakshmi Sthana) + 9th Lord (Bhagya)',
      '2nd Lord + 5th Lord', '2nd Lord + 9th Lord', '5th Lord + 11th Lord (Labha)', '9th Lord (Bhagya) + 11th Lord (Labha)'];
    for (const p of pairs) {
      const hi = yogaNameText('hi', `Dhana Yoga (${p})`);
      expect(latinWords(hi), p).toEqual([]);
      expect(numbers(hi), p).toEqual(numbers(p));
    }
    expect(yogaNameText('en', 'Dhana Yoga (Lagna Lord + 2nd Lord)')).toBe('Dhana Yoga (Lagna Lord + 2nd Lord)');
    expect(yogaConditionText('hi', 'Lord of H5 (SUN) and Lord of H9 (JUPITER) related by conjunction, mutual aspect or sign exchange'))
      .toBe('5वें भाव का स्वामी (सूर्य) और 9वें भाव का स्वामी (गुरु) युति, परस्पर दृष्टि या राशि परिवर्तन से जुड़े हैं');
    for (const c of ['9th lord (SATURN) must occupy Kendra or Trikona house', '9th lord (SATURN) must be exalted, moolatrikona, or in own sign', 'Lagna lord (VENUS) must be well placed in Kendra or Trikona']) {
      expect(latinWords(yogaConditionText('hi', c)), c).toEqual([]);
    }
    expect(() => yogaConditionText('hi', 'Some new engine condition')).toThrow('HINDI_LABEL_MISSING');
    expect(linkText('hi', 'rules 2nd & 5th')).toBe('2रे और 5वें का स्वामी');
    expect(linkText('hi', 'in 9th')).toBe('9वें में');
    expect(linkText('en', 'in 9th')).toBe('in 9th');
  });
});

describe('Couple Matching report in Hindi', () => {
  let s: Awaited<ReturnType<typeof setup>>;
  let reversed: Awaited<ReturnType<typeof setup>>;
  beforeAll(async () => {
    s = await setup(COUPLE_MATCHING_MODULE, MALE, FEMALE);
    reversed = await setup(COUPLE_MATCHING_MODULE, FEMALE, MALE);
  }, 120000);

  it('has a complete Hindi edition with the structure, evidence and objectives of the English one', () => {
    checkEdition(COUPLE_MATCHING_MODULE);
  });

  it('labels every block in Hindi with the same numbers and evidence ids, whoever ordered the report', () => {
    compareBlocks(COUPLE_MATCHING_MODULE, s.ctx);
    compareBlocks(COUPLE_MATCHING_MODULE, reversed.ctx);
  });

  it('keeps Manglik, Sade Sati and the nodal axis free of fear language, in Hindi as in English', () => {
    const hi = (id: string) => COUPLE_MATCHING_MODULE.blocks![id]({ ...s.ctx, lang: 'hi' }).tex;
    expect(hi('couple-significance')).toContain('एस्ट्रो सुशील दोषों को अभिशाप नहीं मानता');
    expect(hi('couple-manglik')).toContain('एस्ट्रो सुशील दोषों को कष्ट नहीं मानता');
    expect(hi('couple-nodes')).toContain('एस्ट्रो सुशील इसे दोष नहीं मानता');
    expect(hi('couple-saturn')).toContain('दुर्भाग्य नहीं');
    const fixed = [COUPLE_HI.aboutManglik, COUPLE_HI.manglikNeither, COUPLE_HI.manglikBoth, COUPLE_HI.manglikOne, COUPLE_HI.manglikNoTime, COUPLE_HI.manglikStance,
      COUPLE_HI.saturnCard, COUPLE_HI.nodesCard, COUPLE_HI.noNadiException, COUPLE_HI.noBhakootException, COUPLE_HI.holdNumber];
    for (const text of fixed) {
      const errors = validateEditorial({ topicId: 't', lead: text, paragraphs: [], bullets: [], takeaway: undefined, claims: [] }, { language: 'hi' })
        .filter((i) => i.severity === 'error').map((i) => i.code);
      expect(errors, text).toEqual([]);
      expect(text).not.toMatch(/मांगलिक दोष|पीड़ित|श्राप|संकट|अशुभ|खतरा/);
    }
    for (const section of localizedDefinition(COUPLE_MATCHING_MODULE, 'hi').sections) {
      expect(`${section.title} ${section.intro ?? ''} ${section.topics.map((t) => `${t.title} ${t.subtitle ?? ''}`).join(' ')}`, section.id).not.toMatch(/मांगलिक दोष|पीड़ित|श्राप|संकट|अशुभ|खतरा/);
    }
  });

  it('words every engine Manglik factor and Nadi exception in Hindi', () => {
    const factors = ['Mars in own sign (Aries) in 1st house', 'Mars in own sign (Scorpio) in 4th/8th house', 'Mars in exalted sign (Capricorn) in 7th/8th house',
      'Mars in friendly sign (Leo) in 8th house', 'Mars in friendly sign (Sagittarius) in 12th house', 'Jupiter conjoined with Mars in the same house',
      'Benefic Jupiter aspects Mars (5th/7th/9th drishti)'];
    for (const f of factors) {
      expect(latinWords(term('hi', f)), f).toEqual([]);
      expect(numbers(term('hi', f)), f).toEqual(numbers(f));
    }
    expect(nadiExceptionText('hi', 'Same Nakshatra (Krittika) spans different Rashis (Mesha & Vrishabha).')).toBe('एक ही नक्षत्र (कृत्तिका) अलग-अलग राशियों (मेष और वृषभ) में पड़ता है।');
    expect(nadiExceptionText('hi', 'Same Rashi (Tula) with different Nakshatras (Swati & Vishakha).')).toBe('राशि एक ही है (तुला) पर नक्षत्र अलग हैं (स्वाति और विशाखा)।');
    expect(nadiExceptionText('hi', 'Different Pada quarters (1 vs 3) in Rohini.')).toBe('रोहिणी नक्षत्र में चरण अलग हैं (1 और 3)।');
    expect(() => nadiExceptionText('hi', 'A new engine reason.')).toThrow('HINDI_LABEL_MISSING');
    for (const d of ['Eka Rashi', 'Samasaptaka', 'Tritiya-Ekadasha', 'Chaturtha-Dashama', 'Nav-Pancham', 'Shadashtak', 'Dwi-Dwadash']) expect(term('hi', d), d).toMatch(DEVANAGARI);
    for (const p of ['Sade Sati - rising (12th)', 'Sade Sati - peak (1st)', 'Sade Sati - setting (2nd)', 'Dhaiya (4th)', 'Dhaiya (8th)']) expect(numbers(term('hi', p)), p).toEqual(numbers(p));
  });
});

describe('shared Hindi helpers of the Finance and Couple blocks', () => {
  it('leaves English untouched and keeps the digits in Hindi', () => {
    expect(ord('en', 2)).toBe('2nd');
    expect(ord('hi', 2)).toBe('2रा');
    expect(ordOblique('hi', 11)).toBe('11वें');
    expect(dateText('en', '1993-11-02')).toBe(formatDate('1993-11-02'));
    expect(dateText('hi', '1993-11-02')).toBe('02 नवं 1993');
    expect(dayMonthText('en', '2027-06-05T00:00:00.000Z')).toBe(dayMonth('2027-06-05T00:00:00.000Z'));
    expect(dayMonthText('hi', '2027-06-05T00:00:00.000Z')).toBe('5 जून');
    expect(term('en', 'Anything at all')).toBe('Anything at all');
    expect(() => term('hi', 'Some new heading')).toThrow('HINDI_LABEL_MISSING');
  });

  it('gives a Devanagari name syllable for every nakshatra pada', () => {
    for (const nakshatra of Object.keys(NAKSHATRA_HI)) {
      for (const pada of [1, 2, 3, 4]) expect(namaksharaText('hi', 'xx', nakshatra, pada), `${nakshatra} ${pada}`).toMatch(/^[ऀ-ॿ]{1,2}$/);
    }
    expect(namaksharaText('hi', 'Ta', 'Purva Phalguni', 2)).toBe('टा');
    expect(namaksharaText('hi', 'Ta', 'Swati', 4)).toBe('ता');
    expect(namaksharaText('en', 'Ta', 'Swati', 4)).toBe('Ta');
  });

  it('restates the functional nature of every planet for every Lagna with the same houses', () => {
    for (let asc = 1; asc <= 12; asc++) {
      for (const c of classifyFunctionalNature(asc)) {
        const hi = functionalReason('hi', c);
        expect(functionalReason('en', c)).toBe(c.reason);
        expect(numbers(hi), `${asc} ${c.planet}`).toEqual(numbers(c.reason));
        expect(latinWords(hi), `${asc} ${c.planet}`).toEqual([]);
        expect(natureLabel('en', c.nature)).toBe(NATURE_LABEL[c.nature]);
        expect(natureLabel('en', c.nature, true)).toBe(NATURE_LABEL[c.nature].replace('Functionally ', ''));
        expect(natureLabel('hi', c.nature)).toMatch(DEVANAGARI);
      }
    }
  });
});

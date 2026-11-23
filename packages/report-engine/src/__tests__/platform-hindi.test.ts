/**
 * Hindi editions (docs/integration/hindi-reports-design.md): language chosen per
 * request, Hindi labels in blocks, and the wording rules applied to Hindi prose.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import '../platform/index';
import { EvidenceRegistry } from '../platform/evidence/evidence-registry';
import { applyHindiEdition, DIGNITY_HI, label, NAKSHATRA_HI, nakshatraLabel, planetLabel, signLabel } from '../platform/i18n/hindi';
import { topicCacheKey } from '../platform/llm/topic-cache';
import { localizedDefinition, ReportRegistry } from '../platform/registry';
import { d1Chart } from '../platform/render/blocks';
import { kundliPlanetTable } from '../platform/reports/kundli/blocks/charts';
import { buildChartSnapshot, ChartSnapshot } from '../platform/snapshot/chart-snapshot';
import { validateEditorial } from '../platform/validation/editorial-validator';
import { deniedInHindiClause, devanagariShare, findHindiOverstatement } from '../platform/validation/hindi-lexicon';

const payload = (text: string) => ({ topicId: 't', lead: text, paragraphs: [], bullets: [], takeaway: undefined, claims: [] });
const codes = (text: string, opts = {}) => validateEditorial(payload(text), opts).filter((i) => i.severity === 'error').map((i) => i.code);

describe('Hindi glossary', () => {
  it('names planets, signs, nakshatras and dignities, and leaves English untouched', () => {
    expect(planetLabel('hi', 'Jupiter')).toBe('गुरु');
    expect(signLabel('hi', 'Scorpio')).toBe('वृश्चिक');
    expect(nakshatraLabel('hi', 'Purva Phalguni')).toBe('पूर्व फाल्गुनी');
    expect(planetLabel('en', 'Jupiter')).toBe('Jupiter');
    expect(Object.keys(NAKSHATRA_HI)).toHaveLength(27);
    expect(Object.keys(DIGNITY_HI)).toHaveLength(9);
  });

  it('refuses an untranslated label instead of printing English in a Hindi report', () => {
    expect(() => label('hi', 'Some new heading')).toThrow('HINDI_LABEL_MISSING');
    expect(label('en', 'Some new heading')).toBe('Some new heading');
  });
});

describe('Hindi edition of a report', () => {
  it('keeps structure, evidence and objectives, and changes only what the reader sees', () => {
    const en = ReportRegistry.get('planetary-summary');
    const hi = ReportRegistry.get('planetary-summary', 'hi');
    expect(hi.language).toBe('hi');
    expect(hi.title).toMatch(/[ऀ-ॿ]/);
    expect(hi.sections.map((s) => s.id)).toEqual(en.sections.map((s) => s.id));
    const enTopics = en.sections.flatMap((s) => s.topics);
    const hiTopics = hi.sections.flatMap((s) => s.topics);
    expect(hiTopics.map((t) => [t.id, t.kind, t.objective, t.requiredEvidence, t.block])).toEqual(enTopics.map((t) => [t.id, t.kind, t.objective, t.requiredEvidence, t.block]));
    for (const t of hiTopics) expect(t.title, t.id).toMatch(/[ऀ-ॿ]/);
    expect(ReportRegistry.languages('planetary-summary')).toEqual(['en', 'hi']);
  });

  it('rejects a language a report has no edition for, and an incomplete edition', () => {
    const career = ReportRegistry.entry('career').module;
    expect(() => localizedDefinition({ ...career, hindi: undefined }, 'hi')).toThrow('REPORT_LANGUAGE_NOT_AVAILABLE');
    const en = ReportRegistry.get('planetary-summary');
    const edition = ReportRegistry.entry('planetary-summary').module.hindi!;
    const { 'planet-sun': _dropped, ...topics } = edition.topics;
    expect(() => applyHindiEdition(en, { ...edition, topics })).toThrow('HINDI_EDITION_INCOMPLETE');
  });

  it('caches Hindi text separately and leaves English cache keys unchanged', () => {
    const parts = { snapshotId: 's', subjectRef: 'r', definitionId: 'd', specVersion: '1', topicId: 't', promptVersion: 'p', evidenceFingerprint: 'e', model: 'm', generationConfig: {} };
    expect(topicCacheKey({ ...parts, language: undefined })).toBe(topicCacheKey(parts));
    expect(topicCacheKey({ ...parts, language: 'hi' })).not.toBe(topicCacheKey(parts));
  });
});

describe('Hindi blocks', () => {
  let snapshot: ChartSnapshot;
  beforeAll(async () => {
    snapshot = await buildChartSnapshot(
      { name: 'Test Native A', gender: 'female', dateOfBirth: '1994-03-17', timeOfBirth: '06:42', placeName: 'Jaipur', latitude: 26.9124, longitude: 75.7873, timezone: 'Asia/Kolkata' },
      { asOf: new Date('2026-11-18T00:00:00Z'), vargas: ['D1'], transitYears: 1 }
    );
  }, 60000);

  it('labels the chart and the planet table in Hindi with the same numbers as English', () => {
    const ctx = { snapshot, registry: new EvidenceRegistry(snapshot), ext: {} };
    const en = kundliPlanetTable(ctx);
    const hi = kundliPlanetTable({ ...ctx, lang: 'hi' as const });
    expect(hi.tex).toContain('ग्रह');
    expect(hi.tex).toContain('लग्न');
    expect(hi.tex).not.toMatch(/\b(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu|Planet|Sign|Dignity|Exalted|Debilitated|Ascendant)\b/);
    expect(hi.evidenceIds).toEqual(en.evidenceIds);
    const numbers = (s: string) => s.match(/\d+°\d+′/g);
    expect(numbers(hi.tex)).toEqual(numbers(en.tex));
    expect(hi.method).toMatch(/[ऀ-ॿ]/);

    const chart = d1Chart({ ...ctx, lang: 'hi' as const });
    expect(chart.tex).toContain('ल');
    expect(chart.tex).not.toMatch(/\b(Asc|Su|Mo|Ma|Me|Ju|Ve|Sa|Ra|Ke)\b/);
  });
});

describe('Hindi wording rules', () => {
  it('blocks fear language, dosha-as-affliction, guarantees and remedy selling in Hindi', () => {
    expect(codes('यह स्थिति आपके जीवन पर एक श्राप की तरह है।')).toContain('FEAR_LANGUAGE');
    expect(codes('आप मांगलिक दोष से पीड़ित हैं।')).toContain('DOSHA_AS_AFFLICTION');
    expect(codes('इस दशा में आपको सफलता की गारंटी है।')).toContain('GUARANTEE');
    expect(codes('शनि के लिए नीलम रत्न अवश्य खरीदें।')).toContain('REMEDY_SALES');
    expect(codes('आप निश्चित ही करोड़पति बनेंगे।')).toContain('FINANCIAL_CERTAINTY');
  });

  it('accepts the same words when they are denied, as in English', () => {
    expect(codes('साढ़े साती कोई श्राप नहीं है, यह धैर्य सीखने का समय है।')).not.toContain('FEAR_LANGUAGE');
    expect(codes('कुंडली किसी परिणाम की गारंटी नहीं देती; वह झुकाव बताती है।')).not.toContain('GUARANTEE');
    expect(deniedInHindiClause('यह श्राप नहीं है', 3, 5)).toBe(true);
  });

  it('treats a promised outcome in a dasha or transit sentence as an error', () => {
    expect(findHindiOverstatement('यह योग निश्चित रूप से धन देगा।')).not.toBeNull();
    expect(codes('गुरु की यह दशा निश्चित रूप से पदोन्नति दिलाएगी।')).toContain('OVERSTATEMENT');
    expect(codes('गुरु की यह दशा विकास के लिए सहायक समय हो सकती है।')).toEqual([]);
  });

  it('requires a Hindi edition to be written in Devanagari', () => {
    expect(codes('Your Sun is placed in the tenth house and supports your career.', { language: 'hi' })).toContain('WRONG_LANGUAGE');
    expect(codes('Aapka Surya dasham bhav mein hai aur career ko sahara deta hai.', { language: 'hi' })).toContain('WRONG_LANGUAGE');
    expect(codes('आपका सूर्य दशम भाव में है और आपके कार्यक्षेत्र को सहारा देता है।', { language: 'hi' })).toEqual([]);
    expect(codes('Your Sun is placed in the tenth house and supports your career.', { language: 'en' })).toEqual([]);
    expect(devanagariShare('आपकी कुंडली (D1)')).toBeGreaterThan(0.7);
  });

  it('still catches a repeated Hindi sentence', () => {
    const s = 'आपका सूर्य दशम भाव में स्थित है और यह आपके कार्यक्षेत्र में नेतृत्व की स्वाभाविक क्षमता को दर्शाता है।';
    const issues = validateEditorial({ topicId: 't', lead: s, paragraphs: [s], bullets: [], takeaway: undefined, claims: [] });
    expect(issues.map((i) => i.code)).toContain('REPEATED_SENTENCE');
  });
});

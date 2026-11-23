/**
 * Cross-language coverage: does a Hindi sentence restate an English statement?
 *
 * In a Hindi edition the prose is Hindi while every claim statement, evidence
 * label and interpretation conclusion stays English (so it can be audited).
 * The interpretation validators must still decide whether a Hindi sentence
 * restates such an English text. Translating is not possible deterministically,
 * so the comparison uses what can be matched exactly:
 *
 *   - anchors: numbers (house numbers, counts), planet names and sign names;
 *   - proper names the glossary does not know (yoga names), compared by their
 *     consonant skeleton ("Gajakesari" and "गजकेसरी" both give g-j-k-s-r);
 *   - the chart vocabulary of the closed glossary below (house, lord, placed,
 *     debilitated, mixed, bindus, …).
 *
 * English words outside the glossary cannot be compared and are left out of the
 * share. An English text with fewer than three comparable words is never
 * covered by a Hindi sentence (fail closed): the evaluative sentence is then
 * rejected rather than waved through.
 *
 * Recognition only. Nothing here calculates or decides astrology.
 */
import { HI_HOUSE_LORDS, HI_MONTHS, HI_PLANETS, HI_SIGNS, hiNumber, hiOrdinalToken, toAsciiDigits } from './hindi-chart-terms';

const EN_MONTH = ['', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Hindi word → English content words (canonical singular forms) of the evidence vocabulary. */
const GLOSSARY: ReadonlyArray<[string[], string[]]> = [
  [['भाव', 'घर'], ['house']],
  [['स्वामी', 'भावेश', 'अधिपति'], ['lord']],
  [['राशि'], ['sign']],
  [['स्थित', 'बैठा', 'बैठे', 'बैठी', 'विराजमान', 'स्थापित'], ['placed']],
  [['दुःस्थान', 'दुस्थान', 'त्रिक'], ['dusthana']],
  [['बिंदु', 'बिन्दु'], ['bindu']],
  [['सर्वाष्टकवर्ग'], ['sarvashtakavarga']],
  [['अष्टकवर्ग'], ['ashtakavarga']],
  [['भिन्नाष्टकवर्ग'], ['bhinnashtakavarga']],
  [['औसत'], ['average']],
  [['कम', 'नीचे'], ['below']],
  [['अधिक', 'ऊपर', 'ज़्यादा', 'ज्यादा'], ['above']],
  [['जन्मकालीन', 'जन्म'], ['natal', 'birth']],
  [['खाली', 'रिक्त'], ['unoccupied', 'empty']],
  [['कुंडली', 'कुण्डली'], ['chart']],
  [['दशमांश'], ['d10']],
  [['नवांश', 'नवमांश'], ['d9', 'navamsa']],
  [['नीच'], ['debilitated']],
  [['उच्च'], ['exalted']],
  [['स्वराशि'], ['own', 'sign']],
  [['मूलत्रिकोण'], ['moolatrikona']],
  [['मित्र'], ['friend']],
  [['अधिमित्र'], ['great', 'friend']],
  [['शत्रु'], ['enemy']],
  [['अधिशत्रु'], ['great', 'enemy']],
  [['सम', 'तटस्थ'], ['neutral']],
  [['स्थिति'], ['dignity', 'placement']],
  [['वक्री'], ['retrograde']],
  [['अस्त'], ['combust']],
  [['योग'], ['yoga']],
  [['बनता', 'बनती', 'बनते', 'बना', 'बनी', 'निर्मित'], ['formed']],
  [['श्रेणी', 'कोटि'], ['class']],
  [['मध्यम'], ['moderate']],
  [['अनंतिम', 'अस्थायी'], ['provisional']],
  [['भंग', 'निरस्त', 'रद्द'], ['cancelled']],
  [['कमजोर', 'कमज़ोर', 'दुर्बल', 'निर्बल'], ['weak']],
  [['मजबूत', 'मज़बूत', 'बलवान', 'प्रबल', 'सशक्त'], ['strong']],
  [['मिश्रित'], ['mixed']],
  [['दोनों'], ['both']],
  [['समर्थित'], ['supported']],
  [['चुनौतीपूर्ण'], ['challenged', 'challenging']],
  [['सहायक', 'सहयोगी'], ['supporting', 'supportive']],
  [['अनुकूल'], ['favourable']],
  [['संकेत', 'संकेतक', 'सूचक'], ['indicator']],
  [['प्रयास', 'मेहनत', 'परिश्रम'], ['effort']],
  [['सहयोग', 'समर्थन', 'सहारा'], ['support']],
  [['व्यवसाय', 'व्यापार', 'कारोबार'], ['business']],
  [['उद्यम', 'उद्यमिता'], ['enterprise']],
  [['क्षेत्र'], ['area']],
  [['करियर', 'कैरियर', 'कार्यक्षेत्र', 'आजीविका'], ['career']],
  [['साझेदारी'], ['partnership']],
  [['विवाह'], ['marriage']],
  [['लग्न'], ['ascendant', 'lagna']],
  [['दशा'], ['dasha']],
  [['महादशा'], ['mahadasha']],
  [['अंतर्दशा', 'अन्तर्दशा'], ['antardasha']],
  [['अवधि', 'काल'], ['period']],
  [['गोचर'], ['transit']],
  [['कार्यात्मक', 'क्रियात्मक'], ['functionally']],
  [['षड्बल', 'षडबल'], ['shadbala']],
  [['रूपा'], ['rupa']],
  [['दृष्टि'], ['aspect']],
  [['युति'], ['conjunction']],
  [['नक्षत्र'], ['nakshatra']],
  [['चरण'], ['pada']],
  [['वर्गोत्तम'], ['vargottama']],
  [['केंद्र', 'केन्द्र'], ['kendra']],
  [['त्रिकोण'], ['trikona']],
  [['योगकारक'], ['yogakaraka']],
  [['कारक'], ['karaka']],
  [['आयु', 'उम्र'], ['age']],
  [['वर्ष', 'साल'], ['year']],
  [['आय', 'कमाई'], ['earning']],
  [['धन'], ['wealth']],
  [['लाभ'], ['gain']],
  [['ग्रह'], ['planet']],
];

/** Phrases replaced by one glossary word before the text is split into words. */
const PHRASES: ReadonlyArray<[RegExp, string]> = [
  [/मिल[ाीे][-\s]?जुल[ाीे]/gu, ' मिश्रित '],
  [/दु:स्थान/gu, 'दुःस्थान'],
  [/योग[-\s]कारक/gu, 'योगकारक'],
  [/स्व[-\s]राशि/gu, 'स्वराशि'],
  [/साढ़े\s*साती|साढे\s*साती/gu, ' sade sati '],
];

const HI_TO_EN = new Map<string, string[]>();
for (const [his, ens] of GLOSSARY) for (const h of his) HI_TO_EN.set(h, ens);
for (const [h, en] of HI_PLANETS) HI_TO_EN.set(h, [en.toLowerCase()]);
for (const [h, en] of HI_SIGNS) HI_TO_EN.set(h, [en.toLowerCase()]);
for (const [h, n] of HI_HOUSE_LORDS) HI_TO_EN.set(h, [String(n), 'lord']);
for (const [h, n] of HI_MONTHS) HI_TO_EN.set(h, [EN_MONTH[n]]);

const ANCHOR_NAMES = new Set([...HI_PLANETS.map(([, e]) => e.toLowerCase()), ...HI_SIGNS.map(([, e]) => e.toLowerCase())]);
/** English words a Hindi sentence can be compared on. */
const KNOWN = new Set<string>([...GLOSSARY.flatMap(([, ens]) => ens), ...ANCHOR_NAMES, 'lord', 'sade', 'sati', ...EN_MONTH.filter(Boolean)]);

const STOP = new Set(['the', 'a', 'an', 'of', 'in', 'to', 'and', 'or', 'is', 'are', 'your', 'you', 'its', 'by', 'for', 'with', 'from', 'on', 'as', 'at', 'this', 'that', 'which', 'it']);
const stem6 = (w: string) => w.slice(0, 6);
const MONTH_WORD = /^(?:january|february|march|april|june|july|august|september|october|november|december|sept)$/;

/** Canonical form of an English word: ordinal suffix removed ("7th" → "7"), known plurals made singular, month names shortened. */
function canon(word: string): string {
  const w = word.toLowerCase();
  const ord = /^(\d+)(?:st|nd|rd|th)$/.exec(w);
  if (ord) return ord[1];
  if (KNOWN.has(w)) return w;
  if (w.endsWith('s') && KNOWN.has(w.slice(0, -1))) return w.slice(0, -1);
  return MONTH_WORD.test(w) ? w.slice(0, 3) : w;
}

// ---------------------------------------------------------------------------
// Consonant skeletons for proper names
// ---------------------------------------------------------------------------

const DEVANAGARI_CONSONANT: Readonly<Record<string, string>> = {
  क: 'k', ख: 'k', ग: 'g', घ: 'g', ङ: 'n', च: 'c', छ: 'c', ज: 'j', झ: 'j', ञ: 'n', ट: 't', ठ: 't', ड: 'd', ढ: 'd', ण: 'n',
  त: 't', थ: 't', द: 'd', ध: 'd', न: 'n', प: 'p', फ: 'p', ब: 'b', भ: 'b', म: 'n', य: 'y', र: 'r', ल: 'l', व: 'v',
  श: 's', ष: 's', स: 's', ह: 'h', '\u0902': 'n', // anusvara
};
const collapse = (s: string) => s.replace(/(.)\1+/g, '$1');

/** Consonant skeleton of a Devanagari word: "गजकेसरी" → "gjksr". Vowels, aspiration and the m/n distinction are dropped. */
export function devanagariSkeleton(word: string): string {
  let out = '';
  for (const ch of word.normalize('NFD')) out += DEVANAGARI_CONSONANT[ch] ?? '';
  return collapse(out);
}

/** Consonant skeleton of a romanised name: "Gajakesari" → "gjksr", "Budha-Aditya" → "bdty". */
export function latinSkeleton(word: string): string {
  const s = word
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/x/g, 'ks').replace(/q/g, 'k').replace(/z/g, 'j').replace(/w/g, 'v').replace(/f/g, 'p').replace(/m/g, 'n')
    .replace(/([bcdgjkpst])h/g, '$1')
    .replace(/[aeiou]/g, '');
  return collapse(s);
}

// ---------------------------------------------------------------------------
// Hindi sentence → comparable tokens
// ---------------------------------------------------------------------------

export interface HindiTokens {
  /** English canonical words, numbers as digits. */
  words: Set<string>;
  /** 6-letter stems of `words`. */
  stems: Set<string>;
  /** Consonant skeletons of the Devanagari words (for proper names). */
  skeletons: Set<string>;
}

/** Noun plural/oblique endings tried when a word is not in the glossary as written. */
function baseForms(word: string): string[] {
  const out = [word];
  for (const [end, repl] of [['ियों', 'ी'], ['ियाँ', 'ी'], ['ियां', 'ी'], ['यों', ''], ['ओं', ''], ['ों', ''], ['ें', ''], ['एँ', ''], ['एं', '']] as const) {
    if (word.length > end.length + 1 && word.endsWith(end)) out.push(word.slice(0, -end.length) + repl);
  }
  return out;
}

/** The comparable content of a Hindi (or mixed-script) sentence. */
export function hindiTokens(sentence: string): HindiTokens {
  let text = toAsciiDigits(sentence);
  for (const [re, to] of PHRASES) text = text.replace(re, to);
  const words = new Set<string>();
  const skeletons = new Set<string>();
  for (const raw of text.split(/[^\p{L}\p{M}\p{N}]+/u)) {
    if (!raw) continue;
    if (/^[A-Za-z0-9]+$/.test(raw)) {
      const w = canon(raw);
      if (w.length > 1 || /^\d$/.test(w)) words.add(w);
      continue;
    }
    const ord = hiOrdinalToken(raw);
    if (ord !== undefined) words.add(String(ord));
    for (const form of baseForms(raw)) {
      const en = HI_TO_EN.get(form);
      if (en) en.forEach((w) => words.add(w));
    }
    // Cardinals in words are counts and ages ("छब्बीस बिंदु"); small ones ("एक", "दो") are ordinary words.
    const n = hiNumber(raw);
    if (n !== undefined && n >= 13 && !/^\d/.test(raw)) words.add(String(n));
    const sk = devanagariSkeleton(raw);
    if (sk.length >= 2) skeletons.add(sk);
  }
  // A hyphenated or sandhi-joined name may be written as two words ("बुध आदित्य"): also keep pair skeletons.
  const deva = text.split(/[^\p{L}\p{M}]+/u).filter((w) => /[ऀ-ॿ]/.test(w));
  for (let i = 0; i + 1 < deva.length; i++) {
    const sk = collapse(devanagariSkeleton(deva[i]) + devanagariSkeleton(deva[i + 1]));
    if (sk.length >= 3) skeletons.add(sk);
  }
  return { words, stems: new Set([...words].map(stem6)), skeletons };
}

// ---------------------------------------------------------------------------
// English text → what can be compared
// ---------------------------------------------------------------------------

interface Comparable {
  /** Numbers, planets and signs. */
  anchors: string[];
  /** Skeletons of proper names the glossary does not know. */
  names: string[];
  /** Glossary words (canonical). */
  regular: string[];
}

const NAME_RE = /[A-Z][a-z]+(?:-[A-Z][a-z]+)*/g;

function comparable(english: string): Comparable {
  const main = english.replace(/\s*\([^)]*\)/g, ' ');
  const nameParts = new Set<string>();
  const names = new Set<string>();
  for (const m of main.matchAll(NAME_RE)) {
    const at = m.index ?? 0;
    // A sentence-initial capital is an ordinary word ("The", "Saturn is") unless another capitalised word follows ("Gajakesari Yoga").
    if ((at === 0 || /[.!?:;]\s*$/.test(main.slice(0, at))) && !/^\s+[A-Z]/.test(main.slice(at + m[0].length))) continue;
    const parts = m[0].toLowerCase().split('-');
    if (parts.every((p) => KNOWN.has(canon(p)) || STOP.has(p))) continue;
    const sk = latinSkeleton(m[0]);
    if (sk.length < 2) continue;
    names.add(sk);
    parts.forEach((p) => nameParts.add(p));
  }
  const words = [...new Set(main.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1 || /^\d$/.test(w)).filter((w) => !STOP.has(w) && !nameParts.has(w)).map(canon))];
  const isAnchor = (w: string) => /^\d+$/.test(w) || ANCHOR_NAMES.has(w);
  return {
    anchors: words.filter(isAnchor),
    names: [...names],
    regular: words.filter((w) => !isAnchor(w) && KNOWN.has(w)),
  };
}

export interface CrossMatch {
  /** Comparable words in the English text (anchors + names + glossary words). */
  total: number;
  /** How many of them the Hindi sentence contains. */
  matched: number;
  /** Every number, planet, sign and proper name of the English text is in the Hindi sentence. */
  anchorsComplete: boolean;
  /** At least one anchor or name is in the Hindi sentence (true when the English text has none). */
  anchorPresent: boolean;
}

/** Compare a Hindi sentence with an English statement, label or conclusion. */
export function crossMatch(hindiSentence: string, english: string): CrossMatch {
  const t = hindiTokens(hindiSentence);
  const c = comparable(english);
  const anchorsHit = c.anchors.filter((w) => t.words.has(w)).length;
  const namesHit = c.names.filter((n) => t.skeletons.has(n)).length;
  const regularHit = c.regular.filter((w) => t.stems.has(stem6(w))).length;
  const fixed = c.anchors.length + c.names.length;
  return {
    total: fixed + c.regular.length,
    matched: anchorsHit + namesHit + regularHit,
    anchorsComplete: anchorsHit + namesHit === fixed,
    anchorPresent: fixed === 0 || anchorsHit + namesHit > 0,
  };
}

/** Fewer comparable words than this and a Hindi sentence can never be said to restate the English text. */
export const MIN_COMPARABLE = 3;

/**
 * Hindi counterpart of `sentenceCoveredBy`: at least 70% of the statement's comparable words are in
 * the sentence, including at least one of its anchors.
 */
export function hindiSentenceCovers(hindiSentence: string, statement: string): boolean {
  const m = crossMatch(hindiSentence, statement);
  return m.total >= MIN_COMPARABLE && m.anchorPresent && m.matched / m.total >= 0.7;
}

/**
 * Hindi counterpart of `restatesConclusion`: every anchor of the conclusion (numbers, planets,
 * signs, yoga names) is in the sentence and at least 60% of its comparable words are.
 */
export function hindiRestatesConclusion(hindiSentence: string, conclusion: string): boolean {
  const m = crossMatch(hindiSentence, conclusion);
  return m.total >= MIN_COMPARABLE && m.anchorsComplete && m.matched / m.total >= 0.6;
}

/** Hindi counterpart of `overlap`: share of the English text's comparable words found in the sentence (0 when fewer than two can be compared). */
export function hindiOverlap(hindiSentence: string, english: string): number {
  const m = crossMatch(hindiSentence, english);
  return m.total >= 2 ? m.matched / m.total : 0;
}

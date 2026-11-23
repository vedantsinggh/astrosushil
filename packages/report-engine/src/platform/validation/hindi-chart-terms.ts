/**
 * Hindi (Devanagari) chart vocabulary shared by the validators: planets, signs,
 * house ordinals, house-lord compounds, numbers and months, each mapped to the
 * English value the evidence registry uses. Recognition only: nothing here
 * calculates or decides astrology.
 *
 * JS `\b` does not work for Devanagari, so word edges use Unicode letter/mark
 * look-arounds (HI_EDGE_L / HI_EDGE_R).
 */
export const HI_EDGE_L = '(?<![\\p{L}\\p{M}])';
export const HI_EDGE_R = '(?![\\p{L}\\p{M}])';

/** Longest alternative first, so "चंद्रमा" is not read as "चंद्र" + "मा". */
export const altOf = (xs: readonly string[]): string => [...xs].sort((a, b) => b.length - a.length).join('|');

/** Devanagari digits (०-९) as ASCII digits; everything else unchanged. */
export const toAsciiDigits = (text: string): string => text.replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x0966));

/** Glossary names (platform/i18n/hindi.ts PLANET_HI) plus the other names in common use. */
export const HI_PLANETS: ReadonlyArray<[string, string]> = [
  ['सूर्य', 'Sun'], ['रवि', 'Sun'], ['चंद्रमा', 'Moon'], ['चन्द्रमा', 'Moon'], ['चंद्र', 'Moon'], ['चन्द्र', 'Moon'], ['मंगल', 'Mars'], ['भौम', 'Mars'],
  ['बुध', 'Mercury'], ['बृहस्पति', 'Jupiter'], ['वृहस्पति', 'Jupiter'], ['गुरु', 'Jupiter'], ['शुक्र', 'Venus'], ['शनि', 'Saturn'], ['शनिदेव', 'Saturn'],
  ['राहु', 'Rahu'], ['राहू', 'Rahu'], ['केतु', 'Ketu'], ['केतू', 'Ketu'],
];
export const HI_SIGNS: ReadonlyArray<[string, string]> = [
  ['मेष', 'Aries'], ['वृषभ', 'Taurus'], ['वृष', 'Taurus'], ['मिथुन', 'Gemini'], ['कर्क', 'Cancer'], ['सिंह', 'Leo'], ['कन्या', 'Virgo'],
  ['तुला', 'Libra'], ['वृश्चिक', 'Scorpio'], ['धनु', 'Sagittarius'], ['मकर', 'Capricorn'], ['कुंभ', 'Aquarius'], ['कुम्भ', 'Aquarius'], ['मीन', 'Pisces'],
];
export const HI_ORDINAL_STEMS: ReadonlyArray<[string, number]> = [
  ['पहल', 1], ['प्रथम', 1], ['दूसर', 2], ['द्वितीय', 2], ['तीसर', 3], ['तृतीय', 3], ['चौथ', 4], ['चतुर्थ', 4],
  ['पाँचव', 5], ['पांचव', 5], ['पंचम', 5], ['छठ', 6], ['षष्ठ', 6], ['सातव', 7], ['सप्तम', 7], ['आठव', 8], ['अष्टम', 8],
  ['नौव', 9], ['नवम', 9], ['नव', 9], ['दसव', 10], ['दशम', 10], ['ग्यारहव', 11], ['एकादश', 11], ['बारहव', 12], ['द्वादश', 12],
];
/** Ordinal endings: वें, वे, वाँ, वां, वीं, ें, े, ाँ, ां, ीं, ा, ी. */
const ORDINAL_ENDING = '(?:वें|वे|वाँ|वां|वीं|ें|े|ाँ|ां|ीं|ा|ी)';
/** Tatsama ordinals stand alone ("दशम भाव"); the others need an ending ("दसवें"), so "नव" (new) is not 9. */
const BARE_ORDINALS = new Set(['प्रथम', 'द्वितीय', 'तृतीय', 'चतुर्थ', 'पंचम', 'षष्ठ', 'सप्तम', 'अष्टम', 'नवम', 'दशम', 'एकादश', 'द्वादश']);

export const HI_PLANET_RE = altOf(HI_PLANETS.map(([h]) => h));
export const HI_SIGN_RE = altOf(HI_SIGNS.map(([h]) => h));
/** Group 1: ordinal stem; group 2: digits ("10वें", "10 वें"). Run on text passed through toAsciiDigits. */
export const HI_ORDINAL_RE = `(?:(${altOf(HI_ORDINAL_STEMS.map(([h]) => h))})${ORDINAL_ENDING}?|(\\d{1,2})\\s*(?:वें|वे|वाँ|वां|वीं))`;

export function hiPlanet(word: string): string | undefined {
  return HI_PLANETS.find(([h]) => h === word)?.[1];
}
export function hiSign(word: string): string | undefined {
  return HI_SIGNS.find(([h]) => h === word)?.[1];
}
export function hiOrdinal(stem: string | undefined, digits: string | undefined): number | undefined {
  if (digits) return Number(digits);
  return HI_ORDINAL_STEMS.find(([h]) => h === stem)?.[1];
}

const ORDINAL_TOKEN_RE = new RegExp(`^(?:(${altOf(HI_ORDINAL_STEMS.map(([h]) => h))})(${ORDINAL_ENDING})?|(\\d{1,2})(?:वें|वे|वाँ|वां|वीं))$`, 'u');
/** A single word as a house ordinal: "दसवें", "दशम", "10वें" → 10; undefined for anything else. */
export function hiOrdinalToken(token: string): number | undefined {
  const m = ORDINAL_TOKEN_RE.exec(token);
  if (!m) return undefined;
  if (m[3]) return Number(m[3]);
  if (!m[2] && !BARE_ORDINALS.has(m[1])) return undefined;
  return hiOrdinal(m[1], undefined);
}

/** House-lord compounds: the lord of the n-th house counted from the Ascendant. */
export const HI_HOUSE_LORDS: ReadonlyArray<[string, number]> = [
  ['लग्नेश', 1], ['प्रथमेश', 1], ['द्वितीयेश', 2], ['धनेश', 2], ['तृतीयेश', 3], ['चतुर्थेश', 4], ['सुखेश', 4], ['पंचमेश', 5], ['षष्ठेश', 6],
  ['सप्तमेश', 7], ['अष्टमेश', 8], ['नवमेश', 9], ['भाग्येश', 9], ['दशमेश', 10], ['कर्मेश', 10], ['एकादशेश', 11], ['लाभेश', 11], ['द्वादशेश', 12], ['व्ययेश', 12],
];

/** Houses known by a fixed name: "कर्म भाव" is the 10th house. Only the names in universal use. */
export const HI_NAMED_HOUSES: ReadonlyArray<[string, number]> = [
  ['धन', 2], ['सुख', 4], ['भाग्य', 9], ['कर्म', 10], ['लाभ', 11], ['व्यय', 12],
];

/** Hindi month names → month number. */
export const HI_MONTHS: ReadonlyArray<[string, number]> = [
  ['जनवरी', 1], ['फरवरी', 2], ['फ़रवरी', 2], ['मार्च', 3], ['अप्रैल', 4], ['मई', 5], ['जून', 6], ['जुलाई', 7], ['अगस्त', 8],
  ['सितंबर', 9], ['सितम्बर', 9], ['अक्टूबर', 10], ['अक्तूबर', 10], ['नवंबर', 11], ['नवम्बर', 11], ['दिसंबर', 12], ['दिसम्बर', 12],
];
export const HI_MONTH_RE = altOf(HI_MONTHS.map(([h]) => h));
const EN_MONTH = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Hindi dates in the form the English date reader understands: "२० नवंबर 2026" → "20 Nov 2026".
 * Only digits and month names change; text without Devanagari is returned unchanged.
 */
export function hindiDatesToEnglish(text: string): string {
  if (!/[ऀ-ॿ]/.test(text)) return text;
  const re = new RegExp(`${HI_EDGE_L}(${HI_MONTH_RE})${HI_EDGE_R}`, 'gu');
  return toAsciiDigits(text).replace(re, (_, m: string) => EN_MONTH[HI_MONTHS.find(([h]) => h === m)![1]]);
}

/** Hindi cardinal numbers 1–99 (the usual spellings and their common variants). */
export const HI_NUMBER_WORDS: ReadonlyArray<[string, number]> = [
  ['एक', 1], ['दो', 2], ['तीन', 3], ['चार', 4], ['पाँच', 5], ['पांच', 5], ['छह', 6], ['छः', 6], ['छे', 6], ['सात', 7], ['आठ', 8], ['नौ', 9], ['दस', 10],
  ['ग्यारह', 11], ['बारह', 12], ['तेरह', 13], ['चौदह', 14], ['पंद्रह', 15], ['पन्द्रह', 15], ['सोलह', 16], ['सत्रह', 17], ['अठारह', 18], ['उन्नीस', 19], ['बीस', 20],
  ['इक्कीस', 21], ['बाईस', 22], ['तेईस', 23], ['चौबीस', 24], ['पच्चीस', 25], ['छब्बीस', 26], ['सत्ताईस', 27], ['अट्ठाईस', 28], ['उनतीस', 29], ['तीस', 30],
  ['इकतीस', 31], ['बत्तीस', 32], ['तैंतीस', 33], ['चौंतीस', 34], ['पैंतीस', 35], ['छत्तीस', 36], ['सैंतीस', 37], ['अड़तीस', 38], ['उनतालीस', 39], ['चालीस', 40],
  ['इकतालीस', 41], ['बयालीस', 42], ['तैंतालीस', 43], ['चौवालीस', 44], ['पैंतालीस', 45], ['छियालीस', 46], ['सैंतालीस', 47], ['अड़तालीस', 48], ['उनचास', 49], ['पचास', 50],
  ['इक्यावन', 51], ['बावन', 52], ['तिरपन', 53], ['चौवन', 54], ['पचपन', 55], ['छप्पन', 56], ['सत्तावन', 57], ['अट्ठावन', 58], ['उनसठ', 59], ['साठ', 60],
  ['इकसठ', 61], ['बासठ', 62], ['तिरसठ', 63], ['चौंसठ', 64], ['पैंसठ', 65], ['छियासठ', 66], ['सड़सठ', 67], ['अड़सठ', 68], ['उनहत्तर', 69], ['सत्तर', 70],
  ['इकहत्तर', 71], ['बहत्तर', 72], ['तिहत्तर', 73], ['चौहत्तर', 74], ['पचहत्तर', 75], ['छिहत्तर', 76], ['सतहत्तर', 77], ['अठहत्तर', 78], ['उनासी', 79], ['अस्सी', 80],
  ['इक्यासी', 81], ['बयासी', 82], ['तिरासी', 83], ['चौरासी', 84], ['पचासी', 85], ['छियासी', 86], ['सत्तासी', 87], ['अट्ठासी', 88], ['नवासी', 89], ['नब्बे', 90],
  ['इक्यानवे', 91], ['बानवे', 92], ['तिरानवे', 93], ['चौरानवे', 94], ['पंचानवे', 95], ['छियानवे', 96], ['सत्तानवे', 97], ['अट्ठानवे', 98], ['निन्यानवे', 99],
];
const NUMBER_BY_WORD = new Map(HI_NUMBER_WORDS);
export const HI_NUMBER_WORD_RE = altOf(HI_NUMBER_WORDS.map(([h]) => h));

/** "उनतीस" → 29, "29" / "२९" → 29; undefined for anything else. */
export function hiNumber(token: string): number | undefined {
  const t = toAsciiDigits(token.trim());
  if (/^\d{1,3}$/.test(t)) return Number(t);
  return NUMBER_BY_WORD.get(t);
}

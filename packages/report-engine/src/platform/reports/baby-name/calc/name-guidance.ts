/**
 * Classical baby-name guidance (BAB-001 … BAB-004).
 *
 * 1. Namakshara: the syllable of the Moon's nakshatra pada at birth (the
 *    avakahada / "Hoda chakra" table of 108 syllables). The engine's table
 *    (`NAKSHATRA_NAMAKSHARAS`) is used, with one correction: Ashlesha pada 1 is
 *    "Di" (डी), not "De" (BAB-001).
 * 2. Rashi syllables: the syllables of the nine padas that fall in the Moon sign.
 * 3. Numerology fit: each name number 1–9 is classified against the child's
 *    Mulank and Bhagyank using the natural planetary friendships (NUM-014).
 * 4. Candidate names (optional input from the parents) are evaluated
 *    deterministically: Chaldean numbers, planes of expression and whether they
 *    begin with a traditional syllable.
 */
import { NAKSHATRA_NAMAKSHARAS } from '@astro/astrology-engine';
import { numberHarmony, NUMBER_PLANET } from '../../_numerology-shared/associations';
import { chaldeanNameNumber, NamePlanes, namePlanes, NameNumber, nameLetters, personalityNumber, soulUrgeNumber } from '../../_numerology-shared/numerology';

/** Devanagari form of each syllable, same order as the engine table. */
export const NAMAKSHARA_DEVANAGARI: Record<number, [string, string, string, string]> = {
  1: ['चू', 'चे', 'चो', 'ला'], 2: ['ली', 'लू', 'ले', 'लो'], 3: ['अ', 'ई', 'उ', 'ए'], 4: ['ओ', 'वा', 'वी', 'वू'],
  5: ['वे', 'वो', 'का', 'की'], 6: ['कू', 'घ', 'ङ', 'छ'], 7: ['के', 'को', 'हा', 'ही'], 8: ['हू', 'हे', 'हो', 'डा'],
  9: ['डी', 'डू', 'डे', 'डो'], 10: ['मा', 'मी', 'मू', 'मे'], 11: ['मो', 'टा', 'टी', 'टू'], 12: ['टे', 'टो', 'पा', 'पी'],
  13: ['पू', 'ष', 'ण', 'ठ'], 14: ['पे', 'पो', 'रा', 'री'], 15: ['रू', 'रे', 'रो', 'ता'], 16: ['ती', 'तू', 'ते', 'तो'],
  17: ['ना', 'नी', 'नू', 'ने'], 18: ['नो', 'या', 'यी', 'यू'], 19: ['ये', 'यो', 'भा', 'भी'], 20: ['भू', 'धा', 'फा', 'ढा'],
  21: ['भे', 'भो', 'जा', 'जी'], 22: ['खी', 'खू', 'खे', 'खो'], 23: ['गा', 'गी', 'गू', 'गे'], 24: ['गो', 'सा', 'सी', 'सू'],
  25: ['से', 'सो', 'दा', 'दी'], 26: ['दू', 'थ', 'झ', 'ञ'], 27: ['दे', 'दो', 'चा', 'ची'],
};

/** Latin syllables: the engine table with the Ashlesha pada-1 correction (BAB-001). */
export function namaksharaTable(): Record<number, [string, string, string, string]> {
  const t: Record<number, [string, string, string, string]> = {};
  for (let i = 1; i <= 27; i++) t[i] = [...NAKSHATRA_NAMAKSHARAS[i]] as [string, string, string, string];
  t[9][0] = 'Di';
  return t;
}

export interface Syllable {
  nakshatraIndex: number;
  pada: number;
  latin: string;
  devanagari: string;
}

export const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni',
  'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha',
  'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

export function syllableOf(nakshatraIndex: number, pada: number): Syllable {
  const t = namaksharaTable();
  return { nakshatraIndex, pada, latin: t[nakshatraIndex][pada - 1], devanagari: NAMAKSHARA_DEVANAGARI[nakshatraIndex][pada - 1] };
}

/** The nine pada syllables of a sign (sign 1 = Aries): padas (s−1)·9 … s·9−1 of the 108. */
export function rashiSyllables(signIndex: number): Syllable[] {
  const out: Syllable[] = [];
  for (let g = (signIndex - 1) * 9; g < signIndex * 9; g++) out.push(syllableOf(Math.floor(g / 4) + 1, (g % 4) + 1));
  return out;
}

export type NumberFit = 'supportive' | 'workable' | 'needs-care';

/** BAB-003 Name number fit against Mulank and Bhagyank. */
export function numberFit(n: number, mulank: number, bhagyank: number): NumberFit {
  const a = numberHarmony(mulank, n);
  const b = numberHarmony(bhagyank, n);
  const good = (h: string) => h === 'same' || h === 'harmonious';
  if (good(a) && good(b)) return 'supportive';
  if (a === 'demanding' || b === 'demanding') return 'needs-care';
  return 'workable';
}

export type SyllableMatch = 'pada' | 'nakshatra' | 'rashi' | 'none';

/** Latin spellings a syllable may take at the start of a name (long vowels doubled, Sh/S, Ch/C variants). */
export function syllableVariants(s: string): string[] {
  const base = s.toLowerCase();
  const v = new Set([base]);
  if (/[aiu]$/.test(base)) v.add(base + base.slice(-1)); // Ma → Maa, Ni → Nii
  if (base.endsWith('i')) v.add(base.slice(0, -1) + 'ee');
  if (base.endsWith('u')) v.add(base.slice(0, -1) + 'oo');
  if (base.endsWith('e')) v.add(base.slice(0, -1) + 'ai');
  if (base.endsWith('o')) v.add(base.slice(0, -1) + 'au');
  return [...v];
}

/** BAB-004 Does the name begin with one of the syllables? Long-vowel spellings are tried first. */
export function startsWithSyllable(name: string, syllables: string[]): boolean {
  const n = nameLetters(name).join('').toLowerCase();
  return syllables.some((s) => syllableVariants(s).some((v) => n.startsWith(v)));
}

export interface CandidateEvaluation {
  index: number;
  name: string;
  number: NameNumber;
  soulUrge: NameNumber;
  personality: NameNumber;
  planes: NamePlanes;
  fit: NumberFit;
  match: SyllableMatch;
}

export interface NameGuidance {
  janma: { nakshatraIndex: number; nakshatra: string; pada: number; moonSign: string; moonSignIndex: number };
  primary: Syllable;
  nakshatraSyllables: Syllable[];
  rashiSyllables: Syllable[];
  fits: Record<number, NumberFit>;
  candidates: CandidateEvaluation[];
}

const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

export function computeNameGuidance(input: { moonNakshatraIndex: number; moonPada: number; moonSignIndex: number; mulank: number; bhagyank: number; candidateNames: string[] }): NameGuidance {
  const primary = syllableOf(input.moonNakshatraIndex, input.moonPada);
  const nak = [1, 2, 3, 4].map((p) => syllableOf(input.moonNakshatraIndex, p));
  const rashi = rashiSyllables(input.moonSignIndex);
  const fits: Record<number, NumberFit> = {};
  for (let n = 1; n <= 9; n++) fits[n] = numberFit(n, input.mulank, input.bhagyank);
  const candidates = input.candidateNames
    .map((name) => name.trim())
    .filter((name) => nameLetters(name).length > 0)
    .slice(0, 5)
    .map((name, i) => {
      const number = chaldeanNameNumber(name);
      const match: SyllableMatch = startsWithSyllable(name, [primary.latin]) ? 'pada'
        : startsWithSyllable(name, nak.map((s) => s.latin)) ? 'nakshatra'
        : startsWithSyllable(name, rashi.map((s) => s.latin)) ? 'rashi' : 'none';
      return {
        index: i + 1, name, number, soulUrge: soulUrgeNumber(name), personality: personalityNumber(name),
        planes: namePlanes(name), fit: fits[number.value], match,
      };
    });
  return {
    janma: { nakshatraIndex: input.moonNakshatraIndex, nakshatra: NAKSHATRA_NAMES[input.moonNakshatraIndex - 1], pada: input.moonPada, moonSign: SIGNS[input.moonSignIndex - 1], moonSignIndex: input.moonSignIndex },
    primary,
    nakshatraSyllables: nak,
    rashiSyllables: rashi,
    fits,
    candidates,
  };
}

export const FIT_LABEL: Record<NumberFit, string> = { supportive: 'Supportive', workable: 'Workable', 'needs-care': 'Needs care' };
export const MATCH_LABEL: Record<SyllableMatch, string> = {
  pada: 'Begins with the birth-pada syllable',
  nakshatra: 'Begins with a syllable of the birth nakshatra',
  rashi: 'Begins with a syllable of the Moon sign',
  none: 'Does not begin with a traditional syllable',
};
export { NUMBER_PLANET };

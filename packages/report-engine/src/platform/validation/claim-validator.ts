/**
 * Claim validator.
 *
 * Treats LLM output as untrusted. A claim is `verified` only when:
 *   1. every cited evidence ID exists in the registry of the *current* snapshot,
 *   2. every cited ID is within the topic's allowed evidence scope, and
 *   3. the statement's checkable facts agree with the cited evidence values
 *      (and at least one such fact or value actually appears in the statement).
 *
 * Independently of the claims, the narrative text is scanned for planet/house/
 * sign assertions and each is re-checked against the snapshot, so an LLM cannot
 * slip an unsupported placement into prose by simply not citing it.
 */
import {
  ClaimValidation,
  GeneratedTopicPayload,
  ReportTopic,
  TopicValidationResult,
  ValidationIssue,
} from '../contracts';
import { EvidenceRegistry, PLANETS, SIGNS, ordinal } from '../evidence/evidence-registry';

const PLANET_RE = PLANETS.join('|');
const SIGN_RE = SIGNS.join('|');
/** Words that signal the sentence is about a transit, a divisional chart or a hypothetical, not natal D1. */
const NON_NATAL_CONTEXT = new RegExp(
  [
    // transits and hypotheticals
    'transit', 'transiting', 'gochar', 'moves? (?:into|through)', 'will (?:enter|move)', 'ingress', 'if ', 'when a', 'whenever', 'generally', 'traditionally', 'in general',
    // divisional charts (D2–D60 and their names)
    'd(?:2|3|4|7|9|10|12|16|20|24|27|30|40|45|60)\\b', 'divisional', 'navamsh?a', 'dasamsa', 'dashamsh?a', 'hora chart', 'drekkana', 'saptamsh?a', 'dwadasamsh?a',
    'shodasamsh?a', 'vimsamsh?a', 'chaturvimsamsh?a', 'bhamsa', 'trimsamsh?a', 'khavedamsh?a', 'akshavedamsh?a', 'shashtiamsh?a', 'varga',
    // annual / Tajik charts
    'varsha', 'varshaphal', 'annual chart', "year'?s chart", 'solar return', 'tajik', 'muntha',
    // houses counted from another reference point
    'from (?:the|your) (?:natal )?(?:moon|sun|lagna|ascendant|karakamsha|atmakaraka)', 'counted from', 'chandra lagna', 'moon chart',
  ].map((t) => `\\b${t}`).join('|'),
  'i'
);
/** Sentences about the second native in two-person reports. */
const PARTNER_CONTEXT = /\b(partner'?s?|spouse'?s|their)\b|^\s*partner:/i;

const ORDINAL_WORDS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6,
  seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12,
};

function parseHouseNumber(token: string): number | undefined {
  const m = /^(\d{1,2})(?:st|nd|rd|th)$/i.exec(token);
  if (m) return Number(m[1]);
  return ORDINAL_WORDS[token.toLowerCase()];
}

interface NatalAssertion {
  /** Whose chart the sentence describes. */
  who?: 'native' | 'partner';
  planet: string;
  house?: number;
  sign?: string;
  text: string;
}

// ---------------------------------------------------------------------------
// Hindi (Devanagari) recognition, so Hindi narrative is checked as strictly as
// English. Hindi words map to the English planet/sign names used by the
// registry. JS \b does not work for Devanagari, so word edges use Unicode
// letter/mark look-arounds.
// ---------------------------------------------------------------------------

const HI_PLANETS: Array<[string, string]> = [
  ['सूर्य', 'Sun'], ['चंद्रमा', 'Moon'], ['चन्द्रमा', 'Moon'], ['चंद्र', 'Moon'], ['चन्द्र', 'Moon'], ['मंगल', 'Mars'], ['बुध', 'Mercury'],
  ['बृहस्पति', 'Jupiter'], ['गुरु', 'Jupiter'], ['शुक्र', 'Venus'], ['शनि', 'Saturn'], ['राहु', 'Rahu'], ['केतु', 'Ketu'],
];
const HI_SIGNS: Array<[string, string]> = [
  ['मेष', 'Aries'], ['वृषभ', 'Taurus'], ['वृष', 'Taurus'], ['मिथुन', 'Gemini'], ['कर्क', 'Cancer'], ['सिंह', 'Leo'], ['कन्या', 'Virgo'],
  ['तुला', 'Libra'], ['वृश्चिक', 'Scorpio'], ['धनु', 'Sagittarius'], ['मकर', 'Capricorn'], ['कुंभ', 'Aquarius'], ['कुम्भ', 'Aquarius'], ['मीन', 'Pisces'],
];
const HI_ORDINAL_STEMS: Array<[string, number]> = [
  ['पहल', 1], ['प्रथम', 1], ['दूसर', 2], ['द्वितीय', 2], ['तीसर', 3], ['तृतीय', 3], ['चौथ', 4], ['चतुर्थ', 4],
  ['पाँचव', 5], ['पांचव', 5], ['पंचम', 5], ['छठ', 6], ['षष्ठ', 6], ['सातव', 7], ['सप्तम', 7], ['आठव', 8], ['अष्टम', 8],
  ['नौव', 9], ['नवम', 9], ['नव', 9], ['दसव', 10], ['दशम', 10], ['ग्यारहव', 11], ['एकादश', 11], ['बारहव', 12], ['द्वादश', 12],
];
const HI_EDGE_L = '(?<![\\p{L}\\p{M}])';
const HI_EDGE_R = '(?![\\p{L}\\p{M}])';
const altOf = (xs: string[]) => [...xs].sort((a, b) => b.length - a.length).join('|');
const HI_PLANET_RE = altOf(HI_PLANETS.map(([h]) => h));
const HI_SIGN_RE = altOf(HI_SIGNS.map(([h]) => h));
/** Ordinal stem + oblique/direct ending (वें, वे, वाँ, वां, ा, े, ी), or a digit with वें/वे. */
const HI_ORDINAL_RE = `(?:(${altOf(HI_ORDINAL_STEMS.map(([h]) => h))})(?:वें|वे|वाँ|वां|वीं|ें|े|ा|ी)?|(\\d{1,2})\\s*(?:वें|वे|वाँ|वां))`;
const HI_NON_NATAL = /(गोचर|नवांश|दशमांश|वर्ग\s*कुंडली|यदि|अगर|जब\s|सामान्यतः|सामान्य\s+रूप|परंपरागत\s+रूप|प्रवेश\s+करेग|डी9|डी10|D9|D10)/;

function hiPlanet(word: string): string {
  return HI_PLANETS.find(([h]) => h === word)![1];
}
function hiOrdinal(stem: string | undefined, digits: string | undefined): number | undefined {
  if (digits) return Number(digits);
  return HI_ORDINAL_STEMS.find(([h]) => h === stem)?.[1];
}

/** Hindi assertions: "<ग्रह> … <क्रम> भाव/घर में" and "<ग्रह> … <राशि> (राशि) में". */
function extractHindiAssertions(sentence: string): NatalAssertion[] {
  const out: NatalAssertion[] = [];
  if (HI_NON_NATAL.test(sentence)) return out;
  const houseRe = new RegExp(`${HI_EDGE_L}(${HI_PLANET_RE})${HI_EDGE_R}[^।.;:]{0,40}?${HI_EDGE_L}${HI_ORDINAL_RE}\\s*(?:भाव|घर|स्थान)(?:\\s*में|\\s*मे)`, 'gu');
  const signRe = new RegExp(`${HI_EDGE_L}(${HI_PLANET_RE})${HI_EDGE_R}[^।.;:]{0,30}?${HI_EDGE_L}(${HI_SIGN_RE})${HI_EDGE_R}\\s*(?:राशि\\s*)?(?:में|मे)`, 'gu');
  let m: RegExpExecArray | null;
  while ((m = houseRe.exec(sentence))) {
    const house = hiOrdinal(m[2], m[3]);
    if (house && house >= 1 && house <= 12) out.push({ planet: hiPlanet(m[1]), house, text: sentence });
  }
  while ((m = signRe.exec(sentence))) {
    out.push({ planet: hiPlanet(m[1]), sign: HI_SIGNS.find(([h]) => h === m![2])![1], text: sentence });
  }
  return out;
}

/** Extract "<Planet> … in the <n>th house" and "<Planet> … in <Sign>" assertions sentence by sentence (English and Hindi). */
export function extractNatalAssertions(text: string): NatalAssertion[] {
  const out: NatalAssertion[] = [];
  const sentences = text.split(/(?<=[.!?।])\s+/);
  const houseRe = new RegExp(
    `\\b(${PLANET_RE})\\b(?:[^.;:]{0,40}?)\\b(?:in|occupies|occupying|placed in|sits in|resides in|located in)\\s+(?:your|the)\\s+(\\d{1,2}(?:st|nd|rd|th)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\\s+house`,
    'gi'
  );
  const signRe = new RegExp(
    `\\b(${PLANET_RE})\\b(?:[^.;:]{0,25}?)\\b(?:in|occupies|placed in|sits in|located in)\\s+(${SIGN_RE})\\b`,
    'gi'
  );
  for (const s of sentences) {
    if (/[\u0900-\u097F]/.test(s)) out.push(...extractHindiAssertions(s));
    if (NON_NATAL_CONTEXT.test(s)) continue;
    const who: 'native' | 'partner' = PARTNER_CONTEXT.test(s) ? 'partner' : 'native';
    let m: RegExpExecArray | null;
    houseRe.lastIndex = 0;
    while ((m = houseRe.exec(s))) {
      const house = parseHouseNumber(m[2]);
      if (house) out.push({ planet: m[1], house, text: s, who });
    }
    signRe.lastIndex = 0;
    while ((m = signRe.exec(s))) out.push({ planet: m[1], sign: m[2], text: s, who });
  }
  return out;
}

function normalisePlanet(p: string): string {
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
}

/**
 * Check a placement assertion against the registry. Returns an error message or null.
 *
 * The D1 (natal) value is always acceptable. A value from a divisional chart
 * (D9, D10, …) is also acceptable when the topic is allowed to cite that
 * chart's placement — e.g. a D10 topic saying "Mercury in Pisces" when the D10
 * Mercury is in Pisces. A statement matching none of the in-scope charts is a
 * contradiction.
 */
function checkAssertion(a: NatalAssertion, registry: EvidenceRegistry, allowed: string[] = []): string | null {
  const key = normalisePlanet(a.planet).toLowerCase();
  // Partner sentences are checked against the partner's chart when one exists;
  // otherwise (e.g. a hypothetical future partner) they cannot be checked here.
  const prefix = a.who === 'partner' ? 'partner.' : '';
  if (a.who === 'partner' && !registry.has(`partner.planet.${key}.d1.house`)) return null;
  const inScope = (field: 'house' | 'sign') =>
    registry
      .resolve([`${prefix}planet.${key}.d*.${field}`])
      .filter((ev) => ev.id === `${prefix}planet.${key}.d1.${field}` || EvidenceRegistry.matches(ev.id, allowed));
  if (a.house !== undefined) {
    const evs = inScope('house');
    const natal = registry.get(`${prefix}planet.${key}.d1.house`);
    if (natal && !evs.some((ev) => ev.value === a.house)) {
      return `States ${normalisePlanet(a.planet)} in the ${ordinal(a.house)} house; chart has it in the ${ordinal(Number(natal.value))}`;
    }
  }
  if (a.sign !== undefined) {
    const evs = inScope('sign');
    const natal = registry.get(`${prefix}planet.${key}.d1.sign`);
    if (natal && !evs.some((ev) => String(ev.value).toLowerCase() === a.sign!.toLowerCase())) {
      return `States ${normalisePlanet(a.planet)} in ${a.sign}; chart has it in ${natal.value}`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Transit assertions (proposal §5 V3; audit F2). Applies to every topic.
//
// "Saturn transits (through) your 12th house" used to be skipped because the
// sentence contains "transit". It is now checked against the transit evidence
// in the registry: the sign the planet occupies in a computed transit period,
// with the house counted from the Ascendant (or the Moon, when the sentence
// says so) derived from that sign.
// ---------------------------------------------------------------------------

export interface TransitAssertion {
  planet: string;
  house?: number;
  sign?: string;
  /** House counted from the natal Moon instead of the Ascendant. */
  fromMoon: boolean;
  /**
   * 'current': present tense with no other time marker (checked against the period in progress);
   * 'dated': the sentence names years (checked against the periods overlapping them);
   * 'undated': future or descriptive without a date (not checkable: the computed periods cover a limited horizon).
   */
  tense: 'current' | 'dated' | 'undated';
  /** Year span named in the sentence ('dated' only). */
  years?: [number, number];
  text: string;
}

const HOUSE_TOKEN = '(\\d{1,2}(?:st|nd|rd|th)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)';
const TRANSIT_TARGET = `(?:\\s+(?:through|into|across|over|in|of|thru))?\\s+(?:(?:your|the)\\s+(?:natal\\s+)?${HOUSE_TOKEN}(?:\\s+house)?|(${SIGN_RE})\\b)`;
/** Finite verb forms: "Saturn transits", "Saturn is transiting", "Saturn moves through". */
const TRANSIT_VERB_RE = new RegExp(
  `\\b(${PLANET_RE})\\b\\s+(?:is\\s+|are\\s+|will\\s+|currently\\s+|now\\s+)?(?:currently\\s+|now\\s+|be\\s+)?(transits?|transiting|transit|moves?|moving|passes|passing|enters?|entering|travels?|travelling|traveling)(?:\\s+(?:through|into|across|over|thru))?` +
    `\\s+(?:(?:your|the)\\s+(?:natal\\s+)?${HOUSE_TOKEN}(?:\\s+house)?|(${SIGN_RE})\\b)`,
  'gi'
);
/** Participle / noun forms: "transiting Saturn in Pisces", "Saturn's transit through your 10th house". */
const TRANSIT_NOUN_RE = new RegExp(
  `(?:\\btransiting\\s+(${PLANET_RE})\\b(?:\\s+(?:occupies|occupying|is in|sits in))?|\\b(${PLANET_RE})(?:'s)?\\s+transit)${TRANSIT_TARGET}`,
  'gi'
);
const PAST_TENSE = /\b(?:transited|was transiting|were transiting|moved through|passed through|previous(?:ly)?|last time|earlier transit|in the past)\b/i;
const HYPOTHETICAL = /\b(?:if|whenever|each time|every time|generally|traditionally|in general|typically|usually|classically)\b/i;
const MONTHS = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
/** Anything that ties the statement to a time other than "now". */
const NON_CURRENT_MARKER = new RegExp(
  `\\b(?:will|shall|next|upcoming|following|later|future|after|before|until|till|between|when|once|(?:19|20|21)\\d{2}|${MONTHS})\\b`,
  'i'
);
const FROM_MOON = /\bfrom\s+(?:the\s+|your\s+)?(?:natal\s+)?(?:moon|chandra)\b/i;

/** Extract transit assertions sentence by sentence (English only; partner and past/hypothetical sentences are skipped). */
export function extractTransitAssertions(text: string): TransitAssertion[] {
  const out: TransitAssertion[] = [];
  for (const s of text.split(/(?<=[.!?।])\s+/)) {
    if (PARTNER_CONTEXT.test(s) || PAST_TENSE.test(s) || HYPOTHETICAL.test(s)) continue;
    const anyTime = NON_CURRENT_MARKER.test(s);
    const yearList = [...s.matchAll(/\b((?:19|20|21)\d{2})\b/g)].map((y) => Number(y[1]));
    const years: [number, number] | undefined = yearList.length ? [Math.min(...yearList), Math.max(...yearList)] : undefined;
    const push = (planet: string, houseTok: string | undefined, sign: string | undefined, present: boolean, end: number) => {
      const house = houseTok ? parseHouseNumber(houseTok) : undefined;
      if (!house && !sign) return;
      const fromMoon = house !== undefined && FROM_MOON.test(s.slice(end, end + 40));
      const tense: TransitAssertion['tense'] = years ? 'dated' : present && !anyTime ? 'current' : 'undated';
      out.push({ planet: normalisePlanet(planet), house, sign, fromMoon, tense, years: tense === 'dated' ? years : undefined, text: s });
    };
    let m: RegExpExecArray | null;
    TRANSIT_VERB_RE.lastIndex = 0;
    while ((m = TRANSIT_VERB_RE.exec(s))) {
      const verb = m[2].toLowerCase();
      // "enters" is a dated event and the descriptive participle is handled below.
      const finite = !/^(?:enter|transiting|moving|passing|entering|travelling|traveling)/.test(verb) || /\b(?:is|are)\s+\w+ing\b/i.test(m[0]);
      push(m[1], m[3], m[4], finite, TRANSIT_VERB_RE.lastIndex);
    }
    TRANSIT_NOUN_RE.lastIndex = 0;
    // "Saturn's transit through X" reads as present; "transiting Saturn in X" is descriptive (any period).
    while ((m = TRANSIT_NOUN_RE.exec(s))) push(m[1] ?? m[2], m[3], m[4], m[2] !== undefined, TRANSIT_NOUN_RE.lastIndex);
  }
  const seen = new Set<string>();
  return out.filter((a) => {
    const k = `${a.planet}|${a.house}|${a.sign}|${a.fromMoon}|${a.text}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

interface TransitWindow {
  sign: string;
  current: boolean;
  /** YYYY-MM-DD bounds when the evidence carries them. */
  startIso?: string;
  endIso?: string;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const TRANSIT_EXCLUDED_SUFFIX = /\.(?:aspects|aspects-moon|aspected-natal|conjunct|bav|sav|retro|dates|status|house-asc|house-moon)$/;

/** Every transit sign period of a planet found in the registry (core, career, annual and transit-report evidence). */
export function transitWindows(registry: EvidenceRegistry, planet: string): TransitWindow[] {
  const p = planet.toLowerCase();
  // Integration guard: duck-typed evidence stores (e.g. apps/api RashiEvidenceStore, which the Rashi
  // Bhavishya narrator passes in place of a registry) have no natal snapshot. Without an as-of day only
  // `.current` IDs and in-progress stays count as current.
  const asOfDay = (registry as Partial<Pick<EvidenceRegistry, 'snapshot'>>).snapshot?.asOfIso?.slice(0, 10);
  const signOf = (v: unknown): string | undefined => {
    const first = Array.isArray(v) ? v[0] : v;
    return typeof first === 'string' && (SIGNS as readonly string[]).includes(first) ? first : undefined;
  };
  const out: TransitWindow[] = [];
  for (const item of registry.all()) {
    if (item.id.startsWith('partner.') || TRANSIT_EXCLUDED_SUFFIX.test(item.id)) continue;
    const period = new RegExp(`(?:^|\\.)transit\\.${p}\\.(?:\\d{2}|current|next\\.\\d{2})$`).test(item.id);
    const stay = new RegExp(`^${p}\\.transit\\.[a-z]\\.sign$`).test(item.id);
    if (!period && !stay) continue;
    const sign = signOf(item.value);
    if (!sign) continue;
    let current = item.id.endsWith('.current');
    let startIso: string | undefined;
    let endIso: string | undefined;
    if (stay) {
      const status = registry.get(item.id.replace(/\.sign$/, '.status'));
      current = status?.value === 'in progress';
    } else if (Array.isArray(item.value) && ISO_DAY.test(String(item.value[1])) && ISO_DAY.test(String(item.value[2]))) {
      startIso = String(item.value[1]);
      endIso = String(item.value[2]);
      current = current || (asOfDay !== undefined && startIso <= asOfDay && asOfDay < endIso);
    }
    out.push({ sign, current, startIso, endIso });
  }
  return out;
}

function houseFromSign(fromSign: string, sign: string): number {
  const a = (SIGNS as readonly string[]).indexOf(fromSign);
  const b = (SIGNS as readonly string[]).indexOf(sign);
  return ((b - a + 12) % 12) + 1;
}

/** Check a transit assertion against the registry. Returns an error message or null (also null when the planet has no transit data). */
export function checkTransitAssertion(a: TransitAssertion, registry: EvidenceRegistry): string | null {
  const all = transitWindows(registry, a.planet);
  let windows: TransitWindow[];
  let scope: string;
  if (a.tense === 'current') {
    windows = all.filter((w) => w.current);
    scope = 'currently transits';
  } else if (a.tense === 'dated' && a.years) {
    const [y0, y1] = a.years;
    const dated = all.filter((w) => w.startIso && w.endIso);
    const first = Math.min(...dated.map((w) => Number(w.startIso!.slice(0, 4))));
    const last = Math.max(...dated.map((w) => Number(w.endIso!.slice(0, 4))));
    // Only years fully inside the computed horizon can be confirmed or refuted.
    if (!dated.length || y0 < first || y1 > last) return null;
    windows = all.filter((w) => w.startIso && w.endIso && Number(w.startIso.slice(0, 4)) <= y1 && Number(w.endIso.slice(0, 4)) >= y0);
    scope = `transits in ${y0 === y1 ? y0 : `${y0}-${y1}`}`;
  } else {
    windows = []; // undated future/descriptive: beyond what the computed periods can confirm
    scope = '';
  }
  // Nothing to compare with (no transit data, or the dates lie outside the computed horizon): not checkable here.
  if (windows.length === 0) return null;
  const refSign = String(registry.get(a.fromMoon ? 'planet.moon.d1.sign' : 'asc.d1.sign')?.value ?? '');
  if (a.sign !== undefined && !windows.some((w) => w.sign.toLowerCase() === a.sign!.toLowerCase())) {
    return `States ${a.planet} transiting ${a.sign}; ${a.planet} ${scope} ${[...new Set(windows.map((w) => w.sign))].join(', ')}`;
  }
  if (a.house !== undefined && refSign) {
    const houses = [...new Set(windows.map((w) => houseFromSign(refSign, w.sign)))];
    if (!houses.includes(a.house)) {
      const ref = a.fromMoon ? 'from the Moon' : 'from the Ascendant';
      return `States ${a.planet} transiting the ${ordinal(a.house)} house ${ref}; ${a.planet} ${scope} the ${houses.map(ordinal).join(', ')} ${ref}`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Interpretation grounding: a claim citing an interp.* result is grounded when
// its statement restates the result's conclusion (most of the conclusion's
// content words, or the conclusion code's words).
// ---------------------------------------------------------------------------

const GROUNDING_STOP = new Set(['the', 'a', 'an', 'of', 'in', 'to', 'and', 'or', 'is', 'are', 'your', 'its', 'by', 'for', 'with', 'from', 'on', 'as', 'at', 'this', 'that']);
function contentWords(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !GROUNDING_STOP.has(w));
}

/**
 * Yoga results carry two vocabularies: the provisional yoga class in the conclusion code
 * (`YOGA_FORMED_STRONG|MODERATE|WEAK|CANCELLED`) and the set-logic strength class in the label
 * (`[mixed; …]`). A restatement may use either ("evaluated as mixed with a moderate
 * classification"), but it must name the yoga and must not state a different yoga class.
 */
const YOGA_CODE_RE = /^YOGA_FORMED_(STRONG|MODERATE|WEAK|CANCELLED)$/;
const YOGA_CLASS_WORDS: Readonly<Record<string, RegExp>> = {
  STRONG: /\bstrong\b/i,
  MODERATE: /\bmoderate\b/i,
  WEAK: /\bweak\b/i,
  CANCELLED: /\b(?:cancell?ed|cancell?ation)\b/i,
};
const STRENGTH_CLASS_WORDS: Readonly<Record<string, RegExp>> = {
  supported: /\bsupported\b/i,
  challenged: /\bchallenged\b/i,
  mixed: /\bmixed\b/i,
  neutral: /\bneutral\b/i,
};

/**
 * `true`: the statement names the yoga and states its class in either vocabulary; `false`: it
 * states a different yoga class (never grounded); `undefined`: not a yoga result, or
 * no class stated (the generic conclusion-word rule decides).
 */
export function yogaGrounded(label: string, value: unknown, statement: string): boolean | undefined {
  const m = YOGA_CODE_RE.exec(String(value));
  if (!m) return undefined;
  const yogaClass = m[1];
  const conclusion = label.split(' [')[0];
  const head = conclusion.split(/ \(| is formed\b/)[0];
  const s = new Set(contentWords(statement));
  const nameWords = contentWords(head);
  const namesYoga = nameWords.length > 0 && nameWords.every((w) => s.has(w));
  const strengthClass = /\[([a-z-]+)[;\]]/.exec(label)?.[1];
  const statesYogaClass = YOGA_CLASS_WORDS[yogaClass].test(statement);
  const statesStrength = strengthClass !== undefined && STRENGTH_CLASS_WORDS[strengthClass]?.test(statement) === true;
  const otherYogaClass = Object.entries(YOGA_CLASS_WORDS).some(([k, re]) => k !== yogaClass && re.test(statement));
  // Strength-class words are not checked for conflicts: "supported by", "neutral sign" are ordinary fact wording.
  if (otherYogaClass) return false;
  return namesYoga && (statesYogaClass || statesStrength) ? true : undefined;
}

export function interpretationGrounded(label: string, value: unknown, statement: string): boolean {
  const yoga = yogaGrounded(label, value, statement);
  if (yoga !== undefined) return yoga;
  const s = new Set(contentWords(statement));
  const conclusion = label.split(' [')[0];
  const words = [...new Set(contentWords(conclusion))];
  if (words.length && words.filter((w) => s.has(w)).length / words.length >= 0.5) return true;
  const codeWords = contentWords(String(value).replace(/_/g, ' '));
  return codeWords.length > 0 && codeWords.every((w) => s.has(w));
}

function valueAppears(value: unknown, statement: string): boolean {
  const s = statement.toLowerCase();
  const check = (v: unknown): boolean => {
    if (typeof v === 'number') return new RegExp(`\\b${v}(?:st|nd|rd|th)?\\b`).test(s) || (v >= 1 && v <= 12 && Object.entries(ORDINAL_WORDS).some(([w, n]) => n === v && s.includes(w)));
    if (typeof v === 'string') return v.length > 0 && s.includes(v.toLowerCase().replace(/_/g, ' '));
    if (typeof v === 'boolean') return true; // boolean facts are expressed in words; scope + text scan cover them
    return false;
  };
  if (Array.isArray(value)) return value.length === 0 ? /\b(no|none|unoccupied|alone|empty)\b/.test(s) : value.some(check);
  return check(value);
}

/** True when every required fact of the topic is an empty list (e.g. an unoccupied house, no aspects). */
export function isFactualAbsenceTopic(topic: ReportTopic, registry: EvidenceRegistry): boolean {
  const items = registry.resolve(topic.requiredEvidence);
  return items.length > 0 && items.every((i) => Array.isArray(i.value) && i.value.length === 0);
}

export interface ValidateTopicOptions {
  expectedSnapshotId: string;
  /** Evidence patterns this topic may cite (required + optional). */
  allowedEvidence: string[];
  minVerifiedClaims?: number;
}

export function validateGeneratedTopic(
  topic: ReportTopic,
  payload: GeneratedTopicPayload,
  registry: EvidenceRegistry,
  opts: ValidateTopicOptions
): TopicValidationResult {
  const issues: ValidationIssue[] = [];
  const claims: ClaimValidation[] = [];
  const verified = new Set<string>();

  if (registry.snapshotId !== opts.expectedSnapshotId) {
    issues.push({ severity: 'error', code: 'SNAPSHOT_MISMATCH', message: 'Registry snapshot differs from the report snapshot' });
  }
  if (payload.topicId !== topic.id) {
    issues.push({ severity: 'error', code: 'TOPIC_ID_MISMATCH', message: `Payload topicId ${payload.topicId} != ${topic.id}` });
  }

  for (const claim of payload.claims) {
    const reasons: string[] = [];
    for (const id of claim.evidenceIds) {
      const item = registry.get(id);
      if (!item) reasons.push(`UNKNOWN_EVIDENCE:${id}`);
      else if (item.snapshotId !== opts.expectedSnapshotId) reasons.push(`CROSS_SNAPSHOT_EVIDENCE:${id}`);
      else if (!EvidenceRegistry.matches(id, opts.allowedEvidence)) reasons.push(`OUT_OF_SCOPE_EVIDENCE:${id}`);
    }
    const contradictions = extractNatalAssertions(claim.statement)
      .map((a) => checkAssertion(a, registry, opts.allowedEvidence))
      .filter((x): x is string => x !== null);
    reasons.push(...contradictions.map((c) => `CONTRADICTS_CHART:${c}`));
    const transitErrors = extractTransitAssertions(claim.statement)
      .map((a) => checkTransitAssertion(a, registry))
      .filter((x): x is string => x !== null);
    reasons.push(...transitErrors.map((c) => `CONTRADICTS_TRANSIT:${c}`));

    let status: ClaimValidation['status'];
    if (reasons.length > 0) {
      status = 'rejected';
    } else {
      const items = claim.evidenceIds.map((id) => registry.get(id)!);
      const grounded = items.some((i) =>
        i.kind === 'interpretation' ? interpretationGrounded(i.label, i.value, claim.statement) : valueAppears(i.value, claim.statement)
      );
      status = grounded ? 'verified' : 'unverifiable';
      if (!grounded) reasons.push('STATEMENT_DOES_NOT_STATE_CITED_VALUE');
    }
    if (status === 'verified') claim.evidenceIds.forEach((id) => verified.add(id));
    claims.push({ statement: claim.statement, evidenceIds: claim.evidenceIds, status, reasons });
  }

  // Independent scan of every sentence of the narrative.
  const fullText = [payload.lead, ...payload.paragraphs, ...payload.bullets, payload.takeaway ?? ''].join(' ');
  for (const a of extractNatalAssertions(fullText)) {
    const err = checkAssertion(a, registry, opts.allowedEvidence);
    if (err) issues.push({ severity: 'error', code: 'NARRATIVE_CONTRADICTS_CHART', message: `${err} — "${a.text.slice(0, 160)}"` });
  }
  for (const a of extractTransitAssertions(fullText)) {
    const err = checkTransitAssertion(a, registry);
    if (err) issues.push({ severity: 'error', code: 'NARRATIVE_CONTRADICTS_TRANSIT', message: `${err} — "${a.text.slice(0, 160)}"` });
  }

  const rejected = claims.filter((c) => c.status === 'rejected');
  if (rejected.length) {
    issues.push({ severity: 'error', code: 'REJECTED_CLAIMS', message: `${rejected.length} claim(s) rejected: ${rejected.map((r) => r.reasons.join('|')).join('; ').slice(0, 400)}` });
  }
  const minVerified = opts.minVerifiedClaims ?? 1;
  if (verified.size === 0 || claims.filter((c) => c.status === 'verified').length < minVerified) {
    issues.push({ severity: 'error', code: 'INSUFFICIENT_VERIFIED_CLAIMS', message: `Needs at least ${minVerified} verified claim(s)` });
  }

  // Required evidence coverage: each required pattern must be cited by a verified claim.
  for (const pattern of topic.requiredEvidence) {
    if (![...verified].some((id) => EvidenceRegistry.matches(id, [pattern]))) {
      issues.push({ severity: 'warning', code: 'REQUIRED_EVIDENCE_NOT_CITED', message: `No verified claim cites ${pattern}` });
    }
  }

  // Depth requirements.
  if (topic.depth) {
    const n = payload.paragraphs.length;
    if (n < topic.depth.minParagraphs) {
      // A topic whose required facts are all absences (no occupants, no aspects) has
      // little to say; forcing length invites padding and positive spin (audit F11).
      const absence = isFactualAbsenceTopic(topic, registry);
      issues.push({
        severity: absence ? 'warning' : 'error', code: 'TOO_SHORT',
        message: `${n} paragraphs < ${topic.depth.minParagraphs}${absence ? ' (factual-absence topic: one short paragraph is acceptable)' : ''}`,
      });
    }
    if (n > topic.depth.maxParagraphs) issues.push({ severity: 'warning', code: 'TOO_LONG', message: `${n} paragraphs > ${topic.depth.maxParagraphs}` });
  }

  return {
    topicId: topic.id,
    passed: !issues.some((i) => i.severity === 'error'),
    claims,
    issues,
    verifiedEvidenceIds: [...verified].sort(),
  };
}

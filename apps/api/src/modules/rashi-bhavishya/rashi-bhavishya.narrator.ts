/**
 * Narrative for Rashi Bhavishya, written by the report platform's LlmNarrator
 * from the deterministic gochara facts only.
 *
 * Flow (AGENTS.md §1.4): RashiDailyFacts → evidence items (IDs + labels)
 * → LlmNarrator (Gemini, schema parse, claim validation, editorial validation,
 * retry with feedback) → an extra transit-fact check of every sentence (below)
 * → accepted narrative, or an error. Nothing is ever substituted.
 */
import { createHash, randomUUID } from 'crypto';
import type { IAiProvider } from '@astro/prediction-engine';
import { reportPlatform } from '@astro/report-engine';
import { PLANET_DISPLAY_NAMES, ordinal } from './rashi-gochara.tables';
import { PlanetGochara, RashiDailyFacts, istParts } from './rashi-gochara.engine';
import {
  CLASS_HI,
  PLANET_HI,
  RashiLanguage,
  SIGN_HI,
  nakshatraHi,
  signHi,
  tithiLabelHi,
  varaHi,
  yogaHi,
} from './rashi-bhavishya.hindi';

type EvidenceItem = reportPlatform.EvidenceItem;
type EvidenceValue = reportPlatform.EvidenceValue;
type ReportTopic = reportPlatform.ReportTopic;
type BatchContext = Parameters<reportPlatform.LlmNarrator['generateBatch']>[0];
type NarratorRegistry = BatchContext['registry'];

/** Part of the stored cache key; bump when topics, guidance or evidence wording change. */
export const RASHI_NARRATIVE_VERSION = 'rb-narrative-1';
/**
 * The Hindi narrative has its own version (also part of the stored key), so Hindi
 * titles, guidance or checks can change without regenerating the English rows.
 */
export const RASHI_NARRATIVE_VERSION_HI = 'rb-narrative-hi-1';

export function narrativeVersionFor(language: RashiLanguage): string {
  return language === 'hi' ? RASHI_NARRATIVE_VERSION_HI : RASHI_NARRATIVE_VERSION;
}
export const RASHI_ENGINE_LABEL = 'rashi-bhavishya/gochara';

export interface RashiNarrativeSection {
  id: string;
  title: string;
  lead: string;
  paragraphs: string[];
  bullets: string[];
  takeaway?: string;
}

export interface RashiNarrative {
  summary: string;
  sections: RashiNarrativeSection[];
  /** Evidence IDs cited by verified claims, for audit. */
  verifiedEvidenceIds: string[];
}

export interface RashiNarrativeResult {
  narrative: RashiNarrative;
  provider: string;
  model: string;
  promptVersion: string;
  generationId: string;
  tokens: { input: number; output: number; thinking: number };
  latencyMs: number;
  attempts: number;
}

export class RashiNarrativeError extends Error {
  constructor(message: string, public readonly details: string[] = []) {
    super(message);
    this.name = 'RashiNarrativeError';
  }
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

function sha(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function istTime(iso?: string): string {
  if (!iso) return '';
  const p = istParts(iso);
  return `${p.timeIst} IST on ${p.dateIst}`;
}

/** Flattens the day's facts for one Moon sign into evidence items with stable IDs. */
export function buildRashiEvidence(facts: RashiDailyFacts): { snapshotId: string; items: EvidenceItem[] } {
  const snapshotId = sha(JSON.stringify({ v: facts.method.version, date: facts.date, rashi: facts.rashi.index, sky: facts.sky })).slice(0, 32);
  const items: EvidenceItem[] = [];
  const add = (id: string, kind: string, label: string, value: EvidenceValue) =>
    items.push({ id, snapshotId, kind, label, value, source: RASHI_ENGINE_LABEL, engineVersion: facts.method.version });
  const sign = facts.rashi.englishName;
  const { panchang } = facts.sky;

  add('rashi.sign', 'rashi', `Moon sign (janma rashi) of this horoscope: ${sign} (${facts.rashi.sanskritName}). Everyone born with the Moon in ${sign} shares this reading.`, sign);
  add('panchang.vara', 'panchang', `Weekday (vara): ${panchang.vara.name} (${panchang.vara.english}), ruled by ${panchang.vara.lord}.`, panchang.vara.english);
  add('panchang.tithi', 'panchang', `Tithi at sunrise: ${panchang.tithi.label}${panchang.tithi.endsAtIso ? `, until ${istTime(panchang.tithi.endsAtIso)}` : ''}.`, panchang.tithi.name);
  add('panchang.nakshatra', 'panchang', `The Moon's nakshatra at sunrise: ${panchang.nakshatra.name} (pada ${panchang.nakshatra.pada}), ruled by ${panchang.nakshatra.lord}${panchang.nakshatra.endsAtIso ? `, until ${istTime(panchang.nakshatra.endsAtIso)}` : ''}.`, panchang.nakshatra.name);
  add('panchang.yoga', 'panchang', `Panchang yoga at sunrise: ${panchang.yoga.name}.`, panchang.yoga.name);

  const planetEvidence = (p: PlanetGochara) => {
    const k = p.planet.toLowerCase();
    add(`transit.${k}.sign`, 'transit', `${p.name} transits ${p.sign.englishName} (${p.sign.sanskritName}) at sunrise.`, p.sign.englishName);
    add(`transit.${k}.house`, 'transit', `${p.name} is in the ${ordinal(p.house)} house counted from ${sign}; the ${ordinal(p.house)} house is about ${p.houseTheme}. ${p.name} signifies ${p.planetTheme}.`, p.house);
    add(
      `transit.${k}.gochara`,
      'gochara',
      `Classical gochara (Phaladeepika ch. 26): ${p.name} in the ${ordinal(p.house)} from the Moon sign is classed favourable only in houses ${p.favourableHouses.join(', ')}, so this transit is ${p.classification}.`,
      p.classification
    );
    if (p.planet === 'RAHU' || p.planet === 'KETU') {
      add(`transit.${k}.motion`, 'transit', `${p.name} moves backwards through the zodiac as it always does (mean node); this is normal, not a special retrograde.`, 'backwards');
    } else if (p.isRetrograde) {
      add(`transit.${k}.motion`, 'transit', `${p.name} is retrograde (apparently moving backwards) at sunrise.`, 'retrograde');
    }
    if (p.changesTo) {
      add(
        `transit.${k}.change`,
        'transit',
        `${p.name} moves from ${p.sign.englishName} into ${p.changesTo.sign.englishName} at ${p.changesTo.timeIst} IST on ${p.changesTo.dateIst}; from then it is in the ${ordinal(p.changesTo.house)} house from ${sign}, which is ${p.changesTo.classification}.`,
        p.changesTo.sign.englishName
      );
    }
  };
  for (const p of facts.planets) planetEvidence(p);

  add('tally.favourable', 'tally', `${facts.tally.favourable} of 9 planets are in classically favourable houses from ${sign} at sunrise: ${facts.tally.favourablePlanets.join(', ') || 'none'}. This is a plain count, not a score.`, facts.tally.favourable);
  add('tally.demanding', 'tally', `${facts.tally.demanding} of 9 planets are in houses classed demanding from ${sign}: ${facts.tally.demandingPlanets.join(', ') || 'none'}.`, facts.tally.demanding);

  let n = 0;
  for (const e of facts.sky.events) {
    if (e.planet === 'MOON') continue; // the Moon's change is covered by transit.moon.change
    if (e.planet === 'KETU' && e.type === 'SIGN_INGRESS') continue; // mirrors Rahu; still stated in the Rahu event
    n += 1;
    const when = `${e.timeIst} IST on ${e.dateIst}`;
    if (e.type === 'SIGN_INGRESS' && e.fromSign && e.toSign) {
      add(`event.${n}`, 'event', `${e.planetName} moves from ${e.fromSign.englishName} into ${e.toSign.englishName} at ${when}${e.withinDay ? ' (today)' : ' (later this week)'}.`, e.toSign.englishName);
    } else if (e.sign) {
      const what = e.type === 'RETROGRADE_STATION' ? 'turns retrograde' : 'turns direct';
      add(`event.${n}`, 'event', `${e.planetName} ${what} in ${e.sign.englishName} at ${when}${e.withinDay ? ' (today)' : ' (later this week)'}.`, what);
    }
  }
  return { snapshotId, items };
}

/**
 * Minimal evidence store with the public surface LlmNarrator and the platform
 * claim validator use (`snapshotId`, `size`, `has`, `get`, `all`, `resolve`,
 * `fingerprint`). The platform's EvidenceRegistry is built from a natal chart
 * snapshot, which a Moon-sign horoscope does not have, so the day's transit
 * facts are served through this adapter instead.
 */
export class RashiEvidenceStore {
  private readonly items = new Map<string, EvidenceItem>();
  constructor(public readonly snapshotId: string, items: EvidenceItem[]) {
    for (const i of items) {
      if (this.items.has(i.id)) throw new Error(`Duplicate evidence id ${i.id}`);
      this.items.set(i.id, i);
    }
  }
  get size(): number {
    return this.items.size;
  }
  has(id: string): boolean {
    return this.items.has(id);
  }
  get(id: string): EvidenceItem | undefined {
    return this.items.get(id);
  }
  all(): EvidenceItem[] {
    return [...this.items.values()];
  }
  resolve(patterns: string[]): EvidenceItem[] {
    const out = new Map<string, EvidenceItem>();
    for (const p of patterns) {
      if (p.includes('*')) {
        const re = new RegExp('^' + p.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
        for (const [id, item] of this.items) if (re.test(id)) out.set(id, item);
      } else {
        const item = this.items.get(p);
        if (item) out.set(p, item);
      }
    }
    return [...out.values()];
  }
  fingerprint(items: EvidenceItem[]): string {
    const canonical = items.map((i) => [i.id, i.value] as const).sort((a, b) => a[0].localeCompare(b[0]));
    return sha(JSON.stringify({ snapshot: this.snapshotId, canonical })).slice(0, 24);
  }
}

// ---------------------------------------------------------------------------
// Definition and topics
// ---------------------------------------------------------------------------

const TOPICS: reportPlatform.ReportTopicInput[] = [
  {
    id: 'day-overview',
    title: "Today's Moon",
    kind: 'narrative',
    objective:
      "Explain where today's Moon is counted from the reader's Moon sign (Chandra bala), what that house is about, whether classical gochara calls it favourable or demanding, and if the Moon changes sign today, what changes from then. Briefly set the tone of the day with the panchang (weekday, tithi, nakshatra).",
    requiredEvidence: ['rashi.sign', 'transit.moon.sign', 'transit.moon.house', 'transit.moon.gochara'],
    optionalEvidence: ['transit.moon.change', 'panchang.*'],
    depth: { minParagraphs: 1, maxParagraphs: 2, bullets: 0 },
  },
  {
    id: 'planetary-weather',
    title: 'The wider planetary picture',
    kind: 'narrative',
    objective:
      'Describe the slower background transits first (Jupiter, Saturn, Rahu and Ketu), then the faster planets (Sun, Mercury, Venus, Mars): the house each occupies from the Moon sign, what that house is about, and whether the classical table calls it favourable or demanding. Mention retrograde motion and any sign change or station listed in the events.',
    requiredEvidence: ['transit.jupiter.house', 'transit.saturn.house'],
    optionalEvidence: ['transit.sun.*', 'transit.mars.*', 'transit.mercury.*', 'transit.jupiter.*', 'transit.venus.*', 'transit.saturn.*', 'transit.rahu.*', 'transit.ketu.*', 'event.*', 'rashi.sign'],
    depth: { minParagraphs: 2, maxParagraphs: 2, bullets: 0 },
  },
  {
    id: 'guidance',
    title: 'Making the most of today',
    kind: 'narrative',
    objective:
      'Turn the facts into calm, practical guidance for the day: lean into the life areas of the houses where planets are favourable, and bring patience and care to the areas of the houses classed demanding. State the plain count of favourable and demanding planets once. Give three short practical bullets, each tied to one of the given transits.',
    requiredEvidence: ['tally.favourable'],
    optionalEvidence: ['tally.demanding', 'transit.*.house', 'transit.*.gochara', 'transit.*.sign', 'rashi.sign'],
    depth: { minParagraphs: 1, maxParagraphs: 1, bullets: 3 },
  },
];

/** Reader-facing topic titles of the Hindi narrative; ids, objectives, evidence and depth are the English topics'. */
const TOPIC_TITLES_HI: Record<string, string> = {
  'day-overview': 'आज का चंद्र',
  'planetary-weather': 'ग्रहों की व्यापक स्थिति',
  guidance: 'आज के दिन का सदुपयोग',
};
const SECTION_TITLE = 'Daily Rashi Bhavishya';
const SECTION_TITLE_HI = 'दैनिक राशि भविष्य';

/** Same rule the report platform gives every Hindi edition (packages/report-engine/src/platform/i18n/hindi.ts). */
const HINDI_STYLE =
  'Write in natural, warm, contemporary Hindi (Devanagari), as spoken by an educated Indian family. Use the standard Hindi names of planets, signs, houses (भाव) and nakshatras. Do not mix in English words where a common Hindi word exists, and never write Hindi in Roman letters.';

/**
 * The Hindi narrative is written from the same evidence (English labels, same IDs and values)
 * and the same topics. Only the reader-facing titles and the language rules differ; the report
 * platform adds its Hindi prompt block and Hindi editorial rules for `language: 'hi'`.
 */
function hindiDefinitionFor(facts: RashiDailyFacts): reportPlatform.ReportDefinition {
  const en = definitionFor(facts);
  const { panchang } = facts.sky;
  const sign = signHi(facts.rashi.index);
  return reportPlatform.ReportDefinitionSchema.parse({
    ...en,
    specVersion: RASHI_NARRATIVE_VERSION_HI,
    language: 'hi',
    title: `${sign} चंद्र राशि का दैनिक राशि भविष्य`,
    subtitle: `${facts.date} का गोचर फल`,
    writingGuidance: [
      ...en.writingGuidance.map((g) => g.replace('Plain, warm, practical English.', 'Plain, warm, practical Hindi.')),
      HINDI_STYLE,
      `Words to use in this horoscope: Moon sign = चंद्र राशि; "from your Moon sign" = "आपकी चंद्र राशि से"; favourable = ${CLASS_HI.favourable}; demanding = ${CLASS_HI.demanding}; classical gochara = शास्त्रीय गोचर; sunrise = सूर्योदय; direct (after retrograde) = मार्गी. Write a house as a Hindi ordinal with भाव (ग्यारहवाँ भाव, ग्यारहवें भाव में).`,
      `Hindi names of today's panchang: ${panchang.vara.name} (${panchang.vara.english}) = ${varaHi(panchang.vara.name)}; tithi ${panchang.tithi.label} = ${tithiLabelHi(panchang.tithi)}; nakshatra ${panchang.nakshatra.name} = ${nakshatraHi(panchang.nakshatra.name)}; yoga ${panchang.yoga.name} = ${yogaHi(panchang.yoga.name)}.`,
      'Write clock times and dates with the same digits as the evidence, and "IST" as भारतीय समय (for example "2026-11-18 को 07:16 बजे (भारतीय समय)").',
      'Never use the words लग्न or दशा, not even in their everyday sense: for a state of mind write मनःस्थिति or स्थिति.',
    ],
    sections: [
      {
        id: 'daily',
        title: SECTION_TITLE_HI,
        kicker: 'आज',
        topics: TOPICS.map((t) => ({ ...t, title: TOPIC_TITLES_HI[t.id] })),
      },
    ],
  });
}

function definitionFor(facts: RashiDailyFacts): reportPlatform.ReportDefinition {
  const sign = facts.rashi.englishName;
  return reportPlatform.ReportDefinitionSchema.parse({
    id: 'rashi-bhavishya-daily',
    reportType: 'RASHI_BHAVISHYA_DAILY',
    specVersion: RASHI_NARRATIVE_VERSION,
    title: `Daily Rashi Bhavishya for ${sign} Moon sign`,
    subtitle: `Gochara (transit) reading for ${facts.date}`,
    description: 'Free daily Moon-sign horoscope shown in the Astro Sushil app.',
    referenceFiles: [],
    requires: { birthTime: false, partner: false, vargas: ['D1'], transitYears: 1 },
    language: 'en',
    theme: { primary: '1B2A4A', accent: 'C9A227', tint: 'F6F1E7' },
    writingGuidance: [
      `This is a short daily horoscope in a mobile app, shared by everyone whose Moon sign (janma rashi) is ${sign}. It is not a personal birth-chart reading.`,
      'Every house number is counted from the Moon sign. Say so ("from your Moon sign"); never call it a house of the birth chart, the ascendant or lagna, and never mention dashas, doshas or natal placements.',
      'Use only the evidence. Do not add degrees, dates, times, planets or events that are not listed, and do not invent results for any planet beyond the house meaning and the favourable/demanding classification given.',
      '"Demanding" means the classical table asks for extra care in that area. Describe it calmly, as something awareness and effort handle well; never as danger or misfortune.',
      'Keep each paragraph 60-110 words. Plain, warm, practical English. No percentages, scores, lucky numbers or lucky colours.',
      'When you mention a planet in a sign or a house, use exactly the sign and the house number given in the evidence.',
    ],
    sections: [{ id: 'daily', title: 'Daily Rashi Bhavishya', kicker: 'Today', topics: TOPICS }],
  });
}

// ---------------------------------------------------------------------------
// Transit-fact check of the prose (the platform validator only checks natal facts)
// ---------------------------------------------------------------------------

const PLANET_WORDS = Object.values(PLANET_DISPLAY_NAMES).join('|');
const SIGN_WORDS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'].join('|');
const ORDINAL_WORDS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12,
};
// Whole words only: the tithi name "Dashami" (from the panchang evidence) must not match "dasha".
const FORBIDDEN_CONTEXT = /\b(?:ascendants?|lagnas?|dashas?|mahadashas?|antardashas?|lucky (?:numbers?|colou?rs?)|percent(?:age)?s?)\b|%/i;

/** Sentence speaks about the birth Moon (janma rashi) rather than today's transit. */
const JANMA_CONTEXT = /\b(born|birth|natal|janma|moon sign|your moon)\b/i;

function parseOrdinal(token: string): number | undefined {
  const m = /^(\d{1,2})(?:st|nd|rd|th)$/i.exec(token);
  if (m) return Number(m[1]);
  return ORDINAL_WORDS[token.toLowerCase()];
}

/**
 * Checks every sentence that places a planet in a sign or a house against
 * the day's facts (the sign at sunrise, or the sign it moves into today).
 * Sentences naming several planets are only checked for the planet nearest
 * the sign/house word, so lists like "Jupiter and Ketu in Leo" are judged per planet.
 */
export function checkTransitProse(text: string, facts: RashiDailyFacts, language: RashiLanguage = 'en'): string[] {
  // A Hindi narrative is checked for both scripts: its claims stay English, and a Latin planet or sign name in the prose is still a statement.
  if (language === 'hi') return [...checkTransitProseEnglish(text, facts), ...checkTransitProseHindi(text, facts)];
  return checkTransitProseEnglish(text, facts);
}

function checkTransitProseEnglish(text: string, facts: RashiDailyFacts): string[] {
  const problems: string[] = [];
  const byName = new Map(facts.planets.map((p) => [p.name.toLowerCase(), p]));
  const sentences = text.split(/(?<=[.!?])\s+/);
  const signRe = new RegExp(`\\b(${PLANET_WORDS})\\b((?:(?!\\b(?:${PLANET_WORDS})\\b)[^.;:]){0,45}?)\\b(?:in|into|through|enters|entering|transits|transiting|occupies)\\s+(?:the sign of\\s+)?(${SIGN_WORDS})\\b`, 'g');
  const houseRe = new RegExp(`\\b(${PLANET_WORDS})\\b((?:(?!\\b(?:${PLANET_WORDS})\\b)[^.;:]){0,60}?)\\b(\\d{1,2}(?:st|nd|rd|th)|${Object.keys(ORDINAL_WORDS).join('|')})\\s+(?:house|sign|place|bhava)\\b`, 'gi');
  for (const s of sentences) {
    const forbidden = FORBIDDEN_CONTEXT.exec(s);
    if (forbidden) problems.push(`Mentions "${forbidden[0]}", which a Moon-sign horoscope must not: "${s.slice(0, 120)}"`);
    let m: RegExpExecArray | null;
    signRe.lastIndex = 0;
    while ((m = signRe.exec(s))) {
      const p = byName.get(m[1].toLowerCase());
      if (!p) continue;
      const allowed = [p.sign.englishName, p.changesTo?.sign.englishName].filter(Boolean).map((x) => x!.toLowerCase());
      // "born with the Moon in Aries" / "your Moon sign" describe the reader's janma rashi, not today's Moon.
      if (p.planet === 'MOON' && JANMA_CONTEXT.test(s)) allowed.push(facts.rashi.englishName.toLowerCase());
      // An event this week may legitimately name the next sign ("moves into Capricorn on ...").
      const upcoming = facts.sky.events.filter((e) => e.planet === p.planet && e.toSign).map((e) => e.toSign!.englishName.toLowerCase());
      if (!allowed.includes(m[3].toLowerCase()) && !upcoming.includes(m[3].toLowerCase())) {
        problems.push(`States ${p.name} in ${m[3]}; today it is in ${p.sign.englishName}: "${s.slice(0, 120)}"`);
      }
    }
    houseRe.lastIndex = 0;
    while ((m = houseRe.exec(s))) {
      const p = byName.get(m[1].toLowerCase());
      const n = parseOrdinal(m[3]);
      if (!p || !n) continue;
      const allowed = [p.house, p.changesTo?.house].filter((x): x is number => typeof x === 'number');
      if (!allowed.includes(n)) problems.push(`States ${p.name} in the ${ordinal(n)} house; it is in the ${ordinal(p.house)} from the Moon sign: "${s.slice(0, 120)}"`);
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// The same transit-fact check for Hindi (Devanagari) prose
// ---------------------------------------------------------------------------

// JS \b does not work for Devanagari, so word edges use Unicode letter/mark look-arounds.
const HI_L = '(?<![\\p{L}\\p{M}])';
const HI_R = '(?![\\p{L}\\p{M}])';
const longestFirst = (xs: string[]) => [...xs].sort((a, b) => b.length - a.length).join('|');

/** Hindi words for each planet, as written in Hindi horoscopes. */
const HI_PLANET_WORDS: Array<[string, keyof typeof PLANET_HI]> = [
  ['सूर्य', 'SUN'], ['रवि', 'SUN'], ['चंद्रमा', 'MOON'], ['चन्द्रमा', 'MOON'], ['चंद्र', 'MOON'], ['चन्द्र', 'MOON'], ['मंगल', 'MARS'], ['बुध', 'MERCURY'],
  ['बृहस्पति', 'JUPITER'], ['गुरु', 'JUPITER'], ['शुक्र', 'VENUS'], ['शनि', 'SATURN'], ['राहु', 'RAHU'], ['केतु', 'KETU'],
];
const HI_SIGN_WORDS: Array<[string, number]> = [
  ...SIGN_HI.map((hi, i): [string, number] => [hi, i + 1]),
  ['वृष', 2], ['कुम्भ', 11],
];
const HI_ORDINAL_STEMS: Array<[string, number]> = [
  ['पहल', 1], ['प्रथम', 1], ['दूसर', 2], ['द्वितीय', 2], ['तीसर', 3], ['तृतीय', 3], ['चौथ', 4], ['चतुर्थ', 4],
  ['पाँचव', 5], ['पांचव', 5], ['पंचम', 5], ['छठ', 6], ['षष्ठ', 6], ['सातव', 7], ['सप्तम', 7], ['आठव', 8], ['अष्टम', 8],
  ['नौव', 9], ['नवम', 9], ['नव', 9], ['दसव', 10], ['दशम', 10], ['ग्यारहव', 11], ['एकादश', 11], ['बारहव', 12], ['द्वादश', 12],
];
/** "चंद्र राशि" is the reader's Moon sign, not the transiting Moon; weekday names (मंगलवार) are excluded by the word edge. */
const HI_PLANET = `${HI_L}(?:${longestFirst(HI_PLANET_WORDS.map(([w]) => w))})${HI_R}(?!\\s*राशि)`;
const HI_SIGN = `${HI_L}(?:${longestFirst(HI_SIGN_WORDS.map(([w]) => w))})${HI_R}`;
/** Ordinal stem with its ending (पहला, पहले, पाँचवाँ, पाँचवें, छठवें, दशम), or digits with वाँ/वें. */
const HI_ORDINAL = `(?:${HI_L}(${longestFirst(HI_ORDINAL_STEMS.map(([w]) => w))})व?[\\p{M}]*${HI_R}|(?<!\\d)(\\d{1,2})\\s*-?\\s*(?:वाँ|वां|वें|वे|वीं)${HI_R})`;
const HI_HOUSE = '(?:भाव|घर|स्थान)';
const HI_NO_PLANET = (max: number) => `((?:(?!${HI_PLANET})[^।.;:!?]){0,${max}}?)`;
/** "<ग्रह> … <राशि> (राशि) में". */
const HI_SIGN_RE = new RegExp(`(${HI_PLANET})${HI_NO_PLANET(45)}(${HI_SIGN})\\s*(?:राशि\\s*)?(?:में|मे)${HI_R}`, 'gu');
/** "<ग्रह> … <क्रम> भाव". */
const HI_HOUSE_RE = new RegExp(`(${HI_PLANET})${HI_NO_PLANET(60)}${HI_ORDINAL}\\s*${HI_HOUSE}`, 'gu');
/** Hindi also puts the planet after the house: "<क्रम> भाव में (स्थित) <ग्रह>". */
const HI_HOUSE_THEN_PLANET_RE = new RegExp(
  `${HI_ORDINAL}\\s*${HI_HOUSE}\\s*(?:में|मे)\\s+(?:(?:स्थित|विराजमान|मौजूद|बैठे|बैठा|गोचर\\s+कर\\s+रहे|गोचर\\s+कर\\s+रहा|गोचररत|संचार\\s+कर\\s+रहे|संचार\\s+कर\\s+रहा)\\s+)?(${HI_PLANET})`,
  'gu'
);
/** Whole words only: the tithi "दशमी", "दशम भाव" and "मनोदशा" must not match "दशा". */
const HI_FORBIDDEN_CONTEXT = new RegExp(
  `${HI_L}(?:लग्न|महादशा|अंतर्दशा|अन्तर्दशा|दशा|(?:शुभ|भाग्यशाली|लकी)\\s+(?:अंक|संख्या|रंग)|प्रतिशत)`,
  'u'
);
/** Sentence speaks about the birth Moon (janma rashi) rather than today's transit. */
const HI_JANMA_CONTEXT = /जन्म|चंद्र\s*राशि|चन्द्र\s*राशि/u;

function hiOrdinal(stem: string | undefined, digits: string | undefined): number | undefined {
  if (digits) return Number(digits);
  return HI_ORDINAL_STEMS.find(([w]) => w === stem)?.[1];
}

/**
 * Hindi counterpart of the English check: every sentence that places a planet in a sign
 * or a house must match the day's facts, and nothing a Moon-sign horoscope must not
 * mention (लग्न, दशा, शुभ अंक/रंग, प्रतिशत) may appear.
 */
function checkTransitProseHindi(text: string, facts: RashiDailyFacts): string[] {
  const problems: string[] = [];
  const byCode = new Map(facts.planets.map((p) => [p.planet as string, p]));
  const planetOf = (word: string) => byCode.get(HI_PLANET_WORDS.find(([w]) => w === word)?.[1] ?? '');
  const signOf = (word: string) => HI_SIGN_WORDS.find(([w]) => w === word)?.[1];
  for (const s of text.split(/(?<=[.!?।])\s+|\n+/)) {
    const forbidden = HI_FORBIDDEN_CONTEXT.exec(s);
    if (forbidden) problems.push(`Mentions "${forbidden[0]}", which a Moon-sign horoscope must not: "${s.slice(0, 120)}"`);
    for (const m of s.matchAll(HI_SIGN_RE)) {
      const p = planetOf(m[1]);
      const signIndex = signOf(m[3]);
      if (!p || !signIndex) continue;
      const allowed = [p.sign.index, p.changesTo?.sign.index].filter((x): x is number => typeof x === 'number');
      if (p.planet === 'MOON' && HI_JANMA_CONTEXT.test(s)) allowed.push(facts.rashi.index);
      const upcoming = facts.sky.events.filter((e) => e.planet === p.planet && e.toSign).map((e) => e.toSign!.index);
      if (!allowed.includes(signIndex) && !upcoming.includes(signIndex)) {
        problems.push(`States ${p.name} in ${m[3]} (sign ${signIndex}); today it is in ${p.sign.englishName}: "${s.slice(0, 120)}"`);
      }
    }
    const judge = (p: PlanetGochara | undefined, n: number | undefined) => {
      if (!p || !n) return;
      const allowed = [p.house, p.changesTo?.house].filter((x): x is number => typeof x === 'number');
      if (!allowed.includes(n)) problems.push(`States ${p.name} in the ${ordinal(n)} house; it is in the ${ordinal(p.house)} from the Moon sign: "${s.slice(0, 120)}"`);
    };
    // Ordinals already attributed to the planet named before them are not attributed again to a planet after them.
    const attributed = new Set<number>();
    for (const m of s.matchAll(HI_HOUSE_RE)) {
      attributed.add((m.index ?? 0) + m[1].length + m[2].length);
      judge(planetOf(m[1]), hiOrdinal(m[3], m[4]));
    }
    for (const m of s.matchAll(HI_HOUSE_THEN_PLANET_RE)) {
      if (attributed.has(m.index ?? 0)) continue;
      judge(planetOf(m[3]), hiOrdinal(m[1], m[2]));
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Narrator
// ---------------------------------------------------------------------------

export interface RashiNarratorOptions {
  /** Narrator config overrides (e.g. fewer transport retries for on-demand requests). */
  config?: Partial<reportPlatform.NarratorConfig>;
  /** Outer attempts when the transit-fact check rejects otherwise valid output. */
  maxCheckAttempts?: number;
}

/**
 * The daily Rashi Bhavishya keeps its own narrator settings: the report platform's
 * defaults moved to a cheaper model with sentence repair (2026-11-23), which was
 * tuned and measured for PDF reports only.
 */
const RASHI_NARRATOR_DEFAULTS: Partial<reportPlatform.NarratorConfig> = {
  model: process.env.REPORT_LLM_MODEL || process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  thinkingLevel: 'low',
  maxAttempts: 2,
  retryModel: undefined,
  maxRepairShare: 0,
  maxOutputTokens: 8000,
};

export class RashiNarrator {
  constructor(private readonly provider: IAiProvider, private readonly options: RashiNarratorOptions = {}) {}

  get providerId(): string {
    return this.provider.providerId;
  }

  get model(): string {
    return { ...reportPlatform.DEFAULT_NARRATOR_CONFIG, ...RASHI_NARRATOR_DEFAULTS, ...this.options.config }.model;
  }

  /**
   * One LLM call per sign, date and language. Both languages are written from the same
   * evidence with the same model settings and pass the same validators (the platform's
   * claim and editorial rules for the language, then the transit-fact check).
   */
  async generate(facts: RashiDailyFacts, language: RashiLanguage = 'en'): Promise<RashiNarrativeResult> {
    if (!this.provider.isConfigured) {
      throw new RashiNarrativeError('LLM provider is not configured');
    }
    const definition = language === 'hi' ? hindiDefinitionFor(facts) : definitionFor(facts);
    const { snapshotId, items } = buildRashiEvidence(facts);
    const store = new RashiEvidenceStore(snapshotId, items);
    const config: reportPlatform.NarratorConfig = { ...reportPlatform.DEFAULT_NARRATOR_CONFIG, ...RASHI_NARRATOR_DEFAULTS, ...this.options.config };
    const topics = definition.sections[0].topics as ReportTopic[];
    const maxCheckAttempts = this.options.maxCheckAttempts ?? 2;

    let lastProblems: string[] = [];
    const tokens = { input: 0, output: 0, thinking: 0 };
    let latencyMs = 0;
    let attempts = 0;
    for (let outer = 1; outer <= maxCheckAttempts; outer++) {
      // A fresh in-memory cache per attempt: the accepted result is persisted by the caller, never a rejected one.
      const narrator = new reportPlatform.LlmNarrator(this.provider, new reportPlatform.InMemoryTopicCacheStore(), config);
      const outcomes = await narrator.generateBatch({
        definition,
        // See RashiEvidenceStore: same public surface as the platform registry.
        registry: store as unknown as NarratorRegistry,
        subjectRef: `rashi-${facts.rashi.index}-${facts.date}`,
        topics,
        sectionTitle: language === 'hi' ? SECTION_TITLE_HI : SECTION_TITLE,
        priorSummaries: [],
      });
      for (const o of outcomes) {
        attempts += o.attempts;
        latencyMs += o.latencyMs ?? 0;
        tokens.input += o.tokens?.input ?? 0;
        tokens.output += o.tokens?.output ?? 0;
        tokens.thinking += o.tokens?.thinking ?? 0;
      }
      const failed = outcomes.filter((o) => o.status !== 'generated' || !o.payload);
      if (failed.length) {
        const details = failed.map((o) => {
          const issues = [
            ...(o.validation?.issues ?? []).filter((i) => i.severity === 'error').map((i) => `${i.code}: ${i.message}`),
            ...o.editorialIssues.filter((i) => i.severity === 'error').map((i) => `${i.code}: ${i.message}`),
          ];
          return `${o.topic.id}: ${o.error ?? o.status}${issues.length ? ` (${issues.join(' | ').slice(0, 300)})` : ''}`;
        });
        throw new RashiNarrativeError('Narrative generation failed validation', details);
      }
      const payloads = outcomes.map((o) => o.payload!);
      const text = payloads.flatMap((p) => [p.lead, ...p.paragraphs, ...p.bullets, p.takeaway ?? '', ...p.claims.map((c) => c.statement)]).join('\n');
      lastProblems = checkTransitProse(text, facts, language);
      if (lastProblems.length === 0) {
        const first = outcomes[0];
        return {
          narrative: {
            summary: payloads[0].lead,
            sections: outcomes.map((o) => ({
              id: o.topic.id,
              title: o.topic.title,
              lead: o.payload!.lead,
              paragraphs: o.payload!.paragraphs,
              bullets: o.payload!.bullets,
              takeaway: o.payload!.takeaway,
            })),
            verifiedEvidenceIds: [...new Set(outcomes.flatMap((o) => o.validation?.verifiedEvidenceIds ?? []))].sort(),
          },
          provider: this.provider.providerId,
          model: first.model ?? config.model,
          promptVersion: narrativeVersionFor(language),
          generationId: first.sourceGenerationId ?? `gen_${randomUUID()}`,
          tokens,
          latencyMs,
          attempts,
        };
      }
    }
    throw new RashiNarrativeError('Narrative contradicted the day\'s transit facts', lastProblems);
  }
}

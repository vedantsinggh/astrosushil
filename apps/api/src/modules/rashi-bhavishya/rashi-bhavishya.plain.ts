/**
 * Deterministic plain-wording narrative for Rashi Bhavishya.
 *
 * Used when the LLM narrative is unavailable (no API key, provider error,
 * validation failure, store unavailable). Every sentence is a fixed template
 * filled only with the day's computed gochara facts and the neutral table
 * wording (RB-005, RB-007): sign, house from the Moon sign, house meaning,
 * favourable/demanding classification, motion, sign changes, events, panchang
 * and the plain count. No outcome, advice or result text is added.
 */
import { ordinal } from './rashi-gochara.tables';
import { PlanetGochara, RashiDailyFacts } from './rashi-gochara.engine';
import type { RashiNarrative } from './rashi-bhavishya.narrator';
import {
  CLASS_HI,
  HOUSE_THEMES_HI,
  PLANET_HI,
  RashiLanguage,
  nakshatraHi,
  ordinalHi,
  planetHi,
  signHi,
  tithiLabelHi,
  varaHi,
  whenHi,
  yogaHi,
} from './rashi-bhavishya.hindi';

/** Identifies the template wording; bump when the sentences change. */
export const RASHI_PLAIN_VERSION = 'rb-plain-1';
/** The Hindi template wording has its own version, so it can change without touching the English one. */
export const RASHI_PLAIN_VERSION_HI = 'rb-plain-hi-1';

export function plainVersionFor(language: RashiLanguage): string {
  return language === 'hi' ? RASHI_PLAIN_VERSION_HI : RASHI_PLAIN_VERSION;
}

/** Background planets first, then faster ones (same order as the LLM topic). */
const WIDER_ORDER = ['JUPITER', 'SATURN', 'RAHU', 'KETU', 'SUN', 'MERCURY', 'VENUS', 'MARS'] as const;

function planetSentence(p: PlanetGochara, sign: string): string {
  const parts = [
    `${p.name} is in ${p.sign.englishName} (${p.sign.sanskritName}), the ${ordinal(p.house)} house from your Moon sign ${sign}; this house is about ${p.houseTheme}.`,
    `In classical gochara this placement is ${p.classification}.`,
  ];
  if (p.planet === 'RAHU' || p.planet === 'KETU') {
    // Mean nodes always move backwards; this is not stated as a retrograde phase (RB-010).
  } else if (p.isRetrograde) {
    parts.push(`${p.name} is retrograde at sunrise.`);
  }
  if (p.changesTo) {
    parts.push(
      `At ${p.changesTo.timeIst} IST on ${p.changesTo.dateIst} it moves into ${p.changesTo.sign.englishName}, the ${ordinal(p.changesTo.house)} house from ${sign}, where it is ${p.changesTo.classification}.`
    );
  }
  return parts.join(' ');
}

function eventBullets(facts: RashiDailyFacts): string[] {
  const out: string[] = [];
  for (const e of facts.sky.events) {
    if (e.planet === 'MOON') continue; // covered in the Moon section
    if (e.planet === 'KETU' && e.type === 'SIGN_INGRESS') continue; // mirrors Rahu (RB-008)
    const when = `${e.timeIst} IST on ${e.dateIst}`;
    if (e.type === 'SIGN_INGRESS' && e.fromSign && e.toSign) {
      out.push(`${e.planetName} moves from ${e.fromSign.englishName} into ${e.toSign.englishName} at ${when}.`);
    } else if (e.sign) {
      out.push(`${e.planetName} ${e.type === 'RETROGRADE_STATION' ? 'turns retrograde' : 'turns direct'} in ${e.sign.englishName} at ${when}.`);
    }
  }
  return out;
}

export function buildPlainNarrative(facts: RashiDailyFacts, language: RashiLanguage = 'en'): RashiNarrative {
  if (language === 'hi') return buildPlainNarrativeHi(facts);
  const sign = facts.rashi.englishName;
  const { moon, tally } = facts;
  const { panchang } = facts.sky;
  const bySymbol = new Map(facts.planets.map((p) => [p.planet, p]));

  const summary =
    `Today the Moon is in ${moon.sign.englishName}, the ${ordinal(moon.house)} house from your Moon sign ${sign}, ` +
    `which is about ${moon.houseTheme}; classical gochara classes this Moon transit as ${moon.classification}. ` +
    `${tally.favourable} of ${tally.total} planets are in favourable houses from ${sign} today.`;

  const panchangSentence =
    `It is ${panchang.vara.name} (${panchang.vara.english}), ruled by ${panchang.vara.lord}. ` +
    `Tithi at sunrise: ${panchang.tithi.label}. Nakshatra: ${panchang.nakshatra.name} (pada ${panchang.nakshatra.pada}), ruled by ${panchang.nakshatra.lord}. ` +
    `Yoga: ${panchang.yoga.name}.`;

  const wider = WIDER_ORDER.map((k) => bySymbol.get(k)).filter((p): p is PlanetGochara => Boolean(p));

  const areas = (cls: 'favourable' | 'demanding') =>
    facts.planets
      .filter((p) => p.classification === cls)
      .map((p) => `${p.name}: ${ordinal(p.house)} house (${p.houseTheme})`);

  return {
    summary,
    sections: [
      {
        id: 'day-overview',
        title: "Today's Moon",
        lead: `The Moon is in the ${ordinal(moon.house)} house from ${sign} today.`,
        paragraphs: [planetSentence(moon, sign), panchangSentence],
        bullets: [],
      },
      {
        id: 'planetary-weather',
        title: 'The wider planetary picture',
        lead: `Where the other planets are, counted from your Moon sign ${sign}.`,
        paragraphs: wider.map((p) => planetSentence(p, sign)),
        bullets: eventBullets(facts),
      },
      {
        id: 'tally',
        title: 'Favourable and demanding today',
        lead: `${tally.favourable} favourable, ${tally.demanding} demanding.`,
        paragraphs: [
          `${tally.favourable} of ${tally.total} planets are in classically favourable houses from ${sign} at sunrise, and ${tally.demanding} are in houses classed demanding. ` +
            `This is a plain count, not a score. "Demanding" means the classical table asks for extra care in that area of life.`,
        ],
        bullets: [...areas('favourable').map((a) => `Favourable - ${a}`), ...areas('demanding').map((a) => `Demanding - ${a}`)],
      },
    ],
    verifiedEvidenceIds: [],
  };
}

// ---------------------------------------------------------------------------
// Hindi form: the same sections, sentences and facts, one Hindi template per English template.
// ---------------------------------------------------------------------------

function planetSentenceHi(p: PlanetGochara, sign: string): string {
  const name = PLANET_HI[p.planet];
  const parts = [
    `${name} ${signHi(p.sign.index)} राशि में है, जो आपकी चंद्र राशि ${sign} से ${ordinalHi(p.house)} भाव है। इस भाव के विषय हैं: ${HOUSE_THEMES_HI[p.house]}।`,
    `शास्त्रीय गोचर में यह स्थिति ${CLASS_HI[p.classification]} मानी जाती है।`,
  ];
  if (p.planet === 'RAHU' || p.planet === 'KETU') {
    // Mean nodes always move backwards; this is not stated as a retrograde phase (RB-010).
  } else if (p.isRetrograde) {
    parts.push(`सूर्योदय के समय ${name} वक्री है।`);
  }
  if (p.changesTo) {
    parts.push(
      `${whenHi(p.changesTo.dateIst, p.changesTo.timeIst)} इसका प्रवेश ${signHi(p.changesTo.sign.index)} राशि में होगा, जो ${sign} से ${ordinalHi(p.changesTo.house)} भाव है; वहाँ यह स्थिति ${CLASS_HI[p.changesTo.classification]} मानी जाती है।`
    );
  }
  return parts.join(' ');
}

function eventBulletsHi(facts: RashiDailyFacts): string[] {
  const out: string[] = [];
  for (const e of facts.sky.events) {
    if (e.planet === 'MOON') continue; // covered in the Moon section
    if (e.planet === 'KETU' && e.type === 'SIGN_INGRESS') continue; // mirrors Rahu (RB-008)
    const when = whenHi(e.dateIst, e.timeIst);
    const name = PLANET_HI[e.planet];
    if (e.type === 'SIGN_INGRESS' && e.fromSign && e.toSign) {
      out.push(`${name} का ${signHi(e.fromSign.index)} से ${signHi(e.toSign.index)} राशि में प्रवेश ${when} होगा।`);
    } else if (e.sign) {
      out.push(`${name} ${signHi(e.sign.index)} राशि में ${when} ${e.type === 'RETROGRADE_STATION' ? 'वक्री' : 'मार्गी'} होगा।`);
    }
  }
  return out;
}

function buildPlainNarrativeHi(facts: RashiDailyFacts): RashiNarrative {
  const sign = signHi(facts.rashi.index);
  const { moon, tally } = facts;
  const { panchang } = facts.sky;
  const bySymbol = new Map(facts.planets.map((p) => [p.planet, p]));
  const fav = CLASS_HI.favourable;
  const dem = CLASS_HI.demanding;

  const summary =
    `आज चंद्र ${signHi(moon.sign.index)} राशि में है, जो आपकी चंद्र राशि ${sign} से ${ordinalHi(moon.house)} भाव है; इस भाव के विषय हैं: ${HOUSE_THEMES_HI[moon.house]}। ` +
    `शास्त्रीय गोचर में चंद्र का यह गोचर ${CLASS_HI[moon.classification]} माना जाता है। ` +
    `आज ${tally.total} में से ${tally.favourable} ग्रह ${sign} से ${fav} भावों में हैं।`;

  const panchangSentence =
    `आज ${varaHi(panchang.vara.name)} है, जिसका स्वामी ${planetHi(panchang.vara.lord)} है। ` +
    `सूर्योदय के समय तिथि: ${tithiLabelHi(panchang.tithi)}। नक्षत्र: ${nakshatraHi(panchang.nakshatra.name)} (चरण ${panchang.nakshatra.pada}), स्वामी ${planetHi(panchang.nakshatra.lord)}। ` +
    `योग: ${yogaHi(panchang.yoga.name)}।`;

  const wider = WIDER_ORDER.map((k) => bySymbol.get(k)).filter((p): p is PlanetGochara => Boolean(p));

  const areas = (cls: 'favourable' | 'demanding') =>
    facts.planets
      .filter((p) => p.classification === cls)
      .map((p) => `${PLANET_HI[p.planet]}: ${ordinalHi(p.house)} भाव (${HOUSE_THEMES_HI[p.house]})`);

  return {
    summary,
    sections: [
      {
        id: 'day-overview',
        title: 'आज का चंद्र',
        lead: `आज चंद्र ${sign} से ${ordinalHi(moon.house, 'oblique')} भाव में है।`,
        paragraphs: [planetSentenceHi(moon, sign), panchangSentence],
        bullets: [],
      },
      {
        id: 'planetary-weather',
        title: 'ग्रहों की व्यापक स्थिति',
        lead: `आपकी चंद्र राशि ${sign} से गिनने पर बाकी ग्रह कहाँ हैं।`,
        paragraphs: wider.map((p) => planetSentenceHi(p, sign)),
        bullets: eventBulletsHi(facts),
      },
      {
        id: 'tally',
        title: `आज ${fav} और ${dem}`,
        lead: `${tally.favourable} ${fav}, ${tally.demanding} ${dem}।`,
        paragraphs: [
          `सूर्योदय के समय ${tally.total} में से ${tally.favourable} ग्रह ${sign} से शास्त्रीय रूप से ${fav} भावों में हैं, और ${tally.demanding} ग्रह ऐसे भावों में हैं जिन्हें ${dem} माना गया है। ` +
            `यह केवल सीधी गिनती है, दिन का कोई मूल्यांकन नहीं। "${dem}" का अर्थ है कि शास्त्रीय तालिका जीवन के उस क्षेत्र में अधिक सावधानी रखने को कहती है।`,
        ],
        bullets: [...areas('favourable').map((a) => `${fav} - ${a}`), ...areas('demanding').map((a) => `${dem} - ${a}`)],
      },
    ],
    verifiedEvidenceIds: [],
  };
}

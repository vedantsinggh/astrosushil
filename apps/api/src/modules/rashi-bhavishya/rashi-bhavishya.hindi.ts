/**
 * Hindi display names for Rashi Bhavishya (RB-014).
 *
 * Nothing here calculates or changes astrology: these are display names for
 * values the gochara engine already produced. The stored facts are the same
 * object for both languages; Hindi names are applied only when a response or
 * the deterministic wording is built.
 *
 * Planet, sign and nakshatra names repeat the report platform's glossary
 * (packages/report-engine/src/platform/i18n/hindi.ts), which is not part of
 * the public API of @astro/report-engine; a unit test keeps the two equal.
 * Weekday, tithi, yoga, karana, house and planet themes exist only here.
 *
 * A name that has no Hindi form throws: English is never printed silently in
 * a Hindi response.
 */
import type { GocharaClass, GocharaPlanet } from './rashi-gochara.tables';
import type { DailySky, PanchangFacts, PlanetGochara, RashiDailyFacts, SignRef, SkyEvent } from './rashi-gochara.engine';

export const RASHI_LANGUAGES = ['en', 'hi'] as const;
export type RashiLanguage = (typeof RASHI_LANGUAGES)[number];
export const RASHI_DEFAULT_LANGUAGE: RashiLanguage = 'en';

export class RashiHindiError extends Error {
  constructor(kind: string, value: string) {
    super(`RASHI_HINDI_${kind}_MISSING: "${value}"`);
    this.name = 'RashiHindiError';
  }
}

export const PLANET_HI: Record<GocharaPlanet, string> = {
  SUN: 'सूर्य', MOON: 'चंद्र', MARS: 'मंगल', MERCURY: 'बुध', JUPITER: 'गुरु', VENUS: 'शुक्र', SATURN: 'शनि', RAHU: 'राहु', KETU: 'केतु',
};

/** Keyed by the engine's display name (PLANET_DISPLAY_NAMES). */
export const PLANET_NAME_HI: Record<string, string> = {
  Sun: PLANET_HI.SUN, Moon: PLANET_HI.MOON, Mars: PLANET_HI.MARS, Mercury: PLANET_HI.MERCURY, Jupiter: PLANET_HI.JUPITER,
  Venus: PLANET_HI.VENUS, Saturn: PLANET_HI.SATURN, Rahu: PLANET_HI.RAHU, Ketu: PLANET_HI.KETU,
};

/** Sign index 1–12. */
export const SIGN_HI: readonly string[] = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुंभ', 'मीन'];

/** Keyed by the engine's spelling (packages/astrology-engine/src/nakshatra/nakshatra.ts). */
export const NAKSHATRA_HI: Record<string, string> = {
  Ashwini: 'अश्विनी', Bharani: 'भरणी', Krittika: 'कृत्तिका', Rohini: 'रोहिणी', Mrigashira: 'मृगशिरा', Ardra: 'आर्द्रा',
  Punarvasu: 'पुनर्वसु', Pushya: 'पुष्य', Ashlesha: 'आश्लेषा', Magha: 'मघा', 'Purva Phalguni': 'पूर्व फाल्गुनी',
  'Uttara Phalguni': 'उत्तर फाल्गुनी', Hasta: 'हस्त', Chitra: 'चित्रा', Swati: 'स्वाति', Vishakha: 'विशाखा', Anuradha: 'अनुराधा',
  Jyeshtha: 'ज्येष्ठा', Mula: 'मूल', 'Purva Ashadha': 'पूर्वाषाढ़ा', 'Uttara Ashadha': 'उत्तराषाढ़ा', Shravana: 'श्रवण',
  Dhanishta: 'धनिष्ठा', Shatabhisha: 'शतभिषा', 'Purva Bhadrapada': 'पूर्व भाद्रपद', 'Uttara Bhadrapada': 'उत्तर भाद्रपद', Revati: 'रेवती',
};

/** Keyed by the engine's vara name (VARA_LORDS). */
export const VARA_HI: Record<string, string> = {
  Ravivara: 'रविवार', Somavara: 'सोमवार', Mangalavara: 'मंगलवार', Budhavara: 'बुधवार', Guruvara: 'गुरुवार', Shukravara: 'शुक्रवार', Shanivara: 'शनिवार',
};

/** Keyed by the engine's tithi name (TITHI_NAMES plus Amavasya). */
export const TITHI_HI: Record<string, string> = {
  Pratipada: 'प्रतिपदा', Dwitiya: 'द्वितीया', Tritiya: 'तृतीया', Chaturthi: 'चतुर्थी', Panchami: 'पंचमी', Shashthi: 'षष्ठी', Saptami: 'सप्तमी',
  Ashtami: 'अष्टमी', Navami: 'नवमी', Dashami: 'दशमी', Ekadashi: 'एकादशी', Dwadashi: 'द्वादशी', Trayodashi: 'त्रयोदशी', Chaturdashi: 'चतुर्दशी',
  Purnima: 'पूर्णिमा', Amavasya: 'अमावस्या',
};

export const PAKSHA_HI: Record<PanchangFacts['tithi']['paksha'], string> = { Shukla: 'शुक्ल', Krishna: 'कृष्ण' };

/** Keyed by the engine's yoga name (YOGA_NAMES). */
export const YOGA_HI: Record<string, string> = {
  Vishkambha: 'विष्कंभ', Priti: 'प्रीति', Ayushman: 'आयुष्मान', Saubhagya: 'सौभाग्य', Shobhana: 'शोभन', Atiganda: 'अतिगंड', Sukarma: 'सुकर्मा',
  Dhriti: 'धृति', Shoola: 'शूल', Ganda: 'गंड', Vriddhi: 'वृद्धि', Dhruva: 'ध्रुव', Vyaghata: 'व्याघात', Harshana: 'हर्षण', Vajra: 'वज्र',
  Siddhi: 'सिद्धि', Vyatipata: 'व्यतिपात', Variyan: 'वरीयान', Parigha: 'परिघ', Shiva: 'शिव', Siddha: 'सिद्ध', Sadhya: 'साध्य', Shubha: 'शुभ',
  Shukla: 'शुक्ल', Brahma: 'ब्रह्म', Indra: 'इंद्र', Vaidhriti: 'वैधृति',
};

/** Keyed by the engine's karana name (REPEATING_KARANAS plus the four fixed karanas). */
export const KARANA_HI: Record<string, string> = {
  Bava: 'बव', Balava: 'बालव', Kaulava: 'कौलव', Taitila: 'तैतिल', Gara: 'गर', Vanija: 'वणिज', Vishti: 'विष्टि',
  Shakuni: 'शकुनि', Chatushpada: 'चतुष्पाद', Naga: 'नाग', Kimstughna: 'किंस्तुघ्न',
};

/** Same neutral meanings as HOUSE_THEMES (RB-007), in Hindi. */
export const HOUSE_THEMES_HI: Record<number, string> = {
  1: 'स्वयं, शरीर और सामान्य स्फूर्ति',
  2: 'धन, परिवार और वाणी',
  3: 'साहस, प्रयास, भाई-बहन और छोटी यात्राएँ',
  4: 'घर, माता, सुख-सुविधा और मन की शांति',
  5: 'बुद्धि, संतान, रचनात्मकता और सीखना',
  6: 'रोज़ का काम, सेहत की दिनचर्या और प्रतिस्पर्धा',
  7: 'साझेदारी, जीवनसाथी और दूसरों के साथ व्यवहार',
  8: 'अचानक बदलाव, शोध और छिपी बातें',
  9: 'भाग्य, गुरुजन, आस्था और लंबी यात्राएँ',
  10: 'कार्यक्षेत्र, प्रतिष्ठा और सार्वजनिक कर्म',
  11: 'लाभ, मित्र और इच्छाओं की पूर्ति',
  12: 'खर्च, विश्राम, एकांत और आध्यात्मिक जीवन',
};

/** Same neutral meanings as PLANET_THEMES (RB-007), in Hindi. */
export const PLANET_THEMES_HI: Record<GocharaPlanet, string> = {
  SUN: 'अधिकार, ऊर्जा और आत्मविश्वास',
  MOON: 'मन, भावनाएँ और रोज़ की मनःस्थिति',
  MARS: 'ऊर्जा, उत्साह और निर्णायक कर्म',
  MERCURY: 'संवाद, सोच-विचार और व्यापार',
  JUPITER: 'ज्ञान, विकास और मार्गदर्शन',
  VENUS: 'संबंध, सुख-सुविधाएँ और कलाएँ',
  SATURN: 'अनुशासन, कर्तव्य और धैर्य',
  RAHU: 'महत्वाकांक्षा और लीक से हटकर किए गए प्रयास',
  KETU: 'वैराग्य, आत्मचिंतन और छोड़ देने का भाव',
};

/** RB-005: "demanding" asks for extra care; it is never worded as bad or malefic. */
export const CLASS_HI: Record<GocharaClass, string> = { favourable: 'अनुकूल', demanding: 'ध्यान देने योग्य' };

const ORDINAL_DIRECT = ['पहला', 'दूसरा', 'तीसरा', 'चौथा', 'पाँचवाँ', 'छठा', 'सातवाँ', 'आठवाँ', 'नौवाँ', 'दसवाँ', 'ग्यारहवाँ', 'बारहवाँ'];
const ORDINAL_OBLIQUE = ['पहले', 'दूसरे', 'तीसरे', 'चौथे', 'पाँचवें', 'छठे', 'सातवें', 'आठवें', 'नौवें', 'दसवें', 'ग्यारहवें', 'बारहवें'];
const MONTH_HI = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];

function need(map: Record<string, string>, key: string, kind: string): string {
  const hi = map[key];
  if (hi === undefined) throw new RashiHindiError(kind, key);
  return hi;
}

export const planetHi = (name: string): string => need(PLANET_NAME_HI, name, 'PLANET');
export const nakshatraHi = (name: string): string => need(NAKSHATRA_HI, name, 'NAKSHATRA');
export const varaHi = (name: string): string => need(VARA_HI, name, 'VARA');
export const tithiNameHi = (name: string): string => need(TITHI_HI, name, 'TITHI');
export const yogaHi = (name: string): string => need(YOGA_HI, name, 'YOGA');
export const karanaHi = (name: string): string => need(KARANA_HI, name, 'KARANA');

export function signHi(index: number): string {
  const hi = SIGN_HI[index - 1];
  if (hi === undefined) throw new RashiHindiError('SIGN', String(index));
  return hi;
}

/** "शुक्ल दशमी"; पूर्णिमा and अमावस्या stand alone, as in the English label. */
export function tithiLabelHi(tithi: PanchangFacts['tithi']): string {
  const name = tithiNameHi(tithi.name);
  return tithi.name === 'Purnima' || tithi.name === 'Amavasya' ? name : `${PAKSHA_HI[tithi.paksha]} ${name}`;
}

/** "ग्यारहवाँ" (direct) or "ग्यारहवें" (oblique, before "भाव में"). */
export function ordinalHi(n: number, form: 'direct' | 'oblique' = 'direct'): string {
  const hi = (form === 'direct' ? ORDINAL_DIRECT : ORDINAL_OBLIQUE)[n - 1];
  if (hi === undefined) throw new RashiHindiError('ORDINAL', String(n));
  return hi;
}

/** "2026-11-18" → "18 नवंबर 2026". */
export function dateHi(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  const month = m ? MONTH_HI[Number(m[2]) - 1] : undefined;
  if (!m || !month) throw new RashiHindiError('DATE', isoDate);
  return `${Number(m[3])} ${month} ${m[1]}`;
}

/** "18 नवंबर 2026 को 14:32 बजे (भारतीय समय)". */
export function whenHi(dateIst: string, timeIst: string): string {
  return `${dateHi(dateIst)} को ${timeIst} बजे (भारतीय समय)`;
}

export const TALLY_METHOD_HI =
  'नौ ग्रहों में से उन ग्रहों की गिनती जिनकी सूर्योदय के समय की राशि चंद्र राशि से शास्त्रीय रूप से अनुकूल भाव में पड़ती है ' +
  '(फलदीपिका अध्याय 26 की गोचर तालिका, वेध के बिना)। यह केवल सीधी गिनती है, दिन का कोई मूल्यांकन नहीं।';

export const METHOD_SUMMARY_HI =
  'उज्जैन में सूर्योदय के समय ग्रहों की स्थिति (निरयण राशिचक्र, लाहिरी अयनांश, मध्यम राहु-केतु)। ' +
  'हर ग्रह का भाव आपकी चंद्र राशि से गिना जाता है (पूरी राशि को एक भाव मानकर) और अनुकूल भावों की शास्त्रीय गोचर तालिका से मिलाया जाता है। ' +
  'वेध लागू नहीं किया गया है।';

export const METHOD_SOURCES_HI = ['फलदीपिका अध्याय 26 (गोचर फल)', 'बृहत् पाराशर होरा शास्त्र (भावों और ग्रहों के कारकत्व)'];

// ---------------------------------------------------------------------------
// Hindi display form of the facts in an API response
// ---------------------------------------------------------------------------

function signRefHi(s: SignRef): SignRef {
  return { ...s, hindiName: signHi(s.index) };
}

function planetGocharaHi(p: PlanetGochara): PlanetGochara {
  return {
    ...p,
    name: PLANET_HI[p.planet],
    sign: signRefHi(p.sign),
    houseTheme: need(HOUSE_THEMES_HI as unknown as Record<string, string>, String(p.house), 'HOUSE_THEME'),
    planetTheme: PLANET_THEMES_HI[p.planet],
    classificationLabel: CLASS_HI[p.classification],
    ...(p.changesTo
      ? { changesTo: { ...p.changesTo, sign: signRefHi(p.changesTo.sign), classificationLabel: CLASS_HI[p.changesTo.classification] } }
      : {}),
  };
}

function eventHi(e: SkyEvent): SkyEvent {
  return {
    ...e,
    planetName: PLANET_HI[e.planet],
    ...(e.fromSign ? { fromSign: signRefHi(e.fromSign) } : {}),
    ...(e.toSign ? { toSign: signRefHi(e.toSign) } : {}),
    ...(e.sign ? { sign: signRefHi(e.sign) } : {}),
  };
}

export function panchangHi(p: PanchangFacts): PanchangFacts {
  return {
    vara: { ...p.vara, name: varaHi(p.vara.name), lord: planetHi(p.vara.lord) },
    tithi: { ...p.tithi, name: tithiNameHi(p.tithi.name), label: tithiLabelHi(p.tithi) },
    nakshatra: { ...p.nakshatra, name: nakshatraHi(p.nakshatra.name), lord: planetHi(p.nakshatra.lord) },
    yoga: { ...p.yoga, name: yogaHi(p.yoga.name) },
    karana: { ...p.karana, name: karanaHi(p.karana.name) },
  };
}

export interface LocalizedFactsView {
  rashi: RashiDailyFacts['rashi'];
  panchang: DailySky['panchang'];
  moon: RashiDailyFacts['moon'];
  planets: RashiDailyFacts['planets'];
  events: DailySky['events'];
  tally: RashiDailyFacts['tally'];
  method: RashiDailyFacts['method'];
}

/**
 * The reader-facing strings of the facts in Hindi. Codes and numbers are untouched:
 * planet codes, sign index / sanskritName / englishName, house numbers, the
 * `classification` and `paksha` values, degrees, ISO instants, IST dates and times,
 * `vara.english`, `rashi.element` and `rashi.ruler`. Signs gain `hindiName`, and
 * every classification gains `classificationLabel`.
 */
export function factsViewHi(facts: RashiDailyFacts): LocalizedFactsView {
  return {
    rashi: { ...facts.rashi, hindiName: signHi(facts.rashi.index) },
    panchang: panchangHi(facts.sky.panchang),
    moon: planetGocharaHi(facts.moon),
    planets: facts.planets.map(planetGocharaHi),
    events: facts.sky.events.map(eventHi),
    tally: {
      ...facts.tally,
      favourablePlanets: facts.tally.favourablePlanets.map(planetHi),
      demandingPlanets: facts.tally.demandingPlanets.map(planetHi),
      method: TALLY_METHOD_HI,
    },
    method: { ...facts.method, summary: METHOD_SUMMARY_HI, sources: [...METHOD_SOURCES_HI] },
  };
}

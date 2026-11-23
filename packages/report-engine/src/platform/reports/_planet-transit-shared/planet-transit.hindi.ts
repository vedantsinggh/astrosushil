/**
 * Planet-transit family (Saturn, Jupiter Transit, Rahu–Ketu Transit): Hindi display text
 * shared by the three reports. Nothing here calculates: these are Hindi forms of labels,
 * dates and sentences built from values the solver already produced. Evidence labels stay
 * English (./evidence.ts), so claims are audited identically in both editions.
 *
 * The fixed labels live in a map private to this family rather than in the global glossary,
 * so a short generic heading ("Dates", "Status") can never conflict with another report's.
 */
import { ordinal } from '../../evidence/evidence-registry';
import { HindiEdition, pick, planetLabel, ReportLanguage, signLabel } from '../../i18n/hindi';
import { formatDate } from '../../render/latex';
import type { StaticContent } from './blocks';
import type { PlanetKey } from './calc/planet-transit';
import type { RetroWindow, SignSpan } from './calc/timeline';
import { binduReading, retroText, savReading, spanText } from './evidence';

// ------------------------------------------------------------------ labels --

const LABELS_HI: Record<string, string> = {
  // key/value tables
  Factor: 'विषय', 'Your chart': 'आपकी कुंडली',
  Name: 'नाम', 'Birth details': 'जन्म विवरण', 'Ascendant (Lagna)': 'लग्न', 'Moon sign and nakshatra': 'चंद्र राशि और नक्षत्र',
  // column headings
  Aspect: 'दृष्टि', 'Sign aspected': 'दृष्ट राशि', 'From Lagna': 'लग्न से', 'From Moon': 'चंद्र से', 'Natal planets there': 'वहाँ स्थित जन्म के ग्रह',
  'House ruled': 'स्वामित्व का भाव', Sign: 'राशि', 'Classical category': 'शास्त्रीय वर्ग',
  House: 'भाव', Total: 'कुल', SAV: 'सर्व', BAV: 'भिन्न',
  Bindus: 'बिंदु', 'Classical reading of a transit through that sign': 'उस राशि से गोचर का शास्त्रीय अर्थ',
  'Transit sign': 'गोचर राशि', From: 'कब से', Lagna: 'लग्न', Moon: 'चंद्र', 'Classical reading': 'शास्त्रीय अर्थ',
  Node: 'छाया ग्रह', 'Compared with the average': 'औसत की तुलना में',
  'Natal planets aspected': 'दृष्ट जन्म ग्रह', Dates: 'तिथियाँ',
  'No.': 'क्रम', 'Natal sign': 'जन्म राशि', 'Transit dates': 'गोचर की तिथियाँ', Age: 'आयु',
  // stay card
  Status: 'स्थिति', 'Dates in this sign': 'इस राशि में तिथियाँ', 'House from your Ascendant': 'आपके लग्न से भाव', 'House from your Moon': 'आपके चंद्र से भाव',
  'Over natal planets': 'जन्म के ग्रहों के ऊपर', 'Retrograde windows': 'वक्री काल', 'Ashtakavarga support': 'अष्टकवर्ग का सहारा',
  'Sarvashtakavarga of the sign': 'राशि का सर्वाष्टकवर्ग',
  'In progress on the report date': 'रिपोर्ट की तिथि पर चल रहा है',
  'Begun; the planet is briefly in a neighbouring sign on the report date and will return': 'शुरू हो चुका है; रिपोर्ट की तिथि पर ग्रह थोड़े समय के लिए पड़ोसी राशि में है और लौटेगा',
  Upcoming: 'आने वाला',
  'none (the sign is empty in your birth chart)': 'कोई नहीं (आपकी जन्म कुंडली में यह राशि ख़ाली है)',
  'none during this sign period': 'इस राशि-काल में कोई नहीं',
  none: 'कोई नहीं',
  // readings
  supportive: 'सहायक', balanced: 'संतुलित', 'patience and effort': 'धैर्य और परिश्रम',
  // cards
  'Company and glances': 'साथी ग्रह और दृष्टियाँ', 'Sharing the house:': 'भाव में साथ:',
  'How to read your own table in four steps': 'अपनी तालिका चार क़दमों में कैसे पढ़ें',
  'Please note': 'कृपया ध्यान दें',
  // lordship categories
  'kendra (angle: action, stability)': 'केंद्र (कर्म, स्थिरता)',
  'trikona (trine: fortune, dharma)': 'त्रिकोण (भाग्य, धर्म)',
  'dusthana (6/8/12: effort, transformation, release)': 'त्रिक भाव (6/8/12: परिश्रम, रूपांतरण, त्याग)',
  'upachaya (3/6/10/11: grows stronger with time)': 'उपचय (3/6/10/11: समय के साथ बलवान)',
  'dhana (2/11: resources and gains)': 'धन भाव (2/11: संसाधन और लाभ)',
  // bindu guide
  'Very little support from the planet\'s own scheme in this sign. Classical texts advise keeping commitments light, finishing old work and leaning on routine and rest.':
    'इस राशि में ग्रह के अपने अष्टकवर्ग से बहुत कम सहारा। शास्त्र सलाह देते हैं कि नई ज़िम्मेदारियाँ कम रखें, पुराने काम पूरे करें और दिनचर्या तथा विश्राम का सहारा लें।',
  'Below the classical threshold of four. The transit tends to ask for patience, careful planning and steady effort before results show.':
    'चार की शास्त्रीय सीमा से कम। यह गोचर प्रायः धैर्य, सोची-समझी योजना और लगातार परिश्रम माँगता है, तब जाकर परिणाम दिखते हैं।',
  'The classical midpoint. Results are mixed and depend strongly on the houses involved and on the planet\'s other contacts.':
    'शास्त्रीय मध्य बिंदु। परिणाम मिले-जुले रहते हैं और बहुत कुछ संबंधित भावों तथा ग्रह के अन्य संबंधों पर निर्भर करता है।',
  'Above the threshold. The transit tends to support the matters of the house it passes through; efforts begun now usually find traction.':
    'सीमा से ऊपर। यह गोचर प्रायः उस भाव के विषयों में सहायक रहता है जिससे ग्रह गुज़रता है; इस समय शुरू किए गए प्रयास अक्सर गति पकड़ते हैं।',
  'Strong support. Classical texts treat such a sign as one of the best places in the chart for this planet\'s transit.':
    'प्रबल सहारा। शास्त्र ऐसी राशि को इस ग्रह के गोचर के लिए कुंडली के सबसे अच्छे स्थानों में गिनते हैं।',
  'Find the sign the planet is transiting (the shaded column).': 'वह राशि खोजिए जिसमें ग्रह गोचर कर रहा है (हल्के रंग वाला स्तंभ)।',
  'Read the planet\'s own total (Bhinnashtakavarga) for that sign: four is the classical dividing line.':
    'उस राशि के लिए ग्रह के अपने बिंदु (भिन्नाष्टकवर्ग) पढ़िए: चार शास्त्रीय विभाजक रेखा है।',
  'Read the Sarvashtakavarga total for the same sign: 28 is the average; higher means the life area is broadly well supported.':
    'उसी राशि का सर्वाष्टकवर्ग योग पढ़िए: 28 औसत है; अधिक का अर्थ है कि जीवन के उस क्षेत्र को व्यापक सहारा है।',
  'Count the house that sign occupies from your Ascendant and from your Moon to see which areas of life the transit touches.':
    'गिनिए कि वह राशि आपके लग्न से और आपके चंद्र से कौन-सा भाव है, ताकि पता चले कि गोचर जीवन के किन क्षेत्रों को छूता है।',
  // method notes without values
  'Chandra Lagna chart: the natal Moon sign is placed in the top diamond as the 1st house, so every house is counted from the Moon. Transits from the Moon (Sade Sati, Kantaka, Dhaiya) are read on this chart.':
    'चंद्र लग्न कुंडली: जन्म की चंद्र राशि को ऊपर के बीच वाले खाने में 1ला भाव माना गया है, इसलिए हर भाव चंद्र से गिना जाता है। चंद्र से होने वाले गोचर (साढ़े साती, कंटक, ढैया) इसी कुंडली पर पढ़े जाते हैं।',
  'Sidereal zodiac, Lahiri ayanamsa, whole-sign houses, mean nodes (provisional conventions recorded in the report manifest).':
    'निरयण राशिचक्र, लाहिड़ी अयनांश, संपूर्ण-राशि भाव पद्धति, मध्यम राहु-केतु (ये अस्थायी परिपाटियाँ रिपोर्ट के अभिलेख में दर्ज हैं)।',
  'Functional nature from house lordship counted from the Ascendant (whole signs). Categories are the standard Parashari groupings; no score is computed.':
    'लग्न से गिने गए भाव-स्वामित्व (संपूर्ण राशि) से ग्रह की भूमिका। वर्ग पाराशरी पद्धति के मानक समूह हैं; कोई अंक नहीं निकाला गया है।',
  'Classical thresholds (BPHS Ashtakavarga chapters; Phaladeepika ch. 23): four bindus is the midpoint for a planet\'s own scheme, 28 is the Sarvashtakavarga average. Explanatory text, identical for every reader.':
    'शास्त्रीय सीमाएँ (बृहत् पाराशर होरा शास्त्र के अष्टकवर्ग अध्याय; फलदीपिका, अध्याय 23): ग्रह के अपने अष्टकवर्ग में चार बिंदु मध्य बिंदु है, और 28 सर्वाष्टकवर्ग का औसत है। यह समझाने वाला पाठ हर पाठक के लिए समान है।',
  'Rahu and Ketu have no Bhinnashtakavarga of their own in the classical scheme (BPHS uses the seven grahas and the Ascendant only), so only the Sarvashtakavarga of the signs they transit is shown (decision PT-008).':
    'शास्त्रीय पद्धति में राहु और केतु का अपना भिन्नाष्टकवर्ग नहीं होता (बृहत् पाराशर होरा शास्त्र केवल सात ग्रहों और लग्न का उपयोग करता है), इसलिए केवल उन राशियों का सर्वाष्टकवर्ग (सर्व) दिखाया गया है जिनमें वे गोचर करते हैं (निर्णय PT-008)।',
  'Sign ingresses and retrograde stations solved with the TransitIngressSolver (sidereal, Lahiri). A sign period groups the main stay with any retrograde re-entry; each continuous span is listed. Aspects by whole sign as for the natal chart.':
    'राशि-प्रवेश और वक्री-मार्गी होने की तिथियाँ गोचर गणना से निकाली गई हैं (निरयण, लाहिड़ी)। एक राशि-काल में मुख्य प्रवास के साथ वक्री होकर हुआ पुनः प्रवेश भी गिना जाता है; हर लगातार अवधि अलग दी गई है। दृष्टियाँ जन्म कुंडली की तरह संपूर्ण राशि से।',
  'Educational text written by Astro Sushil, identical for every reader.': 'एस्ट्रो सुशील द्वारा लिखा गया शैक्षिक पाठ, जो हर पाठक के लिए समान है।',
};

/** A fixed label of this family in the report language. An untranslated Hindi label is a defect, never printed as English. */
export function tl(lang: ReportLanguage, en: string): string {
  if (lang === 'en') return en;
  const hi = LABELS_HI[en];
  if (hi === undefined) throw new Error(`HINDI_LABEL_MISSING: planet-transit "${en}"`);
  return pick(lang, en, hi);
}

/**
 * One of two texts built from values, by language. Only the chosen one is built, so the
 * English report never depends on the Hindi glossary.
 */
export const pickLazy = (lang: ReportLanguage, en: () => string, hi: () => string): string => (lang === 'hi' ? hi() : en());

// ------------------------------------------------------- numbers and dates --

const MONTHS_HI = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];

/** A calendar date in the report language, by its UTC fields exactly as `formatDate` (same day, month and year). */
export function dateL(lang: ReportLanguage, iso: string): string {
  if (lang === 'en') return formatDate(iso);
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso);
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS_HI[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

const ordSuffix = (n: number, forms: [string, string, string, string, string]): string =>
  n === 1 ? forms[0] : n === 2 || n === 3 ? forms[1] : n === 4 ? forms[2] : n === 6 ? forms[3] : forms[4];

/** Ordinal with the number kept as a digit: "7th" / "7वाँ" (as in "7वाँ भाव"). */
export const ord = (lang: ReportLanguage, n: number): string => (lang === 'en' ? ordinal(n) : `${n}${ordSuffix(n, ['ला', 'रा', 'था', 'ठा', 'वाँ'])}`);
/** Hindi oblique ordinal, used before a postposition: "7वें भाव में". */
export const ordObliqueHi = (n: number): string => `${n}${ordSuffix(n, ['ले', 'रे', 'थे', 'ठे', 'वें'])}`;
/** Hindi feminine ordinal, for राशि: "12वीं राशि". */
export const ordFeminineHi = (n: number): string => `${n}${ordSuffix(n, ['ली', 'री', 'थी', 'ठी', 'वीं'])}`;

/** "7th house" / "7वाँ भाव". */
export const houseL = (lang: ReportLanguage, n: number): string => pick(lang, `${ordinal(n)} house`, `${ord('hi', n)} भाव`);

/** A list of planet names in the report language. */
export const planetsL = (lang: ReportLanguage, names: string[]): string => names.map((n) => planetLabel(lang, n)).join(', ');

// ------------------------------------------------- sentences built from values --

/** One continuous span in a sign; the English form is the evidence text (`spanText`). */
export function spanL(lang: ReportLanguage, s: SignSpan): string {
  if (lang === 'en') return spanText(s);
  const from = `${dateL(lang, s.startIso)} ${s.startClipped ? 'के पहले से' : 'से'}`;
  const to = `${dateL(lang, s.endIso)} ${s.endClipped ? 'के बाद तक' : 'तक'}`;
  return `${from} ${to}${s.enteredRetrograde ? ' (वक्री होकर पुनः प्रवेश)' : ''}`;
}

/** One retrograde window; the English form is the evidence text (`retroText`). */
export function retroL(lang: ReportLanguage, w: RetroWindow): string {
  if (lang === 'en') return retroText(w);
  const where: string[] = [];
  if (w.startSign) where.push(`${signLabel(lang, w.startSign)} में वक्री`);
  if (w.endSign && w.endSign !== w.startSign) where.push(`${signLabel(lang, w.endSign)} में मार्गी`);
  return `वक्री ${w.startIso ? `${dateL(lang, w.startIso)} से` : '(पहले से वक्री)'} ${w.endIso ? `${dateL(lang, w.endIso)} तक` : '(इस अवधि के बाद तक)'}${where.length ? ` (${where.join(', ')})` : ''}`;
}

export function binduReadingL(lang: ReportLanguage, b: number): string {
  if (lang === 'en') return binduReading(b);
  if (b >= 5) return '4 से अधिक: शास्त्र इसे सहायक गोचर मानते हैं';
  if (b === 4) return 'ठीक 4: शास्त्र इसे संतुलित (मिला-जुला) सहारा मानते हैं';
  return '4 से कम: शास्त्र इसे धैर्य और परिश्रम माँगने वाला गोचर मानते हैं';
}

export function savReadingL(lang: ReportLanguage, s: number): string {
  if (lang === 'en') return savReading(s);
  return s >= 28 ? 'औसत 28 के बराबर या उससे अधिक' : 'औसत 28 से कम';
}

/** Sign names short enough for the twelve narrow Ashtakavarga columns (Aries … Pisces). */
export const SIGN_ABBR_HI = ['मेष', 'वृष', 'मिथु', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चि', 'धनु', 'मकर', 'कुंभ', 'मीन'];

// ----------------------------------------------------------- static content --

export const REMEDY_PRINCIPLES_HI: StaticContent = {
  paragraphs: [
    'एस्ट्रो सुशील की दृष्टि में उपाय का अर्थ है जीने के ढंग में बदलाव, कोई वस्तु ख़रीदना नहीं। शास्त्र स्वयं आचरण, अनुशासन, सेवा और भक्ति को हर भौतिक उपाय से ऊपर रखते हैं, और इन पर कुछ ख़र्च नहीं होता।',
    'दो या तीन ऐसे अभ्यास चुनिए जो आपको सहज लगें, उन्हें कम से कम चालीस दिन निभाइए, और देखिए कि ग्रह के विषयों पर आपकी प्रतिक्रिया कैसे बदलती है। तीव्रता से कहीं अधिक महत्व नियमितता का है।',
  ],
  note: 'इस खंड में कुछ भी ख़रीदने की ज़रूरत नहीं है। हम रत्न, सशुल्क अनुष्ठान या ताबीज़ नहीं सुझाते। यदि आपकी कोई चिकित्सा, मानसिक स्वास्थ्य, क़ानूनी या आर्थिक चिंता है, तो कृपया योग्य विशेषज्ञ से सलाह लें; ये अभ्यास ऐसी सलाह के पूरक हैं, उसका विकल्प कभी नहीं।',
};

/** Source line of the Navagraha Stotra verses, shared by the three reports. */
export const NAVAGRAHA_STOTRA_SOURCE_HI = 'नवग्रह स्तोत्र, जो परंपरा से महर्षि व्यास की रचना माना जाता है';

// -------------------------------------------------------------- shared topics --

type TopicText = HindiEdition['topics'][string];

/**
 * Hindi title and subtitle of every topic built by ./topics.ts for one planet, keyed by topic id.
 * A report passes its own titles (as it does in English); subtitles are shared. Ids the report
 * does not use are ignored by the edition overlay.
 */
export function sharedTopicsHindi(k: PlanetKey, titles: Record<string, string> = {}): Record<string, TopicText> {
  const P = planetLabel('hi', { saturn: 'Saturn', jupiter: 'Jupiter', rahu: 'Rahu', ketu: 'Ketu' }[k]);
  const topics: Record<string, TopicText> = {
    [`${k}-house`]: { title: `आपकी जन्म कुंडली में ${P}`, subtitle: 'वह भाव जिसे इस ग्रह की जीवन भर की सीख मिलती है' },
    [`${k}-sign`]: { title: `${P} अपनी राशि में`, subtitle: 'राशि, स्थिति और वह राशि स्वामी जिसके माध्यम से फल मिलता है' },
    [`${k}-nakshatra`]: { title: `${P} का नक्षत्र`, subtitle: 'वह नक्षत्र जो इसकी अभिव्यक्ति को रंग देता है' },
    [`${k}-aspects`]: { title: `${P} की दृष्टि`, subtitle: 'वे भाव और ग्रह जिन पर आपके जन्म के इस ग्रह की दृष्टि है' },
    [`${k}-conjunctions`]: { title: `${P} के साथी ग्रह`, subtitle: 'वे ग्रह जो इसके भाव में साथ हैं या इस पर दृष्टि डालते हैं' },
    [`${k}-functional`]: { title: `शुभ या परिश्रम माँगने वाला? आपके लग्न के लिए ${P} की भूमिका`, subtitle: 'इसके स्वामित्व वाले भावों से तय होने वाला स्वभाव' },
    [`${k}-moon-sign`]: { title: `${P} और आपकी चंद्र राशि`, subtitle: 'मन इस ग्रह से कैसे मिलता है' },
    [`${k}-moon-psyche`]: { title: `भीतरी विकास: चंद्र और ${P}`, subtitle: 'इस ग्रह के साथ आपके भावनात्मक विकास की राह' },
    [`${k}-collective`]: { title: 'सामूहिक वातावरण', subtitle: `${P} की वर्तमान राशि का सबके लिए क्या अर्थ है` },
    [`${k}-bav-reading`]: { title: `अपने ${P} का अष्टकवर्ग पढ़ना`, subtitle: 'इस ग्रह के गोचर को कहाँ सबसे अधिक और कहाँ सबसे कम सहारा मिलता है' },
  };
  for (const slot of ['a', 'b']) {
    topics[`${k}-${slot}-lagna`] = { title: 'यह गोचर क्या लाता है', subtitle: 'आपके लग्न से शारीरिक, मानसिक और आध्यात्मिक विषय' };
    topics[`${k}-${slot}-aspects`] = { title: 'इसकी दृष्टि कहाँ पड़ती है', subtitle: 'गोचर के ग्रह की दृष्टियाँ' };
    topics[`${k}-${slot}-moon`] = { title: 'वही गोचर, आपके चंद्र से', subtitle: 'चंद्र राशि से गोचर: मन का मौसम' };
    topics[`${k}-${slot}-natal`] = { title: 'आपके जन्म के ग्रहों पर गोचर', subtitle: 'जन्म के ग्रहों से युति और दृष्टि' };
    topics[`${k}-${slot}-retro`] = { title: 'वक्री काल', subtitle: 'पुनर्विचार, सुधार और भीतरी काम' };
    topics[`${k}-${slot}-av`] = { title: 'इस गोचर को अष्टकवर्ग का सहारा', subtitle: 'इस राशि के बारे में आपके बिंदु क्या कहते हैं' };
  }
  for (const [id, title] of Object.entries(titles)) {
    if (!topics[id]) throw new Error(`HINDI_SHARED_TOPIC_UNKNOWN: ${id}`);
    topics[id] = { ...topics[id], title };
  }
  return topics;
}

/** The three chart topics every report of the family opens with (the transit chart's title is the report's own). */
export function chartTopicsHindi(transitChartTitle: string): Record<string, TopicText> {
  return {
    'natal-chart': { title: 'जन्म कुंडली (लग्न कुंडली)' },
    'moon-chart': { title: 'चंद्र कुंडली' },
    'transit-chart': { title: transitChartTitle, subtitle: 'रिपोर्ट की तिथि के ग्रह, आपके भावों में' },
  };
}

/** Intro of the opening "at a glance" section, identical in the three reports. */
export const GLANCE_INTRO_HI = 'वे गणना किए गए तथ्य जिन पर यह रिपोर्ट आधारित है: आपकी जन्म कुंडली, आपकी चंद्र कुंडली और रिपोर्ट की तिथि का आकाश।';

/**
 * Hindi display vocabulary shared by the annual reports (Varshphal and the
 * Personalised Horoscope): table headings, dates, ordinals, Panchanga and
 * Avakahada names, and the traditional planetary correspondences.
 *
 * Display only. Nothing here calculates: every function takes a value the
 * engine already produced and returns its Hindi name. English is always
 * returned unchanged, so callers that pass no language print what they did before.
 *
 * The labels live in this file's own table (not the platform glossary) so the
 * annual reports cannot collide with another report that words the same
 * English heading differently; the platform glossary is the fallback.
 */
import { ordinal, PlanetName } from '../../evidence/evidence-registry';
import { label, planetLabel, ReportLanguage, signLabel } from '../../i18n/hindi';
import type { AvakahadaFacts } from './avakahada';

const hiText = (s: string) => s.normalize('NFC');

/** One of two texts by language; the Hindi form is normalised for the Devanagari font switch. */
export const pk = (lang: ReportLanguage, en: string, hi: string): string => (lang === 'hi' ? hiText(hi) : en);

// ---------------------------------------------------------------------------
// Fixed labels (keyed by the English text)
// ---------------------------------------------------------------------------

const ANNUAL_HI: Record<string, string> = {
  // key/value tables
  Factor: 'विवरण', Value: 'मान', 'Your chart': 'आपकी कुंडली',
  // transit tables
  Period: 'अवधि', 'From Asc': 'लग्न से', 'From Moon': 'चंद्र से', Gochara: 'गोचर',
  Supportive: 'सहायक', Demanding: 'चुनौतीपूर्ण',
  ' (R)': ' (व)',
  // Avakahada synopsis
  Name: 'नाम', 'Date of birth': 'जन्म तिथि', 'Time of birth': 'जन्म समय', 'Place of birth': 'जन्म स्थान',
  'Ascendant (Lagna)': 'लग्न', 'Ascendant lord': 'लग्नेश', 'Moon sign (Rashi)': 'चंद्र राशि', 'Rashi lord': 'राशि स्वामी',
  'Nakshatra and pada': 'नक्षत्र और चरण', 'Nakshatra lord': 'नक्षत्र स्वामी', 'Western Sun sign': 'पाश्चात्य सूर्य राशि',
  'Name syllable (namakshara)': 'नामाक्षर', Tithi: 'तिथि', 'Vara (weekday)': 'वार', Yoga: 'योग', Karana: 'करण',
  Gana: 'गण', Yoni: 'योनि', Nadi: 'नाड़ी', Varna: 'वर्ण', Vashya: 'वश्य', 'Tatva (element)': 'तत्व', Paya: 'पाया', Yunja: 'युंजा', Hansaka: 'हंसक',
  'Avakahada Chakra from the Moon\'s sign, nakshatra and pada, and the Panchanga at the birth instant, computed by the engine\'s Avakhada and Panchanga calculators. Western Sun sign uses the tropical zodiac; everything else is sidereal (Lahiri).':
    'अवकहड़ा चक्र चंद्र की राशि, नक्षत्र और चरण से, और पंचांग जन्म के क्षण से, इंजन के अवकहड़ा और पंचांग गणकों द्वारा निकाला गया है। पाश्चात्य सूर्य राशि सायन राशिचक्र से है; शेष सब कुछ निरयण (लाहिरी अयनांश) है।',
  // gochara rule
  'Classical gochara from the natal Moon (Phaladeepika ch. 26): Sun favourable in the 3rd, 6th, 10th, 11th; Mars, Saturn, Rahu and Ketu in the 3rd, 6th, 11th; Mercury in the 2nd, 4th, 6th, 8th, 10th, 11th; Jupiter in the 2nd, 5th, 7th, 9th, 11th; Venus in all houses except the 6th, 7th and 10th. Vedha (obstruction) is not applied. Supportive = a house the text lists as favourable; Demanding = one it does not. Neither is a prediction of events.':
    'जन्म के चंद्र से शास्त्रीय गोचर (फलदीपिका, अध्याय 26): सूर्य 3रे, 6ठे, 10वें, 11वें भाव में अनुकूल; मंगल, शनि, राहु और केतु 3रे, 6ठे, 11वें में; बुध 2रे, 4थे, 6ठे, 8वें, 10वें, 11वें में; गुरु 2रे, 5वें, 7वें, 9वें, 11वें में; शुक्र 6ठे, 7वें और 10वें को छोड़कर सभी भावों में। वेध (बाधा) लागू नहीं किया गया है। सहायक = वह भाव जिसे ग्रंथ अनुकूल बताता है; चुनौतीपूर्ण = वह जिसे ग्रंथ अनुकूल नहीं बताता। दोनों में से कोई भी घटनाओं की भविष्यवाणी नहीं है।',
};

/** Adds a report's own fixed labels. The same English label must not be given two Hindi forms. */
export function addAnnualLabels(labels: Record<string, string>): void {
  for (const [en, hi] of Object.entries(labels)) {
    const existing = ANNUAL_HI[en];
    if (existing !== undefined && existing !== hi) throw new Error(`HINDI_LABEL_CONFLICT: "${en}" is already "${existing}", not "${hi}"`);
    ANNUAL_HI[en] = hi;
  }
}

/** A fixed label in the report language: this file's table first, then the platform glossary (which throws when missing). */
export function L(lang: ReportLanguage, en: string): string {
  if (lang === 'en') return en;
  const hi = ANNUAL_HI[en];
  return hiText(hi !== undefined ? hi : label(lang, en));
}

const from = (map: Record<string, string>, kind: string) => (lang: ReportLanguage, en: string): string => {
  if (lang === 'en') return en;
  const hi = map[en];
  if (hi === undefined) throw new Error(`HINDI_${kind}_MISSING: "${en}"`);
  return hiText(hi);
};

// ---------------------------------------------------------------------------
// Ordinals and dates
// ---------------------------------------------------------------------------

const ORD_HI = ['', '1ला', '2रा', '3रा', '4था', '5वाँ', '6ठा'];
const ORD_HI_OBLIQUE = ['', '1ले', '2रे', '3रे', '4थे', '5वें', '6ठे'];

/** "5th" / "5वाँ" (as a table cell or the subject of a phrase). */
export const ord = (lang: ReportLanguage, n: number): string => (lang === 'en' ? ordinal(n) : ORD_HI[n] ?? `${n}वाँ`);
/** Hindi oblique ordinal for use before a postposition ("5वें भाव में"). English is the plain ordinal. */
export const ordOblique = (lang: ReportLanguage, n: number): string => (lang === 'en' ? ordinal(n) : ORD_HI_OBLIQUE[n] ?? `${n}वें`);

export const MONTHS_HI = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'].map(hiText);

function dateParts(iso: string, timezone: string, withTime: boolean): Record<string, string> {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'numeric', year: 'numeric', timeZone: timezone,
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  });
  return Object.fromEntries(fmt.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
}

/** "08 जून 2026": the same day, month and year the English date shows, in the subject's timezone. */
export function hindiDate(iso: string, timezone: string): string {
  const p = dateParts(iso, timezone, false);
  return `${p.day} ${MONTHS_HI[Number(p.month) - 1]} ${p.year}`;
}

/** "08 जून 2026, 14:35". */
export function hindiDateTime(iso: string, timezone: string): string {
  const p = dateParts(iso, timezone, true);
  return `${p.day} ${MONTHS_HI[Number(p.month) - 1]} ${p.year}, ${p.hour}:${p.minute}`;
}

/** "जून 2026" for an instant read in UTC (month ranges of the horoscope windows). */
export function hindiMonthYear(d: Date): string {
  return `${MONTHS_HI[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// ---------------------------------------------------------------------------
// Panchanga and Avakahada values (keyed by the engine's spelling)
// ---------------------------------------------------------------------------

export const PAKSHA_HI: Record<string, string> = { Sukla: 'शुक्ल', Shukla: 'शुक्ल', Krishna: 'कृष्ण' };

export const TITHI_HI: Record<string, string> = {
  Pratipada: 'प्रतिपदा', Dwitiya: 'द्वितीया', Tritiya: 'तृतीया', Chaturthi: 'चतुर्थी', Panchami: 'पंचमी', Shashthi: 'षष्ठी',
  Saptami: 'सप्तमी', Ashtami: 'अष्टमी', Navami: 'नवमी', Dashami: 'दशमी', Ekadashi: 'एकादशी', Dwadashi: 'द्वादशी',
  Trayodashi: 'त्रयोदशी', Chaturdashi: 'चतुर्दशी', Purnima: 'पूर्णिमा', Amavasya: 'अमावस्या',
};

export const VARA_HI: Record<string, string> = {
  Ravivara: 'रविवार', Somavara: 'सोमवार', Mangalavara: 'मंगलवार', Budhavara: 'बुधवार', Guruvara: 'गुरुवार', Shukravara: 'शुक्रवार', Shanivara: 'शनिवार',
};

export const WEEKDAY_HI: Record<string, string> = {
  Sunday: 'रविवार', Monday: 'सोमवार', Tuesday: 'मंगलवार', Wednesday: 'बुधवार', Thursday: 'गुरुवार', Friday: 'शुक्रवार', Saturday: 'शनिवार',
};

export const PANCHANGA_YOGA_HI: Record<string, string> = {
  Vishkambha: 'विष्कंभ', Priti: 'प्रीति', Ayushman: 'आयुष्मान', Saubhagya: 'सौभाग्य', Shobhana: 'शोभन', Atiganda: 'अतिगंड',
  Sukarma: 'सुकर्मा', Dhriti: 'धृति', Shoola: 'शूल', Ganda: 'गंड', Vriddhi: 'वृद्धि', Dhruva: 'ध्रुव', Vyaghata: 'व्याघात',
  Harshana: 'हर्षण', Vajra: 'वज्र', Siddhi: 'सिद्धि', Vyatipata: 'व्यतिपात', Variyan: 'वरीयान', Parigha: 'परिघ', Shiva: 'शिव',
  Siddha: 'सिद्ध', Sadhya: 'साध्य', Shubha: 'शुभ', Shukla: 'शुक्ल', Brahma: 'ब्रह्म', Indra: 'इंद्र', Vaidhriti: 'वैधृति',
};

export const KARANA_HI: Record<string, string> = {
  Bava: 'बव', Balava: 'बालव', Kaulava: 'कौलव', Taitila: 'तैतिल', Gara: 'गर', Vanija: 'वणिज', Vishti: 'विष्टि',
  Shakuni: 'शकुनि', Chatushpada: 'चतुष्पद', Naga: 'नाग', Kimstughna: 'किंस्तुघ्न',
};

/** Lunar months as the engine names them (AMANTA_MASAS). */
export const MASA_HI: Record<string, string> = {
  Chaitra: 'चैत्र', Vaisakha: 'वैशाख', Jyeshtha: 'ज्येष्ठ', Ashadha: 'आषाढ़', Shravana: 'श्रावण', Bhadrapada: 'भाद्रपद',
  Ashvina: 'आश्विन', Kartika: 'कार्तिक', Margashirsha: 'मार्गशीर्ष', Pausha: 'पौष', Magha: 'माघ', Phalguna: 'फाल्गुन',
};

export const GANA_HI: Record<string, string> = { Deva: 'देव', Manushya: 'मनुष्य', Rakshasa: 'राक्षस' };
export const NADI_HI: Record<string, string> = { Adi: 'आदि', Madhya: 'मध्य', Antya: 'अंत्य' };
export const VARNA_HI: Record<string, string> = { Brahmin: 'ब्राह्मण', Kshatriya: 'क्षत्रिय', Vaishya: 'वैश्य', Shudra: 'शूद्र' };
export const VASHYA_HI: Record<string, string> = { Chatushpada: 'चतुष्पद', Manava: 'मानव', Jalachara: 'जलचर', Vanachara: 'वनचर', Keeta: 'कीट' };
export const TATVA_HI: Record<string, string> = { Agni: 'अग्नि', Prithvi: 'पृथ्वी', Vayu: 'वायु', Jala: 'जल' };
export const PAYA_HI: Record<string, string> = {
  'Swarna (Gold)': 'स्वर्ण (सोना)', 'Rajata (Silver)': 'रजत (चाँदी)', 'Tamra (Copper)': 'ताम्र (ताँबा)', 'Loha (Iron)': 'लौह (लोहा)',
};
export const YUNJA_HI: Record<string, string> = { Purva: 'पूर्व', Madhya: 'मध्य', Uttara: 'उत्तर' };
export const HANSAKA_HI: Record<string, string> = { Bhoomi: 'भूमि', Varun: 'वरुण', Vayu: 'वायु', Jala: 'जल' };
export const YONI_HI: Record<string, string> = {
  'Ashwa (Horse)': 'अश्व (घोड़ा)', 'Gaja (Elephant)': 'गज (हाथी)', 'Mesha (Sheep)': 'मेष (भेड़)', 'Sarpa (Serpent)': 'सर्प (साँप)',
  'Shwana (Dog)': 'श्वान (कुत्ता)', 'Marjara (Cat)': 'मार्जार (बिल्ली)', 'Mushaka (Rat)': 'मूषक (चूहा)', 'Gau (Cow)': 'गौ (गाय)',
  'Mahisha (Buffalo)': 'महिष (भैंस)', 'Vyaghra (Tiger)': 'व्याघ्र (बाघ)', 'Mriga (Deer)': 'मृग (हिरण)', 'Vanara (Monkey)': 'वानर (बंदर)',
  'Nakula (Mongoose)': 'नकुल (नेवला)', 'Simha (Lion)': 'सिंह (शेर)',
};
const YONI_GENDER_HI: Record<string, string> = { male: 'नर', female: 'मादा' };

/**
 * Name syllables in Devanagari, by nakshatra and pada. The Roman syllable the
 * engine prints is ambiguous ("Ta" is टा in Purva Phalguni and ता in Swati),
 * so the Hindi form is looked up by position. Each entry is the Devanagari of
 * the engine's own syllable for that pada (NAKSHATRA_NAMAKSHARAS), unchanged.
 */
export const NAMAKSHARA_HI: Record<string, [string, string, string, string]> = {
  Ashwini: ['चू', 'चे', 'चो', 'ला'], Bharani: ['ली', 'लू', 'ले', 'लो'], Krittika: ['अ', 'ई', 'उ', 'ए'], Rohini: ['ओ', 'वा', 'वी', 'वू'],
  Mrigashira: ['वे', 'वो', 'का', 'की'], Ardra: ['कू', 'घ', 'ङ', 'छ'], Punarvasu: ['के', 'को', 'हा', 'ही'], Pushya: ['हू', 'हे', 'हो', 'डा'],
  Ashlesha: ['डे', 'डू', 'डे', 'डो'], Magha: ['मा', 'मी', 'मू', 'मे'], 'Purva Phalguni': ['मो', 'टा', 'टी', 'टू'],
  'Uttara Phalguni': ['टे', 'टो', 'पा', 'पी'], Hasta: ['पू', 'ष', 'ण', 'ठ'], Chitra: ['पे', 'पो', 'रा', 'री'], Swati: ['रू', 'रे', 'रो', 'ता'],
  Vishakha: ['ती', 'तू', 'ते', 'तो'], Anuradha: ['ना', 'नी', 'नू', 'ने'], Jyeshtha: ['नो', 'या', 'यी', 'यू'], Mula: ['ये', 'यो', 'भा', 'भी'],
  'Purva Ashadha': ['भू', 'धा', 'फा', 'ढा'], 'Uttara Ashadha': ['भे', 'भो', 'जा', 'जी'], Shravana: ['खी', 'खू', 'खे', 'खो'],
  Dhanishta: ['गा', 'गी', 'गू', 'गे'], Shatabhisha: ['गो', 'सा', 'सी', 'सू'], 'Purva Bhadrapada': ['से', 'सो', 'दा', 'दी'],
  'Uttara Bhadrapada': ['दू', 'थ', 'झ', 'ञ'], Revati: ['दे', 'दो', 'चा', 'ची'],
};

const tithiHi = (lang: ReportLanguage, tithi: string): string => {
  if (lang === 'en') return tithi;
  const [paksha, ...rest] = tithi.split(' ');
  return `${from(PAKSHA_HI, 'PAKSHA')(lang, paksha)} ${from(TITHI_HI, 'TITHI')(lang, rest.join(' '))}`;
};

const yoniHi = (lang: ReportLanguage, yoni: string): string => {
  if (lang === 'en') return yoni;
  const m = /^(.*) \((male|female)\)$/.exec(yoni);
  if (!m) throw new Error(`HINDI_YONI_MISSING: "${yoni}"`);
  return `${from(YONI_HI, 'YONI')(lang, m[1])} (${YONI_GENDER_HI[m[2]]})`;
};

export const masaLabel = (lang: ReportLanguage, masa: string): string => {
  if (lang === 'en') return masa;
  const adhika = masa.startsWith('Adhika ');
  return `${adhika ? 'अधिक ' : ''}${from(MASA_HI, 'MASA')(lang, adhika ? masa.slice(7) : masa)}`;
};

export const weekdayLabel = from(WEEKDAY_HI, 'WEEKDAY');

/**
 * The value of one synopsis row in Hindi. `nak` names a nakshatra in Hindi
 * (the platform glossary's `nakshatraLabel`), passed in so this file needs no
 * second nakshatra list.
 */
export function avakahadaValueHi(row: string, f: AvakahadaFacts, nak: (en: string) => string): string {
  const lang: ReportLanguage = 'hi';
  switch (row) {
    case 'Ascendant (Lagna)': return signLabel(lang, f.lagnaSign);
    case 'Ascendant lord': return planetLabel(lang, f.lagnaLord);
    case 'Moon sign (Rashi)': return signLabel(lang, f.moonSign);
    case 'Rashi lord': return planetLabel(lang, f.moonSignLord);
    case 'Nakshatra and pada': return hiText(`${nak(f.nakshatra)}, चरण ${f.pada}`);
    case 'Nakshatra lord': return planetLabel(lang, f.nakshatraLord);
    case 'Western Sun sign': return signLabel(lang, f.tropicalSunSign);
    case 'Name syllable (namakshara)': {
      const s = NAMAKSHARA_HI[f.nakshatra]?.[f.pada - 1];
      if (!s) throw new Error(`HINDI_NAMAKSHARA_MISSING: "${f.nakshatra}" pada ${f.pada}`);
      return s;
    }
    case 'Tithi': return tithiHi(lang, f.tithi);
    case 'Vara (weekday)': return from(VARA_HI, 'VARA')(lang, f.vara);
    case 'Yoga': return from(PANCHANGA_YOGA_HI, 'PANCHANGA_YOGA')(lang, f.yoga);
    case 'Karana': return from(KARANA_HI, 'KARANA')(lang, f.karana);
    case 'Gana': return from(GANA_HI, 'GANA')(lang, f.gana);
    case 'Yoni': return yoniHi(lang, f.yoni);
    case 'Nadi': return from(NADI_HI, 'NADI')(lang, f.nadi);
    case 'Varna': return from(VARNA_HI, 'VARNA')(lang, f.varna);
    case 'Vashya': return from(VASHYA_HI, 'VASHYA')(lang, f.vashya);
    case 'Tatva (element)': return from(TATVA_HI, 'TATVA')(lang, f.tatva);
    case 'Paya': return from(PAYA_HI, 'PAYA')(lang, f.paya);
    case 'Yunja': return from(YUNJA_HI, 'YUNJA')(lang, f.yunja);
    case 'Hansaka': return from(HANSAKA_HI, 'HANSAKA')(lang, f.hansaka);
    default: throw new Error(`HINDI_AVAKAHADA_ROW_MISSING: "${row}"`);
  }
}

// ---------------------------------------------------------------------------
// Traditional planetary correspondences (display names of PLANET_ASSOC values)
// ---------------------------------------------------------------------------

export const COLOUR_HI: Record<string, string> = {
  gold: 'सुनहरा', saffron: 'केसरिया', copper: 'ताँबई', white: 'सफ़ेद', silver: 'रुपहला', cream: 'दूधिया', red: 'लाल', coral: 'मूँगिया',
  green: 'हरा', yellow: 'पीला', 'pastel pink': 'हल्का गुलाबी', 'deep blue': 'गहरा नीला', black: 'काला', 'smoky grey': 'धुएँ जैसा स्लेटी',
  navy: 'स्याह नीला', 'earthy brown': 'मटमैला भूरा', grey: 'स्लेटी',
};

/** A comma-separated colour list ("gold, saffron") in the report language. */
export const coloursLabel = (lang: ReportLanguage, colours: string): string =>
  lang === 'en' || !colours ? colours : colours.split(', ').map((c) => from(COLOUR_HI, 'COLOUR')(lang, c)).join(', ');

export const GEM_HI: Record<string, string> = {
  Ruby: 'माणिक्य', Pearl: 'मोती', 'Red Coral': 'मूँगा', Emerald: 'पन्ना', 'Yellow Sapphire': 'पुखराज', Diamond: 'हीरा',
  'Blue Sapphire': 'नीलम', Hessonite: 'गोमेद', "Cat's Eye": 'लहसुनिया',
};
export const gemLabel = from(GEM_HI, 'GEM');

export const DEITY_HI: Record<string, string> = {
  Surya: 'सूर्य देव', 'Shiva and Parvati': 'शिव और पार्वती', Hanuman: 'हनुमान', Vishnu: 'विष्णु', 'Guru Dakshinamurthy': 'गुरु दक्षिणामूर्ति',
  Lakshmi: 'लक्ष्मी', 'Shani and Hanuman': 'शनि देव और हनुमान', Durga: 'दुर्गा', Ganesha: 'गणेश',
};
export const deityLabel = from(DEITY_HI, 'DEITY');

export const MANTRA_HI: Record<string, string> = {
  'Om Suryaya Namah': 'ॐ सूर्याय नमः', 'Om Chandraya Namah': 'ॐ चंद्राय नमः', 'Om Mangalaya Namah': 'ॐ मंगलाय नमः',
  'Om Budhaya Namah': 'ॐ बुधाय नमः', 'Om Brihaspataye Namah': 'ॐ बृहस्पतये नमः', 'Om Shukraya Namah': 'ॐ शुक्राय नमः',
  'Om Shanaischaraya Namah': 'ॐ शनैश्चराय नमः', 'Om Rahave Namah': 'ॐ राहवे नमः', 'Om Ketave Namah': 'ॐ केतवे नमः',
};
export const mantraLabel = from(MANTRA_HI, 'MANTRA');

/** A planet name in the report language (the platform glossary's spelling). */
export const planetL = (lang: ReportLanguage, planet: PlanetName | string): string => planetLabel(lang, planet);
/** A sign name in the report language (the platform glossary's spelling). */
export const signL = (lang: ReportLanguage, sign: string): string => signLabel(lang, sign);

/**
 * Hindi display text shared by the Finance and Couple Matching blocks
 * (docs/integration/hindi-reports-design.md). Display names only: every value
 * shown comes from the engine or the snapshot unchanged, and English output is
 * returned untouched.
 *
 * The terms live in a module-local dictionary (`term`), not the global label
 * registry, so a common word such as "Period" cannot collide with another
 * report's wording at start-up. Words already in the shared glossary (planets,
 * signs, nakshatras, dignities, its table headings) are taken from there.
 */
import { ordinal, planetName } from '../../evidence/evidence-registry';
import {
  dignityLabel,
  label,
  NAKSHATRA_HI,
  nakshatraLabel,
  planetAbbr,
  planetLabel,
  ReportLanguage,
  signLabel,
} from '../../i18n/hindi';
import { formatDate } from '../../render/latex';

export type Lang = ReportLanguage;

const TERMS: Record<string, string> = {};

/** Adds fixed terms (keyed by the exact English text) to this module family's dictionary. */
export function addTerms(terms: Record<string, string>): void {
  for (const [en, hi] of Object.entries(terms)) {
    const existing = TERMS[en];
    if (existing !== undefined && existing !== hi) throw new Error(`HINDI_LABEL_CONFLICT: "${en}" is already "${existing}", not "${hi}"`);
    TERMS[en] = hi;
  }
}

/** A fixed term in the report language: English unchanged; Hindi from this dictionary, else the shared glossary (which throws when missing). */
export function term(lang: Lang, en: string): string {
  if (lang === 'en') return en;
  return TERMS[en] ?? label(lang, en);
}

// ------------------------------------------------------------- numbers --

const ORD_HI = ['', '1ला', '2रा', '3रा', '4था', '5वाँ', '6ठा', '7वाँ', '8वाँ', '9वाँ', '10वाँ', '11वाँ', '12वाँ'];
const ORD_OBLIQUE_HI = ['', '1ले', '2रे', '3रे', '4थे', '5वें', '6ठे', '7वें', '8वें', '9वें', '10वें', '11वें', '12वें'];

/** Ordinal of a house: "2nd" / "2रा". The digits are the same in both languages. */
export const ord = (lang: Lang, n: number): string => (lang === 'en' ? ordinal(n) : ORD_HI[n] ?? `${n}वाँ`);
/** Hindi oblique ordinal, as needed before a postposition ("2रे भाव में"). English is the plain ordinal. */
export const ordOblique = (lang: Lang, n: number): string => (lang === 'en' ? ordinal(n) : ORD_OBLIQUE_HI[n] ?? `${n}वें`);

// --------------------------------------------------------------- dates --

export const MONTHS_HI = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
export const MONTHS_SHORT_HI = ['जन', 'फर', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुला', 'अग', 'सितं', 'अक्टू', 'नवं', 'दिसं'];

/** A calendar date by its UTC fields: "02 Nov 1993" / "02 नवं 1993". */
export function dateText(lang: Lang, iso: string): string {
  if (lang === 'en') return formatDate(iso);
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS_SHORT_HI[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// ------------------------------------------------- planets, signs, stars --

/** Planet name from a display name ("Jupiter") or an engine symbol ("JUPITER"). */
export const planetText = (lang: Lang, planet: string): string => planetLabel(lang, planetName(planet));
export const signText = (lang: Lang, sign: string): string => signLabel(lang, sign);
export const nakshatraText = (lang: Lang, nakshatra: string): string => nakshatraLabel(lang, nakshatra);
export const dignityHi = (dignity: string): string => dignityLabel('hi', dignity);

/** Two-letter chart abbreviation in Hindi ("गु"). */
export const abbrHi = (planet: string): string => planetAbbr('hi', planetName(planet));

export const SIGN_SHORT_HI = ['मेष', 'वृष', 'मिथु', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चि', 'धनु', 'मकर', 'कुंभ', 'मीन'];

const RASHI_SANSKRIT_HI: Record<string, string> = {
  Mesha: 'मेष', Vrishabha: 'वृषभ', Mithuna: 'मिथुन', Karka: 'कर्क', Simha: 'सिंह', Kanya: 'कन्या',
  Tula: 'तुला', Vrischika: 'वृश्चिक', Dhanu: 'धनु', Makara: 'मकर', Kumbha: 'कुंभ', Meena: 'मीन',
};

/** A sign given by its Sanskrit name, as the matchmaking engine reports it ("Vrishabha"). */
export function rashiText(lang: Lang, sanskritName: string): string {
  if (lang === 'en') return sanskritName;
  const hi = RASHI_SANSKRIT_HI[sanskritName];
  if (hi === undefined) throw new Error(`HINDI_RASHI_MISSING: "${sanskritName}"`);
  return hi;
}

const KARAKA_HI: Record<string, string> = {
  AK: 'आत्म', AmK: 'अमात्य', BK: 'भ्रातृ', MK: 'मातृ', PiK: 'पितृ', PK: 'पुत्र', GK: 'ज्ञाति', DK: 'दारा',
};

/** Jaimini chara karaka code ("AmK") as its Hindi short name. */
export function karakaText(lang: Lang, code: string): string {
  if (lang === 'en') return code;
  const hi = KARAKA_HI[code];
  if (hi === undefined) throw new Error(`HINDI_KARAKA_MISSING: "${code}"`);
  return hi;
}

/**
 * Name syllables of the 27 nakshatras by pada, in the order of the engine's
 * NAKSHATRA_NAMAKSHARAS. Keyed by nakshatra and pada because the Roman
 * spelling alone is ambiguous ("Ta" is टा in Purva Phalguni and ता in Swati).
 * Ashlesha pada 1 is "Di" (डी), as in the engine since 2026-11-24.
 */
const NAMAKSHARA_HI: string[][] = [
  ['चू', 'चे', 'चो', 'ला'], ['ली', 'लू', 'ले', 'लो'], ['अ', 'ई', 'उ', 'ए'], ['ओ', 'वा', 'वी', 'वू'], ['वे', 'वो', 'का', 'की'],
  ['कू', 'घ', 'ङ', 'छ'], ['के', 'को', 'हा', 'ही'], ['हू', 'हे', 'हो', 'डा'], ['डी', 'डू', 'डे', 'डो'], ['मा', 'मी', 'मू', 'मे'],
  ['मो', 'टा', 'टी', 'टू'], ['टे', 'टो', 'पा', 'पी'], ['पू', 'ष', 'ण', 'ठ'], ['पे', 'पो', 'रा', 'री'], ['रू', 'रे', 'रो', 'ता'],
  ['ती', 'तू', 'ते', 'तो'], ['ना', 'नी', 'नू', 'ने'], ['नो', 'या', 'यी', 'यू'], ['ये', 'यो', 'भा', 'भी'], ['भू', 'धा', 'फा', 'ढा'],
  ['भे', 'भो', 'जा', 'जी'], ['खी', 'खू', 'खे', 'खो'], ['गा', 'गी', 'गू', 'गे'], ['गो', 'सा', 'सी', 'सू'], ['से', 'सो', 'दा', 'दी'],
  ['दू', 'थ', 'झ', 'ञ'], ['दे', 'दो', 'चा', 'ची'],
];

/** The name syllable of a Moon nakshatra and pada: the engine's Roman syllable, or its Devanagari form. */
export function namaksharaText(lang: Lang, roman: string, nakshatra: string, pada: number): string {
  if (lang === 'en') return roman;
  const hi = NAMAKSHARA_HI[Object.keys(NAKSHATRA_HI).indexOf(nakshatra)]?.[pada - 1];
  if (hi === undefined) throw new Error(`HINDI_NAMAKSHARA_MISSING: "${nakshatra}" pada ${pada}`);
  return hi;
}

// ------------------------------------------------- engine vocabulary --

addTerms({
  // Tithi, paksha
  Pratipada: 'प्रतिपदा', Dwitiya: 'द्वितीया', Tritiya: 'तृतीया', Chaturthi: 'चतुर्थी', Panchami: 'पंचमी', Shashthi: 'षष्ठी', Saptami: 'सप्तमी',
  Ashtami: 'अष्टमी', Navami: 'नवमी', Dashami: 'दशमी', Ekadashi: 'एकादशी', Dwadashi: 'द्वादशी', Trayodashi: 'त्रयोदशी', Chaturdashi: 'चतुर्दशी',
  Purnima: 'पूर्णिमा', Amavasya: 'अमावस्या', Sukla: 'शुक्ल', Krishna: 'कृष्ण',
  // Nitya yoga
  Vishkambha: 'विष्कंभ', Priti: 'प्रीति', Ayushman: 'आयुष्मान', Saubhagya: 'सौभाग्य', Shobhana: 'शोभन', Atiganda: 'अतिगंड', Sukarma: 'सुकर्मा',
  Dhriti: 'धृति', Shoola: 'शूल', Ganda: 'गंड', Vriddhi: 'वृद्धि', Dhruva: 'ध्रुव', Vyaghata: 'व्याघात', Harshana: 'हर्षण', Vajra: 'वज्र',
  Siddhi: 'सिद्धि', Vyatipata: 'व्यतीपात', Variyan: 'वरीयान', Parigha: 'परिघ', Shiva: 'शिव', Siddha: 'सिद्ध', Sadhya: 'साध्य', Shubha: 'शुभ',
  Shukla: 'शुक्ल', Brahma: 'ब्रह्म', Indra: 'इंद्र', Vaidhriti: 'वैधृति',
  // Karana
  Bava: 'बव', Balava: 'बालव', Kaulava: 'कौलव', Taitila: 'तैतिल', Gara: 'गर', Vanija: 'वणिज', Vishti: 'विष्टि', Kimstughna: 'किंस्तुघ्न',
  Shakuni: 'शकुनि', Naga: 'नाग',
  // Avakahada
  Brahmin: 'ब्राह्मण', Kshatriya: 'क्षत्रिय', Vaishya: 'वैश्य', Shudra: 'शूद्र',
  Chatushpada: 'चतुष्पद', Manava: 'मानव', Jalachara: 'जलचर', Vanachara: 'वनचर', Keeta: 'कीट',
  'Ashwa (Horse)': 'अश्व (घोड़ा)', 'Gaja (Elephant)': 'गज (हाथी)', 'Mesha (Sheep)': 'मेष (भेड़)', 'Sarpa (Serpent)': 'सर्प (साँप)',
  'Shwana (Dog)': 'श्वान (कुत्ता)', 'Marjara (Cat)': 'मार्जार (बिल्ली)', 'Mushaka (Rat)': 'मूषक (चूहा)', 'Gau (Cow)': 'गौ (गाय)',
  'Mahisha (Buffalo)': 'महिष (भैंस)', 'Vyaghra (Tiger)': 'व्याघ्र (बाघ)', 'Mriga (Deer)': 'मृग (हिरण)', 'Vanara (Monkey)': 'वानर (बंदर)',
  'Nakula (Mongoose)': 'नकुल (नेवला)', 'Simha (Lion)': 'सिंह (शेर)',
  male: 'पुरुष', female: 'स्त्री',
  Deva: 'देव', Manushya: 'मनुष्य', Rakshasa: 'राक्षस',
  Adi: 'आदि', Madhya: 'मध्य', Antya: 'अंत्य',
  Agni: 'अग्नि', Prithvi: 'पृथ्वी', Vayu: 'वायु', Jala: 'जल',
  'Swarna (Gold)': 'स्वर्ण (सोना)', 'Rajata (Silver)': 'रजत (चाँदी)', 'Tamra (Copper)': 'ताम्र (ताँबा)', 'Loha (Iron)': 'लौह (लोहा)',

  // Planet table
  'Nakshatra-pada': 'नक्षत्र-चरण', 'Star/Sub': 'नक्षत्र/उप', State: 'अवस्था', Rules: 'स्वामित्व', Karaka: 'कारक',
  // Dasha tables
  Mahadasha: 'महादशा', Antardasha: 'अंतर्दशा', From: 'से', To: 'तक', running: 'चल रही',
  // Ashtakavarga
  Tot: 'कुल', SAV: 'सर्वाष्टक', 'Rashi pinda': 'राशि पिंड', 'Graha pinda': 'ग्रह पिंड', 'Shodhya pinda': 'शोध्य पिंड',
  // Shared headings
  Lord: 'स्वामी', Period: 'अवधि', none: 'कोई नहीं',
});

// --------------------------------------------------------- method notes --

export const PLANET_TABLE_METHOD_HI =
  'निरयन (लाहिरी) स्थितियाँ, संपूर्ण राशि भाव पद्धति, मध्यम राहु-केतु। नक्षत्र/उप = नक्षत्र स्वामी / केपी उप स्वामी (उसी लाहिरी भोगांश पर कृष्णमूर्ति के 249 उप-विभाग)। ' +
  'अवस्था: व = वक्री, अ = अस्त। स्वामित्व = जिन भावों का ग्रह स्वामी है। कारक = जैमिनी की 7-कारक पद्धति (आत्म, अमात्य, भ्रातृ, मातृ, पुत्र, ज्ञाति, दारा)।';

export const FUNCTIONAL_METHOD_HI =
  'लग्न के अनुसार ग्रहों का स्वभाव (बृहत् पाराशर होरा शास्त्र अ. 34; लघु पाराशरी अ. 2): लग्नेश अनुकूल; केंद्र + त्रिकोण का स्वामी = योगकारक; ' +
  'त्रिकोण (5वें/9वें) के स्वामी अनुकूल, और यदि वे 3रे/6ठे/8वें/11वें के भी स्वामी हों तो मिश्रित; 3रे/6ठे/8वें/11वें के स्वामी चुनौतीपूर्ण (सूर्य और चंद्र पर 8वें के स्वामित्व का प्रभाव नहीं माना जाता); ' +
  'केवल केंद्र के और केवल 2रे/12वें के स्वामी तटस्थ; राहु और केतु अपने राशि स्वामी के अनुसार फल देते हैं।';

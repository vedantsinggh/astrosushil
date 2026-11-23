/**
 * Fortune Report Plus: Hindi edition (display text only) and the Hindi
 * vocabulary of its astrology blocks (astro.ts).
 *
 * Structure, evidence and objectives are those of fortune-plus.definition.ts.
 * The numerology half takes its Hindi titles from the two-language specs shared
 * with the Fortune report (_numerology-shared/sections.ts), so both reports
 * word a topic the same way. Nothing here calculates: every table below is a
 * display name for a value the engine already produced.
 */
import { planetName } from '../../evidence/evidence-registry';
import { HindiEdition, PLANET_HI, planetLabel } from '../../i18n/hindi';
import { numerologyHindiText } from '../_numerology-shared/sections';

const NUMEROLOGY_HI = numerologyHindiText();

const PLANET_TOPICS = Object.fromEntries(
  ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'].map((name) => [
    `planet-${name.toLowerCase()}`,
    { title: `आपकी कुंडली में ${PLANET_HI[name]}`, subtitle: `${PLANET_HI[name]} किन बातों का कारक है, और आपकी कुंडली में उसका भाव` },
  ])
);

export const FORTUNE_PLUS_HINDI: HindiEdition = {
  title: 'भाग्य रिपोर्ट प्लस',
  subtitle: 'आपके अंक और आपके ग्रह: अंकशास्त्र और वैदिक ज्योतिष, एक ही व्यक्तिगत मार्गदर्शिका में',
  description:
    'पहला भाग आपके अंकों को पढ़ता है: मूलांक, भाग्यांक, नाम के अंक, लो शू ग्रिड, कुआ दिशाएँ, अगले बारह महीनों की भाग्य प्रवृत्ति और जीवन-चक्र। दूसरा भाग, ग्रह-पथ, आपकी वैदिक जन्म कुंडली को पढ़ता है: कुंडलियाँ और पंचांग, जन्म नक्षत्र और लग्न, हर ग्रह अपने भाव में, मंगल और शनि के विषय शांत भाव से समझाए गए, योग, विवाह का समय, करियर और सरल उपाय।',
  writingGuidance: [
    'Write Lo Shu, Kua and Feng Shui in Devanagari (लो शू, कुआ, फेंग-शुई), as Hindi readers know them.',
    'Sade Sati is साढ़े साती and Manglik is मांगलिक: describe both as themes of growth, never as a दोष, a curse or a reason for fear.',
  ],
  sections: {
    ...NUMEROLOGY_HI.sections,
    'cosmic-pathway': {
      title: 'ग्रह-पथ: आपकी कुंडलियाँ',
      kicker: 'भाग दो · वैदिक ज्योतिष',
      intro: 'अंकों से ग्रहों की ओर: आपकी जन्म कुंडलियाँ, ग्रहों की स्थिति और जन्म पंचांग।',
    },
    'star-and-ascendant': { title: 'आपका जन्म नक्षत्र और लग्न', kicker: 'ग्रह-पथ' },
    'planets-1': {
      title: 'ग्रह और उनके भाव: सूर्य से गुरु तक',
      kicker: 'ग्रह और उनके गुण',
      intro: 'हर ग्रह जीवन के कुछ क्षेत्रों का कारक है; उसका भाव बताता है कि वह ऊर्जा आपके लिए कहाँ सबसे अधिक सक्रिय है।',
    },
    'planets-2': { title: 'ग्रह और उनके भाव: शुक्र, शनि, राहु और केतु', kicker: 'ग्रह और उनके गुण' },
    manglik: {
      title: 'मंगल और दांपत्य: मांगलिक विचार',
      kicker: 'ग्रह-पथ',
      intro: 'एक ऐसी ग्रह-स्थिति पर शांत दृष्टि, जिसे अक्सर बढ़ा-चढ़ाकर बताया जाता है।',
    },
    'sade-sati': {
      title: 'साढ़े साती: आपके चंद्र पर शनि',
      kicker: 'ग्रह-पथ',
      intro: 'आपकी चंद्र राशि पर शनि का साढ़े सात वर्ष का गोचर, आपके पूरे जीवन के लिए गणना किया गया।',
    },
    yogas: {
      title: 'आपकी जन्म कुंडली में बने योग',
      kicker: 'ग्रह-पथ',
      intro: 'शास्त्रीय ग्रंथों में मान्य विशेष ग्रह-संयोग, जिन्हें हमारी गणना-प्रणाली के नियमों ने पहचाना है।',
    },
    marriage: { title: 'आपके विवाह के बारे में', kicker: 'ग्रह-पथ' },
    'astro-career': { title: 'करियर फलादेश', kicker: 'ग्रह-पथ' },
    'astro-remedies': {
      title: 'ज्योतिषीय उपाय',
      kicker: 'ग्रह-पथ',
      intro: 'सरल, निःशुल्क अभ्यास। केवल दो-तीन चुनें और उन्हें सच्चे मन से निभाएँ।',
    },
  },
  topics: {
    ...NUMEROLOGY_HI.topics,
    'cosmic-bridge': { title: 'अंकों से ग्रहों तक' },
    'chart-d1': { title: 'लग्न कुंडली (D1)' },
    'chart-d9': { title: 'नवांश कुंडली (D9)' },
    'chart-moon': { title: 'चंद्र कुंडली' },
    'planet-table': { title: 'ग्रहों की स्थिति' },
    'birth-panchang': { title: 'जन्म पंचांग' },
    'janma-nakshatra': { title: 'आपका जन्म नक्षत्र', subtitle: 'जन्म के समय चंद्र जिस नक्षत्र में था' },
    'nakshatra-potential': { title: 'अपने जन्म नक्षत्र की शक्ति का उपयोग' },
    ascendant: { title: 'आपका लग्न', subtitle: 'उदित राशि और संसार से आपके मिलने का ढंग' },
    'moon-sign': { title: 'आपकी चंद्र राशि', subtitle: 'आपका भावनात्मक स्वभाव' },
    ...PLANET_TOPICS,
    'manglik-table': { title: 'मंगल कहाँ स्थित है' },
    'manglik-view': { title: 'अपने मंगल की स्थिति को समझें' },
    'mars-energy': { title: 'अपनी मंगल ऊर्जा का सदुपयोग' },
    'sadesati-table': { title: 'आपकी साढ़े साती की अवधियाँ' },
    'sadesati-meaning': { title: 'आपके लिए साढ़े साती का अर्थ' },
    'sadesati-phases': { title: 'तीन चरण', subtitle: 'चढ़ता, मध्य और उतरता चरण' },
    'sadesati-practices': { title: 'शनि के समय के लिए अभ्यास' },
    'yoga-table': { title: 'पहचाने गए योग' },
    'yogas-effects': { title: 'आपके योगों के प्रभाव' },
    'dasha-table': { title: 'आपकी विंशोत्तरी महादशाएँ' },
    'yogas-timing': { title: 'आपके योग कब सक्रिय होते हैं' },
    'darakaraka-spouse': { title: 'आपका विवाह और जीवनसाथी', subtitle: 'दारकारक और सप्तम भाव' },
    'marriage-character': { title: 'आपके वैवाहिक जीवन की मुख्य विशेषताएँ' },
    'marriage-windows': { title: 'विवाह के लिए अनुकूल अवधियाँ' },
    'career-houses': { title: 'आपके करियर के संकेतक', subtitle: 'दशम भाव, उसका स्वामी और D10 कुंडली' },
    'career-dasha': { title: 'आपकी दशाओं में करियर' },
    'remedy-table': { title: 'अपने प्रमुख ग्रहों को बल देना' },
    'remedy-practices': { title: 'मंत्र, भक्ति और सेवा' },
    'lifestyle-remedies': { title: 'जीवनशैली सुधारने के उपाय' },
  },
};

// ---------------------------------------------------------------------------
// Vocabulary of the astrology blocks. Kept in this report (not in the shared
// glossary) so a key can never collide with another report's wording.
// ---------------------------------------------------------------------------

/** Looks a value up in one of the tables below; an untranslated value is a defect, never printed in English. */
export function hindiOf(table: Record<string, string>, kind: string, en: string): string {
  const hi = table[en];
  if (hi === undefined) throw new Error(`HINDI_${kind}_MISSING: "${en}"`);
  return hi;
}

export const PAKSHA_HI: Record<string, string> = { Shukla: 'शुक्ल', Krishna: 'कृष्ण' };

/** Keyed by the engine's tithi names (panchang-calculator.ts). */
export const TITHI_HI: Record<string, string> = {
  Pratipada: 'प्रतिपदा', Dwitiya: 'द्वितीया', Tritiya: 'तृतीया', Chaturthi: 'चतुर्थी', Panchami: 'पंचमी', Shashthi: 'षष्ठी', Saptami: 'सप्तमी',
  Ashtami: 'अष्टमी', Navami: 'नवमी', Dashami: 'दशमी', Ekadashi: 'एकादशी', Dwadashi: 'द्वादशी', Trayodashi: 'त्रयोदशी', Chaturdashi: 'चतुर्दशी',
  Purnima: 'पूर्णिमा', Amavasya: 'अमावस्या',
};

/** The 27 yogas of the panchang (Sun + Moon), keyed by the engine's names. */
export const PANCHANG_YOGA_HI: Record<string, string> = {
  Vishkambha: 'विष्कंभ', Priti: 'प्रीति', Ayushman: 'आयुष्मान', Saubhagya: 'सौभाग्य', Shobhana: 'शोभन', Atiganda: 'अतिगंड', Sukarma: 'सुकर्मा',
  Dhriti: 'धृति', Shoola: 'शूल', Ganda: 'गंड', Vriddhi: 'वृद्धि', Dhruva: 'ध्रुव', Vyaghata: 'व्याघात', Harshana: 'हर्षण', Vajra: 'वज्र',
  Siddhi: 'सिद्धि', Vyatipata: 'व्यतीपात', Variyan: 'वरीयान', Parigha: 'परिघ', Shiva: 'शिव', Siddha: 'सिद्ध', Sadhya: 'साध्य', Shubha: 'शुभ',
  Shukla: 'शुक्ल', Brahma: 'ब्रह्म', Indra: 'इंद्र', Vaidhriti: 'वैधृति',
};

/** The 11 karanas, keyed by the engine's names. */
export const KARANA_HI: Record<string, string> = {
  Bava: 'बव', Balava: 'बालव', Kaulava: 'कौलव', Taitila: 'तैतिल', Gara: 'गर', Vanija: 'वणिज', Vishti: 'विष्टि',
  Kimstughna: 'किंस्तुघ्न', Shakuni: 'शकुनि', Chatushpada: 'चतुष्पद', Naga: 'नाग',
};

/** The engine's classical moderating factors of a Manglik position (matchmaking-calculator.ts), keyed by its text. */
export const MANGLIK_FACTOR_HI: Record<string, string> = {
  'Mars in own sign (Aries) in 1st house': 'मंगल स्वराशि (मेष) में, पहले भाव में',
  'Mars in own sign (Scorpio) in 4th/8th house': 'मंगल स्वराशि (वृश्चिक) में, चौथे या आठवें भाव में',
  'Mars in exalted sign (Capricorn) in 7th/8th house': 'मंगल उच्च राशि (मकर) में, सातवें या आठवें भाव में',
  'Mars in friendly sign (Leo) in 8th house': 'मंगल मित्र राशि (सिंह) में, आठवें भाव में',
  'Mars in friendly sign (Sagittarius) in 12th house': 'मंगल मित्र राशि (धनु) में, बारहवें भाव में',
  'Jupiter conjoined with Mars in the same house': 'गुरु और मंगल की एक ही भाव में युति',
  'Benefic Jupiter aspects Mars (5th/7th/9th drishti)': 'मंगल पर शुभ गुरु की दृष्टि (पाँचवीं, सातवीं या नौवीं)',
};

/** Yoga categories of the engine's catalogue (yoga.types.ts). */
export const YOGA_CATEGORY_HI: Record<string, string> = {
  MAHAPURUSHA: 'महापुरुष', RAJA: 'राज', DHANA: 'धन', CHANDRA: 'चंद्र', SURYA: 'सूर्य', NEECHA_BHANGA: 'नीच भंग', PARIVARTANA: 'परिवर्तन',
  VIPARITA: 'विपरीत', NABHASA: 'नाभस', AUSPICIOUS: 'शुभ', INAUSPICIOUS: 'सावधानी योग्य', MISCELLANEOUS: 'अन्य',
};

/** Names of the engine's yoga catalogue, keyed by the canonical name without its bracketed detail. */
export const YOGA_NAME_HI: Record<string, string> = {
  'Ruchaka Yoga': 'रुचक योग', 'Bhadra Yoga': 'भद्र योग', 'Hamsa Yoga': 'हंस योग', 'Malavya Yoga': 'मालव्य योग', 'Shasha Yoga': 'शश योग',
  'Dharma-Karmadhipati Yoga': 'धर्म-कर्माधिपति योग', 'Raja Yoga': 'राज योग', 'Dhana Yoga': 'धन योग', 'Lakshmi Yoga': 'लक्ष्मी योग',
  'Saraswati Yoga': 'सरस्वती योग', 'Gajakesari Yoga': 'गजकेसरी योग', 'Sunapha Yoga': 'सुनफा योग', 'Anapha Yoga': 'अनफा योग',
  'Durudhara Yoga': 'दुरुधरा योग', 'Kemadruma Yoga': 'केमद्रुम योग', 'Adhi Yoga': 'अधि योग', 'Chandra-Mangala Yoga': 'चंद्र-मंगल योग',
  'Amala Yoga': 'अमल योग', 'Budha-Aditya Yoga': 'बुधादित्य योग', 'Vesi Yoga': 'वेशि योग', 'Vosi Yoga': 'वोशि योग',
  'Ubhayachari Yoga': 'उभयचरी योग', 'Neecha Bhanga Raja Yoga': 'नीच भंग राज योग', 'Parivartana Yoga': 'परिवर्तन योग',
  'Harsha Yoga': 'हर्ष योग', 'Sarala Yoga': 'सरल योग', 'Vimala Yoga': 'विमल योग',
  'Rajju Yoga': 'रज्जु योग', 'Musala Yoga': 'मुसल योग', 'Nala Yoga': 'नल योग', 'Shringataka Yoga': 'शृंगाटक योग', 'Shakata Yoga': 'शकट योग',
  'Vihaga Yoga': 'विहग योग', 'Vallaki Yoga': 'वल्लकी योग', 'Dama Yoga': 'दाम योग', 'Pasha Yoga': 'पाश योग', 'Kedara Yoga': 'केदार योग',
  'Shula Yoga': 'शूल योग', 'Yuga Yoga': 'युग योग', 'Gola Yoga': 'गोल योग',
};

const LORD_HI: Record<string, string> = {
  1: 'लग्नेश', 2: 'द्वितीयेश', 3: 'तृतीयेश', 4: 'चतुर्थेश', 5: 'पंचमेश', 6: 'षष्ठेश', 7: 'सप्तमेश', 8: 'अष्टमेश', 9: 'नवमेश', 10: 'दशमेश',
  11: 'एकादशेश', 12: 'द्वादशेश',
};
const YOGA_DETAIL_HI: Record<string, string> = {
  Yogakaraka: 'योगकारक', Dhana: 'धन', Labha: 'लाभ', 'Lakshmi Sthana': 'लक्ष्मी स्थान', Bhagya: 'भाग्य', Chandradhi: 'चंद्राधि', Nabhasa: 'नाभस',
};

/**
 * Hindi form of a yoga's canonical name. The engine adds a bracketed detail to some names
 * ("Raja Yoga (Yogakaraka MARS: 4th Lord + 5th Lord)"); its house lords, planets and terms are
 * translated word for word. A name outside the catalogue above is a defect, never printed in English.
 */
export function yogaNameHi(canonicalName: string): string {
  const m = /^(.*?)(?: \((.*)\))?$/.exec(canonicalName);
  const base = m ? YOGA_NAME_HI[m[1]] : undefined;
  if (!m || base === undefined) throw new Error(`HINDI_YOGA_NAME_MISSING: "${canonicalName}"`);
  if (!m[2]) return base;
  const detail = m[2]
    .replace(/\bLagna Lord\b/g, LORD_HI[1])
    .replace(/\b(\d+)(?:st|nd|rd|th) Lord\b/g, (_, n: string) => LORD_HI[n] ?? `${n}th Lord`)
    .replace(/\b(?:Yogakaraka|Dhana|Labha|Lakshmi Sthana|Bhagya|Chandradhi|Nabhasa)\b/g, (w) => YOGA_DETAIL_HI[w])
    .replace(/\b[A-Z]{3,}\b/g, (symbol) => planetLabel('hi', planetName(symbol)));
  if (/[A-Za-z]/.test(detail)) throw new Error(`HINDI_YOGA_NAME_MISSING: "${canonicalName}"`);
  return `${base} (${detail})`;
}

/** FP-006 free practices of each planet, in Hindi (same list as SERVICE in astro.ts). */
export const SERVICE_HI: Record<string, string> = {
  Sun: 'उगते सूर्य को जल अर्पित करें; पिता-तुल्य लोगों का सम्मान और सहायता करें',
  Moon: 'माँ और बड़ों की देखभाल करें; जल या भोजन बाँटें',
  Mars: 'भाई-बहनों और सहकर्मियों की मदद करें; सुबह की सैर जैसा शारीरिक अनुशासन रखें',
  Mercury: 'किसी को पढ़ाएँ या सिखाएँ; अपने वादे लिखकर निभाएँ',
  Jupiter: 'गुरुजनों का सम्मान करें; गुरुवार को पुस्तकें या भोजन बाँटें',
  Venus: 'महिलाओं का सम्मान करें; अपने आसपास को स्वच्छ और सुंदर रखें',
  Saturn: 'बुज़ुर्गों और श्रमिकों की सेवा करें; समय के पाबंद रहें',
  Rahu: 'समाज के उपेक्षित लोगों की मदद करें; आसान पर अनुचित रास्तों से बचें',
  Ketu: 'पशु-पक्षियों को भोजन दें; शांत बैठकर ध्यान करें',
};

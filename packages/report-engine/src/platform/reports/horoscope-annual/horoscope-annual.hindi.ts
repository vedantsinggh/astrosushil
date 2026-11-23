/**
 * Personalised (annual) Horoscope: Hindi edition (display text only).
 * Structure, evidence and objectives are those of horoscope-annual.definition.ts.
 */
import { HindiEdition, ReportLanguage } from '../../i18n/hindi';
import { addAnnualLabels, hindiDate, hindiMonthYear, ord, planetL, signL } from '../_annual-shared/annual-shared.hindi';
import type { AreaFactor, HoroWindow } from './calc/horoscope-year';

// ---------------------------------------------------------------------------
// Fixed labels of the horoscope blocks
// ---------------------------------------------------------------------------

addAnnualLabels({
  Window: 'अवधि',
  'Slow-planet transits over these houses': 'इन भावों पर धीमे ग्रहों के गोचर',
  // life areas (HORO_AREAS labels)
  Career: 'कार्यक्षेत्र', Finance: 'धन', Education: 'शिक्षा', 'Love and relationships': 'प्रेम और संबंध', 'Family and home': 'परिवार और घर', Health: 'स्वास्थ्य',
  // associations table
  'Ruling planet of your Moon sign': 'आपकी चंद्र राशि का स्वामी ग्रह', 'Supportive number': 'सहायक अंक',
  'Supportive dates of any month': 'किसी भी माह की सहायक तारीख़ें', 'Supportive weekday': 'सहायक वार', 'Favourable colours': 'अनुकूल रंग',
  'Colours to use more sparingly': 'कम प्रयोग करने योग्य रंग', 'Dates calling for extra patience': 'अधिक धैर्य माँगने वाली तारीख़ें',
  'Traditional gem of the ruling planet': 'स्वामी ग्रह का पारंपरिक रत्न', 'Traditional deity and mantra': 'पारंपरिक देवता और मंत्र',
  // numerology
  'Calendar year': 'ईस्वी वर्ष', 'Universal year': 'वैश्विक वर्ष अंक', 'Your personal year': 'आपका व्यक्तिगत वर्ष अंक',
  'Weekday of the personal-year planet': 'व्यक्तिगत वर्ष के ग्रह का वार',
  // gochara now
  'Sign now': 'अभी की राशि', 'Stays until': 'कब तक',
});

/** A window's month range: the English label the evidence carries, or the same months in Hindi. */
export function windowLabel(lang: ReportLanguage, w: HoroWindow): string {
  if (lang === 'en') return w.label;
  const start = new Date(w.startIso);
  const last = new Date(Date.parse(w.endIso) - 86400000); // the window ends on the 1st of the following month
  return `${hindiMonthYear(start)} – ${hindiMonthYear(last)}`;
}

/** Hindi form of one transit fact of a life area (the English form is `factorText` in evidence.ts). */
export function factorTextHi(f: AreaFactor, tz: string): string {
  const lang: ReportLanguage = 'hi';
  return `${planetL(lang, f.planet)} का गोचर ${signL(lang, f.period.sign)} में, ${planetL(lang, f.from)} से ${ord(lang, f.house)} भाव (${hindiDate(f.period.startIso, tz)} से ${hindiDate(f.period.endIso, tz)} तक)`;
}

// ---------------------------------------------------------------------------
// The edition
// ---------------------------------------------------------------------------

const AREAS: Array<[string, string, string]> = [
  ['career', 'कार्यक्षेत्र का फलादेश', 'काम, पहचान और दिशा'],
  ['finance', 'आर्थिक स्थिति की झलक', 'आय, बचत और धन का प्रवाह'],
  ['education', 'शिक्षा और सीखना', 'पढ़ाई, कौशल और ज्ञान'],
  ['love', 'प्रेम और संबंध', 'प्रेम, साझेदारी और आपसी समझ'],
  ['family', 'पारिवारिक जीवन और सामंजस्य', 'घर, माता-पिता और गृहस्थी'],
  ['health', 'स्वास्थ्य की दिशा', 'ऊर्जा, दिनचर्या और सहनशक्ति'],
];

export const HOROSCOPE_ANNUAL_HINDI: HindiEdition = {
  title: 'व्यक्तिगत राशिफल',
  subtitle: 'आपका आने वाला वर्ष, आपकी चंद्र राशि और आपके लग्न दोनों से पढ़ा गया',
  description:
    'आपकी पूरी जन्म कुंडली से बना बारह माह का राशिफल। वर्ष के प्रमुख गोचर आपकी चंद्र राशि और लग्न दोनों से गिने गए हैं, और जीवन का हर क्षेत्र चार-चार माह की तीन अवधियों में पढ़ा गया है; साथ में स्वभाव की झलक, पारंपरिक संबंध, साधनाएँ, अंक ज्योतिष और सकारात्मक संकल्प।',
  writingGuidance: [
    'In Hindi, write a transit with the word गोचर (for example "गुरु कर्क राशि में गोचर कर रहा है, जो आपके चंद्र से पाँचवाँ है"), and say whether it is counted from the चंद्र राशि or from the लग्न. Mark natal placements as "आपकी जन्म कुंडली में".',
    'Name the three windows by their month ranges in Hindi month names (for example "नवंबर 2026 से फ़रवरी 2027").',
    'The classical gochara labels are "सहायक" (supportive) and "चुनौतीपूर्ण" (demanding) in Hindi; present them as seasons that call for different approaches. Call an affirmation "संकल्प".',
  ],
  sections: {
    chart: {
      title: 'आपकी कुंडली एक नज़र में', kicker: 'आपकी कुंडली',
      intro: 'आपका जन्म विवरण और जन्म कुंडली, जिनसे इस राशिफल का हर फलादेश गिना गया है।',
    },
    introduction: { title: 'आपके वर्ष का परिचय', kicker: 'खंड 1' },
    personality: { title: 'आपका व्यक्तित्व और स्वभाव', kicker: 'खंड 2' },
    'horoscope-work': {
      title: 'कार्य, धन और शिक्षा', kicker: 'आपका व्यक्तिगत राशिफल · खंड 3',
      intro: 'जीवन का हर क्षेत्र चार-चार माह की तीन अवधियों में पढ़ा गया है। हर फलादेश के बाद की तालिका में वे गोचर तथ्य दिए हैं जिन पर वह टिका है।',
    },
    'horoscope-heart': {
      title: 'प्रेम, परिवार और स्वास्थ्य', kicker: 'आपका व्यक्तिगत राशिफल · खंड 4',
      intro: 'वही तीन अवधियाँ, आपके संबंधों, आपके घर और आपके स्वास्थ्य के लिए।',
    },
    'planetary-influences': { title: 'आने वाले वर्ष में ग्रहों के प्रभाव', kicker: 'खंड 5' },
    favourable: {
      title: 'अनुकूल और कम अनुकूल प्रभाव', kicker: 'खंड 6',
      intro: 'आपकी चंद्र राशि के स्वामी ग्रह के पारंपरिक संबंध: रंग, अंक, तारीख़ें और एक प्रतीकात्मक रत्न।',
    },
    remedies: { title: 'सशक्त मार्ग: आपके वर्ष की साधनाएँ', kicker: 'खंड 7' },
    numerology: { title: 'आपके वर्ष का अंक ज्योतिष', kicker: 'खंड 8' },
    affirmations: { title: 'आपके वर्ष के सकारात्मक संकल्प', kicker: 'खंड 9' },
    conclusion: { title: 'समापन', kicker: 'खंड 10' },
  },
  topics: {
    'birth-synopsis': { title: 'आपके जन्म विवरण का सार', subtitle: 'अवकहड़ा चक्र और जन्म पंचांग' },
    'natal-chart': { title: 'आपकी जन्म कुंडली (D1)' },
    'how-it-is-read': { title: 'यह राशिफल कैसे पढ़ा जाता है', subtitle: 'चंद्र राशि और लग्न साथ-साथ' },
    'year-at-a-glance': { title: 'धीमे ग्रह, अवधि-दर-अवधि' },
    'year-overview': { title: 'आपका वर्ष एक नज़र में', subtitle: 'कार्यक्षेत्र, धन, शिक्षा, प्रेम, परिवार और स्वास्थ्य संक्षेप में' },
    'gochara-now': { title: 'धीमे ग्रह अभी कहाँ हैं' },
    'signs-in-the-year': { title: 'आने वाले वर्ष में आपकी राशियाँ', subtitle: 'आपके चंद्र और लग्न से गुरु, शनि, राहु और केतु' },
    'moon-nature': { title: 'आपकी चंद्र राशि का स्वभाव', subtitle: 'भावनात्मक प्रकृति और सहज वृत्तियाँ' },
    'ascendant-nature': { title: 'आपके लग्न का स्वभाव', subtitle: 'आप संसार से कैसे मिलते हैं' },
    ...Object.fromEntries(AREAS.flatMap(([key, title, subtitle]) => [
      [`${key}-forecast`, { title, subtitle }],
      [`${key}-in-short`, { title: `संक्षेप में: ${title}` }],
    ])),
    'slow-transit-table': { title: 'धीमे ग्रहों की राशि अवधियाँ' },
    'saturn-influence': { title: 'शनि: धैर्य का शिक्षक' },
    'jupiter-influence': { title: 'गुरु: विकास का दाता' },
    'nodes-influence': { title: 'राहु और केतु: परिवर्तन की धुरी' },
    'venus-influence': { title: 'शुक्र: सामंजस्य लाने वाला' },
    'mars-influence': { title: 'मंगल: ऊर्जा देने वाला' },
    'fast-transit-table': { title: 'शुक्र, मंगल और बुध की राशि अवधियाँ' },
    'lucky-table': { title: 'रंग, अंक और तारीख़ें' },
    'using-associations': { title: 'इन संबंधों का समझदारी से उपयोग' },
    'weekday-practices': { title: 'साप्ताहिक साधनाएँ', subtitle: 'सरल भक्ति और व्यवहार की आदतें' },
    'dos-and-donts': { title: 'क्या करें और क्या न करें', subtitle: 'एक स्थिर और फलदायी वर्ष के लिए' },
    'numerology-table': { title: 'आपके वर्ष के अंक' },
    'numerology-reading': { title: 'आपके अंक क्या कहते हैं', subtitle: 'वैश्विक और व्यक्तिगत वर्ष' },
    'planet-affirmations': { title: 'आपके ग्रहों के अनुरूप दैनिक संकल्प' },
    'year-closing': { title: 'एक सफल वर्ष की तैयारी', subtitle: 'शक्तियाँ, चुनौतियाँ और विकास' },
  },
};

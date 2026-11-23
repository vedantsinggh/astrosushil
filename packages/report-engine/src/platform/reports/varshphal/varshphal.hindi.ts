/**
 * Varshphal report: Hindi edition (display text only).
 * Structure, evidence and objectives are those of varshphal.definition.ts.
 */
import { SIGNS } from '../../evidence/evidence-registry';
import { HindiEdition, ReportLanguage, signLabel } from '../../i18n/hindi';
import { addAnnualLabels } from '../_annual-shared/annual-shared.hindi';
import { pad2 } from '../_annual-shared/astro';

// ---------------------------------------------------------------------------
// Fixed labels of the Varshphal blocks (table headings and short cell values)
// ---------------------------------------------------------------------------

addAnnualLabels({
  '(Muntha)': '(मुंथा)',
  // solar return
  'Solar return (Varsha Pravesha)': 'वर्ष प्रवेश (सूर्य की वापसी)', 'Year covered': 'वर्ष की अवधि', 'Completed years': 'पूर्ण हुए वर्ष',
  'Place used for the annual chart': 'वर्ष कुंडली के लिए प्रयुक्त स्थान', 'Natal Sun returns to': 'जन्म का सूर्य यहाँ लौटता है',
  'Annual Ascendant (Varsha Lagna)': 'वर्ष लग्न', 'Type of return': 'वर्ष प्रवेश का प्रकार',
  'Day return (Sun above the horizon)': 'दिन का प्रवेश (सूर्य क्षितिज के ऊपर)', 'Night return (Sun below the horizon)': 'रात्रि का प्रवेश (सूर्य क्षितिज के नीचे)',
  // positions
  Nakshatra: 'नक्षत्र', Motion: 'गति', Combust: 'अस्त', 'Harsha Bala': 'हर्ष बल', Retrograde: 'वक्री', Direct: 'मार्गी', Yes: 'हाँ', No: 'नहीं',
  // panchadhikari
  Office: 'पद', 'Why it holds the office': 'यह पद क्यों मिला', 'Aspects Asc': 'लग्न पर दृष्टि', Harsha: 'हर्ष बल', 'Year Lord (Varshesha)': 'वर्षेश (वर्ष का स्वामी)',
  // muntha
  'Muntha sign': 'मुंथा राशि', 'House in the annual chart': 'वर्ष कुंडली में भाव', 'Sign counted from the natal Ascendant': 'जन्म लग्न से गिनी गई राशि',
  'Muntha lord': 'मुंथेश', 'How it is found': 'यह कैसे निकाली जाती है',
  // tajik yogas
  Planets: 'ग्रह', Distance: 'दूरी', Orb: 'दीप्तांश', Applying: 'निकट आता हुआ', Separating: 'दूर जाता हुआ',
  // sahams
  Saham: 'सहम', Signifies: 'संकेत', Formula: 'सूत्र', Position: 'स्थिति',
  // mudda
  Lord: 'स्वामी', From: 'से', To: 'तक', Days: 'दिन', Note: 'टिप्पणी',
  'Balance at the start of the year': 'वर्ष के आरंभ में शेष भाग', 'Remaining part, closes the year': 'बचा हुआ भाग, जो वर्ष को पूरा करता है', 'Full period': 'पूरी अवधि',
  // transits
  'Sign at year start': 'वर्ष के आरंभ में राशि', 'At year start': 'वर्ष के आरंभ में', 'Supportive share of year': 'वर्ष का सहायक भाग', 'Sign periods': 'राशि अवधियाँ',
  // months
  Moon: 'चंद्र', 'Life area': 'जीवन क्षेत्र', Houses: 'भाव', 'Planets there': 'वहाँ के ग्रह', none: 'कोई नहीं',
  'Work and wealth': 'कार्य और धन', 'Love, family and home': 'प्रेम, परिवार और घर', 'Health and vitality': 'स्वास्थ्य और ऊर्जा', 'Learning and inner life': 'शिक्षा और आंतरिक जीवन',
  'No planet changes sign this month.': 'इस माह कोई ग्रह राशि नहीं बदलता।',
  // observances
  'Begins (local time)': 'आरंभ (स्थानीय समय)', 'Lunar day': 'तिथि', Observance: 'पर्व',
  'Chaitra Purnima, observed as Hanuman Jayanti in North India': 'चैत्र पूर्णिमा, जो उत्तर भारत में हनुमान जयंती के रूप में मनाई जाती है',
  'Vaishakha Purnima (Buddha Purnima)': 'वैशाख पूर्णिमा (बुद्ध पूर्णिमा)', 'Ashadha Purnima (Guru Purnima)': 'आषाढ़ पूर्णिमा (गुरु पूर्णिमा)',
  'Kartika Purnima': 'कार्तिक पूर्णिमा', 'Vaishakha Shukla Tritiya': 'वैशाख शुक्ल तृतीया',
  'A note on practices': 'साधनाओं के बारे में एक बात',
});

// ---------------------------------------------------------------------------
// Names of Tajik values the engine prints in English
// ---------------------------------------------------------------------------

const TAJIK_YOGA_HI: Record<string, string> = { ITHASALA: 'इत्थशाल', ISARPHA: 'ईसराफ', NAKTA: 'नक्त', YAMAYA: 'यमया', KAMBOOLA: 'कंबूल' };

/** Tajik yoga name: the engine's type in title case, or its Hindi name. */
export function tajikYogaLabel(lang: ReportLanguage, type: string): string {
  if (lang === 'en') return type.charAt(0) + type.slice(1).toLowerCase();
  const hi = TAJIK_YOGA_HI[type];
  if (!hi) throw new Error(`HINDI_TAJIK_YOGA_MISSING: "${type}"`);
  return hi;
}

const SAHAM_HI: Record<string, { name: string; meaning: string }> = {
  'Punya Saham': { name: 'पुण्य सहम', meaning: 'पुण्य और सौभाग्य' },
  'Vidya Saham': { name: 'विद्या सहम', meaning: 'विद्या और ज्ञान' },
  'Yashas Saham': { name: 'यश सहम', meaning: 'यश और मान्यता' },
  'Mahatmya Saham': { name: 'माहात्म्य सहम', meaning: 'प्रतिष्ठा और गरिमा' },
  'Karma Saham': { name: 'कर्म सहम', meaning: 'कर्म और कार्य' },
  'Roga Saham': { name: 'रोग सहम', meaning: 'स्वास्थ्य के प्रति सजगता' },
  'Karya Siddhi Saham': { name: 'कार्य सिद्धि सहम', meaning: 'कार्य की सिद्धि' },
  'Asha Saham': { name: 'आशा सहम', meaning: 'आशाएँ और इच्छाएँ' },
  'Preeti Saham': { name: 'प्रीति सहम', meaning: 'स्नेह और प्रेम' },
};

function saham(name: string): { name: string; meaning: string } {
  const hi = SAHAM_HI[name];
  if (!hi) throw new Error(`HINDI_SAHAM_MISSING: "${name}"`);
  return hi;
}
export const sahamNameHi = (name: string): string => saham(name).name;
export const sahamMeaningHi = (name: string): string => saham(name).meaning;

const FORMULA_TERM_HI: Record<string, string> = {
  Asc: 'लग्न', Sun: 'सूर्य', Moon: 'चंद्र', Mars: 'मंगल', Mercury: 'बुध', Jupiter: 'गुरु', Venus: 'शुक्र', Saturn: 'शनि', Punya: 'पुण्य',
};

/** A Saham formula such as "Asc + Moon - Sun" with its terms named in Hindi; the arithmetic is untouched. */
export function sahamFormulaHi(formula: string): string {
  return formula.split(' ').map((t) => {
    if (t === '+' || t === '-') return t;
    const hi = FORMULA_TERM_HI[t];
    if (!hi) throw new Error(`HINDI_SAHAM_TERM_MISSING: "${t}" in "${formula}"`);
    return hi;
  }).join(' ');
}

/** Hindi title of one of the five offices. */
export function officeTitleHi(role: string, isDayReturn: boolean): string {
  switch (role) {
    case 'VARSHA_LAGNESHA': return 'वर्ष लग्नेश';
    case 'JANMESHA': return 'जन्म लग्नेश';
    case 'MUNTHESHA': return 'मुंथेश';
    case 'TRIRASHISHA': return 'त्रिराशीश';
    case 'DINA_RATRI_PATI': return isDayReturn ? 'दिनपति (दिन का स्वामी)' : 'रात्रिपति (रात्रि का स्वामी)';
    default: throw new Error(`HINDI_OFFICE_MISSING: "${role}"`);
  }
}

/**
 * Hindi form of the engine's "why it holds the office" sentence. The sign is
 * read out of the engine's own sentence, so the two editions always name the same sign.
 */
export function officeSourceHi(role: string, isDayReturn: boolean, english: string): string {
  const sign = SIGNS.find((s) => new RegExp(`\\b${s}\\b`).test(english));
  if (!sign) throw new Error(`HINDI_OFFICE_SOURCE_MISSING: "${english}"`);
  const s = signLabel('hi', sign);
  switch (role) {
    case 'VARSHA_LAGNESHA': return `वर्ष लग्न (${s}) का स्वामी`;
    case 'JANMESHA': return `जन्म लग्न (${s}) का स्वामी`;
    case 'MUNTHESHA': return `मुंथा राशि (${s}) का स्वामी`;
    case 'TRIRASHISHA': return `${s} में ${isDayReturn ? 'दिन' : 'रात्रि'} के प्रवेश के लिए त्रिराशि तालिका का स्वामी`;
    case 'DINA_RATRI_PATI': return isDayReturn ? `दिन के प्रवेश के लिए सूर्य राशि (${s}) का स्वामी` : `रात्रि के प्रवेश के लिए चंद्र राशि (${s}) का स्वामी`;
    default: throw new Error(`HINDI_OFFICE_MISSING: "${role}"`);
  }
}

// ---------------------------------------------------------------------------
// The edition
// ---------------------------------------------------------------------------

const PLANET_YEAR: Array<[string, string, string]> = [
  ['sun', 'सूर्य', 'जीवन-शक्ति, अधिकार और उद्देश्य'],
  ['mercury', 'बुध', 'सोच, संवाद और व्यापार'],
  ['mars', 'मंगल', 'ऊर्जा, साहस और संपत्ति'],
  ['venus', 'शुक्र', 'प्रेम, सुख और रचनात्मकता'],
  ['jupiter', 'गुरु', 'विकास, ज्ञान और आशीर्वाद'],
  ['saturn', 'शनि', 'अनुशासन, कर्तव्य और सहनशक्ति'],
  ['rahu', 'राहु', 'महत्वाकांक्षा, नयापन और अनजानी राहें'],
  ['ketu', 'केतु', 'वैराग्य, अंतर्दृष्टि और छोड़ना सीखना'],
];

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export const VARSHPHAL_HINDI: HindiEdition = {
  title: 'वर्षफल',
  subtitle: 'एक जन्मदिन से अगले जन्मदिन तक आपका वर्ष, आपकी ताजिक वर्ष कुंडली के आधार पर',
  description:
    'यह वर्षफल उस वर्ष को पढ़ता है जो आपके पिछले वर्ष प्रवेश से आरंभ हुआ: वर्ष कुंडली, उसका वर्षेश और मुंथा, ताजिक योग और सहम, मुद्दा दशा की अवधियाँ, वर्ष का हर ग्रह गोचर और बारह ताजिक माह, जिनमें से हर एक अपने ही ग्रह-वातावरण के आधार पर लिखा गया है।',
  writingGuidance: [
    'In Hindi, name the Tajik terms as the tables do: वर्षफल, वर्ष प्रवेश (solar return), वर्ष कुंडली (annual chart), वर्ष लग्न (annual Ascendant), वर्षेश (Year Lord), मुंथा, मुंथेश, पंचाधिकारी, ताजिक योग, इत्थशाल, ईसराफ, सहम, मुद्दा दशा, हर्ष बल, मास प्रवेश.',
    'Write an annual-chart house as "वर्ष का Nवाँ भाव" (for example "गुरु वर्ष के पहले भाव में है"), and a transit with the word गोचर (for example "शनि मीन राशि में गोचर कर रहा है, जो आपके चंद्र से सातवाँ है"). Mark natal placements as "आपकी जन्म कुंडली में".',
    'The classical gochara labels are "सहायक" (supportive) and "चुनौतीपूर्ण" (demanding) in Hindi; present them as seasons that call for different approaches.',
  ],
  sections: {
    foundations: {
      title: 'आपके जन्म का आधार', kicker: 'आपकी कुंडली',
      intro: 'जन्म विवरण और जन्म कुंडली, जिनसे इस वर्षफल की हर वार्षिक गणना आरंभ होती है।',
    },
    'annual-chart': {
      title: 'आपकी वर्ष कुंडली', kicker: 'खंड 1',
      intro: 'वह कुंडली जो ठीक उस क्षण के लिए बनाई गई है जब इस वर्ष सूर्य अपनी जन्मकालीन स्थिति पर लौटा।',
    },
    'year-lord': {
      title: 'वर्षेश और मुंथा', kicker: 'खंड 2',
      intro: 'वर्ष को समझने की दो शास्त्रीय ताजिक कुंजियाँ: वह ग्रह जो वर्ष का संचालन करता है, और वह बिंदु जिस पर वर्ष का ध्यान टिका रहता है।',
    },
    tajik: {
      title: 'ताजिक योग और सहम', kicker: 'खंड 3',
      intro: 'ताजिक ज्योतिष वर्ष को ग्रहों के बीच निकट आती और दूर जाती दृष्टियों से, और सहम कहलाने वाले संवेदनशील बिंदुओं से पढ़ता है।',
    },
    mudda: {
      title: 'मुद्दा दशा: वर्ष की ग्रह अवधियाँ', kicker: 'खंड 4',
      intro: 'मुद्दा दशा वर्ष को नौ ग्रह अवधियों में बाँटती है, उसी अनुपात में जिसमें विंशोत्तरी दशा बँटी होती है।',
    },
    'year-transits': {
      title: 'आपके वर्ष के गोचर', kicker: 'खंड 5',
      intro: 'इस वर्ष हर ग्रह कहाँ-कहाँ चलता है, आपके जन्म लग्न और चंद्र से गिनकर।',
    },
    'planets-swift': { title: 'इस वर्ष के तेज़ गति वाले ग्रह', kicker: 'खंड 6' },
    'planets-slow': { title: 'इस वर्ष के धीमी गति वाले ग्रह', kicker: 'खंड 7' },
    ...Object.fromEntries(MONTHS.map((i) => [`month-${pad2(i)}`, {
      title: `आपके वर्ष का माह ${i}`, kicker: `वर्ष माह ${i}`,
      intro: 'ताजिक माह हर बार तब आरंभ होता है जब सूर्य अपनी जन्मकालीन स्थिति से 30° और आगे बढ़ता है। नीचे की हर बात इसी माह की मुद्दा अवधि और गोचर से ली गई है।',
    }])),
    observances: {
      title: 'आपके वर्ष के पावन दिन', kicker: 'पंचांग',
      intro: 'इस वर्ष में पड़ने वाली पूर्णिमाएँ और पर्व तिथियाँ, साथ में ऐसी साधनाएँ जिनमें कोई ख़र्च नहीं है।',
    },
    closing: { title: 'आपके वर्ष के लिए समापन विचार', kicker: 'समापन' },
  },
  topics: {
    'birth-synopsis': { title: 'आपके जन्म विवरण का सार', subtitle: 'अवकहड़ा चक्र और जन्म पंचांग' },
    'natal-chart': { title: 'आपकी जन्म कुंडली (लग्न कुंडली)' },
    'varshphal-intro': { title: 'आपका वर्षफल क्या दिखाता है', subtitle: 'वर्ष का फल' },
    'solar-return': { title: 'वर्ष प्रवेश कुंडली' },
    'annual-positions': { title: 'वर्ष कुंडली में ग्रहों की स्थिति' },
    'annual-chart-reading': { title: 'वर्ष कुंडली को पढ़ना', subtitle: 'वर्ष लग्न और मुख्य स्थितियाँ' },
    panchadhikari: { title: 'पाँच पदाधिकारी (पंचाधिकारी)' },
    'year-lord-reading': { title: 'आपका वर्षेश', subtitle: 'वर्ष का स्वामी और वह आपसे क्या चाहता है' },
    'muntha-table': { title: 'इस वर्ष आपकी मुंथा' },
    'muntha-reading': { title: 'मुंथा और वर्ष का केंद्र', subtitle: 'जहाँ वर्ष का ध्यान एकत्र होता है' },
    'tajik-yogas': { title: 'आपकी वर्ष कुंडली के ताजिक योग' },
    'tajik-reading': { title: 'वर्ष के ग्रह संबंधों का अर्थ', subtitle: 'इत्थशाल, ईसराफ और संबंधित योग' },
    sahams: { title: 'सहम: वर्ष के संवेदनशील बिंदु' },
    'sahams-reading': { title: 'अपने सहम पढ़ना', subtitle: 'भाग्य, विद्या, कर्म और स्नेह के बिंदु' },
    'mudda-table': { title: 'आपकी मुद्दा दशा की अवधियाँ' },
    'mudda-reading': { title: 'आपके वर्ष के अध्याय', subtitle: 'हर मुद्दा अवधि किस बात पर बल देती है' },
    'transit-summary': { title: 'वर्ष के गोचरों का सार' },
    'transit-table': { title: 'वर्ष की हर राशि अवधि' },
    ...Object.fromEntries(PLANET_YEAR.map(([id, planet, subtitle]) => [`${id}-year`, { title: `आपके वर्ष में ${planet} का गोचर`, subtitle }])),
    'moon-year': { title: 'आपकी वर्ष कुंडली में चंद्र', subtitle: 'वर्ष का भावनात्मक वातावरण' },
    ...Object.fromEntries(MONTHS.flatMap((i) => {
      const n = pad2(i);
      return [
        [`m${n}-sky`, { title: 'इस माह का आकाश' }],
        [`m${n}-work`, { title: 'कार्यक्षेत्र, धन और शिक्षा', subtitle: 'इस माह काम, आर्थिक स्थिति, पढ़ाई और निर्णय' }],
        [`m${n}-heart`, { title: 'प्रेम, परिवार और घर', subtitle: 'इस माह संबंध और घरेलू जीवन' }],
        [`m${n}-wellbeing`, { title: 'स्वास्थ्य, अध्यात्म और साधना', subtitle: 'ऊर्जा, आंतरिक विकास और इस माह की साधनाएँ' }],
      ];
    })),
    'observance-dates': { title: 'पूर्णिमाएँ और पर्व तिथियाँ' },
    'observance-practices': { title: 'पावन दिनों की साधनाएँ', subtitle: 'पूर्णिमा, हनुमान जयंती और अक्षय तृतीया' },
    'practice-note': { title: 'साधनाओं के बारे में एक बात' },
    'year-closing': { title: 'वर्ष को आगे ले चलना', subtitle: 'पूरा वर्ष एक दृष्टि में' },
  },
};

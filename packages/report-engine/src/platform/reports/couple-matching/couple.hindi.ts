/**
 * Couple Kundli Matching: Hindi edition (display text only).
 * Structure, evidence and objectives are those of couple.definition.ts; the
 * block wording below restates couple.blocks.ts sentence for sentence.
 * Manglik, Nadi, Bhakoot, Sade Sati and the nodal axis are worded as neutrally
 * as in English: classical conventions, never afflictions.
 */
import { HindiEdition } from '../../i18n/hindi';
import { addTerms, Lang, nakshatraText, rashiText } from '../_finance-couple-shared/shared.hindi';

const PLANETS_HI: Array<[string, string]> = [
  ['sun', 'सूर्य'], ['moon', 'चंद्र'], ['mars', 'मंगल'], ['mercury', 'बुध'], ['jupiter', 'गुरु'],
  ['venus', 'शुक्र'], ['saturn', 'शनि'], ['rahu', 'राहु'], ['ketu', 'केतु'],
];

const HOUSE_TITLES_HI = [
  'शरीर, स्वास्थ्य और स्वभाव', 'धन, परिवार और वाणी', 'साहस, भाई-बहन और छोटी यात्राएँ', 'घर, माता और संपत्ति',
  'प्रेम, संतान और बुद्धि', 'स्वास्थ्य की दिनचर्या, विवाद और सेवा', 'विवाह और साझेदारी', 'आयु, साझा संसाधन और परिवर्तन',
  'भाग्य, आस्था और लंबी यात्राएँ', 'व्यवसाय, प्रतिष्ठा और पिता', 'मित्र, लाभ और बड़े भाई-बहन', 'व्यय, विदेश और विश्राम',
];

export const COUPLE_HINDI: HindiEdition = {
  title: 'युगल कुंडली मिलान',
  subtitle: 'दो कुंडलियाँ साथ-साथ: गुण मिलान, मंगल, चंद्र, शुक्र, सातवाँ भाव और आपकी साझा समय-रेखा',
  description:
    'शास्त्रीय 36 गुणों वाला अष्टकूट मिलान हर कूट की व्याख्या सहित, मांगलिक की तटस्थ तुलना, दोनों की D1, D9 और वर्ग कुंडलियाँ, ग्रह तालिकाएँ, अष्टकवर्ग, विंशोत्तरी दशाएँ और उनका साथ-साथ चलना, शनि और गुरु के चक्र, तथा ग्रह-दर-ग्रह और भाव-दर-भाव तुलना।',
  writingGuidance: [
    'Hindi forms of address: the reader is "आप" and the other person is "आपके साथी" (never names). For the partner\'s placements always use the possessive, for example "आपके साथी का शुक्र उनके दूसरे भाव में है"; never a bare "शुक्र दूसरे भाव में है" for the partner.',
    'In Hindi, explain मांगलिक, नाड़ी, भकूट, साढ़े साती and काल सर्प neutrally as classical conventions (शास्त्रीय परंपरा) and areas of growth; never call them a दोष that afflicts the couple, and never use words of fear, curse or misfortune for them.',
  ],
  sections: {
    'matching-overview': {
      title: 'मिलान एक नज़र में', kicker: 'आपकी कुंडलियाँ',
      intro: 'शास्त्रीय मिलान क्या देखता है, और आप दोनों के जन्म के मुख्य विवरण, साथ-साथ।',
    },
    'guna-milan': {
      title: 'अष्टकूट गुण मिलान', kicker: 'खंड 1',
      intro: 'आप दोनों के चंद्र की 36 अंकों की तुलना, एक-एक कूट करके, शास्त्रीय अपवादों सहित।',
    },
    'koota-reading-1': { title: 'कूट-दर-कूट: मूल्य और सहज प्रवृत्ति', kicker: 'खंड 2' },
    'koota-reading-2': { title: 'कूट-दर-कूट: मन और परिवार', kicker: 'खंड 3' },
    'mars-comparison': {
      title: 'मंगल और मांगलिक तुलना', kicker: 'खंड 4',
      intro: 'एक शास्त्रीय परंपरा, जो पूर्णता के लिए दिखाई गई है। हम दोषों में विश्वास नहीं करते; मंगल वह ऊर्जा है जिसे समझदारी से साझा किया जाता है।',
    },
    'matching-prediction': {
      title: 'साथ का जीवन', kicker: 'खंड 5',
      intro: 'साझा जीवन के मुख्य क्षेत्रों में दोनों कुंडलियाँ कैसे मिलती हैं।',
    },
    'heart-of-match': {
      title: 'चंद्र, शुक्र और सातवाँ भाव', kicker: 'खंड 6',
      intro: 'गुण अंकों से आगे, रिश्ते के तीन शास्त्रीय स्तंभ, दोनों कुंडलियों में पढ़े गए।',
    },
    'two-charts': {
      title: 'दो कुंडलियाँ साथ-साथ', kicker: 'खंड 7',
      intro: 'आप दोनों का पूरा गणना किया हुआ विवरण: ग्रह तालिकाएँ और मुख्य कुंडलियाँ।',
    },
    'divisional-charts': {
      title: 'वर्ग कुंडलियाँ', kicker: 'खंड 8',
      intro: 'शास्त्रीय विश्लेषण में काम आने वाली षोडशवर्ग कुंडलियाँ, आप दोनों के लिए। हर कुंडली जीवन के एक क्षेत्र को बारीकी से दिखाती है।',
    },
    'strength-tables': {
      title: 'मैत्री और अष्टकवर्ग', kicker: 'खंड 9',
      intro: 'हर कुंडली में ग्रह एक-दूसरे से कैसा संबंध रखते हैं, और हर भाव का बिंदु बल।',
    },
    'individual-profiles': {
      title: 'दो अलग व्यक्तित्व', kicker: 'खंड 10',
      intro: 'आप दोनों, अपनी-अपनी जगह पर: व्यक्तित्व, जन्म नक्षत्र और चंद्र राशि।',
    },
    'planets-1': { title: 'ग्रह-दर-ग्रह: व्यक्तिगत ग्रह', kicker: 'खंड 11' },
    'planets-2': { title: 'ग्रह-दर-ग्रह: शुक्र, शनि और राहु-केतु', kicker: 'खंड 12' },
    'houses-1': { title: 'भाव-दर-भाव: स्वयं, घर और प्रेम', kicker: 'खंड 13' },
    'houses-2': { title: 'भाव-दर-भाव: साझेदारी, भाग्य और लाभ', kicker: 'खंड 14' },
    timelines: {
      title: 'दशा समय-रेखाएँ', kicker: 'खंड 15',
      intro: 'दोनों की विंशोत्तरी समय-रेखाएँ और वे अवधियाँ जो आप साथ-साथ जीते हैं।',
    },
    cycles: {
      title: 'शनि, गुरु और राहु-केतु', kicker: 'खंड 16',
      intro: 'अगले बारह वर्षों में धीमे ग्रहों के चक्र, हर एक के चंद्र से गिने हुए।',
    },
    harmony: {
      title: 'व्यावहारिक सामंजस्य', kicker: 'खंड 17',
      intro: 'रत्नों और शुभ वस्तुओं की सूचियों की जगह: आप दोनों के सहायक ग्रह, और ऐसे अभ्यास जिन पर कोई खर्च नहीं आता।',
    },
  },
  topics: {
    significance: { title: 'मिलान का महत्व' },
    'birth-details': { title: 'जन्म विवरण साथ-साथ', subtitle: 'लग्न, चंद्र, पंचांग और अवकहड़ा' },
    'koota-table': { title: 'अष्टकूट गुण तालिका' },
    verdict: { title: 'परिणाम और शास्त्रीय अपवाद' },
    'guna-overview': { title: 'आपके गुण अंकों का अर्थ' },
    'koota-varna': { title: 'वर्ण कूट' },
    'koota-vashya': { title: 'वश्य कूट' },
    'koota-tara': { title: 'तारा कूट' },
    'koota-yoni': { title: 'योनि कूट' },
    'koota-maitri': { title: 'ग्रह मैत्री कूट' },
    'koota-gana': { title: 'गण कूट' },
    'koota-bhakoot': { title: 'भकूट' },
    'koota-nadi': { title: 'नाड़ी कूट' },
    'manglik-table': { title: 'दोनों कुंडलियों में मंगल' },
    'manglik-reading': { title: 'दो तरह की ऊर्जा', subtitle: 'मंगल, उत्साह और मतभेद सुलझाने का ढंग' },
    'together-nature': { title: 'स्वभाव और प्रकृति' },
    'together-finance': { title: 'दंपति के रूप में धन' },
    'together-wellbeing': { title: 'कुशलता और दिनचर्या' },
    'together-family': { title: 'संतान और परिवार का विस्तार' },
    'inlaws-native': { title: 'आप और आपके साथी का परिवार' },
    'inlaws-partner': { title: 'आपके साथी और आपका परिवार' },
    'moon-comparison': { title: 'दो चंद्र: भावनात्मक सामंजस्य' },
    'venus-comparison': { title: 'दो शुक्र: प्रेम की भाषा' },
    'seventh-comparison': { title: 'दो सप्तम भाव: विवाह में हर एक क्या चाहता है' },
    'planets-native': { title: 'ग्रहों की स्थिति: आप' },
    'planets-partner': { title: 'ग्रहों की स्थिति: आपके साथी' },
    'charts-d1': { title: 'जन्म कुंडलियाँ (D1)' },
    'charts-moon-sun': { title: 'चंद्र और सूर्य कुंडलियाँ' },
    'charts-d9': { title: 'नवांश कुंडलियाँ (D9)' },
    'navamsa-reading': { title: 'नवांश: विवाह की कुंडली' },
    'vargas-a': { title: 'होरा, द्रेष्काण और चतुर्थांश' },
    'vargas-b': { title: 'सप्तमांश, दशमांश और द्वादशांश' },
    'vargas-c': { title: 'षोडशांश, त्रिंशांश और षष्ट्यंश' },
    friendship: { title: 'ग्रह मैत्री' },
    'ashtakavarga-native': { title: 'अष्टकवर्ग: आप' },
    'ashtakavarga-partner': { title: 'अष्टकवर्ग: आपके साथी' },
    'personality-native': { title: 'आपका व्यक्तित्व' },
    'personality-partner': { title: 'आपके साथी का व्यक्तित्व' },
    'nakshatra-both': { title: 'आपके जन्म नक्षत्र', subtitle: 'दोनों का नक्षत्र फल' },
    'rashi-both': { title: 'आपकी चंद्र राशियाँ', subtitle: 'दोनों का राशि फल' },
    'temperament-both': { title: 'गण, योनि और पाया', subtitle: 'स्वभाव के शास्त्रीय सूचक' },
    'numerology-table': { title: 'अंक ज्योतिष साथ-साथ' },
    'numerology-both': { title: 'आपके अंक एक साथ' },
    ...Object.fromEntries(PLANETS_HI.map(([id, name]) => [`planet-${id}`, { title: `दोनों कुंडलियों में ${name}` }])),
    ...Object.fromEntries(HOUSE_TITLES_HI.map((title, i) => [`house-${i + 1}`, { title }])),
    'dasha-tables': { title: 'महादशाएँ और अंतर्दशाएँ' },
    pratyantar: { title: 'अभी की प्रत्यंतर दशाएँ' },
    'overlap-table': { title: 'आपकी साझा समय-रेखा' },
    'dasha-native': { title: 'आपकी चल रही दशाएँ' },
    'dasha-partner': { title: 'आपके साथी की चल रही दशाएँ' },
    'shared-periods': { title: 'समय-रेखा पर साथ-साथ चलना' },
    'saturn-table': { title: 'साढ़े साती और ढैया की अवधियाँ' },
    'nodes-table': { title: 'राहु-केतु अक्ष' },
    'joint-transits': { title: 'आप दोनों के लिए गुरु और शनि' },
    'saturn-reading': { title: 'उत्तरदायित्व के दौर' },
    'jupiter-reading': { title: 'कृपा के दौर' },
    'functional-table': { title: 'आप दोनों के सहायक ग्रह' },
    'harmony-practices': { title: 'साझा जीवन के लिए अभ्यास', subtitle: 'कुछ भी खरीदना नहीं' },
    'closing-summary': { title: 'सब कुछ एक साथ' },
  },
};

// ------------------------------------------------------- block vocabulary --

addTerms({
  // Kootas
  Varna: 'वर्ण', Vashya: 'वश्य', Tara: 'तारा', Yoni: 'योनि', 'Graha Maitri': 'ग्रह मैत्री', Maitri: 'मैत्री', Gana: 'गण', Bhakoot: 'भकूट', Nadi: 'नाड़ी',
  'No.': 'क्र.', Koota: 'कूट', Max: 'अधिकतम', 'What it compares': 'किसकी तुलना', You: 'आप', Partner: 'साथी', Points: 'अंक',
  'Area of life': 'जीवन का क्षेत्र', Total: 'कुल', 'About Manglik': 'मांगलिक के बारे में',
  'Work ethic and values': 'कर्म-निष्ठा और मूल्य', 'Mutual attraction and influence': 'आपसी आकर्षण और प्रभाव',
  'Wellbeing and destiny rhythm': 'कुशलता और भाग्य की लय', 'Intimacy and instinct': 'निकटता और सहज प्रवृत्ति',
  'Mental friendship': 'मन की मित्रता', Temperament: 'स्वभाव', 'Family life and emotional growth': 'पारिवारिक जीवन और भावनात्मक विकास',
  'Constitution and family health': 'शारीरिक प्रकृति और परिवार का स्वास्थ्य',
  // Yoni animals as the matchmaking engine names them
  Horse: 'अश्व', Elephant: 'गज', Sheep: 'मेष', Serpent: 'सर्प', Dog: 'श्वान', Cat: 'मार्जार', Rat: 'मूषक', Cow: 'गौ', Buffalo: 'महिष',
  Tiger: 'व्याघ्र', Deer: 'मृग', Monkey: 'वानर', Mongoose: 'नकुल', Lion: 'सिंह',
  // Bhakoot distances
  'Eka Rashi': 'एक राशि', Samasaptaka: 'समसप्तक', 'Tritiya-Ekadasha': 'तृतीय-एकादश', 'Chaturtha-Dashama': 'चतुर्थ-दशम',
  'Nav-Pancham': 'नव-पंचम', Shadashtak: 'षडाष्टक', 'Dwi-Dwadash': 'द्वि-द्वादश',
  // Birth details
  Factor: 'विवरण', Birth: 'जन्म', 'Ascendant lord': 'लग्न स्वामी', 'Moon sign (Rashi)': 'चंद्र राशि', 'Rashi lord': 'राशि स्वामी',
  'Nakshatra lord': 'नक्षत्र स्वामी', 'Sun sign (sidereal)': 'सूर्य राशि (निरयन)', Tithi: 'तिथि', Yoga: 'योग', Karana: 'करण',
  Paya: 'पाया', 'Name syllable': 'नामाक्षर', Tatwa: 'तत्व',
  // Verdict cards
  'Guna Milan result': 'गुण मिलान का परिणाम', 'Bhakoot (Moon-sign distance)': 'भकूट (चंद्र राशियों की दूरी)', 'How to hold this number': 'इस अंक को कैसे देखें',
  // Manglik
  'Mars from Lagna': 'लग्न से मंगल', 'from Moon': 'चंद्र से', 'from Venus': 'शुक्र से', 'Placement 1/4/7/8/12': '1/4/7/8/12 में स्थिति',
  'Balancing factors': 'संतुलन के कारक', Yes: 'हाँ', No: 'नहीं', Comparison: 'तुलना',
  'Mars in own sign (Aries) in 1st house': 'मंगल स्वराशि (मेष) में, 1ले भाव में',
  'Mars in own sign (Scorpio) in 4th/8th house': 'मंगल स्वराशि (वृश्चिक) में, 4थे/8वें भाव में',
  'Mars in exalted sign (Capricorn) in 7th/8th house': 'मंगल उच्च राशि (मकर) में, 7वें/8वें भाव में',
  'Mars in friendly sign (Leo) in 8th house': 'मंगल मित्र राशि (सिंह) में, 8वें भाव में',
  'Mars in friendly sign (Sagittarius) in 12th house': 'मंगल मित्र राशि (धनु) में, 12वें भाव में',
  'Jupiter conjoined with Mars in the same house': 'गुरु उसी भाव में मंगल के साथ युति में',
  'Benefic Jupiter aspects Mars (5th/7th/9th drishti)': 'शुभ गुरु की मंगल पर दृष्टि (5वीं/7वीं/9वीं दृष्टि)',
  // Chart captions
  'birth chart (D1)': 'जन्म कुंडली (D1)', 'Moon chart': 'चंद्र कुंडली', 'Sun chart': 'सूर्य कुंडली', 'Navamsa (D9)': 'नवांश (D9)',
  'Hora (D2), wealth': 'होरा (D2), धन', 'Drekkana (D3), siblings': 'द्रेष्काण (D3), भाई-बहन', 'Chaturthamsa (D4), property': 'चतुर्थांश (D4), संपत्ति',
  'Saptamsa (D7), children': 'सप्तमांश (D7), संतान', 'Dasamsa (D10), career': 'दशमांश (D10), कर्मक्षेत्र', 'Dwadasamsa (D12), parents': 'द्वादशांश (D12), माता-पिता',
  'Shodasamsa (D16), comforts': 'षोडशांश (D16), सुख-सुविधा', 'Trimsamsa (D30), challenges': 'त्रिंशांश (D30), चुनौतियाँ', 'Shashtiamsa (D60), overall': 'षष्ट्यंश (D60), समग्र',
  // Friendship
  'PERMANENT (NAISARGIKA) FRIENDSHIP': 'नैसर्गिक (स्थायी) मैत्री', 'five-fold (Panchadha)': 'पंचधा मैत्री',
  GF: 'अमि', F: 'मि', N: 'सम', E: 'शत्रु', GE: 'अश',
  // Ashtakavarga and dashas
  'Sarvashtakavarga by house': 'भाव अनुसार सर्वाष्टकवर्ग', Mahadashas: 'महादशाएँ', 'running Mahadasha': 'चल रही महादशा',
  'running Antardasha': 'चल रही अंतर्दशा', Pratyantar: 'प्रत्यंतर', 'Shared stretch': 'साझा अवधि',
  // Saturn, nodes, transits
  'No such Saturn period in the next 12 years.': 'अगले 12 वर्षों में शनि की ऐसी कोई अवधि नहीं है।',
  'Saturn in': 'शनि की राशि', 'Phase from Moon': 'चंद्र से चरण',
  'Sade Sati - rising (12th)': 'साढ़े साती - आरंभ (12वाँ)', 'Sade Sati - peak (1st)': 'साढ़े साती - मध्य (1ला)',
  'Sade Sati - setting (2nd)': 'साढ़े साती - उतार (2रा)', 'Dhaiya (4th)': 'ढैया (4था)', 'Dhaiya (8th)': 'ढैया (8वाँ)',
  'All seven on one side': 'सातों एक ओर', 'Rahu-to-Ketu side': 'राहु से केतु की ओर', 'Ketu-to-Rahu side': 'केतु से राहु की ओर',
  // Numerology
  Number: 'अंक', 'Mulank (day number)': 'मूलांक (जन्म दिन का अंक)', 'Bhagyank (destiny number)': 'भाग्यांक (भाग्य का अंक)',
});

/** Fixed passages and method notes of the Couple Matching blocks, in Hindi. */
export const COUPLE_HI = {
  significance: (nameA: string, signA: string, nameB: string, signB: string): string =>
    `शास्त्रीय वैदिक मिलान (अष्टकूट या गुण मिलान) दोनों के चंद्र की तुलना करता है: उनकी राशियाँ और नक्षत्र। आठ कूटों का भार 1 से 8 अंक तक क्रमशः बढ़ता है, कुल 36; परंपरा 18 या उससे अधिक को स्वीकार्य आधार मानती है। यहाँ ${nameA} का चंद्र ${signA} में और ${nameB} का ${signB} में है। गुण योग कई दृष्टिकोणों में से एक है: यह रिपोर्ट दोनों की पूरी कुंडलियाँ भी साथ-साथ रखती है, क्योंकि लग्न, शुक्र, 7वाँ भाव, नवांश और दशाएँ साझा जीवन के बारे में उतना ही कहते हैं जितना कोई अंक।`,
  aboutManglik:
    'परंपरा दोनों कुंडलियों में मंगल की स्थिति (लग्न से 1ले, 4थे, 7वें, 8वें या 12वें भाव में) की भी तुलना करती है और चाहती है कि यह स्थिति या तो दोनों में हो या किसी में नहीं। एस्ट्रो सुशील दोषों को अभिशाप नहीं मानता: हम यह तुलना केवल पूर्णता के लिए दिखाते हैं और मंगल को उस ऊर्जा और उत्साह के रूप में पढ़ते हैं, जिसे दंपति मिलकर सही दिशा देना सीखते हैं।',
  significanceMethod: 'शास्त्रीय अष्टकूट भार (वर्ण 1, वश्य 2, तारा 3, योनि 4, ग्रह मैत्री 5, गण 6, भकूट 7, नाड़ी 8)।',
  birthDetailsMethod:
    'अवकहड़ा चक्र हर एक के चंद्र की राशि और नक्षत्र से; पंचांग के अंग जन्म के समय सूर्य और चंद्र के अंतर से। वार नहीं दिया गया (इंजन यूटीसी तिथि का उपयोग करता है)।',
  kootaMethod: (groomIsReader: boolean): string =>
    `गणना इंजन का अष्टकूट मिलान (शास्त्रीय पाराशरी)। वर्ण और वश्य दिशा पर निर्भर हैं; ${groomIsReader ? 'आपकी' : 'आपके साथी की'} कुंडली वर की कुंडली मानी गई है (जहाँ जोड़ी में एक पुरुष और एक स्त्री है, वहाँ पुरुष की)। पट्टियाँ: धूसर = अधिकतम, भरी हुई = प्राप्त अंक। भकूट के अंक किसी अपवाद से पहले के दिखाए गए हैं।`,
  holdNumber:
    'गुण मिलान केवल दोनों के चंद्र की तुलना करता है। अधिक अंक सामंजस्य की गारंटी नहीं हैं और कम अंक उसे रोकते नहीं; आगे के अध्याय दोनों कुंडलियों को पूरा पढ़ते हैं।',
  noBhakootException: 'कोई भी शास्त्रीय अपवाद (एक ही स्वामी, मित्र स्वामी, एक ही नक्षत्र) लागू नहीं होता।',
  bhakootSameLord: 'दोनों चंद्र राशियों का स्वामी एक ही है',
  bhakootFriendlyLords: 'दोनों चंद्र राशियों के स्वामी नैसर्गिक मित्र हैं',
  bhakootSameNakshatra: 'दोनों चंद्र एक ही नक्षत्र में हैं',
  noNadiException: 'कोई शास्त्रीय अपवाद लागू नहीं होता; परंपरा इसे एक-दूसरे के स्वास्थ्य और दिनचर्या का ध्यान रखने की याद के रूप में पढ़ती है।',
  verdictMethod:
    'भकूट के अपवाद, जैसे इंजन में लागू हैं: दोनों चंद्र राशियों का एक ही स्वामी, परस्पर मित्र स्वामी (नैसर्गिक), या एक ही नक्षत्र। नाड़ी के अपवाद: एक ही नक्षत्र अलग राशियों में, एक ही राशि में अलग नक्षत्र और मित्र स्वामी, या अलग चरण।',
  manglikNeither: 'संतुलन के कारकों को गिनने के बाद किसी भी कुंडली में मंगल की यह शास्त्रीय स्थिति नहीं है, इसलिए पारंपरिक नियम पूरा होता है।',
  manglikBoth: 'दोनों कुंडलियों में मंगल की यह शास्त्रीय स्थिति है; परंपरा इसे परस्पर संतुलित मानती है।',
  manglikOne:
    'संतुलन के कारकों को गिनने के बाद केवल एक कुंडली में मंगल की यह शास्त्रीय स्थिति है। परंपरा चाहती है कि यह दोनों में हो या किसी में नहीं; हम इसे केवल उत्साह और गति के अंतर के रूप में पढ़ते हैं, जिसके साथ दंपति समझ-बूझकर चल सकते हैं।',
  manglikNoTime: 'जन्म समय उपलब्ध नहीं है, इसलिए लग्न पर आधारित यह नियम लागू नहीं किया जा सकता।',
  manglikStance: ' एस्ट्रो सुशील दोषों को कष्ट नहीं मानता: मंगल ऊर्जा, साहस और स्पष्टवादिता को दर्शाता है।',
  manglikMethod:
    'इंजन का मांगलिक मूल्यांकन: लग्न से 1ले, 4थे, 7वें, 8वें या 12वें भाव में मंगल (चंद्र और शुक्र से भाव केवल जानकारी के लिए)। संतुलन के कारक: विशेष भावों में मंगल का स्वराशि या उच्च राशि में होना, अथवा गुरु की मंगल से युति या उस पर दृष्टि।',
  chartsMethod:
    'उत्तर भारतीय शैली; अंक राशियाँ हैं (1 = मेष ... 12 = मीन); ऊपर का बीच वाला खाना 1ला भाव है। चंद्र और सूर्य कुंडली में भाव उस ग्रह की राशि से गिने जाते हैं। वर्ग कुंडलियाँ गणना इंजन के वर्ग नियमों (पाराशरी) से।',
  friendshipMethod:
    'पंक्ति के ग्रह का स्तंभ के ग्रह के प्रति भाव। नैसर्गिक मैत्री (बृहत् पाराशर होरा शास्त्र अ. 15) को तात्कालिक मैत्री (एक-दूसरे से 2रे, 3रे, 4थे, 10वें, 11वें, 12वें स्थान के ग्रह तात्कालिक मित्र होते हैं) से मिलाने पर पंचधा संबंध बनता है: अमि = अधिमित्र, मि = मित्र, सम = सम, शत्रु = शत्रु, अश = अधिशत्रु।',
  ashtakavargaMethod:
    'हर ग्रह के भिन्नाष्टकवर्ग बिंदु राशि अनुसार (मेष ... मीन), साथ में हर राशि किस भाव में पड़ती है; सर्वाष्टक = सातों का योग (प्रति भाव औसत 28)। शोध्य पिंड त्रिकोण और एकाधिपत्य शोधन के बाद (गणना इंजन)।',
  dashaMethod: 'विंशोत्तरी दशा हर एक के चंद्र नक्षत्र से (120 वर्ष का चक्र)। मोटे अक्षर = चल रही दशा।',
  pratyantarMethod: 'हर एक की चल रही अंतर्दशा के भीतर तीसरे स्तर की विंशोत्तरी दशाएँ (प्रत्यंतर दशा), गणना इंजन से।',
  overlapMethod: (years: number): string =>
    `जब भी किसी एक की विंशोत्तरी अंतर्दशा बदलती है, नई पंक्ति शुरू होती है; रिपोर्ट की तिथि से ${years} वर्ष। यह प्रतिशत वाले "ज्योतिष ग्राफ" की जगह लेता है, जिनका कोई शास्त्रीय नियम नहीं है।`,
  saturnCard:
    'साढ़े साती चंद्र से 12वीं, 1ली और 2री राशि पर शनि का गोचर है; ढैया 4थी या 8वीं राशि में उसका ठहराव है। शास्त्रीय दृष्टि से ये उत्तरदायित्व, परिपक्वता और जीवन को नए ढंग से सँवारने के दौर हैं, दुर्भाग्य नहीं। जब एक साथी ऐसे दौर से गुज़र रहा हो, तब दूसरे की स्थिरता सबसे अधिक मायने रखती है।',
  saturnMethod:
    'शनि की राशि-अवधियाँ गोचर के राशि-प्रवेश की गणना (लाहिरी) से, रिपोर्ट की तिथि से 12 वर्ष; (व) = वक्री होकर पुनः प्रवेश। भाव हर एक के जन्म चंद्र से गिने गए हैं।',
  nodesCard:
    'कुछ बाद की परंपराएँ उस स्थिति को "काल सर्प" कहती हैं जब सातों ग्रह राहु-केतु अक्ष के एक ही ओर हों। बृहत् पाराशर होरा शास्त्र में इसका उल्लेख नहीं है, और एस्ट्रो सुशील इसे दोष नहीं मानता। हम यह वितरण केवल एक ज्यामितीय तथ्य के रूप में दिखाते हैं: राहु बताता है कि आप में से हर एक कहाँ विकास खोजता है और केतु बताता है कि क्या सहज रूप से आता है।',
  nodesMethod: 'सातों ग्रहों का भोगांश मध्यम राहु से नापा गया है: 0 से 180 अंश = राहु से केतु की ओर; 180 से 360 = केतु से राहु की ओर।',
  jointTransitsMethod: (jupiter: string, saturn: string): string =>
    `गुरु और शनि की 12 वर्ष की राशि-अवधियाँ (गोचर के राशि-प्रवेश की गणना, लाहिरी)। * = उस चंद्र से शास्त्रीय रूप से अनुकूल गोचर (फलदीपिका अ. 26: गुरु ${jupiter}; शनि ${saturn})। वेध लागू नहीं; प्रतिशत अंक नहीं।`,
  functionalMethodTail: ' रत्नों की सलाह की जगह दिखाया गया है: कुछ भी खरीदना नहीं।',
  numerologyMethod:
    'मूलांक = जन्म दिन के अंकों का योग; भाग्यांक = पूरी जन्म तिथि के अंकों का योग। स्वामी ग्रह: 1 सूर्य, 2 चंद्र, 3 गुरु, 4 राहु, 5 बुध, 6 शुक्र, 7 केतु, 8 शनि, 9 मंगल।',
};

/**
 * The engine's reason for a Nadi exception (already stripped of its "Nadi Dosha cancelled:" prefix)
 * in the report language. The nakshatras, signs and padas are read back from the engine's sentence.
 */
export function nadiExceptionText(lang: Lang, reason: string): string {
  if (lang === 'en') return reason;
  const nak = (n: string) => nakshatraText('hi', n);
  const rashi = (r: string) => rashiText('hi', r);
  let m = /^Same Nakshatra \((.+)\) spans different Rashis \((.+) & (.+)\)\.$/.exec(reason);
  if (m) return `एक ही नक्षत्र (${nak(m[1])}) अलग-अलग राशियों (${rashi(m[2])} और ${rashi(m[3])}) में पड़ता है।`;
  m = /^Same Rashi \((.+)\) with different Nakshatras \((.+) & (.+)\)\.$/.exec(reason);
  if (m) return `राशि एक ही है (${rashi(m[1])}) पर नक्षत्र अलग हैं (${nak(m[2])} और ${nak(m[3])})।`;
  m = /^Different Pada quarters \((\d) vs (\d)\) in (.+)\.$/.exec(reason);
  if (m) return `${nak(m[3])} नक्षत्र में चरण अलग हैं (${m[1]} और ${m[2]})।`;
  throw new Error(`HINDI_LABEL_MISSING: "${reason}"`);
}

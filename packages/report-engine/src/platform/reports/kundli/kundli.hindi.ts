/**
 * Premium Personalised Kundli: Hindi edition (display text only).
 *
 * Structure, evidence and objectives are those of kundli.definition.ts. This file holds
 * (1) the Hindi titles of every section and topic, and (2) the Hindi vocabulary of the
 * Kundli blocks: table headings, notes, and display names for the values the engine
 * produced (weekdays, tithis, panchang yogas, karanas, lunar months, Avakahada and
 * Ghatak values, yoga names). Nothing here calculates or changes astrology.
 *
 * The block vocabulary is kept in this module (not in the shared glossary) so that a
 * heading such as "From" or "Day" cannot collide with another report's wording.
 */
import { HindiEdition, label, pick, planetLabel, ReportLanguage, signLabel } from '../../i18n/hindi';
import { formatDate } from '../../render/latex';
import { localDateTime } from './calc/vedic-day';

// ---------------------------------------------------------------------------
// Edition: titles of the report, its sections and its topics
// ---------------------------------------------------------------------------

const PLANET_TOPICS: Record<string, { title: string; subtitle: string }> = {
  sun: { title: 'सूर्य: आपका आंतरिक अधिकार', subtitle: 'सूर्य की स्थिति, राशि और दृष्टियाँ' },
  moon: { title: 'चंद्र: आपका भावनात्मक स्वभाव', subtitle: 'चंद्र की स्थिति, राशि और दृष्टियाँ' },
  mars: { title: 'मंगल: आपकी ऊर्जा और साहस', subtitle: 'मंगल की स्थिति, राशि और दृष्टियाँ' },
  mercury: { title: 'बुध: आप कैसे सोचते और बोलते हैं', subtitle: 'बुध की स्थिति, राशि और दृष्टियाँ' },
  jupiter: { title: 'गुरु: आपका ज्ञान और विकास', subtitle: 'गुरु की स्थिति, राशि और दृष्टियाँ' },
  venus: { title: 'शुक्र: प्रेम, सौंदर्य और जीवन-मूल्य', subtitle: 'शुक्र की स्थिति, राशि और दृष्टियाँ' },
  saturn: { title: 'शनि: अनुशासन और सहनशक्ति', subtitle: 'शनि की स्थिति, राशि और दृष्टियाँ' },
  rahu: { title: 'राहु: नए की ओर खिंचाव', subtitle: 'उत्तर पात: भाव, राशि और दृष्टि के अनुसार' },
  ketu: { title: 'केतु: आपके भीतर का संचित ज्ञान', subtitle: 'दक्षिण पात: भाव, राशि और दृष्टि के अनुसार' },
};

const HOUSE_TOPICS: Array<{ title: string; subtitle: string }> = [
  { title: 'पहला भाव: आपका व्यक्तित्व', subtitle: 'तनु भाव: शरीर, स्वभाव और पहली छाप' },
  { title: 'दूसरा भाव: धन, परिवार और वाणी', subtitle: 'धन भाव: संसाधन, वाणी और जीवन-मूल्य' },
  { title: 'तीसरा भाव: साहस और संवाद', subtitle: 'सहज भाव: प्रयास, भाई-बहन और कौशल' },
  { title: 'चौथा भाव: घर और मन की शांति', subtitle: 'सुख भाव: माता, संपत्ति और सुख-सुविधा' },
  { title: 'पाँचवाँ भाव: बुद्धि और रचनात्मकता', subtitle: 'पुत्र भाव: संतान, विद्या और प्रेम' },
  { title: 'छठा भाव: सेवा और जुझारूपन', subtitle: 'रिपु भाव: स्वास्थ्य की दिनचर्या, काम और प्रतिस्पर्धा' },
  { title: 'सातवाँ भाव: साझेदारी और विवाह', subtitle: 'कलत्र भाव: जीवनसाथी, अनुबंध और लोक-व्यवहार' },
  { title: 'आठवाँ भाव: परिवर्तन और गहराई', subtitle: 'रंध्र भाव: आयु, शोध और साझा संसाधन' },
  { title: 'नौवाँ भाव: भाग्य और आस्था', subtitle: 'धर्म भाव: गुरु, पिता और उच्च शिक्षा' },
  { title: 'दसवाँ भाव: कार्यक्षेत्र और प्रतिष्ठा', subtitle: 'कर्म भाव: काम, पद और उत्तरदायित्व' },
  { title: 'ग्यारहवाँ भाव: लाभ और संपर्क', subtitle: 'लाभ भाव: आय, मित्र और महत्वाकांक्षाएँ' },
  { title: 'बारहवाँ भाव: त्याग और एकांत', subtitle: 'व्यय भाव: खर्च, विदेश और मोक्ष' },
];

const ORDINAL_FEMININE = ['पहली', 'दूसरी', 'तीसरी', 'चौथी', 'पाँचवीं', 'छठी', 'सातवीं', 'आठवीं', 'नौवीं'];

const chapter = (n: number) => `अध्याय ${n}`;

export const KUNDLI_HINDI: HindiEdition = {
  // The market term, by the owner's decision (2026-11-24).
  title: 'प्रीमियम व्यक्तिगत कुंडली',
  subtitle: 'आपकी संपूर्ण वैदिक जन्म कुंडली: गणनाएँ, जीवन के क्षेत्र, दशाएँ और मार्गदर्शन',
  description:
    'संपूर्ण कुंडली: जन्म विवरण और पंचांग, उत्तर और दक्षिण भारतीय कुंडलियाँ, सोलह वर्ग कुंडलियाँ, पूरे जीवन की विंशोत्तरी दशाएँ, अष्टकवर्ग, बारह भाव, नौ ग्रह, कारक, राहु-केतु, मंगल और साढ़े साती का भय-मुक्त विवेचन, योग, अंकशास्त्र और व्यावहारिक मार्गदर्शन।',
  sections: {
    'birth-particulars': {
      title: 'आपका जन्म विवरण', kicker: 'कुंडली एक नज़र में',
      intro: 'आपकी कुंडली का गणितीय आधार: समय और स्थान, जन्म दिवस का पंचांग और अवकहड़ा चक्र।',
    },
    blueprint: {
      title: 'आपके ग्रहों का मानचित्र', kicker: chapter(1),
      intro: 'उत्तर और दक्षिण भारतीय शैली में आपकी जन्म कुंडली, चंद्र कुंडली, नवांश और हर ग्रह की सटीक स्थिति।',
    },
    shodashvarga: {
      title: 'वर्ग कुंडलियाँ', kicker: chapter(2),
      intro: 'सोलह वर्ग कुंडलियाँ (षोडशवर्ग) जीवन के अलग-अलग क्षेत्रों के लिए जन्म कुंडली को और सूक्ष्म बनाती हैं।',
    },
    'dasha-tables': {
      title: 'आपके पूरे जीवन की विंशोत्तरी दशा', kicker: chapter(3),
      intro: 'महादशा से प्रत्यंतर्दशा तक, आपके जीवन की ग्रह दशाएँ। इन तालिकाओं को रिपोर्ट में आगे दिए गए महादशा विवेचन के साथ एक समय-सारणी की तरह देखें।',
    },
    ashtakavarga: {
      title: 'अष्टकवर्ग', kicker: chapter(4),
      intro: 'वह शास्त्रीय बिंदु पद्धति जो दिखाती है कि आपकी कुंडली की हर राशि को ग्रहों से कितना सहारा मिलता है।',
    },
    'panchang-decoded': { title: 'आपके पंचांग का अर्थ', kicker: chapter(5) },
    'three-pillars': {
      title: 'व्यक्तित्व के तीन स्तंभ', kicker: chapter(6),
      intro: 'आपका लग्न, आपकी चंद्र राशि और आपका जन्म नक्षत्र मिलकर बताते हैं कि आप संसार से कैसे मिलते हैं, कैसा अनुभव करते हैं और आपको क्या प्रेरित करता है।',
    },
    'planet-profiles-1': {
      title: 'ग्रह परिचय: व्यक्तिगत ग्रह', kicker: chapter(7),
      intro: 'हर ग्रह अपनी स्थिति और दृष्टि के साथ: सूर्य, चंद्र, मंगल और बुध।',
    },
    'planet-profiles-2': {
      title: 'ग्रह परिचय: महान शिक्षक', kicker: chapter(8),
      intro: 'गुरु, शुक्र और शनि अपनी स्थिति और दृष्टि के साथ।',
    },
    'bhavphal-1': {
      title: 'भावफल: पहले से छठा भाव', kicker: chapter(9),
      intro: 'बारह भावों के माध्यम से आपका जीवन। हर विवेचन में भाव की राशि, उसके स्वामी की स्थिति, उसमें बैठे और उस पर दृष्टि डालने वाले ग्रह, तथा उसका अष्टकवर्ग बल साथ रखा गया है।',
    },
    'bhavphal-2': { title: 'भावफल: सातवें से बारहवाँ भाव', kicker: chapter(10) },
    conjunctions: { title: 'जब ऊर्जाएँ मिलती हैं: युतियाँ', kicker: chapter(11) },
    'love-marriage': { title: 'प्रेम और विवाह की झलक', kicker: chapter(12) },
    career: { title: 'आपका कार्यक्षेत्र और जीवन-कर्म', kicker: chapter(13) },
    'chara-karakas': { title: 'चर कारक: आपके उद्देश्य के पीछे के ग्रह', kicker: chapter(14) },
    'rahu-ketu': {
      title: 'राहु और केतु: कर्म का अक्ष', kicker: chapter(15),
      intro: 'दोनों चंद्र पात सदा एक-दूसरे के सामने रहते हैं। राहु दिखाता है कि जीवन आपको कहाँ बढ़ने के लिए खींचता है; केतु दिखाता है कि आप क्या पहले से गहराई से जानते हैं और किसे छोड़ सकते हैं।',
    },
    mangal: { title: 'मंगल और विवाह: मांगलिक का प्रश्न', kicker: chapter(16) },
    'sade-sati': { title: 'आपकी साढ़े साती की यात्रा', kicker: chapter(17) },
    yogas: { title: 'आपकी कुंडली के योग', kicker: chapter(18) },
    doshas: { title: 'दोषों के बारे में एक बात', kicker: chapter(19) },
    'mahadashas-1': {
      title: 'आपकी महादशाएँ: आरंभिक और मध्य वर्ष', kicker: chapter(20),
      intro: 'आपके जीवन की हर महादशा का क्रम से विवेचन, उसकी अंतर्दशाओं को आपकी कुंडली में दिखाते हुए।',
    },
    'mahadashas-2': { title: 'आपकी महादशाएँ: बाद के वर्ष', kicker: chapter(21) },
    numerology: { title: 'अंकशास्त्र की मूल बातें', kicker: chapter(22) },
    spiritual: { title: 'आपकी आध्यात्मिक संभावना', kicker: chapter(23) },
    remedies: { title: 'आपकी कुंडली को बल देने वाले अभ्यास', kicker: chapter(24) },
  },
  topics: {
    'birth-details': { title: 'जन्म विवरण और खगोलीय गणना' },
    avakahada: { title: 'अवकहड़ा चक्र', subtitle: 'वर्ण, वश्य, योनि, गण, नाड़ी और अन्य' },
    'panchang-at-birth': { title: 'जन्म के समय का पंचांग', subtitle: 'आपके जन्म दिवस के पाँच अंग' },
    ghatak: { title: 'घातक चक्र', subtitle: 'एक पारंपरिक पंचांग संदर्भ' },
    'chart-d1-north': { title: 'लग्न कुंडली (D1), उत्तर भारतीय शैली' },
    'chart-d1-south-moon': { title: 'दक्षिण भारतीय कुंडली और चंद्र कुंडली' },
    'chart-d9': { title: 'नवांश कुंडली (D9)', subtitle: 'विवाह, धर्म और भीतरी बल की कुंडली' },
    'planet-positions': { title: 'ग्रहों के अंश और स्थितियाँ' },
    'house-overview': { title: 'बारह भाव एक नज़र में' },
    'aspect-table': { title: 'ग्रह दृष्टि' },
    'varga-charts': { title: 'षोडशवर्ग कुंडलियाँ', subtitle: 'पंद्रह वर्ग कुंडलियाँ और हर एक क्या बताती है' },
    'varga-table': { title: 'षोडशवर्ग तालिका', subtitle: 'हर वर्ग में लग्न और प्रत्येक ग्रह की राशि' },
    'life-timeline': { title: 'ग्रह दशाओं में आपका जीवन' },
    'md-table': { title: 'महादशा तालिका' },
    'ad-table': { title: 'अंतर्दशा तालिका', subtitle: 'हर महादशा की अंतर्दशाएँ' },
    'pd-table': { title: 'प्रत्यंतर्दशा तालिकाएँ', subtitle: 'पूरे जीवन की प्रत्यंतर्दशाएँ' },
    'ashtakavarga-table': { title: 'भिन्नाष्टकवर्ग और सर्वाष्टकवर्ग' },
    'panchang-reading': { title: 'आपके जन्म दिवस के पाँच अंग', subtitle: 'वार, तिथि, नक्षत्र, योग और करण' },
    'pillar-lagna': { title: 'आपका लग्न', subtitle: 'आप संसार से कैसे मिलते हैं' },
    'pillar-moon': { title: 'आपकी चंद्र राशि', subtitle: 'आप कैसा अनुभव करते हैं और आपको क्या पोषण देता है' },
    'pillar-nakshatra': { title: 'आपका जन्म नक्षत्र', subtitle: 'आपके चंद्र का नक्षत्र और उसका चरण' },
    ...Object.fromEntries(Object.entries(PLANET_TOPICS).map(([p, t]) => [`planet-${p}`, t])),
    'bhava-significators': { title: 'हर भाव क्या दर्शाता है' },
    ...Object.fromEntries(HOUSE_TOPICS.map((t, i) => [`house-${i + 1}`, t])),
    'house-lords': { title: 'भावेशों की स्थिति' },
    'conjunction-table': { title: 'एक ही राशि में बैठे ग्रह' },
    'conjunction-reading': { title: 'आपके ग्रह कैसे घुलते-मिलते हैं', subtitle: 'युतियाँ और उनका मेल' },
    'love-heart': { title: 'आपके मन को क्या छूता है', subtitle: 'प्रेम का पाँचवाँ भाव और शुक्र' },
    'love-darakaraka': { title: 'आपका दाराकारक और साथ बढ़ने वाला जीवनसाथी', subtitle: 'सातवाँ भाव और जैमिनी का जीवनसाथी कारक' },
    'marriage-windows': { title: 'विवाह और प्रतिबद्धता के लिए सहायक समय' },
    'career-calling': { title: 'काम, उद्देश्य और कार्यशैली', subtitle: 'सूर्य, शनि, दसवाँ भाव, अमात्यकारक और आपकी जन्म महादशा' },
    'karaka-table': { title: 'आपके सात चर कारक' },
    'karaka-reading': { title: 'अपने कारकों को समझें', subtitle: 'आत्मकारक से दाराकारक तक' },
    'mangal-table': { title: 'मंगल कहाँ स्थित है', subtitle: 'लग्न, चंद्र और शुक्र से गिनकर' },
    'mangal-reading': { title: 'संबंधों में आपका मंगल', subtitle: 'ऊर्जा, दृढ़ता और साझेदारी' },
    'sade-sati-table': { title: 'आपके जीवन के साढ़े साती चक्र' },
    'sade-sati-reading': { title: 'शनि और आपका चंद्र', subtitle: 'तीनों चरण आपसे क्या चाहते हैं' },
    'yoga-table': { title: 'कुंडली में पाए गए योग' },
    'yoga-reading': { title: 'आपके योगों का अर्थ', subtitle: 'ग्रह संयोग और उनमें छिपी संभावना' },
    'dosha-note': { title: 'स्थितियाँ हैं, समस्याएँ नहीं' },
    ...Object.fromEntries(ORDINAL_FEMININE.flatMap((o, i) => [
      [`md-${i + 1}-glance`, { title: `आपके जीवन की ${o} महादशा` }],
      [`md-${i + 1}-reading`, { title: `${o} महादशा को जीना`, subtitle: 'यह अवधि किस पर बल देती है और इसका उपयोग कैसे करें' }],
    ])),
    'numerology-table': { title: 'आपके मुख्य अंक' },
    'numerology-reading': { title: 'मूलांक और भाग्यांक', subtitle: 'आपका स्वभाव अंक और भाग्य अंक' },
    'spiritual-reading': { title: 'जब आत्मा खिलती है', subtitle: 'नौवाँ और बारहवाँ भाव, केतु, गुरु और कारकांश' },
    'practice-table': { title: 'आपके सहायक अभ्यास', subtitle: 'लग्नेश, चंद्र राशि का स्वामी और वर्तमान महादशा का स्वामी' },
    'remedy-reading': { title: 'अपनी कुंडली के साथ तालमेल में जीना', subtitle: 'नैतिक, व्यावहारिक और भक्तिपूर्ण मार्गदर्शन' },
  },
};

// ---------------------------------------------------------------------------
// Block vocabulary
// ---------------------------------------------------------------------------

/** A lookup that returns English unchanged and refuses an untranslated Hindi value. */
const named = (map: Record<string, string>, kind: string) => (lang: ReportLanguage, en: string): string => {
  if (lang === 'en') return en;
  const hi = map[en];
  if (hi === undefined) throw new Error(`HINDI_${kind}_MISSING: "${en}"`);
  return hi;
};

/** Fixed labels of the Kundli blocks (table headings, row labels, notes), keyed by their English text. */
const KUNDLI_LABELS: Record<string, string> = {
  // shared table furniture
  Particular: 'विवरण', Value: 'मान', Lord: 'स्वामी', From: 'से', To: 'तक', Ends: 'समाप्ति', Period: 'दशा', Total: 'कुल',
  Yes: 'हाँ', No: 'नहीं', 'Not available': 'उपलब्ध नहीं', Day: 'वार', Colours: 'रंग', Chart: 'कुंडली', TODAY: 'आज',
  // birth details
  Name: 'नाम', Gender: 'लिंग', 'Date of birth': 'जन्म तिथि', 'Time of birth': 'जन्म समय', 'Place of birth': 'जन्म स्थान',
  'Latitude / Longitude': 'अक्षांश / देशांतर', 'Time zone': 'समय क्षेत्र', 'Birth instant (UTC)': 'जन्म क्षण (UTC)',
  'Local mean time': 'स्थानीय मध्यम समय', 'LMT correction': 'स्थानीय समय संशोधन', 'Ayanamsa (Lahiri)': 'अयनांश (लाहिड़ी)',
  'Weekday (Vedic)': 'वार (वैदिक)', 'Sunrise (day of birth)': 'सूर्योदय (जन्म दिवस)', Sunset: 'सूर्यास्त', 'Day length': 'दिनमान',
  'Ishta kala (sunrise to birth)': 'इष्टकाल (सूर्योदय से जन्म तक)', 'Ascendant lord': 'लग्नेश', 'Moon sign (Rashi)': 'चंद्र राशि',
  'Moon-sign lord': 'चंद्र राशि का स्वामी', 'Birth nakshatra / pada': 'जन्म नक्षत्र / चरण', 'Nakshatra lord': 'नक्षत्र स्वामी',
  'Sun sign (sidereal)': 'सूर्य राशि (निरयण)', 'Sun sign (Western, tropical)': 'सूर्य राशि (पाश्चात्य, सायन)', Ayana: 'अयन', Gola: 'गोल',
  'Ritu (season)': 'ऋतु', 'Vikram / Shaka Samvat': 'विक्रम / शक संवत्', 'Not stated': 'उल्लेख नहीं', 'Not given': 'उपलब्ध नहीं',
  Male: 'पुरुष', Female: 'महिला', Other: 'अन्य', min: 'मिनट', h: 'घंटे', N: 'उ', S: 'द', E: 'पू', W: 'प',
  'Positions: sidereal zodiac, Lahiri ayanamsa, Whole Sign houses, mean nodes. The Vedic weekday runs from sunrise to sunrise, so a birth before sunrise belongs to the previous weekday. Local mean time = UTC + longitude x 4 min. Ayana and gola use the tropical Sun; ritu follows the amanta lunar month; Samvat years are Chaitradi.':
    'स्थितियाँ: निरयण राशिचक्र, लाहिड़ी अयनांश, पूर्ण-राशि भाव, मध्यम राहु-केतु। वैदिक वार सूर्योदय से सूर्योदय तक चलता है, इसलिए सूर्योदय से पहले का जन्म पिछले वार में गिना जाता है। स्थानीय मध्यम समय = UTC + देशांतर × 4 मिनट। अयन और गोल सायन सूर्य से लिए गए हैं; ऋतु अमांत चंद्र मास के अनुसार है; संवत् वर्ष चैत्रादि हैं।',
  // Avakahada
  Varna: 'वर्ण', Vashya: 'वश्य', Yoni: 'योनि', Gana: 'गण', Nadi: 'नाड़ी', 'Tatwa (element)': 'तत्व', 'Paya (by Moon house)': 'पाया (चंद्र के भाव से)',
  Yunja: 'युंजा', Hansaka: 'हंसक', 'Name syllable (namakshara)': 'नामाक्षर', 'Rashi / lord': 'राशि / स्वामी', 'Nakshatra / lord': 'नक्षत्र / स्वामी',
  'Avakahada Chakra from the Moon\'s sign, nakshatra and pada (classical tables used in matching and naming); Paya is counted from the Moon\'s house from the Ascendant.':
    'अवकहड़ा चक्र चंद्र की राशि, नक्षत्र और चरण से (मिलान और नामकरण में प्रयुक्त शास्त्रीय सारणियाँ); पाया लग्न से चंद्र के भाव के अनुसार गिना जाता है।',
  // Panchang
  'Vara (weekday)': 'वार', 'Civil weekday': 'कैलेंडर का वार', 'Tithi at birth': 'जन्म के समय तिथि', 'Tithi at sunrise': 'सूर्योदय के समय तिथि',
  'Nakshatra at birth': 'जन्म के समय नक्षत्र', 'Nakshatra at sunrise': 'सूर्योदय के समय नक्षत्र', 'Yoga at birth': 'जन्म के समय योग',
  'Yoga at sunrise': 'सूर्योदय के समय योग', 'Karana at birth': 'जन्म के समय करण', 'Karana at sunrise': 'सूर्योदय के समय करण', Paksha: 'पक्ष',
  'Lunar month': 'चंद्र मास', 'Bhayat / Bhabhog': 'भयात / भभोग', 'Balance of dasha at birth': 'जन्म के समय दशा शेष',
  Shukla: 'शुक्ल', Krishna: 'कृष्ण', waxing: 'बढ़ता', waning: 'घटता',
  // Ghatak
  'Month (masa)': 'मास', 'Tithi group': 'तिथि वर्ग', Weekday: 'वार', Nakshatra: 'नक्षत्र', 'Prahar (watch of the day)': 'प्रहर (दिन का पहर)', Lagna: 'लग्न',
  'How to use this table': 'इस तालिका का उपयोग कैसे करें',
  'The Ghatak Chakra is a traditional almanac reference keyed to your Moon sign. Some families consult it when choosing dates for important beginnings. It describes no event in your life and carries no warning; Astro Sushil does not treat any day, star or month as unlucky for you.':
    'घातक चक्र आपकी चंद्र राशि पर आधारित एक पारंपरिक पंचांग संदर्भ है। कुछ परिवार महत्वपूर्ण शुभारंभ की तिथि चुनते समय इसे देखते हैं। यह आपके जीवन की किसी घटना का वर्णन नहीं करता और इसमें कोई चेतावनी नहीं है; एस्ट्रो सुशील किसी भी दिन, नक्षत्र या मास को आपके लिए अशुभ नहीं मानते।',
  // charts
  'SOUTH INDIAN STYLE (D1)': 'दक्षिण भारतीय शैली (D1)', 'MOON CHART (CHANDRA LAGNA)': 'चंद्र कुंडली (चंद्र लग्न)', Rasi: 'राशि',
  'South Indian chart: signs are fixed (Aries is the second box of the top row, counting clockwise); the diagonal stroke in the top-right corner of a box marks the Ascendant sign. The Moon chart treats the Moon\'s sign as the 1st house. R = retrograde (Rahu and Ketu always move backwards and are not marked).':
    'दक्षिण भारतीय कुंडली: राशियाँ स्थिर रहती हैं (मेष ऊपर की पंक्ति का दूसरा खाना है, आगे घड़ी की दिशा में गिनें); खाने के ऊपरी दाएँ कोने की तिरछी रेखा लग्न राशि दिखाती है। चंद्र कुंडली में चंद्र की राशि को 1ला भाव माना जाता है। व = वक्री (राहु और केतु सदा उलटी चाल चलते हैं, इसलिए उन पर चिह्न नहीं लगाया गया)।',
  'Each divisional chart (varga) re-divides every sign by the number shown (D9 = nine parts) using the Brihat Parashara Hora Shastra rules in the divisional-chart engine. North Indian style; numbers are signs, the top diamond is the varga ascendant (As).':
    'हर वर्ग कुंडली प्रत्येक राशि को दिखाई गई संख्या में बाँटती है (D9 = नौ भाग); नियम बृहत् पाराशर होरा शास्त्र के हैं, जैसे वे वर्ग-कुंडली इंजन में लागू हैं। उत्तर भारतीय शैली; अंक राशियाँ हैं, ऊपर का बीच वाला खाना वर्ग लग्न (ल) है।',
  'Sign occupied by the Ascendant and each planet in every divisional chart (Shodashavarga set computed by the engine).':
    'हर वर्ग कुंडली में लग्न और प्रत्येक ग्रह की राशि (गणना-इंजन द्वारा निकाला गया षोडशवर्ग)।',
  'Lord placed in': 'स्वामी की स्थिति', Occupants: 'स्थित ग्रह', 'Aspected by': 'दृष्टि डालने वाले ग्रह', SAV: 'बिंदु',
  'Whole Sign houses. Aspects are graha drishti: every planet aspects the 7th from itself; Mars also the 4th and 8th, Jupiter the 5th and 9th, Saturn the 3rd and 10th, and Rahu and Ketu the 5th and 9th (engine convention). SAV = Sarvashtakavarga bindus of the sign.':
    'पूर्ण-राशि भाव। दृष्टि ग्रह दृष्टि है: हर ग्रह अपने से 7वें भाव को देखता है; मंगल 4थे और 8वें को भी, गुरु 5वें और 9वें को, शनि 3रे और 10वें को, तथा राहु और केतु 5वें और 9वें को (इंजन की परिपाटी)। बिंदु = राशि के सर्वाष्टकवर्ग बिंदु।',
  'Aspects houses': 'इन भावों पर दृष्टि', 'Signs aspected': 'दृष्ट राशियाँ', 'Planets aspected': 'दृष्ट ग्रह',
  'Graha drishti by whole signs (Parashari). Special aspects: Mars 4th and 8th, Jupiter 5th and 9th, Saturn 3rd and 10th, Rahu and Ketu 5th and 9th, in addition to the 7th for all.':
    'पूर्ण राशियों से ग्रह दृष्टि (पाराशरी)। विशेष दृष्टियाँ: मंगल की 4थी और 8वीं, गुरु की 5वीं और 9वीं, शनि की 3री और 10वीं, राहु और केतु की 5वीं और 9वीं; 7वीं दृष्टि सभी की होती है।',
  // dasha
  Mahadasha: 'महादशा', MAHADASHA: 'महादशा', Begins: 'आरंभ', Length: 'अवधि', Ages: 'आयु', ages: 'आयु', Antardasha: 'अंतर्दशा', Months: 'माह',
  'Its lord sits in': 'अंतर्दशा स्वामी की स्थिति', 'Natural tie': 'नैसर्गिक संबंध', Completed: 'पूर्ण हो चुकी', 'Running now': 'अभी चल रही है', Ahead: 'आगे आने वाली',
  itself: 'स्वयं', Friend: 'मित्र', Neutral: 'सम', Enemy: 'शत्रु', y: 'वर्ष', m: 'माह', d: 'दिन',
  'Vimshottari Mahadashas from birth, drawn to scale; the gold line marks the report date.':
    'जन्म से विंशोत्तरी महादशाएँ, समय के अनुपात में; सुनहरी रेखा रिपोर्ट की तिथि दिखाती है।',
  'Vimshottari dasha (120-year cycle) from the Moon\'s nakshatra, year = 365.2425 days; the first period is shortened by the portion already elapsed before birth. The highlighted row is current on the report date.':
    'चंद्र के नक्षत्र से विंशोत्तरी दशा (120 वर्ष का चक्र), वर्ष = 365.2425 दिन; पहली दशा उतनी छोटी है जितना भाग जन्म से पहले बीत चुका था। रंगीन पंक्ति रिपोर्ट की तिथि पर चल रही दशा है।',
  'Antardashas (sub-periods) of every Mahadasha, dates dd-mm-yyyy. Sub-periods before birth are omitted. The highlighted row is current on the report date.':
    'हर महादशा की अंतर्दशाएँ; तिथियाँ दिन-माह-वर्ष के क्रम में हैं। जन्म से पहले की अंतर्दशाएँ नहीं दी गई हैं। रंगीन पंक्ति रिपोर्ट की तिथि पर चल रही अंतर्दशा है।',
  'Pratyantardashas (sub-sub-periods) for every Mahadasha and Antardasha of life; each list shows the date on which the period ends (dd-mm-yyyy), beginning from the date in its heading.':
    'जीवन की हर महादशा और अंतर्दशा की प्रत्यंतर्दशाएँ; हर सूची में वह तिथि दी गई है जिस दिन प्रत्यंतर्दशा समाप्त होती है (दिन-माह-वर्ष), और आरंभ शीर्षक में दी गई तिथि से होता है।',
  // ashtakavarga and bhavas
  'Bhava': 'भाव का नाम', 'What it governs': 'क्या दर्शाता है', 'Your sign': 'आपकी राशि',
  'Classical bhava significations (Brihat Parashara Hora Shastra, ch. 11), summarised; signs by Whole Sign houses from your Ascendant.':
    'शास्त्रीय भाव कारकत्व (बृहत् पाराशर होरा शास्त्र, अध्याय 11), संक्षेप में; राशियाँ आपके लग्न से पूर्ण-राशि भाव के अनुसार हैं।',
  'House lord': 'भावेश', 'Placed in': 'स्थित भाव', 'Type of house reached': 'पहुँचे भाव का प्रकार', 'From own house': 'अपने भाव से',
  kendra: 'केंद्र', trikona: 'त्रिकोण', dusthana: 'त्रिक', upachaya: 'उपचय',
  'Bhava-lord placement (bhavesha phala): where the lord of each house sits. Kendra = 1/4/7/10, trikona = 1/5/9, dusthana = 6/8/12, upachaya = 3/6/10/11. The last column counts the lord\'s house from the house it rules.':
    'भावेश फल: हर भाव का स्वामी कहाँ बैठा है। केंद्र = 1/4/7/10, त्रिकोण = 1/5/9, त्रिक = 6/8/12, उपचय = 3/6/10/11। अंतिम स्तंभ स्वामी के भाव को उसके अपने भाव से गिनकर बताता है।',
  // conjunctions
  'No conjunctions': 'कोई युति नहीं',
  'No two planets share a sign in your birth chart, so each planet works through its own house without blending directly with another.':
    'आपकी जन्म कुंडली में कोई भी दो ग्रह एक राशि में नहीं हैं, इसलिए हर ग्रह किसी दूसरे से सीधे मिले बिना अपने ही भाव के माध्यम से काम करता है।',
  'A conjunction (yuti) is two or more planets in the same sign.': 'युति का अर्थ है एक ही राशि में दो या अधिक ग्रह।',
  'Planets and degrees': 'ग्रह और अंश', Spread: 'फैलाव', 'Closest pair': 'सबसे निकट जोड़ी',
  'A conjunction (yuti) is two or more planets in the same sign; the closer their degrees, the more their themes blend.':
    'युति का अर्थ है एक ही राशि में दो या अधिक ग्रह; उनके अंश जितने निकट हों, उनके विषय उतने ही घुलते-मिलते हैं।',
  // karakas
  Karaka: 'कारक', 'Degree in sign': 'राशि में अंश', 'House, sign': 'भाव, राशि', 'What it signifies': 'क्या दर्शाता है',
  Atmakaraka: 'आत्मकारक', Amatyakaraka: 'अमात्यकारक', Bhratrikaraka: 'भ्रातृकारक', Matrikaraka: 'मातृकारक', Putrakaraka: 'पुत्रकारक',
  Gnatikaraka: 'ज्ञातिकारक', Darakaraka: 'दाराकारक',
  'The soul\'s central lesson and desire': 'आत्मा की मुख्य सीख और इच्छा',
  'Career, counsel and the means of achievement': 'कार्यक्षेत्र, परामर्श और उपलब्धि के साधन',
  'Siblings, courage, guides and mentors': 'भाई-बहन, साहस, मार्गदर्शक और गुरुजन',
  'Mother, nurturing, emotional foundations': 'माता, पालन-पोषण, भावनात्मक नींव',
  'Children, creativity, students and disciples': 'संतान, रचनात्मकता, विद्यार्थी और शिष्य',
  'Rivals, obstacles, health discipline': 'प्रतिद्वंद्वी, बाधाएँ, स्वास्थ्य का अनुशासन',
  'Spouse and close partnerships': 'जीवनसाथी और निकट साझेदारियाँ',
  'Jaimini chara (variable) karakas, seven-karaka scheme: the seven planets from the Sun to Saturn are ranked by degree within their sign, highest first (D-005).':
    'जैमिनी चर कारक, सात कारकों की पद्धति: सूर्य से शनि तक सातों ग्रहों को उनकी राशि के भीतर के अंशों के अनुसार क्रम दिया जाता है, सबसे अधिक अंश वाला पहले (D-005)।',
  // Mangal
  'From the Ascendant': 'लग्न से', 'From the Moon': 'चंद्र से', 'From Venus': 'शुक्र से',
  'Reference point': 'संदर्भ बिंदु', 'Mars counted from it': 'वहाँ से गिनने पर मंगल का भाव', 'In a classical Mangal house?': 'शास्त्रीय मंगल भाव में?',
  'None of the listed classical exceptions applies.': 'सूचीबद्ध शास्त्रीय अपवादों में से कोई लागू नहीं होता।',
  'Our view': 'हमारा दृष्टिकोण',
  'Astro Sushil does not treat Mangal placement as a dosha or a defect. Mars in these houses describes energy, drive and directness that a relationship benefits from channelling well. It is never a reason to fear, delay or reject a marriage, and no ritual or purchase is needed.':
    'एस्ट्रो सुशील मंगल की स्थिति को दोष या कमी नहीं मानते। इन भावों में मंगल ऊर्जा, उत्साह और स्पष्टवादिता दिखाता है, जिसे सही दिशा देने से संबंध को लाभ ही होता है। यह विवाह से डरने, उसे टालने या ठुकराने का कारण कभी नहीं है, और इसके लिए किसी अनुष्ठान या खरीदारी की आवश्यकता नहीं है।',
  'Mars counted in whole signs from the Ascendant, the Moon and Venus; classical Mangal houses 1, 4, 7, 8 and 12 (engine convention; the 2nd house is not included). Exceptions are the engine\'s classical list: Mars in its own or exaltation sign in specific houses, and Jupiter joining or aspecting Mars. No severity grade is given.':
    'मंगल को लग्न, चंद्र और शुक्र से पूर्ण राशियों में गिना गया है; शास्त्रीय मंगल भाव 1, 4, 7, 8 और 12 हैं (इंजन की परिपाटी; 2रा भाव शामिल नहीं है)। अपवाद इंजन की शास्त्रीय सूची से हैं: विशेष भावों में स्वराशि या उच्च राशि का मंगल, तथा गुरु की मंगल से युति या उस पर दृष्टि। कोई तीव्रता श्रेणी नहीं दी गई है।',
  // Sade Sati
  Cycle: 'चक्र', Phase: 'चरण', 'Saturn in': 'शनि की राशि',
  '1st phase (12th from Moon)': '1ला चरण (चंद्र से 12वीं राशि)', '2nd phase (over the Moon)': '2रा चरण (चंद्र राशि पर)', '3rd phase (2nd from Moon)': '3रा चरण (चंद्र से 2री राशि)',
  'Saturn\'s real sign ingresses (engine transit solver, Lahiri) over 100 years from birth. Dates are the first entry into and final exit from each sign, so retrograde back-and-forth movement is included in the span. The highlighted row is current on the report date.':
    'जन्म से 100 वर्षों तक शनि के वास्तविक राशि प्रवेश (इंजन का गोचर गणक, लाहिड़ी)। तिथियाँ हर राशि में पहले प्रवेश और अंतिम निकास की हैं, इसलिए वक्री होकर आगे-पीछे होने की अवधि भी इसमें शामिल है। रंगीन पंक्ति रिपोर्ट की तिथि पर चल रहा चरण है।',
  // yogas
  'No named yoga detected': 'कोई नामित योग नहीं मिला',
  'None of the classical combinations in the engine\'s catalogue is formed in your chart. Yogas are only one layer of a chart; the placements, dashas and houses in this report describe your potential in full.':
    'इंजन की सूची के शास्त्रीय योगों में से कोई भी आपकी कुंडली में नहीं बनता। योग कुंडली की केवल एक परत हैं; इस रिपोर्ट में दी गई ग्रह स्थितियाँ, दशाएँ और भाव आपकी संभावनाओं का पूरा चित्र देते हैं।',
  'Yogas evaluated by the engine\'s rule catalogue (about 60 classical combinations).': 'योगों की जाँच इंजन की नियम-सूची से की गई है (लगभग 60 शास्त्रीय योग)।',
  Yoga: 'योग', Family: 'प्रकार', 'Conditions met in your chart': 'योग बनाने वाले ग्रह (भाव, राशि)',
  'Only combinations detected by the engine\'s rule catalogue are listed, each with the conditions it verified. Nothing is added by hand.':
    'केवल वही योग दिए गए हैं जो इंजन की नियम-सूची से आपकी कुंडली में पाए गए; हर योग के साथ उसे बनाने वाले ग्रह, उनके भाव और राशियाँ दी गई हैं। हाथ से कुछ नहीं जोड़ा गया है।',
  // patterns
  'Mars in a classical Mangal house': 'शास्त्रीय मंगल भाव में मंगल',
  'All seven planets on one side of the Rahu-Ketu axis': 'सातों ग्रह राहु-केतु अक्ष के एक ही ओर',
  'Sade Sati on the report date': 'रिपोर्ट की तिथि पर साढ़े साती', 'Not active': 'नहीं चल रही',
  rising: 'आरंभिक', peak: 'मध्य', setting: 'अंतिम',
  'We do not believe in doshas': 'हम दोषों में विश्वास नहीं करते',
  'Many almanacs label certain placements as doshas, or faults. Astro Sushil does not. A planet\'s position describes a tendency and a field of growth, never a curse or a fixed misfortune, and nothing needs to be bought or performed to correct it. The patterns that are commonly asked about are listed below as plain facts so that you never have to wonder about them.':
    'कई पंचांग कुछ ग्रह स्थितियों को दोष, यानी कमी, कह देते हैं। एस्ट्रो सुशील ऐसा नहीं मानते। ग्रह की स्थिति एक प्रवृत्ति और विकास का क्षेत्र बताती है, कोई श्राप या अटल दुर्भाग्य नहीं, और उसे ठीक करने के लिए कुछ भी खरीदने या करवाने की आवश्यकता नहीं है। जिन स्थितियों के बारे में लोग अक्सर पूछते हैं, उन्हें नीचे सीधे तथ्यों के रूप में दिया गया है ताकि आपके मन में उनके बारे में कोई संशय न रहे।',
  'Pattern people ask about': 'जिस स्थिति के बारे में लोग पूछते हैं', 'In your chart': 'आपकी कुंडली में',
  'Mangal houses from the Ascendant, Moon and Venus (engine); the Rahu-Ketu pattern checks whether the Sun, Moon, Mars, Mercury, Jupiter, Venus and Saturn all fall within one 180° half bounded by the nodes; Sade Sati from Saturn\'s real transits.':
    'मंगल भाव लग्न, चंद्र और शुक्र से (इंजन); राहु-केतु वाली स्थिति में यह देखा जाता है कि सूर्य, चंद्र, मंगल, बुध, गुरु, शुक्र और शनि सभी राहु-केतु से घिरे 180° के एक ही अर्धभाग में हैं या नहीं; साढ़े साती शनि के वास्तविक गोचर से।',
  // practices and numerology
  'Traditional beej mantra': 'पारंपरिक बीज मंत्र', 'Service and daily practice': 'सेवा और दैनिक अभ्यास',
  'Nothing to buy': 'कुछ भी खरीदना नहीं है',
  'These practices cost nothing. Choose one or two that feel natural and keep them steadily; consistency matters more than quantity. No gemstone, yantra, rudraksha or paid ritual is needed, and none is recommended in this report.':
    'इन अभ्यासों में कोई खर्च नहीं है। जो एक-दो आपको सहज लगें उन्हें चुनें और नियमित रूप से निभाएँ; मात्रा से अधिक निरंतरता का महत्व है। किसी रत्न, यंत्र, रुद्राक्ष या सशुल्क अनुष्ठान की आवश्यकता नहीं है, और इस रिपोर्ट में ऐसा कुछ भी सुझाया नहीं गया है।',
  'Classical practice strengthens the Ascendant lord, the Moon-sign lord and the running Mahadasha lord. Weekday, colour and beej mantra are the standard associations of each planet; service is drawn from what the planet signifies (its karakatva).':
    'शास्त्रीय परंपरा में लग्नेश, चंद्र राशि के स्वामी और चल रही महादशा के स्वामी को बल दिया जाता है। वार, रंग और बीज मंत्र हर ग्रह के प्रचलित संबंध हैं; सेवा उस ग्रह के कारकत्व से ली गई है।',
  'Mulank (driver number)': 'मूलांक', 'Bhagyank (destiny number)': 'भाग्यांक', Number: 'अंक', 'Ruling planet': 'स्वामी ग्रह',
  'Mulank = digit sum of the day of birth; Bhagyank = digit sum of the full date of birth, each reduced to 1-9 (D-002). Ruling planets: 1 Sun, 2 Moon, 3 Jupiter, 4 Rahu, 5 Mercury, 6 Venus, 7 Ketu, 8 Saturn, 9 Mars.':
    'मूलांक = जन्म दिन के अंकों का योग; भाग्यांक = पूरी जन्म तिथि के अंकों का योग, दोनों को 1-9 तक घटाया गया है (D-002)। स्वामी ग्रह: 1 सूर्य, 2 चंद्र, 3 गुरु, 4 राहु, 5 बुध, 6 शुक्र, 7 केतु, 8 शनि, 9 मंगल।',
};

/**
 * A fixed Kundli label in the report language. Looks in the Kundli vocabulary first and then in
 * the shared glossary (Planet, Sign, House, Dignity…); an untranslated label is an error, never English.
 */
export function kl(lang: ReportLanguage, en: string): string {
  if (lang === 'en') return en;
  return KUNDLI_LABELS[en] ?? label(lang, en);
}

// --- Numbers in running Hindi ------------------------------------------------

const ORD_SUFFIX: Record<'m' | 'obl' | 'f', Record<number, string>> = {
  m: { 1: 'ला', 2: 'रा', 3: 'रा', 4: 'था', 6: 'ठा' },
  obl: { 1: 'ले', 2: 'रे', 3: 'रे', 4: 'थे', 6: 'ठे' },
  f: { 1: 'ली', 2: 'री', 3: 'री', 4: 'थी', 6: 'ठी' },
};
const ORD_DEFAULT = { m: 'वाँ', obl: 'वें', f: 'वीं' };

/** Hindi ordinal written with its digit (4था, 4थे, 4थी; 7वाँ, 7वें, 7वीं), so the number stays visible and checkable. */
export function ordHi(n: number, form: 'm' | 'obl' | 'f' = 'm'): string {
  return `${n}${ORD_SUFFIX[form][n] ?? ORD_DEFAULT[form]}`;
}

/** "a, b and c" in the report language. */
export function listIn(lang: ReportLanguage, xs: string[]): string {
  if (xs.length <= 1) return xs.join('');
  return `${xs.slice(0, -1).join(', ')} ${pick(lang, 'and', 'और')} ${xs[xs.length - 1]}`;
}

// --- Dates --------------------------------------------------------------------

const MONTH_HI: Record<string, string> = {
  Jan: 'जनवरी', Feb: 'फरवरी', Mar: 'मार्च', Apr: 'अप्रैल', May: 'मई', Jun: 'जून', Jul: 'जुलाई', Aug: 'अगस्त',
  Sep: 'सितंबर', Sept: 'सितंबर', Oct: 'अक्टूबर', Nov: 'नवंबर', Dec: 'दिसंबर',
};

/** Replaces the English month abbreviation of an already formatted date ("08 Jun 2004") by the Hindi month. */
function hindiMonth(formatted: string): string {
  return formatted.replace(/[A-Za-z]+/g, (m) => {
    const hi = MONTH_HI[m];
    if (hi === undefined) throw new Error(`HINDI_MONTH_MISSING: "${m}"`);
    return hi;
  });
}

/** `formatDate` in the report language: same day and year, Hindi month name. */
export const dateIn = (lang: ReportLanguage, iso: string): string => (lang === 'hi' ? hindiMonth(formatDate(iso)) : formatDate(iso));

/** `localDateTime` in the report language. */
export const dateTimeIn = (lang: ReportLanguage, iso: string, timeZone: string): string =>
  lang === 'hi' ? hindiMonth(localDateTime(iso, timeZone)) : localDateTime(iso, timeZone);

// --- Engine values -------------------------------------------------------------

const WEEKDAY_HI: Record<string, string> = {
  Sunday: 'रविवार', Monday: 'सोमवार', Tuesday: 'मंगलवार', Wednesday: 'बुधवार', Thursday: 'गुरुवार', Friday: 'शुक्रवार', Saturday: 'शनिवार',
};
export const weekdayIn = named(WEEKDAY_HI, 'WEEKDAY');

const TITHI_HI: Record<string, string> = {
  Pratipada: 'प्रतिपदा', Dwitiya: 'द्वितीया', Tritiya: 'तृतीया', Chaturthi: 'चतुर्थी', Panchami: 'पंचमी', Shashthi: 'षष्ठी', Saptami: 'सप्तमी',
  Ashtami: 'अष्टमी', Navami: 'नवमी', Dashami: 'दशमी', Ekadashi: 'एकादशी', Dwadashi: 'द्वादशी', Trayodashi: 'त्रयोदशी', Chaturdashi: 'चतुर्दशी',
  Purnima: 'पूर्णिमा', Amavasya: 'अमावस्या',
};
export const tithiIn = named(TITHI_HI, 'TITHI');

/** The 27 panchang (nitya) yogas, keyed by the engine's spelling. */
const NITYA_YOGA_HI: Record<string, string> = {
  Vishkambha: 'विष्कंभ', Priti: 'प्रीति', Ayushman: 'आयुष्मान', Saubhagya: 'सौभाग्य', Shobhana: 'शोभन', Atiganda: 'अतिगंड', Sukarma: 'सुकर्मा',
  Dhriti: 'धृति', Shoola: 'शूल', Ganda: 'गंड', Vriddhi: 'वृद्धि', Dhruva: 'ध्रुव', Vyaghata: 'व्याघात', Harshana: 'हर्षण', Vajra: 'वज्र',
  Siddhi: 'सिद्धि', Vyatipata: 'व्यतीपात', Variyan: 'वरीयान', Parigha: 'परिघ', Shiva: 'शिव', Siddha: 'सिद्ध', Sadhya: 'साध्य', Shubha: 'शुभ',
  Shukla: 'शुक्ल', Brahma: 'ब्रह्म', Indra: 'इंद्र', Vaidhriti: 'वैधृति',
};
export const nityaYogaIn = named(NITYA_YOGA_HI, 'NITYA_YOGA');

const KARANA_HI: Record<string, string> = {
  Bava: 'बव', Balava: 'बालव', Kaulava: 'कौलव', Taitila: 'तैतिल', Gara: 'गर', Vanija: 'वणिज', Vishti: 'विष्टि',
  Kimstughna: 'किंस्तुघ्न', Shakuni: 'शकुनि', Chatushpada: 'चतुष्पद', Naga: 'नाग',
};
export const karanaIn = named(KARANA_HI, 'KARANA');

/** Lunar months, keyed by the engine's spelling (several share a name with a nakshatra, hence their own table). */
const MASA_HI: Record<string, string> = {
  Chaitra: 'चैत्र', Vaisakha: 'वैशाख', Jyeshtha: 'ज्येष्ठ', Ashadha: 'आषाढ़', Shravana: 'श्रावण', Bhadrapada: 'भाद्रपद', Ashvina: 'आश्विन',
  Kartika: 'कार्तिक', Margashirsha: 'मार्गशीर्ष', Pausha: 'पौष', Magha: 'माघ', Phalguna: 'फाल्गुन',
};
export const masaIn = (lang: ReportLanguage, en: string): string => (en === '' ? '' : named(MASA_HI, 'MASA')(lang, en));

/** Seasons, ayana and gola as computed in calc/vedic-day.ts. */
const SKY_HI: Record<string, string> = {
  'Vasanta (spring)': 'वसंत', 'Grishma (summer)': 'ग्रीष्म', 'Varsha (monsoon)': 'वर्षा', 'Sharad (autumn)': 'शरद',
  'Hemanta (pre-winter)': 'हेमंत', 'Shishira (winter)': 'शिशिर', '—': '—',
  'Uttarayana (northward)': 'उत्तरायण', 'Dakshinayana (southward)': 'दक्षिणायन',
  'Uttara Gola (north)': 'उत्तर गोल', 'Dakshina Gola (south)': 'दक्षिण गोल',
};
export const skyTermIn = named(SKY_HI, 'SKY_TERM');

/** Avakahada Chakra values, keyed by the engine's spelling (astrology-engine/src/panchang/avakhada-chakra.ts). */
const AVAKAHADA_HI: Record<string, string> = {
  Brahmin: 'ब्राह्मण', Kshatriya: 'क्षत्रिय', Vaishya: 'वैश्य', Shudra: 'शूद्र',
  Chatushpada: 'चतुष्पद', Manava: 'मानव', Jalachara: 'जलचर', Vanachara: 'वनचर', Keeta: 'कीट',
  'Ashwa (Horse)': 'अश्व (घोड़ा)', 'Gaja (Elephant)': 'गज (हाथी)', 'Mesha (Sheep)': 'मेष (भेड़)', 'Sarpa (Serpent)': 'सर्प (साँप)',
  'Shwana (Dog)': 'श्वान (कुत्ता)', 'Marjara (Cat)': 'मार्जार (बिल्ली)', 'Mushaka (Rat)': 'मूषक (चूहा)', 'Gau (Cow)': 'गौ (गाय)',
  'Mahisha (Buffalo)': 'महिष (भैंस)', 'Vyaghra (Tiger)': 'व्याघ्र (बाघ)', 'Mriga (Deer)': 'मृग (हिरण)', 'Vanara (Monkey)': 'वानर (बंदर)',
  'Nakula (Mongoose)': 'नकुल (नेवला)', 'Simha (Lion)': 'सिंह (शेर)', Ashwa: 'अश्व',
  male: 'नर', female: 'मादा',
  Deva: 'देव', Manushya: 'मनुष्य', Rakshasa: 'राक्षस',
  Adi: 'आदि', Madhya: 'मध्य', Antya: 'अंत्य',
  Agni: 'अग्नि', Prithvi: 'पृथ्वी', Vayu: 'वायु', Jala: 'जल',
  'Swarna (Gold)': 'स्वर्ण (सोना)', 'Rajata (Silver)': 'रजत (चाँदी)', 'Tamra (Copper)': 'ताम्र (ताँबा)', 'Loha (Iron)': 'लौह (लोहा)',
  Purva: 'पूर्व', Uttara: 'उत्तर',
  Bhoomi: 'भूमि', Varun: 'वरुण',
};
export const avakahadaIn = named(AVAKAHADA_HI, 'AVAKAHADA');

/** Sanskrit sign names as the engine prints them in the Avakahada report (zodiac/rashi.ts `sanskritName`). */
const SANSKRIT_SIGN_HI: Record<string, string> = {
  Mesha: 'मेष', Vrishabha: 'वृषभ', Mithuna: 'मिथुन', Karka: 'कर्क', Simha: 'सिंह', Kanya: 'कन्या', Tula: 'तुला', Vrischika: 'वृश्चिक',
  Vrishchika: 'वृश्चिक', Dhanu: 'धनु', Makara: 'मकर', Kumbha: 'कुंभ', Meena: 'मीन',
};
export const sanskritSignIn = named(SANSKRIT_SIGN_HI, 'SANSKRIT_SIGN');

/**
 * Name syllables (namakshara) of each nakshatra pada in Devanagari: a letter-for-letter rendering
 * of the engine's NAKSHATRA_NAMAKSHARAS table, keyed by nakshatra because the Latin spelling is
 * ambiguous (Ta = टा in Purva Phalguni, ता in Swati).
 */
const NAMAKSHARA_HI: Record<string, [string, string, string, string]> = {
  Ashwini: ['चू', 'चे', 'चो', 'ला'], Bharani: ['ली', 'लू', 'ले', 'लो'], Krittika: ['अ', 'ई', 'उ', 'ए'], Rohini: ['ओ', 'वा', 'वी', 'वू'],
  Mrigashira: ['वे', 'वो', 'का', 'की'], Ardra: ['कू', 'घ', 'ङ', 'छ'], Punarvasu: ['के', 'को', 'हा', 'ही'], Pushya: ['हू', 'हे', 'हो', 'डा'],
  Ashlesha: ['डी', 'डू', 'डे', 'डो'], Magha: ['मा', 'मी', 'मू', 'मे'], 'Purva Phalguni': ['मो', 'टा', 'टी', 'टू'],
  'Uttara Phalguni': ['टे', 'टो', 'पा', 'पी'], Hasta: ['पू', 'ष', 'ण', 'ठ'], Chitra: ['पे', 'पो', 'रा', 'री'], Swati: ['रू', 'रे', 'रो', 'ता'],
  Vishakha: ['ती', 'तू', 'ते', 'तो'], Anuradha: ['ना', 'नी', 'नू', 'ने'], Jyeshtha: ['नो', 'या', 'यी', 'यू'], Mula: ['ये', 'यो', 'भा', 'भी'],
  'Purva Ashadha': ['भू', 'धा', 'फा', 'ढा'], 'Uttara Ashadha': ['भे', 'भो', 'जा', 'जी'], Shravana: ['खी', 'खू', 'खे', 'खो'],
  Dhanishta: ['गा', 'गी', 'गू', 'गे'], Shatabhisha: ['गो', 'सा', 'सी', 'सू'], 'Purva Bhadrapada': ['से', 'सो', 'दा', 'दी'],
  'Uttara Bhadrapada': ['दू', 'थ', 'झ', 'ञ'], Revati: ['दे', 'दो', 'चा', 'ची'],
};

export function namaksharaIn(lang: ReportLanguage, syllable: string, nakshatra: string, pada: number): string {
  if (lang === 'en') return syllable;
  const hi = NAMAKSHARA_HI[nakshatra]?.[pada - 1];
  if (hi === undefined) throw new Error(`HINDI_NAMAKSHARA_MISSING: "${nakshatra}" pada ${pada}`);
  return hi;
}

/** Ghatak tithi groups, e.g. "1, 6, 11 (Nanda)". */
const TITHI_GROUP_HI: Record<string, string> = { Nanda: 'नंदा', Bhadra: 'भद्रा', Jaya: 'जया', Rikta: 'रिक्ता', Purna: 'पूर्णा' };

export function tithiGroupIn(lang: ReportLanguage, en: string): string {
  if (lang === 'en') return en;
  return en.replace(/[A-Za-z]+/g, (w) => {
    const hi = TITHI_GROUP_HI[w];
    if (hi === undefined) throw new Error(`HINDI_TITHI_GROUP_MISSING: "${w}"`);
    return hi;
  });
}

/** The English word inside the brackets of an engine value such as "Ravivara (Sunday)" or "Mesha (Aries)". */
export function bracketed(value: string): string {
  const m = /\(([^)]+)\)/.exec(value);
  if (!m) throw new Error(`BLOCK_DATA_MISSING: no bracketed name in "${value}"`);
  return m[1];
}

// --- Chart vocabulary ------------------------------------------------------------

/** Names and purposes of the divisional charts, keyed by their English text in blocks/charts.ts. */
const VARGA_HI: Record<string, string> = {
  Hora: 'होरा', Drekkana: 'द्रेष्काण', Chaturthamsa: 'चतुर्थांश', Saptamsa: 'सप्तांश', Navamsa: 'नवांश', Dasamsa: 'दशांश', Dwadasamsa: 'द्वादशांश',
  Shodasamsa: 'षोडशांश', Vimsamsa: 'विंशांश', Chaturvimsamsa: 'चतुर्विंशांश', Saptavimsamsa: 'सप्तविंशांश', Trimsamsa: 'त्रिंशांश',
  Khavedamsa: 'खवेदांश', Akshavedamsa: 'अक्षवेदांश', Shashtiamsa: 'षष्ट्यंश',
  'Wealth and resources': 'धन और संसाधन', 'Siblings, courage, initiative': 'भाई-बहन, साहस, पहल', 'Home, property, fortune': 'घर, संपत्ति, भाग्य',
  'Children and creativity': 'संतान और रचनात्मकता', 'Marriage, dharma, inner strength': 'विवाह, धर्म, भीतरी बल',
  'Career and public standing': 'कार्यक्षेत्र और प्रतिष्ठा', 'Parents and lineage': 'माता-पिता और वंश',
  'Vehicles, comforts, happiness': 'वाहन, सुख-सुविधा, प्रसन्नता', 'Worship and spiritual practice': 'उपासना और साधना',
  'Learning and education': 'शिक्षा और विद्या', 'Strength and stamina': 'बल और सहनशक्ति', 'Adversity and resilience': 'कठिनाई और जुझारूपन',
  'Maternal legacy, wellbeing': 'मातृ पक्ष की विरासत, कुशलता', 'Paternal legacy, character': 'पितृ पक्ष की विरासत, चरित्र',
  'Overall karma, fine detail': 'समग्र कर्म, सूक्ष्म विवरण',
};
export const vargaIn = named(VARGA_HI, 'VARGA');

/** Bhava names and significations, keyed by their English text in blocks/tables.ts. */
const BHAVA_HI: Record<string, string> = {
  Tanu: 'तनु', Dhana: 'धन', Sahaja: 'सहज', Sukha: 'सुख', Putra: 'पुत्र', Ripu: 'रिपु', Kalatra: 'कलत्र', Randhra: 'रंध्र', Dharma: 'धर्म',
  Karma: 'कर्म', Labha: 'लाभ', Vyaya: 'व्यय',
  'Self, body, temperament, vitality, first impressions': 'स्वयं, शरीर, स्वभाव, जीवन-शक्ति, पहली छाप',
  'Wealth, family, speech, food, values': 'धन, परिवार, वाणी, भोजन, जीवन-मूल्य',
  'Courage, effort, siblings, communication, short travel': 'साहस, प्रयास, भाई-बहन, संवाद, छोटी यात्राएँ',
  'Home, mother, comforts, property, inner peace': 'घर, माता, सुख-सुविधा, संपत्ति, मन की शांति',
  'Intelligence, children, creativity, romance, past merit': 'बुद्धि, संतान, रचनात्मकता, प्रेम, पूर्व पुण्य',
  'Health routines, service, competition, debts, problem-solving': 'स्वास्थ्य की दिनचर्या, सेवा, प्रतिस्पर्धा, ऋण, समस्या-समाधान',
  'Marriage, partnership, contracts, public dealings': 'विवाह, साझेदारी, अनुबंध, लोक-व्यवहार',
  'Transformation, longevity, research, shared resources': 'परिवर्तन, आयु, शोध, साझा संसाधन',
  'Fortune, father and teachers, higher learning, faith': 'भाग्य, पिता और गुरु, उच्च शिक्षा, आस्था',
  'Career, status, responsibility, visible action': 'कार्यक्षेत्र, प्रतिष्ठा, उत्तरदायित्व, प्रत्यक्ष कर्म',
  'Gains, networks, friends, ambitions, elder siblings': 'लाभ, संपर्क, मित्र, महत्वाकांक्षाएँ, बड़े भाई-बहन',
  'Expenses, rest, foreign lands, solitude, liberation': 'व्यय, विश्राम, विदेश, एकांत, मोक्ष',
};
export const bhavaIn = named(BHAVA_HI, 'BHAVA');

// --- Mangal exceptions, yogas ---------------------------------------------------

/** The engine's Mangal exception sentences (matchmaking-calculator.ts `cancellationFactors`). */
const MANGAL_EXCEPTION_HI: Record<string, string> = {
  'Mars in own sign (Aries) in 1st house': 'मंगल स्वराशि (मेष) में 1ले भाव में',
  'Mars in own sign (Scorpio) in 4th/8th house': 'मंगल स्वराशि (वृश्चिक) में 4थे/8वें भाव में',
  'Mars in exalted sign (Capricorn) in 7th/8th house': 'मंगल उच्च राशि (मकर) में 7वें/8वें भाव में',
  'Mars in friendly sign (Leo) in 8th house': 'मंगल मित्र राशि (सिंह) में 8वें भाव में',
  'Mars in friendly sign (Sagittarius) in 12th house': 'मंगल मित्र राशि (धनु) में 12वें भाव में',
  'Jupiter conjoined with Mars in the same house': 'गुरु की मंगल के साथ एक ही भाव में युति',
  'Benefic Jupiter aspects Mars (5th/7th/9th drishti)': 'शुभ ग्रह गुरु की मंगल पर दृष्टि (5वीं/7वीं/9वीं)',
};
export const mangalExceptionIn = named(MANGAL_EXCEPTION_HI, 'MANGAL_EXCEPTION');

const YOGA_FAMILY_HI: Record<string, string> = {
  MAHAPURUSHA: 'महापुरुष', RAJA: 'राज', DHANA: 'धन', CHANDRA: 'चंद्र', SURYA: 'सूर्य', NEECHA_BHANGA: 'नीच भंग', PARIVARTANA: 'परिवर्तन',
  VIPARITA: 'विपरीत', NABHASA: 'नाभस', AUSPICIOUS: 'शुभ', INAUSPICIOUS: 'चुनौतीपूर्ण', MISCELLANEOUS: 'अन्य',
};
export const yogaFamilyIn = named(YOGA_FAMILY_HI, 'YOGA_FAMILY');

/** Names of the yogas in the engine's catalogue (astrology-engine/src/yoga/evaluators), without their bracketed detail. */
const YOGA_NAME_HI: Record<string, string> = {
  'Adhi Yoga': 'अधि योग', 'Amala Yoga': 'अमला योग', 'Anapha Yoga': 'अनफा योग', 'Bhadra Yoga': 'भद्र योग', 'Budha-Aditya Yoga': 'बुधादित्य योग',
  'Chandra-Mangala Yoga': 'चंद्र-मंगल योग', 'Dharma-Karmadhipati Yoga': 'धर्म-कर्माधिपति योग', 'Durudhara Yoga': 'दुरुधरा योग',
  'Gajakesari Yoga': 'गजकेसरी योग', 'Hamsa Yoga': 'हंस योग', 'Harsha Yoga': 'हर्ष योग', 'Kemadruma Yoga': 'केमद्रुम योग', 'Lakshmi Yoga': 'लक्ष्मी योग',
  'Malavya Yoga': 'मालव्य योग', 'Musala Yoga': 'मुसल योग', 'Nala Yoga': 'नल योग', 'Parivartana Yoga': 'परिवर्तन योग',
  'Maha Parivartana Yoga': 'महा परिवर्तन योग', 'Dainya Parivartana Yoga': 'दैन्य परिवर्तन योग', 'Khala Parivartana Yoga': 'खल परिवर्तन योग',
  'Rajju Yoga': 'रज्जु योग', 'Ruchaka Yoga': 'रुचक योग', 'Sarala Yoga': 'सरल योग', 'Saraswati Yoga': 'सरस्वती योग', 'Shakata Yoga': 'शकट योग',
  'Shasha Yoga': 'शश योग', 'Shringataka Yoga': 'शृंगाटक योग', 'Sunapha Yoga': 'सुनफा योग', 'Ubhayachari Yoga': 'उभयचरी योग', 'Vesi Yoga': 'वेशि योग',
  'Vihaga Yoga': 'विहग योग', 'Vimala Yoga': 'विमल योग', 'Vosi Yoga': 'वोशि योग', 'Dhana Yoga': 'धन योग', 'Raja Yoga': 'राज योग',
  'Neecha Bhanga Raja Yoga': 'नीच भंग राज योग', 'Vallaki Yoga': 'वल्लकी योग', 'Dama Yoga': 'दाम योग', 'Pasha Yoga': 'पाश योग',
  'Kedara Yoga': 'केदार योग', 'Shula Yoga': 'शूल योग', 'Yuga Yoga': 'युग योग', 'Gola Yoga': 'गोल योग',
};

/** Words that occur inside the brackets of a yoga name, e.g. "(Yogakaraka SATURN: 4th Lord + 5th Lord)". */
const YOGA_DETAIL_HI: Record<string, string> = {
  Chandradhi: 'चंद्राधि', Nabhasa: 'नाभस', Yogakaraka: 'योगकारक', 'Lagna Lord': 'लग्नेश', 'Lakshmi Sthana': 'लक्ष्मी स्थान',
  Dhana: 'धन', Labha: 'लाभ', Bhagya: 'भाग्य',
};

/**
 * The Hindi name of an engine yoga: the catalogue name plus its bracketed detail (planets and
 * house lords). A name outside the catalogue is an error, never printed half in English.
 */
export function yogaNameIn(lang: ReportLanguage, name: string): string {
  if (lang === 'en') return name;
  const m = /^([^(]+?)(?:\s*\((.*)\))?$/.exec(name.trim());
  const base = m ? YOGA_NAME_HI[m[1]] : undefined;
  if (!m || base === undefined) throw new Error(`HINDI_YOGA_NAME_MISSING: "${name}"`);
  if (!m[2]) return base;
  const detail = m[2]
    .replace(/\b(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)\b/gi, (p) => planetLabel(lang, p[0].toUpperCase() + p.slice(1).toLowerCase()))
    .replace(/(\d+)(?:st|nd|rd|th) Lord/g, (_, n: string) => `भावेश ${n}`)
    .replace(/Lagna Lord|Lakshmi Sthana|[A-Za-z]+/g, (w) => {
      const hi = YOGA_DETAIL_HI[w];
      if (hi === undefined) throw new Error(`HINDI_YOGA_NAME_MISSING: "${w}" in "${name}"`);
      return hi;
    });
  return `${base} (${detail})`;
}

// --- Practices ---------------------------------------------------------------------

/** Colours, beej mantras, service notes and focus reasons of the practice and numerology tables, keyed by their English text. */
const PRACTICE_HI: Record<string, string> = {
  'gold, saffron': 'सुनहरा, केसरिया', 'white, silver': 'सफेद, रुपहला', 'red, coral': 'लाल, मूँगिया', green: 'हरा', yellow: 'पीला',
  'white, pastel pink': 'सफेद, हल्का गुलाबी', 'deep blue, black': 'गहरा नीला, काला', 'smoky grey': 'धुएँ जैसा स्लेटी', 'earthy brown, grey': 'मटमैला भूरा, स्लेटी',
  'Om Hraam Hreem Hraum Sah Suryaya Namah': 'ॐ ह्रां ह्रीं ह्रौं सः सूर्याय नमः',
  'Om Shraam Shreem Shraum Sah Chandraya Namah': 'ॐ श्रां श्रीं श्रौं सः चंद्राय नमः',
  'Om Kraam Kreem Kraum Sah Bhaumaya Namah': 'ॐ क्रां क्रीं क्रौं सः भौमाय नमः',
  'Om Braam Breem Braum Sah Budhaya Namah': 'ॐ ब्रां ब्रीं ब्रौं सः बुधाय नमः',
  'Om Graam Greem Graum Sah Gurave Namah': 'ॐ ग्रां ग्रीं ग्रौं सः गुरवे नमः',
  'Om Draam Dreem Draum Sah Shukraya Namah': 'ॐ द्रां द्रीं द्रौं सः शुक्राय नमः',
  'Om Praam Preem Praum Sah Shanaye Namah': 'ॐ प्रां प्रीं प्रौं सः शनये नमः',
  'Om Bhraam Bhreem Bhraum Sah Rahave Namah': 'ॐ भ्रां भ्रीं भ्रौं सः राहवे नमः',
  'Om Sraam Sreem Sraum Sah Ketave Namah': 'ॐ स्रां स्रीं स्रौं सः केतवे नमः',
  'Respect and help your father and elders; keep a sunrise routine; take responsibility in civic life.':
    'अपने पिता और बड़ों का सम्मान और सहायता करें; सूर्योदय के समय की दिनचर्या रखें; समाज के कामों में उत्तरदायित्व लें।',
  'Care for your mother and mother figures; offer water or food to those in need; protect your sleep.':
    'अपनी माता और मातृतुल्य स्त्रियों का ध्यान रखें; जरूरतमंदों को जल या भोजन दें; अपनी नींद का ध्यान रखें।',
  'Support your siblings; regular physical exercise; volunteer your energy for practical help.':
    'अपने भाई-बहनों का साथ दें; नियमित व्यायाम करें; अपनी ऊर्जा दूसरों की व्यावहारिक सहायता में लगाएँ।',
  'Teach or tutor; help students with books or time; keep your word in writing and speech.':
    'पढ़ाएँ या किसी को सिखाएँ; विद्यार्थियों की पुस्तकों या अपने समय से सहायता करें; लिखे और बोले हुए वचन निभाएँ।',
  'Honour teachers; share knowledge freely; support education for children.':
    'गुरुजनों का सम्मान करें; ज्ञान खुले मन से बाँटें; बच्चों की शिक्षा में सहयोग दें।',
  'Treat women with respect and gratitude; support the arts; keep your surroundings clean and beautiful.':
    'स्त्रियों के प्रति सम्मान और कृतज्ञता रखें; कला को सहयोग दें; अपने आस-पास को स्वच्छ और सुंदर रखें।',
  'Serve the elderly and labourers; be punctual and patient; finish what you start.':
    'वृद्धजनों और श्रमिकों की सेवा करें; समय के पाबंद और धैर्यवान रहें; जो शुरू करें उसे पूरा करें।',
  'Keep honest digital habits; help people on the margins of society; avoid shortcuts.':
    'तकनीक के उपयोग में ईमानदार रहें; समाज के हाशिये पर रहने वालों की सहायता करें; जल्दबाजी के छोटे रास्तों से बचें।',
  'Quiet meditation; care for stray animals; give anonymously.':
    'शांत ध्यान करें; बेसहारा पशुओं की देखभाल करें; गुप्त दान करें।',
  'Ascendant lord': 'लग्नेश', 'Moon-sign lord': 'चंद्र राशि का स्वामी', 'current Mahadasha lord': 'वर्तमान महादशा का स्वामी',
};
export const practiceIn = named(PRACTICE_HI, 'PRACTICE');

/** Sign names for narrow chart cells and table columns: the three-letter English form, or the Hindi name. */
export const signShortIn = (lang: ReportLanguage, short: string, full: string): string => (lang === 'hi' ? signLabel(lang, full) : short);

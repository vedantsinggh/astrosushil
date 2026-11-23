/**
 * Career Report: Hindi edition (display text only).
 * Structure, evidence and objectives are those of career.definition.ts. This file holds the
 * Hindi titles of the edition, the fixed Hindi labels of the career blocks, and the Hindi forms
 * of the short texts the career calculations produce in English (career links, durations, yoga
 * names and the engine's "how it is formed" conditions). Nothing here calculates: every number
 * is the one the English block prints.
 */
import { DIGNITY_HI, HindiEdition, PLANET_HI, registerHindiLabels, SIGN_HI } from '../../i18n/hindi';
import { ordinalHi } from '../../render/blocks.hindi';

// ---------------------------------------------------------------------------
// Edition
// ---------------------------------------------------------------------------

const houseSubtitle = (house: string) => `${house} भाव की राशि, स्वामी, ग्रह और दृष्टियाँ`;

export const CAREER_HINDI: HindiEdition = {
  // The market term, by the owner's decision (2026-11-24).
  title: 'करियर रिपोर्ट',
  subtitle: 'आपका काम, आपका रुझान और आपका समय: जन्म कुंडली और दशमांश के माध्यम से',
  description:
    'आपके व्यावसायिक जीवन का गहरा विवेचन: लग्न और कार्य-भाव (1ला, 2रा, 6ठा, 7वाँ, 10वाँ, 11वाँ), उनके स्वामी, उनमें स्थित ग्रह और उन पर दृष्टियाँ; दशमांश (D10) कुंडली; आत्मकारक और अमात्यकारक; आपकी कुंडली में पाए गए कार्यक्षेत्र के योग; भृगु नंदी नाड़ी परंपरा में कर्म कारक शनि; नौकरी और उद्यम की अष्टकवर्ग तुलना; आपकी दशाओं की समयरेखा; शनि, गुरु, राहु और केतु के वर्तमान और आने वाले गोचर; और व्यावहारिक, नैतिक उपाय जिनके लिए कुछ भी खरीदना नहीं है।',
  writingGuidance: [
    'In Hindi, write "कार्यक्षेत्र", "व्यवसाय" or "आजीविका" for career and "नौकरी" for employment; write houses with the digit ("10वाँ भाव", "10वें भाव में") as the tables of this report do.',
  ],
  sections: {
    'career-charts': {
      title: 'आपकी कार्यक्षेत्र कुंडलियाँ',
      kicker: 'आपकी कुंडली',
      intro: 'वे गणना किए गए तथ्य जिन पर यह रिपोर्ट आधारित है: आपकी जन्म कुंडली (D1) और आपकी दशमांश कुंडली (D10), जो व्यवसाय की वर्ग कुंडली है।',
    },
    lagna: {
      title: 'काम में आप स्वयं: आपका लग्न',
      kicker: 'खंड 1',
      intro: 'लग्न पूरी कुंडली को देखने का दृष्टिकोण है। किसी भी कार्य-भाव से पहले यह वह स्वभाव, ऊर्जा और प्रतिष्ठा दिखाता है जो आप अपने काम में लेकर आते हैं।',
    },
    'tenth-sixth': {
      title: 'व्यवसाय और सेवा: 10वाँ और 6ठा भाव',
      kicker: 'खंड 2',
      intro: '10वाँ भाव आपका कर्मक्षेत्र और सार्वजनिक प्रतिष्ठा है; 6ठा भाव रोज़ का काम, सेवा, प्रतिस्पर्धा और नौकरी है।',
    },
    'seventh-eleventh': {
      title: 'साझेदारी और लाभ: 7वाँ और 11वाँ भाव',
      kicker: 'खंड 3',
      intro: '7वाँ भाव साझेदारों, ग्राहकों और व्यापार का है; 11वाँ भाव आय, संपर्कों और लक्ष्यों की पूर्ति का है।',
    },
    'second-house': {
      title: '2रा भाव: संसाधन और अर्जित धन',
      kicker: 'खंड 4',
      intro: '2रे भाव में वह सब है जो आप काम से जोड़ते हैं: बचत, वाणी का कौशल और वे संसाधन जो कार्यजीवन को टिकाए रखते हैं।',
    },
    signatures: {
      title: 'सफलता के विशेष संकेत',
      kicker: 'खंड 5',
      intro: 'योग, जन्म की दशा, सूर्य और शनि, तथा जैमिनी कारक: वे विशेष संकेत जिन्हें शास्त्रीय ज्योतिष कार्यक्षेत्र के लिए पढ़ता है।',
    },
    'd10-map': {
      title: 'D10 का मानचित्र: आपका दशमांश',
      kicker: 'खंड 6',
      intro: 'दशमांश हर राशि को दस भागों में बाँटकर 10वें भाव की कहानी को और बारीकी से दिखाता है: यह व्यवसाय, पद और उपलब्धि की शास्त्रीय कुंडली है।',
    },
    bnn: {
      title: 'भृगु नंदी नाड़ी: कर्म कारक शनि',
      kicker: 'खंड 7',
      intro: 'भृगु नंदी नाड़ी परंपरा में शनि कर्म और व्यवसाय का कारक है। उसकी राशि और राशि के आधार पर उससे जुड़े ग्रह आपके कामकाजी जीवन का स्वरूप बताते हैं।',
    },
    voyage: {
      title: 'आपके कार्यजीवन की यात्रा',
      kicker: 'खंड 8',
      intro: 'सीखने और पहली कमाई से लेकर उन्नति को गति देने वाले भाव-स्वामियों तक, जन्म कुंडली और कार्यक्षेत्र कुंडली दोनों में।',
    },
    'voyage-turns': {
      title: 'मोड़: चुनौतियाँ, बदलाव और स्थिरता',
      kicker: 'खंड 9',
      intro: 'हर कार्यजीवन में उतार-चढ़ाव, मोड़ और ठहराव के पड़ाव आते हैं। शास्त्रीय भावात् भावम् की गिनती इन्हें स्वयं 10वें भाव से पढ़ती है।',
    },
    government: {
      title: 'लोक सेवा और सरकारी भूमिकाएँ',
      kicker: 'खंड 10',
      intro: 'शास्त्रीय ज्योतिष लोक सेवा को सूर्य (राज्य), शनि (प्रशासन), 6ठे भाव (सेवा) और 10वें भाव (पद) से पढ़ता है।',
    },
    business: {
      title: 'उद्यम की राह',
      kicker: 'खंड 11',
      intro: 'बुध (वाणिज्य), शुक्र (मूल्य और मोल-भाव) और सूर्य (पहल), साथ में व्यापार का 7वाँ भाव और नौकरी तथा उद्यम के बीच अष्टकवर्ग का संतुलन।',
    },
    'cosmic-clock': {
      title: 'ग्रहों की घड़ी: गोचर',
      kicker: 'खंड 12',
      intro: 'शनि, गुरु, राहु और केतु इतने धीमे चलते हैं कि कार्यजीवन के पूरे-पूरे दौर का स्वर तय करते हैं। यहाँ उनकी वर्तमान और आने वाली राशियाँ सटीक तिथियों के साथ दी गई हैं।',
    },
    'dasha-ahead': {
      title: 'आपकी दशाओं में आगे क्या है',
      kicker: 'खंड 13',
      intro: 'विंशोत्तरी दशाएँ बताती हैं कि जीवन के हर अध्याय में कौन-सा ग्रह अगुवाई करता है। कार्य-भावों से उनके संबंध दिखाते हैं कि काम से जुड़े विषय कब उभरते हैं।',
    },
    vocation: {
      title: 'आपकी आजीविका की पहचान',
      kicker: 'खंड 14',
      intro: 'अलग-अलग भावों से आगे का एक समग्र चित्र: आजीविका के स्रोत के लिए वराहमिहिर का कर्मजीव नियम, कार्यक्षेत्र की राशियों के गुण, और जन्म कुंडली तथा D10 का आपसी मेल।',
    },
    remedies: {
      title: 'कार्यक्षेत्र में उन्नति के व्यावहारिक उपाय',
      kicker: 'खंड 15',
      intro: 'एस्ट्रो सुशील के उपाय आदतें, आचरण, सेवा और स्वैच्छिक भक्ति हैं। यहाँ कुछ भी खरीदने की ज़रूरत नहीं है।',
    },
    roadmap: {
      title: 'आपके कार्यजीवन का मार्गचित्र',
      kicker: 'खंड 16',
      intro: 'सब कुछ एक साथ: वे क्षेत्र जो आपको बुलाते हैं और वे कदम जो कुंडली की शक्तियों को काम में लाते हैं।',
    },
  },
  topics: {
    'career-details': { title: 'एक नज़र में आपका कार्यक्षेत्र' },
    'natal-chart': { title: 'आपकी जन्म कुंडली (D1, राशि)' },
    'd10-chart': { title: 'आपकी कार्यक्षेत्र कुंडली (D10, दशमांश)' },
    'career-intro': { title: 'कर्म, रुझान और चुनाव', subtitle: 'जन्म कुंडली कामकाजी जीवन को कैसे दर्शाती है' },
    'career-houses-table': { title: 'एक नज़र में आपके कार्य-भाव' },
    'lagna-career': { title: 'आपके कार्यक्षेत्र का ध्रुव तारा', subtitle: 'आपकी लग्न राशि और लग्नेश की स्थिति' },
    'tenth-house': { title: '10वाँ भाव: आपका कर्मक्षेत्र', subtitle: houseSubtitle('10वें') },
    'sixth-house': { title: '6ठा भाव: सेवा और प्रतिस्पर्धा', subtitle: houseSubtitle('6ठे') },
    'seventh-house': { title: '7वाँ भाव: व्यापार और साझेदारी', subtitle: houseSubtitle('7वें') },
    'eleventh-house': { title: '11वाँ भाव: आय और संपर्क', subtitle: houseSubtitle('11वें') },
    'second-house-lord': { title: 'आपके संसाधनों की कुंजी', subtitle: houseSubtitle('2रे') },
    'career-yoga-table': { title: 'आपकी कुंडली के कार्यक्षेत्र योग' },
    'career-yogas': { title: 'काम के लिए आपके योगों का अर्थ', subtitle: 'आपकी कुंडली में पाए गए ग्रह संयोग' },
    'birth-dasha': { title: 'दशा का प्रवेश द्वार', subtitle: 'वह ग्रह दशा जिसमें आपका जन्म हुआ' },
    'sun-saturn-table': { title: 'आपकी कुंडली में सूर्य और शनि' },
    'sun-career': { title: 'सूर्य की राह', subtitle: 'अधिकार, पहचान और नेतृत्व' },
    'saturn-career': { title: 'शनि की चाल', subtitle: 'अनुशासन, सहनशक्ति और धीरज से निर्माण' },
    'karaka-table': { title: 'आपके जैमिनी चर कारक' },
    'atmakaraka-career': { title: 'आपका आत्मकारक: आत्मा की दिशा', subtitle: 'सबसे अधिक अंश वाला ग्रह' },
    'amatyakaraka-career': { title: 'आपका अमात्यकारक: कार्यक्षेत्र का मंत्री', subtitle: 'दूसरे सबसे अधिक अंश वाला ग्रह' },
    'd10-houses-table': { title: 'भाव-दर-भाव आपका दशमांश' },
    'd10-lagna': { title: 'काम में आपका व्यक्तित्व', subtitle: 'आपका D10 लग्न' },
    'd10-tenth-lord': { title: 'सफलता की आधारशिला', subtitle: 'D10 का 10वाँ भाव और उसका स्वामी' },
    'd10-sixth-lord': { title: 'कार्यस्थल की चुनौतियों पर विजय', subtitle: 'D10 का 6ठा भाव और उसका स्वामी' },
    'd10-seventh-lord': { title: 'फलता-फूलता सहयोग', subtitle: 'D10 का 7वाँ भाव और उसका स्वामी' },
    'd10-sun': { title: 'आपके दशमांश में सूर्य', subtitle: 'कार्यक्षेत्र कुंडली में अधिकार और पहचान' },
    'd10-saturn': { title: 'आपके दशमांश में शनि', subtitle: 'कार्यक्षेत्र कुंडली में कार्य-निष्ठा और सहनशक्ति' },
    'bnn-table': { title: 'शनि और उसके नाड़ी संबंध' },
    'bnn-saturn': { title: 'शनि: आपके कार्यक्षेत्र का दिशासूचक', subtitle: 'नाड़ी दृष्टि से शनि की राशि और दृष्टियाँ' },
    'bnn-links': { title: 'शनि से जुड़े ग्रह', subtitle: 'युति, त्रिकोण और आगे-पीछे की राशियाँ' },
    'early-education': { title: 'यात्रा का आरंभ: शिक्षा और शुरुआत', subtitle: 'शिक्षा का 4था भाव और बुद्धि का 5वाँ भाव' },
    'first-earnings': { title: 'पहली सीढ़ी: पहली कमाई', subtitle: '2रे और 11वें भाव के स्वामी और उनकी दशाएँ' },
    'jupiter-guidance': { title: 'गुरु का मार्गदर्शन', subtitle: 'वह काम जो विकास लाता है' },
    'career-lords-table': { title: 'उन्नति के स्वामी' },
    'advancement-d10': { title: 'दशमांश में कार्यक्षेत्र की उन्नति', subtitle: 'D10 के 1ले, 6ठे, 10वें और 11वें भाव के स्वामी' },
    'stormy-seas-d1': { title: 'उतार-चढ़ाव: दबाव और विराम', subtitle: 'जन्म कुंडली में 5वाँ भाव (10वें से 8वाँ) और 9वाँ भाव (10वें से 12वाँ)' },
    'stormy-seas-d10': { title: 'कार्यक्षेत्र कुंडली में उतार-चढ़ाव', subtitle: 'D10 के 5वें और 9वें भाव' },
    'changing-course': { title: 'दिशा बदलना', subtitle: 'D1 और D10 में परिवर्तन का 8वाँ भाव' },
    retirement: {
      title: 'ठहराव: स्थायी स्थिरता', subtitle: 'D1 और D10 में 12वाँ भाव (10वें से 3रा)',
      variants: { 'long-term-stability': { title: 'ठहराव: स्थायी स्थिरता की नींव' } },
    },
    'government-table': { title: 'आपके लोक सेवा संकेतक' },
    'sun-saturn-government': { title: 'सूर्य और शनि: अधिकार और सेवा', subtitle: 'सरकारी कार्यक्षेत्र के पीछे की जोड़ी' },
    'rajya-seva-yogas': { title: 'लोक सेवा के योग', subtitle: 'आपकी कुंडली में अधिकार से जुड़े योग' },
    'business-compass': { title: 'आपका व्यापारिक दिशासूचक', subtitle: 'बुध, शुक्र और सूर्य' },
    'business-growth': { title: 'विकास की लहरें', subtitle: 'उद्यम कब और कैसे बढ़ सकता है' },
    'ashtakavarga-table': { title: 'आपका अष्टकवर्ग' },
    'job-vs-business-table': { title: 'नौकरी या उद्यम? अष्टकवर्ग की दृष्टि' },
    'job-vs-business': { title: 'संतुलन को समझना', subtitle: 'बिंदु आपकी राह के बारे में क्या संकेत देते हैं' },
    'transit-table': { title: 'वर्तमान और आने वाले गोचर' },
    'transit-saturn': { title: 'शनि का गोचर: परिश्रम का दौर', subtitle: 'अभी और आगे' },
    'transit-jupiter': { title: 'गुरु का गोचर: विकास का दौर', subtitle: 'अभी और आगे' },
    'transit-nodes': { title: 'राहु और केतु: परिवर्तन की धुरी', subtitle: 'अभी और आगे' },
    'dasha-timeline': { title: 'दशा के अनुसार आपके कार्यजीवन की समयरेखा' },
    'antardasha-table': { title: 'आपकी वर्तमान महादशा की अंतर्दशाएँ' },
    'current-dasha': { title: 'आपका वर्तमान अध्याय', subtitle: 'चल रही महादशा और अंतर्दशा' },
    'next-dasha': { title: 'अगला अध्याय', subtitle: 'आने वाली महादशा' },
    'karmajiva-table': { title: 'कर्मजीव: आजीविका का स्रोत' },
    'vocational-signature': { title: 'आपके काम का स्वभाव', subtitle: 'आजीविका के ग्रह और राशियों के गुण' },
    'd1-d10-synthesis': { title: 'जन्म कुंडली और कार्यक्षेत्र कुंडली का संवाद', subtitle: 'जहाँ D1 और D10 एकमत हैं' },
    'remedy-practices': { title: 'अपने कार्यक्षेत्र के ग्रहों को सशक्त करना', subtitle: '10वें भाव के स्वामी, शनि और सूर्य के लिए अभ्यास' },
    'lifestyle-practices': { title: 'जीवनशैली में संतुलन', subtitle: 'काम में दिनचर्या, एकाग्रता और स्वास्थ्य' },
    'seva-practices': { title: 'सेवा से कर्म का संतुलन', subtitle: 'सेवा तथा समय और कौशल का दान' },
    'fields-of-opportunity': { title: 'अवसर के क्षेत्र', subtitle: 'लग्नेश और त्रिकोण भावों के स्वामियों से मिले सुझाव' },
    'roadmap-summary': { title: 'आगे की राह', subtitle: 'एक व्यावहारिक सार' },
  },
};

/**
 * Hindi titles of the life-stage topic variants that replace a title (career.definition.ts
 * `variants[].title`), keyed by topic id then variant id. `HindiEdition` has no place for variant
 * text yet (platform/i18n/hindi.ts), so these are not applied: until the overlay reads them, a
 * Hindi report for a reader up to RETIREMENT_REFRAME_MAX_AGE prints this one title in English.
 */
export const CAREER_HINDI_VARIANT_TITLES: Record<string, Record<string, string>> = {
  retirement: { 'long-term-stability': 'ठहराव: स्थायी स्थिरता की नींव' },
};

// ---------------------------------------------------------------------------
// Fixed labels of the career blocks (keyed by the English text)
// ---------------------------------------------------------------------------

registerHindiLabels({
  // career-astral-details
  'Ascendant (Lagna)': 'लग्न',
  'Moon sign and nakshatra': 'चंद्र राशि और नक्षत्र',
  '10th house (profession)': '10वाँ भाव (व्यवसाय)',
  'D10 (Dashamsha) ascendant': 'D10 (दशमांश) लग्न',
  'Atmakaraka / Amatyakaraka': 'आत्मकारक / अमात्यकारक',
  'Saturn (karma karaka)': 'शनि (कर्म कारक)',
  'Birth Mahadasha': 'जन्म की महादशा',
  'Current Mahadasha / Antardasha': 'वर्तमान महादशा / अंतर्दशा',
  // career-houses
  'Lord (placed in)': 'स्वामी (कहाँ स्थित)',
  Occupants: 'स्थित ग्रह',
  'Aspected by': 'दृष्टि देने वाले ग्रह',
  'Whole-sign houses. Aspects are classical graha drishti (all planets 7th; Mars 4th/8th; Jupiter 5th/9th; Saturn 3rd/10th; Rahu/Ketu 5th/9th), shown with the aspect counted from the planet. SAV = Sarvashtakavarga bindus of the house sign.':
    'पूर्ण-राशि भाव पद्धति। दृष्टियाँ शास्त्रीय ग्रह दृष्टि हैं (सभी ग्रहों की 7वीं; मंगल की 4थी/8वीं; गुरु की 5वीं/9वीं; शनि की 3री/10वीं; राहु/केतु की 5वीं/9वीं), और दृष्टि की गिनती दृष्टि देने वाले ग्रह से की गई है। बिंदु = भाव की राशि के सर्वाष्टकवर्ग बिंदु।',
  // career-yogas
  'The calculation engine did not detect any of the classical raja, dhana, mahapurusha, solar or related career combinations in your chart. Career strength is then read from the houses, their lords, the D10 and the dashas, which the following sections cover in detail.':
    'गणना इंजन को आपकी कुंडली में राज, धन, महापुरुष, सूर्य या इनसे जुड़े शास्त्रीय कार्यक्षेत्र योगों में से कोई नहीं मिला। ऐसे में कार्यक्षेत्र की शक्ति भावों, उनके स्वामियों, D10 और दशाओं से पढ़ी जाती है, जिन पर आगे के खंडों में विस्तार से बात की गई है।',
  "Only yogas detected by the engine's rule set are listed; none are inferred.": 'केवल वही योग दिए गए हैं जो इंजन के नियमों से पाए गए; कोई योग अनुमान से नहीं जोड़ा गया।',
  Yoga: 'योग',
  Family: 'वर्ग',
  'How it is formed in your chart': 'आपकी कुंडली में कैसे बना',
  'Yogas detected by the engine\'s classical rule set (BPHS, Phaladeepika conventions). Families classically tied to status, work and earnings come first; other detected yogas are marked "context". No yoga is added by hand, and a listed yoga indicates a potential, not a result.':
    'इंजन के शास्त्रीय नियमों (बृहत् पाराशर होरा शास्त्र और फलदीपिका की परंपरा) से पाए गए योग। पद, काम और कमाई से शास्त्रीय रूप से जुड़े वर्ग पहले हैं; अन्य पाए गए योग "संदर्भ" के रूप में चिह्नित हैं। कोई योग हाथ से नहीं जोड़ा गया, और सूची में दिया गया योग एक संभावना दर्शाता है, परिणाम नहीं।',
  // career-sun-saturn
  'From Lagna': 'लग्न से',
  'From Moon': 'चंद्र से',
  'From 10th': '10वें से',
  'In the D10': 'D10 में',
  "Positions counted inclusively in whole signs from the Ascendant, from the Moon's sign and from the 10th house (bhavat bhavam: the 10th itself counts as 1st).":
    'स्थितियाँ पूर्ण राशियों में, आरंभ की राशि को गिनते हुए, लग्न से, चंद्र राशि से और 10वें भाव से गिनी गई हैं (भावात् भावम्: 10वाँ भाव स्वयं 1ला गिना जाता है)।',
  // career-karakas
  'Chara karaka': 'चर कारक',
  'Degree in sign': 'राशि में अंश',
  'Placed in': 'स्थित',
  Signifies: 'किसका कारक',
  'Jaimini seven-karaka scheme (Rahu excluded): planets ranked by degree within their sign, highest first. The Amatyakaraka (second highest) is the classical significator of career and counsel.':
    'जैमिनी की सात कारक पद्धति (राहु शामिल नहीं): ग्रहों को उनकी राशि के भीतर के अंशों के क्रम में रखा गया है, सबसे अधिक अंश वाला पहले। अमात्यकारक (दूसरा सबसे अधिक) कार्यक्षेत्र और परामर्श का शास्त्रीय कारक है।',
  // career-d10-houses
  'Every house of the Dashamsha (D10), the divisional chart of profession. Bold rows are the houses this report reads most closely for work.':
    'दशमांश (D10), यानी व्यवसाय की वर्ग कुंडली, का हर भाव। गहरे अक्षरों वाली पंक्तियाँ वे भाव हैं जिन्हें यह रिपोर्ट काम के लिए सबसे बारीकी से पढ़ती है।',
  'D10 house': 'D10 भाव',
  Lord: 'स्वामी',
  'Lord sits in': 'स्वामी किस भाव में',
  "Lord's D10 dignity": 'स्वामी की D10 स्थिति',
  'D10 computed by the divisional-chart engine (Parashari Dashamsha); houses counted in whole signs from the D10 ascendant. D10 dignity is sign dignity only (exalted, debilitated or own sign; a dash means none of these) and is a different scale from the birth-chart compound dignity.':
    'D10 वर्ग कुंडली गणना इंजन से निकाली गई है (पाराशरी दशमांश); भाव D10 लग्न से पूर्ण राशियों में गिने गए हैं। D10 स्थिति केवल राशि पर आधारित है (उच्च, नीच या स्वराशि; रेखा का अर्थ है इनमें से कोई नहीं) और जन्म कुंडली की संयुक्त स्थिति से अलग पैमाना है।',
  // career-bnn
  'Same sign as Saturn (conjunction)': 'शनि की ही राशि में (युति)',
  "Saturn's 3rd / 7th / 10th aspects": 'शनि की 3री / 7वीं / 10वीं दृष्टि',
  'Classical Bhrigu Nandi Nadi reading: Saturn as karma karaka, with the planets it is linked to by sign — the same sign, its trines (5th, 9th) and the signs immediately ahead (2nd) and behind (12th). Signs only; no degree-based chain is used.':
    'शास्त्रीय भृगु नंदी नाड़ी पद्धति: शनि कर्म कारक है, और उससे राशि के आधार पर जुड़े ग्रह देखे गए हैं: उसी राशि में, उसके त्रिकोण (5वीं, 9वीं) में, और ठीक आगे (2री) तथा ठीक पीछे (12वीं) की राशियों में। केवल राशियाँ ली गई हैं; अंशों पर आधारित कोई शृंखला नहीं।',
  // career-lords
  'Lord in the birth chart (D1)': 'जन्म कुंडली (D1) में स्वामी',
  'Lord in the career chart (D10)': 'कार्यक्षेत्र कुंडली (D10) में स्वामी',
  "Lords of the self (1st), service (6th), profession (10th) and gains (11th), in the D1 and in the D10 (whole-sign houses from each chart's ascendant).":
    'स्वयं (1ला), सेवा (6ठा), व्यवसाय (10वाँ) और लाभ (11वाँ) भावों के स्वामी, D1 और D10 में (हर कुंडली के लग्न से पूर्ण-राशि भाव)।',
  // career-government
  'Sun (authority, state)': 'सूर्य (अधिकार, राज्य)',
  'Saturn (service, administration)': 'शनि (सेवा, प्रशासन)',
  'Sun–Saturn link': 'सूर्य–शनि संबंध',
  'no conjunction or aspect': 'न युति, न दृष्टि',
  'Sun and the 10th house': 'सूर्य और 10वाँ भाव',
  'no direct link': 'कोई सीधा संबंध नहीं',
  '6th house (service)': '6ठा भाव (सेवा)',
  '10th house (office)': '10वाँ भाव (पद)',
  'Related yogas detected': 'इनसे जुड़े पाए गए योग',
  'none detected': 'कोई नहीं मिला',
  'Classical significators of public service: the Sun (raja karaka, government) and Saturn (service, administration), the 6th (service) and 10th (office). Facts only; no score is computed.':
    'लोक सेवा के शास्त्रीय कारक: सूर्य (राज कारक, शासन) और शनि (सेवा, प्रशासन), 6ठा भाव (सेवा) और 10वाँ भाव (पद)। केवल तथ्य दिए गए हैं; कोई अंक नहीं निकाला गया।',
  // career-ashtakavarga
  'Bhinnashtakavarga (BAV) bindus of each planet in each sign, with the Sarvashtakavarga (SAV) total. The last row shows which house of your chart each sign is.':
    'हर राशि में हर ग्रह के भिन्नाष्टकवर्ग बिंदु, और साथ में सर्वाष्टकवर्ग का कुल योग। अंतिम पंक्ति बताती है कि हर राशि आपकी कुंडली का कौन-सा भाव है।',
  'Parashari Ashtakavarga (BPHS) computed by the engine; signs in zodiac order (Aries to Pisces).':
    'पाराशरी अष्टकवर्ग (बृहत् पाराशर होरा शास्त्र), इंजन द्वारा गणना; राशियाँ राशिचक्र के क्रम में हैं (मेष से मीन)।',
  // career-job-vs-business
  Benchmark: 'औसत से तुलना',
  'The two comparisons': 'दो तुलनाएँ',
  'Service and partnership:': 'सेवा और साझेदारी:',
  'A stronger 6th leans towards employment, service and competitive roles; a stronger 7th leans towards trade, clients and partnership.':
    'अधिक बिंदुओं वाला 6ठा भाव नौकरी, सेवा और प्रतिस्पर्धा वाली भूमिकाओं की ओर झुकाता है; अधिक बिंदुओं वाला 7वाँ भाव व्यापार, ग्राहकों और साझेदारी की ओर।',
  'Action and gains:': 'कर्म और लाभ:',
  'When the 11th exceeds the 10th, gains tend to come readily relative to effort; when the 10th leads, results follow steady, visible work.':
    'जब 11वाँ भाव 10वें से आगे हो, तो प्रयास की तुलना में लाभ प्रायः सहजता से आते हैं; जब 10वाँ आगे हो, तो परिणाम निरंतर और दिखने वाले काम के बाद मिलते हैं।',
  'Sarvashtakavarga bindus per house; 28 is the classical average (BPHS). The 6th/7th and 10th/11th comparisons are a widely used practitioner reading of Ashtakavarga, shown as tendencies, not verdicts.':
    'हर भाव के सर्वाष्टकवर्ग बिंदु; 28 शास्त्रीय औसत है (बृहत् पाराशर होरा शास्त्र)। 6ठे/7वें और 10वें/11वें भाव की तुलना ज्योतिषियों में प्रचलित अष्टकवर्ग पठन है, जिसे यहाँ झुकाव के रूप में दिखाया गया है, निर्णय के रूप में नहीं।',
  // career-transits
  Now: 'अभी',
  Next: 'आगे',
  Period: 'अवधि',
  Duration: 'कितना समय',
  'From Lagna / Moon': 'लग्न / चंद्र से',
  'The four slow-moving planets that shape the longer seasons of a career. "From Lagna / Moon" shows which house of your chart the transit sign is, counted from the Ascendant and from the Moon.':
    'धीमी गति वाले चार ग्रह, जो कार्यजीवन के लंबे दौर तय करते हैं। "लग्न / चंद्र से" बताता है कि गोचर की राशि आपकी कुंडली का कौन-सा भाव है, लग्न से और चंद्र से गिनकर।',
  'Actual sign-ingress dates from the transit ingress solver (sidereal, Lahiri; mean nodes for Rahu and Ketu). (R) marks a retrograde re-entry into the previous sign. Dates are UTC.':
    'राशि-प्रवेश की गणना से निकली वास्तविक राशि-प्रवेश तिथियाँ (निरयण, लाहिड़ी; राहु और केतु के लिए मध्यम पात)। (व) का अर्थ है वक्री होकर पिछली राशि में दोबारा प्रवेश। तिथियाँ समन्वित वैश्विक समय के अनुसार हैं।',
  // career-dasha-timeline
  Mahadasha: 'महादशा',
  Age: 'आयु',
  Rules: 'किन भावों का स्वामी',
  'D1 / D10 house': 'D1 / D10 भाव',
  'Career links': 'कार्यक्षेत्र से संबंध',
  'Your Vimshottari Mahadashas with the facts that connect each period lord to work: the houses it rules, where it sits in the birth chart and in the D10, and its direct links to the career houses (2nd, 6th, 10th, 11th).':
    'आपकी विंशोत्तरी महादशाएँ, उन तथ्यों के साथ जो हर दशा के स्वामी को काम से जोड़ते हैं: वह किन भावों का स्वामी है, जन्म कुंडली और D10 में कहाँ स्थित है, और कार्य-भावों (2रा, 6ठा, 10वाँ, 11वाँ) से उसके सीधे संबंध।',
  "Vimshottari dasha from the Moon's nakshatra (engine). Ages are approximate calendar years. Career links are listed facts, not a score.":
    'चंद्र के नक्षत्र से विंशोत्तरी दशा (इंजन)। आयु लगभग कैलेंडर वर्षों में है। कार्यक्षेत्र से संबंध सूचीबद्ध तथ्य हैं, कोई अंक नहीं।',
  // career-antardashas
  Antardasha: 'अंतर्दशा',
  "Sub-lord's career links": 'अंतर्दशा स्वामी के कार्यक्षेत्र संबंध',
  'Antardashas (sub-periods) of the running Mahadasha, Vimshottari proportions.': 'चल रही महादशा की अंतर्दशाएँ, विंशोत्तरी अनुपात में।',
  // career-karmajiva
  "Varahamihira's Karmajiva rule reads the source of livelihood from the Navamsa sign occupied by the lord of the 10th, counted from the Lagna, the Moon and the Sun. The lord of that Navamsa sign is the planet whose nature colours how you earn.":
    'वराहमिहिर का कर्मजीव नियम आजीविका का स्रोत उस नवांश राशि से पढ़ता है जिसमें 10वें भाव का स्वामी स्थित हो; 10वाँ भाव लग्न, चंद्र और सूर्य से गिना जाता है। उस नवांश राशि का स्वामी वह ग्रह है जिसका स्वभाव आपके कमाने के ढंग में झलकता है।',
  'Counted from': 'गिनती कहाँ से',
  '10th sign': '10वीं राशि',
  'Its lord': 'उसका स्वामी',
  "Lord's Navamsa sign": 'स्वामी की नवांश राशि',
  'Livelihood planet': 'आजीविका का ग्रह',
  '10th house sign quality': '10वें भाव की राशि के गुण',
  "10th lord's sign quality": '10वें भाव के स्वामी की राशि के गुण',
  'D10 ascendant quality': 'D10 लग्न के गुण',
  "Brihat Jataka ch. 10 (Karmajiva), using the engine's D9. All three reference points are shown; the text does not pick one by an invented strength score. Element and modality are the standard sign qualities.":
    'बृहज्जातक अध्याय 10 (कर्मजीव), इंजन की D9 कुंडली से। तीनों संदर्भ बिंदु दिखाए गए हैं; किसी गढ़े हुए बल-अंक से इनमें से एक को नहीं चुना गया। तत्व और स्वभाव राशियों के मानक गुण हैं।',
});

// ---------------------------------------------------------------------------
// Fixed vocabularies of the career tables
// ---------------------------------------------------------------------------

export const HOUSE_THEME_HI: Record<number, string> = {
  1: 'स्वयं, ऊर्जा, प्रतिष्ठा', 2: 'कमाई, संसाधन, वाणी', 3: 'पहल, कौशल', 4: 'शिक्षा, आधार',
  5: 'बुद्धि, रचनात्मकता', 6: 'सेवा, नौकरी, प्रतिस्पर्धा', 7: 'साझेदारी, व्यापार, ग्राहक', 8: 'परिवर्तन, शोध',
  9: 'मार्गदर्शक, भाग्य', 10: 'व्यवसाय, पद-प्रतिष्ठा', 11: 'लाभ, संपर्क, लक्ष्य', 12: 'विराम, विदेश',
};

export const KARAKA_NAMES_HI: Record<string, string> = {
  AK: 'आत्मकारक', AMK: 'अमात्यकारक', BK: 'भ्रातृकारक', MK: 'मातृकारक', PK: 'पुत्रकारक', GK: 'ज्ञातिकारक', DK: 'दारकारक', PIK: 'पितृकारक',
};

export const KARAKA_ROLE_HI: Record<string, string> = {
  AK: 'आत्मा का उद्देश्य', AMK: 'कार्यक्षेत्र और परामर्श', BK: 'भाई-बहन, साहस', MK: 'माता, सुख',
  PK: 'संतान, बुद्धि', GK: 'प्रतिस्पर्धी, बाधाएँ', DK: 'जीवनसाथी',
};

/** Sign dignity as printed in the D10 table (calc `SignDignity` short forms). */
export const SIGN_DIGNITY_HI: Record<string, string> = { exalted: 'उच्च', debilitated: 'नीच', 'own sign': 'स्वराशि' };

/** Element and modality of a sign (calc `SignQuality`). */
export const SIGN_QUALITY_HI: Record<string, string> = {
  fire: 'अग्नि तत्व', earth: 'पृथ्वी तत्व', air: 'वायु तत्व', water: 'जल तत्व', movable: 'चर', fixed: 'स्थिर', dual: 'द्विस्वभाव',
};

/** Karmajiva reference points (calc `KarmajivaRow.from`). */
export const KARMAJIVA_FROM_HI: Record<string, string> = { Lagna: 'लग्न', Moon: 'चंद्र', Sun: 'सूर्य' };

/** A value of one of the fixed vocabularies above; an unknown value is a defect, never printed in English. */
export function careerTerm(table: Record<string | number, string>, key: string | number): string {
  const hi = table[key];
  if (hi === undefined) throw new Error(`HINDI_LABEL_MISSING: "${key}"`);
  return hi;
}

// ---------------------------------------------------------------------------
// Short texts produced by the career calculations
// ---------------------------------------------------------------------------

/** "2 years 3 months" (calc `durationText`) in Hindi, same numbers. */
export function durationHi(text: string): string {
  return text.replace(/(\d+) years?/, '$1 वर्ष').replace(/(\d+) months?/, '$1 माह').replace(/(\d+) days?/, '$1 दिन');
}

/** A dasha lord's career link (calc `careerLinksFor`) in Hindi, same numbers. */
export function careerLinkHi(link: string): string {
  let m: RegExpExecArray | null;
  if ((m = /^rules the (\d+)\w+$/.exec(link))) return `${ordinalHi(Number(m[1]), 'oblique')} भाव का स्वामी`;
  if ((m = /^occupies the (\d+)\w+$/.exec(link))) return `${ordinalHi(Number(m[1]), 'oblique')} भाव में स्थित`;
  if ((m = /^aspects the (\d+)\w+$/.exec(link))) return `${ordinalHi(Number(m[1]), 'oblique')} भाव पर दृष्टि`;
  if ((m = /^D10 house (\d+)$/.exec(link))) return `D10 भाव ${m[1]}`;
  if ((m = /^rules the D10 (\d+)\w+$/.exec(link))) return `D10 के ${ordinalHi(Number(m[1]), 'oblique')} भाव का स्वामी`;
  throw new Error(`HINDI_LABEL_MISSING: career link "${link}"`);
}

/** A Sun–Saturn link or a Sun–10th-house link (calc `sunSaturnRelation`, `sunAndTenth`) in Hindi. */
export function govLinkHi(link: string): string {
  let m: RegExpExecArray | null;
  if (link === 'conjunction (same sign)') return 'युति (एक ही राशि)';
  if ((m = /^Saturn aspects the Sun \((\d+)\w+ aspect\)$/.exec(link))) return `शनि की सूर्य पर ${ordinalHi(Number(m[1]), 'feminine')} दृष्टि`;
  if ((m = /^the Sun aspects Saturn \((\d+)\w+ aspect\)$/.exec(link))) return `सूर्य की शनि पर ${ordinalHi(Number(m[1]), 'feminine')} दृष्टि`;
  if (link === 'the Sun rules the 10th house') return 'सूर्य 10वें भाव का स्वामी है';
  if (link === 'the Sun occupies the 10th house') return 'सूर्य 10वें भाव में स्थित है';
  if (link === 'the Sun aspects the 10th house') return 'सूर्य की 10वें भाव पर दृष्टि है';
  throw new Error(`HINDI_LABEL_MISSING: link "${link}"`);
}

// ---------------------------------------------------------------------------
// Yogas: names, families and the engine's observed conditions
// ---------------------------------------------------------------------------

const YOGA_FAMILY_HI: Record<string, string> = {
  MAHAPURUSHA: 'महापुरुष', RAJA: 'राज', DHANA: 'धन', CHANDRA: 'चंद्र', SURYA: 'सूर्य', NEECHA_BHANGA: 'नीच भंग', PARIVARTANA: 'परिवर्तन',
  VIPARITA: 'विपरीत', NABHASA: 'नाभस', AUSPICIOUS: 'शुभ', INAUSPICIOUS: 'सजगता', MISCELLANEOUS: 'अन्य',
};

/** Family of a yoga as printed in the yoga table; "context" marks a yoga outside the career families. */
export function yogaFamilyHi(category: string, relevant: boolean): string {
  return `${YOGA_FAMILY_HI[category] ?? YOGA_FAMILY_HI.MISCELLANEOUS}${relevant ? '' : ' (संदर्भ)'}`;
}

const YOGA_NAME_HI: Record<string, string> = {
  'Adhi Yoga (Chandradhi)': 'अधि योग (चंद्राधि)', 'Amala Yoga': 'अमल योग', 'Anapha Yoga': 'अनफा योग', 'Bhadra Yoga': 'भद्र योग',
  'Budha-Aditya Yoga': 'बुधादित्य योग', 'Chandra-Mangala Yoga': 'चंद्र-मंगल योग', 'Dharma-Karmadhipati Yoga': 'धर्म-कर्माधिपति योग',
  'Durudhara Yoga': 'दुरुधरा योग', 'Gajakesari Yoga': 'गजकेसरी योग', 'Hamsa Yoga': 'हंस योग', 'Harsha Yoga': 'हर्ष योग',
  'Kemadruma Yoga': 'केमद्रुम योग', 'Lakshmi Yoga': 'लक्ष्मी योग', 'Malavya Yoga': 'मालव्य योग', 'Musala Yoga': 'मुसल योग',
  'Nala Yoga': 'नल योग', 'Parivartana Yoga': 'परिवर्तन योग', 'Rajju Yoga': 'रज्जु योग', 'Ruchaka Yoga': 'रुचक योग',
  'Sarala Yoga': 'सरल योग', 'Saraswati Yoga': 'सरस्वती योग', 'Shakata Yoga (Nabhasa)': 'शकट योग (नाभस)', 'Shasha Yoga': 'शश योग',
  'Shringataka Yoga': 'शृंगाटक योग', 'Sunapha Yoga': 'सुनफा योग', 'Ubhayachari Yoga': 'उभयचरी योग', 'Vesi Yoga': 'वेशि योग',
  'Vihaga Yoga': 'विहग योग', 'Vimala Yoga': 'विमल योग', 'Vosi Yoga': 'वोशि योग', 'Vallaki Yoga': 'वल्लकी योग', 'Dama Yoga': 'दाम योग',
  'Pasha Yoga': 'पाश योग', 'Kedara Yoga': 'केदार योग', 'Shula Yoga': 'शूल योग', 'Yuga Yoga': 'युग योग', 'Gola Yoga': 'गोल योग',
};

const PLANET_BY_UPPER: Record<string, string> = Object.fromEntries(Object.entries(PLANET_HI).map(([en, hi]) => [en.toUpperCase(), hi]));
const PLANET_WORD = 'Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu';
const P = `(${PLANET_WORD})`;
const SIGN_WORD = Object.keys(SIGN_HI).join('|');
const DIGNITY_WORD = Object.keys(DIGNITY_HI).join('|');

/** Hindi name of a planet written in any case by the engine ("MARS", "Mars"). */
const pl = (name: string): string => PLANET_BY_UPPER[name.toUpperCase()] ?? name;
const sg = (name: string): string => SIGN_HI[name] ?? name;
/** "A, B" or "[A, B]" planet lists; an empty list or "None" reads "कोई नहीं". */
const planets = (list: string): string => {
  const items = list.replace(/[[\]]/g, '').split(',').map((s) => s.trim()).filter((s) => s && s.toLowerCase() !== 'none');
  return items.length ? items.map(pl).join(', ') : 'कोई नहीं';
};
const ord = (n: string, form: 'direct' | 'oblique' | 'feminine' = 'oblique'): string => ordinalHi(Number(n), form);

/** Lord label inside a yoga name: "Lagna Lord", "9th Lord", with an optional Sanskrit tag "(Bhagya)". */
function lordLabelHi(label: string): string {
  const tags: Record<string, string> = { Dhana: 'धन', Labha: 'लाभ', 'Lakshmi Sthana': 'लक्ष्मी स्थान', Bhagya: 'भाग्य' };
  const m = /^(Lagna|(\d+)\w+) Lord(?: \(([^)]+)\))?$/.exec(label.trim());
  if (!m) return '';
  const base = m[2] ? `${ord(m[2])} भाव का स्वामी` : 'लग्नेश';
  return m[3] ? `${base} (${tags[m[3]] ?? ''})`.replace(' ()', '') : base;
}

const hasLatin = (s: string): boolean => /[A-Za-z]/.test(s.replace(/\bD\d+\b/g, ''));

/** Shown when a yoga name has no Hindi form yet: never the English name. */
export const YOGA_NAME_FALLBACK_HI = 'इंजन द्वारा पाया गया योग';
/** Shown when an engine condition has no Hindi form yet: never the English text. */
export const YOGA_CONDITION_FALLBACK_HI = 'इंजन के शास्त्रीय नियम की शर्तें पूरी हुईं';

/** Hindi name of an engine yoga (`canonicalName`, with the career module's "(formed and cancelled)" mark). */
export function yogaNameHi(name: string): string {
  const cancelled = / \(formed and cancelled\)$/.test(name);
  const base = name.replace(/ \(formed and cancelled\)$/, '');
  const mark = cancelled ? ' (बना, पर भंग हुआ)' : '';
  if (YOGA_NAME_HI[base]) return YOGA_NAME_HI[base] + mark;
  let m: RegExpExecArray | null;
  let out = '';
  if ((m = /^(Maha |Dainya |Khala )?Parivartana Yoga \((\w+)-(\w+)\)$/.exec(base))) {
    const kind = { 'Maha ': 'महा ', 'Dainya ': 'दैन्य ', 'Khala ': 'खल ' }[m[1] ?? ''] ?? '';
    out = `${kind}परिवर्तन योग (${pl(m[2])}-${pl(m[3])})`;
  } else if ((m = /^Neecha Bhanga Raja Yoga \((\w+)\)$/.exec(base))) {
    out = `नीच भंग राज योग (${pl(m[1])})`;
  } else if ((m = /^Raja Yoga \(Yogakaraka (\w+): (.+) \+ (.+)\)$/.exec(base))) {
    out = `राज योग (योगकारक ${pl(m[1])}: ${lordLabelHi(m[2])} + ${lordLabelHi(m[3])})`;
  } else if ((m = /^(Raja|Dhana) Yoga \((.+) \+ (.+)\)$/.exec(base))) {
    out = `${m[1] === 'Raja' ? 'राज' : 'धन'} योग (${lordLabelHi(m[2])} + ${lordLabelHi(m[3])})`;
  }
  return (out && !hasLatin(out) ? out : YOGA_NAME_FALLBACK_HI) + mark;
}

/** One relation between two house lords (yoga-assessment `lordRelation` parts). */
function relationPartHi(part: string): string {
  let m: RegExpExecArray | null;
  if ((m = new RegExp(`^conjunct in (${SIGN_WORD})$`).exec(part))) return `${sg(m[1])} राशि में युति`;
  if ((m = new RegExp(`^in sign exchange \\((\\w+) in (${SIGN_WORD}), (\\w+) in (${SIGN_WORD})\\)$`).exec(part))) {
    return `राशि परिवर्तन (${pl(m[1])} ${sg(m[2])} में, ${pl(m[3])} ${sg(m[4])} में)`;
  }
  if ((m = /^in mutual aspect \((\d+)TH_MUTUAL_OPPOSITION\)$/.exec(part))) return `परस्पर ${ord(m[1], 'feminine')} दृष्टि`;
  if (/^in mutual aspect \(/.test(part)) return 'परस्पर दृष्टि';
  return part;
}

/** "Lord of H1 (MARS) and Lord of H9 (JUPITER) conjunct in Leo; in mutual aspect (...)" and the Yogakaraka forms. */
function lordRelationHi(text: string): string | undefined {
  let m: RegExpExecArray | null;
  if ((m = /^Lord of H(\d+) \((\w+)\) and Lord of H(\d+) \((\w+)\) (.+)$/.exec(text))) {
    const parts = m[5].split('; ').map(relationPartHi);
    return `${ord(m[1])} भाव का स्वामी (${pl(m[2])}) और ${ord(m[3])} भाव का स्वामी (${pl(m[4])}): ${parts.join('; ')}`;
  }
  if ((m = /^Yogakaraka: (\w+) owns both kendra (\d+) and trikona (\d+)$/.exec(text))) {
    return `योगकारक: ${pl(m[1])} केंद्र भाव ${m[2]} और त्रिकोण भाव ${m[3]} दोनों का स्वामी है`;
  }
  if ((m = /^(\w+) owns both the (\d+)\w+ and the (\d+)\w+$/.exec(text))) {
    return `${pl(m[1])} ${ord(m[2])} और ${ord(m[3])} दोनों भावों का स्वामी है`;
  }
  return undefined;
}

const dignity = (d: string): string => DIGNITY_HI[d] ?? d;

/** Each rule: the engine's condition text (as `yogaConditionText` prints it) and its Hindi form. */
const CONDITION_RULES: Array<[RegExp, (m: RegExpExecArray) => string]> = [
  // Mahapurusha
  [/^(\w+) occupy a Kendra house \(1, 4, 7, 10\) from Lagna: (\d+)$/, (m) => `${pl(m[1])} लग्न से केंद्र भाव (1, 4, 7, 10) में है: भाव ${m[2]}`],
  [new RegExp(`^(\\w+) is in own sign, moolatrikona, or exaltation sign: (${DIGNITY_WORD})$`), (m) => `${pl(m[1])} स्वराशि, मूलत्रिकोण या उच्च राशि में है: ${dignity(m[2])}`],
  // Chandra yogas
  [/^Jupiter is in a Kendra house \(1, 4, 7, 10\) from the natal Moon: (\d+)$/, (m) => `गुरु जन्म के चंद्र से केंद्र भाव (1, 4, 7, 10) में है: भाव ${m[1]}`],
  [new RegExp(`^Planets other than (?:Sun|Moon)/Rahu/Ketu in (\\d+)\\w+ house from ${P}: (.+)$`), (m) => `${pl(m[2])} से ${ord(m[1])} भाव में ग्रह (${m[2] === 'Moon' ? 'सूर्य' : 'चंद्र'}, राहु, केतु को छोड़कर): ${planets(m[3])}`],
  [new RegExp(`^(\\d+)\\w+ house from ${P} is vacant of eligible planets: (\\d+)$`), (m) => `${pl(m[2])} से ${ord(m[1])} भाव में कोई मान्य ग्रह नहीं: ${m[3]}`],
  [new RegExp(`^Eligible planets in both 2nd and 12th houses from ${P}: 2nd: (\\[.*?\\]), 12th: (\\[.*?\\])$`), (m) => `${pl(m[1])} से 2रे और 12वें दोनों भावों में मान्य ग्रह: 2रा: ${planets(m[2])}; 12वाँ: ${planets(m[3])}`],
  [/^No eligible planets \(excluding Sun\/Rahu\/Ketu\) in 2nd, 12th, or conjunct Moon: 2nd: (\d+), 12th: (\d+), Conjunct: (\d+)$/, (m) => `चंद्र से 2रे, 12वें भाव में या चंद्र के साथ कोई मान्य ग्रह नहीं (सूर्य, राहु, केतु को छोड़कर): 2रा: ${m[1]}, 12वाँ: ${m[2]}, युति: ${m[3]}`],
  [/^Kemadruma Bhanga \(cancellation\): a planet occupies a kendra from the Lagna or from the Moon\. satisfied = cancellation holds: Cancelled by: Lagna Kendras (\[.*?\]), Moon Kendras (\[.*?\])$/, (m) => `केमद्रुम भंग: लग्न या चंद्र से केंद्र में ग्रह हैं। लग्न से केंद्र में: ${planets(m[1])}; चंद्र से केंद्र में: ${planets(m[2])}`],
  [/^A planet \(Mars\.\.Saturn\) in a kendra from the (Lagna|Moon): (.+)$/, (m) => `${m[1] === 'Moon' ? 'चंद्र' : 'लग्न'} से केंद्र में ग्रह (मंगल से शनि तक): ${planets(m[2])}`],
  [/^Natural benefics \(Jupiter, Venus, Mercury\) situated in 6th, 7th, or 8th houses from Moon: 6th: (\[.*?\]), 7th: (\[.*?\]), 8th: (\[.*?\])$/, (m) => `चंद्र से 6ठे, 7वें या 8वें भाव में नैसर्गिक शुभ ग्रह (गुरु, शुक्र, बुध): 6ठा: ${planets(m[1])}; 7वाँ: ${planets(m[2])}; 8वाँ: ${planets(m[3])}`],
  [new RegExp(`^${P} and ${P} (?:is )?conjunct in (?:the )?same sign: Conjunct in (${SIGN_WORD})(?: \\(House (\\d+)\\))?$`), (m) => `${pl(m[1])} और ${pl(m[2])} एक ही राशि में युति में हैं: ${sg(m[3])}${m[4] ? ` (भाव ${m[4]})` : ''}`],
  [/^Natural benefic \(Jupiter, Venus, Mercury\) occupying the 10th house from Lagna or Moon: From Lagna: (\[.*?\]), From Moon: (\[.*?\])$/, (m) => `लग्न या चंद्र से 10वें भाव में नैसर्गिक शुभ ग्रह (गुरु, शुक्र, बुध): लग्न से: ${planets(m[1])}; चंद्र से: ${planets(m[2])}`],
  // Gajakesari qualifiers (formed and cancelled)
  [new RegExp(`^Jupiter debilitated \\(BPHS qualifier: .*\\): (${DIGNITY_WORD})$`), (m) => `गुरु नीच राशि में है (शास्त्र के अनुसार इस योग में गुरु नीच नहीं होना चाहिए): ${dignity(m[1])}`],
  [/^Jupiter combust \(BPHS qualifier: .*\): combust$/, () => 'गुरु अस्त है (शास्त्र के अनुसार इस योग में गुरु अस्त नहीं होना चाहिए)'],
  [new RegExp(`^Jupiter in an enemy's sign \\(BPHS qualifier: .*\\); compound relationship with the sign lord: (${DIGNITY_WORD})$`), (m) => `गुरु शत्रु राशि में है (शास्त्र के अनुसार इस योग में गुरु शत्रु राशि में नहीं होना चाहिए): ${dignity(m[1])}`],
  [/^Jupiter also in a kendra from the Lagna \(BPHS form allows Lagna or Moon as reference\): Jupiter in house (\d+) from the Lagna$/, (m) => `गुरु लग्न से भी केंद्र में है: लग्न से भाव ${m[1]}`],
  // Parivartana
  [new RegExp(`^(\\w+) occupies sign of (\\w+) and \\w+ occupies sign of \\w+: \\w+ in (${SIGN_WORD}) \\(ruled by \\w+\\), \\w+ in (${SIGN_WORD}) \\(ruled by \\w+\\)$`), (m) => `${pl(m[1])} ${pl(m[2])} की राशि ${sg(m[3])} में है और ${pl(m[2])} ${pl(m[1])} की राशि ${sg(m[4])} में`],
  [/^Exchange between House (\d+) and House (\d+) classified as (MAHA|DAINYA|KHALA) Yoga: House \d+ <-> House \d+$/, (m) => `भाव ${m[1]} और भाव ${m[2]} के बीच का यह राशि परिवर्तन ${{ MAHA: 'महा', DAINYA: 'दैन्य', KHALA: 'खल' }[m[3] as 'MAHA' | 'DAINYA' | 'KHALA']} परिवर्तन योग कहलाता है`],
  // Viparita
  [/^(\d+)\w+ house lord \((\w+)\) is placed in a Dusthana house \(6th, 8th, or 12th\): (\d+)$/, (m) => `${ord(m[1])} भाव का स्वामी (${pl(m[2])}) त्रिक भाव (6ठा, 8वाँ या 12वाँ) में स्थित है: भाव ${m[3]}`],
  [/^(\d+)\w+ lord (\w+) also owns a kendra or trikona: \w+ owns houses (.+)$/, (m) => `${ord(m[1])} भाव का स्वामी ${pl(m[2])} केंद्र या त्रिकोण का भी स्वामी है: उसके भाव ${m[3]}`],
  [/^(\d+)\w+ lord (\w+) associated \(conjunction, mutual aspect or sign exchange\) with a kendra or trikona lord: (.+)$/, (m) => {
    const rel: Record<string, string> = { CONJUNCTION: 'युति', MUTUAL_ASPECT: 'परस्पर दृष्टि', SIGN_EXCHANGE: 'राशि परिवर्तन' };
    const links = m[3].split('; ').map((x) => {
      const a = /^H(\d+) lord (\w+): ([A-Z_+]+)$/.exec(x);
      return a ? `${ord(a[1])} भाव का स्वामी ${pl(a[2])} (${a[3].split('+').map((r) => rel[r] ?? '').filter(Boolean).join(', ')})` : x;
    });
    return `${ord(m[1])} भाव का स्वामी ${pl(m[2])} केंद्र या त्रिकोण के स्वामी से जुड़ा है: ${links.join('; ')}`;
  }],
  // Neecha Bhanga
  [new RegExp(`^(\\w+) is situated in its debilitation sign \\((${SIGN_WORD})\\): Rashi (\\d+) \\((?:${SIGN_WORD})\\)$`), (m) => `${pl(m[1])} अपनी नीच राशि (${sg(m[2])}) में है: राशि ${m[3]}`],
  [/^Lord of (debilitation|exaltation) sign \((\w+)\) is in Kendra from (Lagna|Moon): (\d+)$/, (m) => `${m[1] === 'debilitation' ? 'नीच' : 'उच्च'} राशि का स्वामी (${pl(m[2])}) ${m[3] === 'Moon' ? 'चंद्र' : 'लग्न'} से केंद्र में है: भाव ${m[4]}`],
  [new RegExp(`^(\\w+) is conjunct an exalted planet \\(.*\\): (\\w+) \\((?:${DIGNITY_WORD})\\)(?:, .*)?$`), (m) => `${pl(m[1])} उच्च ग्रह के साथ युति में है: ${pl(m[2])}`],
  // Nabhasa
  [/^All 7 classical planets \(Sun\.\.Saturn\) occupy (Movable \(Chara\)|Fixed \(Sthira\)|Dual \(Dvisvabhava\)) signs \(([\d, ]+)\): (\d+) planets in \w+ signs$/, (m) => `सातों शास्त्रीय ग्रह (सूर्य से शनि) ${m[1].startsWith('Movable') ? 'चर' : m[1].startsWith('Fixed') ? 'स्थिर' : 'द्विस्वभाव'} राशियों (${m[2]}) में हैं: ${m[3]} ग्रह`],
  [/^All 7 classical planets occupy exclusively the Trikona houses \(1, 5, 9\): Occupied houses: \[([\d, ]*)\]$/, (m) => `सातों शास्त्रीय ग्रह केवल त्रिकोण भावों (1, 5, 9) में हैं: भाव ${m[1]}`],
  [/^All 7 classical planets occupy exclusively the (\d+)\w+ and (\d+)\w+ houses: Occupied houses: \[([\d, ]*)\]$/, (m) => `सातों शास्त्रीय ग्रह केवल ${ord(m[1])} और ${ord(m[2])} भावों में हैं: भाव ${m[3]}`],
  [/^All 7 classical planets occupy exactly (\d+) signs: (\d+) signs \(Rashis: \[([\d, ]*)\]\)$/, (m) => `सातों शास्त्रीय ग्रह ठीक ${m[1]} राशियों में हैं: ${m[2]} राशियाँ (राशि क्रमांक ${m[3]})`],
  // Surya qualifier (formed and cancelled)
  [/^Mercury within its combustion orb of the Sun \(.*\): ([\d.]+)° from the Sun$/, (m) => `बुध सूर्य से अस्त की दूरी के भीतर है: सूर्य से ${m[1]}°`],
  // Raja / Dhana
  [/^9th lord \((\w+)\) and 10th lord \((\w+)\) is related by conjunction, mutual aspect or sign exchange, or be the same planet: (.+)$/, (m) => lordRelationHi(m[3]) ?? ''],
  [/^(\w+) also owns the 8th or 11th house: \w+ owns houses (.+)$/, (m) => `${pl(m[1])} 8वें या 11वें भाव का भी स्वामी है: उसके भाव ${m[2]}`],
  [/^9th lord \((\w+)\) occupy Kendra or Trikona house: (\d+)$/, (m) => `9वें भाव का स्वामी (${pl(m[1])}) केंद्र या त्रिकोण भाव में है: भाव ${m[2]}`],
  [new RegExp(`^9th lord \\((\\w+)\\) is exalted, moolatrikona, or in own sign: (${DIGNITY_WORD})$`), (m) => `9वें भाव का स्वामी (${pl(m[1])}) उच्च, मूलत्रिकोण या स्वराशि में है: ${dignity(m[2])}`],
  [/^Lagna lord \((\w+)\) is well placed in Kendra or Trikona: (\d+)$/, (m) => `लग्नेश (${pl(m[1])}) केंद्र या त्रिकोण में अच्छी स्थिति में है: भाव ${m[2]}`],
  [/^Jupiter, Venus, and Mercury all occupy Kendra, Trikona, or 2nd house from Lagna: Jupiter: H(\d+), Venus: H(\d+), Mercury: H(\d+)$/, (m) => `गुरु, शुक्र और बुध तीनों लग्न से केंद्र, त्रिकोण या 2रे भाव में हैं: गुरु भाव ${m[1]}, शुक्र भाव ${m[2]}, बुध भाव ${m[3]}`],
  [new RegExp(`^Jupiter not be debilitated: (${DIGNITY_WORD})$`), (m) => `गुरु नीच राशि में नहीं है: ${dignity(m[1])}`],
];

/**
 * Hindi form of one observed yoga condition (the text `yogaConditionText` and the career module
 * print in the yoga table). A condition without a Hindi form reads as the fallback sentence.
 */
export function yogaConditionHi(condition: string): string {
  const relation = lordRelationHi(condition);
  let out = relation ?? '';
  if (!out) {
    for (const [re, render] of CONDITION_RULES) {
      const m = re.exec(condition);
      if (m) {
        out = render(m);
        break;
      }
    }
  }
  return out && !hasLatin(out) ? out : YOGA_CONDITION_FALLBACK_HI;
}

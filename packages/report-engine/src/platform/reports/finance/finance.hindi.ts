/**
 * Finance Report: Hindi edition (display text only).
 * Structure, evidence and objectives are those of finance.definition.ts; the
 * block wording below restates finance.blocks.ts sentence for sentence.
 */
import { HindiEdition } from '../../i18n/hindi';
import { addTerms, Lang, ordOblique, planetText } from '../_finance-couple-shared/shared.hindi';
import { FINANCE_YEARS } from './finance.calc';

const YEAR_WORDS_HI = ['पहला', 'दूसरा', 'तीसरा', 'चौथा', 'पाँचवाँ'];

const yearSections = Object.fromEntries(Array.from({ length: FINANCE_YEARS }, (_, i) => [
  `outlook-year-${i + 1}`,
  {
    title: `आर्थिक परिदृश्य: ${YEAR_WORDS_HI[i]} वर्ष`,
    kicker: `खंड ${6 + i}`,
    intro: 'पूरे कैलेंडर वर्ष को गुरु और शनि के गोचर से पढ़ा गया है, आपके लग्न और आपके चंद्र से गिनकर, और साथ में उन दशाओं के साथ जो इस दौरान चल रही हैं।',
  },
]));

const yearTopics = Object.fromEntries(Array.from({ length: FINANCE_YEARS }, (_, i) => i + 1).flatMap((n) => [
  [`year-${n}-transits`, { title: 'गोचर और दशाओं में यह वर्ष' }],
  [`year-${n}-overview`, { title: 'वर्ष का आर्थिक स्वर', subtitle: 'गुरु, शनि और आपके धन भाव' }],
  [`year-${n}-months`, { title: 'माह दर माह धन मार्गदर्शन', subtitle: 'ऊपर दी गई मासिक तालिका के आधार पर' }],
]));

export const FINANCE_HINDI: HindiEdition = {
  title: 'धन एवं वित्त रिपोर्ट',
  subtitle: 'आपकी वैदिक कुंडली से आपके धन भाव, सहायक ग्रह और पाँच वर्ष का आर्थिक परिदृश्य',
  description:
    'धन भाव (दूसरा, पाँचवाँ, नौवाँ, ग्यारहवाँ) उनके स्वामियों, स्थित ग्रहों और अष्टकवर्ग सहित, गणना इंजन द्वारा पहचाने गए धन योग, होरा (D2), नवांश और दशमांश, लग्न के अनुसार ग्रहों का स्वभाव, विंशोत्तरी दशाएँ और गुरु तथा शनि पर आधारित पाँच वर्ष का आर्थिक परिदृश्य, मासिक दृष्टि सहित।',
  sections: {
    'wealth-chart': {
      title: 'आपकी धन कुंडली एक नज़र में',
      kicker: 'आपकी कुंडली',
      intro: 'इस रिपोर्ट का गणना-आधार: आपका जन्म विवरण पत्रक, पूरी ग्रह तालिका और धन के विश्लेषण में काम आने वाली कुंडलियाँ।',
    },
    'wealth-houses': {
      title: 'धन के भाव',
      kicker: 'खंड 1',
      intro: 'शास्त्रीय ज्योतिष धन को चार भावों से पढ़ता है: जो आपके पास संचित है (दूसरा), जिसमें आप अपनी बुद्धि लगाते हैं (पाँचवाँ), जो भाग्य की कृपा से मिलता है (नौवाँ) और जो आपको लाभ के रूप में मिलता है (ग्यारहवाँ)।',
    },
    'money-personality': {
      title: 'धन के प्रति आपका स्वभाव',
      kicker: 'खंड 2',
      intro: 'आप स्वाभाविक रूप से धन को कैसे देखते हैं: आपका स्वभाव (लग्न), सुरक्षा से आपका भावनात्मक रिश्ता (चंद्र) और होरा कुंडली, जिसे शास्त्रीय ज्योतिष विशेष रूप से धन के लिए देखता है।',
    },
    'wealth-yogas': {
      title: 'धन योग',
      kicker: 'खंड 3',
      intro: 'समृद्धि के शास्त्रीय ग्रह योग, जो तभी सूचीबद्ध होते हैं जब हमारा योग इंजन उन्हें आपकी कुंडली में पाता है।',
    },
    expenses: {
      title: 'ऋण, व्यय और सुरक्षा',
      kicker: 'खंड 4',
      intro: 'छठा, आठवाँ और बारहवाँ भाव ऋण, अचानक आने वाले बदलाव और व्यय को दर्शाते हैं। इन्हें समझना ही आपकी बनाई पूँजी की सबसे अच्छी सुरक्षा है।',
    },
    'planetary-allies': {
      title: 'आपके सहायक ग्रह',
      kicker: 'खंड 5',
      intro: 'आपके लग्न के शास्त्रीय स्वामित्व नियमों के अनुसार कौन-से ग्रह आपके आर्थिक जीवन में सहायक हैं और कौन-से सावधानी माँगते हैं। यह रत्नों की "शक्ति" के प्रतिशत की जगह लेता है, जिनका कोई शास्त्रीय आधार नहीं है।',
    },
    ...yearSections,
    'dasha-analysis': {
      title: 'धन के लिए दशा विश्लेषण',
      kicker: 'खंड 11',
      intro: 'विंशोत्तरी दशाएँ आर्थिक जीवन की लंबी लय तय करती हैं। यहाँ चल रही महादशा और इस अवधि में पड़ने वाली हर अंतर्दशा दी गई है।',
    },
    practices: {
      title: 'धन के लिए नैतिक आचरण',
      kicker: 'खंड 12',
      intro: 'शास्त्रीय ज्योतिष हर फलादेश के साथ आचरण को जोड़ता है। इन अभ्यासों पर कोई खर्च नहीं आता; ये केवल निरंतरता माँगते हैं।',
    },
  },
  topics: {
    'birth-summary': { title: 'जन्म विवरण पत्रक', subtitle: 'लग्न, चंद्र, पंचांग और अवकहड़ा' },
    'planet-table': { title: 'ग्रहों की स्थिति', subtitle: 'हर ग्रह की राशि, अंश, नक्षत्र, स्वामित्व और कारक' },
    'main-charts': { title: 'जन्म कुंडली और चंद्र कुंडली' },
    'wealth-charts': { title: 'धन की वर्ग कुंडलियाँ', subtitle: 'होरा, नवांश, दशमांश और सर्वाष्टकवर्ग' },
    vimshottari: { title: 'विंशोत्तरी महादशाएँ' },
    'wealth-houses-table': { title: 'आपके धन भाव' },
    'second-house': { title: 'धन, परिवार और वाणी', subtitle: 'संचित धन का दूसरा भाव' },
    'eleventh-house': { title: 'लाभ और आय के स्रोत', subtitle: 'इच्छापूर्ति का ग्यारहवाँ भाव' },
    'fifth-ninth': { title: 'बुद्धि का निवेश और भाग्य की कृपा', subtitle: 'पाँचवाँ और नौवाँ भाव' },
    'earning-power': { title: 'व्यवसाय: आय का आधार', subtitle: 'दसवाँ भाव और दशमांश (D10)' },
    personality: { title: 'व्यक्तित्व और समृद्धि', subtitle: 'आपका लग्न, उसका स्वामी और आपका नवांश' },
    'moon-and-money': { title: 'चंद्र और आर्थिक सुरक्षा', subtitle: 'भावनाएँ, सुख-सुविधा और खर्च' },
    'hora-table': { title: 'होरा कुंडली (D2)', subtitle: 'धन के दो पहलू' },
    'hora-reading': { title: 'कमाना और सहेजना', subtitle: 'होरा का संतुलन क्या संकेत देता है' },
    'dhana-yoga-table': { title: 'आपकी कुंडली के धन योग' },
    'dhana-yogas': { title: 'अपने धन योगों को समझना' },
    'trik-table': { title: 'व्यय के भाव' },
    'trik-houses': { title: 'ऋण, अचानक घटनाएँ और व्यय', subtitle: 'आपके छठे, आठवें और बारहवें भाव के स्वामी' },
    'savings-discipline': { title: 'बचत का सहारा बनाना', subtitle: 'आपके अष्टकवर्ग में लाभ बनाम व्यय' },
    'functional-table': { title: 'लग्न के अनुसार ग्रहों का स्वभाव' },
    'dasha-nature-table': { title: 'महादशाएँ और उनके आर्थिक विषय' },
    'planetary-allies-reading': { title: 'अपने सहायक ग्रहों के साथ चलना', subtitle: 'धन के लिए सहायक और अधिक ध्यान माँगने वाले ग्रह' },
    ...yearTopics,
    'dasha-window-table': { title: 'इस अवधि की दशाएँ' },
    'current-mahadasha': { title: 'चल रही महादशा', subtitle: 'इसका दीर्घकालिक आर्थिक विषय' },
    antardashas: { title: 'इस अवधि की अंतर्दशाएँ', subtitle: 'एक-एक अंतर्दशा' },
    'next-mahadasha': { title: 'आगे की ओर: अगली महादशा' },
    'wealth-practices': { title: 'समृद्धि के लिए अभ्यास', subtitle: 'भक्तिमय और नैतिक, कुछ भी खरीदना नहीं' },
    'money-habits': { title: 'आपका अपना धन दिशासूचक', subtitle: 'पूरी रिपोर्ट का सार' },
  },
};

// ------------------------------------------------------- block vocabulary --

addTerms({
  // Birth data sheet
  Factor: 'विवरण', 'Your chart': 'आपकी कुंडली',
  'Ascendant (Lagna)': 'लग्न', 'Moon sign and nakshatra': 'चंद्र राशि और नक्षत्र', 'Tithi at birth': 'जन्म की तिथि',
  'Yoga and Karana at birth': 'जन्म का योग और करण', 'Avakahada: Varna, Vashya': 'अवकहड़ा: वर्ण, वश्य',
  'Avakahada: Yoni, Gana, Nadi': 'अवकहड़ा: योनि, गण, नाड़ी', 'Avakahada: Tatwa, Paya, Name syllable': 'अवकहड़ा: तत्व, पाया, नामाक्षर',
  'Vimshottari balance at birth': 'जन्म के समय विंशोत्तरी शेष', 'Running periods': 'चल रही दशाएँ',
  // Chart captions
  'Birth chart (Rasi, D1)': 'जन्म कुंडली (राशि, D1)', 'Moon chart (Chandra Lagna)': 'चंद्र कुंडली (चंद्र लग्न)',
  'Hora (D2) - wealth': 'होरा (D2) - धन', 'Navamsa (D9) - inner strength': 'नवांश (D9) - भीतरी बल',
  'Dasamsa (D10) - profession': 'दशमांश (D10) - कर्मक्षेत्र', 'Sarvashtakavarga - bindus per house': 'सर्वाष्टकवर्ग - प्रति भाव बिंदु',
  // House tables
  Theme: 'विषय', 'Lord placed': 'स्वामी की स्थिति', Occupants: 'स्थित ग्रह', "Lord's nature": 'स्वामी का स्वभाव',
  'Self, health, overall vitality': 'स्वयं, स्वास्थ्य, समग्र ऊर्जा', 'Savings, family wealth, speech': 'बचत, पारिवारिक धन, वाणी',
  'Effort, courage, enterprise': 'प्रयास, साहस, उद्यम', 'Property, vehicles, home comforts': 'संपत्ति, वाहन, घर के सुख',
  'Intelligence, investments, speculation': 'बुद्धि, निवेश, सट्टा', 'Debts, loans, competition, service': 'ऋण, उधार, प्रतिस्पर्धा, सेवा',
  'Partnerships, business dealings': 'साझेदारी, व्यापारिक लेन-देन', 'Sudden gains or losses, inheritance, insurance': 'अचानक लाभ या हानि, विरासत, बीमा',
  'Fortune, grace, long-term luck': 'भाग्य, कृपा, दीर्घकालिक सौभाग्य', 'Profession, status, earned income': 'व्यवसाय, प्रतिष्ठा, अर्जित आय',
  'Gains, income streams, fulfilment of wishes': 'लाभ, आय के स्रोत, इच्छापूर्ति', 'Expenditure, investments abroad, letting go': 'व्यय, विदेश में निवेश, त्याग',
  'Gains and outgo in the Ashtakavarga': 'अष्टकवर्ग में लाभ और व्यय',
  // Hora
  'Natal position': 'जन्म स्थिति', Hora: 'होरा', 'Classical emphasis': 'शास्त्रीय संकेत',
  "Sun's hora (Leo)": 'सूर्य की होरा (सिंह)', "Moon's hora (Cancer)": 'चंद्र की होरा (कर्क)',
  'Earning through effort, authority, visibility': 'प्रयास, अधिकार और पहचान से कमाना',
  'Accumulating through care, saving, nurturing': 'देखभाल, बचत और सहेजने से जोड़ना',
  // Yogas
  Yoga: 'योग', 'Conditions met in your chart': 'आपकी कुंडली में पूरी हुई शर्तें',
  // Functional nature and dashas
  'In house': 'स्थित भाव', 'Functional nature': 'लग्न अनुसार स्वभाव', Why: 'कारण',
  'Wealth links (2/5/9/11)': 'धन भावों से संबंध (2/5/9/11)', '6/8/12 links': '6/8/12 से संबंध',
  Dates: 'तिथियाँ', 'AD lord in': 'स्वामी स्थित', 'AD lord rules': 'स्वामी के भाव', Nature: 'स्वभाव', 'Wealth links': 'धन भावों से संबंध',
  // Year outlook
  'Dasha periods this year:': 'इस वर्ष की दशाएँ:', 'From Lagna': 'लग्न से', 'From Moon': 'चंद्र से', Gochara: 'गोचर', 'Wealth houses': 'धन भाव',
  favourable: 'अनुकूल', 'MONTH BY MONTH': 'माह दर माह', Month: 'माह',
  'Jupiter: sign, house from Lagna/Moon': 'गुरु: राशि, लग्न/चंद्र से भाव', 'Saturn: sign, house from Lagna/Moon': 'शनि: राशि, लग्न/चंद्र से भाव',
  'Dasha (MD-AD)': 'दशा (महा-अंतर)', 'Wealth contact': 'धन संपर्क',
});

/** Method notes and fixed passages of the Finance blocks, in Hindi. */
export const FINANCE_HI = {
  summaryMethod:
    'पंचांग के अंग जन्म के क्षण पर सूर्य और चंद्र के अंतर से; अवकहड़ा चक्र चंद्र की राशि और नक्षत्र से (गणना इंजन)। वार नहीं दिखाया गया है, क्योंकि इंजन का वार स्थानीय सूर्योदय के नियम से नहीं, यूटीसी तिथि से लिया जाता है।',
  chartsMainMethod:
    'उत्तर भारतीय शैली; अंक राशियाँ हैं (1 = मेष ... 12 = मीन); ऊपर का बीच वाला खाना 1ला भाव है। चंद्र कुंडली में भाव चंद्र की राशि से गिने जाते हैं। व = वक्री।',
  chartsWealthMethod:
    'वर्ग कुंडलियाँ गणना इंजन के वर्ग नियमों (पाराशरी) से बनी हैं। सर्वाष्टकवर्ग कुंडली में हर भाव में सातों ग्रहों से मिले कुल बिंदु दिखाए गए हैं (कुल 337; औसत 28)।',
  vimshottariMethod: 'विंशोत्तरी महादशाएँ जन्म के समय चंद्र के नक्षत्र से (120 वर्ष का चक्र, 365.25 दिन का वर्ष)।',
  wealthHousesIntro:
    '2रा (संचित धन), 5वाँ (निवेश), 9वाँ (भाग्य) और 11वाँ (लाभ) भाव शास्त्रीय धन भाव हैं; 1ला और 10वाँ भाव, यानी स्वयं और कर्मक्षेत्र, इन्हें गति देने वाली शक्ति हैं।',
  wealthHousesMethod:
    'संपूर्ण राशि भाव पद्धति। बिंदु = भाव की राशि के सर्वाष्टकवर्ग बिंदु (28 शास्त्रीय औसत है; अधिक बिंदु बताते हैं कि उस भाव के काम अधिक सहजता से चलते हैं)। स्वामी का स्वभाव: इस लग्न के लिए लग्न-आधारित स्वभाव (देखें खंड "आपके सहायक ग्रह")।',
  gainsExceed: '11वें भाव के बिंदु 12वें से अधिक हैं; शास्त्रीय अष्टकवर्ग इसे आय के व्यय से अधिक रहने की प्रवृत्ति के रूप में पढ़ता है।',
  outgoExceeds: '12वें भाव के बिंदु 11वें के बराबर या उससे अधिक हैं; शास्त्रीय अष्टकवर्ग के अनुसार ऐसी कुंडली को सोच-समझकर बनाए गए बजट से लाभ होता है।',
  trikMethod:
    '6ठा, 8वाँ और 12वाँ भाव (दुःस्थान) ऋण, अचानक होने वाली घटनाओं और व्यय से जुड़े हैं; 3रा भाव अपने प्रयास का है। लाभ बनाम व्यय का नियम: 11वें और 12वें भाव के सर्वाष्टकवर्ग बिंदुओं की तुलना (शास्त्रीय अष्टकवर्ग पद्धति)।',
  horaMethod:
    'पाराशरी होरा: हर राशि 15° पर दो भागों में बँटती है; विषम राशियों में पहला भाग सूर्य की होरा (सिंह) और दूसरा चंद्र की होरा (कर्क) होता है, सम राशियों में इसका उलटा। "शास्त्रीय संकेत" वाला स्तंभ दोनों होराओं का पारंपरिक अर्थ दोहराता है, कोई भविष्यवाणी नहीं।',
  noYogaCard:
    'हमारे योग इंजन को इस कुंडली में कोई शास्त्रीय धन योग या लक्ष्मी योग नहीं मिला। ऐसा होना सामान्य है और यह धन के बारे में कोई निर्णय नहीं है: शास्त्रीय फलित में 2रे और 11वें भाव के स्वामियों की स्थिति, दशाओं का क्रम और निरंतर प्रयास किसी एक योग की तुलना में आर्थिक जीवन को कहीं अधिक गढ़ते हैं।',
  noYogaMethod: 'केवल वही योग सूचीबद्ध होते हैं जिन्हें गणना इंजन ने पहचाना है (धन योग वर्ग और लक्ष्मी योग); इस कुंडली में कोई नहीं मिला।',
  yogaMethod:
    'केवल वही योग सूचीबद्ध हैं जिन्हें गणना इंजन ने पहचाना है (धन योग वर्ग और लक्ष्मी योग); शर्तें इंजन के नियम-प्रमाण से ली गई हैं। कोई योग हाथ से नहीं जोड़ा गया।',
  yogaConventionFallback: 'शास्त्रीय पाराशरी नियम',
  functionalMethodTail: ' यह प्रतिशत वाले "रत्न शक्ति" अंकों की जगह लेता है, जिनका कोई शास्त्रीय नियम नहीं है।',
  dashaNatureMethod:
    '"N का स्वामी" = दशा का स्वामी उस भाव का स्वामी है; "N में" = वह उस भाव में बैठा है। शास्त्रीय दशा फल: कोई दशा उन भावों के फल देती है जिनका उसका स्वामी मालिक है और जिसमें वह बैठा है। मोटे अक्षर = चल रही दशा।',
  dashaWindowMethod:
    'पाँच वर्ष की अवधि में पड़ने वाली सभी विंशोत्तरी अंतर्दशाएँ। "स्वामी" = अंतर्दशा का स्वामी। हर अंतर्दशा महादशा में उन भावों का रंग भरती है जिनका उसका स्वामी मालिक है और जिसमें वह बैठा है (शास्त्रीय पाराशरी दशा फल)। मोटे अक्षर = चल रही दशा।',
};

/** Method note of a year block; `jupiter` and `saturn` are the favourable houses from the Moon, already formatted. */
export const yearMethodHi = (jupiter: string, saturn: string): string =>
  `राशि-अवधियाँ गोचर के राशि-प्रवेश की गणना (लाहिरी) से; (व) = वक्री होकर पुनः प्रवेश; "क/ख" = लग्न से भाव / चंद्र से भाव। गोचर (फलदीपिका अ. 26): गुरु चंद्र से ${jupiter} भाव में और शनि ${saturn} भाव में अनुकूल माना जाता है; तारांकन इन्हें दर्शाता है। वेध लागू नहीं किया गया है। धन संपर्क = ग्रह लग्न से 2रे, 5वें, 9वें या 11वें भाव में बैठा है या उस पर दृष्टि डालता है (गुरु 5/7/9, शनि 3/7/10)। प्रतिशत अंक नहीं दिए गए हैं: किसी शास्त्रीय नियम में इनकी परिभाषा नहीं है।`;

/**
 * A `planetWealthLink` phrase in the report language: "rules 2nd & 5th" becomes
 * "2रे और 5वें का स्वामी", "in 9th" becomes "9वें में". The houses are read back from the phrase.
 */
export function linkText(lang: Lang, phrase: string): string {
  if (lang === 'en') return phrase;
  const houses = (phrase.match(/\d+/g) ?? []).map((n) => ordOblique('hi', Number(n)));
  if (phrase.startsWith('rules ') && houses.length) return `${houses.join(' और ')} का स्वामी`;
  if (phrase.startsWith('in ') && houses.length === 1) return `${houses[0]} में`;
  throw new Error(`HINDI_LABEL_MISSING: "${phrase}"`);
}

const DHANA_LORD_NOTE_HI: Record<string, string> = { Dhana: 'धन', Labha: 'लाभ', 'Lakshmi Sthana': 'लक्ष्मी स्थान', Bhagya: 'भाग्य' };

function lordHi(text: string): string {
  const m = /^(Lagna|(\d+)(?:st|nd|rd|th)) Lord(?: \(([^)]+)\))?$/.exec(text.trim());
  if (!m) throw new Error(`HINDI_LABEL_MISSING: "${text}"`);
  const note = m[3] === undefined ? '' : ` (${DHANA_LORD_NOTE_HI[m[3]] ?? (() => { throw new Error(`HINDI_LABEL_MISSING: "${m[3]}"`); })()})`;
  return `${m[2] ? `${ordOblique('hi', Number(m[2]))} भाव का स्वामी` : 'लग्नेश'}${note}`;
}

/** The engine's yoga name ("Dhana Yoga (2nd Lord (Dhana) + 11th Lord (Labha))", "Lakshmi Yoga") in the report language. */
export function yogaNameText(lang: Lang, canonicalName: string): string {
  if (lang === 'en') return canonicalName;
  if (canonicalName === 'Lakshmi Yoga') return 'लक्ष्मी योग';
  const m = /^Dhana Yoga \((.+) \+ (.+)\)$/.exec(canonicalName);
  if (!m) throw new Error(`HINDI_LABEL_MISSING: "${canonicalName}"`);
  return `धन योग (${lordHi(m[1])} + ${lordHi(m[2])})`;
}

/** A satisfied yoga condition, as worded by the engine's Dhana and Lakshmi evaluators, in the report language. */
export function yogaConditionText(lang: Lang, description: string): string {
  if (lang === 'en') return description;
  const p = (symbol: string) => planetText('hi', symbol);
  let m = /^Lord of H(\d+) \((\w+)\) and Lord of H(\d+) \((\w+)\) related by conjunction, mutual aspect or sign exchange$/.exec(description);
  if (m) return `${ordOblique('hi', Number(m[1]))} भाव का स्वामी (${p(m[2])}) और ${ordOblique('hi', Number(m[3]))} भाव का स्वामी (${p(m[4])}) युति, परस्पर दृष्टि या राशि परिवर्तन से जुड़े हैं`;
  m = /^9th lord \((\w+)\) must occupy Kendra or Trikona house$/.exec(description);
  if (m) return `9वें भाव का स्वामी (${p(m[1])}) केंद्र या त्रिकोण भाव में हो`;
  m = /^9th lord \((\w+)\) must be exalted, moolatrikona, or in own sign$/.exec(description);
  if (m) return `9वें भाव का स्वामी (${p(m[1])}) उच्च, मूलत्रिकोण या स्वराशि में हो`;
  m = /^Lagna lord \((\w+)\) must be well placed in Kendra or Trikona$/.exec(description);
  if (m) return `लग्नेश (${p(m[1])}) केंद्र या त्रिकोण में अच्छी स्थिति में हो`;
  throw new Error(`HINDI_LABEL_MISSING: "${description}"`);
}

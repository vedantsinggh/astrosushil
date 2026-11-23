/**
 * Love & Relationship Report: Hindi edition (display text only).
 * Structure, evidence and objectives are those of love.definition.ts. The Hindi labels of the
 * love blocks live with the blocks themselves (render/blocks.hindi.ts).
 */
import { HindiEdition } from '../../i18n/hindi';

export const LOVE_HINDI: HindiEdition = {
  title: 'प्रेम एवं संबंध रिपोर्ट',
  subtitle: 'आपका हृदय, आपके रिश्ते और आपका समय: आपकी वैदिक जन्म कुंडली के माध्यम से',
  description:
    'लग्न, चंद्र, शुक्र, 5वाँ और 7वाँ भाव, दारकारक और नवांश, साथ में गुरु के गोचर पर आधारित सहायक समय और संबंधों के लिए व्यावहारिक मार्गदर्शन।',
  writingGuidance: [
    'In Hindi, write "जीवनसाथी" or "साथी" for partner or spouse (never a gendered word such as पति or पत्नी), and write houses with the digit ("7वाँ भाव", "7वें भाव में") as the tables of this report do.',
  ],
  sections: {
    'love-map': {
      title: 'आपके सितारों का प्रेम-मानचित्र',
      kicker: 'आपकी कुंडली',
      intro: 'आपकी जन्म कुंडली (राशि, D1) और वे मुख्य तथ्य जिन पर यह रिपोर्ट आधारित है।',
    },
    'mirror-of-soul': { title: 'आपके अंतर्मन का दर्पण', kicker: 'खंड 1' },
    venus: { title: 'शुक्र: प्रेम का ग्रह', kicker: 'खंड 2' },
    'love-compass': { title: 'प्रेम का दिशासूचक', kicker: 'खंड 3' },
    marriage: { title: 'विवाह: अटूट बंधन का भाव', kicker: 'खंड 4' },
    partner: { title: 'आपके अनुरूप जीवनसाथी', kicker: 'खंड 5' },
    'numerology-of-love': { title: 'प्रेम का अंक ज्योतिष', kicker: 'खंड 6' },
    'favour-and-caution': {
      title: 'अनुकूल संकेत और सजगता के संकेत',
      kicker: 'खंड 7 और 8',
      intro: 'आपके मूलांक से जुड़ी पारंपरिक अंक-ज्योतिषीय मान्यताएँ। ये सांस्कृतिक संबंध हैं, जिन्हें नियम नहीं बल्कि कोमल प्रतीकों के रूप में दिया गया है।',
    },
    'everlasting-love': { title: 'चिरस्थायी प्रेम की राह', kicker: 'खंड 9' },
  },
  topics: {
    'birth-summary': { title: 'आपका ज्योतिषीय विवरण' },
    'natal-chart': { title: 'आपकी जन्म कुंडली (D1)' },
    'lagna-in-love': { title: 'प्रेम में आप कैसे हैं', subtitle: 'आपका लग्न और आपका प्रेम-स्वभाव' },
    'moon-and-love': { title: 'चाँदनी और प्रेम', subtitle: 'संबंध में आपकी भावनात्मक ज़रूरतें' },
    'venus-placement': { title: 'प्रेम में आपका अपना मार्गदर्शक', subtitle: 'राशि, भाव और नक्षत्र के अनुसार शुक्र' },
    'venus-with-planets': { title: 'अन्य ग्रहों के साथ शुक्र की भाषा', subtitle: 'शुक्र पर युति और दृष्टियाँ' },
    'fifth-house': { title: 'दिल के तार', subtitle: 'प्रेम और आकर्षण का 5वाँ भाव' },
    'seventh-house': { title: 'साथ निभाने के सितारे', subtitle: 'साझेदारी का आपका 7वाँ भाव' },
    'spouse-portrait': { title: 'आपके जीवनसाथी की एक झलक', subtitle: '7वें भाव से संकेतित गुण' },
    darakaraka: { title: 'नियति का संयोग: आपका दारकारक', subtitle: 'जीवनसाथी का जैमिनी कारक' },
    'navamsa-chart': { title: 'आपकी नवांश कुंडली (D9)' },
    'navamsa-love': { title: 'नवांश की दृष्टि से', subtitle: 'विवाह और भीतरी साझेदारी की आपकी D9 कुंडली' },
    'mars-passion': { title: 'मंगल और अनुराग की ऊष्मा', subtitle: 'चाहत, दृढ़ता और स्वस्थ मतभेद' },
    'love-numbers': { title: 'प्रेम और अंक', subtitle: 'संबंधों में आपका मूलांक और भाग्यांक' },
    'cosmic-allies': { title: 'आपके अनुकूल संकेत' },
    'gentle-cautions': { title: 'कोमल सजगता' },
    'current-period': { title: 'आपके संबंधों का वर्तमान दौर', subtitle: 'चल रही विंशोत्तरी दशा' },
    'marriage-windows': { title: 'सुखद साथ: सहायक समय' },
    'care-tips': { title: 'रिश्तों की देखभाल के अभ्यास', subtitle: 'प्रेम को सँवारने के कोमल, व्यावहारिक तरीके' },
  },
};

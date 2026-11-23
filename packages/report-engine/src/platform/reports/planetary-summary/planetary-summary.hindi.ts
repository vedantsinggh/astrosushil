/**
 * Planetary Dynamics & Dignity Summary: Hindi edition (display text only).
 * Structure, evidence and objectives are those of planetary-summary.definition.ts.
 */
import { HindiEdition } from '../../i18n/hindi';

const PLANETS: Array<[string, string, string]> = [
  ['sun', 'सूर्य', 'जीवन-शक्ति, उद्देश्य और अधिकार'],
  ['moon', 'चंद्र', 'मन, भावनाएँ और भीतरी सुरक्षा'],
  ['mars', 'मंगल', 'ऊर्जा, साहस और कर्मशक्ति'],
  ['mercury', 'बुध', 'सोच, वाणी और सीखना'],
  ['jupiter', 'गुरु', 'ज्ञान, विस्तार और मार्गदर्शन'],
  ['venus', 'शुक्र', 'प्रेम, सौंदर्य और जीवन-मूल्य'],
  ['saturn', 'शनि', 'अनुशासन, धैर्य और सहनशक्ति'],
  ['rahu', 'राहु', 'उत्तर पात: नए की चाह'],
  ['ketu', 'केतु', 'दक्षिण पात: सहज ज्ञान और वैराग्य'],
];

export const PLANETARY_SUMMARY_HINDI: HindiEdition = {
  title: 'ग्रह स्थिति एवं बल सारांश',
  subtitle: 'आपके नौ ग्रह: वे कहाँ स्थित हैं, उनकी स्थिति कितनी सहज है और आपके लिए उनका क्या अर्थ है',
  description:
    'आपकी वैदिक जन्म कुंडली (D1) और ग्रह तालिका, तथा नौ ग्रहों में से प्रत्येक का राशि, भाव, नक्षत्र, स्थिति और वक्री या अस्त अवस्था के आधार पर संक्षिप्त व्यक्तिगत विवेचन।',
  sections: {
    'your-chart': {
      title: 'आपकी जन्म कुंडली एक नज़र में',
      kicker: 'आपकी कुंडली',
      intro: 'नीचे दी गई कुंडली और ग्रह तालिका आपके जन्म विवरण से गणना की गई हैं। इस सारांश का हर विवेचन इन्हीं स्थितियों पर आधारित है।',
    },
    'personal-planets': { title: 'सूर्य, चंद्र और व्यक्तिगत ग्रह', kicker: 'खंड 1' },
    'social-planets': { title: 'गुरु, शुक्र और शनि', kicker: 'खंड 2' },
    nodes: { title: 'राहु और केतु', kicker: 'खंड 3' },
    'planetary-balance': { title: 'आपका ग्रह संतुलन', kicker: 'सारांश' },
  },
  topics: {
    'natal-chart': { title: 'आपकी जन्म कुंडली (D1)' },
    'planet-table': { title: 'ग्रहों की स्थिति और बल' },
    'chart-overview': { title: 'आपकी कुंडली का स्वरूप', subtitle: 'आपका लग्न और उसका स्वामी' },
    ...Object.fromEntries(PLANETS.map(([id, title, subtitle]) => [`planet-${id}`, { title, subtitle }])),
    'dignity-overview': { title: 'आपके ग्रहों में सहजता और चुनौती', subtitle: 'स्थिति, वक्री और अस्त अवस्थाएँ एक साथ' },
  },
};

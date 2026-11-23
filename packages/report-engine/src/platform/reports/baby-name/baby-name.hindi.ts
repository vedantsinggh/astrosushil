/**
 * Baby Name Report: Hindi edition (display text only) and the Hindi wording of
 * its fit and syllable-match labels. Structure, evidence and objectives are
 * those of baby-name.definition.ts.
 */
import { HindiEdition } from '../../i18n/hindi';
import type { NumberFit, SyllableMatch } from './calc/name-guidance';

export const BABY_NAME_HINDI: HindiEdition = {
  title: 'शिशु नामकरण रिपोर्ट',
  subtitle: 'आपके शिशु के जन्म नक्षत्र से शास्त्रीय नामाक्षर, और वे अंक जो उसके अनुकूल हैं',
  description:
    'यह रिपोर्ट जन्म के समय चंद्र के नक्षत्र-चरण से आपके शिशु के नाम का पारंपरिक पहला अक्षर निकालती है, जन्म नक्षत्र और चंद्र राशि के अन्य अक्षर बताती है, और दिखाती है कि कौन-से नामांक आपके शिशु के मूलांक और भाग्यांक के साथ अच्छे बैठते हैं। जिन नामों पर आप विचार कर रहे हैं, उन्हें दोनों कसौटियों पर परखा गया है। अंतिम चुनाव, और आपके परिवार में उस नाम का अर्थ, सदा आपका ही है।',
  writingGuidance: [
    'In the Hindi prose refer to the candidate names as "संभावित नाम 1", "संभावित नाम 2" and so on, write the name syllables in Devanagari, and suggest example names in Devanagari.',
    'Namakshara is नामाक्षर, Mulank is मूलांक, Bhagyank is भाग्यांक and name number is नामांक.',
  ],
  sections: {
    details: { title: 'आपके विवरण', kicker: 'परिचय' },
    syllables: { title: 'जन्म नक्षत्र के अक्षर', kicker: 'नामाक्षर' },
    numbers: { title: 'आपके शिशु के अंक', kicker: 'अंकशास्त्र' },
    candidates: { title: 'जिन नामों पर आप विचार कर रहे हैं', kicker: 'नाम की परख' },
    worksheet: { title: 'किसी भी नाम को स्वयं परखें', kicker: 'अभ्यास-पत्र' },
  },
  topics: {
    'child-details': { title: 'प्रयुक्त जन्म विवरण' },
    'why-name-matters': { title: 'नाम का महत्त्व', subtitle: 'ध्वनि, अंक और पहचान' },
    'syllable-table': { title: 'आपके शिशु के नामाक्षर' },
    'syllable-guidance': { title: 'नामाक्षरों को कैसे समझें' },
    'name-ideas': { title: 'विचार करने योग्य नाम', subtitle: 'आपके नामाक्षरों से आरंभ होने वाले उदाहरण' },
    'birth-grid': { title: 'जन्म तिथि का ग्रिड' },
    'child-numbers': { title: 'मूलांक, भाग्यांक और जन्म तिथि का ग्रिड' },
    'number-guide': { title: 'नामांक मार्गदर्शिका' },
    'number-fit': { title: 'नामांक का चुनाव' },
    'candidate-table': { title: 'आपकी सूची एक नज़र में' },
    'candidate-comparison': { title: 'आपकी सूची के नामों की तुलना' },
    'candidate-grids': { title: 'नाम ग्रिड' },
    'candidate-planes': { title: 'नाम ग्रिड क्या दर्शाते हैं' },
    'worksheet-table': { title: 'कैल्डियन अक्षर-मान' },
  },
};

/** Hindi of FIT_LABEL (calc/name-guidance.ts). */
export const FIT_LABEL_HI: Record<NumberFit, string> = { supportive: 'अनुकूल', workable: 'स्वीकार्य', 'needs-care': 'ध्यान अपेक्षित' };

/** Hindi of MATCH_LABEL (calc/name-guidance.ts). */
export const MATCH_LABEL_HI: Record<SyllableMatch, string> = {
  pada: 'जन्म चरण के नामाक्षर से आरंभ',
  nakshatra: 'जन्म नक्षत्र के किसी अक्षर से आरंभ',
  rashi: 'चंद्र राशि के किसी अक्षर से आरंभ',
  none: 'किसी पारंपरिक अक्षर से आरंभ नहीं',
};

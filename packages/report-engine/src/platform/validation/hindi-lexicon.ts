/**
 * Hindi (Devanagari) forms of the editorial and overstatement rules, so Hindi
 * narrative is held to the same standard as English
 * (docs/integration/hindi-reports-design.md).
 *
 * JS `\b` does not work for Devanagari, so word edges use Unicode letter/mark
 * look-arounds. Hindi negates after the word ("श्राप नहीं है"), so a term is
 * not a violation when a negation or contrast follows it within the same clause.
 */
const L = '(?<![\\p{L}\\p{M}])';
const R = '(?![\\p{L}\\p{M}])';
const word = (alternatives: string) => new RegExp(`${L}(?:${alternatives})${R}`, 'u');
const stem = (alternatives: string) => new RegExp(`${L}(?:${alternatives})`, 'u');

/** True when the text contains Devanagari. */
export const hasDevanagari = (text: string): boolean => /[ऀ-ॿ]/.test(text);

/** Negation or contrast after a term, inside its clause: "… नहीं", "… के बजाय", "… न कि". */
const DENIAL_AFTER = /^[^,;:।!?—–()]{0,40}?(?<![\p{L}\p{M}])(?:नहीं|नही|न\s+कि|न\s+ही|के\s+बजाय|की\s+जगह|के\s+स्थान\s+पर|मत)(?![\p{L}\p{M}])/u;
/** Contrast before a term: "… के बजाय <term>", "न कि <term>". */
const DENIAL_BEFORE = /(?<![\p{L}\p{M}])(?:न\s+कि|के\s+बजाय|की\s+जगह|बिना)\s+(?:[\p{L}\p{M}]+\s+){0,3}$/u;

/** True when the Hindi phrase at `index` (length `length`) is denied in its clause. */
export function deniedInHindiClause(sentence: string, index: number, length: number): boolean {
  return DENIAL_AFTER.test(sentence.slice(index + length)) || DENIAL_BEFORE.test(sentence.slice(0, index));
}

export interface HindiRule {
  code: string;
  severity: 'error' | 'warning';
  pattern: RegExp;
  message: string;
  /** A denied occurrence ("यह कोई श्राप नहीं है") is not a violation. */
  deniable?: boolean;
}

const REMEDY_ITEMS = 'रत्न|नीलम|माणिक|माणिक्य|पन्ना|मोती|मूंगा|हीरा|गोमेद|लहसुनिया|पुखराज|रुद्राक्ष|यंत्र|कवच|ब्रेसलेट|अंगूठी';
const BUY = 'खरीद|ख़रीद|मंगवा|ऑर्डर';

/** Same codes, severities and intent as the English RULES in editorial-validator.ts. */
export const HINDI_RULES: HindiRule[] = [
  { code: 'FEAR_LANGUAGE', severity: 'error', deniable: true, pattern: stem('श्राप|शापित|अभिशाप|अभिशप्त|सर्वनाश|विनाशकारी|तबाह|बर्बाद|अनिष्ट|विपत्ति|अशुभ\\s+भाग्य|बुरी\\s+नज़र|बुरी\\s+नजर|काला\\s+जादू'), message: 'Fear-based language is not permitted' },
  { code: 'DOSHA_AS_AFFLICTION', severity: 'error', pattern: new RegExp(`${L}(?:मांगलिक|मंगल|काल\\s*सर्प|कालसर्प|पितृ|नाड़ी|नाडी|केमद्रुम|साढ़े\\s*साती|साढ़ेसाती)(?:\\s+दोष)?\\s+(?:से|के)\\s+(?:पीड़ित|पीडित|ग्रस्त|ग्रसित|शिकार)`, 'u'), message: 'Doshas must not be framed as afflictions (Astro Sushil does not believe in doshas)' },
  { code: 'GUARANTEE', severity: 'error', deniable: true, pattern: new RegExp(`${L}(?:गारंटी|शत[-\\s]?प्रतिशत|100\\s?%|निश्चित\\s+ही\\s+(?:होग|मिलेग|बनेंग|करेंग)|पक्का\\s+(?:होग|मिलेग)|कभी\\s+विवाह\\s+नहीं\\s+होगा|मृत्यु\\s+हो(?:गी|\\s+जाएगी))`, 'u'), message: 'Guaranteed or absolute outcomes are not permitted' },
  { code: 'MEDICAL_CERTAINTY', severity: 'error', pattern: new RegExp(`${L}(?:कैंसर|मधुमेह|हृदय\\s+रोग|गंभीर\\s+रोग|गंभीर\\s+बीमारी)\\s+(?:होगा|होगी|हो\\s+जाएगा|हो\\s+जाएगी|हो\\s+सकता\\s+है\\s+ही)`, 'u'), message: 'Medical predictions are not permitted' },
  { code: 'FINANCIAL_CERTAINTY', severity: 'error', pattern: new RegExp(`${L}(?:(?:अमीर|धनवान|धनी|करोड़पति|मालामाल)\\s+(?:बन(?:ेंगे|ोगे|ेगा|ेगी)|हो\\s+जाएँगे|हो\\s+जाएंगे|हो\\s+जाओगे)|गारंटीड\\s+रिटर्न|लॉटरी)`, 'u'), message: 'Financial certainty is not permitted' },
  { code: 'REMEDY_SALES', severity: 'error', pattern: new RegExp(`${L}(?:(?:${BUY})[^।.!?]{0,40}(?:${REMEDY_ITEMS})|(?:${REMEDY_ITEMS})[^।.!?]{0,40}${L}(?:${BUY})|कूपन|डिस्काउंट)`, 'u'), message: 'Remedy sales language is not permitted' },
  { code: 'FOREIGN_BRAND', severity: 'error', pattern: word('अरुण\\s+पंडित|जेम्समंत्र'), message: 'Third-party brand mentioned' },
  { code: 'AI_SELF_REFERENCE', severity: 'error', pattern: new RegExp(`${L}(?:एक\\s+एआई|एआई\\s+के\\s+रूप\\s+में|भाषा\\s+मॉडल|मैं\\s+असमर्थ)`, 'u'), message: 'Model self-reference' },
  { code: 'INVENTED_HISTORY', severity: 'warning', pattern: new RegExp(`${L}(?:जब\\s+आप\\s+(?:बच्चे|छोटे)\\s+थे|आपने\\s+पहले\\s+(?:बताया|कहा))`, 'u'), message: 'Possible invented personal history' },
];

/** First violation of a Hindi rule in the text, ignoring denied occurrences of deniable rules. */
export function matchHindiRule(rule: HindiRule, text: string): string | undefined {
  const re = new RegExp(rule.pattern.source, 'gu');
  for (const m of text.matchAll(re)) {
    if (rule.deniable && deniedInHindiClause(text, m.index ?? 0, m[0].length)) continue;
    return m[0];
  }
  return undefined;
}

/** Hindi counterpart of OVERSTATEMENT (judgement-lexicon.ts): a potential stated as a promise. */
const HINDI_OVERSTATEMENT = new RegExp(
  `${L}(?:सुनिश्चित\\s+(?:करत|करेग|करेंग|होग|है)|गारंटी|निश्चित\\s+रूप\\s+से|निश्चित\\s+ही|अवश्य\\s+ही|बिना\\s+(?:किसी\\s+)?(?:प्रयास|मेहनत)\\s+के|अनायास\\s+ही|अचूक|अटल\\s+(?:सफलता|भाग्य)|(?:भाग्य|नियति|किस्मत)\\s+में\\s+लिखा|तय\\s+है)`,
  'u'
);

/** Hindi counterpart of PREDICTIVE_CONTEXT. */
export const HINDI_PREDICTIVE_CONTEXT = new RegExp(`${L}(?:योग|राजयोग|दशा|महादशा|अंतर्दशा|अन्तर्दशा|भुक्ति|गोचर|साढ़े\\s*साती|साढ़ेसाती|अवधि|काल)`, 'u');

/** First Hindi overstatement in a sentence that is not denied. */
export function findHindiOverstatement(sentence: string): RegExpExecArray | null {
  const re = new RegExp(HINDI_OVERSTATEMENT.source, 'gu');
  for (const m of sentence.matchAll(re)) {
    if (deniedInHindiClause(sentence, m.index ?? 0, m[0].length)) continue;
    return m as RegExpExecArray;
  }
  return null;
}

/** Hindi counterpart of misdefinesAshtakavarga: bindus described as support from transiting planets. */
const HINDI_ASHTAKAVARGA_TERM = new RegExp(`${L}(?:बिंदु|बिन्दु|अष्टकवर्ग|सर्वाष्टकवर्ग|भिन्नाष्टकवर्ग)`, 'u');
const HINDI_TRANSITING_SOURCE = new RegExp(`${L}(?:गोचर(?:\\s+के|\\s+कर\\s+रहे|रत)?\\s+ग्रह(?:ों)?\\s+(?:से|द्वारा|का\\s+सहयोग|का\\s+समर्थन|देते|प्रदान))`, 'u');

export function misdefinesAshtakavargaHindi(sentence: string): boolean {
  if (!HINDI_ASHTAKAVARGA_TERM.test(sentence)) return false;
  const re = new RegExp(HINDI_TRANSITING_SOURCE.source, 'gu');
  for (const m of sentence.matchAll(re)) if (!deniedInHindiClause(sentence, m.index ?? 0, m[0].length)) return true;
  return false;
}

/** Common Hindi function words, ignored when comparing sentences for repetition. */
export const HINDI_STOPWORDS = [
  'का', 'की', 'के', 'को', 'में', 'से', 'पर', 'और', 'या', 'है', 'हैं', 'था', 'थी', 'थे', 'हो', 'होता', 'होती', 'होते', 'यह', 'वह', 'ये', 'वे',
  'इस', 'उस', 'इन', 'उन', 'आप', 'आपका', 'आपकी', 'आपके', 'आपको', 'अपने', 'अपनी', 'अपना', 'एक', 'भी', 'ही', 'तो', 'कि', 'जो', 'जब', 'तब',
  'लिए', 'साथ', 'तथा', 'एवं', 'किसी', 'कुछ', 'बहुत', 'अधिक', 'सकता', 'सकती', 'सकते', 'करता', 'करती', 'करते', 'रहता', 'रहती', 'रहते',
  'नहीं', 'ने', 'द्वारा', 'रूप', 'जैसे', 'यहाँ', 'वहाँ', 'कर', 'करने', 'होने',
];

/**
 * Share of letters that are Devanagari. A Hindi edition whose prose is mostly
 * Latin letters was written in English or in Roman-script Hindi.
 */
export function devanagariShare(text: string): number {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (!letters.length) return 1;
  return letters.filter((c) => /[ऀ-ॿ]/.test(c)).length / letters.length;
}

/**
 * Hindi (Devanagari) forms of the judgement lexicon (judgement-lexicon.ts), so
 * the interpretation validators read Hindi prose as strictly as English prose
 * (docs/integration/hindi-reports-design.md: "write directly in Hindi, with the
 * same checks").
 *
 * Every list is closed, exactly like the English lists: a word that is not
 * listed is not checked, and extending a list is a reviewed change.
 *
 * JS `\b` does not work for Devanagari, so word edges use Unicode letter/mark
 * look-arounds. Hindi negates after the word ("मजबूत नहीं है"), so negation is
 * looked for after a term as well as just before it ("न तो मजबूत").
 */
import type { JudgementPolarity } from './judgement-lexicon';
import { altOf, HI_EDGE_L as L, HI_EDGE_R as R, HI_HOUSE_LORDS, HI_NUMBER_WORD_RE, HI_PLANET_RE, hiNumber, toAsciiDigits } from './hindi-chart-terms';

const re = (body: string, flags = 'u') => new RegExp(`${L}(?:${body})${R}`, flags);
/** Space or hyphen between the parts of a compound ("मिला-जुला", "मिला जुला"). */
const J = '[-\\s]?';

// ---------------------------------------------------------------------------
// V1: judgement terms
// ---------------------------------------------------------------------------

export interface HindiJudgementTerm {
  /** The Hindi forms, as regex alternatives. */
  forms: string[];
  polarity: JudgementPolarity;
  /**
   * The English lexicon words these forms stand for. Evidence labels are English, so "a fact states
   * this term" is tested with this pattern (e.g. चुनौतीपूर्ण ↔ "functionally challenging").
   */
  english: RegExp;
  pattern: RegExp;
}

const term = (forms: string[], polarity: JudgementPolarity, english: RegExp): HindiJudgementTerm => ({ forms, polarity, english, pattern: re(altOf(forms)) });

export const HINDI_JUDGEMENT_TERMS: readonly HindiJudgementTerm[] = [
  // positive
  term(['मजबूत', 'मज़बूत', 'बलवान', 'बली', 'सबल', 'प्रबल', 'सशक्त', 'शक्तिशाली', 'सुदृढ़', 'बलशाली'], 'positive', /\b(?:strong|stronger|strongest|powerful|robust|potent|empowered)\b/i),
  term(['उत्कृष्ट', 'उत्तम', 'श्रेष्ठ', 'असाधारण', 'बेहतरीन', 'शानदार'], 'positive', /\b(?:exceptional|exceptionally|excellent)\b/i),
  term(['अनुकूल'], 'positive', /\b(?:favourable|favorable|favours|favors)\b/i),
  term(['सहायक', 'सहयोगी', 'सहयोगपूर्ण'], 'positive', /\b(?:supportive|supporting)\b/i),
  term(['समर्थित'], 'positive', /\bsupported\b/i),
  // "शुभ ग्रह" / "अशुभ ग्रह" (natural benefic / malefic) is a classification, like English "benefic", not a judgement.
  term(['शुभ(?!\\s+ग्रह)', 'शुभकारी', 'शुभफलदायी', 'मंगलकारी'], 'positive', /\b(?:auspicious|benefic)\b/i),
  term(['सौभाग्यशाली', 'भाग्यशाली', 'धन्य'], 'positive', /\b(?:blessed|fortunate)\b/i),
  term(['लाभकारी', 'लाभदायक', 'लाभप्रद', 'फायदेमंद', 'फ़ायदेमंद', 'हितकारी', 'हितकर', 'फलदायी', 'फलदायक'], 'positive', /\b(?:advantageous|advantage|beneficial)\b/i),
  term(['सुस्थित', 'अच्छी\\s+स्थिति\\s+में', 'गरिमापूर्ण', 'गरिमामय'], 'positive', /\b(?:well[- ]placed|dignified)\b/i),
  // negative
  term(['कमजोर', 'कमज़ोर', 'दुर्बल', 'निर्बल', 'क्षीण', 'बलहीन', 'अशक्त', 'कमजोरी', 'कमज़ोरी', 'दुर्बलता'], 'negative', /\b(?:weak|weaker|weakest|weakened|weakness)\b/i),
  term(['चुनौतीपूर्ण', `चुनौती${J}भर[ाेी]`, 'चुनौतियों\\s+भर[ाेी]'], 'negative', /\b(?:challenging|challenged)\b/i),
  term(['कठिन', 'मुश्किल', 'कष्टकारी', 'कष्टप्रद', 'कठोर'], 'negative', /\b(?:difficult|demanding)\b/i),
  term(['प्रतिकूल', 'अशुभ(?!\\s+ग्रह)'], 'negative', /\b(?:adverse|unfavourable|unfavorable|malefic)\b/i),
  term(['पीड़ित', 'पीडित'], 'negative', /\b(?:afflicted|troubled)\b/i),
  term(['बाधित', 'अवरुद्ध', 'बाधाग्रस्त'], 'negative', /\b(?:obstructed|hindered)\b/i),
  term(['तनावपूर्ण', 'तनावग्रस्त', 'दबावग्रस्त'], 'negative', /\bstrained\b/i),
  term(['क्षतिग्रस्त'], 'negative', /\b(?:compromised|impaired)\b/i),
  term(['खराब\\s+स्थिति', 'ख़राब\\s+स्थिति', 'बुरी\\s+स्थिति'], 'negative', /\bpoorly placed\b/i),
  // mixed
  term(['मिश्रित', `मिल[ाीे]${J}जुल[ाीे]`, 'संतुलित', 'सन्तुलित', 'दोतरफा', 'दोतरफ़ा', 'दोधारी', 'उभयपक्षी'], 'mixed', /\b(?:mixed|balanced|two-sided|double-edged|ambivalent)\b/i),
  // neutral ("सम राशि" is the glossary's word for a neutral sign)
  term(['तटस्थ', 'सम', 'उदासीन'], 'neutral', /\bneutral\b/i),
];

/** Words that end the reach of a negation: a conjunction or the clause's own verb. */
const GAP_STOP = 'और|लेकिन|परंतु|परन्तु|किंतु|किन्तु|मगर|जबकि|तथा|एवं|है|हैं|था|थी|थे';
const GAP_WORD = `(?!(?:${GAP_STOP})${R})[\\p{L}\\p{M}\\p{N}]+`;
const AS_A = '(?:\\s+(?:के\\s+रूप\\s+में|की\\s+तरह|के\\s+तौर\\s+पर|जैसा|जैसी|जैसे))?';
/** "मजबूत नहीं है", "विशेष रूप से मजबूत नहीं": a negation at most two words after the term. */
const NEGATION_AFTER = new RegExp(`^${AS_A}(?:\\s+${GAP_WORD}){0,2}\\s+(?:नहीं|नही|न|ना)${R}`, 'u');
/** "न तो मजबूत", "न ही कमजोर", "बिना किसी कठिन": a negation at most one word before the term. */
const NEGATION_BEFORE = new RegExp(`${L}(?:न\\s+तो|न\\s+ही|न|ना|बिना)(?:\\s+${GAP_WORD})?\\s+$`, 'u');
/**
 * "खाली भाव को लाभ के रूप में नहीं देखा जाता", "कभी सुरक्षित नहीं माना जाता": the term is the object
 * of a denied classification (Hindi counterpart of DENIED_CLASSIFICATION_BEFORE). One clause only.
 */
const DENIED_CLASSIFICATION_AFTER = new RegExp(
  `^(?:\\s+(?:या|अथवा|और|व)\\s+[\\p{L}\\p{M}]+){0,2}${AS_A}(?:\\s+(?!(?:${GAP_STOP})${R})[\\p{L}\\p{M}]+){0,3}\\s+(?:नहीं|नही|न)\\s+(?:मान|समझ|देख|गिन|कह|बता|आँक|आंक|ठहरा)`,
  'u'
);

/** True when the Hindi term at `index` is negated or is the object of a denied classification. */
export function hindiTermNegated(sentence: string, index: number, length: number): boolean {
  const after = sentence.slice(index + length);
  return NEGATION_AFTER.test(after) || DENIED_CLASSIFICATION_AFTER.test(after) || NEGATION_BEFORE.test(sentence.slice(0, index));
}

/** True when the Hindi phrase at `index` is the object of a denied classification ("… लाभ नहीं माना जाता"). */
export function hindiClassificationDenied(sentence: string, index: number, length: number): boolean {
  return DENIED_CLASSIFICATION_AFTER.test(sentence.slice(index + length));
}

export interface HindiJudgementHit {
  /** The Hindi word as written. */
  term: string;
  polarity: JudgementPolarity;
}

/** Non-negated Hindi judgement terms in a sentence, in lexicon order (deterministic). */
export function findHindiJudgementTerms(sentence: string): HindiJudgementHit[] {
  const hits: HindiJudgementHit[] = [];
  for (const t of HINDI_JUDGEMENT_TERMS) {
    for (const m of sentence.matchAll(new RegExp(t.pattern.source, 'gu'))) {
      if (hindiTermNegated(sentence, m.index ?? 0, m[0].length)) continue;
      hits.push({ term: m[0], polarity: t.polarity });
      break; // one hit per lexicon entry, as in English
    }
  }
  return hits;
}

/** The lexicon entry a Hindi hit came from. */
export function hindiJudgementTerm(word: string): HindiJudgementTerm | undefined {
  return HINDI_JUDGEMENT_TERMS.find((t) => new RegExp(`^(?:${altOf(t.forms)})$`, 'u').test(word));
}

/** Hindi counterpart of CHART_ENTITY; V1 only applies to sentences that evaluate a chart factor. */
const ENTITY_WORDS = [
  'लग्न', 'भाव', 'घर', 'भावेश', 'स्वामी', 'राशि', 'योग', 'राजयोग', 'दशा', 'महादशा', 'अंतर्दशा', 'अन्तर्दशा', 'गोचर', 'कुंडली', 'कुण्डली', 'नवांश', 'नवमांश', 'दशमांश',
  'ग्रह', 'कारक', 'आत्मकारक', 'अमात्यकारक', 'बिंदु', 'बिन्दु', 'अष्टकवर्ग', 'सर्वाष्टकवर्ग',
  ...HI_HOUSE_LORDS.map(([h]) => h),
];
export const HINDI_CHART_ENTITY = new RegExp(`${L}(?:${HI_PLANET_RE}|(?:${altOf(ENTITY_WORDS)})(?:ियों|ियाँ|ियां|यों|ओं|ों|ें|ो)?)${R}`, 'u');

// ---------------------------------------------------------------------------
// V2: mixed honesty
// ---------------------------------------------------------------------------

const STRENGTH_WORD = 'मजबूत|मज़बूत|बलवान|बली|प्रबल|सशक्त|शक्तिशाली|कमजोर|कमज़ोर|दुर्बल|निर्बल|अनुकूल|सहायक|शुभ|असाधारण';
/** Hindi counterpart of ONE_SIDED_INTENSIFIERS. */
export const HINDI_ONE_SIDED_INTENSIFIERS = re(
  [
    'असाधारण\\s+रूप\\s+से', 'अत्यंत', 'अत्यन्त', 'अत्यधिक', 'बेहद', 'अति', `बहुत\\s+(?:ही\\s+)?(?:${STRENGTH_WORD})`, 'भारी\\s+रूप\\s+से', 'निर्णायक\\s+रूप\\s+से',
    'निर्विवाद(?:\\s+रूप\\s+से)?', 'निस्संदेह', 'निःसंदेह', 'नि:संदेह', 'बेशक', `(?:स्पष्ट\\s+रूप\\s+से|स्पष्टतः|साफ़\\s+तौर\\s+पर|साफ\\s+तौर\\s+पर)\\s+(?:${STRENGTH_WORD})`,
    'पूरी\\s+तरह(?:\\s+से)?', 'पूर्णतः', 'पूर्णतया', 'पूर्ण\\s+रूप\\s+से', 'संपूर्ण\\s+रूप\\s+से', 'सम्पूर्ण\\s+रूप\\s+से', 'बिल्कुल', 'बिलकुल', 'सर्वथा', 'नितांत', 'नितान्त',
    'विशुद्ध\\s+रूप\\s+से', 'शुद्ध\\s+रूप\\s+से', 'उल्लेखनीय\\s+रूप\\s+से', 'अपार', `(?:वास्तव\\s+में|सचमुच|सच\\s+में)\\s+(?:${STRENGTH_WORD})`,
  ].join('|')
);

/** Hindi counterpart of MIXED_MARKERS: wording that honestly says a result has two sides. */
export const HINDI_MIXED_MARKERS = re(
  [
    'मिश्रित', `मिल[ाीे]${J}जुल[ाीे]`, 'दोनों', 'एक\\s+ओर', 'एक\\s+तरफ़', 'एक\\s+तरफ', 'दूसरी\\s+ओर', 'दूसरी\\s+तरफ़', 'दूसरी\\s+तरफ', 'वहीं', 'लेकिन', 'परंतु', 'परन्तु', 'किंतु', 'किन्तु',
    'मगर', 'जबकि', 'हालाँकि', 'हालांकि', 'यद्यपि', 'फिर\\s+भी', 'तथापि', 'संतुलित', 'सन्तुलित', 'दोतरफा', 'दोतरफ़ा', 'दोधारी', 'साथ\\s+ही', 'इसके\\s+साथ[-\\s]साथ', 'खींचतान',
  ].join('|')
);

/**
 * "सहायक संकेत", "चुनौतीपूर्ण पक्ष": names one side of a mixed result (Hindi counterpart of SIDE_LABEL).
 * "चुनौतीपूर्ण कारक" is left out: Hindi uses it for "a challenged factor" too, which is a judgement.
 */
export const HINDI_SIDE_LABEL = re('(सहायक|सहयोगी|चुनौतीपूर्ण)\\s+(?:संकेत|संकेतक|सूचक|पक्ष)(?:ों|ओं)?');
export const hindiSideIsChallenging = (label: string): boolean => /चुनौतीपूर्ण/u.test(label);

// ---------------------------------------------------------------------------
// V4: derived terms (keyed by the English term of DERIVED_TERMS)
// ---------------------------------------------------------------------------

export const HINDI_DERIVED_PATTERNS: Readonly<Record<string, RegExp>> = {
  // Hindi has no single word for "dispositor": the glossary's "राशि स्वामी" (sign lord) and its compounds are recognised.
  dispositor: re(`राशि${J}स्वामी|राशीश|राशिपति|राशि${J}अधिपति|डिस्पोज़िटर|डिस्पोजिटर`),
  yogakaraka: re(`योग${J}कारक`),
  vargottama: re('वर्गोत्तम'),
  'Sade Sati': re('साढ़े\\s*साती|साढे\\s*साती|साड़े\\s*साती|साढ़ेसाती'),
  // Bare "केंद्र" also means "centre" ("ध्यान का केंद्र"), so only chart uses are recognised.
  kendra: re('(?:केंद्र|केन्द्र)(?:ेश|ाधिपति|\\s+(?:भाव|भावों|स्थान|स्थानों)|\\s+(?:में|मे)\\s+(?:स्थित|बैठ[ाेी]|विराजमान)|\\s+(?:का|के)\\s+स्वामी|[-\\s](?:और\\s+|या\\s+|एवं\\s+|तथा\\s+)?त्रिकोण)'),
  trikona: re('त्रिकोण(?:ेश|ाधिपति|ों)?'),
  // Bare "राशि परिवर्तन" usually means a transiting planet changing sign, so it is not read as an exchange.
  exchange: re(`परिवर्तन${J}योग|परस्पर\\s+(?:राशि${J})?परिवर्तन|आपसी\\s+(?:राशि${J})?परिवर्तन|राशियों\\s+(?:का|की)\\s+(?:आदान[-\\s]प्रदान|अदला[-\\s]बदली|परस्पर\\s+परिवर्तन)|राशि${J}विनिमय`),
};

// ---------------------------------------------------------------------------
// V6: invented-rule phrasing
// ---------------------------------------------------------------------------

const RULE_ADVERB = 'सामान्यतः|सामान्यतया|सामान्य\\s+रूप\\s+से|आमतौर\\s+पर|आम\\s+तौर\\s+पर|प्रायः|अक्सर|शास्त्रीय\\s+रूप\\s+से|परंपरागत\\s+रूप\\s+से|पारंपरिक\\s+रूप\\s+से';
/** Hindi is verb-final: the adverb and the verb sit at the two ends of the clause. */
const RULE_VERB = 'माँगत|मांगत|अपेक्षा|आवश्यक|ज़रूरी|जरूरी|अनिवार्य|अर्थ|मतलब|तात्पर्य|संकेत|दर्शात|सूचित|सूचक|दिखात|बतात|निर्धारित|तय';
export const HINDI_INVENTED_RULE_PATTERNS: readonly RegExp[] = [
  new RegExp(`${L}(?:${RULE_ADVERB})${R}[^,;:।!?]{0,80}?${L}(?:${RULE_VERB})`, 'u'),
  new RegExp(`${L}(?:शास्त्रीय\\s+|पारंपरिक\\s+|परंपरागत\\s+|सामान्य\\s+)?नियम\\s+(?:है|यह\\s+है|कहता|बताता|के\\s+अनुसार|के\\s+मुताबिक)`, 'u'),
  re('नियमतः|नियमानुसार|सामान्य\\s+नियम\\s+के\\s+रूप\\s+में'),
  new RegExp(`${L}(?:शास्त्र|शास्त्रों|ग्रंथ|ग्रंथों|ग्रन्थ|ग्रन्थों|परंपरा)\\s+(?:में\\s+)?(?:कहत|बतात|मानत|कहा\\s+गया|लिखा)[^।!?]*${L}(?:अवश्य|हमेशा|सदैव|सदा|कभी\\s+नहीं|चाहिए)`, 'u'),
];

// ---------------------------------------------------------------------------
// "No positive spin on absence"
// ---------------------------------------------------------------------------

/** Hindi counterpart of ABSENCE_TERMS: an absence of planets or aspects … */
export const HINDI_ABSENCE_TERMS = re(
  [
    'खाली', 'रिक्त', 'ग्रहरहित', 'ग्रहविहीन', 'ग्रहहीन', 'कोई\\s+(?:भी\\s+)?ग्रह\\s+(?:नहीं|नही|स्थित\\s+नहीं|उपस्थित\\s+नहीं|मौजूद\\s+नहीं)', 'बिना\\s+(?:किसी\\s+)?ग्रह(?:ों)?\\s+के',
    'ग्रह(?:ों)?\\s+से\\s+(?:रहित|मुक्त|खाली|रिक्त)', 'दृष्टिहीन', 'दृष्टिरहित', 'अदृष्ट', 'कोई\\s+(?:भी\\s+)?(?:ग्रह[-\\s])?दृष्टि\\s+(?:नहीं|नही)', 'दृष्टि\\s+(?:नहीं|नही)\\s+(?:है|पड़|मिल|डाल)',
    'दृष्टि(?:यों)?\\s+से\\s+(?:रहित|मुक्त|अछूत[ाेी]|वंचित)', 'बिना\\s+(?:किसी\\s+)?दृष्टि\\s+के', 'अछूत[ाेी]',
  ].join('|')
);
/** … presented as an advantage (Hindi counterpart of ADVANTAGE_TERMS). "लाभ भाव" is the 11th house, not an advantage. */
export const HINDI_ADVANTAGE_TERMS = re(
  [
    'सरलता', 'सादगी', 'सरल', 'सहज', 'सीधा[-\\s]सादा', 'सीधी[-\\s]सादी', '(?:टकराव|संघर्ष|तनाव|हस्तक्षेप|दबाव|खींचतान|रुकावट|बाधा|बाधाओं)\\s+से\\s+(?:मुक्त|दूर|बच[ाेी]|परे|रहित)', 'सुरक्षित', 'सुरक्षा',
    'संरक्षित', 'संरक्षण', 'लाभ(?!\\s*(?:भाव|स्थान))', 'लाभकारी', 'लाभदायक', 'लाभप्रद', 'फायदा', 'फ़ायदा', 'फायदे', 'फ़ायदे', 'फायदेमंद', 'फ़ायदेमंद', 'हितकर', 'हितकारी', 'स्वच्छ',
    '(?:साफ़|साफ)\\s+(?:रास्ता|राह|मार्ग)', '(?:रास्ता|राह|मार्ग)\\s+(?:साफ़|साफ)', 'सुगम', 'सुचारु', 'सुचारू', 'निर्बाध', 'बेरोकटोक', 'निर्विघ्न', 'अबाधित', 'आज़ादी', 'आजादी', 'स्वतंत्रता',
    'निश्चिंत', 'निष्कंटक', 'कम\\s+(?:प्रवृत्त|संभावना)',
  ].join('|')
);

// ---------------------------------------------------------------------------
// Life stage
// ---------------------------------------------------------------------------

/** Hindi counterpart of SENIORITY_TERMS. */
export const HINDI_SENIORITY_TERMS = re(
  [
    `बोर्ड${J}स्तर(?:ीय)?`, 'बोर्डरूम', 'बोर्ड\\s+रूम', 'निदेशक\\s+मंडल', 'सेवानिवृत्ति', 'सेवानिवृत्त', 'रिटायरमेंट', 'रिटायर', 'अवकाश[-\\s]प्राप्ति', 'सी[-\\s]सूट', 'शीर्ष\\s+प्रबंधन',
    'कार्यकारी\\s+नेतृत्व', '(?:कनिष्ठ|जूनियर|युवा|छोटे|नए)\\s+(?:सहकर्मियों|सहयोगियों|साथियों)\\s+(?:का|को)\\s+(?:मार्गदर्शन|मेंटर)', 'गवर्नेंस\\s+अधिकारी', 'शासन\\s+अधिकारी',
    '(?:करियर|कैरियर)\\s+(?:के|का|की)\\s+(?:अंतिम|आखिरी|आख़िरी|उत्तरार्ध|ढलान|संध्या|सांध्य)[^\\s]*',
  ].join('|')
);

// ---------------------------------------------------------------------------
// Ages written in Hindi prose (warning only, as in English)
// ---------------------------------------------------------------------------

const AGE_NUM = `(?:\\d{1,3}|${HI_NUMBER_WORD_RE})`;
const APPROX = '(?:लगभग\\s+|करीब\\s+|क़रीब\\s+|तकरीबन\\s+|तक़रीबन\\s+)?';
const HINDI_AGE_RE = new RegExp(
  `${L}(?:आयु|उम्र|अवस्था)\\s+(?:में\\s+)?${APPROX}(${AGE_NUM})${R}` +
    `|${L}${APPROX}(${AGE_NUM})\\s*(?:वर्ष|साल|बरस)\\s+(?:की\\s+(?:आयु|उम्र|अवस्था)|(?:के|की|का)\\s+(?:हैं|है|हो|होंगे|होंगी|थे|थीं|होने))` +
    `|${L}(${AGE_NUM})${J}वर्षीय${R}`,
  'gu'
);

/** Ages stated in Hindi prose ("22 वर्ष की आयु", "उनतीस साल की उम्र", "आयु 22"). */
export function extractHindiProseAges(text: string): Array<{ text: string; age: number }> {
  const out: Array<{ text: string; age: number }> = [];
  for (const m of toAsciiDigits(text).matchAll(HINDI_AGE_RE)) {
    const age = hiNumber(m[1] ?? m[2] ?? m[3]);
    if (age !== undefined) out.push({ text: m[0].trim(), age });
  }
  return out;
}

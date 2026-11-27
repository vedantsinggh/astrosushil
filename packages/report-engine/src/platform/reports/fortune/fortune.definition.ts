/**
 * Fortune Report (numerology only). The report's own definition is the Hindi
 * edition (the default, as before); FORTUNE_DEFINITION_EN is the same report in
 * English, built from the same two-language section specs.
 *
 * Reference: docs/referencerepots/Fortune Report.pdf (112 pp, Hindi, third-party;
 * used for information architecture only). Analysis:
 * docs/report-system/analysis/ref-fortune-report.md. Every reference topic is
 * mapped via `referencePages`; `bonus: true` marks additions. Method decisions:
 * docs/report-system/decisions/numerology.md.
 */
import { ReportDefinitionInput } from '../../contracts';
import { NUMEROLOGY_WRITING_GUIDANCE, numerologySections } from '../_numerology-shared/sections';

export const FORTUNE_DEFINITION: ReportDefinitionInput = {
  id: 'fortune',
  reportType: 'FORTUNE',
  specVersion: '1.0.0',
  title: 'भाग्य रिपोर्ट',
  subtitle: 'आपके मूलांक, भाग्यांक, नाम और लो शू ग्रिड से आपके जीवन की दिशा',
  description:
    'यह रिपोर्ट केवल अंकशास्त्र पर आधारित है: आपकी जन्म तिथि से मूलांक, भाग्यांक, लो शू ग्रिड, कुआ नंबर और जीवन-चक्र, तथा आपके नाम से कैल्डियन नामांक, आत्मा आग्रह और व्यक्तित्व संख्या। अंत में अगले बारह महीनों की माहवार प्रवृत्ति और सरल, निःशुल्क उपाय दिए गए हैं।',
  referenceFiles: ['docs/referencerepots/Fortune Report.pdf'],
  requires: { birthTime: false, partner: false, vargas: ['D1'], transitYears: 1 },
  language: 'hi',
  theme: { primary: '633115', accent: 'CC8E26', tint: 'FBF4EB' },
  writingGuidance: [
    ...NUMEROLOGY_WRITING_GUIDANCE,
    'Write in natural, warm, contemporary Hindi (Devanagari), as spoken by an educated Indian family; keep common English terms such as Lo Shu, Kua and Feng Shui where Hindi readers use them.',
  ],
  sections: numerologySections('fortune', 'hi', 'f'),
};

/** The English edition: same sections, topics, blocks, evidence and objectives; English reader text. */
export const FORTUNE_DEFINITION_EN: ReportDefinitionInput = {
  ...FORTUNE_DEFINITION,
  title: 'Fortune Report',
  subtitle: 'The direction of your life, read from your Mulank, Bhagyank, name and Lo Shu grid',
  description:
    'This report is based on numerology alone: from your date of birth, your Mulank, Bhagyank, Lo Shu grid, Kua number and life cycles; and from your name, the Chaldean name number, soul urge and personality numbers. It closes with a month-by-month trend for the next twelve months and simple, free remedies.',
  language: 'en',
  writingGuidance: [...NUMEROLOGY_WRITING_GUIDANCE],
  sections: numerologySections('fortune', 'en', 'f'),
};

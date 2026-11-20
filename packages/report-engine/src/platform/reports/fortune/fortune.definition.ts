/**
 * Fortune Report (numerology only) — Hindi edition.
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
  theme: { primary: '3D2366', accent: 'C59A3A', tint: 'F6F1FA' },
  writingGuidance: [
    ...NUMEROLOGY_WRITING_GUIDANCE,
    'Write in natural, warm, contemporary Hindi (Devanagari), as spoken by an educated Indian family; keep common English terms such as Lo Shu, Kua and Feng Shui where Hindi readers use them.',
  ],
  sections: numerologySections('fortune', 'hi', 'f'),
};

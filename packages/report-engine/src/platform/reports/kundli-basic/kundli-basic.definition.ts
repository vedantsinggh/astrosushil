/**
 * Basic Kundli — the shorter edition of the Premium Personalised Kundli
 * (reportType KUNDLI_BASIC; docs/integration/website-integration-plan.md,
 * "The shorter basic Kundli").
 *
 * It is not a separate report: it is a selection of the full Kundli's own
 * topics, so the two can never disagree. It keeps what a reader expects from a
 * kundli (birth particulars, the main charts, the dasha tables, the three
 * pillars, the nine planets, one reading each on love and career, Sade Sati,
 * yogas and practices) and leaves the deep tables and the house-by-house and
 * period-by-period chapters to the full report.
 */
import { ReportDefinitionInput } from '../../contracts';
import { HindiEdition } from '../../i18n/hindi';
import { KUNDLI_DEFINITION } from '../kundli/kundli.definition';
import { KUNDLI_HINDI } from '../kundli/kundli.hindi';

/** Topic ids of the full Kundli that the basic edition keeps, in the full report's order. */
export const KUNDLI_BASIC_TOPIC_IDS: readonly string[] = [
  'birth-details', 'avakahada', 'panchang-at-birth',
  'chart-d1-north', 'chart-d9', 'planet-positions', 'house-overview',
  'life-timeline', 'md-table', 'ad-table',
  'pillar-lagna', 'pillar-moon', 'pillar-nakshatra',
  'planet-sun', 'planet-moon', 'planet-mars', 'planet-mercury', 'planet-jupiter', 'planet-venus', 'planet-saturn',
  'love-heart', 'career-calling',
  'planet-rahu', 'planet-ketu',
  'sade-sati-table', 'sade-sati-reading',
  'yoga-table', 'yoga-reading',
  'dosha-note',
  'practice-table', 'remedy-reading',
];

const KEEP = new Set(KUNDLI_BASIC_TOPIC_IDS);

const sections = KUNDLI_DEFINITION.sections
  .map((s) => ({
    ...s,
    topics: s.topics
      .filter((t) => KEEP.has(t.id))
      // A kept topic may not depend on one that was left out.
      .map((t) => (t.dependsOn ? { ...t, dependsOn: t.dependsOn.filter((d) => KEEP.has(d)) } : t)),
  }))
  .filter((s) => s.topics.length > 0);

export const KUNDLI_BASIC_DEFINITION: ReportDefinitionInput = {
  ...KUNDLI_DEFINITION,
  id: 'kundli-basic',
  reportType: 'KUNDLI_BASIC',
  specVersion: '1.0.0',
  title: 'Basic Kundli',
  subtitle: 'Your Vedic birth chart: the essential calculations, your nine planets and practical guidance',
  description:
    'The essentials of your Kundli: birth particulars and panchang, the Lagna and Navamsa charts, planetary positions, the twelve houses at a glance, your Vimshottari periods, the three pillars of the self, a reading of each of the nine planets, love and career in brief, Sade Sati and yogas presented without fear, and practical guidance.',
  writingGuidance: [
    ...KUNDLI_DEFINITION.writingGuidance.filter((g) => !/Mahadasha topics/.test(g)),
    'This is the shorter edition of the Kundli: be concise and concrete, and do not refer the reader to chapters that are not in this report.',
  ],
  sections,
};

const keptSections = new Set(sections.map((s) => s.id));

export const KUNDLI_BASIC_HINDI: HindiEdition = {
  ...KUNDLI_HINDI,
  title: 'मूल कुंडली',
  subtitle: 'आपकी वैदिक जन्म कुंडली: आवश्यक गणनाएँ, आपके नौ ग्रह और व्यावहारिक मार्गदर्शन',
  description:
    'आपकी कुंडली का सार: जन्म विवरण और पंचांग, लग्न और नवांश कुंडली, ग्रहों की स्थिति, बारह भाव एक नज़र में, आपकी विंशोत्तरी दशाएँ, व्यक्तित्व के तीन आधार, नौ ग्रहों में से प्रत्येक का विवेचन, प्रेम और कार्यक्षेत्र का संक्षिप्त विवेचन, साढ़े साती और योगों का भय-मुक्त विवेचन, तथा व्यावहारिक मार्गदर्शन।',
  sections: Object.fromEntries(Object.entries(KUNDLI_HINDI.sections).filter(([id]) => keptSections.has(id))),
  topics: Object.fromEntries(Object.entries(KUNDLI_HINDI.topics).filter(([id]) => KEEP.has(id))),
};

/**
 * Hindi edition support (docs/integration/hindi-reports-design.md).
 *
 * One glossary for the fixed vocabulary of a report (planets, signs,
 * nakshatras, dignities, table headings), so a term is spelled one way in
 * every block, and the overlay that turns an English definition into its
 * Hindi edition. Nothing here calculates or changes astrology: these are
 * display names for values the engine already produced.
 */
import { ReportDefinition } from '../contracts';

export type ReportLanguage = 'en' | 'hi';

export const PLANET_HI: Record<string, string> = {
  Sun: 'सूर्य', Moon: 'चंद्र', Mars: 'मंगल', Mercury: 'बुध', Jupiter: 'गुरु', Venus: 'शुक्र', Saturn: 'शनि', Rahu: 'राहु', Ketu: 'केतु',
  Ascendant: 'लग्न',
};

/** Two-letter chart abbreviations, as printed inside a North Indian chart. */
export const PLANET_ABBR_HI: Record<string, string> = {
  Sun: 'सू', Moon: 'चं', Mars: 'मं', Mercury: 'बु', Jupiter: 'गु', Venus: 'शु', Saturn: 'श', Rahu: 'रा', Ketu: 'के',
};

export const SIGN_HI: Record<string, string> = {
  Aries: 'मेष', Taurus: 'वृषभ', Gemini: 'मिथुन', Cancer: 'कर्क', Leo: 'सिंह', Virgo: 'कन्या',
  Libra: 'तुला', Scorpio: 'वृश्चिक', Sagittarius: 'धनु', Capricorn: 'मकर', Aquarius: 'कुंभ', Pisces: 'मीन',
};

/** Keyed by the engine's spelling (packages/astrology-engine/src/nakshatra/nakshatra.ts). */
export const NAKSHATRA_HI: Record<string, string> = {
  Ashwini: 'अश्विनी', Bharani: 'भरणी', Krittika: 'कृत्तिका', Rohini: 'रोहिणी', Mrigashira: 'मृगशिरा', Ardra: 'आर्द्रा',
  Punarvasu: 'पुनर्वसु', Pushya: 'पुष्य', Ashlesha: 'आश्लेषा', Magha: 'मघा', 'Purva Phalguni': 'पूर्व फाल्गुनी',
  'Uttara Phalguni': 'उत्तर फाल्गुनी', Hasta: 'हस्त', Chitra: 'चित्रा', Swati: 'स्वाति', Vishakha: 'विशाखा', Anuradha: 'अनुराधा',
  Jyeshtha: 'ज्येष्ठा', Mula: 'मूल', 'Purva Ashadha': 'पूर्वाषाढ़ा', 'Uttara Ashadha': 'उत्तराषाढ़ा', Shravana: 'श्रवण',
  Dhanishta: 'धनिष्ठा', Shatabhisha: 'शतभिषा', 'Purva Bhadrapada': 'पूर्व भाद्रपद', 'Uttara Bhadrapada': 'उत्तर भाद्रपद', Revati: 'रेवती',
};

/** Keyed by the engine's dignity value. */
export const DIGNITY_HI: Record<string, string> = {
  EXALTED: 'उच्च', DEBILITATED: 'नीच', MOOLATRIKONA: 'मूलत्रिकोण', OWN_SIGN: 'स्वराशि', GREAT_FRIEND: 'अधिमित्र राशि',
  FRIEND: 'मित्र राशि', NEUTRAL: 'सम राशि', ENEMY: 'शत्रु राशि', GREAT_ENEMY: 'अधिशत्रु राशि',
};

/** Fixed labels: table headings and short captions, keyed by their English text. */
const LABEL_HI: Record<string, string> = {
  Planet: 'ग्रह', Sign: 'राशि', Degree: 'अंश', 'Nakshatra / pada': 'नक्षत्र / चरण', 'Sign lord': 'राशि स्वामी', 'Nak. lord': 'नक्षत्र स्वामी',
  House: 'भाव', Dignity: 'स्थिति', 'R / C': 'व / अ', '°/day': '°/दिन', Ascendant: 'लग्न', Asc: 'ल', R: 'व', C: 'अ',
  'North Indian style. Numbers are signs (1 = Aries … 12 = Pisces); the top diamond is the 1st house. R = retrograde.':
    'उत्तर भारतीय शैली। अंक राशियाँ हैं (1 = मेष … 12 = मीन); ऊपर का बीच वाला खाना पहला भाव है। व = वक्री।',
  'Degree within the sign. R = retrograde, C = combust (within the classical distance of the Sun). Speed is daily motion in longitude; negative means retrograde. Rahu and Ketu are mean nodes and always retrograde.':
    'अंश राशि के भीतर के हैं। व = वक्री, अ = अस्त (सूर्य से शास्त्रीय दूरी के भीतर)। गति प्रतिदिन की देशांतर गति है; ऋणात्मक का अर्थ वक्री है। राहु और केतु मध्यम पात हैं और सदा वक्री रहते हैं।',
};

/**
 * Adds a report's own fixed labels (table headings, captions, method notes) to the glossary.
 * Call it at module load from the report's `<id>.hindi.ts`. The same English label must not be
 * given two different Hindi forms.
 */
export function registerHindiLabels(labels: Record<string, string>): void {
  for (const [en, hi] of Object.entries(labels)) {
    const existing = LABEL_HI[en];
    if (existing !== undefined && existing !== hi) throw new Error(`HINDI_LABEL_CONFLICT: "${en}" is already "${existing}", not "${hi}"`);
    LABEL_HI[en] = hi;
  }
}

/** One of two fixed texts by language, for sentences built from values (where a lookup by English text cannot work). */
export const pick = (lang: ReportLanguage, en: string, hi: string): string => (lang === 'hi' ? hi : en);

/** A fixed label in the report language. English is returned unchanged; an untranslated Hindi label is a defect caught by tests. */
export function label(lang: ReportLanguage, en: string): string {
  if (lang === 'en') return en;
  const hi = LABEL_HI[en];
  if (hi === undefined) throw new Error(`HINDI_LABEL_MISSING: "${en}"`);
  return hi;
}

const named = (map: Record<string, string>, kind: string) => (lang: ReportLanguage, en: string): string => {
  if (lang === 'en') return en;
  const hi = map[en];
  if (hi === undefined) throw new Error(`HINDI_${kind}_MISSING: "${en}"`);
  return hi;
};

export const planetLabel = named(PLANET_HI, 'PLANET');
export const planetAbbr = named(PLANET_ABBR_HI, 'PLANET_ABBR');
export const signLabel = named(SIGN_HI, 'SIGN');
export const nakshatraLabel = named(NAKSHATRA_HI, 'NAKSHATRA');
export const dignityLabel = named(DIGNITY_HI, 'DIGNITY');

// ---------------------------------------------------------------------------
// Hindi edition of a definition
// ---------------------------------------------------------------------------

/**
 * The Hindi display text of a report. It is an overlay keyed by the ids of the
 * English definition, so the two editions cannot differ in structure, evidence
 * or objectives: only what the reader sees changes.
 */
export interface HindiEdition {
  title: string;
  subtitle: string;
  description: string;
  /** Extra writing rules for the Hindi narrative, added to the definition's own. */
  writingGuidance?: string[];
  sections: Record<string, { title: string; kicker: string; intro?: string }>;
  topics: Record<string, { title: string; subtitle?: string }>;
}

const HINDI_STYLE =
  'Write in natural, warm, contemporary Hindi (Devanagari), as spoken by an educated Indian family. Use the standard Hindi names of planets, signs, houses (भाव) and nakshatras. Do not mix in English words where a common Hindi word exists, and never write Hindi in Roman letters.';

/** The Hindi edition of a validated English definition. Every section and topic must have Hindi text. */
export function applyHindiEdition(def: ReportDefinition, edition: HindiEdition): ReportDefinition {
  const missing: string[] = [];
  const sections = def.sections.map((s) => {
    const hs = edition.sections[s.id];
    if (!hs) missing.push(`section ${s.id}`);
    if (s.intro && !hs?.intro) missing.push(`intro of section ${s.id}`);
    return {
      ...s,
      title: hs?.title ?? s.title,
      kicker: hs?.kicker ?? s.kicker,
      intro: hs?.intro ?? s.intro,
      topics: s.topics.map((t) => {
        const ht = edition.topics[t.id];
        if (!ht) missing.push(`topic ${t.id}`);
        if (t.subtitle && !ht?.subtitle) missing.push(`subtitle of topic ${t.id}`);
        return { ...t, title: ht?.title ?? t.title, subtitle: ht?.subtitle ?? t.subtitle };
      }),
    };
  });
  if (missing.length) throw new Error(`HINDI_EDITION_INCOMPLETE: ${def.id} lacks Hindi text for ${missing.join(', ')}`);
  return {
    ...def,
    language: 'hi',
    title: edition.title,
    subtitle: edition.subtitle,
    description: edition.description,
    writingGuidance: [...def.writingGuidance, HINDI_STYLE, ...(edition.writingGuidance ?? [])],
    sections,
  };
}

/**
 * Classical associations used by the numerology family, with English and
 * Hindi labels. All look-ups are keyed by a computed number or planet; the
 * basis of each table is logged in docs/report-system/decisions/numerology.md.
 */
import { getNaturalRelationship, PlanetSymbol } from '@astro/astrology-engine';
import type { PlanetName } from '../../evidence/evidence-registry';

export type Lang = 'en' | 'hi';

/** Pick the label for the report language. */
export const L = (lang: Lang, en: string, hi: string): string => (lang === 'hi' ? hi : en);

/** NUM-002 Number → ruling planet (1 Sun, 2 Moon, 3 Jupiter, 4 Rahu, 5 Mercury, 6 Venus, 7 Ketu, 8 Saturn, 9 Mars). Same as D-003. */
export const NUMBER_PLANET: Record<number, PlanetName> = {
  1: 'Sun', 2: 'Moon', 3: 'Jupiter', 4: 'Rahu', 5: 'Mercury', 6: 'Venus', 7: 'Ketu', 8: 'Saturn', 9: 'Mars',
};

const SYMBOL: Record<PlanetName, PlanetSymbol> = {
  Sun: PlanetSymbol.SUN, Moon: PlanetSymbol.MOON, Mars: PlanetSymbol.MARS, Mercury: PlanetSymbol.MERCURY,
  Jupiter: PlanetSymbol.JUPITER, Venus: PlanetSymbol.VENUS, Saturn: PlanetSymbol.SATURN, Rahu: PlanetSymbol.RAHU, Ketu: PlanetSymbol.KETU,
};

export type Relation = 'friend' | 'neutral' | 'enemy';

/** Naisargika (natural) relationship of planet a towards planet b (BPHS ch. 3), from the engine. */
export function planetRelation(a: PlanetName, b: PlanetName): Relation {
  const r = String(getNaturalRelationship(SYMBOL[a], SYMBOL[b])).toUpperCase();
  return r.includes('FRIEND') ? 'friend' : r.includes('ENEMY') ? 'enemy' : 'neutral';
}

/**
 * NUM-014 Harmony between two numbers, read from both directions of the
 * natural relationship of their ruling planets:
 *   harmonious   — same number, or friendly both ways, or friendly one way and neutral the other
 *   mixed        — any other combination without enmity on both sides
 *   demanding    — enmity on both sides
 */
export type Harmony = 'harmonious' | 'mixed' | 'demanding' | 'same';
export function numberHarmony(a: number, b: number): Harmony {
  if (a === b) return 'same';
  const pa = NUMBER_PLANET[a];
  const pb = NUMBER_PLANET[b];
  const ab = planetRelation(pa, pb);
  const ba = planetRelation(pb, pa);
  if (ab === 'enemy' && ba === 'enemy') return 'demanding';
  if ((ab === 'friend' && ba !== 'enemy') || (ba === 'friend' && ab !== 'enemy')) return 'harmonious';
  return 'mixed';
}

export const HARMONY_LABEL: Record<Harmony, { en: string; hi: string }> = {
  same: { en: 'Same number', hi: 'समान अंक' },
  harmonious: { en: 'Harmonious', hi: 'सामंजस्यपूर्ण' },
  mixed: { en: 'Mixed', hi: 'मिश्रित' },
  demanding: { en: 'Needs patience', hi: 'धैर्य अपेक्षित' },
};

export const RELATION_LABEL: Record<Relation, { en: string; hi: string }> = {
  friend: { en: 'friend', hi: 'मित्र' },
  neutral: { en: 'neutral', hi: 'सम' },
  enemy: { en: 'opposite (natural enemy)', hi: 'विरोधी (नैसर्गिक शत्रु)' },
};

export const PLANET_HI: Record<PlanetName, string> = {
  Sun: 'सूर्य', Moon: 'चंद्र', Mars: 'मंगल', Mercury: 'बुध', Jupiter: 'गुरु', Venus: 'शुक्र', Saturn: 'शनि', Rahu: 'राहु', Ketu: 'केतु',
};
export const planetLabel = (lang: Lang, p: PlanetName) => L(lang, p, PLANET_HI[p]);

export const SIGN_HI: Record<string, string> = {
  Aries: 'मेष', Taurus: 'वृषभ', Gemini: 'मिथुन', Cancer: 'कर्क', Leo: 'सिंह', Virgo: 'कन्या',
  Libra: 'तुला', Scorpio: 'वृश्चिक', Sagittarius: 'धनु', Capricorn: 'मकर', Aquarius: 'कुंभ', Pisces: 'मीन',
};
export const signLabel = (lang: Lang, s: string) => L(lang, s, SIGN_HI[s] ?? s);

/** Traditional weekday of each planet (Rahu Saturday, Ketu Tuesday), as in D-003. */
export const PLANET_DAY: Record<PlanetName, { en: string; hi: string }> = {
  Sun: { en: 'Sunday', hi: 'रविवार' }, Moon: { en: 'Monday', hi: 'सोमवार' }, Mars: { en: 'Tuesday', hi: 'मंगलवार' },
  Mercury: { en: 'Wednesday', hi: 'बुधवार' }, Jupiter: { en: 'Thursday', hi: 'गुरुवार' }, Venus: { en: 'Friday', hi: 'शुक्रवार' },
  Saturn: { en: 'Saturday', hi: 'शनिवार' }, Rahu: { en: 'Saturday', hi: 'शनिवार' }, Ketu: { en: 'Tuesday', hi: 'मंगलवार' },
};

/** Traditional colours of each planet (same table as D-003). */
export const PLANET_COLOUR: Record<PlanetName, { en: string; hi: string }> = {
  Sun: { en: 'gold, saffron', hi: 'सुनहरा, केसरिया' },
  Moon: { en: 'white, silver', hi: 'सफ़ेद, चाँदी जैसा' },
  Mars: { en: 'red, coral', hi: 'लाल, मूँगिया' },
  Mercury: { en: 'green', hi: 'हरा' },
  Jupiter: { en: 'yellow', hi: 'पीला' },
  Venus: { en: 'white, pastel pink', hi: 'सफ़ेद, हल्का गुलाबी' },
  Saturn: { en: 'deep blue, black', hi: 'गहरा नीला, काला' },
  Rahu: { en: 'smoky grey', hi: 'धुएँ जैसा स्लेटी' },
  Ketu: { en: 'earthy brown, grey', hi: 'मिट्टी जैसा भूरा, स्लेटी' },
};

/** NUM-015 Vishnu avatar associated with each planet (BPHS ch. 2, vv. 5–7). */
export const PLANET_AVATAR: Record<PlanetName, { en: string; hi: string }> = {
  Sun: { en: 'Shri Rama', hi: 'श्रीराम' },
  Moon: { en: 'Shri Krishna', hi: 'श्रीकृष्ण' },
  Mars: { en: 'Narasimha', hi: 'नृसिंह' },
  Mercury: { en: 'Buddha', hi: 'बुद्ध' },
  Jupiter: { en: 'Vamana', hi: 'वामन' },
  Venus: { en: 'Parashurama', hi: 'परशुराम' },
  Saturn: { en: 'Kurma', hi: 'कूर्म' },
  Rahu: { en: 'Varaha', hi: 'वराह' },
  Ketu: { en: 'Matsya', hi: 'मत्स्य' },
};

/** NUM-016 Navagraha beej mantras (traditional; free to recite). Devanagari + transliteration. */
export const BEEJ_MANTRA: Record<PlanetName, { dev: string; roman: string }> = {
  Sun: { dev: 'ॐ ह्रां ह्रीं ह्रौं सः सूर्याय नमः', roman: 'Om Hraam Hreem Hraum Sah Suryaya Namah' },
  Moon: { dev: 'ॐ श्रां श्रीं श्रौं सः चन्द्रमसे नमः', roman: 'Om Shraam Shreem Shraum Sah Chandramase Namah' },
  Mars: { dev: 'ॐ क्रां क्रीं क्रौं सः भौमाय नमः', roman: 'Om Kraam Kreem Kraum Sah Bhaumaya Namah' },
  Mercury: { dev: 'ॐ ब्रां ब्रीं ब्रौं सः बुधाय नमः', roman: 'Om Braam Breem Braum Sah Budhaya Namah' },
  Jupiter: { dev: 'ॐ ग्रां ग्रीं ग्रौं सः गुरवे नमः', roman: 'Om Graam Greem Graum Sah Gurave Namah' },
  Venus: { dev: 'ॐ द्रां द्रीं द्रौं सः शुक्राय नमः', roman: 'Om Draam Dreem Draum Sah Shukraya Namah' },
  Saturn: { dev: 'ॐ प्रां प्रीं प्रौं सः शनैश्चराय नमः', roman: 'Om Praam Preem Praum Sah Shanaishcharaya Namah' },
  Rahu: { dev: 'ॐ भ्रां भ्रीं भ्रौं सः राहवे नमः', roman: 'Om Bhraam Bhreem Bhraum Sah Rahave Namah' },
  Ketu: { dev: 'ॐ स्रां स्रीं स्रौं सः केतवे नमः', roman: 'Om Sraam Sreem Sraum Sah Ketave Namah' },
};

export const MAHAMRITYUNJAYA = {
  dev: 'ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम् / उर्वारुकमिव बन्धनान् मृत्योर्मुक्षीय माऽमृतात्',
  roman: 'Om Tryambakam Yajamahe Sugandhim Pushtivardhanam, Urvarukamiva Bandhanan Mrityor Mukshiya Mamritat',
};

export const ELEMENT_HI: Record<string, string> = { Water: 'जल', Earth: 'पृथ्वी', Wood: 'काष्ठ (लकड़ी)', Metal: 'धातु', Fire: 'अग्नि' };
export const elementLabel = (lang: Lang, e: string) => L(lang, e, ELEMENT_HI[e] ?? e);

export const DIRECTION: Record<string, { en: string; hi: string }> = {
  N: { en: 'North', hi: 'उत्तर' }, S: { en: 'South', hi: 'दक्षिण' }, E: { en: 'East', hi: 'पूर्व' }, W: { en: 'West', hi: 'पश्चिम' },
  NE: { en: 'North-East', hi: 'उत्तर-पूर्व (ईशान)' }, NW: { en: 'North-West', hi: 'उत्तर-पश्चिम (वायव्य)' },
  SE: { en: 'South-East', hi: 'दक्षिण-पूर्व (आग्नेय)' }, SW: { en: 'South-West', hi: 'दक्षिण-पश्चिम (नैऋत्य)' },
  Centre: { en: 'Centre', hi: 'केंद्र' },
};
/** Short direction names for tight spaces (grid cells). */
export const DIRECTION_SHORT: Record<string, { en: string; hi: string }> = {
  N: { en: 'North', hi: 'उत्तर' }, S: { en: 'South', hi: 'दक्षिण' }, E: { en: 'East', hi: 'पूर्व' }, W: { en: 'West', hi: 'पश्चिम' },
  NE: { en: 'North-East', hi: 'ईशान' }, NW: { en: 'North-West', hi: 'वायव्य' }, SE: { en: 'South-East', hi: 'आग्नेय' }, SW: { en: 'South-West', hi: 'नैऋत्य' },
  Centre: { en: 'Centre', hi: 'केंद्र' },
};
export const directionLabel = (lang: Lang, d: string) => L(lang, DIRECTION[d]?.en ?? d, DIRECTION[d]?.hi ?? d);

export const MONTHS: Array<{ en: string; hi: string }> = [
  { en: 'January', hi: 'जनवरी' }, { en: 'February', hi: 'फ़रवरी' }, { en: 'March', hi: 'मार्च' }, { en: 'April', hi: 'अप्रैल' },
  { en: 'May', hi: 'मई' }, { en: 'June', hi: 'जून' }, { en: 'July', hi: 'जुलाई' }, { en: 'August', hi: 'अगस्त' },
  { en: 'September', hi: 'सितंबर' }, { en: 'October', hi: 'अक्टूबर' }, { en: 'November', hi: 'नवंबर' }, { en: 'December', hi: 'दिसंबर' },
];
export const monthLabel = (lang: Lang, month: number) => L(lang, MONTHS[month - 1].en, MONTHS[month - 1].hi);

export const NAME_PLANE_LABEL: Record<string, { en: string; hi: string }> = {
  mental: { en: 'Mental (knowledge)', hi: 'मानसिक (ज्ञान)' },
  physical: { en: 'Physical (strength)', hi: 'शारीरिक (शक्ति)' },
  emotional: { en: 'Emotional', hi: 'भावनात्मक' },
  intuitive: { en: 'Intuitive (spiritual)', hi: 'अंतर्ज्ञान (आध्यात्मिक)' },
};

export const LINE_LABEL: Record<string, { en: string; hi: string }> = {
  'row-492': { en: 'Top row 4-9-2 (mind)', hi: 'ऊपरी पंक्ति 4-9-2 (मन)' },
  'row-357': { en: 'Middle row 3-5-7 (emotion)', hi: 'मध्य पंक्ति 3-5-7 (भावना)' },
  'row-816': { en: 'Bottom row 8-1-6 (practical life)', hi: 'निचली पंक्ति 8-1-6 (व्यावहारिक जीवन)' },
  'col-438': { en: 'Left column 4-3-8 (thought)', hi: 'बायाँ स्तंभ 4-3-8 (विचार)' },
  'col-951': { en: 'Centre column 9-5-1 (will)', hi: 'मध्य स्तंभ 9-5-1 (इच्छाशक्ति)' },
  'col-276': { en: 'Right column 2-7-6 (action)', hi: 'दायाँ स्तंभ 2-7-6 (कर्म)' },
  'diag-456': { en: 'Diagonal 4-5-6', hi: 'विकर्ण 4-5-6' },
  'diag-258': { en: 'Diagonal 2-5-8', hi: 'विकर्ण 2-5-8' },
};

export const GENDER_LABEL: Record<string, { en: string; hi: string }> = {
  male: { en: 'Male', hi: 'पुरुष' }, female: { en: 'Female', hi: 'महिला' }, other: { en: 'Not specified', hi: 'निर्दिष्ट नहीं' },
};

/** Hindi date "18 नवंबर 2026" / English "18 Nov 2026". */
export function dateLabel(lang: Lang, iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (lang === 'hi') return `${d} ${MONTHS[m - 1].hi} ${y}`;
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1].en.slice(0, 3)} ${y}`;
}

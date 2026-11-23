/**
 * Hindi display text of the core blocks (render/blocks.ts) and the small helpers every
 * Hindi-capable block needs: ordinals, dates, weekdays and divisional-chart names.
 * Display only: numbers, evidence ids and calculations are those of the English block.
 * Imported by render/blocks.ts, so these labels are registered whenever blocks are used.
 */
import { ordinal } from '../evidence/evidence-registry';
import { planetLabel, registerHindiLabels, ReportLanguage } from '../i18n/hindi';

// --- Ordinals ----------------------------------------------------------------

/** Grammatical form of a Hindi ordinal: "10वाँ भाव", "10वें भाव में", "7वीं दृष्टि". */
export type OrdinalForm = 'direct' | 'oblique' | 'feminine';

const ORDINAL_SUFFIX: Record<OrdinalForm, { 1: string; 2: string; 3: string; 4: string; 6: string; other: string }> = {
  direct: { 1: 'ला', 2: 'रा', 3: 'रा', 4: 'था', 6: 'ठा', other: 'वाँ' },
  oblique: { 1: 'ले', 2: 'रे', 3: 'रे', 4: 'थे', 6: 'ठे', other: 'वें' },
  feminine: { 1: 'ली', 2: 'री', 3: 'री', 4: 'थी', 6: 'ठी', other: 'वीं' },
};

/** Hindi ordinal written with the digit, e.g. 1ला, 2रा, 4था, 6ठा, 10वाँ. */
export function ordinalHi(n: number, form: OrdinalForm = 'direct'): string {
  const s = ORDINAL_SUFFIX[form];
  const suffix = n === 1 || n === 2 || n === 3 || n === 4 || n === 6 ? s[n] : s.other;
  return `${n}${suffix}`;
}

/** An ordinal in the block's language; English is `ordinal(n)` unchanged. */
export const ordinalLabel = (lang: ReportLanguage, n: number, form: OrdinalForm = 'direct'): string =>
  lang === 'hi' ? ordinalHi(n, form) : ordinal(n);

// --- Dates and weekdays --------------------------------------------------------

const MONTH_HI: Record<string, string> = {
  Jan: 'जनवरी', Feb: 'फरवरी', Mar: 'मार्च', Apr: 'अप्रैल', May: 'मई', Jun: 'जून',
  Jul: 'जुलाई', Aug: 'अगस्त', Sep: 'सितंबर', Sept: 'सितंबर', Oct: 'अक्टूबर', Nov: 'नवंबर', Dec: 'दिसंबर',
};

/**
 * A date already formatted in the report's English style ("20 Nov 2026") in the block's
 * language: the day and year are untouched, only the month name changes.
 */
export function dateLabel(lang: ReportLanguage, formatted: string): string {
  if (lang === 'en') return formatted;
  return formatted.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\b/g, (m) => MONTH_HI[m]);
}

export const WEEKDAY_HI: Record<string, string> = {
  Sunday: 'रविवार', Monday: 'सोमवार', Tuesday: 'मंगलवार', Wednesday: 'बुधवार', Thursday: 'गुरुवार', Friday: 'शुक्रवार', Saturday: 'शनिवार',
};

export function weekdayLabel(lang: ReportLanguage, en: string): string {
  if (lang === 'en') return en;
  const hi = WEEKDAY_HI[en];
  if (hi === undefined) throw new Error(`HINDI_WEEKDAY_MISSING: "${en}"`);
  return hi;
}

/** A comma-separated list of planets in the block's language. */
export const planetList = (lang: ReportLanguage, planets: readonly string[]): string => planets.map((p) => planetLabel(lang, p)).join(', ');

// --- Divisional charts ---------------------------------------------------------

/** Hindi names of the divisional charts, keyed by varga code. */
export const VARGA_HI: Record<string, string> = {
  D1: 'राशि (लग्न) कुंडली', D2: 'होरा', D3: 'द्रेष्काण', D4: 'चतुर्थांश', D7: 'सप्तांश', D9: 'नवांश', D10: 'दशमांश', D12: 'द्वादशांश',
  D16: 'षोडशांश', D20: 'विंशांश', D24: 'चतुर्विंशांश', D27: 'सप्तविंशांश', D30: 'त्रिंशांश', D40: 'खवेदांश', D45: 'अक्षवेदांश', D60: 'षष्ट्यंश',
};

/** The engine's division rule of a varga in Hindi, keyed by the engine's rule text (same numbers). */
const VARGA_RULE_HI: Record<string, string> = {
  '3.3333-degree division: Fiery signs from Aries, Earthy from Capricorn, Airy from Libra, Watery from Cancer':
    '3.3333 अंश का विभाजन: अग्नि राशियों की गिनती मेष से, पृथ्वी राशियों की मकर से, वायु राशियों की तुला से और जल राशियों की कर्क से',
  '3-degree division: Odd signs start from self; Even signs start from 9th from self':
    '3 अंश का विभाजन: विषम राशियों की गिनती उसी राशि से, सम राशियों की अपने से 9वीं राशि से',
};

/** Method note of a divisional chart in Hindi. A rule without a Hindi form is left out, never printed in English. */
export function vargaMethodHi(varga: string, calculationRule: string): string {
  const name = VARGA_HI[varga];
  const rule = VARGA_RULE_HI[calculationRule];
  return `${name ? `${name} (${varga})` : varga}, वर्ग कुंडली गणना इंजन द्वारा निकाली गई${rule ? ` (${rule})` : ''}। उत्तर भारतीय शैली; ऊपर का बीच वाला खाना इस वर्ग कुंडली का लग्न है।`;
}

// --- Numerology associations of the love blocks ----------------------------------

export const COLOUR_HI: Record<string, string> = {
  'gold, saffron': 'सुनहरा, केसरिया', 'white, silver': 'सफेद, रुपहला', 'red, coral': 'लाल, मूँगिया', green: 'हरा', yellow: 'पीला',
  'white, pastel pink': 'सफेद, हल्का गुलाबी', 'deep blue, black': 'गहरा नीला, काला', 'smoky grey': 'धुएँ जैसा स्लेटी', 'earthy brown, grey': 'मटमैला भूरा, स्लेटी',
};

export const GEM_HI: Record<string, string> = {
  Ruby: 'माणिक्य', Pearl: 'मोती', 'Red Coral': 'मूँगा', Emerald: 'पन्ना', 'Yellow Sapphire': 'पुखराज',
  Diamond: 'हीरा', 'Blue Sapphire': 'नीलम', Hessonite: 'गोमेद', "Cat's Eye": 'लहसुनिया',
};

// --- Fixed labels of the core blocks ---------------------------------------------

registerHindiLabels({
  // kvTable
  Factor: 'विवरण',
  'Your chart': 'आपकी कुंडली',
  // loveAstralDetails
  'Ascendant (Lagna)': 'लग्न',
  'Moon sign (Rashi)': 'चंद्र राशि',
  'Birth nakshatra': 'जन्म नक्षत्र',
  Venus: 'शुक्र',
  '5th house (romance)': '5वाँ भाव (प्रेम)',
  '7th house (partnership)': '7वाँ भाव (साझेदारी और विवाह)',
  'Darakaraka (spouse significator)': 'दारकारक (जीवनसाथी का कारक)',
  'Mulank / Bhagyank': 'मूलांक / भाग्यांक',
  // loveAllies
  'Your Mulank and its ruling planet': 'आपका मूलांक और उसका स्वामी ग्रह',
  'Harmonious numbers': 'अनुकूल अंक',
  'none in the natural-friendship table': 'नैसर्गिक मित्रता तालिका में कोई नहीं',
  'Supportive weekday': 'अनुकूल वार',
  'Supportive colours': 'अनुकूल रंग',
  'Supportive dates of the month': 'महीने की अनुकूल तारीखें',
  'Traditional gem of the ruling planet': 'स्वामी ग्रह का पारंपरिक रत्न',
  'Derived from classical rules: the planet ruling your Mulank (1 Sun, 2 Moon, 3 Jupiter, 4 Rahu, 5 Mercury, 6 Venus, 7 Ketu, 8 Saturn, 9 Mars), its weekday and colours, and numbers ruled by its natural friends (Brihat Parashara Hora Shastra).':
    'शास्त्रीय नियमों से निकाला गया: आपके मूलांक का स्वामी ग्रह (1 सूर्य, 2 चंद्र, 3 गुरु, 4 राहु, 5 बुध, 6 शुक्र, 7 केतु, 8 शनि, 9 मंगल), उसका वार और रंग, तथा उसके नैसर्गिक मित्र ग्रहों के अंक (बृहत् पाराशर होरा शास्त्र)।',
  // loveCautions
  'Numbers that may need more patience': 'वे अंक जिनके साथ थोड़ा अधिक धैर्य चाहिए',
  'none in the natural-enmity table': 'नैसर्गिक शत्रुता तालिका में कोई नहीं',
  Why: 'कारण',
  'Weekdays to approach with extra care': 'वे वार जिनमें थोड़ी अधिक सजगता रखें',
  'These are gentle tendencies, not warnings. A relationship with someone of any number can flourish with understanding, respect and good communication.':
    'ये हल्के झुकाव हैं, चेतावनियाँ नहीं। किसी भी अंक वाले व्यक्ति के साथ संबंध आपसी समझ, सम्मान और अच्छे संवाद से खूब फल-फूल सकता है।',
  "Derived from the natural (naisargika) enmities between your Mulank's ruling planet and the rulers of other numbers.":
    'आपके मूलांक के स्वामी ग्रह और अन्य अंकों के स्वामी ग्रहों के बीच की नैसर्गिक शत्रुता से निकाला गया।',
  // loveJupiterWindows
  Period: 'अवधि',
  'Jupiter in': 'गुरु की राशि',
  "Jupiter's influence": 'गुरु का प्रभाव',
  'No Jupiter contact with these points falls within the calculated horizon.': 'गणना की गई अवधि में गुरु का इन बिंदुओं से कोई संपर्क नहीं बनता।',
  'Jupiter sign periods computed by the transit ingress solver from your report date; (R) marks a retrograde re-entry.':
    'गुरु की राशि-अवधियाँ आपकी रिपोर्ट की तिथि से राशि-प्रवेश की गणना द्वारा निकाली गई हैं; (व) का अर्थ है वक्री होकर पिछली राशि में दोबारा प्रवेश।',
});

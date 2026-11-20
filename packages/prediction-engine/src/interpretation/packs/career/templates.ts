/**
 * Career pack templates: closed conclusion-code sets, fixed conclusion texts, questions and the
 * phrases used in the deterministic "because" explanation.
 *
 * Conclusions are descriptive categories of the chart (ADR-016: interpretation texts come from the
 * client; we generate categories). They never state salary, employer, title, promotion or an exact
 * event, and they never use intensifiers. Every template is a pure function of its arguments.
 */
import type { ConditionCode, HouseCategory, PlanetName, StrengthClass, VargaSignDignity } from '../../types';
import type { PlanetaryDignity } from '@astro/astrology-engine';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export const isoDate = (iso: string): string => iso.slice(0, 10);

/** India Standard Time (Asia/Kolkata, the business timezone; no DST). */
const IST_OFFSET_MS = 330 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/**
 * Date as written in conclusion texts: the IST calendar date in one human format, "20 Nov 2026"
 * (audit F24; the same format as the report-engine career labels). A bare YYYY-MM-DD is a calendar
 * date and is not shifted. Deterministic: depends only on the input string.
 */
export function displayDate(iso: string): string {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : new Date(Date.parse(iso) + IST_OFFSET_MS).toISOString().slice(0, 10);
  const [y, m, d] = day.split('-');
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
}

const listText = (xs: readonly string[]): string =>
  xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

// ---------------------------------------------------------------------------
// Explanation phrases (one per condition code; tsc enforces completeness)
// ---------------------------------------------------------------------------

export const CONDITION_PHRASES: Readonly<Record<ConditionCode, string>> = {
  BIRTH_TIME_MISSING: 'birth time missing',
  CONVENTIONS_PROVISIONAL: 'calculation conventions provisional',
  VARGA_MISSING: 'divisional chart missing',
  ASC_NEAR_SIGN_BOUNDARY: 'Ascendant near a sign boundary',
  ASC_NEAR_NAKSHATRA_BOUNDARY: 'Ascendant near a nakshatra boundary',
  ASC_NEAR_D9_BOUNDARY: 'D9 ascendant near a boundary',
  ASC_NEAR_D10_BOUNDARY: 'D10 ascendant near a boundary',
  MOON_NEAR_NAKSHATRA_BOUNDARY: 'Moon near a nakshatra boundary',
  MOON_NEAR_PADA_BOUNDARY: 'Moon near a pada boundary',
  EXALTED: 'exalted',
  MOOLATRIKONA: 'in its moolatrikona sign',
  OWN_SIGN: 'in its own sign',
  GREAT_FRIEND_SIGN: "in a great friend's sign",
  FRIEND_SIGN: "in a friend's sign",
  NEUTRAL_SIGN: 'in a neutral sign',
  ENEMY_SIGN: "in an enemy's sign",
  GREAT_ENEMY_SIGN: "in a great enemy's sign",
  DEBILITATED: 'debilitated',
  NEECHA_BHANGA: 'debility cancelled (neecha bhanga)',
  D9_EXALTED: 'exalted in the D9',
  D9_OWN_SIGN: 'in its own sign in the D9',
  D9_DEBILITATED: 'debilitated in the D9',
  D10_EXALTED: 'exalted in the D10',
  D10_OWN_SIGN: 'in its own sign in the D10',
  D10_DEBILITATED: 'debilitated in the D10',
  VARGOTTAMA: 'vargottama (same sign in D1 and D9)',
  COMBUST: 'combust',
  RETROGRADE: 'retrograde',
  SHADBALA_MEETS_REQUIRED: 'Shadbala meets the required rupas',
  SHADBALA_BELOW_REQUIRED: 'Shadbala below the required rupas',
  IN_KENDRA: 'placed in a kendra',
  IN_TRIKONA: 'placed in a trikona',
  IN_DUSTHANA: 'placed in a dusthana',
  IN_UPACHAYA: 'placed in an upachaya house',
  LAGNA_LORD: 'Lagna lord',
  LUMINARY: 'a luminary',
  YOGAKARAKA_BY_OWNERSHIP: 'Yogakaraka by ownership',
  FUNCTIONAL_FAVOURABLE: 'functionally favourable',
  FUNCTIONAL_MIXED: 'functionally mixed',
  FUNCTIONAL_NEUTRAL: 'functionally neutral',
  FUNCTIONAL_CHALLENGING: 'functionally challenging',
  OWNS_3RD: 'owns the 3rd',
  OWNS_6TH: 'owns the 6th',
  OWNS_8TH: 'owns the 8th',
  OWNS_11TH: 'owns the 11th',
  OWNS_12TH: 'owns the 12th',
  OWNS_TRIKONA: 'owns a trikona',
  OWNS_KENDRA: 'owns a kendra',
  SHADOW_PLANET: 'a shadow planet',
  NATURAL_BENEFIC: 'a natural benefic',
  NATURAL_MALEFIC: 'a natural malefic',
  LORD_IN_KENDRA: 'lord in a kendra',
  LORD_IN_TRIKONA: 'lord in a trikona',
  LORD_IN_DUSTHANA: 'lord in a dusthana',
  LORD_IN_UPACHAYA: 'lord in an upachaya house',
  LORD_IN_OTHER: 'lord in the 2nd house',
  LORD_IN_OWN_HOUSE: 'lord in its own house',
  HOUSE_OCCUPIED: 'house occupied',
  HOUSE_EMPTY: 'house unoccupied',
  HOUSE_ASPECTED: 'house aspected',
  HOUSE_NOT_ASPECTED: 'house not aspected',
  OCCUPANT_FUNCTIONAL_FAVOURABLE: 'functionally favourable occupant',
  OCCUPANT_FUNCTIONAL_CHALLENGING: 'functionally challenging occupant',
  ASPECT_FROM_FUNCTIONAL_FAVOURABLE: 'aspect from a functionally favourable planet',
  ASPECT_FROM_FUNCTIONAL_CHALLENGING: 'aspect from a functionally challenging planet',
  SAV_ABOVE_28: 'Sarvashtakavarga above 28',
  SAV_AT_28: 'Sarvashtakavarga at 28',
  SAV_BELOW_28: 'Sarvashtakavarga below 28',
  YOGA_FORMED: 'yoga formed',
  YOGA_CANCELLED: 'yoga cancelled',
  YOGA_RELATION_CONJUNCTION: 'formed by conjunction',
  YOGA_RELATION_MUTUAL_ASPECT: 'formed by mutual aspect',
  YOGA_RELATION_EXCHANGE: 'formed by sign exchange',
  YOGA_RELATION_OWNERSHIP: 'formed by ownership',
  YOGA_KEY_PLANET_SUPPORTED: 'key planet supported',
  YOGA_KEY_PLANET_WEAKENED: 'key planet weakened',
  YOGA_MALEFIC_OCCUPANT: 'malefic occupant',
  YOGA_BENEFIC_OCCUPANT: 'benefic occupant',
  YOGA_DUAL_LORDSHIP: 'dual lordship',
  YOGA_DUSTHANA_LORD_ASSOCIATION: 'association with a dusthana lord',
  YOGA_ACTIVE_MAHADASHA: 'active in the current Mahadasha',
  YOGA_ACTIVE_ANTARDASHA: 'active in the current Antardasha',
  D10_LORD_IN_KENDRA: 'in a D10 kendra',
  D10_LORD_IN_TRIKONA: 'in a D10 trikona',
  D10_LORD_IN_DUSTHANA: 'in a D10 dusthana',
  D10_LORD_IN_UPACHAYA: 'in a D10 upachaya house',
  D10_LORD_IN_OTHER: 'in the D10 2nd house',
  SAME_LORD_D1_D10: 'same lord in D1 and D10',
  D1_D10_AGREE: 'same house in D1 and D10',
  D1_D10_DIFFER: 'different houses in D1 and D10',
  MD_LORD: 'Mahadasha lord',
  AD_LORD: 'Antardasha lord',
  PERIOD_LORD_RULES_HOUSE: 'period lord rules a career house',
  PERIOD_LORD_OCCUPIES_HOUSE: 'period lord occupies a career house',
  PERIOD_LORD_ASPECTS_HOUSE: 'period lord aspects a career house',
  PERIOD_LORD_D10_LINK: 'period lord linked to a key D10 house',
  MD_AD_MUTUAL_POSITION: 'MD–AD mutual position',
  SATURN_12TH_FROM_MOON: 'Saturn 12th from the Moon',
  SATURN_OVER_MOON: "Saturn over the Moon's sign",
  SATURN_2ND_FROM_MOON: 'Saturn 2nd from the Moon',
  SATURN_4TH_FROM_MOON: 'Saturn 4th from the Moon',
  SATURN_8TH_FROM_MOON: 'Saturn 8th from the Moon',
  TRANSIT_OVER_NATAL_HOUSE: 'transit over a natal house',
  TRANSIT_OVER_NATAL_LORD: 'transit over a natal house lord',
  TRANSIT_OVER_NATAL_PLANET: 'transit over a natal planet',
  LIFE_STAGE_GATED: 'gated by life stage',
};

export const STRENGTH_PHRASES: Readonly<Record<StrengthClass, string>> = {
  supported: 'only supporting indicators apply',
  challenged: 'only challenging indicators apply',
  mixed: 'supporting and challenging indicators both apply and no cited precedence rule settles them, so both are shown',
  'resolved-supported': 'a cited precedence rule set aside the challenging indicators, so the supporting ones stand',
  'resolved-challenged': 'a cited precedence rule set aside the supporting indicators, so the challenging ones stand',
  neutral: 'no supporting or challenging indicator applies',
  'not-assessed': 'this is a descriptive fact; no strength is assessed',
};

// ---------------------------------------------------------------------------
// Category codes
// ---------------------------------------------------------------------------

const CATEGORY_ORDER: readonly HouseCategory[] = ['kendra', 'trikona', 'dusthana', 'upachaya'];

/** Closed set of placement codes: the category combinations that whole-sign houses 1–12 produce. */
export const PLACEMENT_CODES = [
  'KENDRA_TRIKONA', // 1st
  'KENDRA', // 4th, 7th
  'KENDRA_UPACHAYA', // 10th
  'TRIKONA', // 5th, 9th
  'DUSTHANA', // 8th, 12th
  'DUSTHANA_UPACHAYA', // 6th
  'UPACHAYA', // 3rd, 11th
  'OTHER', // 2nd
] as const;
export type PlacementCode = (typeof PLACEMENT_CODES)[number];

export function placementCode(categories: readonly HouseCategory[]): PlacementCode {
  const sorted = CATEGORY_ORDER.filter((c) => categories.includes(c));
  const code = (sorted.length ? sorted.join('_').toUpperCase() : 'OTHER') as PlacementCode;
  if (!PLACEMENT_CODES.includes(code)) throw new Error(`INTERPRETATION_TEMPLATE: unknown placement ${code}`);
  return code;
}

const PLACEMENT_TEXT: Readonly<Record<PlacementCode, string>> = {
  KENDRA_TRIKONA: 'a kendra and a trikona',
  KENDRA: 'a kendra',
  KENDRA_UPACHAYA: 'a kendra and an upachaya house',
  TRIKONA: 'a trikona',
  DUSTHANA: 'a dusthana',
  DUSTHANA_UPACHAYA: 'a dusthana and an upachaya house',
  UPACHAYA: 'an upachaya house',
  OTHER: 'not a kendra, trikona, dusthana or upachaya house',
};

/** Dimension / assessment conclusion codes (one per strength class). */
export const ASSESSMENT_CODES = [
  'INDICATORS_SUPPORTED',
  'INDICATORS_CHALLENGED',
  'INDICATORS_MIXED',
  'INDICATORS_RESOLVED_SUPPORTED',
  'INDICATORS_RESOLVED_CHALLENGED',
  'NO_SPECIFIC_INDICATOR',
] as const;
export type AssessmentCode = (typeof ASSESSMENT_CODES)[number];

export function assessmentCode(cls: StrengthClass): AssessmentCode {
  switch (cls) {
    case 'supported':
      return 'INDICATORS_SUPPORTED';
    case 'challenged':
      return 'INDICATORS_CHALLENGED';
    case 'mixed':
      return 'INDICATORS_MIXED';
    case 'resolved-supported':
      return 'INDICATORS_RESOLVED_SUPPORTED';
    case 'resolved-challenged':
      return 'INDICATORS_RESOLVED_CHALLENGED';
    default:
      return 'NO_SPECIFIC_INDICATOR';
  }
}

const ASSESSMENT_TEXT: Readonly<Record<AssessmentCode, string>> = {
  INDICATORS_SUPPORTED: 'the chart indicators considered for this area are supportive',
  INDICATORS_CHALLENGED: 'the chart indicators considered for this area call for effort',
  INDICATORS_MIXED: 'the chart indicators considered for this area are mixed: some support it and some call for effort',
  INDICATORS_RESOLVED_SUPPORTED: 'the chart indicators considered for this area are supportive once a cited precedence rule is applied',
  INDICATORS_RESOLVED_CHALLENGED: 'the chart indicators considered for this area call for effort once a cited precedence rule is applied',
  NO_SPECIFIC_INDICATOR: 'the chart shows no specific indicator for this area among the factors considered',
};

// ---------------------------------------------------------------------------
// Dimensions (audit 05 §2)
// ---------------------------------------------------------------------------

export const DIMENSIONS = {
  'service-orientation': { label: 'Employment and service', question: 'How do the chart indicators for employment and service read?' },
  enterprise: { label: 'Business and enterprise', question: 'How do the chart indicators for business and independent enterprise read?' },
  leadership: { label: 'Leadership and authority (style, not rank)', question: 'How do the chart indicators for leadership and authority read?' },
  analytical: { label: 'Technical and analytical work', question: 'How do the chart indicators for technical and analytical work read?' },
  'financial-growth': { label: 'Financial growth (pace of accumulation, not amounts)', question: 'How do the chart indicators for financial growth through work read?' },
  recognition: { label: 'Recognition', question: 'How do the chart indicators for professional recognition read?' },
  stability: { label: 'Career stability', question: 'How do the chart indicators for career stability read?' },
  obstacles: { label: 'Effort areas (obstacles)', question: 'Which effort areas do the career significators show?' },
  transitions: { label: 'Transitions (modes of change)', question: 'How are the houses of career change (8th and 12th from the 10th, and the 8th) conditioned?' },
} as const;
export type DimensionKey = keyof typeof DIMENSIONS;

export function dimensionConclusionText(dim: DimensionKey, code: AssessmentCode): string {
  return `${DIMENSIONS[dim].label}: ${ASSESSMENT_TEXT[code]}.`;
}

// ---------------------------------------------------------------------------
// Houses
// ---------------------------------------------------------------------------

export const houseQuestions = (n: number) => ({
  lordPlacement: `Where is the ${ordinal(n)} lord placed, and in what condition?`,
  sav: `How does the ${ordinal(n)} house's Sarvashtakavarga compare with the 28-bindu average?`,
  occupants: `Which planets occupy the ${ordinal(n)} house, and what is their functional nature?`,
  aspects: `Which planets aspect the ${ordinal(n)} house, and what is their functional nature?`,
});

export function lordPlacementText(n: number, lord: PlanetName, lordHouse: number, code: PlacementCode): string {
  return `The ${ordinal(n)} lord ${lord} is placed in the ${ordinal(lordHouse)} house, ${PLACEMENT_TEXT[code]}.`;
}

export const SAV_CODES = ['SAV_ABOVE_28', 'SAV_AT_28', 'SAV_BELOW_28'] as const;
export type SavCode = (typeof SAV_CODES)[number];

export function savText(n: number, bindus: number, code: SavCode): string {
  const rel = code === 'SAV_ABOVE_28' ? 'above' : code === 'SAV_BELOW_28' ? 'below' : 'equal to';
  return `The ${ordinal(n)} house has ${bindus} Sarvashtakavarga bindus (a natal tally per sign), ${rel} the 28-bindu average.`;
}

export const OCCUPANT_CODES = ['HOUSE_OCCUPIED', 'HOUSE_EMPTY'] as const;
export function occupantsText(n: number, occupants: readonly PlanetName[]): string {
  return occupants.length
    ? `The ${ordinal(n)} house holds ${listText(occupants)}.`
    : `The ${ordinal(n)} house is unoccupied; an empty house is read through its lord.`;
}

export const ASPECT_CODES = ['HOUSE_ASPECTED', 'HOUSE_NOT_ASPECTED'] as const;
export function aspectsText(n: number, aspectedBy: readonly PlanetName[]): string {
  return aspectedBy.length
    ? `The ${ordinal(n)} house receives graha drishti from ${listText(aspectedBy)}.`
    : `The ${ordinal(n)} house receives no graha drishti.`;
}

// ---------------------------------------------------------------------------
// Planets
// ---------------------------------------------------------------------------

export const PLANET_DIGNITY_CODES = [
  'D1_EXALTED',
  'D1_MOOLATRIKONA',
  'D1_OWN_SIGN',
  'D1_GREAT_FRIEND',
  'D1_FRIEND',
  'D1_NEUTRAL',
  'D1_ENEMY',
  'D1_GREAT_ENEMY',
  'D1_DEBILITATED',
] as const;
export type PlanetDignityCode = (typeof PLANET_DIGNITY_CODES)[number];

const DIGNITY_TEXT: Readonly<Record<PlanetaryDignity, string>> = {
  EXALTED: 'exalted',
  MOOLATRIKONA: 'in its moolatrikona sign',
  OWN_SIGN: 'in its own sign',
  GREAT_FRIEND: "in a great friend's sign",
  FRIEND: "in a friend's sign",
  NEUTRAL: 'in a neutral sign',
  ENEMY: "in an enemy's sign",
  GREAT_ENEMY: "in a great enemy's sign",
  DEBILITATED: 'debilitated',
};

export const planetDignityCode = (d: PlanetaryDignity): PlanetDignityCode => `D1_${d}` as PlanetDignityCode;

export const planetQuestion = (p: PlanetName) => `What is ${p}'s condition in the birth chart?`;

export function planetText(p: PlanetName, dignity: PlanetaryDignity, sign: string, house: number): string {
  return `${p} is in ${sign} in the ${ordinal(house)} house, ${DIGNITY_TEXT[dignity]} (compound dignity, D1).`;
}

// ---------------------------------------------------------------------------
// Yogas
// ---------------------------------------------------------------------------

export const YOGA_CODES = ['YOGA_FORMED_STRONG', 'YOGA_FORMED_MODERATE', 'YOGA_FORMED_WEAK', 'YOGA_FORMED_CANCELLED'] as const;
export type YogaCode = (typeof YOGA_CODES)[number];

export const yogaQuestion = (name: string) => `Is ${name} formed, and in what condition?`;

export function yogaText(name: string, code: YogaCode): string {
  const cls = code.replace('YOGA_FORMED_', '').toLowerCase();
  return code === 'YOGA_FORMED_CANCELLED'
    ? `${name} is formed by the engine rule, and a classical cancellation condition is also met.`
    : `${name} is formed by the engine rule; its provisional yoga class is "${cls}".`;
}

// ---------------------------------------------------------------------------
// D10 / D1–D10
// ---------------------------------------------------------------------------

export const D10_LORD_CODES = ['D10_LORD_EXALTED', 'D10_LORD_OWN_SIGN', 'D10_LORD_DEBILITATED', 'D10_LORD_NO_SIGN_DIGNITY'] as const;
export type D10LordCode = (typeof D10_LORD_CODES)[number];

export function d10LordCode(d: VargaSignDignity): D10LordCode {
  return d === 'NONE' ? 'D10_LORD_NO_SIGN_DIGNITY' : (`D10_LORD_${d}` as D10LordCode);
}

const VARGA_DIGNITY_TEXT: Readonly<Record<VargaSignDignity, string>> = {
  EXALTED: 'exalted (sign-based D10 dignity)',
  OWN_SIGN: 'in its own sign (sign-based D10 dignity)',
  DEBILITATED: 'debilitated (sign-based D10 dignity)',
  NONE: 'with no sign-based D10 dignity (neither exalted, debilitated nor in its own sign)',
};

export const d10HouseLordQuestion = (n: number) => `Where is the D10 ${ordinal(n)} lord, and what is its D10 dignity?`;

export function d10HouseLordText(n: number, lord: PlanetName, sign: string, house: number | null, dignity: VargaSignDignity): string {
  const where = house !== null ? `${sign}, D10 house ${house}` : sign;
  return `In the D10 chart the ${ordinal(n)} lord ${lord} is in ${where}, ${VARGA_DIGNITY_TEXT[dignity]}.`;
}

export const D10_TENTH_LORD_CODES = PLACEMENT_CODES.map((c) => `IN_D10_${c}` as const);
export type D10TenthLordCode = `IN_D10_${PlacementCode}`;

export const d10TenthLordQuestion = 'Where does the D1 10th lord sit in the D10 chart, and with what D10 dignity?';

export function d10TenthLordText(lord: PlanetName, sign: string, house: number, code: PlacementCode, dignity: VargaSignDignity): string {
  return `The D1 10th lord ${lord} sits in ${sign}, D10 house ${house} (${PLACEMENT_TEXT[code]} of the D10), ${VARGA_DIGNITY_TEXT[dignity]}.`;
}

export const D1_D10_AGREEMENT_CODES = ['SAME_LORD_LAGNA_AND_TENTH', 'SAME_LORD_LAGNA_ONLY', 'SAME_LORD_TENTH_ONLY', 'NO_SAME_LORD'] as const;
export type D1D10AgreementCode = (typeof D1_D10_AGREEMENT_CODES)[number];

export const d1d10Question = 'Do the D1 and D10 charts share the lords of the 1st and 10th houses?';

const AGREEMENT_TEXT: Readonly<Record<D1D10AgreementCode, string>> = {
  SAME_LORD_LAGNA_AND_TENTH: 'The same planets rule the 1st and the 10th houses in the D1 and the D10 charts.',
  SAME_LORD_LAGNA_ONLY: 'The same planet rules the 1st house in the D1 and the D10 charts; the 10th-house lords differ.',
  SAME_LORD_TENTH_ONLY: 'The same planet rules the 10th house in the D1 and the D10 charts; the 1st-house lords differ.',
  NO_SAME_LORD: 'Different planets rule the 1st and the 10th houses in the D1 and the D10 charts.',
};
export const d1d10Text = (code: D1D10AgreementCode): string => AGREEMENT_TEXT[code];

export const VARGOTTAMA_CODES = ['VARGOTTAMA_PRESENT', 'VARGOTTAMA_NONE'] as const;
export const vargottamaQuestion = 'Which planets are vargottama (same sign in the D1 and the D9)?';
export function vargottamaText(planets: readonly PlanetName[]): string {
  return planets.length ? `${listText(planets)} ${planets.length > 1 ? 'are' : 'is'} vargottama.` : 'No planet is vargottama.';
}

// ---------------------------------------------------------------------------
// Fields of opportunity (CAR-018)
// ---------------------------------------------------------------------------

export const fieldsQuestion = 'What is the condition of the trine lords (1st, 5th, 9th), which point to fields of opportunity?';
export function fieldsText(lords: ReadonlyArray<{ n: number; lord: PlanetName }>, code: AssessmentCode): string {
  const who = lords.map((l) => `${ordinal(l.n)} lord ${l.lord}`).join(', ');
  return `Trine lords (${who}): ${ASSESSMENT_TEXT[code].replace('this area', 'these lords').replace('support it', 'support them')}.`;
}

// ---------------------------------------------------------------------------
// Timing
// ---------------------------------------------------------------------------

export const PERIOD_CODES = ['PERIOD_LORD_LINKED_TO_CAREER_HOUSES', 'PERIOD_LORD_NOT_LINKED_TO_CAREER_HOUSES'] as const;
export type PeriodCode = (typeof PERIOD_CODES)[number];

export type PeriodSlot = 'md' | 'ad' | 'next' | 'next-ad';
const SLOT_TEXT: Readonly<Record<PeriodSlot, string>> = {
  md: 'current Mahadasha',
  ad: 'current Antardasha',
  next: 'next Mahadasha',
  'next-ad': 'next Antardasha',
};

export const periodQuestion = (slot: PeriodSlot) => `Which career houses does the ${SLOT_TEXT[slot]} lord activate, and in what natal condition is it?`;

export function periodText(
  slot: PeriodSlot,
  label: string,
  startIso: string,
  endIso: string,
  ageAtStart: number,
  ageAtEnd: number,
  links: readonly string[],
): string {
  const head = `The ${SLOT_TEXT[slot]} is ${label} (${displayDate(startIso)} to ${displayDate(endIso)}, ages ${ageAtStart}–${ageAtEnd})`;
  return links.length ? `${head}; the period lord ${listText(links)}.` : `${head}; the period lord has no direct link to the 2nd, 6th, 10th or 11th house.`;
}

export const MD_AD_POSITION_CODES = Array.from({ length: 12 }, (_, i) => `AD_LORD_${i + 1}_FROM_MD_LORD` as const);
export const mdAdQuestion = 'How are the current Mahadasha and Antardasha lords placed from each other?';
export function mdAdText(md: PlanetName, ad: PlanetName, adFromMd: number, mdFromAd: number): string {
  return `Counted by sign, the Antardasha lord ${ad} is ${ordinal(adFromMd)} from the Mahadasha lord ${md}, and ${md} is ${ordinal(mdFromAd)} from ${ad}. This is stated as a fact; no favourability is assigned.`;
}

export const EARNINGS_CODES = ['EARNINGS_WINDOW_IDENTIFIED', 'NO_EARNINGS_WINDOW_IN_WORKING_AGE'] as const;
export const earningsQuestion = 'Which is the earliest working-age period of the 2nd or 11th lord (earnings houses)?';
export function earningsText(
  found: { label: string; startIso: string; endIso: string; ageAtStart: number; ageAtEnd: number } | null,
  minAge: number,
  maxAge: number,
): string {
  return found
    ? `The earliest period of an earnings-house lord (2nd or 11th) within ages ${minAge}–${maxAge} is ${found.label}, ${displayDate(found.startIso)} to ${displayDate(found.endIso)} (ages ${found.ageAtStart}–${found.ageAtEnd}).`
    : `No period of the 2nd or 11th lord falls within ages ${minAge}–${maxAge} among the periods computed.`;
}

/**
 * Date span of a sign period. Snapshot transit periods are clipped to start at the as-of date, so
 * a period that starts on or before it is stated as "until <end>", never with a false ingress date.
 */
export function spanText(startIso: string, endIso: string, asOfDate: string): string {
  return isoDate(startIso) <= asOfDate ? `until ${displayDate(endIso)}` : `from ${displayDate(startIso)} to ${displayDate(endIso)}`;
}

export const TRANSIT_CODES = Array.from({ length: 12 }, (_, i) => `TRANSIT_HOUSE_${i + 1}_FROM_ASC` as const);
export const transitQuestion = (planet: 'Jupiter' | 'Saturn') => `Which natal house is ${planet} transiting now?`;
export function transitText(
  planet: 'Jupiter' | 'Saturn',
  sign: string,
  startIso: string,
  endIso: string,
  fromAsc: number,
  fromMoon: number,
  asOfDate: string,
): string {
  return `${planet} transits ${sign} ${spanText(startIso, endIso, asOfDate)}: the ${ordinal(fromAsc)} house from the Ascendant and the ${ordinal(fromMoon)} from the Moon.`;
}

export const SATURN_MOON_CODES = [
  'SADE_SATI_TWELFTH_FROM_MOON',
  'SADE_SATI_OVER_MOON',
  'SADE_SATI_SECOND_FROM_MOON',
  'SATURN_FOURTH_FROM_MOON',
  'SATURN_EIGHTH_FROM_MOON',
  'NO_SATURN_MOON_PHASE',
] as const;
export type SaturnMoonCode = (typeof SATURN_MOON_CODES)[number];
export const saturnMoonQuestion = 'Where is transiting Saturn counted from the natal Moon?';

const SATURN_MOON_TEXT: Readonly<Record<SaturnMoonCode, string>> = {
  SADE_SATI_TWELFTH_FROM_MOON: "Saturn is transiting the 12th sign from the natal Moon, the opening phase of Sade Sati (Saturn's 7½-year passage around the Moon sign)",
  SADE_SATI_OVER_MOON: "Saturn is transiting the natal Moon's sign, the middle phase of Sade Sati (Saturn's 7½-year passage around the Moon sign)",
  SADE_SATI_SECOND_FROM_MOON: "Saturn is transiting the 2nd sign from the natal Moon, the closing phase of Sade Sati (Saturn's 7½-year passage around the Moon sign)",
  SATURN_FOURTH_FROM_MOON: 'Saturn is transiting the 4th sign from the natal Moon',
  SATURN_EIGHTH_FROM_MOON: 'Saturn is transiting the 8th sign from the natal Moon',
  NO_SATURN_MOON_PHASE: 'Saturn is not in the 12th, 1st, 2nd, 4th or 8th sign from the natal Moon',
};

export function saturnMoonText(code: SaturnMoonCode, period: { startIso: string; endIso: string } | null, asOfDate: string): string {
  const base = SATURN_MOON_TEXT[code];
  return period ? `${base} (${spanText(period.startIso, period.endIso, asOfDate)}). This is a timing fact, not an affliction.` : `${base}.`;
}

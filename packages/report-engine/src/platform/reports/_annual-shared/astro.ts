/**
 * Shared classical tables and helpers for the annual reports (Varshphal and
 * Personalised Horoscope). Everything here is a fixed, published rule — never
 * a score — and every block that uses one prints the rule under its table.
 */
import { PlanetSymbol } from '@astro/astrology-engine';
import { PlanetName, SIGNS } from '../../evidence/evidence-registry';

export type SignName = (typeof SIGNS)[number];

/** Planets used for annual transits (the Moon moves too fast for a yearly table). */
export const TRANSIT_PLANETS: PlanetName[] = ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Rahu', 'Ketu'];
export const SLOW_PLANETS: PlanetName[] = ['Jupiter', 'Saturn', 'Rahu', 'Ketu'];

export const SYMBOL: Record<PlanetName, PlanetSymbol> = {
  Sun: PlanetSymbol.SUN, Moon: PlanetSymbol.MOON, Mars: PlanetSymbol.MARS, Mercury: PlanetSymbol.MERCURY,
  Jupiter: PlanetSymbol.JUPITER, Venus: PlanetSymbol.VENUS, Saturn: PlanetSymbol.SATURN, Rahu: PlanetSymbol.RAHU, Ketu: PlanetSymbol.KETU,
};

export const SIGN_LORD: Record<SignName, PlanetName> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon', Leo: 'Sun', Virgo: 'Mercury',
  Libra: 'Venus', Scorpio: 'Mars', Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};

/** Sign number (1–12) of a sign name. */
export const signIndex = (s: string): number => {
  const i = SIGNS.indexOf(s as SignName);
  if (i < 0) throw new Error(`Unknown sign ${s}`);
  return i + 1;
};
export const signName = (i: number): SignName => SIGNS[(((i - 1) % 12) + 12) % 12];

/** House of `sign` counted from `from` (both 1–12), inclusive counting. */
export const houseFrom = (from: number, sign: number): number => ((sign - from + 12) % 12) + 1;

/**
 * Classical gochara (transit) results counted from the natal Moon sign —
 * Phaladeepika ch. 26 (also Brihat Samhita / Muhurta Chintamani). Houses in
 * which each planet's transit is traditionally favourable. Vedha (obstruction)
 * is not applied; that is stated wherever the rule is printed.
 */
export const GOCHARA_FAVOURABLE: Record<PlanetName, number[]> = {
  Sun: [3, 6, 10, 11],
  Moon: [1, 3, 6, 7, 10, 11],
  Mars: [3, 6, 11],
  Mercury: [2, 4, 6, 8, 10, 11],
  Jupiter: [2, 5, 7, 9, 11],
  Venus: [1, 2, 3, 4, 5, 8, 9, 11, 12],
  Saturn: [3, 6, 11],
  Rahu: [3, 6, 11],
  Ketu: [3, 6, 11],
};

export const GOCHARA_METHOD =
  'Classical gochara from the natal Moon (Phaladeepika ch. 26): Sun favourable in the 3rd, 6th, 10th, 11th; Mars, Saturn, Rahu and Ketu in the 3rd, 6th, 11th; Mercury in the 2nd, 4th, 6th, 8th, 10th, 11th; Jupiter in the 2nd, 5th, 7th, 9th, 11th; Venus in all houses except the 6th, 7th and 10th. Vedha (obstruction) is not applied. Supportive = a house the text lists as favourable; Demanding = one it does not. Neither is a prediction of events.';

export function gocharaStatus(planet: PlanetName, houseFromMoon: number): 'favourable' | 'demanding' {
  return GOCHARA_FAVOURABLE[planet].includes(houseFromMoon) ? 'favourable' : 'demanding';
}

/** Natural (naisargika) benefics per BPHS; the Moon and Mercury are treated as benefic here. */
export const NATURAL_BENEFICS: PlanetName[] = ['Jupiter', 'Venus', 'Mercury', 'Moon'];

/** Traditional planetary correspondences (weekday, colours, number, deity, nama-mantra). Gems are symbolic only. */
export interface PlanetAssociation {
  weekday: string;
  colours: string;
  number: number;
  gem: string;
  deity: string;
  mantra: string;
  /** A practical, ethical way of honouring the planet's theme (original wording, nothing to buy). */
  service: string;
}

export const PLANET_ASSOC: Record<PlanetName, PlanetAssociation> = {
  Sun: { weekday: 'Sunday', colours: 'gold, saffron, copper', number: 1, gem: 'Ruby', deity: 'Surya', mantra: 'Om Suryaya Namah', service: 'Offer water to the rising Sun, keep promises to elders and take responsibility without seeking credit.' },
  Moon: { weekday: 'Monday', colours: 'white, silver, cream', number: 2, gem: 'Pearl', deity: 'Shiva and Parvati', mantra: 'Om Chandraya Namah', service: 'Call or visit your mother or a mother-figure, drink enough water and protect a few quiet minutes of rest.' },
  Mars: { weekday: 'Tuesday', colours: 'red, coral', number: 9, gem: 'Red Coral', deity: 'Hanuman', mantra: 'Om Mangalaya Namah', service: 'Channel energy into exercise, help a sibling or colleague with a physical task, and pause before reacting in anger.' },
  Mercury: { weekday: 'Wednesday', colours: 'green', number: 5, gem: 'Emerald', deity: 'Vishnu', mantra: 'Om Budhaya Namah', service: 'Teach or explain something to a young learner, write down decisions and keep your word in written agreements.' },
  Jupiter: { weekday: 'Thursday', colours: 'yellow, gold', number: 3, gem: 'Yellow Sapphire', deity: 'Guru Dakshinamurthy', mantra: 'Om Brihaspataye Namah', service: 'Thank a teacher, study a scripture or a serious book for a few minutes daily and give advice only when asked.' },
  Venus: { weekday: 'Friday', colours: 'white, pastel pink', number: 6, gem: 'Diamond', deity: 'Lakshmi', mantra: 'Om Shukraya Namah', service: 'Keep your home clean and beautiful, show appreciation to your partner and treat money and comfort with gratitude.' },
  Saturn: { weekday: 'Saturday', colours: 'deep blue, black', number: 8, gem: 'Blue Sapphire', deity: 'Shani and Hanuman', mantra: 'Om Shanaischaraya Namah', service: 'Serve or thank people who do hard physical work, keep a steady routine and finish pending duties patiently.' },
  Rahu: { weekday: 'Saturday', colours: 'smoky grey, navy', number: 4, gem: 'Hessonite', deity: 'Durga', mantra: 'Om Rahave Namah', service: 'Limit screen time before sleep, verify information before acting on it and offer help to people outside your usual circle.' },
  Ketu: { weekday: 'Tuesday', colours: 'earthy brown, grey', number: 7, gem: "Cat's Eye", deity: 'Ganesha', mantra: 'Om Ketave Namah', service: 'Spend a few minutes in silent meditation, simplify one possession or habit and care for stray animals.' },
};

/** Number → ruling planet (standard Indian numerology, as in DECISIONS.md D-003). */
export const NUMBER_PLANET: PlanetName[] = ['Sun', 'Moon', 'Jupiter', 'Rahu', 'Mercury', 'Venus', 'Ketu', 'Saturn', 'Mars'];

export const digitReduce = (n: number): number => {
  let v = Math.abs(n);
  while (v > 9) v = String(v).split('').reduce((a, d) => a + Number(d), 0);
  return v;
};

/** Days of a month whose digit-sum reduces to `n` (e.g. 5 → 5, 14, 23). */
export const datesForNumber = (n: number): number[] =>
  Array.from({ length: 31 }, (_, i) => i + 1).filter((d) => digitReduce(d) === n);

export const pad2 = (n: number) => String(n).padStart(2, '0');
export const isoDate = (iso: string) => iso.slice(0, 10);

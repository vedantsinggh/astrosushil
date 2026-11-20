/**
 * Canonical numerology calculations for the report platform (numerology family:
 * Fortune, Fortune Plus, Baby Name).
 *
 * Pure, deterministic functions only. Every formula is documented here and in
 * docs/report-system/decisions/numerology.md (IDs NUM-xxx). Nothing here uses
 * an LLM, the clock or randomness: identical inputs give identical outputs.
 *
 * Inputs: the date of birth (YYYY-MM-DD), the name as entered (Latin letters)
 * and, for Kua, the gender. The name is used locally only; prompts receive the
 * resulting numbers, never the name.
 */

/** Repeated digit sum down to 1–9 (0 stays 0). */
export function reduceToDigit(n: number): number {
  let v = Math.abs(Math.trunc(n));
  while (v > 9) v = String(v).split('').reduce((a, d) => a + Number(d), 0);
  return v;
}

/** Sum of the decimal digits of a non-negative integer (one pass). */
export function digitSum(n: number): number {
  return String(Math.abs(Math.trunc(n))).split('').reduce((a, d) => a + Number(d), 0);
}

export interface BirthDate {
  year: number;
  month: number;
  day: number;
}

export function parseBirthDate(iso: string): BirthDate {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`NUMEROLOGY_INPUT_INVALID: dateOfBirth must be YYYY-MM-DD (got ${iso})`);
  const d = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  if (d.month < 1 || d.month > 12 || d.day < 1 || d.day > 31) throw new Error(`NUMEROLOGY_INPUT_INVALID: ${iso}`);
  return d;
}

/** NUM-001 Mulank (driver / psychic number): digit sum of the day of birth, reduced to 1–9. */
export function mulank(d: BirthDate): number {
  return reduceToDigit(d.day);
}

/** NUM-001 Bhagyank (conductor / destiny / life-path number): digit sum of the full date DD MM YYYY, reduced to 1–9. */
export function bhagyank(d: BirthDate): number {
  return reduceToDigit(digitSum(d.day) + digitSum(d.month) + digitSum(d.year));
}

// ---------------------------------------------------------------------------
// Name numbers (Chaldean)
// ---------------------------------------------------------------------------

/** NUM-003 Chaldean letter values (Cheiro's table; 9 is not assigned to any letter). */
export const CHALDEAN: Readonly<Record<string, number>> = {
  A: 1, I: 1, J: 1, Q: 1, Y: 1,
  B: 2, K: 2, R: 2,
  C: 3, G: 3, L: 3, S: 3,
  D: 4, M: 4, T: 4,
  E: 5, H: 5, N: 5, X: 5,
  U: 6, V: 6, W: 6,
  O: 7, Z: 7,
  F: 8, P: 8,
};

/** NUM-004 Vowels for soul urge; Y is treated as a consonant. */
export const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

/** Upper-case Latin letters of a name (diacritics stripped; other characters ignored). */
export function nameLetters(name: string): string[] {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .split('')
    .filter((c) => c >= 'A' && c <= 'Z');
}

export interface NameNumber {
  /** Unreduced total (the "compound" number). */
  compound: number;
  /** Reduced to 1–9. */
  value: number;
}

function nameSum(letters: string[]): NameNumber {
  const compound = letters.reduce((a, c) => a + CHALDEAN[c], 0);
  return { compound, value: reduceToDigit(compound) };
}

/** Chaldean name (expression) number of the full name. */
export function chaldeanNameNumber(name: string): NameNumber {
  return nameSum(nameLetters(name));
}

/** Soul urge (heart's desire): Chaldean values of the vowels. */
export function soulUrgeNumber(name: string): NameNumber {
  return nameSum(nameLetters(name).filter((c) => VOWELS.has(c)));
}

/** Personality: Chaldean values of the consonants. */
export function personalityNumber(name: string): NameNumber {
  return nameSum(nameLetters(name).filter((c) => !VOWELS.has(c)));
}

/**
 * NUM-005 Planes of expression (standard letter groups):
 *   Mental: A G H J L N P · Physical: D E M W · Emotional: B I O R S T X Z · Intuitive: C F K Q U V Y
 */
export const NAME_PLANES = {
  mental: ['A', 'G', 'H', 'J', 'L', 'N', 'P'],
  physical: ['D', 'E', 'M', 'W'],
  emotional: ['B', 'I', 'O', 'R', 'S', 'T', 'X', 'Z'],
  intuitive: ['C', 'F', 'K', 'Q', 'U', 'V', 'Y'],
} as const;
export type NamePlane = keyof typeof NAME_PLANES;
export const NAME_PLANE_ORDER: NamePlane[] = ['mental', 'physical', 'emotional', 'intuitive'];

export interface NamePlanes {
  counts: Record<NamePlane, number>;
  /** Letter → occurrences, per plane (only letters that occur). */
  letters: Record<NamePlane, Array<{ letter: string; count: number }>>;
}

export function namePlanes(name: string): NamePlanes {
  const letters = nameLetters(name);
  const counts = { mental: 0, physical: 0, emotional: 0, intuitive: 0 } as Record<NamePlane, number>;
  const detail = { mental: [], physical: [], emotional: [], intuitive: [] } as NamePlanes['letters'];
  for (const plane of NAME_PLANE_ORDER) {
    for (const l of NAME_PLANES[plane]) {
      const c = letters.filter((x) => x === l).length;
      if (c) {
        counts[plane] += c;
        detail[plane].push({ letter: l, count: c });
      }
    }
  }
  return { counts, letters: detail };
}

// ---------------------------------------------------------------------------
// Lo Shu grid
// ---------------------------------------------------------------------------

/** Lo Shu magic square layout (rows top to bottom). Compass: South at the top. */
export const LO_SHU_LAYOUT: number[][] = [
  [4, 9, 2],
  [3, 5, 7],
  [8, 1, 6],
];

/** Traditional Lo Shu direction and element of each number. */
export const LO_SHU_CELL: Record<number, { direction: string; element: 'Water' | 'Earth' | 'Wood' | 'Metal' | 'Fire' }> = {
  1: { direction: 'N', element: 'Water' },
  2: { direction: 'SW', element: 'Earth' },
  3: { direction: 'E', element: 'Wood' },
  4: { direction: 'SE', element: 'Wood' },
  5: { direction: 'Centre', element: 'Earth' },
  6: { direction: 'NW', element: 'Metal' },
  7: { direction: 'W', element: 'Metal' },
  8: { direction: 'NE', element: 'Earth' },
  9: { direction: 'S', element: 'Fire' },
};

/** Lines of the grid (rows, columns, diagonals) used to report complete and empty lines. */
export const LO_SHU_LINES: Array<{ id: string; numbers: [number, number, number] }> = [
  { id: 'row-492', numbers: [4, 9, 2] },
  { id: 'row-357', numbers: [3, 5, 7] },
  { id: 'row-816', numbers: [8, 1, 6] },
  { id: 'col-438', numbers: [4, 3, 8] },
  { id: 'col-951', numbers: [9, 5, 1] },
  { id: 'col-276', numbers: [2, 7, 6] },
  { id: 'diag-456', numbers: [4, 5, 6] },
  { id: 'diag-258', numbers: [2, 5, 8] },
];

export interface LoShuGrid {
  /** Digits that fill the grid, in the order they were taken. */
  sourceDigits: number[];
  /** Did we append the Mulank (two-digit day) / Bhagyank? */
  addedMulank: boolean;
  addedBhagyank: boolean;
  counts: Record<number, number>;
  present: number[];
  missing: number[];
  repeated: number[];
  completeLines: string[];
  emptyLines: string[];
}

/**
 * NUM-006 Lo Shu grid = non-zero digits of DD MM YYYY, plus the Mulank when the
 * day has two digits (so the driver is not already represented by itself),
 * plus the Bhagyank. Zeros are ignored.
 */
export function loShuGrid(d: BirthDate): LoShuGrid {
  const dd = String(d.day).padStart(2, '0');
  const mm = String(d.month).padStart(2, '0');
  const digits = `${dd}${mm}${d.year}`.split('').map(Number).filter((x) => x > 0);
  const addedMulank = d.day >= 10;
  if (addedMulank) digits.push(mulank(d));
  digits.push(bhagyank(d));
  const counts: Record<number, number> = {};
  for (let n = 1; n <= 9; n++) counts[n] = digits.filter((x) => x === n).length;
  const present = Object.keys(counts).map(Number).filter((n) => counts[n] > 0);
  const missing = Object.keys(counts).map(Number).filter((n) => counts[n] === 0);
  const repeated = present.filter((n) => counts[n] > 1);
  return {
    sourceDigits: digits,
    addedMulank,
    addedBhagyank: true,
    counts,
    present,
    missing,
    repeated,
    completeLines: LO_SHU_LINES.filter((l) => l.numbers.every((n) => counts[n] > 0)).map((l) => l.id),
    emptyLines: LO_SHU_LINES.filter((l) => l.numbers.every((n) => counts[n] === 0)).map((l) => l.id),
  };
}

// ---------------------------------------------------------------------------
// Kua (Eight Mansions)
// ---------------------------------------------------------------------------

export type KuaGender = 'male' | 'female';

export interface KuaResult {
  gender: KuaGender;
  /** Solar (Li Chun) year used for the calculation. */
  solarYear: number;
  value: number;
  /** True when the raw result was 5 and the conventional substitute was used. */
  fiveSubstituted: boolean;
  group: 'East' | 'West';
  element: 'Water' | 'Earth' | 'Wood' | 'Metal' | 'Fire';
  favourable: { success: string; health: string; relationships: string; growth: string };
  lessSupportive: string[];
  /** Birth date falls within 3–5 February, where the exact Li Chun moment decides the year. */
  nearYearBoundary: boolean;
}

/** NUM-007 Solar year: births before 4 February count to the previous year (Li Chun ≈ 4 Feb). */
export function kuaSolarYear(d: BirthDate): number {
  return d.month < 2 || (d.month === 2 && d.day < 4) ? d.year - 1 : d.year;
}

/** Eight Mansions directions per Kua: [Sheng Qi, Tian Yi, Yan Nian, Fu Wei] and [Huo Hai, Wu Gui, Liu Sha, Jue Ming]. */
export const KUA_DIRECTIONS: Record<number, { good: [string, string, string, string]; less: [string, string, string, string] }> = {
  1: { good: ['SE', 'E', 'S', 'N'], less: ['W', 'NE', 'NW', 'SW'] },
  2: { good: ['NE', 'W', 'NW', 'SW'], less: ['E', 'SE', 'S', 'N'] },
  3: { good: ['S', 'N', 'SE', 'E'], less: ['SW', 'NW', 'NE', 'W'] },
  4: { good: ['N', 'S', 'E', 'SE'], less: ['NW', 'SW', 'W', 'NE'] },
  6: { good: ['W', 'NE', 'SW', 'NW'], less: ['SE', 'E', 'N', 'S'] },
  7: { good: ['NW', 'SW', 'NE', 'W'], less: ['N', 'S', 'SE', 'E'] },
  8: { good: ['SW', 'NW', 'W', 'NE'], less: ['S', 'N', 'E', 'SE'] },
  9: { good: ['E', 'SE', 'N', 'S'], less: ['NE', 'W', 'SW', 'NW'] },
};

const KUA_ELEMENT: Record<number, KuaResult['element']> = { 1: 'Water', 2: 'Earth', 3: 'Wood', 4: 'Wood', 6: 'Metal', 7: 'Metal', 8: 'Earth', 9: 'Fire' };

/**
 * NUM-007 Kua number. With y = digit-sum of the solar year reduced to 1–9:
 *   male   = reduce(11 − y), 5 → 2
 *   female = reduce(4 + y),  5 → 8
 * (equivalent to the classical 10 − r / 5 + r forms for 1900s years and 9 − r / 6 + r for 2000s).
 */
export function kuaNumber(d: BirthDate, gender: KuaGender): KuaResult {
  const solarYear = kuaSolarYear(d);
  const y = reduceToDigit(digitSum(solarYear));
  let value = gender === 'male' ? reduceToDigit(11 - y) : reduceToDigit(4 + y);
  const fiveSubstituted = value === 5;
  if (fiveSubstituted) value = gender === 'male' ? 2 : 8;
  const dir = KUA_DIRECTIONS[value];
  return {
    gender,
    solarYear,
    value,
    fiveSubstituted,
    group: [1, 3, 4, 9].includes(value) ? 'East' : 'West',
    element: KUA_ELEMENT[value],
    favourable: { success: dir.good[0], health: dir.good[1], relationships: dir.good[2], growth: dir.good[3] },
    lessSupportive: [...dir.less],
    nearYearBoundary: d.month === 2 && d.day >= 3 && d.day <= 5,
  };
}

// ---------------------------------------------------------------------------
// Cycles: personal year / month / day, pinnacles, challenges
// ---------------------------------------------------------------------------

/** NUM-008 Personal year = reduce(day + month + calendar year), digits summed. */
export function personalYear(d: BirthDate, calendarYear: number): number {
  return reduceToDigit(digitSum(d.day) + digitSum(d.month) + digitSum(calendarYear));
}

/** NUM-008 Personal month = reduce(personal year + calendar month number). */
export function personalMonth(d: BirthDate, calendarYear: number, calendarMonth: number): number {
  return reduceToDigit(personalYear(d, calendarYear) + calendarMonth);
}

/** NUM-008 Personal day = reduce(personal month + calendar day). */
export function personalDay(d: BirthDate, calendarYear: number, calendarMonth: number, calendarDay: number): number {
  return reduceToDigit(personalMonth(d, calendarYear, calendarMonth) + calendarDay);
}

export interface MonthForecast {
  index: number;
  year: number;
  month: number;
  personalYear: number;
  personalMonth: number;
}

/** Twelve consecutive months starting with the month of `from` (UTC). */
export function monthlyCycle(d: BirthDate, from: Date, months = 12): MonthForecast[] {
  const out: MonthForecast[] = [];
  let y = from.getUTCFullYear();
  let m = from.getUTCMonth() + 1;
  for (let i = 1; i <= months; i++) {
    out.push({ index: i, year: y, month: m, personalYear: personalYear(d, y), personalMonth: personalMonth(d, y, m) });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

export interface LifeCycle {
  index: 1 | 2 | 3 | 4;
  /** Inclusive start age; the period runs until `toAge` (exclusive) or for life. */
  fromAge: number;
  toAge?: number;
  fromYear: number;
  toYear?: number;
  pinnacle: number;
  challenge: number;
}

/**
 * NUM-009 Pinnacles and challenges (Pythagorean). With m, d, y = month, day and
 * year each reduced to 1–9 and L = Bhagyank (life path):
 *   Pinnacles:  P1 = m + d, P2 = d + y, P3 = P1 + P2, P4 = m + y (each reduced to 1–9)
 *   Challenges: C1 = |m − d|, C2 = |d − y|, C3 = |C1 − C2|, C4 = |m − y|  (0–8)
 *   Periods:    1st from birth to age 36 − L; 2nd and 3rd nine years each; 4th for life.
 */
export function lifeCycles(d: BirthDate): LifeCycle[] {
  const m = reduceToDigit(d.month);
  const dd = reduceToDigit(d.day);
  const y = reduceToDigit(digitSum(d.year));
  const p1 = reduceToDigit(m + dd);
  const p2 = reduceToDigit(dd + y);
  const p3 = reduceToDigit(p1 + p2);
  const p4 = reduceToDigit(m + y);
  const c1 = Math.abs(m - dd);
  const c2 = Math.abs(dd - y);
  const c3 = Math.abs(c1 - c2);
  const c4 = Math.abs(m - y);
  const first = 36 - bhagyank(d);
  const ages: Array<[number, number | undefined]> = [
    [0, first],
    [first, first + 9],
    [first + 9, first + 18],
    [first + 18, undefined],
  ];
  const pin = [p1, p2, p3, p4];
  const ch = [c1, c2, c3, c4];
  return ages.map(([fromAge, toAge], i) => ({
    index: (i + 1) as 1 | 2 | 3 | 4,
    fromAge,
    toAge,
    fromYear: d.year + fromAge,
    toYear: toAge === undefined ? undefined : d.year + toAge,
    pinnacle: pin[i],
    challenge: ch[i],
  }));
}

/** Completed years of age at `on` (UTC date). */
export function ageOn(d: BirthDate, on: Date): number {
  const y = on.getUTCFullYear();
  const m = on.getUTCMonth() + 1;
  const day = on.getUTCDate();
  return y - d.year - (m < d.month || (m === d.month && day < d.day) ? 1 : 0);
}

export function currentCycle(cycles: LifeCycle[], age: number): LifeCycle {
  return cycles.find((c) => age >= c.fromAge && (c.toAge === undefined || age < c.toAge)) ?? cycles[0];
}

/** NUM-010 Maturity number = reduce(Bhagyank + name number). */
export function maturityNumber(bhagyankValue: number, nameNumberValue: number): number {
  return reduceToDigit(bhagyankValue + nameNumberValue);
}

/** NUM-011 Bridge number between two core numbers = |a − b| (0–8). */
export function bridgeNumber(a: number, b: number): number {
  return Math.abs(a - b);
}

/** NUM-012 Ages and dates that reduce to a number (e.g. the Mulank). */
export function numbersReducingTo(target: number, from: number, to: number): number[] {
  const out: number[] = [];
  for (let n = from; n <= to; n++) if (reduceToDigit(n) === target) out.push(n);
  return out;
}

// ---------------------------------------------------------------------------
// Western (tropical) Sun sign
// ---------------------------------------------------------------------------

export const TROPICAL_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

/** NUM-013 Tropical Sun sign from the tropical Sun longitude (degrees). */
export function tropicalSign(tropicalLongitude: number): (typeof TROPICAL_SIGNS)[number] {
  const l = ((tropicalLongitude % 360) + 360) % 360;
  return TROPICAL_SIGNS[Math.floor(l / 30)];
}

/** The engine's Lahiri formula (chart-calculator.ts) — used to recover the tropical longitude. */
export function engineLahiriAyanamsa(julianDayUT: number): number {
  return 23.85 + 0.01396 * ((julianDayUT - 2451545.0) / 365.25);
}

// ---------------------------------------------------------------------------
// Full profile
// ---------------------------------------------------------------------------

export interface NumerologyProfile {
  birth: BirthDate;
  mulank: number;
  bhagyank: number;
  birthDay: { day: number; compound: number };
  name?: {
    letters: number;
    number: NameNumber;
    soulUrge: NameNumber;
    personality: NameNumber;
    firstLetter: string;
    firstLetterValue: number;
    planes: NamePlanes;
  };
  loShu: LoShuGrid;
  kua?: KuaResult;
  /** Kua for both formulas when gender is not male/female. */
  kuaBoth?: { male: KuaResult; female: KuaResult };
  personalYearNow: number;
  personalYearNext: number;
  months: MonthForecast[];
  cycles: LifeCycle[];
  age: number;
  currentCycle: LifeCycle;
  maturity?: number;
  bridges: { mulankBhagyank: number; bhagyankName?: number };
}

export interface NumerologyInput {
  dateOfBirth: string;
  /** Name for name numerology; omit to skip name numbers. */
  name?: string;
  gender?: 'male' | 'female' | 'other';
  asOf: Date;
}

export function computeNumerologyProfile(input: NumerologyInput): NumerologyProfile {
  const birth = parseBirthDate(input.dateOfBirth);
  const mul = mulank(birth);
  const bha = bhagyank(birth);
  let name: NumerologyProfile['name'];
  const letters = input.name ? nameLetters(input.name) : [];
  if (input.name && letters.length > 0) {
    const nn = chaldeanNameNumber(input.name);
    name = {
      letters: letters.length,
      number: nn,
      soulUrge: soulUrgeNumber(input.name),
      personality: personalityNumber(input.name),
      firstLetter: letters[0],
      firstLetterValue: CHALDEAN[letters[0]],
      planes: namePlanes(input.name),
    };
  }
  const cycles = lifeCycles(birth);
  const age = ageOn(birth, input.asOf);
  const yearNow = input.asOf.getUTCFullYear();
  const g = input.gender;
  return {
    birth,
    mulank: mul,
    bhagyank: bha,
    birthDay: { day: birth.day, compound: digitSum(birth.day) },
    name,
    loShu: loShuGrid(birth),
    kua: g === 'male' || g === 'female' ? kuaNumber(birth, g) : undefined,
    kuaBoth: g === 'male' || g === 'female' ? undefined : { male: kuaNumber(birth, 'male'), female: kuaNumber(birth, 'female') },
    personalYearNow: personalYear(birth, yearNow),
    personalYearNext: personalYear(birth, yearNow + 1),
    months: monthlyCycle(birth, input.asOf),
    cycles,
    age,
    currentCycle: currentCycle(cycles, age),
    maturity: name ? maturityNumber(bha, name.number.value) : undefined,
    bridges: { mulankBhagyank: bridgeNumber(mul, bha), bhagyankName: name ? bridgeNumber(bha, name.number.value) : undefined },
  };
}

/**
 * Numerology facts for the evidence registry.
 *
 * Mulank (driver number) = digit sum of the day of birth, reduced to 1-9.
 * Bhagyank (destiny number) = digit sum of the full date of birth, reduced to 1-9.
 * Same rules as the former report-engine implementation (removed with the
 * legacy generators); there is no default for a missing or malformed date.
 */

export interface NumerologyFacts {
  mulank: number;
  bhagyank: number;
}

function reduce(n: number): number {
  let sum = n;
  while (sum > 9) sum = String(sum).split('').reduce((a, d) => a + Number(d), 0);
  return sum;
}

function parseIsoDate(dateOfBirthIso: string): { year: number; month: number; day: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOfBirthIso);
  if (!m) throw new Error(`NUMEROLOGY_INPUT_INVALID: dateOfBirth must be YYYY-MM-DD (got "${dateOfBirthIso}")`);
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (month < 1 || month > 12 || day < 1 || day > 31) throw new Error(`NUMEROLOGY_INPUT_INVALID: invalid calendar date "${dateOfBirthIso}"`);
  return { year, month, day };
}

export function calculateMulank(dateOfBirthIso: string): number {
  return reduce(parseIsoDate(dateOfBirthIso).day);
}

export function calculateBhagyank(dateOfBirthIso: string): number {
  const { year, month, day } = parseIsoDate(dateOfBirthIso);
  const digits = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
  return reduce(digits.split('').reduce((a, d) => a + Number(d), 0));
}

export function computeNumerology(dateOfBirthIso: string): NumerologyFacts {
  return {
    mulank: calculateMulank(dateOfBirthIso),
    bhagyank: calculateBhagyank(dateOfBirthIso),
  };
}

export const DEGREE_TOLERANCE = 0.0001; // ~0.36 arcseconds
export const EPSILON = 1e-9;

/**
 * Normalizes an angle in degrees into range [0.0, 360.0).
 */
export function normalizeDegree(deg: number): number {
  let result = deg % 360;
  if (result < 0) {
    result += 360;
  }
  // Prevent edge case floating point 360.00000000000006
  if (result >= 360 - EPSILON) {
    return 0.0;
  }
  return result;
}

/**
 * Compares two degree values using scientific tolerance to handle floating-point precision issues.
 */
export function isDegreeEqual(deg1: number, deg2: number, tolerance = DEGREE_TOLERANCE): boolean {
  const norm1 = normalizeDegree(deg1);
  const norm2 = normalizeDegree(deg2);
  const diff = Math.abs(norm1 - norm2);
  return diff <= tolerance || Math.abs(diff - 360) <= tolerance;
}

/**
 * Converts decimal degrees to DMS (Degrees, Minutes, Seconds) structure.
 */
export function degreesToDMS(deg: number): { degrees: number; minutes: number; seconds: number } {
  const norm = normalizeDegree(deg);
  const degrees = Math.floor(norm);
  const totalMinutes = (norm - degrees) * 60;
  const minutes = Math.floor(totalMinutes);
  const seconds = Math.round((totalMinutes - minutes) * 60);

  // Handle rounding overflow (e.g., 59.99 seconds rounding to 60)
  if (seconds >= 60) {
    return degreesToDMS(degrees + (minutes + 1) / 60);
  }

  return { degrees, minutes, seconds };
}

/**
 * INDEPENDENT reference implementation of the published Lahiri (true Chitrapaksha) ayanamsa, for
 * deriving test expectations. It does not import engine code.
 *
 * Indian Astronomical Ephemeris 2027 (Positional Astronomy Centre, India Meteorological Department,
 * https://packolkata.imd.gov.in/download/IAE2027.zip, downloaded 2026-11-20), p. 382 "Ayanamsa":
 *   Mean Ayanamsa = 23°51'25".53 + 5028".796195 T + 1".1054348 T^2 + 0".00007964 T^3
 *                   - 0".000023857 T^4 - 0".0000000383 T^5,   T = (JD - 2451545) / 36525
 * (the IAE prints the T^4 coefficient as 0".00023857; Capitaine et al. 2003 eq. 39 gives
 * 0".000023857; the difference is below 0.001" for 1900-2100), and p. 423:
 *   True Ayanamsa = Mean Ayanamsa + nutation in longitude.
 *
 * Nutation in longitude: Meeus, "Astronomical Algorithms" 2nd ed., ch. 22 low-accuracy series
 * (accuracy 0.5"): dpsi = -17.20" sin Om - 1.32" sin 2L - 0.23" sin 2L' + 0.21" sin 2Om.
 *
 * Accuracy of this reference: about 0.5" (0.00015°) from the nutation series.
 */

const D2R = Math.PI / 180;

/** Meeus ch. 22 low-accuracy nutation in longitude, degrees. `jd` is TT (UT differs negligibly). */
export function referenceNutationLongitudeDeg(jd: number): number {
  const T = (jd - 2451545) / 36525;
  const om = (125.04452 - 1934.136261 * T) * D2R;
  const L = (280.4665 + 36000.7698 * T) * D2R;
  const Lp = (218.3165 + 481267.8813 * T) * D2R;
  const arcsec = -17.2 * Math.sin(om) - 1.32 * Math.sin(2 * L) - 0.23 * Math.sin(2 * Lp) + 0.21 * Math.sin(2 * om);
  return arcsec / 3600;
}

/** IAE mean Lahiri ayanamsa, degrees. */
export function referenceMeanLahiriDeg(jd: number): number {
  const T = (jd - 2451545) / 36525;
  const arcsec =
    (23 * 3600 + 51 * 60 + 25.53) +
    5028.796195 * T +
    1.1054348 * T * T +
    0.00007964 * T ** 3 -
    0.000023857 * T ** 4 -
    0.0000000383 * T ** 5;
  return arcsec / 3600;
}

/** IAE true Lahiri ayanamsa (mean + nutation), degrees. */
export function referenceTrueLahiriDeg(jd: number): number {
  return referenceMeanLahiriDeg(jd) + referenceNutationLongitudeDeg(jd);
}

/** Same, from a JS timestamp (ms since 1970, UT). */
export function referenceTrueLahiriAtMs(ms: number): number {
  return referenceTrueLahiriDeg(ms / 86400000 + 2440587.5);
}

/** Tolerance between this reference and the engine (IAU 2000B nutation, Delta T): 0.5" + margin. */
export const REFERENCE_AYANAMSA_TOLERANCE_DEG = 0.0003;

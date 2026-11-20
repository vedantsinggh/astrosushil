import { AstrologyEngineError } from '../errors/astrology.error';

/**
 * House angles and quadrant house cusps (client decision 2026-11-20, docs/decisions.md ADR-017).
 *
 * All formulas work in the TROPICAL frame of the MEAN equinox of date (GMST and mean obliquity,
 * the same as the chart calculator's ascendant). Subtract the MEAN ayanamsa to get sidereal values.
 *
 *   GMST  : Meeus, "Astronomical Algorithms" 2nd ed., eq. 12.4 (JD UT).
 *   eps   : mean obliquity of the ecliptic, Laskar 1986 / Meeus eq. 22.2 (as in ChartCalculator).
 *   ARMC  : right ascension of the meridian = GMST + east longitude.
 *   MC    : lambda = atan2(sin ARMC, cos ARMC cos eps)  (ecliptic point on the upper meridian).
 *   ASC   : lambda = atan2(cos ARMC, -(sin ARMC cos eps + tan phi sin eps)) (Meeus ch. 14, eq. 14.2).
 *
 * PLACIDUS (KP cusps): each intermediate cusp is the ecliptic point that has completed a fixed
 * fraction of its own semi-arc (Placidus de Titis; e.g. R.C. Davison / Raphael's tables):
 *   cusp 11: RA = ARMC + DSA/3,   cusp 12: RA = ARMC + 2 DSA/3,
 *   cusp  2: RA = ARMC + 180° - 2 NSA/3,   cusp 3: RA = ARMC + 180° - NSA/3,
 *   DSA = 90° + AD, NSA = 90° - AD, AD = asin(tan phi tan delta) of the cusp itself,
 * solved by fixed-point iteration; cusps 4-9 are the opposite points. Placidus is UNDEFINED where
 * some ecliptic points never rise or set: |latitude| >= 90° - eps (about 66.56°). There the engine
 * throws PlacidusUndefinedError; it never silently falls back to another house system.
 *
 * SRIPATI (Bhava Chalit): B.V. Raman, "A Manual of Hindu Astrology" ch. X §§83-90. The four kendra
 * bhava madhyas are Lagna (1), Pathala = MC + 180° (4), Asta = Lagna + 180° (7) and MC (10); each
 * quadrant arc is trisected for the other madhyas, and each bhava sandhi (arambha) is the midpoint
 * of the previous and the current madhya.
 */

export class PlacidusUndefinedError extends AstrologyEngineError {
  public readonly code = 'PLACIDUS_UNDEFINED_AT_LATITUDE';
  public readonly latitude: number;
  public readonly limitDegrees: number;
  constructor(latitude: number, limitDegrees: number) {
    super(
      `Placidus house cusps are undefined at latitude ${latitude.toFixed(4)}°: beyond ±${limitDegrees.toFixed(2)}° ` +
        '(polar circle) some ecliptic points never rise or set, so their semi-arcs cannot be trisected. ' +
        'KP cusps cannot be calculated for this place.'
    );
    this.name = 'PlacidusUndefinedError';
    this.latitude = latitude;
    this.limitDegrees = limitDegrees;
  }
}

const DEG = Math.PI / 180;

function norm360(x: number): number {
  return ((x % 360) + 360) % 360;
}

export interface HouseAngles {
  /** Greenwich mean sidereal time, degrees. */
  gmstDegrees: number;
  /** Right ascension of the meridian (local sidereal time), degrees. */
  armcDegrees: number;
  /** Mean obliquity of the ecliptic, degrees. */
  obliquityDegrees: number;
  /** Tropical (mean equinox of date) MC, degrees. */
  mcTropical: number;
  /** Tropical (mean equinox of date) ascendant, degrees. */
  ascendantTropical: number;
}

export function meanObliquityDegrees(julianDayUT: number): number {
  const T = (julianDayUT - 2451545.0) / 36525.0;
  return 23.4392911 - 0.0130042 * T - 0.00000016 * T * T + 0.0005036 * T * T * T;
}

export function gmstDegrees(julianDayUT: number): number {
  const T = (julianDayUT - 2451545.0) / 36525.0;
  const g =
    280.46061837 + 360.98564736629 * (julianDayUT - 2451545.0) + 0.000387933 * T * T - (T * T * T) / 38710000;
  return norm360(g);
}

export function mcFromArmc(armcDegrees: number, obliquityDegrees: number): number {
  const a = armcDegrees * DEG;
  return norm360(Math.atan2(Math.sin(a), Math.cos(a) * Math.cos(obliquityDegrees * DEG)) / DEG);
}

export function ascendantFromArmc(armcDegrees: number, latitudeDegrees: number, obliquityDegrees: number): number {
  const a = armcDegrees * DEG;
  const e = obliquityDegrees * DEG;
  const y = Math.cos(a);
  const x = -Math.sin(a) * Math.cos(e) - Math.tan(latitudeDegrees * DEG) * Math.sin(e);
  return norm360(Math.atan2(y, x) / DEG);
}

export function calculateHouseAngles(julianDayUT: number, latitudeDegrees: number, longitudeDegrees: number): HouseAngles {
  const gmst = gmstDegrees(julianDayUT);
  const armc = norm360(gmst + norm360(longitudeDegrees));
  const eps = meanObliquityDegrees(julianDayUT);
  return {
    gmstDegrees: gmst,
    armcDegrees: armc,
    obliquityDegrees: eps,
    mcTropical: mcFromArmc(armc, eps),
    ascendantTropical: ascendantFromArmc(armc, latitudeDegrees, eps),
  };
}

/** Latitude limit (degrees) beyond which Placidus is undefined: 90° - obliquity. */
export function placidusLatitudeLimit(obliquityDegrees: number): number {
  return 90 - obliquityDegrees;
}

/** Ecliptic longitude (beta = 0) with right ascension `raDegrees`. */
function eclipticLongitudeFromRA(raDegrees: number, eps: number): number {
  const ra = raDegrees * DEG;
  return norm360(Math.atan2(Math.sin(ra), Math.cos(ra) * Math.cos(eps * DEG)) / DEG);
}

function placidusIntermediateCusp(
  armc: number,
  latitude: number,
  eps: number,
  raOf: (ad: number) => number
): number {
  const tanPhi = Math.tan(latitude * DEG);
  const sinEps = Math.sin(eps * DEG);
  let lambda = eclipticLongitudeFromRA(raOf(0), eps);
  for (let i = 0; i < 200; i++) {
    const delta = Math.asin(sinEps * Math.sin(lambda * DEG));
    const arg = tanPhi * Math.tan(delta);
    if (Math.abs(arg) >= 1) throw new PlacidusUndefinedError(latitude, placidusLatitudeLimit(eps));
    const ad = Math.asin(arg) / DEG;
    const next = eclipticLongitudeFromRA(raOf(ad), eps);
    let diff = next - lambda;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    lambda = next;
    if (Math.abs(diff) < 1e-10) return lambda;
  }
  throw new AstrologyEngineError(`Placidus cusp iteration did not converge (ARMC ${armc}, latitude ${latitude}).`);
}

/**
 * Twelve tropical Placidus cusps (index 0 = cusp 1 = ascendant ... index 9 = cusp 10 = MC),
 * mean equinox of date.
 */
export function calculatePlacidusCuspsTropical(armcDegrees: number, latitudeDegrees: number, obliquityDegrees: number): number[] {
  const limit = placidusLatitudeLimit(obliquityDegrees);
  if (!Number.isFinite(latitudeDegrees) || Math.abs(latitudeDegrees) >= limit) {
    throw new PlacidusUndefinedError(latitudeDegrees, limit);
  }
  const armc = norm360(armcDegrees);
  const eps = obliquityDegrees;
  const mc = mcFromArmc(armc, eps);
  const asc = ascendantFromArmc(armc, latitudeDegrees, eps);
  const c11 = placidusIntermediateCusp(armc, latitudeDegrees, eps, (ad) => armc + (90 + ad) / 3);
  const c12 = placidusIntermediateCusp(armc, latitudeDegrees, eps, (ad) => armc + (2 * (90 + ad)) / 3);
  const c2 = placidusIntermediateCusp(armc, latitudeDegrees, eps, (ad) => armc + 180 - (2 * (90 - ad)) / 3);
  const c3 = placidusIntermediateCusp(armc, latitudeDegrees, eps, (ad) => armc + 180 - (90 - ad) / 3);
  const cusps = new Array<number>(12);
  cusps[0] = asc;
  cusps[1] = c2;
  cusps[2] = c3;
  cusps[3] = norm360(mc + 180);
  cusps[9] = mc;
  cusps[10] = c11;
  cusps[11] = c12;
  // houses 5..9 (indices 4..8) are opposite of 11, 12, 1, 2, 3 (indices 10, 11, 0, 1, 2)
  cusps[4] = norm360(c11 + 180);
  cusps[5] = norm360(c12 + 180);
  cusps[6] = norm360(asc + 180);
  cusps[7] = norm360(c2 + 180);
  cusps[8] = norm360(c3 + 180);
  return cusps;
}

export interface SripatiBhavas {
  /** Bhava madhya (mid-point) of bhavas 1..12 (index 0 = bhava 1), degrees. */
  madhya: number[];
  /** Arambha sandhi (start) of bhavas 1..12; the end of bhava h is the start of bhava h+1. */
  arambhaSandhi: number[];
}

/**
 * Sripati bhavas from the ascendant and MC (same frame, normally sidereal).
 * Raman, "A Manual of Hindu Astrology" Examples 22-26.
 */
export function calculateSripatiBhavas(ascendant: number, mc: number): SripatiBhavas {
  const asc = norm360(ascendant);
  const mcN = norm360(mc);
  const ic = norm360(mcN + 180);
  const desc = norm360(asc + 180);
  const madhya = new Array<number>(12);
  const kendras: Array<[number, number, number]> = [
    [0, asc, ic], // bhavas 1 -> 4 (arc a)
    [3, ic, desc], // bhavas 4 -> 7 (arc b)
    [6, desc, mcN], // bhavas 7 -> 10 (arc c)
    [9, mcN, asc], // bhavas 10 -> 1 (arc d)
  ];
  for (const [startIndex, from, to] of kendras) {
    const arc = norm360(to - from);
    madhya[startIndex] = from;
    madhya[startIndex + 1] = norm360(from + arc / 3);
    madhya[startIndex + 2] = norm360(from + (2 * arc) / 3);
  }
  const arambhaSandhi = madhya.map((m, i) => {
    const prev = madhya[(i + 11) % 12];
    return norm360(prev + norm360(m - prev) / 2);
  });
  return { madhya, arambhaSandhi };
}

/**
 * House (1..12) whose interval [start_h, start_{h+1}) contains `longitude`.
 * `starts[i]` is the start of house i+1, in zodiacal order.
 */
export function houseOfLongitude(longitude: number, starts: number[]): number {
  const lon = norm360(longitude);
  for (let i = 0; i < 12; i++) {
    const start = norm360(starts[i]);
    const span = norm360(starts[(i + 1) % 12] - start);
    if (norm360(lon - start) < span) return i + 1;
  }
  return 1;
}

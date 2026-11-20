import * as Astronomy from 'astronomy-engine';
import { AstrologyEngineError } from '../errors/astrology.error';

/**
 * Ayanamsa (sidereal zodiac offset) definitions and computation.
 *
 * Client decision 2026-11-20 (docs/decisions.md ADR-017): the default is the TRUE Chitrapaksha
 * (Lahiri) ayanamsa of the Indian Calendar Reform Committee, with Raman, Krishnamurti (KSK),
 * KP New and Fagan-Bradley selectable per calculation.
 *
 * MODEL (identical for every system, so the systems only differ by their anchor value):
 *
 *   mean ayanamsa(t) = A0 + pA(T) - pA(T0)
 *   true ayanamsa(t) = mean ayanamsa(t) + nutation in longitude (dpsi)
 *
 *   pA = IAU 2006 general precession in longitude (Capitaine, Wallace & Chapront 2003,
 *        A&A 412, 567, eq. 39; IERS Conventions 2010 eq. 5.40), arcseconds, T in Julian
 *        centuries of TT from J2000.0:
 *        pA = 5028.796195 T + 1.1054348 T^2 + 0.00007964 T^3 - 0.000023857 T^4 - 0.0000000383 T^5
 *   dpsi = IAU 2000B nutation in longitude (5-term truncation), the same series astronomy-engine
 *        applies to the planets. It is re-implemented below (from astronomy-engine 2.1.19
 *        `iau2000b`, MIT licence, (c) Don Cross) instead of calling `Astronomy.e_tilt`, because
 *        e_tilt keeps a one-entry cache with a 1e-6 day tolerance: extra calls from here would
 *        make later planetary results depend (at the 1e-17° level) on call order.
 *
 * This is exactly the method of the Indian Astronomical Ephemeris since 2021 (IAE 2027,
 * Positional Astronomy Centre, Kolkata, "Ayanamsa" p. 382: "Mean Ayanamsa = 23°51'25".53 +
 * 5028".796195 T + 1".1054348 T^2 + ...", and p. 423: "True Ayanamsa = Mean Ayanamsa +
 * nutation in longitude").
 *
 * WHICH VALUE TO SUBTRACT:
 *   - true ayanamsa from apparent longitudes referred to the TRUE equinox of date (astronomy-engine
 *     `Ecliptic()` output: planets, Sun, Moon);
 *   - mean ayanamsa from quantities referred to the MEAN equinox of date (ascendant / MC / house
 *     cusps computed from GMST and mean obliquity; Meeus mean and true lunar nodes).
 * Both give the same sidereal longitude for a fixed point of the sky.
 *
 * VALIDITY: the IAU 2006 polynomial is accurate to well under 1" between 1000 and 3000 CE; the
 * engine's supported date range (BirthDetails validation) is far inside that.
 */

export type SupportedAyanamsaSystem = 'LAHIRI' | 'RAMAN' | 'KRISHNAMURTI' | 'KP' | 'FAGAN_BRADLEY';

export const DEFAULT_AYANAMSA_SYSTEM: SupportedAyanamsaSystem = 'LAHIRI';

export const SUPPORTED_AYANAMSA_SYSTEMS: readonly SupportedAyanamsaSystem[] = [
  'LAHIRI',
  'RAMAN',
  'KRISHNAMURTI',
  'KP',
  'FAGAN_BRADLEY',
] as const;

export interface AyanamsaDefinition {
  system: SupportedAyanamsaSystem;
  label: string;
  /** Anchor epoch, Julian Day in TT. */
  epochJulianDayTT: number;
  /** Ayanamsa at the anchor epoch, degrees. */
  valueAtEpochDegrees: number;
  /** True when the anchor value is a TRUE ayanamsa (includes nutation at the epoch). */
  valueAtEpochIsTrue: boolean;
  source: string;
  provisional: boolean;
}

const ARCSEC = 1 / 3600;

/** J2000.0 (2000-01-01 12:00 TT). */
const J2000 = 2451545.0;
/** J1900.0 (1899-12-31 12:00 TT = "1 Jan 1900" in the cited tables). */
const J1900 = 2415020.0;
/** B1950.0 (Besselian epoch 1950.0 = 1949-12-31 22:09 TT), the epoch of Fagan-Bradley's SVP. */
const B1950 = 2433282.4235;
/** 1956-03-21 0h TT, the Indian Calendar Reform Committee epoch. */
const ICRC_EPOCH = 2435553.5;
/** 291-03-21 06:10:29 TT (Julian calendar), zero point of the KP New ayanamsa. */
const KP_NEW_ZERO_EPOCH = 1827424.5 + (6 + 10 / 60 + 29 / 3600) / 24;

export const AYANAMSA_DEFINITIONS: Readonly<Record<SupportedAyanamsaSystem, AyanamsaDefinition>> = {
  LAHIRI: {
    system: 'LAHIRI',
    label: 'Lahiri (true Chitrapaksha, ICRC)',
    epochJulianDayTT: ICRC_EPOCH,
    valueAtEpochDegrees: 23 + 15 / 60 + 0.658 * ARCSEC,
    valueAtEpochIsTrue: true,
    source:
      'Indian Calendar Reform Committee (1955) as revised in the Indian Astronomical Ephemeris: ' +
      '23°15\'00".658 on 1956-03-21 0h TT, a TRUE ayanamsa (includes nutation; Swiss Ephemeris ' +
      'documentation §2.8.5 quoting IAE 1989 p. 556). Propagated with IAU 2006 precession as in IAE 2027 p. 382.',
    provisional: false,
  },
  RAMAN: {
    system: 'RAMAN',
    label: 'Raman',
    epochJulianDayTT: J1900,
    // B.V. Raman, "A Manual of Hindu Astrology" §49: ayanamsa = (year - 397) x 50 1/3".
    // Evaluated at 1900: 1503 x 50.3333" = 75651" = 21°00'51".
    valueAtEpochDegrees: 1503 * (50 + 1 / 3) * ARCSEC,
    valueAtEpochIsTrue: false,
    source:
      'B.V. Raman, "A Manual of Hindu Astrology" §49: ayanamsa = (year - 397) x 50 1/3" (zero year 397 CE), ' +
      'anchored at 1900.0 (21°00\'51") and propagated with IAU 2006 precession.',
    provisional: false,
  },
  KRISHNAMURTI: {
    system: 'KRISHNAMURTI',
    label: 'Krishnamurti (KSK, Reader table)',
    epochJulianDayTT: J1900,
    valueAtEpochDegrees: 22.363889,
    valueAtEpochIsTrue: false,
    source:
      'K.S. Krishnamurti, KP Reader 1 pp. 54-59 (table of ayanamsa values 1840-2001), as fitted in the ' +
      'Swiss Ephemeris documentation §2.8.6 (No. 5): 22.363889° on 1900-01-01; propagated with IAU 2006 precession.',
    provisional: false,
  },
  KP: {
    system: 'KP',
    label: 'KP New (Krishnamurti/Senthilathiban, zero 291 CE)',
    epochJulianDayTT: KP_NEW_ZERO_EPOCH,
    valueAtEpochDegrees: 0,
    valueAtEpochIsTrue: false,
    source:
      'D. Senthilathiban, "Study of KP Ayanamsa with Modern Precession Theories" (2019): ayanamsa zero at the ' +
      'vernal equinox of 291 CE, 21 March 291 06:10:29 TT (Swiss Ephemeris documentation §2.8.6, No. 45). ' +
      'Propagated with the IAU 2006 polynomial, which gives KSK + 71.4" (Swiss Ephemeris, with Vondrák 2011 ' +
      'precession: "72-73" higher"); model uncertainty about 2".',
    provisional: false,
  },
  FAGAN_BRADLEY: {
    system: 'FAGAN_BRADLEY',
    label: 'Fagan-Bradley',
    epochJulianDayTT: B1950,
    valueAtEpochDegrees: 24 + 2 / 60 + 31.36 * ARCSEC,
    valueAtEpochIsTrue: false,
    source:
      'C. Fagan and R.C. Firebrace, "Primer of Sidereal Astrology" (1971): synetic vernal point gives ' +
      'ayanamsa 24°02\'31".36 at 1950.0 (Swiss Ephemeris documentation §2.8.2); propagated with IAU 2006 precession.',
    provisional: false,
  },
};

export class UnsupportedAyanamsaError extends AstrologyEngineError {
  public readonly system: string;
  constructor(system: string) {
    super(
      `Ayanamsa '${system}' is not supported. Supported systems: ${SUPPORTED_AYANAMSA_SYSTEMS.join(', ')}.`
    );
    this.name = 'UnsupportedAyanamsaError';
    this.system = system;
  }
}

export function isSupportedAyanamsaSystem(value: unknown): value is SupportedAyanamsaSystem {
  return typeof value === 'string' && (SUPPORTED_AYANAMSA_SYSTEMS as readonly string[]).includes(value);
}

/** IAU 2006 general precession in longitude pA (arcseconds), T = Julian centuries TT from J2000. */
export function generalPrecessionInLongitudeArcsec(T: number): number {
  return (
    5028.796195 * T +
    1.1054348 * T * T +
    0.00007964 * T * T * T -
    0.000023857 * T * T * T * T -
    0.0000000383 * T * T * T * T * T
  );
}

const ASEC360 = 1296000;
const ASEC2RAD = Math.PI / (180 * 3600);

/**
 * Nutation in longitude (degrees) at a TT instant: IAU 2000B, 5 largest terms, exactly as
 * astronomy-engine 2.1.19 `iau2000b()` (MIT licence) so it matches the ephemeris frame.
 */
export function nutationInLongitudeDegrees(julianDayTT: number): number {
  const mod = (x: number) => (x % ASEC360) * ASEC2RAD;
  const t = (julianDayTT - J2000) / 36525;
  const elp = mod(1287104.79305 + t * 129596581.0481);
  const f = mod(335779.526232 + t * 1739527262.8478);
  const d = mod(1072260.70369 + t * 1602961601.209);
  const om = mod(450160.398036 - t * 6962890.5431);
  let dp = (-172064161.0 - 174666.0 * t) * Math.sin(om) + 33386.0 * Math.cos(om);
  let arg = 2.0 * (f - d + om);
  dp += (-13170906.0 - 1675.0 * t) * Math.sin(arg) - 13696.0 * Math.cos(arg);
  arg = 2.0 * (f + om);
  dp += (-2276413.0 - 234.0 * t) * Math.sin(arg) + 2796.0 * Math.cos(arg);
  arg = 2.0 * om;
  dp += (2074554.0 + 207.0 * t) * Math.sin(arg) - 698.0 * Math.cos(arg);
  dp += (1475877.0 - 3633.0 * t) * Math.sin(elp) + 11817.0 * Math.cos(elp);
  const dpsiArcsec = -0.000135 + dp * 1.0e-7;
  return dpsiArcsec * ARCSEC;
}

/** Converts Julian Day UT to Julian Day TT with astronomy-engine's Delta T model. */
export function julianDayUTtoTT(julianDayUT: number): number {
  return Astronomy.MakeTime(julianDayUT - J2000).tt + J2000;
}

const meanAnchorCache = new Map<SupportedAyanamsaSystem, number>();

/** Mean ayanamsa (degrees) at the definition's anchor epoch. */
function meanValueAtEpoch(def: AyanamsaDefinition): number {
  const cached = meanAnchorCache.get(def.system);
  if (cached !== undefined) return cached;
  const value = def.valueAtEpochIsTrue
    ? def.valueAtEpochDegrees - nutationInLongitudeDegrees(def.epochJulianDayTT)
    : def.valueAtEpochDegrees;
  meanAnchorCache.set(def.system, value);
  return value;
}

export interface AyanamsaValue {
  system: SupportedAyanamsaSystem;
  /** Mean ayanamsa (mean equinox of date), degrees. */
  meanDegrees: number;
  /** True ayanamsa (true equinox of date) = mean + nutation in longitude, degrees. */
  trueDegrees: number;
  nutationInLongitudeDegrees: number;
  julianDayTT: number;
  definition: AyanamsaDefinition;
}

/** Mean ayanamsa at a TT instant (degrees). */
export function computeMeanAyanamsaTT(
  julianDayTT: number,
  system: SupportedAyanamsaSystem = DEFAULT_AYANAMSA_SYSTEM
): number {
  const def = AYANAMSA_DEFINITIONS[system];
  if (!def) throw new UnsupportedAyanamsaError(String(system));
  const T = (julianDayTT - J2000) / 36525;
  const T0 = (def.epochJulianDayTT - J2000) / 36525;
  return (
    meanValueAtEpoch(def) +
    (generalPrecessionInLongitudeArcsec(T) - generalPrecessionInLongitudeArcsec(T0)) * ARCSEC
  );
}

/**
 * Ayanamsa at a UT instant. `system` defaults to the engine default (true Lahiri).
 */
export function computeAyanamsa(
  julianDayUT: number,
  system: SupportedAyanamsaSystem = DEFAULT_AYANAMSA_SYSTEM
): AyanamsaValue {
  if (!isSupportedAyanamsaSystem(system)) throw new UnsupportedAyanamsaError(String(system));
  const julianDayTT = julianDayUTtoTT(julianDayUT);
  const meanDegrees = computeMeanAyanamsaTT(julianDayTT, system);
  const nutation = nutationInLongitudeDegrees(julianDayTT);
  return {
    system,
    meanDegrees,
    trueDegrees: meanDegrees + nutation,
    nutationInLongitudeDegrees: nutation,
    julianDayTT,
    definition: AYANAMSA_DEFINITIONS[system],
  };
}

/** True ayanamsa (degrees) of the default or given system: subtract from apparent longitudes. */
export function getTrueAyanamsa(julianDayUT: number, system: SupportedAyanamsaSystem = DEFAULT_AYANAMSA_SYSTEM): number {
  return computeAyanamsa(julianDayUT, system).trueDegrees;
}

/** Mean ayanamsa (degrees) of the default or given system: subtract from mean-equinox quantities. */
export function getMeanAyanamsa(julianDayUT: number, system: SupportedAyanamsaSystem = DEFAULT_AYANAMSA_SYSTEM): number {
  return computeAyanamsa(julianDayUT, system).meanDegrees;
}

/**
 * Resolves a config value to a supported system. Missing values take the engine default;
 * 'CLIENT_CONFIRMATION_REQUIRED' must be rejected by the caller first (validateRequiredMethodology).
 */
export function resolveAyanamsaSystem(value: unknown): SupportedAyanamsaSystem {
  if (value === undefined || value === null || value === '') return DEFAULT_AYANAMSA_SYSTEM;
  if (!isSupportedAyanamsaSystem(value)) throw new UnsupportedAyanamsaError(String(value));
  return value;
}

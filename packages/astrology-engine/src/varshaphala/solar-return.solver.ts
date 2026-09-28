import { EphemerisProvider } from '../ephemeris/ephemeris.interface';
import { AstronomyEngineAdapter } from '../ephemeris/astronomy-engine.adapter';
import { PlanetSymbol } from '../planets/planet.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { getRashiByLongitude, getDegreeInRashi } from '../zodiac/rashi';
import { BirthDetails } from '../input/birth-details';
import { normalizeBirthTime } from '../validation/birth-details.validator';
import { SolarReturnDetails, AnnualLocationInput } from './varshaphala.types';

/**
 * Normalizes the shortest signed angular difference between two angles in degrees [-180, +180].
 * Correctly handles 0°/360° boundary wraparounds (e.g. 359.9° to 0.1° is +0.2°, not -359.8°).
 */
export function normalizeAngularDelta(currentDeg: number, targetDeg: number): number {
  let delta = ((currentDeg - targetDeg) % 360 + 360) % 360;
  if (delta > 180) {
    delta -= 360;
  }
  return delta;
}

/**
 * Converts Julian Day UT to UTC Date object.
 */
export function julianDayToUtcDate(julianDayUT: number): Date {
  const unixMs = (julianDayUT - 2440587.5) * 86400000;
  return new Date(Math.round(unixMs));
}

/**
 * Converts UTC Date to Julian Day UT.
 */
export function utcDateToJulianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/**
 * High-precision numerical solver for astronomical Solar Returns.
 * Finds the exact instant where the transiting Sun's sidereal longitude returns
 * to the exact natal Sun longitude for a requested annual return year.
 */
export class SolarReturnSolver {
  private readonly ephemerisProvider: EphemerisProvider;

  constructor(ephemerisProvider?: EphemerisProvider) {
    this.ephemerisProvider = ephemerisProvider || new AstronomyEngineAdapter();
  }

  /**
   * Computes sidereal Sun longitude for a given Julian Day UT.
   */
  public async getSiderealSunLongitude(julianDayUT: number): Promise<{ longitude: number; speedDegreesPerDay: number }> {
    const raw = await this.ephemerisProvider.getPlanetaryPosition(PlanetSymbol.SUN, julianDayUT);
    const yearsFromJ2000 = (julianDayUT - 2451545.0) / 365.25;
    const ayanamsaOffset = 23.85 + 0.01396 * yearsFromJ2000;
    const siderealLon = normalizeDegree(raw.longitude - ayanamsaOffset);
    const speedDegreesPerDay = raw.speedLongitude || 0.9856;

    return {
      longitude: siderealLon,
      speedDegreesPerDay,
    };
  }

  /**
   * Deterministically solves the Solar Return moment for the target annual year.
   */
  public async solveSolarReturn(
    natalSunLongitude: number,
    birthJulianDayUT: number,
    birthYear: number,
    targetYear: number,
    annualLocation: AnnualLocationInput
  ): Promise<SolarReturnDetails> {
    if (targetYear < birthYear) {
      throw new Error(`Target Varshaphala year (${targetYear}) cannot precede birth year (${birthYear})`);
    }

    const completedYears = targetYear - birthYear;
    const targetSunLon = normalizeDegree(natalSunLongitude);

    // Approximate solar return interval (mean tropical/sidereal solar year ~365.24219 days)
    const approxJD = birthJulianDayUT + completedYears * 365.24219;

    let currentJD = approxJD;
    let iterations = 0;
    const maxIterations = 25;
    const toleranceDegrees = 1e-7; // ~0.00036 arcseconds

    let currentLon = 0;
    let angularError = 0;

    // Newton-Raphson with bracketing
    for (let i = 0; i < maxIterations; i++) {
      iterations++;
      const sunState = await this.getSiderealSunLongitude(currentJD);
      currentLon = sunState.longitude;
      angularError = normalizeAngularDelta(currentLon, targetSunLon);

      if (Math.abs(angularError) <= toleranceDegrees) {
        break;
      }

      const speed = Math.max(0.9, Math.min(1.1, sunState.speedDegreesPerDay));
      const stepDays = angularError / speed;

      // Bound step to prevent runaway jumps
      const clampedStep = Math.max(-5.0, Math.min(5.0, stepDays));
      currentJD = currentJD - clampedStep;

      // Ensure solver stays strictly within the target annual return cycle window
      if (Math.abs(currentJD - approxJD) > 5.0) {
        throw new Error(
          `Solar return solver deviated outside target year window (offset: ${Math.abs(currentJD - approxJD).toFixed(2)} days)`
        );
      }
    }

    const finalSunState = await this.getSiderealSunLongitude(currentJD);
    const finalAngularError = Math.abs(normalizeAngularDelta(finalSunState.longitude, targetSunLon));

    if (finalAngularError > 1e-5) {
      throw new Error(`Solar return numerical solver did not converge within required tolerance (error: ${finalAngularError}°)`);
    }

    const utcDate = julianDayToUtcDate(currentJD);
    const solarReturnUtcIso = utcDate.toISOString();

    // Local ISO representation
    let solarReturnLocalIso = solarReturnUtcIso;
    try {
      const formatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: annualLocation.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      solarReturnLocalIso = formatter.format(utcDate).replace(' ', 'T');
    } catch {
      solarReturnLocalIso = solarReturnUtcIso;
    }

    const natalRashi = getRashiByLongitude(targetSunLon);
    const returnRashi = getRashiByLongitude(finalSunState.longitude);

    return {
      targetYear,
      age: completedYears,
      natalSunLongitude: targetSunLon,
      natalSunSign: natalRashi.sanskritName,
      natalSunDegree: getDegreeInRashi(targetSunLon),
      solarReturnSunLongitude: finalSunState.longitude,
      solarReturnSunSign: returnRashi.sanskritName,
      solarReturnSunDegree: getDegreeInRashi(finalSunState.longitude),
      angularErrorDegrees: finalAngularError,
      julianDayUT: currentJD,
      solarReturnUtcIso,
      solarReturnLocalIso,
      timezone: annualLocation.timezone,
      annualLocation: {
        latitude: annualLocation.latitude,
        longitude: annualLocation.longitude,
        timezone: annualLocation.timezone,
        placeName: annualLocation.placeName,
      },
      iterations,
    };
  }

  /**
   * Static convenience helper to solve solar return from Natal BirthDetails.
   */
  public static async solveForBirthDetails(
    natalSunLongitude: number,
    natalBirthDetails: BirthDetails,
    targetYear: number,
    annualLocation?: AnnualLocationInput,
    ephemerisProvider?: EphemerisProvider
  ): Promise<SolarReturnDetails> {
    const normalizedTime = normalizeBirthTime(natalBirthDetails);
    const birthYear = natalBirthDetails.date.year;
    const loc: AnnualLocationInput = annualLocation || {
      latitude: natalBirthDetails.latitude,
      longitude: natalBirthDetails.longitude,
      timezone: natalBirthDetails.timezone,
      placeName: natalBirthDetails.placeName,
    };

    const solver = new SolarReturnSolver(ephemerisProvider);
    return solver.solveSolarReturn(
      natalSunLongitude,
      normalizedTime.julianDayUT,
      birthYear,
      targetYear,
      loc
    );
  }
}

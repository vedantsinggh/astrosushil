import { PlanetSymbol } from '../planets/planet.types';
import { ShadbalaPlanet } from './strength.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { AstroChart } from '../chart/astro-chart.types';

/**
 * Computes classical Drishti (Aspect Value) cast from source planet to target planet.
 * Curve from BPHS Ch. 28:
 * - Distance theta measured from source to target.
 */
export function calculateAspectValue(sourceLong: number, targetLong: number, sourcePlanet: PlanetSymbol): number {
  const theta = normalizeDegree(targetLong - sourceLong);

  let baseAspect = 0;
  if (theta >= 30 && theta < 60) {
    baseAspect = (theta - 30) / 2.0;
  } else if (theta >= 60 && theta < 90) {
    baseAspect = 15.0 + (theta - 60);
  } else if (theta >= 90 && theta < 120) {
    baseAspect = 45.0 - (theta - 90) / 2.0;
  } else if (theta >= 120 && theta < 150) {
    baseAspect = 30.0 - (theta - 120);
  } else if (theta >= 150 && theta <= 180) {
    baseAspect = (theta - 150) * 2.0;
  } else if (theta > 180 && theta <= 300) {
    baseAspect = (300 - theta) / 2.0;
  } else {
    baseAspect = 0;
  }

  // Classical special aspects boost
  if (sourcePlanet === PlanetSymbol.MARS) {
    // Mars 4th (around 90°) and 8th (around 210°)
    if ((theta >= 75 && theta <= 105) || (theta >= 195 && theta <= 225)) {
      baseAspect += 15.0;
    }
  } else if (sourcePlanet === PlanetSymbol.JUPITER) {
    // Jupiter 5th (around 120°) and 9th (around 240°)
    if ((theta >= 105 && theta <= 135) || (theta >= 225 && theta <= 255)) {
      baseAspect += 15.0;
    }
  } else if (sourcePlanet === PlanetSymbol.SATURN) {
    // Saturn 3rd (around 60°) and 10th (around 270°)
    if ((theta >= 45 && theta <= 75) || (theta >= 255 && theta <= 285)) {
      baseAspect += 15.0;
    }
  }

  return Math.min(60.0, Math.max(0.0, baseAspect));
}

/**
 * Calculates Drik Bala (Aspectual Strength) for a planet from all other chart planets.
 * - Benefic aspects impart positive strength (+Aspect / 4).
 * - Malefic aspects impart negative strength (-Aspect / 4).
 */
export function calculateDrikBala(planet: ShadbalaPlanet, chart: AstroChart): number {
  const targetPos = chart.planets[planet];
  if (!targetPos) return 0.0;

  const benefics = [PlanetSymbol.JUPITER, PlanetSymbol.VENUS];
  const malefics = [PlanetSymbol.SUN, PlanetSymbol.MARS, PlanetSymbol.SATURN, PlanetSymbol.RAHU, PlanetSymbol.KETU];

  // Moon is benefic when waxing (distance from Sun <= 180° in Shukla Paksha or elongation > 90°)
  const sunPos = chart.planets[PlanetSymbol.SUN];
  const moonPos = chart.planets[PlanetSymbol.MOON];
  const isWaxingMoon = sunPos && moonPos
    ? normalizeDegree(moonPos.longitude - sunPos.longitude) <= 180
    : true;

  // Mercury is benefic when not conjunct malefics
  const mercuryIsBenefic = true;

  let totalDrik = 0;

  for (const [sym, pos] of Object.entries(chart.planets)) {
    const sourceSymbol = sym as PlanetSymbol;
    if (sourceSymbol === planet || !pos) continue;

    const aspectStrength = calculateAspectValue(pos.longitude, targetPos.longitude, sourceSymbol);
    if (aspectStrength <= 0) continue;

    const quarterAspect = aspectStrength / 4.0;

    let isBenefic = false;
    if (benefics.includes(sourceSymbol)) {
      isBenefic = true;
    } else if (sourceSymbol === PlanetSymbol.MOON) {
      isBenefic = isWaxingMoon;
    } else if (sourceSymbol === PlanetSymbol.MERCURY) {
      isBenefic = mercuryIsBenefic;
    } else if (malefics.includes(sourceSymbol)) {
      isBenefic = false;
    }

    if (isBenefic) {
      totalDrik += quarterAspect;
    } else {
      totalDrik -= quarterAspect;
    }
  }

  return Number(totalDrik.toFixed(4));
}

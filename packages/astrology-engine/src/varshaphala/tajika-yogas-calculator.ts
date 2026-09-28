import { PlanetSymbol, PlanetPosition } from '../planets/planet.types';
import { AstroChart } from '../chart/astro-chart.types';
import { TajikaYoga } from './varshaphala.types';

export const DEEPTAMSHAS: Record<PlanetSymbol, number> = {
  [PlanetSymbol.SUN]: 15.0,
  [PlanetSymbol.MOON]: 12.0,
  [PlanetSymbol.MARS]: 8.0,
  [PlanetSymbol.MERCURY]: 7.0,
  [PlanetSymbol.JUPITER]: 9.0,
  [PlanetSymbol.VENUS]: 7.0,
  [PlanetSymbol.SATURN]: 9.0,
  [PlanetSymbol.RAHU]: 0.0,
  [PlanetSymbol.KETU]: 0.0,
  [PlanetSymbol.URANUS]: 0.0,
  [PlanetSymbol.NEPTUNE]: 0.0,
  [PlanetSymbol.PLUTO]: 0.0,
};

const SEVEN_VEDIC_PLANETS = [
  PlanetSymbol.SUN,
  PlanetSymbol.MOON,
  PlanetSymbol.MARS,
  PlanetSymbol.MERCURY,
  PlanetSymbol.JUPITER,
  PlanetSymbol.VENUS,
  PlanetSymbol.SATURN,
];

// Tajika aspecting relationships between signs
export function isTajikaAspect(rashiA: number, rashiB: number): boolean {
  const diff = ((rashiB - rashiA + 12) % 12) + 1;
  // 1 (conjunction), 3/11 (sextile), 4/10 (square), 5/9 (trine), 7 (opposition)
  return [1, 3, 4, 5, 7, 9, 10, 11].includes(diff);
}

export class TajikaYogasCalculator {
  public evaluateTajikaYogas(planets: Record<PlanetSymbol, PlanetPosition>): TajikaYoga[] {
    const yogas: TajikaYoga[] = [];

    // Track existing direct aspects between pairs
    const directIthasalaPairs = new Set<string>();

    // 1. Pairwise evaluation of the 7 classical planets for Ithasala & Isarpha
    for (let i = 0; i < SEVEN_VEDIC_PLANETS.length; i++) {
      for (let j = i + 1; j < SEVEN_VEDIC_PLANETS.length; j++) {
        const p1 = SEVEN_VEDIC_PLANETS[i];
        const p2 = SEVEN_VEDIC_PLANETS[j];

        const pos1 = planets[p1];
        const pos2 = planets[p2];
        if (!pos1 || !pos2) continue;

        const rashi1 = pos1.rashiIndex ?? 1;
        const rashi2 = pos2.rashiIndex ?? 1;

        const deg1 = pos1.degreeInRashi ?? (pos1.longitude % 30);
        const deg2 = pos2.degreeInRashi ?? (pos2.longitude % 30);

        const speed1 = Math.abs(pos1.speedLongitude ?? 1.0);
        const speed2 = Math.abs(pos2.speedLongitude ?? 1.0);

        // Identify faster vs slower planet
        const faster = speed1 >= speed2 ? p1 : p2;
        const slower = speed1 >= speed2 ? p2 : p1;
        const degFaster = speed1 >= speed2 ? deg1 : deg2;
        const degSlower = speed1 >= speed2 ? deg2 : deg1;

        const orb = (DEEPTAMSHAS[p1] + DEEPTAMSHAS[p2]) / 2.0;
        const actualDistance = Math.abs(degFaster - degSlower);
        const hasAspect = isTajikaAspect(rashi1, rashi2);
        const isWithinOrb = actualDistance <= orb;

        if (hasAspect && isWithinOrb) {
          const isApplying = degFaster < degSlower;

          if (isApplying) {
            directIthasalaPairs.add(`${faster}_${slower}`);
            directIthasalaPairs.add(`${slower}_${faster}`);

            yogas.push({
              type: 'ITHASALA',
              name: `Ithasala (Muthashila) between ${faster} and ${slower}`,
              planet1: faster,
              planet2: slower,
              orbDegrees: orb,
              actualDistanceDegrees: actualDistance,
              isApplying: true,
              strength: actualDistance <= orb / 2 ? 'STRONG' : 'MODERATE',
              description: `Faster planet ${faster} (${degFaster.toFixed(2)}°) applies to slower planet ${slower} (${degSlower.toFixed(2)}°) within orb (${actualDistance.toFixed(2)}° <= ${orb}°).`,
            });
          } else {
            yogas.push({
              type: 'ISARPHA',
              name: `Isarpha (Musaripha) between ${faster} and ${slower}`,
              planet1: faster,
              planet2: slower,
              orbDegrees: orb,
              actualDistanceDegrees: actualDistance,
              isApplying: false,
              strength: 'WEAK',
              description: `Faster planet ${faster} (${degFaster.toFixed(2)}°) is separating from slower planet ${slower} (${degSlower.toFixed(2)}°) within orb (${actualDistance.toFixed(2)}° <= ${orb}°).`,
            });
          }
        }
      }
    }

    // 2. Nakta Yoga: Two non-connected planets linked by a faster intermediary planet
    for (let i = 0; i < SEVEN_VEDIC_PLANETS.length; i++) {
      for (let j = i + 1; j < SEVEN_VEDIC_PLANETS.length; j++) {
        const p1 = SEVEN_VEDIC_PLANETS[i];
        const p2 = SEVEN_VEDIC_PLANETS[j];
        if (directIthasalaPairs.has(`${p1}_${p2}`)) continue;

        const pos1 = planets[p1];
        const pos2 = planets[p2];
        if (!pos1 || !pos2) continue;

        const speed1 = Math.abs(pos1.speedLongitude ?? 1.0);
        const speed2 = Math.abs(pos2.speedLongitude ?? 1.0);

        for (const intermediary of SEVEN_VEDIC_PLANETS) {
          if (intermediary === p1 || intermediary === p2) continue;
          const posInter = planets[intermediary];
          if (!posInter) continue;

          const speedInter = Math.abs(posInter.speedLongitude ?? 1.0);
          // Intermediary must be faster than both planets
          if (speedInter > speed1 && speedInter > speed2) {
            const rashiInter = posInter.rashiIndex ?? 1;
            const rashi1 = pos1.rashiIndex ?? 1;
            const rashi2 = pos2.rashiIndex ?? 1;

            if (isTajikaAspect(rashiInter, rashi1) && isTajikaAspect(rashiInter, rashi2)) {
              const degInter = posInter.degreeInRashi ?? (posInter.longitude % 30);
              const deg1 = pos1.degreeInRashi ?? (pos1.longitude % 30);
              const deg2 = pos2.degreeInRashi ?? (pos2.longitude % 30);

              const orb1 = (DEEPTAMSHAS[intermediary] + DEEPTAMSHAS[p1]) / 2.0;
              const orb2 = (DEEPTAMSHAS[intermediary] + DEEPTAMSHAS[p2]) / 2.0;

              if (Math.abs(degInter - deg1) <= orb1 && Math.abs(degInter - deg2) <= orb2) {
                yogas.push({
                  type: 'NAKTA',
                  name: `Nakta Yoga between ${p1} and ${p2} via ${intermediary}`,
                  planet1: p1,
                  planet2: p2,
                  intermediaryPlanet: intermediary,
                  orbDegrees: Math.max(orb1, orb2),
                  actualDistanceDegrees: Math.max(Math.abs(degInter - deg1), Math.abs(degInter - deg2)),
                  isApplying: true,
                  strength: 'MODERATE',
                  description: `Faster intermediary planet ${intermediary} connects unconnected planets ${p1} and ${p2} by mutual Tajika aspect within orbs.`,
                });
                break; // One Nakta yoga per pair suffices
              }
            }
          }
        }
      }
    }

    // 3. Yamaya Yoga: Two non-connected planets linked by a slower intermediary planet
    for (let i = 0; i < SEVEN_VEDIC_PLANETS.length; i++) {
      for (let j = i + 1; j < SEVEN_VEDIC_PLANETS.length; j++) {
        const p1 = SEVEN_VEDIC_PLANETS[i];
        const p2 = SEVEN_VEDIC_PLANETS[j];
        if (directIthasalaPairs.has(`${p1}_${p2}`)) continue;

        const pos1 = planets[p1];
        const pos2 = planets[p2];
        if (!pos1 || !pos2) continue;

        const speed1 = Math.abs(pos1.speedLongitude ?? 1.0);
        const speed2 = Math.abs(pos2.speedLongitude ?? 1.0);

        for (const intermediary of SEVEN_VEDIC_PLANETS) {
          if (intermediary === p1 || intermediary === p2) continue;
          const posInter = planets[intermediary];
          if (!posInter) continue;

          const speedInter = Math.abs(posInter.speedLongitude ?? 1.0);
          // Intermediary must be slower than both planets
          if (speedInter < speed1 && speedInter < speed2) {
            const rashiInter = posInter.rashiIndex ?? 1;
            const rashi1 = pos1.rashiIndex ?? 1;
            const rashi2 = pos2.rashiIndex ?? 1;

            if (isTajikaAspect(rashi1, rashiInter) && isTajikaAspect(rashi2, rashiInter)) {
              const degInter = posInter.degreeInRashi ?? (posInter.longitude % 30);
              const deg1 = pos1.degreeInRashi ?? (pos1.longitude % 30);
              const deg2 = pos2.degreeInRashi ?? (pos2.longitude % 30);

              const orb1 = (DEEPTAMSHAS[p1] + DEEPTAMSHAS[intermediary]) / 2.0;
              const orb2 = (DEEPTAMSHAS[p2] + DEEPTAMSHAS[intermediary]) / 2.0;

              // Both faster planets must apply to the slower intermediary
              if (
                deg1 < degInter &&
                deg2 < degInter &&
                Math.abs(degInter - deg1) <= orb1 &&
                Math.abs(degInter - deg2) <= orb2
              ) {
                yogas.push({
                  type: 'YAMAYA',
                  name: `Yamaya Yoga between ${p1} and ${p2} via ${intermediary}`,
                  planet1: p1,
                  planet2: p2,
                  intermediaryPlanet: intermediary,
                  orbDegrees: Math.max(orb1, orb2),
                  actualDistanceDegrees: Math.max(Math.abs(degInter - deg1), Math.abs(degInter - deg2)),
                  isApplying: true,
                  strength: 'MODERATE',
                  description: `Slower intermediary planet ${intermediary} collects light from applying faster planets ${p1} and ${p2}.`,
                });
                break;
              }
            }
          }
        }
      }
    }

    // 4. Kamboola Yoga: Moon joins an existing Ithasala yoga
    const ithasalas = yogas.filter((y) => y.type === 'ITHASALA');
    for (const ith of ithasalas) {
      if (ith.planet1 !== PlanetSymbol.MOON && ith.planet2 !== PlanetSymbol.MOON) {
        const moonPos = planets[PlanetSymbol.MOON];
        if (moonPos) {
          const moonRashi = moonPos.rashiIndex ?? 1;
          const targetRashi = planets[ith.planet1]?.rashiIndex ?? 1;
          if (isTajikaAspect(moonRashi, targetRashi)) {
            yogas.push({
              type: 'KAMBOOLA',
              name: `Kamboola Yoga involving Moon, ${ith.planet1}, and ${ith.planet2}`,
              planet1: PlanetSymbol.MOON,
              planet2: ith.planet1,
              intermediaryPlanet: ith.planet2,
              orbDegrees: ith.orbDegrees,
              actualDistanceDegrees: ith.actualDistanceDegrees,
              isApplying: true,
              strength: 'STRONG',
              description: `Moon aspecting ${ith.planet1} which is in Ithasala with ${ith.planet2}.`,
            });
          }
        }
      }
    }

    return yogas;
  }

  /**
   * Static helper to compute Tajika Yogas directly from annual AstroChart.
   */
  public static calculate(annualChart: AstroChart): TajikaYoga[] {
    const calc = new TajikaYogasCalculator();
    return calc.evaluateTajikaYogas(annualChart.planets);
  }
}

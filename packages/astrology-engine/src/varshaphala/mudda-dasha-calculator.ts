import { PlanetSymbol } from '../planets/planet.types';
import { DashaPeriod, ActiveDashaInfo } from '../dasha/dasha.types';
import { MuddaDashaTree } from './varshaphala.types';
import { AstroChart } from '../chart/astro-chart.types';

// Standard Vimshottari planetary years (total 120 years)
const VIMSHOTTARI_YEARS: Record<PlanetSymbol, number> = {
  [PlanetSymbol.SUN]: 6,
  [PlanetSymbol.MOON]: 10,
  [PlanetSymbol.MARS]: 7,
  [PlanetSymbol.RAHU]: 18,
  [PlanetSymbol.JUPITER]: 16,
  [PlanetSymbol.SATURN]: 19,
  [PlanetSymbol.MERCURY]: 17,
  [PlanetSymbol.KETU]: 7,
  [PlanetSymbol.VENUS]: 20,
  [PlanetSymbol.URANUS]: 0,
  [PlanetSymbol.NEPTUNE]: 0,
  [PlanetSymbol.PLUTO]: 0,
};

const PLANET_CYCLE: PlanetSymbol[] = [
  PlanetSymbol.SUN,
  PlanetSymbol.MOON,
  PlanetSymbol.MARS,
  PlanetSymbol.RAHU,
  PlanetSymbol.JUPITER,
  PlanetSymbol.SATURN,
  PlanetSymbol.MERCURY,
  PlanetSymbol.KETU,
  PlanetSymbol.VENUS,
];

// 27 Nakshatras mapped to ruler
const NAKSHATRA_LORDS: PlanetSymbol[] = [
  PlanetSymbol.KETU, PlanetSymbol.VENUS, PlanetSymbol.SUN, PlanetSymbol.MOON, PlanetSymbol.MARS, PlanetSymbol.RAHU, PlanetSymbol.JUPITER, PlanetSymbol.SATURN, PlanetSymbol.MERCURY, // 1-9 (Ashwini to Ashlesha)
  PlanetSymbol.KETU, PlanetSymbol.VENUS, PlanetSymbol.SUN, PlanetSymbol.MOON, PlanetSymbol.MARS, PlanetSymbol.RAHU, PlanetSymbol.JUPITER, PlanetSymbol.SATURN, PlanetSymbol.MERCURY, // 10-18 (Magha to Jyeshtha)
  PlanetSymbol.KETU, PlanetSymbol.VENUS, PlanetSymbol.SUN, PlanetSymbol.MOON, PlanetSymbol.MARS, PlanetSymbol.RAHU, PlanetSymbol.JUPITER, PlanetSymbol.SATURN, PlanetSymbol.MERCURY, // 19-27 (Mula to Revati)
];

const MS_PER_DAY = 86400000;
const SOLAR_YEAR_DAYS = 365.2425;

export class MuddaDashaCalculator {
  /**
   * Calculates Mudda Dasha for the Varshaphala year starting at solarReturnDate.
   * Starts with the lord of the Moon's nakshatra in the annual chart.
   */
  public static calculate(
    annualChart: AstroChart,
    solarReturnDate: Date,
    targetDate?: Date | string
  ): MuddaDashaTree {
    const annualMoon = annualChart.planets[PlanetSymbol.MOON];
    const moonNakshatraIndex = annualMoon?.nakshatraIndex ?? 1; // 1-indexed (1..27)
    const startingLord = NAKSHATRA_LORDS[(moonNakshatraIndex - 1) % 27];

    const startIndex = PLANET_CYCLE.indexOf(startingLord);
    const periods: DashaPeriod[] = [];

    let currentStartMs = solarReturnDate.getTime();

    for (let i = 0; i < 9; i++) {
      const planetIndex = (startIndex + i) % 9;
      const planet = PLANET_CYCLE[planetIndex];
      const years = VIMSHOTTARI_YEARS[planet];
      const durationDays = (years / 120) * SOLAR_YEAR_DAYS;
      const durationMs = durationDays * MS_PER_DAY;
      const endMs = currentStartMs + durationMs;

      const startDate = new Date(currentStartMs);
      const endDate = new Date(endMs);

      periods.push({
        level: 1,
        lord: planet,
        order: i + 1,
        startDateIso: startDate.toISOString(),
        endDateIso: endDate.toISOString(),
        durationYears: durationDays / SOLAR_YEAR_DAYS,
        nominalYears: durationDays / SOLAR_YEAR_DAYS,
        isBirthDasha: i === 0,
      });

      currentStartMs = endMs;
    }

    const startIso = solarReturnDate.toISOString();
    const endIso = new Date(solarReturnDate.getTime() + SOLAR_YEAR_DAYS * MS_PER_DAY).toISOString();

    let activeDasha: ActiveDashaInfo | undefined;
    const queryDate = targetDate ? new Date(targetDate) : solarReturnDate;

    if (!isNaN(queryDate.getTime())) {
      const queryMs = queryDate.getTime();
      const activePeriod = periods.find((p) => {
        const pStart = new Date(p.startDateIso).getTime();
        const pEnd = new Date(p.endDateIso).getTime();
        return queryMs >= pStart && queryMs < pEnd;
      });

      if (activePeriod) {
        activeDasha = {
          targetDateIso: queryDate.toISOString(),
          mahadasha: {
            level: 1,
            lord: activePeriod.lord,
            startDateIso: activePeriod.startDateIso,
            endDateIso: activePeriod.endDateIso,
            durationYears: activePeriod.durationYears,
            nominalYears: activePeriod.nominalYears,
          },
          path: [activePeriod.lord],
          description: `Mudda Mahadasha of ${activePeriod.lord}`,
        };
      }
    }

    return {
      dashaSystem: 'MUDDA',
      birthLord: startingLord,
      totalCycleDays: SOLAR_YEAR_DAYS,
      startDateIso: startIso,
      endDateIso: endIso,
      periods,
      activeDasha,
      convention: 'MUDDA_FULL_CYCLE_PROPORTIONAL',
    };
  }
}

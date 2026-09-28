import { PlanetSymbol } from '../planets/planet.types';
import { KalaBalaBreakdown, ShadbalaPlanet } from './strength.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { AstroChart } from '../chart/astro-chart.types';
import { calculatePlanetaryWars } from '../planets/planetary-war';

const WEEKDAY_LORDS = [
  PlanetSymbol.SUN,     // 0 = Sunday
  PlanetSymbol.MOON,    // 1 = Monday
  PlanetSymbol.MARS,    // 2 = Tuesday
  PlanetSymbol.MERCURY, // 3 = Wednesday
  PlanetSymbol.JUPITER, // 4 = Thursday
  PlanetSymbol.VENUS,   // 5 = Friday
  PlanetSymbol.SATURN,  // 6 = Saturday
];

// Chaldean hora sequence (descending geocentric order of speed/distance)
const HORA_SEQUENCE = [
  PlanetSymbol.SUN,
  PlanetSymbol.VENUS,
  PlanetSymbol.MERCURY,
  PlanetSymbol.MOON,
  PlanetSymbol.SATURN,
  PlanetSymbol.JUPITER,
  PlanetSymbol.MARS,
];

/**
 * 1. Nathonnatha Bala (Diurnal / Nocturnal Strength)
 * - Diurnal planets (Sun, Jupiter, Venus) get 60 during day, 0 during night.
 * - Nocturnal planets (Moon, Mars, Saturn) get 60 during night, 0 during day.
 * - Mercury gets 60 always.
 */
export function calculateNathonnathaBala(planet: ShadbalaPlanet, isDayBirth: boolean): number {
  if (planet === PlanetSymbol.MERCURY) {
    return 60.0;
  }

  const diurnalPlanets = [PlanetSymbol.SUN, PlanetSymbol.JUPITER, PlanetSymbol.VENUS];
  const nocturnalPlanets = [PlanetSymbol.MOON, PlanetSymbol.MARS, PlanetSymbol.SATURN];

  if (isDayBirth) {
    return diurnalPlanets.includes(planet) ? 60.0 : 0.0;
  } else {
    return nocturnalPlanets.includes(planet) ? 60.0 : 0.0;
  }
}

/**
 * 2. Paksha Bala (Lunar Phase Strength)
 * Measures elongation between Moon and Sun.
 * - Benefics (Jupiter, Venus, Mercury) get strength proportional to waxing phase.
 * - Malefics (Sun, Mars, Saturn) get strength proportional to waning phase.
 * - Moon's Paksha Bala is doubled according to BPHS Ch. 27.
 */
export function calculatePakshaBala(
  planet: ShadbalaPlanet,
  sunLongitude: number,
  moonLongitude: number
): number {
  let diff = normalizeDegree(moonLongitude - sunLongitude);
  let phaseAngle = diff > 180 ? 360 - diff : diff;

  // Benefic score [0, 60]
  const beneficScore = (phaseAngle / 180.0) * 60.0;

  if (planet === PlanetSymbol.MOON) {
    // Moon's Paksha Bala is doubled
    return Number((beneficScore * 2.0).toFixed(4));
  }

  const benefics = [PlanetSymbol.JUPITER, PlanetSymbol.VENUS, PlanetSymbol.MERCURY];
  if (benefics.includes(planet)) {
    return Number(beneficScore.toFixed(4));
  } else {
    return Number((60.0 - beneficScore).toFixed(4));
  }
}

/**
 * 3. Tribhaga Bala (Three-part Day/Night Strength)
 * - Day part 1: Mercury (60)
 * - Day part 2: Sun (60)
 * - Day part 3: Saturn (60)
 * - Night part 1: Moon (60)
 * - Night part 2: Venus (60)
 * - Night part 3: Mars (60)
 * - Jupiter gets 60 always.
 */
export function calculateTribhagaBala(
  planet: ShadbalaPlanet,
  isDayBirth: boolean,
  localHour: number // 0 to 24
): number {
  if (planet === PlanetSymbol.JUPITER) {
    return 60.0;
  }

  // Determine which part of 3
  // Normalize local hour assuming 6:00 sunrise and 18:00 sunset as reference solar divisions
  if (isDayBirth) {
    // Day span roughly 6 to 18 (12 hours / 3 = 4 hours per part)
    const normalizedDayHour = ((localHour - 6 + 24) % 24);
    const part = Math.min(2, Math.floor(normalizedDayHour / 4));
    if (part === 0 && planet === PlanetSymbol.MERCURY) return 60.0;
    if (part === 1 && planet === PlanetSymbol.SUN) return 60.0;
    if (part === 2 && planet === PlanetSymbol.SATURN) return 60.0;
  } else {
    // Night span roughly 18 to 6 (12 hours / 3 = 4 hours per part)
    const normalizedNightHour = ((localHour - 18 + 24) % 24);
    const part = Math.min(2, Math.floor(normalizedNightHour / 4));
    if (part === 0 && planet === PlanetSymbol.MOON) return 60.0;
    if (part === 1 && planet === PlanetSymbol.VENUS) return 60.0;
    if (part === 2 && planet === PlanetSymbol.MARS) return 60.0;
  }

  return 0.0;
}

/**
 * 4. Vara Bala (Weekday Lord Strength)
 * Lord of the day gets 45 Shashtiamsas.
 */
export function calculateVaraBala(planet: ShadbalaPlanet, dayOfWeek: number): number {
  const lord = WEEKDAY_LORDS[dayOfWeek % 7];
  return planet === lord ? 45.0 : 0.0;
}

/**
 * 5. Hora Bala (Planetary Hour Lord Strength)
 * Lord of the planetary hora gets 60 Shashtiamsas.
 */
export function calculateHoraBala(
  planet: ShadbalaPlanet,
  dayOfWeek: number,
  localHour: number
): number {
  const dayLord = WEEKDAY_LORDS[dayOfWeek % 7];
  const dayLordStartIndex = HORA_SEQUENCE.indexOf(dayLord);

  // Approximate hora elapsed since 6 AM
  const hoursSinceSunrise = Math.floor(((localHour - 6 + 24) % 24));
  const currentHoraIndex = (dayLordStartIndex + hoursSinceSunrise) % 7;
  const horaLord = HORA_SEQUENCE[currentHoraIndex];

  return planet === horaLord ? 60.0 : 0.0;
}

/**
 * 6. Ayana Bala (Equinoctial / Declination Strength)
 * Uses ecliptic declination:
 * - Sun, Mars, Jupiter, Venus, Mercury are strong with North declination.
 * - Moon, Saturn are strong with South declination.
 */
export function calculateAyanaBala(planet: ShadbalaPlanet, longitude: number): number {
  // Approximate declination: sin(delta) = sin(23.44°) * sin(longitude)
  const epsRad = (23.44 * Math.PI) / 180;
  const lonRad = (longitude * Math.PI) / 180;
  const sinDecl = Math.sin(epsRad) * Math.sin(lonRad);
  const declDeg = (Math.asin(sinDecl) * 180) / Math.PI;

  let ayanaBala = 0;
  const northStrongPlanets = [
    PlanetSymbol.SUN,
    PlanetSymbol.MARS,
    PlanetSymbol.JUPITER,
    PlanetSymbol.VENUS,
    PlanetSymbol.MERCURY,
  ];

  if (northStrongPlanets.includes(planet)) {
    ayanaBala = ((24.0 + declDeg) / 48.0) * 60.0;
  } else {
    ayanaBala = ((24.0 - declDeg) / 48.0) * 60.0;
  }

  return Number(Math.max(0, Math.min(60, ayanaBala)).toFixed(4));
}

/**
 * 7. Yuddha Bala (Planetary War Strength)
 */
export function calculateYuddhaBala(planet: ShadbalaPlanet, chart: AstroChart): number {
  const taraPlanets = [
    PlanetSymbol.MARS,
    PlanetSymbol.MERCURY,
    PlanetSymbol.JUPITER,
    PlanetSymbol.VENUS,
    PlanetSymbol.SATURN,
  ];
  if (!taraPlanets.includes(planet)) return 0.0;

  const warInputs = taraPlanets.map((p) => {
    const pos = chart.planets[p];
    return {
      planet: p,
      longitude: pos ? pos.longitude : 0,
      latitude: pos ? pos.latitude : 0,
      rashiIndex: pos ? pos.rashiIndex : 1,
    };
  });

  const wars = calculatePlanetaryWars(warInputs);
  let yuddhaBala = 0;

  for (const war of wars) {
    if (war.victor === planet) {
      yuddhaBala += 30.0; // Standard boost for victor
    } else if (war.defeated === planet) {
      yuddhaBala -= 30.0; // Penalty for defeated
    }
  }

  return yuddhaBala;
}

/**
 * Calculates complete Kala Bala and its 7 subcomponents.
 */
export function calculateKalaBala(planet: ShadbalaPlanet, chart: AstroChart): KalaBalaBreakdown {
  const sunPos = chart.planets[PlanetSymbol.SUN];
  const moonPos = chart.planets[PlanetSymbol.MOON];
  const planetPos = chart.planets[planet];

  const sunLong = sunPos ? sunPos.longitude : 0;
  const moonLong = moonPos ? moonPos.longitude : 0;
  const planetLong = planetPos ? planetPos.longitude : 0;

  const ascRashi = chart.ascendant?.rashiIndex || 1;
  const sunHouse = sunPos ? (((sunPos.rashiIndex - ascRashi + 12) % 12) + 1) : 1;
  const isDayBirth = sunHouse >= 7 && sunHouse <= 12;

  const birthDateUtc = chart.metadata?.normalizedTime?.utcIsoString
    ? new Date(chart.metadata.normalizedTime.utcIsoString)
    : new Date();
  const dayOfWeek = birthDateUtc.getUTCDay();

  const localTime = chart.birthDetails?.time || { hour: 12, minute: 0, second: 0 };
  const localHour = localTime.hour + (localTime.minute || 0) / 60;

  const nathonnathaBala = calculateNathonnathaBala(planet, isDayBirth);
  const pakshaBala = calculatePakshaBala(planet, sunLong, moonLong);
  const tribhagaBala = calculateTribhagaBala(planet, isDayBirth, localHour);
  const varaBala = calculateVaraBala(planet, dayOfWeek);
  const horaBala = calculateHoraBala(planet, dayOfWeek, localHour);
  const ayanaBala = calculateAyanaBala(planet, planetLong);
  const yuddhaBala = calculateYuddhaBala(planet, chart);

  const total =
    nathonnathaBala +
    pakshaBala +
    tribhagaBala +
    varaBala +
    horaBala +
    ayanaBala +
    yuddhaBala;

  return {
    nathonnathaBala,
    pakshaBala,
    tribhagaBala,
    varaBala,
    horaBala,
    ayanaBala,
    yuddhaBala,
    total: Number(total.toFixed(4)),
  };
}

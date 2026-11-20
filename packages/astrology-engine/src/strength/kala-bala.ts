import { PlanetSymbol } from '../planets/planet.types';
import { KalaBalaBreakdown, ShadbalaPlanet } from './strength.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { AstroChart } from '../chart/astro-chart.types';
import { calculatePlanetaryWars } from '../planets/planetary-war';
import { KalaTimeContext, resolveKalaTimeContext, WEEKDAY_LORDS, HORA_SEQUENCE } from './kala-time-context';

/**
 * 1. Nathonnatha Bala (Diurnal / Nocturnal Strength), BPHS ch. 27; Raman, "Graha and Bhava Balas".
 * - Unnata = time from apparent midnight (0..12 h = 0..30 ghatis).
 *   Sun, Jupiter, Venus (Divabala) = 60 × unnata / 12 h (= 2 × unnata in ghatis).
 *   Moon, Mars, Saturn = 60 − Divabala. Mercury gets 60 always.
 * - When `unnataHours` is omitted, the legacy binary approximation is used
 *   (60 / 0 by day or night); kept for backward compatibility only.
 */
export function calculateNathonnathaBala(
  planet: ShadbalaPlanet,
  isDayBirth: boolean,
  unnataHours?: number
): number {
  if (planet === PlanetSymbol.MERCURY) {
    return 60.0;
  }

  const diurnalPlanets = [PlanetSymbol.SUN, PlanetSymbol.JUPITER, PlanetSymbol.VENUS];
  const nocturnalPlanets = [PlanetSymbol.MOON, PlanetSymbol.MARS, PlanetSymbol.SATURN];

  if (typeof unnataHours === 'number' && Number.isFinite(unnataHours)) {
    const u = Math.max(0, Math.min(12, unnataHours));
    const diva = (u / 12) * 60.0;
    return Number((diurnalPlanets.includes(planet) ? diva : 60.0 - diva).toFixed(4));
  }

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
  localHour: number, // 0 to 24 (legacy 06:00/18:00 approximation)
  tribhagaPart?: number // 0..2 from real sunrise/sunset (kala-time-context); takes precedence
): number {
  if (planet === PlanetSymbol.JUPITER) {
    return 60.0;
  }

  if (typeof tribhagaPart === 'number') {
    const owners = isDayBirth
      ? [PlanetSymbol.MERCURY, PlanetSymbol.SUN, PlanetSymbol.SATURN]
      : [PlanetSymbol.MOON, PlanetSymbol.VENUS, PlanetSymbol.MARS];
    return owners[Math.max(0, Math.min(2, Math.floor(tribhagaPart)))] === planet ? 60.0 : 0.0;
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

/** Hora Bala from a resolved hora lord (kala-time-context, real sunrise/sunset). */
export function calculateHoraBalaForLord(planet: ShadbalaPlanet, horaLord: PlanetSymbol): number {
  return planet === horaLord ? 60.0 : 0.0;
}

/**
 * Abda Bala: 15 virupas to the lord of the (360-day) year. Masa Bala: 30 virupas to the lord of the
 * (30-day) month. BPHS ch. 27; Raman, "Graha and Bhava Balas" (Ahargana method).
 * Provisional – pending client review (see kala-time-context.ts).
 */
export function calculateAbdaBala(planet: ShadbalaPlanet, abdaLord: PlanetSymbol): number {
  return planet === abdaLord ? 15.0 : 0.0;
}

export function calculateMasaBala(planet: ShadbalaPlanet, masaLord: PlanetSymbol): number {
  return planet === masaLord ? 30.0 : 0.0;
}

/**
 * 6. Ayana Bala (Equinoctial / Declination Strength), BPHS ch. 27.
 * Kranti (declination) is taken from the SAYANA (tropical) longitude = sidereal longitude + ayanamsa
 * (BPHS ch. 27; Raman, "Graha and Bhava Balas": "add the ayanamsa to the nirayana longitude").
 * - Sun, Mars, Jupiter, Venus, Mercury are strong with North declination.
 * - Moon, Saturn are strong with South declination.
 *
 * @param longitude sidereal longitude (as stored on the chart)
 * @param ayanamsaDegrees ayanamsa to add; defaults to 0 for backward compatibility (callers inside
 *   the engine always pass the chart's ayanamsa).
 */
export function calculateAyanaBala(
  planet: ShadbalaPlanet,
  longitude: number,
  ayanamsaDegrees: number = 0
): number {
  // Declination from the ecliptic: sin(delta) = sin(23.44°) * sin(sayana longitude)
  const epsRad = (23.44 * Math.PI) / 180;
  const lonRad = (normalizeDegree(longitude + ayanamsaDegrees) * Math.PI) / 180;
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
 * Calculates complete Kala Bala: Nathonnata, Paksha, Tribhaga, Abda, Masa, Vara, Hora, Ayana, Yuddha
 * (BPHS ch. 27). Sunrise-based quantities come from `resolveKalaTimeContext` (real local sunrise and
 * sunset). Pass a precomputed `timeContext` to avoid recomputing it per planet.
 * Combustion is NOT part of Shadbala (classically separate); see PlanetShadbala.combustion.
 */
export function calculateKalaBala(
  planet: ShadbalaPlanet,
  chart: AstroChart,
  timeContext?: KalaTimeContext
): KalaBalaBreakdown {
  const ctx = timeContext ?? resolveKalaTimeContext(chart);
  const sunPos = chart.planets[PlanetSymbol.SUN];
  const moonPos = chart.planets[PlanetSymbol.MOON];
  const planetPos = chart.planets[planet];

  const sunLong = sunPos ? sunPos.longitude : 0;
  const moonLong = moonPos ? moonPos.longitude : 0;
  const planetLong = planetPos ? planetPos.longitude : 0;

  const nathonnathaBala = calculateNathonnathaBala(planet, ctx.isDayBirth, ctx.unnataHours);
  const pakshaBala = calculatePakshaBala(planet, sunLong, moonLong);
  const tribhagaBala = calculateTribhagaBala(planet, ctx.isDayBirth, 0, ctx.tribhagaPart);
  const abdaBala = calculateAbdaBala(planet, ctx.abdaLord);
  const masaBala = calculateMasaBala(planet, ctx.masaLord);
  const varaBala = calculateVaraBala(planet, ctx.vedicWeekday);
  const horaBala = calculateHoraBalaForLord(planet, ctx.horaLord);
  const ayanaBala = calculateAyanaBala(planet, planetLong, ctx.ayanamsaDegrees);
  const yuddhaBala = calculateYuddhaBala(planet, chart);

  const total =
    nathonnathaBala +
    pakshaBala +
    tribhagaBala +
    abdaBala +
    masaBala +
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
    abdaBala,
    masaBala,
    total: Number(total.toFixed(4)),
  };
}

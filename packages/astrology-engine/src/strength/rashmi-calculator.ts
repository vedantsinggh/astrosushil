import { PlanetSymbol, MANDATORY_VEDIC_PLANETS } from '../planets/planet.types';
import { AstroChart } from '../chart/astro-chart.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { calculateCombustion } from '../planets/combustion';
import { PlanetaryRashmiDetail } from './vimshopaka.types';

// Classical maximum rays at deep exaltation (BPHS / Saravali)
export const MAX_PLANETARY_RAYS: Record<PlanetSymbol, number> = {
  [PlanetSymbol.SUN]: 10,
  [PlanetSymbol.MOON]: 9,
  [PlanetSymbol.MARS]: 5,
  [PlanetSymbol.MERCURY]: 5,
  [PlanetSymbol.JUPITER]: 7,
  [PlanetSymbol.VENUS]: 8,
  [PlanetSymbol.SATURN]: 5,
  [PlanetSymbol.RAHU]: 0,
  [PlanetSymbol.KETU]: 0,
  [PlanetSymbol.URANUS]: 0,
  [PlanetSymbol.NEPTUNE]: 0,
  [PlanetSymbol.PLUTO]: 0,
};

// Deep debilitation points in sidereal longitude
export const DEEP_DEBILITATION_LONGITUDE: Record<PlanetSymbol, number> = {
  [PlanetSymbol.SUN]: 190,       // Libra 10°
  [PlanetSymbol.MOON]: 213,      // Scorpio 3°
  [PlanetSymbol.MARS]: 118,      // Cancer 28°
  [PlanetSymbol.MERCURY]: 345,   // Pisces 15°
  [PlanetSymbol.JUPITER]: 275,   // Capricorn 5°
  [PlanetSymbol.VENUS]: 177,     // Virgo 27°
  [PlanetSymbol.SATURN]: 20,     // Aries 20°
  [PlanetSymbol.RAHU]: 240,
  [PlanetSymbol.KETU]: 60,
  [PlanetSymbol.URANUS]: 0,
  [PlanetSymbol.NEPTUNE]: 0,
  [PlanetSymbol.PLUTO]: 0,
};

export class RashmiCalculator {
  /**
   * Computes deterministic Planetary Rays (Rashmis) according to BPHS Ch. 47.
   */
  public static calculatePlanetaryRashmis(chart: AstroChart): {
    rashmis: Record<string, PlanetaryRashmiDetail>;
    totalChartRays: number;
  } {
    const sunLong = chart.planets[PlanetSymbol.SUN]?.longitude ?? 0;
    const rashmis: Record<string, PlanetaryRashmiDetail> = {};
    let totalChartRays = 0;

    const PHYSICAL_SEVEN = [
      PlanetSymbol.SUN,
      PlanetSymbol.MOON,
      PlanetSymbol.MARS,
      PlanetSymbol.MERCURY,
      PlanetSymbol.JUPITER,
      PlanetSymbol.VENUS,
      PlanetSymbol.SATURN,
    ];

    for (const sym of PHYSICAL_SEVEN) {
      const pos = chart.planets[sym];
      if (!pos || typeof pos.longitude !== 'number') continue;

      const maxRays = MAX_PLANETARY_RAYS[sym] || 5;
      const neechaLong = DEEP_DEBILITATION_LONGITUDE[sym] || 0;

      // Angular distance from deep debilitation point [0, 360)
      const distFromDebilitation = normalizeDegree(pos.longitude - neechaLong);
      const effectiveDist = distFromDebilitation <= 180 ? distFromDebilitation : 360 - distFromDebilitation;

      // Base rays proportional to distance from Neecha (0 at Neecha to Max at Ucha 180° away)
      const baseRays = (effectiveDist / 180) * maxRays;

      // Retrograde bonus: Retrograde planets double their rays (+100%)
      const isRetro = pos.isRetrograde ?? false;
      const retrogradeBonus = isRetro && sym !== PlanetSymbol.SUN && sym !== PlanetSymbol.MOON ? baseRays : 0;

      // Combustion deduction: Combust planets lose 50% to 100% of their rays
      const isCombust = calculateCombustion(sym, pos.longitude, sunLong, isRetro).isCombust;
      const combustionDeduction = isCombust ? baseRays * 0.5 : 0;

      const netRays = Math.max(0, baseRays + retrogradeBonus - combustionDeduction);
      totalChartRays += netRays;

      rashmis[sym] = {
        planet: sym,
        baseRays: Number(baseRays.toFixed(2)),
        exaltationRays: maxRays,
        modifiedRays: Number((baseRays + retrogradeBonus).toFixed(2)),
        combustionDeduction: Number(combustionDeduction.toFixed(2)),
        retrogradeBonus: Number(retrogradeBonus.toFixed(2)),
        netRays: Number(netRays.toFixed(2)),
      };
    }

    return {
      rashmis,
      totalChartRays: Number(totalChartRays.toFixed(2)),
    };
  }
}

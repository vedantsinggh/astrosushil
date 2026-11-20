import { AstroChart } from '../../src/chart/astro-chart.types';

/**
 * Minimal synthetic chart for rule tests: only the fields the Tajika rules read
 * (longitude, rashiIndex, degreeInRashi, isRetrograde; ascendant rashi). Positions are chosen by hand.
 */
export function tajikaTestChart(ascRashi: number, lons: Record<string, number | [number, boolean]>): AstroChart {
  const planets: Record<string, unknown> = {};
  for (const [p, v] of Object.entries(lons)) {
    const [lon, retro] = Array.isArray(v) ? v : [v, false];
    const rashiIndex = Math.floor(lon / 30) + 1;
    planets[p] = { planet: p, longitude: lon, latitude: 0, distanceAU: 1, speedLongitude: retro ? -0.1 : 1, isRetrograde: retro, rashiIndex, rashiName: '', degreeInRashi: lon - (rashiIndex - 1) * 30, nakshatraIndex: 1, nakshatraName: '', pada: 1, nakshatraLord: 'KETU' };
  }
  return { ascendant: { name: 'Ascendant', longitude: (ascRashi - 1) * 30 + 15, rashiIndex: ascRashi, degreeInRashi: 15 }, planets } as unknown as AstroChart;
}

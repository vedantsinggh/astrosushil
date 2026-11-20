/**
 * Shared code for the planet-transit report family (Saturn, Jupiter Transit,
 * Rahu–Ketu Transit). See docs/report-system/decisions/planet-transits.md.
 */
import { TransitIngressSolver } from '@astro/astrology-engine';
import { AddEvidence } from '../../evidence/evidence-registry';
import { ChartSnapshot } from '../../snapshot/chart-snapshot';
import { PlanetTransitExt } from './blocks';
import { computeReturns } from './calc/lifetime';
import { computePlanetTransit, PlanetKey, PLANET_NAME, transitPositions } from './calc/planet-transit';
import { addPlanetEvidence, addPositionEvidence, addReturnEvidence } from './evidence';

export * from './blocks';
export * from './topics';
export * from './evidence';
export * from './calc/planet-transit';
export * from './calc/timeline';
export * from './calc/sade-sati';
export * from './calc/lifetime';

/** Deterministic `extend` payload for one or more planets. */
export async function computePlanetTransitExt(
  snapshot: ChartSnapshot,
  planets: Array<{ key: PlanetKey; horizonYears: number }>
): Promise<PlanetTransitExt> {
  const solver = new TransitIngressSolver();
  const ext: PlanetTransitExt = { pt: {}, positions: await transitPositions(snapshot, solver), returns: {} };
  for (const { key, horizonYears } of planets) {
    ext.pt[key] = await computePlanetTransit(snapshot, key, { horizonYears, solver });
    ext.returns[key] = await computeReturns(snapshot, key, solver);
  }
  return ext;
}

/** Evidence for everything in a `PlanetTransitExt`. */
export function addPlanetTransitEvidence(add: AddEvidence, snapshot: ChartSnapshot, ext: PlanetTransitExt): void {
  addPositionEvidence(add, snapshot, ext.positions);
  for (const d of Object.values(ext.pt)) if (d) addPlanetEvidence(add, snapshot, d);
  for (const [k, r] of Object.entries(ext.returns)) if (r) addReturnEvidence(add, k, PLANET_NAME[k as PlanetKey], r);
}

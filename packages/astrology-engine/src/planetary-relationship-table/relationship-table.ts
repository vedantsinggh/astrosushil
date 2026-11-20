import { AstroChart } from '../chart/astro-chart.types';
import { PlanetSymbol } from '../planets/planet.types';
import { CompoundRelationship, NaturalRelationship, TemporalRelationship } from '../planets/planetary-intelligence.types';
import { getCompoundRelationship, getNaturalRelationship, getTemporalRelationship } from '../planets/planetary-relationships';

/** Planets of the Panchadha Maitri table (the seven grahas; the nodes as the engine defines them). */
export const RELATIONSHIP_TABLE_PLANETS: PlanetSymbol[] = [
  PlanetSymbol.SUN, PlanetSymbol.MOON, PlanetSymbol.MARS, PlanetSymbol.MERCURY,
  PlanetSymbol.JUPITER, PlanetSymbol.VENUS, PlanetSymbol.SATURN, PlanetSymbol.RAHU, PlanetSymbol.KETU,
];

export interface RelationshipCell {
  from: PlanetSymbol;
  to: PlanetSymbol;
  natural: NaturalRelationship;
  temporal: TemporalRelationship;
  compound: CompoundRelationship;
}

export interface RelationshipTable {
  planets: PlanetSymbol[];
  /** Sign (1-12) of each planet in the chart, used for the temporal relationship. */
  signs: Record<string, number>;
  /** Row = `from` planet's view of the column planet; diagonal omitted. */
  cells: RelationshipCell[];
  source: string;
}

/**
 * Natural (Naisargika), temporal (Tatkalika) and compound (Panchadha) relationships for every
 * ordered pair of planets in a chart, using the engine's existing rules
 * (planets/planetary-relationships.ts, BPHS ch. 3).
 */
export function calculateRelationshipTable(chart: AstroChart, planets: PlanetSymbol[] = RELATIONSHIP_TABLE_PLANETS): RelationshipTable {
  const signs: Record<string, number> = {};
  for (const p of planets) {
    const pos = chart.planets[p];
    if (!pos) throw new Error(`Chart has no position for ${p}`);
    signs[p] = pos.rashiIndex;
  }
  const cells: RelationshipCell[] = [];
  for (const a of planets) {
    for (const b of planets) {
      if (a === b) continue;
      const natural = getNaturalRelationship(a, b);
      const temporal = getTemporalRelationship(signs[a], signs[b]);
      cells.push({ from: a, to: b, natural, temporal, compound: getCompoundRelationship(natural, temporal) });
    }
  }
  return {
    planets,
    signs,
    cells,
    source:
      'BPHS ch. 3 (Naisargika and Tatkalika maitri; Panchadha by combining both), as implemented in the engine. ' +
      'Natural relationships of Rahu/Ketu are the engine’s existing convention (not in BPHS’s seven-planet table).',
  };
}

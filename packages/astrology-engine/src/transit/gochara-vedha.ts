import { PlanetSymbol } from '../planets/planet.types';

/**
 * Gochara (transit-from-Moon) favourable houses and Vedha (obstruction) points.
 * Source: Phaladeepika ch. 26 (Gochara Phala); decision log GOC-001..GOC-006.
 *
 * Each favourable house from the natal Moon has a paired Vedha house. When the transit planet
 * is in a favourable house and another transiting planet occupies the paired Vedha house, the
 * favourable result is obstructed. Exemptions: the Sun and Saturn never obstruct each other, nor
 * do the Moon and Mercury (father-son pairs).
 */
export const GOCHARA_VEDHA_TABLE: Record<string, Record<number, number>> = {
  [PlanetSymbol.SUN]: { 3: 9, 6: 12, 10: 4, 11: 5 },
  [PlanetSymbol.MOON]: { 1: 5, 3: 9, 6: 12, 7: 2, 10: 4, 11: 8 },
  [PlanetSymbol.MARS]: { 3: 12, 6: 9, 11: 5 },
  [PlanetSymbol.MERCURY]: { 2: 5, 4: 3, 6: 9, 8: 1, 10: 8, 11: 12 },
  [PlanetSymbol.JUPITER]: { 2: 12, 5: 4, 7: 3, 9: 10, 11: 8 },
  [PlanetSymbol.VENUS]: { 1: 8, 2: 7, 3: 1, 4: 10, 5: 9, 8: 5, 9: 11, 11: 6, 12: 3 },
  [PlanetSymbol.SATURN]: { 3: 12, 6: 9, 11: 5 },
};

/** Rahu and Ketu follow Saturn's gochara table (GOC-003); 'NONE' leaves them unevaluated. */
export type NodeGocharaModel = 'AS_SATURN' | 'NONE';

/** Planets that can cause Vedha: the seven classical grahas (GOC-004). */
export const VEDHA_CAUSING_PLANETS: PlanetSymbol[] = [
  PlanetSymbol.SUN,
  PlanetSymbol.MOON,
  PlanetSymbol.MARS,
  PlanetSymbol.MERCURY,
  PlanetSymbol.JUPITER,
  PlanetSymbol.VENUS,
  PlanetSymbol.SATURN,
];

const EXEMPT_PAIRS: [PlanetSymbol, PlanetSymbol][] = [
  [PlanetSymbol.SUN, PlanetSymbol.SATURN],
  [PlanetSymbol.MOON, PlanetSymbol.MERCURY],
];

function isExemptPair(a: PlanetSymbol, b: PlanetSymbol): boolean {
  return EXEMPT_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

export function getGocharaTable(planet: PlanetSymbol, nodeModel: NodeGocharaModel = 'AS_SATURN'): Record<number, number> | undefined {
  if (planet === PlanetSymbol.RAHU || planet === PlanetSymbol.KETU) {
    return nodeModel === 'AS_SATURN' ? GOCHARA_VEDHA_TABLE[PlanetSymbol.SATURN] : undefined;
  }
  return GOCHARA_VEDHA_TABLE[planet];
}

export interface GocharaVedhaDetail {
  rule: 'PHALADEEPIKA_26';
  isEvaluated: boolean;                // false for nodes when nodeModel = 'NONE'
  tableUsed?: PlanetSymbol;            // SATURN for Rahu/Ketu under AS_SATURN
  houseFromMoon: number;
  isFavourableHouse: boolean;
  /**
   * Favourable house: its Vedha house. Unfavourable house that is a Vedha point: its paired
   * favourable house. Omitted when the house has no pair (keeps API payloads free of nulls).
   */
  pairedHouse?: number;
  obstructingPlanets: PlanetSymbol[];
  /** Favourable result obstructed by Vedha. */
  isObstructed: boolean;
  /** Vipareeta Vedha: an unfavourable result obstructed by a planet in the paired favourable house (GOC-005). */
  isVipareetaVedha: boolean;
  netResult: 'FAVOURABLE' | 'FAVOURABLE_OBSTRUCTED' | 'UNFAVOURABLE' | 'UNFAVOURABLE_OBSTRUCTED' | 'NOT_EVALUATED';
}

/**
 * Evaluates Vedha for one transit planet given every transit planet's house from the natal Moon.
 */
export function evaluateGocharaVedha(
  planet: PlanetSymbol,
  housesFromMoon: Partial<Record<PlanetSymbol, number>>,
  nodeModel: NodeGocharaModel = 'AS_SATURN'
): GocharaVedhaDetail {
  const house = housesFromMoon[planet] ?? 0;
  const table = getGocharaTable(planet, nodeModel);
  if (!table) {
    return {
      rule: 'PHALADEEPIKA_26',
      isEvaluated: false,
      houseFromMoon: house,
      isFavourableHouse: false,
      obstructingPlanets: [],
      isObstructed: false,
      isVipareetaVedha: false,
      netResult: 'NOT_EVALUATED',
    };
  }
  const tableUsed = planet === PlanetSymbol.RAHU || planet === PlanetSymbol.KETU ? PlanetSymbol.SATURN : planet;
  const isFavourableHouse = Object.prototype.hasOwnProperty.call(table, house);

  const pairedHouse: number | undefined = isFavourableHouse
    ? table[house]
    : Object.keys(table).map(Number).find((f) => table[f] === house);

  // The exemption pairs are judged on the planet whose table is used (Rahu/Ketu act as Saturn).
  const obstructingPlanets =
    pairedHouse === undefined
      ? []
      : VEDHA_CAUSING_PLANETS.filter(
          (other) => other !== planet && !isExemptPair(tableUsed, other) && housesFromMoon[other] === pairedHouse
        );

  const isObstructed = isFavourableHouse && obstructingPlanets.length > 0;
  const isVipareetaVedha = !isFavourableHouse && obstructingPlanets.length > 0;
  const detail: GocharaVedhaDetail = {
    rule: 'PHALADEEPIKA_26',
    isEvaluated: true,
    tableUsed,
    houseFromMoon: house,
    isFavourableHouse,
    obstructingPlanets,
    isObstructed,
    isVipareetaVedha,
    netResult: isFavourableHouse
      ? isObstructed ? 'FAVOURABLE_OBSTRUCTED' : 'FAVOURABLE'
      : isVipareetaVedha ? 'UNFAVOURABLE_OBSTRUCTED' : 'UNFAVOURABLE',
  };
  if (pairedHouse !== undefined) detail.pairedHouse = pairedHouse;
  return detail;
}

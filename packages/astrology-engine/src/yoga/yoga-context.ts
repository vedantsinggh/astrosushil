import { AstroChart } from '../chart/astro-chart.types';
import { VargaType } from '../varga/varga.types';
import { PlanetSymbol, MANDATORY_VEDIC_PLANETS } from '../planets/planet.types';
import { RASHIS } from '../zodiac/rashi';
import { calculatePlanetaryDignity } from '../planets/planetary-dignity';
import { calculateCombustion } from '../planets/combustion';
import { getAspectedSigns } from '../planets/planetary-aspects';
import { getFunctionalNature } from '../planets/functional-nature';
import { VargaCalculator } from '../varga/varga-calculator';
import {
  YogaChartContext,
  YogaPlanetFactors,
  YogaHouseCategory,
  YogaPlanetEvidence,
  YogaHouseEvidence,
  HouseClassification,
  SignExchangeDetail,
  PlanetaryDistributionSummary,
} from './yoga.types';

export class YogaContextBuilder {
  /**
   * Builds complete, cached, strongly-typed YogaChartContext from an AstroChart.
   */
  public static buildContext(
    chart: AstroChart,
    varga: VargaType = 'D1',
    extras: YogaContextExtras = {}
  ): YogaChartContext {
    // 1. Resolve Ascendant
    const ascRashi = chart.ascendant?.rashiIndex || 1;
    const ascLong = chart.ascendant?.longitude || 0.0;
    const ascRashiDef = RASHIS[ascRashi - 1] || RASHIS[0];
    const ascDegreeInRashi = ascLong % 30;

    const ascendantData = {
      rashiIndex: ascRashi,
      rashiName: ascRashiDef.englishName,
      longitude: ascLong,
      degreeInRashi: ascDegreeInRashi,
    };

    // 2. Map Positions for 5-fold temporal dignity calculations
    const planetPositions: Partial<Record<PlanetSymbol, { rashiIndex: number }>> = {};
    for (const sym of MANDATORY_VEDIC_PLANETS) {
      const p = chart.planets[sym];
      if (p) {
        planetPositions[sym] = { rashiIndex: p.rashiIndex };
      }
    }

    const sunLong = chart.planets[PlanetSymbol.SUN]?.longitude || 0.0;

    // 3. Compile Planets Evidence
    const planetsRecord: Partial<Record<PlanetSymbol, YogaPlanetEvidence & { speedLongitude: number }>> = {};
    const houseOccupantsMap = new Map<number, PlanetSymbol[]>();
    for (let h = 1; h <= 12; h++) {
      houseOccupantsMap.set(h, []);
    }

    for (const sym of MANDATORY_VEDIC_PLANETS) {
      const p = chart.planets[sym];
      const pRashi = p ? p.rashiIndex : 1;
      const pLong = p ? p.longitude : 0.0;
      const pDegree = p ? p.degreeInRashi : 0.0;
      const pRetro = p ? p.isRetrograde || false : false;
      const pSpeed = p ? p.speedLongitude || 0.0 : 0.0;

      const house = ((pRashi - ascRashi + 12) % 12) + 1;
      const rashiDef = RASHIS[pRashi - 1] || RASHIS[0];

      const dignity = calculatePlanetaryDignity(sym, pRashi, pDegree, planetPositions);
      const combustionResult = calculateCombustion(sym, pLong, sunLong, pRetro);

      const planetEvidence: YogaPlanetEvidence & { speedLongitude: number } = {
        planet: sym,
        rashiIndex: pRashi,
        rashiName: rashiDef.englishName,
        house,
        longitude: pLong,
        degreeInRashi: pDegree,
        dignity,
        isCombust: combustionResult.isCombust,
        isRetrograde: pRetro,
        speedLongitude: pSpeed,
      };

      planetsRecord[sym] = planetEvidence;
      houseOccupantsMap.get(house)?.push(sym);
    }

    // 4. Compile Houses Evidence & Classifications
    const housesRecord: Record<number, YogaHouseEvidence & { classification: HouseClassification }> = {} as any;
    const houseLordsRecord: Record<number, PlanetSymbol> = {} as any;
    const lordHousesRecord: Record<PlanetSymbol, number[]> = {
      [PlanetSymbol.SUN]: [],
      [PlanetSymbol.MOON]: [],
      [PlanetSymbol.MARS]: [],
      [PlanetSymbol.MERCURY]: [],
      [PlanetSymbol.JUPITER]: [],
      [PlanetSymbol.VENUS]: [],
      [PlanetSymbol.SATURN]: [],
      [PlanetSymbol.RAHU]: [],
      [PlanetSymbol.KETU]: [],
      [PlanetSymbol.URANUS]: [],
      [PlanetSymbol.NEPTUNE]: [],
      [PlanetSymbol.PLUTO]: [],
    };

    for (let h = 1; h <= 12; h++) {
      const hRashiIndex = ((ascRashi - 1 + (h - 1)) % 12) + 1;
      const hRashiDef = RASHIS[hRashiIndex - 1];
      const lordSymbol = hRashiDef.ruler as PlanetSymbol;

      const classification: HouseClassification = {
        isKendra: h === 1 || h === 4 || h === 7 || h === 10,
        isTrikona: h === 1 || h === 5 || h === 9,
        isDusthana: h === 6 || h === 8 || h === 12,
        isUpachaya: h === 3 || h === 6 || h === 10 || h === 11,
        isPanaphara: h === 2 || h === 5 || h === 8 || h === 11,
        isApoklima: h === 3 || h === 6 || h === 9 || h === 12,
        isMaraka: h === 2 || h === 7,
      };

      const occupants = houseOccupantsMap.get(h) || [];

      housesRecord[h] = {
        houseNumber: h,
        rashiIndex: hRashiIndex,
        rashiName: hRashiDef.englishName,
        lord: lordSymbol,
        occupyingPlanets: occupants,
        classification,
      };

      houseLordsRecord[h] = lordSymbol;
      lordHousesRecord[lordSymbol]?.push(h);
    }

    // 5. Inter-planetary Conjunctions
    const conjunctionsMap = new Map<PlanetSymbol, PlanetSymbol[]>();
    for (const sym of MANDATORY_VEDIC_PLANETS) {
      const pRashi = planetsRecord[sym]?.rashiIndex;
      const conjuncts = MANDATORY_VEDIC_PLANETS.filter(
        (other) => other !== sym && planetsRecord[other]?.rashiIndex === pRashi
      );
      conjunctionsMap.set(sym, conjuncts);
    }

    // 6. Graha Drishti between the seven grahas (whole-sign; BPHS ch. 26): every graha aspects
    //    the 7th; Mars also the 4th/8th, Jupiter the 5th/9th, Saturn the 3rd/10th.
    //    Mutual = each aspects the other's sign. The 7th-7th case keeps its original label.
    const mutualAspects: Array<{ planetA: PlanetSymbol; planetB: PlanetSymbol; aspectType: string }> = [];
    const grahaAspects: Array<{ from: PlanetSymbol; to: PlanetSymbol; aspectType: string }> = [];
    const planetsList = MANDATORY_VEDIC_PLANETS.filter((p) => p !== PlanetSymbol.RAHU && p !== PlanetSymbol.KETU);

    const aspectTypeOf = (from: PlanetSymbol, to: PlanetSymbol): string | undefined => {
      const src = planetsRecord[from]!.rashiIndex;
      const dst = planetsRecord[to]!.rashiIndex;
      return getAspectedSigns(from, src).find((a) => a.rashiIndex === dst)?.aspectType;
    };

    for (const from of planetsList) {
      for (const to of planetsList) {
        if (from === to) continue;
        const t = aspectTypeOf(from, to);
        if (t) grahaAspects.push({ from, to, aspectType: t });
      }
    }

    for (let i = 0; i < planetsList.length; i++) {
      for (let j = i + 1; j < planetsList.length; j++) {
        const pA = planetsList[i];
        const pB = planetsList[j];
        const aToB = aspectTypeOf(pA, pB);
        const bToA = aspectTypeOf(pB, pA);
        if (!aToB || !bToA) continue;
        if (aToB === 'OPPOSITION_7TH' && bToA === 'OPPOSITION_7TH') {
          mutualAspects.push({ planetA: pA, planetB: pB, aspectType: '7TH_MUTUAL_OPPOSITION' });
        } else {
          mutualAspects.push({ planetA: pA, planetB: pB, aspectType: `${pA}:${aToB}|${pB}:${bToA}` });
        }
      }
    }

    // 7. Sign Exchanges (Parivartana)
    const signExchanges: SignExchangeDetail[] = [];
    const classicalPlanets = [
      PlanetSymbol.SUN,
      PlanetSymbol.MOON,
      PlanetSymbol.MARS,
      PlanetSymbol.MERCURY,
      PlanetSymbol.JUPITER,
      PlanetSymbol.VENUS,
      PlanetSymbol.SATURN,
    ];

    for (let i = 0; i < classicalPlanets.length; i++) {
      for (let j = i + 1; j < classicalPlanets.length; j++) {
        const pA = classicalPlanets[i];
        const pB = classicalPlanets[j];

        const rashiA = planetsRecord[pA]!.rashiIndex;
        const rashiB = planetsRecord[pB]!.rashiIndex;

        const rulerOfA = RASHIS[rashiA - 1].ruler as PlanetSymbol;
        const rulerOfB = RASHIS[rashiB - 1].ruler as PlanetSymbol;

        // Planet A is in sign ruled by B, and Planet B is in sign ruled by A
        if (rulerOfA === pB && rulerOfB === pA && pA !== pB) {
          const houseA = planetsRecord[pA]!.house;
          const houseB = planetsRecord[pB]!.house;

          let exchangeType: 'MAHA' | 'DAINYA' | 'KHALA' = 'MAHA';
          if (houseA === 6 || houseA === 8 || houseA === 12 || houseB === 6 || houseB === 8 || houseB === 12) {
            exchangeType = 'DAINYA';
          } else if (houseA === 3 || houseB === 3) {
            exchangeType = 'KHALA';
          } else {
            exchangeType = 'MAHA';
          }

          signExchanges.push({
            planetA: pA,
            planetB: pB,
            signA: rashiA,
            signB: rashiB,
            houseA,
            houseB,
            exchangeType,
          });
        }
      }
    }

    // 8. Planetary Distribution (for Nabhasa Yogas - evaluating 7 classical planets Sun..Saturn)
    let movableCount = 0;
    let fixedCount = 0;
    let dualCount = 0;
    let kendraCount = 0;
    let panapharaCount = 0;
    let apoklimaCount = 0;
    const occupiedSignsSet = new Set<number>();
    const occupiedHousesSet = new Set<number>();

    for (const sym of classicalPlanets) {
      const p = planetsRecord[sym];
      if (!p) continue;

      const rDef = RASHIS[p.rashiIndex - 1];
      if (rDef.modality === 'CHARA') movableCount++;
      else if (rDef.modality === 'STHIRA') fixedCount++;
      else if (rDef.modality === 'DVISVABHAVA') dualCount++;

      const h = p.house;
      if (h === 1 || h === 4 || h === 7 || h === 10) kendraCount++;
      else if (h === 2 || h === 5 || h === 8 || h === 11) panapharaCount++;
      else if (h === 3 || h === 6 || h === 9 || h === 12) apoklimaCount++;

      occupiedSignsSet.add(p.rashiIndex);
      occupiedHousesSet.add(h);
    }

    const distribution: PlanetaryDistributionSummary = {
      movableCount,
      fixedCount,
      dualCount,
      kendraCount,
      panapharaCount,
      apoklimaCount,
      occupiedSignsCount: occupiedSignsSet.size,
      occupiedHousesCount: occupiedHousesSet.size,
      occupiedSigns: Array.from(occupiedSignsSet).sort((a, b) => a - b),
      occupiedHouses: Array.from(occupiedHousesSet).sort((a, b) => a - b),
    };

    return {
      chart,
      varga,
      ascendant: ascendantData,
      planets: planetsRecord as Record<PlanetSymbol, YogaPlanetEvidence & { speedLongitude: number }>,
      houses: housesRecord,
      houseLords: houseLordsRecord,
      lordHouses: lordHousesRecord,
      moonPlanet: planetsRecord[PlanetSymbol.MOON]!,
      sunPlanet: planetsRecord[PlanetSymbol.SUN]!,
      conjunctions: conjunctionsMap,
      mutualAspects,
      grahaAspects,
      signExchanges,
      distribution,
      planetFactors: buildPlanetFactors(chart, varga, planetsRecord, housesRecord, ascRashi, sunLong, extras),
    };
  }
}

/** Optional inputs for planet factors. */
export interface YogaContextExtras {
  /** Shadbala ratio (total / BPHS ch. 27 requirement) and rupas per planet. */
  shadbala?: Partial<Record<PlanetSymbol, { ratio: number; totalRupas?: number; requiredRupas?: number }>>;
}

const FACTOR_VARGA_CALCULATOR = new VargaCalculator();

export function houseCategoriesOf(c: HouseClassification): YogaHouseCategory[] {
  const out: YogaHouseCategory[] = [];
  if (c.isKendra) out.push('KENDRA');
  if (c.isTrikona) out.push('TRIKONA');
  if (c.isDusthana) out.push('DUSTHANA');
  if (c.isUpachaya) out.push('UPACHAYA');
  if (c.isPanaphara) out.push('PANAPHARA');
  if (c.isApoklima) out.push('APOKLIMA');
  if (c.isMaraka) out.push('MARAKA');
  return out;
}

function buildPlanetFactors(
  chart: AstroChart,
  varga: VargaType,
  planets: Partial<Record<PlanetSymbol, YogaPlanetEvidence & { speedLongitude: number }>>,
  houses: Record<number, YogaHouseEvidence & { classification: HouseClassification }>,
  ascRashi: number,
  sunLong: number,
  extras: YogaContextExtras
): Partial<Record<PlanetSymbol, YogaPlanetFactors>> {
  const out: Partial<Record<PlanetSymbol, YogaPlanetFactors>> = {};
  const isD1 = varga === 'D1';

  // D9 placements (only meaningful when the chart's longitudes are D1 longitudes).
  const d9Signs: Partial<Record<PlanetSymbol, { rashiIndex: number }>> = {};
  const d9Degrees: Partial<Record<PlanetSymbol, number>> = {};
  if (isD1) {
    for (const sym of MANDATORY_VEDIC_PLANETS) {
      const p = chart.planets[sym];
      if (!p || typeof p.longitude !== 'number') continue;
      d9Signs[sym] = { rashiIndex: FACTOR_VARGA_CALCULATOR.calculateLongitudeVarga(p.longitude, 'D9') };
      d9Degrees[sym] = FACTOR_VARGA_CALCULATOR.calculateDegreeInVarga(p.longitude, 'D9');
    }
  }

  for (const sym of MANDATORY_VEDIC_PLANETS) {
    const p = planets[sym];
    if (!p) continue;
    const comb = calculateCombustion(sym, p.longitude, sunLong, p.isRetrograde);
    const noCombustion = sym === PlanetSymbol.SUN || sym === PlanetSymbol.RAHU || sym === PlanetSymbol.KETU;
    const f: YogaPlanetFactors = {
      planet: sym,
      rashiIndex: p.rashiIndex,
      house: p.house,
      houseCategories: houseCategoriesOf(houses[p.house].classification),
      dignity: p.dignity,
      isRetrograde: p.isRetrograde,
      combustion: noCombustion
        ? { isCombust: false }
        : {
            isCombust: comb.isCombust,
            distanceFromSun: Number(comb.angularSeparation.toFixed(4)),
            orbDegrees: comb.threshold,
          },
      lordships: [],
    };
    for (let h = 1; h <= 12; h++) if (houses[h].lord === sym) f.lordships.push(h);
    if (isD1) {
      f.functionalNature = getFunctionalNature(ascRashi, sym).nature;
      const d9 = d9Signs[sym];
      if (d9) {
        f.d9 = {
          rashiIndex: d9.rashiIndex,
          dignity: calculatePlanetaryDignity(sym, d9.rashiIndex, d9Degrees[sym] ?? 0, d9Signs),
          vargottama: d9.rashiIndex === p.rashiIndex,
        };
      }
    }
    const sb = extras.shadbala?.[sym];
    if (sb) f.shadbala = { ...sb };
    out[sym] = f;
  }
  return out;
}

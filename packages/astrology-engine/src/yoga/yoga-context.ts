import { AstroChart } from '../chart/astro-chart.types';
import { VargaType } from '../varga/varga.types';
import { PlanetSymbol, MANDATORY_VEDIC_PLANETS } from '../planets/planet.types';
import { RASHIS } from '../zodiac/rashi';
import { calculatePlanetaryDignity } from '../planets/planetary-dignity';
import { calculateCombustion } from '../planets/combustion';
import {
  YogaChartContext,
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
  public static buildContext(chart: AstroChart, varga: VargaType = 'D1'): YogaChartContext {
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

    // 6. Mutual Aspects (Graha Drishti)
    const mutualAspects: Array<{ planetA: PlanetSymbol; planetB: PlanetSymbol; aspectType: string }> = [];
    const planetsList = MANDATORY_VEDIC_PLANETS.filter((p) => p !== PlanetSymbol.RAHU && p !== PlanetSymbol.KETU);

    for (let i = 0; i < planetsList.length; i++) {
      for (let j = i + 1; j < planetsList.length; j++) {
        const pA = planetsList[i];
        const pB = planetsList[j];
        const hA = planetsRecord[pA]!.house;
        const hB = planetsRecord[pB]!.house;

        // 7th mutual aspect (6 houses apart)
        const distAtoB = ((hB - hA + 12) % 12);
        const distBtoA = ((hA - hB + 12) % 12);

        if (distAtoB === 6 && distBtoA === 6) {
          mutualAspects.push({ planetA: pA, planetB: pB, aspectType: '7TH_MUTUAL_OPPOSITION' });
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
      signExchanges,
      distribution,
    };
  }
}

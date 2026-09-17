import { PlanetSymbol } from '../planets/planet.types';

export interface CalculatedSpecialPoint {
  name: string;
  sanskritName: string;
  longitude: number;
  rashiIndex: number;
  rashiName: string;
  degreeInRashi: number;
  house: number;
  nakshatraIndex: number;
  nakshatraName: string;
  pada: number;
  nakshatraLord: PlanetSymbol;
  formula: string;
  category: 'UPAGRAHA' | 'SPECIAL_LAGNA' | 'ARISHTA_POINT' | 'YOGI_POINT' | 'CHAMBER_POINT';
}

export interface UpagrahasReport {
  dhooma: CalculatedSpecialPoint;
  vyatipata: CalculatedSpecialPoint;
  parivesha: CalculatedSpecialPoint;
  indrachapa: CalculatedSpecialPoint;
  upaketu: CalculatedSpecialPoint;
  gulika: CalculatedSpecialPoint;
  mandi: CalculatedSpecialPoint;
}

export interface SpecialLagnasReport {
  bhavaLagna: CalculatedSpecialPoint;
  horaLagna: CalculatedSpecialPoint;
  ghatikaLagna: CalculatedSpecialPoint;
  induLagna: CalculatedSpecialPoint;
  pranapadaLagna: CalculatedSpecialPoint;
  varnadaLagna: CalculatedSpecialPoint;
}

export interface ArishtaPointsReport {
  sixtyFourthNavamshaMoon: CalculatedSpecialPoint;
  sixtyFourthNavamshaAscendant: CalculatedSpecialPoint;
  twentySecondDrekkanaAscendant: CalculatedSpecialPoint;
  twentySecondDrekkanaMoon: CalculatedSpecialPoint;
  sarpaDreshkanaPlacements: {
    planet: PlanetSymbol;
    isSarpaDreshkana: boolean;
    decanateIndex: number; // 1, 2, or 3
    signIndex: number;
  }[];
}

export interface YogiPointDetails {
  yogiPoint: CalculatedSpecialPoint;
  yogiPlanet: PlanetSymbol;
  yogiNakshatra: string;
  avyogiPoint: CalculatedSpecialPoint;
  avyogiPlanet: PlanetSymbol;
  avyogiNakshatra: string;
  duplicateYogiPlanet: PlanetSymbol; // Sahayogi
}

export interface MrityuBhagaStatus {
  planet: PlanetSymbol | 'ASCENDANT';
  exactFatalDegree: number;
  currentDegreeInRashi: number;
  deltaDegree: number;
  isWithinOrb: boolean;
  orbDegrees: number;
  severity: 'EXACT' | 'CRITICAL' | 'MODERATE' | 'NONE';
}

export interface MrityuBhagaReport {
  points: MrityuBhagaStatus[];
  hasAnyAfflicted: boolean;
  afflictedPlanets: (PlanetSymbol | 'ASCENDANT')[];
}

export interface SpecialPointsReport {
  upagrahas: UpagrahasReport;
  specialLagnas: SpecialLagnasReport;
  arishtaPoints: ArishtaPointsReport;
  yogiPoints: YogiPointDetails;
  mrityuBhaga: MrityuBhagaReport;
}

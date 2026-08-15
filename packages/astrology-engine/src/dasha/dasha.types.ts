import { PlanetSymbol } from '../planets/planet.types';

export interface DashaPeriod {
  lord: PlanetSymbol;
  startDateIso: string;
  endDateIso: string;
  durationYears: number;
  subPeriods?: DashaPeriod[];
}

export interface VimshottariDashaTree {
  moonNakshatraIndex: number;
  balanceAtBirthYears: number;
  mahadashas: DashaPeriod[];
}

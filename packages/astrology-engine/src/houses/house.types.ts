import { HouseSystem } from '../configuration/astrology-config';
import { PlanetSymbol } from '../planets/planet.types';

export interface CalculatedPoint {
  name: string;           // e.g. "Ascendant" / "Lagna" or "MC" / "Midheaven"
  longitude: number;      // Absolute degree [0.0, 360.0)
  rashiIndex: number;     // Sign index (1 to 12)
  degreeInRashi: number;  // Relative degree in sign [0.0, 30.0)
  nakshatraIndex: number; // Nakshatra index (1 to 27)
  pada: number;           // Pada (1 to 4)
  nakshatraLord: PlanetSymbol;
}

export interface HousePlacement {
  houseNumber: number;   // 1 to 12
  cuspLongitude: number; // House cusp degree [0.0, 360.0)
  startLongitude: number;// Inclusive start degree
  endLongitude: number;  // Exclusive end degree
  rashiIndex: number;    // Sign index containing cusp
  rashiName: string;
}

export interface HouseSystemProvider {
  getSystemName(): HouseSystem;
  calculateHouses(
    ascendantLongitude: number,
    latitude: number,
    julianDayUT: number
  ): HousePlacement[];
}

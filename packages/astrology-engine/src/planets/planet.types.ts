export enum PlanetSymbol {
  SUN = 'SUN',
  MOON = 'MOON',
  MARS = 'MARS',
  MERCURY = 'MERCURY',
  JUPITER = 'JUPITER',
  VENUS = 'VENUS',
  SATURN = 'SATURN',
  RAHU = 'RAHU',
  KETU = 'KETU',
  URANUS = 'URANUS',
  NEPTUNE = 'NEPTUNE',
  PLUTO = 'PLUTO',
}

export const MANDATORY_VEDIC_PLANETS = [
  PlanetSymbol.SUN,
  PlanetSymbol.MOON,
  PlanetSymbol.MARS,
  PlanetSymbol.MERCURY,
  PlanetSymbol.JUPITER,
  PlanetSymbol.VENUS,
  PlanetSymbol.SATURN,
  PlanetSymbol.RAHU,
  PlanetSymbol.KETU,
] as const;

export interface RawPlanetaryCoordinates {
  planet: PlanetSymbol;
  longitude: number;      // Ecliptic longitude in decimal degrees [0.0, 360.0)
  latitude: number;       // Ecliptic latitude in decimal degrees
  distanceAU: number;     // Distance from reference point in Astronomical Units
  speedLongitude: number; // Daily longitude velocity in degrees per day (negative = retrograde)
  isRetrograde: boolean;
}

export interface PlanetPosition extends RawPlanetaryCoordinates {
  rashiIndex: number;     // Sign index (1 = Aries / Mesha to 12 = Pisces / Meena)
  rashiName: string;      // English/Sanskrit name (e.g. "Mesha")
  degreeInRashi: number;  // Position inside sign [0.0, 30.0)
  nakshatraIndex: number; // Nakshatra index (1 = Ashwini to 27 = Revati)
  nakshatraName: string;  // Nakshatra name (e.g. "Ashwini")
  pada: number;           // Quarter index (1, 2, 3, or 4)
  nakshatraLord: PlanetSymbol; // Planetary ruler of the nakshatra
}

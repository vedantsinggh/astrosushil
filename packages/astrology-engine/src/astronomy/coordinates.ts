import { RawPlanetaryCoordinates } from '../planets/planet.types';

export interface EclipticVector {
  longitude: number; // Ecliptic longitude in decimal degrees [0.0, 360.0)
  latitude: number;  // Ecliptic latitude in decimal degrees
  distanceAU: number;// Distance in AU
}

export interface EquatorialVector {
  rightAscension: number; // Right Ascension in decimal degrees [0.0, 360.0)
  declination: number;    // Declination in decimal degrees
  distanceAU: number;
}

export function rawCoordsToEclipticVector(raw: RawPlanetaryCoordinates): EclipticVector {
  return {
    longitude: raw.longitude,
    latitude: raw.latitude,
    distanceAU: raw.distanceAU,
  };
}

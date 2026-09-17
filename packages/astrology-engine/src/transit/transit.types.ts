import { PlanetSymbol } from '../planets/planet.types';
import { AspectType } from '../planets/planetary-intelligence.types';
import { VargaType } from '../varga/varga.types';
import { AshtakavargaContributor } from '../ashtakavarga/ashtakavarga.types';

export interface TransitLocationInput {
  latitude: number;
  longitude: number;
  timezone: string;
  placeName?: string;
}

export interface TransitPlanetPosition {
  planet: PlanetSymbol;
  longitude: number;
  latitude: number;
  speedLongitude: number;
  isRetrograde: boolean;
  isCombust: boolean;
  rashiIndex: number; // 1 to 12
  rashiName: string;
  rashiLord: PlanetSymbol;
  degreeInRashi: number; // [0.0, 30.0)
  house: number; // 1 to 12
  nakshatraIndex: number; // 1 to 27
  nakshatraName: string;
  nakshatraLord: PlanetSymbol;
  pada: number; // 1 to 4
  degreeInNakshatra: number; // [0.0, 13.333333333333334)
}

export interface TransitAscendant {
  longitude: number;
  rashiIndex: number;
  rashiName: string;
  rashiLord: PlanetSymbol;
  degreeInRashi: number;
  nakshatraIndex: number;
  nakshatraName: string;
  pada: number;
}

export interface TransitHouse {
  houseNumber: number; // 1 to 12
  rashiIndex: number;
  rashiName: string;
  lord: PlanetSymbol;
  startDegree: number;
  occupyingPlanets: PlanetSymbol[];
}

export interface TransitChart {
  calculationVersion: string;
  transitTime: {
    utcIso: string;
    localIso: string;
    julianDayUT: number;
    timezone: string;
  };
  location: TransitLocationInput;
  ascendant: TransitAscendant;
  planets: Record<PlanetSymbol, TransitPlanetPosition>;
  houses: TransitHouse[];
}

export interface TransitToNatalPlanetRelationship {
  transitPlanet: PlanetSymbol;
  natalPlanet: PlanetSymbol;
  transitLongitude: number;
  natalLongitude: number;
  angularSeparation: number; // [0.0, 180.0]
  signDistance: number; // 1 to 12
  houseDistance: number; // 1 to 12
  relationship: string;
}

export interface TransitToNatalMoonRelationship {
  transitPlanet: PlanetSymbol;
  transitSignIndex: number;
  transitSignName: string;
  natalMoonSignIndex: number;
  natalMoonSignName: string;
  signDistance: number; // 1 to 12
  houseFromMoon: number; // 1 to 12
  transitNakshatra: string;
  bavScore?: number;
}

export interface TransitToNatalLagnaRelationship {
  transitPlanet: PlanetSymbol;
  transitSignIndex: number;
  transitSignName: string;
  natalLagnaSignIndex: number;
  natalLagnaSignName: string;
  signDistance: number; // 1 to 12
  houseFromLagna: number; // 1 to 12
  angularSeparation: number;
}

export interface TransitAspectDetail {
  sourceTransitPlanet: PlanetSymbol;
  targetType: 'NATAL_PLANET' | 'NATAL_LAGNA' | 'NATAL_HOUSE';
  targetIdentifier: string;
  aspectType: AspectType;
  angleDegrees: number;
  isFullDrishti: boolean;
}

export interface TransitAshtakavargaDetail {
  planet: PlanetSymbol;
  transitSignIndex: number;
  transitSignName: string;
  bavPoints: number;
  savPoints: number;
  isBavFavorable: boolean; // BAV >= 4
  isSavFavorable: boolean; // SAV >= 28
  contributorPoints?: Record<string, number>;
}

export interface GocharaKakshaDetail {
  transitPlanet: PlanetSymbol;
  transitSignIndex: number;
  transitSignName: string;
  degreeInSign: number;
  kakshaIndex: number; // 1 to 8
  kakshaRuler: AshtakavargaContributor;
  startDegree: number;
  endDegree: number;
  hasNatalBindu: boolean;
  description: string;
}

export interface TransitVargaDetail {
  vargaType: VargaType;
  transitPlanet: PlanetSymbol;
  transitVargaRashiIndex: number;
  transitVargaRashiName: string;
  natalVargaRashiIndex: number;
  natalVargaRashiName: string;
  isSameVargaSign: boolean;
}

export interface TransitIngressEvent {
  eventType: 'SIGN_INGRESS' | 'NAKSHATRA_INGRESS';
  planet: PlanetSymbol;
  timestampIso: string;
  julianDayUT: number;
  fromSign?: { index: number; name: string };
  toSign?: { index: number; name: string };
  fromNakshatra?: { index: number; name: string };
  toNakshatra?: { index: number; name: string };
  pada?: number;
  longitude: number;
}

export interface TransitStationEvent {
  eventType: 'RETROGRADE_STATION' | 'DIRECT_STATION';
  planet: PlanetSymbol;
  timestampIso: string;
  julianDayUT: number;
  longitude: number;
  rashiIndex: number;
  rashiName: string;
}

export type TransitTimelineEvent = TransitIngressEvent | TransitStationEvent;

export interface TransitSnapshot {
  calculationVersion: string;
  transitChart: TransitChart;
  transitToLagna?: TransitToNatalLagnaRelationship[];
  transitToMoon?: TransitToNatalMoonRelationship[];
  transitToNatalPlanets?: TransitToNatalPlanetRelationship[];
  aspectsToNatal?: TransitAspectDetail[];
  ashtakavargaTransit?: TransitAshtakavargaDetail[];
  gocharaKakshas?: GocharaKakshaDetail[];
  vargaTransits?: TransitVargaDetail[];
}

export interface TransitTimeline {
  calculationVersion: string;
  startDateIso: string;
  endDateIso: string;
  planets: PlanetSymbol[];
  eventCount: number;
  events: TransitTimelineEvent[];
}


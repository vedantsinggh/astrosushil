export enum ReportType {
  KUNDLI = 'KUNDLI',
  PLANETARY_SUMMARY = 'PLANETARY_SUMMARY',
  // Future report type place-holders
  PERSONALITY = 'PERSONALITY',
  CAREER = 'CAREER',
  RELATIONSHIP = 'RELATIONSHIP',
  RASHI_BHAVISHYA = 'RASHI_BHAVISHYA',
  VASTU = 'VASTU',
}

export interface ReportProfileDto {
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  placeName: string | null;
  timezone: string;
}

export interface ReportConfigDto {
  zodiacType: string;
  ayanamsa: string;
  houseSystem: string;
  nodeCalculation: string;
}

export interface ReportAscendantDto {
  sign: string;
  degree: number;
  nakshatra: string;
  pada: number;
}

export interface ReportPlanetDto {
  planet: string;
  sign: string;
  degree: number;
  house: number;
  nakshatra: string;
  pada: number;
  isRetrograde: boolean;
}

export interface ReportHouseDto {
  houseNumber: number;
  sign: string;
  planetsPresent: string[];
}

export interface ReportNakshatraDto {
  birthNakshatra: string;
  pada: number;
  rulingPlanet: string;
  associatedInfo: string;
}

export interface ReportSectionDto {
  id: string;
  title: string;
  type: 'TEXT' | 'KEY_VALUE' | 'LIST';
  content: string;
  keyValues?: Record<string, string>;
  listItems?: string[];
}

export interface StructuredReportModel {
  version: string;
  type: ReportType;
  title: string;
  generatedAt: string;
  profile: ReportProfileDto;
  configuration: ReportConfigDto;
  ascendant: ReportAscendantDto;
  planets: ReportPlanetDto[];
  houses: ReportHouseDto[];
  nakshatra: ReportNakshatraDto;
  sections: ReportSectionDto[];
}

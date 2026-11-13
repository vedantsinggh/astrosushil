/**
 * Shared Report-Engine Foundation Types
 * Authoritative, typed contract for all 13 reference-level Astro Sushil reports.
 */

export interface AuthoritativeCalculationConfig {
  zodiacType: 'SIDEREAL';
  ayanamsa: 'LAHIRI';
  houseSystem: 'WHOLE_SIGN';
  nodeCalculation: 'MEAN_NODE';
  planetaryCalculationMode: 'GEOCENTRIC';
}

export interface VerifiedBirthDetails {
  name: string;
  dateOfBirth: string; // YYYY-MM-DD
  timeOfBirth: string; // HH:mm:ss
  placeName: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface VerifiedAscendantEvidence {
  sign: string;
  signIndex: number; // 1-12
  degree: number; // 0.0 to < 30.0
  nakshatra: string;
  pada: number; // 1-4
  lord: string;
}

export interface VerifiedPlanetEvidence {
  planet: string;
  sign: string;
  signIndex: number; // 1-12
  degree: number; // 0.0 to < 30.0
  house: number; // 1-12
  nakshatra: string;
  pada: number; // 1-4
  isRetrograde: boolean;
  speed?: number;
  dignity?: 'EXALTED' | 'MOOLATRIKONA' | 'OWN_SIGN' | 'FRIENDLY' | 'NEUTRAL' | 'ENEMY' | 'DEBILITATED';
}

export interface VerifiedHouseEvidence {
  houseNumber: number; // 1-12
  sign: string;
  signIndex: number; // 1-12
  degree: number;
  lord: string;
  occupants: string[];
}

export interface VerifiedDashaPeriodEvidence {
  planet: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
}

export interface VerifiedDashaEvidence {
  currentMahadasha: string;
  currentAntardasha: string;
  currentPratyantardasha?: string;
  startDate: string;
  endDate: string;
  timeline?: VerifiedDashaPeriodEvidence[];
}

export interface VerifiedTransitEvidence {
  planet: string;
  sign: string;
  degree: number;
  houseFromLagna: number;
  houseFromMoon: number;
  isRetrograde: boolean;
  status?: string;
}

export interface VerifiedAstrologyEvidence {
  snapshotId: string;
  calculationVersion: string;
  providerName: string;
  calculationTimestampIso: string;
  config: AuthoritativeCalculationConfig;
  birthDetails: VerifiedBirthDetails;
  ascendant: VerifiedAscendantEvidence;
  planets: VerifiedPlanetEvidence[];
  houses: VerifiedHouseEvidence[];
  dashas?: VerifiedDashaEvidence;
  transits?: VerifiedTransitEvidence[];
  ashtakavarga?: Record<string, number>;
  domainFacts?: Record<string, Array<{ source: string; factText: string; strength: string }>>;
}

export type ReportSectionStatus = 'VERIFIED' | 'DERIVED' | 'UNAVAILABLE';

export interface ReportTableRow {
  cells: string[];
}

export interface ReportTable {
  id?: string;
  title?: string;
  headers: string[];
  rows: ReportTableRow[];
  colWidths?: number[];
}

export interface ReportSectionSubsection {
  id: string;
  title: string;
  content: string;
  status: ReportSectionStatus;
  keyTakeaways?: string[];
  table?: ReportTable;
}

export interface ReportSection {
  id: string;
  title: string;
  category: string;
  order: number;
  isRequired: boolean;
  status: ReportSectionStatus;
  summary: string;
  content?: string;
  subsections?: ReportSectionSubsection[];
  tables?: ReportTable[];
  evidenceRefs: string[];
  unavailableReason?: string;
}

export interface SharedReportMetadata {
  reportId: string;
  reportType: string;
  title: string;
  subtitle?: string;
  version: string;
  generationTimestampIso: string;
  clientName: string;
  orderId?: string;
  expectedDeliveryAt?: string;
}

export interface SharedReportDocument {
  metadata: SharedReportMetadata;
  evidence: VerifiedAstrologyEvidence;
  sections: ReportSection[];
  authorMessage: {
    title: string;
    body: string;
    authorName: string;
    designation: string;
  };
  methodologyNote: {
    title: string;
    body: string;
  };
  legalDisclaimer: {
    title: string;
    body: string;
  };
}

export const STANDARD_AUTHOR_MESSAGE = {
  title: 'A Personal Message from Sushil Kumaar Singh',
  body:
    'Vedic Astrology is not fatalism; it is the sacred science of self-illumination (Jyotisha). ' +
    'The planetary patterns revealed at your moment of birth reflect karmic momentum, inherent aptitudes, ' +
    'and cyclical opportunities. Use this dossier not as an immutable verdict, but as a navigational blueprint ' +
    'to optimize your decisions, align your effort with cosmic timing, and realize your highest potential.',
  authorName: 'Sushil Kumaar Singh',
  designation: 'Master Astrologer & Founder, Astro Sushil',
};

export const STANDARD_METHODOLOGY_NOTE = {
  title: 'Astrological Methodology & Ephemeris Standards',
  body:
    'All astronomical and planetary computations in this document are 100% deterministic, rule-based, and ' +
    'auditable. Placements are calculated using the Sidereal Zodiac with the authoritative Lahiri (Chitra Paksha) ' +
    'Ayanamsa, Whole Sign House System, Mean Lunar Node calculation, and Geocentric positions. ' +
    'Interpretations are strictly grounded in classical Parashari, Jaimini, and Gupta Nandi Nadi principles. ' +
    'No artificial intelligence is permitted to estimate, extrapolate, or fabricate planetary positions or degrees.',
};

export const STANDARD_LEGAL_DISCLAIMER = {
  title: 'Authoritative Disclaimer & Terms of Guidance',
  body:
    'This report is prepared solely for educational, spiritual, and self-reflective purposes. ' +
    'Astrological interpretations represent probabilistic karmic tendencies and must never substitute for ' +
    'certified professional advice in medical, legal, psychological, or financial matters. Astro Sushil and its ' +
    'analysts assume no legal liability for personal decisions or outcomes resulting from the guidance contained herein. ' +
    'All birth and profile data are protected under strict privacy protocols.',
};

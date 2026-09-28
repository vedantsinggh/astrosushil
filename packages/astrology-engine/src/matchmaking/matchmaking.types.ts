import { PlanetSymbol } from '../planets/planet.types';

export type VarnaGrade = 'BRAHMIN' | 'KSHATRIYA' | 'VAISHYA' | 'SHUDRA';
export type VashyaType = 'CHATUSHPADA' | 'MANAVA' | 'JALACHARA' | 'VANACHARA' | 'KEETA';

export type TaraCategory =
  | 'JANMA'
  | 'SAMPAT'
  | 'VIPAT'
  | 'KSHEMA'
  | 'PRATYAK'
  | 'SADHANA'
  | 'NAIDHANA'
  | 'MITRA'
  | 'PARAMA_MITRA';

export type YoniAnimal =
  | 'HORSE'
  | 'ELEPHANT'
  | 'SHEEP'
  | 'SERPENT'
  | 'DOG'
  | 'CAT'
  | 'RAT'
  | 'COW'
  | 'BUFFALO'
  | 'TIGER'
  | 'DEER'
  | 'MONKEY'
  | 'MONGOOSE'
  | 'LION';

export type YoniGender = 'MALE' | 'FEMALE';

export type YoniRelationship =
  | 'SWAYONI'
  | 'FRIEND'
  | 'NEUTRAL'
  | 'ENEMY'
  | 'SWORN_ENEMY';

export type GanaType = 'DEVA' | 'MANUSHYA' | 'RAKSHASA';
export type NadiType = 'ADI' | 'MADHYA' | 'ANTYA';

export type BhakootDistance =
  | '1/1'
  | '2/12'
  | '3/11'
  | '4/10'
  | '5/9'
  | '6/8'
  | '7/7';

export type BhakootCondition = 'AUSPICIOUS' | 'DOSHA';
export type NadiCondition = 'DIFFERENT_NADI' | 'SAME_NADI_DOSHA';

export type ManglikSeverity = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
export type ManglikComparisonVerdict =
  | 'BOTH_NON_MANGLIK'
  | 'BOTH_MANGLIK'
  | 'MANGLIK_MISMATCH';

/**
 * Derived Moon and astrological placement facts for one person.
 */
export interface DerivedMoonProfile {
  personLabel?: string;
  moonLongitude: number;
  rashiIndex: number;
  rashiName: string;
  rashiLord: PlanetSymbol;
  nakshatraIndex: number;
  nakshatraName: string;
  pada: number;
  nakshatraLord: PlanetSymbol;
  varna: VarnaGrade;
  varnaRank: number; // Brahmin=4, Kshatriya=3, Vaishya=2, Shudra=1
  vashya: VashyaType;
  gana: GanaType;
  yoni: {
    animal: YoniAnimal;
    gender: YoniGender;
  };
  nadi: NadiType;
}

/**
 * Base interface for an individual Koota score with calculation evidence.
 */
export interface KootaBaseResult {
  name: string;
  sanskritName: string;
  maxPoints: number;
  obtainedPoints: number;
  description: string;
  isSymmetric: boolean;
  evidence: Record<string, any>;
}

export interface VarnaResult extends KootaBaseResult {
  name: 'Varna';
  personAVarna: VarnaGrade;
  personBVarna: VarnaGrade;
  personARank: number;
  personBRank: number;
}

export interface VashyaResult extends KootaBaseResult {
  name: 'Vashya';
  personARashi: string;
  personBRashi: string;
  personAVashya: VashyaType;
  personBVashya: VashyaType;
  relationship: string;
}

export interface TaraDetail {
  nakshatraIndex: number;
  nakshatraName: string;
  count: number;
  taraIndex: number; // 1 to 9
  taraName: TaraCategory;
  isAuspicious: boolean;
}

export interface TaraResult extends KootaBaseResult {
  name: 'Tara';
  personANakshatra: string;
  personBNakshatra: string;
  personAToB: TaraDetail;
  personBToA: TaraDetail;
}

export interface YoniResult extends KootaBaseResult {
  name: 'Yoni';
  personAYoni: YoniAnimal;
  personBYoni: YoniAnimal;
  relationshipCategory: YoniRelationship;
}

export interface GrahaMaitriResult extends KootaBaseResult {
  name: 'Graha Maitri';
  personALord: PlanetSymbol;
  personBLord: PlanetSymbol;
  lordAToB: string;
  lordBToA: string;
  combinedFriendship: string;
}

export interface GanaResult extends KootaBaseResult {
  name: 'Gana';
  personAGana: GanaType;
  personBGana: GanaType;
  relationship: string;
}

export interface BhakootResult extends KootaBaseResult {
  name: 'Bhakoot';
  personARashi: string;
  personBRashi: string;
  relativeDistance: BhakootDistance;
  condition: BhakootCondition;
  isDoshaCancelled: boolean;
  cancellationReason?: string;
}

export interface NadiResult extends KootaBaseResult {
  name: 'Nadi';
  personANadi: NadiType;
  personBNadi: NadiType;
  condition: NadiCondition;
  isDoshaCancelled: boolean;
  cancellationReason?: string;
}

/**
 * Ashtakoota (Gun Milan) complete result.
 */
export interface AshtakootaResult {
  totalMaxPoints: number; // Always 36
  totalObtainedPoints: number;
  isCompatible: boolean; // >= 18 points standard classical threshold
  kootas: {
    varna: VarnaResult;
    vashya: VashyaResult;
    tara: TaraResult;
    yoni: YoniResult;
    grahaMaitri: GrahaMaitriResult;
    gana: GanaResult;
    bhakoot: BhakootResult;
    nadi: NadiResult;
  };
}

/**
 * Backward compatibility alias map for kootas Record<string, KootaScore>.
 */
export interface KootaScore {
  name: string;
  maxPoints: number;
  obtainedPoints: number;
  description: string;
}

/**
 * Individual Manglik (Mars) placement analysis.
 */
export interface ManglikStatus {
  isManglik: boolean;
  marsPlacement: {
    rashiIndex: number;
    rashiName: string;
    longitude: number;
    houseFromLagna: number;
    houseFromMoon: number;
  };
  manglikHousesFromLagna: number[];
  manglikHousesFromMoon: number[];
  severity: ManglikSeverity;
  cancellationFactors: string[];
  isCancelled: boolean;
  effectiveManglik: boolean;
}

/**
 * Pairwise Manglik comparison.
 */
export interface ManglikComparisonResult {
  personA: ManglikStatus;
  personB: ManglikStatus;
  verdict: ManglikComparisonVerdict;
  isDoshaCancelledByMatch: boolean;
  explanation: string;
}

/**
 * Full compatibility result structure for two individuals.
 */
export interface CompatibilityResult {
  calculationVersion: string;
  convention: {
    name: string;
    description: string;
    totalMaxScore: number;
    ayanamsa: string;
    zodiac: string;
  };
  personA: DerivedMoonProfile;
  personB: DerivedMoonProfile;
  ashtakoota: AshtakootaResult;
  manglikComparison: ManglikComparisonResult;
  overallSummary: {
    totalScore: number;
    maxScore: number;
    isAshtakootaCompatible: boolean;
    manglikVerdict: ManglikComparisonVerdict;
  };
}

/**
 * Alias for legacy MatchmakingResult compatibility.
 */
export interface MatchmakingResult {
  ashtakoota: AshtakootaResult;
  boyManglik: ManglikStatus;
  girlManglik: ManglikStatus;
  manglikComparison?: ManglikComparisonResult;
  overallVerdict: string;
}

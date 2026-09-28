import { PlanetSymbol, MANDATORY_VEDIC_PLANETS } from '../planets/planet.types';
import { VargaType, CANONICAL_VARGAS } from '../varga/varga.types';
import { calculatePlanetaryDignity } from '../planets/planetary-dignity';
import { ExtendedPlanetaryDignity } from '../planets/planetary-intelligence.types';
import { RASHIS } from '../zodiac/rashi';
import { VargaCalculator } from '../varga/varga-calculator';
import { VargaDignityPlacement } from './vimshopaka.types';

export const SHODASHAVARGA_WEIGHTS: Record<VargaType, number> = {
  D1: 3.5,
  D2: 1.0,
  D3: 1.0,
  D4: 0.5,
  D7: 0.5,
  D9: 3.0,
  D10: 0.5,
  D12: 0.5,
  D16: 2.0,
  D20: 0.5,
  D24: 0.5,
  D27: 0.5,
  D30: 1.0,
  D40: 0.5,
  D45: 0.5,
  D60: 4.0,
};

export const SHADVARGA_WEIGHTS: Record<string, number> = {
  D1: 6,
  D2: 2,
  D3: 4,
  D9: 5,
  D12: 2,
  D30: 1,
};

export const SAPTAVARGA_WEIGHTS: Record<string, number> = {
  D1: 5.0,
  D2: 2.0,
  D3: 3.0,
  D7: 2.5,
  D9: 4.5,
  D12: 2.0,
  D30: 1.0,
};

export const DASHAVARGA_WEIGHTS: Record<string, number> = {
  D1: 3.0,
  D2: 1.5,
  D3: 1.5,
  D7: 1.5,
  D9: 1.5,
  D10: 1.5,
  D12: 1.5,
  D16: 1.5,
  D30: 1.5,
  D60: 5.0,
};

export function dignityToScore(dignity: ExtendedPlanetaryDignity): number {
  switch (dignity) {
    case 'EXALTED':
    case 'MOOLATRIKONA':
    case 'OWN_SIGN':
      return 20;
    case 'GREAT_FRIEND':
      return 18;
    case 'FRIEND':
      return 15;
    case 'NEUTRAL':
      return 10;
    case 'ENEMY':
      return 7;
    case 'GREAT_ENEMY':
      return 5;
    case 'DEBILITATED':
      return 2;
    default:
      return 10;
  }
}

export function getVaisheshikamsaCategory(goodVargasCount: number): string {
  if (goodVargasCount >= 10) return 'Saivamsa (10+ Vargas)';
  if (goodVargasCount === 9) return 'Vaishnavamsha (9 Vargas)';
  if (goodVargasCount === 8) return 'Airavata (8 Vargas)';
  if (goodVargasCount === 7) return 'Devaloka (7 Vargas)';
  if (goodVargasCount === 6) return 'Paravata (6 Vargas)';
  if (goodVargasCount === 5) return 'Simhasana (5 Vargas)';
  if (goodVargasCount === 4) return 'Gopura (4 Vargas)';
  if (goodVargasCount === 3) return 'Uttama (3 Vargas)';
  if (goodVargasCount === 2) return 'Parijata (2 Vargas)';
  if (goodVargasCount === 1) return 'Kshetradhipa (1 Varga)';
  return 'Sadharana (Ordinary)';
}

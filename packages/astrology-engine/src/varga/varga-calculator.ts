import { PlanetSymbol } from '../planets/planet.types';
import { AstroChart } from '../chart/astro-chart.types';
import { VargaChart, VargaPlacement, VargaType } from './varga.types';
import { RASHIS, getRashiByLongitude } from '../zodiac/rashi';
import { normalizeDegree } from '../coordinates/angular-math';

export class VargaCalculator {
  /**
   * Calculates a specific Varga chart for all planets and ascendant in an AstroChart.
   */
  public calculateVarga(chart: AstroChart, vargaType: VargaType): VargaChart {
    const placements: Record<string, VargaPlacement> = {};

    // Ascendant placement in Varga
    const ascLongitude = chart.ascendant?.longitude ?? 0;
    const ascVargaRashi = this.calculateLongitudeVarga(ascLongitude, vargaType);
    const ascRashiDef = RASHIS[ascVargaRashi - 1];

    placements['Ascendant'] = {
      planet: 'Ascendant' as any,
      rashiIndex: ascVargaRashi,
      rashiName: ascRashiDef.sanskritName,
    };

    // Planetary placements in Varga
    for (const [symbolStr, position] of Object.entries(chart.planets)) {
      const planetSymbol = symbolStr as PlanetSymbol;
      const vargaRashiIndex = this.calculateLongitudeVarga(position.longitude, vargaType);
      const rashiDef = RASHIS[vargaRashiIndex - 1];

      placements[planetSymbol] = {
        planet: planetSymbol,
        rashiIndex: vargaRashiIndex,
        rashiName: rashiDef.sanskritName,
      };
    }

    return {
      vargaType,
      name: this.getVargaName(vargaType),
      placements: placements as Record<PlanetSymbol, VargaPlacement>,
    };
  }

  /**
   * Calculates the resulting Rashi sign (1 to 12) for a longitude in a given Varga division.
   */
  public calculateLongitudeVarga(longitude: number, vargaType: VargaType): number {
    const norm = normalizeDegree(longitude);
    const rashiDef = getRashiByLongitude(norm);
    const rashiIndex = rashiDef.index; // 1-12
    const degreeInSign = norm % 30;

    switch (vargaType) {
      case 'D1':
        return rashiIndex;

      case 'D2': {
        // Hora
        const isOdd = rashiIndex % 2 !== 0;
        if (isOdd) {
          return degreeInSign < 15 ? 5 : 4; // 0-15 Leo (5), 15-30 Cancer (4)
        } else {
          return degreeInSign < 15 ? 4 : 5; // 0-15 Cancer (4), 15-30 Leo (5)
        }
      }

      case 'D3': {
        // Drekkana (10 deg divisions)
        const part = Math.floor(degreeInSign / 10); // 0, 1, 2
        let targetSign = rashiIndex;
        if (part === 1) targetSign = ((rashiIndex - 1 + 4) % 12) + 1; // 5th sign
        if (part === 2) targetSign = ((rashiIndex - 1 + 8) % 12) + 1; // 9th sign
        return targetSign;
      }

      case 'D4': {
        // Chaturthamsa (7.5 deg divisions)
        const part = Math.floor(degreeInSign / 7.5); // 0, 1, 2, 3
        return ((rashiIndex - 1 + part * 3) % 12) + 1;
      }

      case 'D7': {
        // Saptamsa (30/7 deg = ~4.2857 deg)
        const part = Math.floor(degreeInSign / (30 / 7));
        const isOdd = rashiIndex % 2 !== 0;
        const startSign = isOdd ? rashiIndex : ((rashiIndex - 1 + 6) % 12) + 1;
        return ((startSign - 1 + part) % 12) + 1;
      }

      case 'D9': {
        // Navamsha (3 deg 20 min = 3.333333 deg)
        const part = Math.floor(degreeInSign / (30 / 9)); // 0..8
        // Fiery (1,5,9) -> Aries(1); Earthy (2,6,10) -> Cap(10); Airy (3,7,11) -> Libra(7); Watery (4,8,12) -> Cancer(4)
        const elementGroup = (rashiIndex - 1) % 4;
        let startSign = 1;
        if (elementGroup === 0) startSign = 1;  // Fiery
        if (elementGroup === 1) startSign = 10; // Earthy
        if (elementGroup === 2) startSign = 7;  // Airy
        if (elementGroup === 3) startSign = 4;  // Watery
        return ((startSign - 1 + part) % 12) + 1;
      }

      case 'D10': {
        // Dasamsa (3 deg divisions)
        const part = Math.floor(degreeInSign / 3); // 0..9
        const isOdd = rashiIndex % 2 !== 0;
        const startSign = isOdd ? rashiIndex : ((rashiIndex - 1 + 8) % 12) + 1;
        return ((startSign - 1 + part) % 12) + 1;
      }

      case 'D12': {
        // Dwadasamsa (2.5 deg divisions)
        const part = Math.floor(degreeInSign / 2.5); // 0..11
        return ((rashiIndex - 1 + part) % 12) + 1;
      }

      case 'D30': {
        // Trimsamsa
        const isOdd = rashiIndex % 2 !== 0;
        if (isOdd) {
          if (degreeInSign < 5) return 1;   // Aries (Mars)
          if (degreeInSign < 10) return 11; // Aquarius (Saturn)
          if (degreeInSign < 18) return 9;  // Sagittarius (Jupiter)
          if (degreeInSign < 25) return 3;  // Gemini (Mercury)
          return 7;                         // Libra (Venus)
        } else {
          if (degreeInSign < 5) return 2;   // Taurus (Venus)
          if (degreeInSign < 12) return 6;  // Virgo (Mercury)
          if (degreeInSign < 20) return 12; // Pisces (Jupiter)
          if (degreeInSign < 25) return 10; // Capricorn (Saturn)
          return 8;                         // Scorpio (Mars)
        }
      }

      default:
        return rashiIndex;
    }
  }

  private getVargaName(vargaType: VargaType): string {
    const names: Record<VargaType, string> = {
      D1: 'Rashi Chart',
      D2: 'Hora (Wealth)',
      D3: 'Drekkana (Siblings & Courage)',
      D4: 'Chaturthamsa (Fortune & Fixed Assets)',
      D7: 'Saptamsa (Children & Progeny)',
      D9: 'Navamsha (Spouse & Destiny)',
      D10: 'Dasamsa (Career & Profession)',
      D12: 'Dwadasamsa (Parents & Lineage)',
      D16: 'Shodasamsa (Vehicles & Desires)',
      D20: 'Vimsamsa (Spiritual Progress)',
      D24: 'Chaturvimsamsa (Knowledge & Learning)',
      D27: 'Saptavimsamsa (Strengths & Vulnerabilities)',
      D30: 'Trimsamsa (Evil & Misfortunes)',
      D40: 'Khavedamsa (Auspiciousness)',
      D45: 'Akshavedamsa (General Character)',
      D60: 'Shashtiamsa (Past Life Karma)',
    };
    return names[vargaType] || vargaType;
  }
}

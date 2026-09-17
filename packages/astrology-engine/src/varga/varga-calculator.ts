import { PlanetSymbol } from '../planets/planet.types';
import { AstroChart } from '../chart/astro-chart.types';
import {
  VargaChart,
  VargaPlacement,
  VargaType,
  VargaHousePlacement,
  VargaSignSummary,
} from './varga.types';
import { RASHIS, getRashiByLongitude } from '../zodiac/rashi';
import { normalizeDegree, EPSILON } from '../coordinates/angular-math';

export class VargaCalculator {
  /**
   * Calculates a specific Varga chart for all planets and ascendant in an AstroChart.
   * Derives divisional planetary positions, Varga Ascendant, and 12 divisional houses.
   */
  public calculateVarga(chart: AstroChart, vargaType: VargaType): VargaChart {
    const placements: Record<string, VargaPlacement> = {};

    // 1. Ascendant placement in Varga
    const ascLongitude = chart.ascendant?.longitude ?? 0;
    const ascVargaRashi = this.calculateLongitudeVarga(ascLongitude, vargaType);
    const ascDegreeInVarga = this.calculateDegreeInVarga(ascLongitude, vargaType);
    const ascRashiDef = RASHIS[ascVargaRashi - 1];

    const ascPlacement: VargaPlacement = {
      planet: 'Ascendant',
      rashiIndex: ascVargaRashi,
      rashiName: ascRashiDef.sanskritName,
      degreeInVarga: ascDegreeInVarga,
      sourceLongitude: ascLongitude,
      house: 1,
      isRetrograde: false,
    };
    placements['Ascendant'] = ascPlacement;

    // 2. Planetary placements in Varga
    for (const [symbolStr, position] of Object.entries(chart.planets)) {
      if (!position || typeof position.longitude !== 'number') {
        continue;
      }
      const planetSymbol = symbolStr as PlanetSymbol;
      const vargaRashiIndex = this.calculateLongitudeVarga(position.longitude, vargaType);
      const degreeInVarga = this.calculateDegreeInVarga(position.longitude, vargaType);
      const rashiDef = RASHIS[vargaRashiIndex - 1];
      const house = ((vargaRashiIndex - ascVargaRashi + 12) % 12) + 1;

      placements[planetSymbol] = {
        planet: planetSymbol,
        rashiIndex: vargaRashiIndex,
        rashiName: rashiDef.sanskritName,
        degreeInVarga,
        sourceLongitude: position.longitude,
        house,
        isRetrograde: position.isRetrograde,
      };
    }

    // 3. Build 12 Whole Sign Houses for the Varga
    const houses: VargaHousePlacement[] = [];
    for (let h = 1; h <= 12; h++) {
      const houseRashiIndex = ((ascVargaRashi - 1 + (h - 1)) % 12) + 1;
      const houseRashiDef = RASHIS[houseRashiIndex - 1];
      const occupants = Object.values(placements)
        .filter((p) => p.planet !== 'Ascendant' && p.rashiIndex === houseRashiIndex)
        .map((p) => p.planet);

      houses.push({
        houseNumber: h,
        rashiIndex: houseRashiIndex,
        rashiName: houseRashiDef.sanskritName,
        occupants,
      });
    }

    // 4. Build 12 Sign Summaries for the Varga
    const signs: VargaSignSummary[] = RASHIS.map((rashi) => {
      const houseNumber = ((rashi.index - ascVargaRashi + 12) % 12) + 1;
      const occupants = Object.values(placements)
        .filter((p) => p.planet !== 'Ascendant' && p.rashiIndex === rashi.index)
        .map((p) => p.planet);

      return {
        index: rashi.index,
        name: rashi.sanskritName,
        houseNumber,
        occupants,
      };
    });

    return {
      vargaType,
      division: this.getDivisionNumber(vargaType),
      name: this.getVargaName(vargaType),
      calculationRule: this.getCalculationRule(vargaType),
      ascendant: ascPlacement,
      placements,
      houses,
      signs,
    };
  }

  /**
   * Calculates the resulting Rashi sign (1 to 12) for a sidereal longitude in a given Varga division.
   * Strictly adheres to authoritative Brihat Parashara Hora Shastra (BPHS) classical rules.
   */
  public calculateLongitudeVarga(longitude: number, vargaType: VargaType): number {
    const norm = normalizeDegree(longitude);
    const rashiDef = getRashiByLongitude(norm);
    const rashiIndex = rashiDef.index; // 1-12
    const degreeInSign = norm % 30;
    const isOdd = rashiIndex % 2 !== 0;

    switch (vargaType) {
      case 'D1':
        // Rashi (Direct placement)
        return rashiIndex;

      case 'D2': {
        // Hora (15 deg divisions: Odd -> Sun 0-15 (Leo 5), Moon 15-30 (Cancer 4); Even -> Moon 0-15, Sun 15-30)
        if (isOdd) {
          return degreeInSign < 15 ? 5 : 4;
        } else {
          return degreeInSign < 15 ? 4 : 5;
        }
      }

      case 'D3': {
        // Drekkana (10 deg divisions: 1st self, 2nd 5th, 3rd 9th)
        const part = Math.min(2, Math.floor(degreeInSign / 10));
        let targetSign = rashiIndex;
        if (part === 1) targetSign = ((rashiIndex - 1 + 4) % 12) + 1;
        if (part === 2) targetSign = ((rashiIndex - 1 + 8) % 12) + 1;
        return targetSign;
      }

      case 'D4': {
        // Chaturthamsa (7.5 deg divisions: 1st self, 2nd 4th, 3rd 7th, 4th 10th)
        const part = Math.min(3, Math.floor(degreeInSign / 7.5));
        return ((rashiIndex - 1 + part * 3) % 12) + 1;
      }

      case 'D7': {
        // Saptamsa (30/7 deg: Odd signs start from self, Even signs start from 7th)
        const span = 30 / 7;
        const part = Math.min(6, Math.floor(degreeInSign / span));
        const startSign = isOdd ? rashiIndex : ((rashiIndex - 1 + 6) % 12) + 1;
        return ((startSign - 1 + part) % 12) + 1;
      }

      case 'D9': {
        // Navamsha (3 deg 20 min = 3.333333 deg)
        // Fiery (1,5,9) -> Aries(1); Earthy (2,6,10) -> Capricorn(10); Airy (3,7,11) -> Libra(7); Watery (4,8,12) -> Cancer(4)
        const span = 30 / 9;
        const part = Math.min(8, Math.floor(degreeInSign / span));
        const elementGroup = (rashiIndex - 1) % 4;
        let startSign = 1;
        if (elementGroup === 0) startSign = 1;  // Fiery
        if (elementGroup === 1) startSign = 10; // Earthy
        if (elementGroup === 2) startSign = 7;  // Airy
        if (elementGroup === 3) startSign = 4;  // Watery
        return ((startSign - 1 + part) % 12) + 1;
      }

      case 'D10': {
        // Dasamsa (3 deg divisions: Odd signs start from self, Even signs start from 9th)
        const part = Math.min(9, Math.floor(degreeInSign / 3));
        const startSign = isOdd ? rashiIndex : ((rashiIndex - 1 + 8) % 12) + 1;
        return ((startSign - 1 + part) % 12) + 1;
      }

      case 'D12': {
        // Dwadasamsa (2.5 deg divisions: Starts from self for all signs)
        const part = Math.min(11, Math.floor(degreeInSign / 2.5));
        return ((rashiIndex - 1 + part) % 12) + 1;
      }

      case 'D16': {
        // Shodashamsha / Kalamsa (30/16 deg = 1.875 deg)
        // Movable (Chara) -> Aries(1); Fixed (Sthira) -> Leo(5); Dual (Dvisvabhava) -> Sagittarius(9)
        const part = Math.min(15, Math.floor(degreeInSign / 1.875));
        const modality = rashiDef.modality;
        let startSign = 1;
        if (modality === 'CHARA') startSign = 1;
        else if (modality === 'STHIRA') startSign = 5;
        else startSign = 9;
        return ((startSign - 1 + part) % 12) + 1;
      }

      case 'D20': {
        // Vimshamsha (30/20 deg = 1.5 deg)
        // Movable (Chara) -> Aries(1); Fixed (Sthira) -> Sagittarius(9); Dual (Dvisvabhava) -> Leo(5)
        const part = Math.min(19, Math.floor(degreeInSign / 1.5));
        const modality = rashiDef.modality;
        let startSign = 1;
        if (modality === 'CHARA') startSign = 1;
        else if (modality === 'STHIRA') startSign = 9;
        else startSign = 5;
        return ((startSign - 1 + part) % 12) + 1;
      }

      case 'D24': {
        // Chaturvimshamsha / Siddhamsa (30/24 deg = 1.25 deg)
        // Odd signs -> Leo(5); Even signs -> Cancer(4)
        const part = Math.min(23, Math.floor(degreeInSign / 1.25));
        const startSign = isOdd ? 5 : 4;
        return ((startSign - 1 + part) % 12) + 1;
      }

      case 'D27': {
        // Saptavimshamsha / Bhamsa / Nakshatramsha (30/27 deg = 10/9 deg = ~1.111111 deg)
        // Fiery (1,5,9) -> Aries(1); Earthy (2,6,10) -> Cancer(4); Airy (3,7,11) -> Libra(7); Watery (4,8,12) -> Capricorn(10)
        const span = 30 / 27;
        const part = Math.min(26, Math.floor(degreeInSign / span));
        const elementGroup = (rashiIndex - 1) % 4;
        let startSign = 1;
        if (elementGroup === 0) startSign = 1;  // Fiery -> Aries
        if (elementGroup === 1) startSign = 4;  // Earthy -> Cancer
        if (elementGroup === 2) startSign = 7;  // Airy -> Libra
        if (elementGroup === 3) startSign = 10; // Watery -> Capricorn
        return ((startSign - 1 + part) % 12) + 1;
      }

      case 'D30': {
        // Trimsamsa (Unequal degrees: Sun & Moon have no Trimsamsha)
        // Odd: 0-5 Mars(Aries 1), 5-10 Sat(Aq 11), 10-18 Jup(Sag 9), 18-25 Merc(Gem 3), 25-30 Ven(Lib 7)
        // Even: 0-5 Ven(Tau 2), 5-12 Merc(Vir 6), 12-20 Jup(Pis 12), 20-25 Sat(Cap 10), 25-30 Mars(Sco 8)
        if (isOdd) {
          if (degreeInSign < 5) return 1;
          if (degreeInSign < 10) return 11;
          if (degreeInSign < 18) return 9;
          if (degreeInSign < 25) return 3;
          return 7;
        } else {
          if (degreeInSign < 5) return 2;
          if (degreeInSign < 12) return 6;
          if (degreeInSign < 20) return 12;
          if (degreeInSign < 25) return 10;
          return 8;
        }
      }

      case 'D40': {
        // Khavedamsha / Swavedamsha (30/40 deg = 0.75 deg)
        // Odd signs -> Aries(1); Even signs -> Libra(7)
        const part = Math.min(39, Math.floor(degreeInSign / 0.75));
        const startSign = isOdd ? 1 : 7;
        return ((startSign - 1 + part) % 12) + 1;
      }

      case 'D45': {
        // Akshavedamsha (30/45 deg = 2/3 deg = ~0.666667 deg)
        // Movable (Chara) -> Aries(1); Fixed (Sthira) -> Leo(5); Dual (Dvisvabhava) -> Sagittarius(9)
        const span = 30 / 45;
        const part = Math.min(44, Math.floor(degreeInSign / span));
        const modality = rashiDef.modality;
        let startSign = 1;
        if (modality === 'CHARA') startSign = 1;
        else if (modality === 'STHIRA') startSign = 5;
        else startSign = 9;
        return ((startSign - 1 + part) % 12) + 1;
      }

      case 'D60': {
        // Shashtiamsa (30/60 deg = 0.5 deg = 30 arcminutes)
        // Starts from self for all signs: ((S - 1 + part) % 12) + 1
        const part = Math.min(59, Math.floor(degreeInSign / 0.5));
        return ((rashiIndex - 1 + part) % 12) + 1;
      }

      default:
        return rashiIndex;
    }
  }

  /**
   * Calculates the relative degree [0.0, 30.0) inside the divisional sign.
   */
  public calculateDegreeInVarga(longitude: number, vargaType: VargaType): number {
    const norm = normalizeDegree(longitude);
    const degreeInSign = norm % 30;
    const isOdd = getRashiByLongitude(norm).index % 2 !== 0;

    if (vargaType === 'D1') {
      return degreeInSign;
    }

    if (vargaType === 'D30') {
      // Unequal Trimsamsha portions
      let startSpan = 0;
      let totalSpan = 5;
      if (isOdd) {
        if (degreeInSign < 5) { startSpan = 0; totalSpan = 5; }
        else if (degreeInSign < 10) { startSpan = 5; totalSpan = 5; }
        else if (degreeInSign < 18) { startSpan = 10; totalSpan = 8; }
        else if (degreeInSign < 25) { startSpan = 18; totalSpan = 7; }
        else { startSpan = 25; totalSpan = 5; }
      } else {
        if (degreeInSign < 5) { startSpan = 0; totalSpan = 5; }
        else if (degreeInSign < 12) { startSpan = 5; totalSpan = 7; }
        else if (degreeInSign < 20) { startSpan = 12; totalSpan = 8; }
        else if (degreeInSign < 25) { startSpan = 20; totalSpan = 5; }
        else { startSpan = 25; totalSpan = 5; }
      }
      const elapsed = Math.max(0, degreeInSign - startSpan);
      const degreeInVarga = (elapsed / totalSpan) * 30;
      return Math.min(30 - EPSILON, Math.max(0, degreeInVarga));
    }

    const division = this.getDivisionNumber(vargaType);
    const span = 30 / division;
    const part = Math.min(division - 1, Math.floor(degreeInSign / span));
    const elapsed = Math.max(0, degreeInSign - part * span);
    const degreeInVarga = (elapsed / span) * 30;
    return Math.min(30 - EPSILON, Math.max(0, degreeInVarga));
  }

  public getDivisionNumber(vargaType: VargaType): number {
    const divisions: Record<VargaType, number> = {
      D1: 1,
      D2: 2,
      D3: 3,
      D4: 4,
      D7: 7,
      D9: 9,
      D10: 10,
      D12: 12,
      D16: 16,
      D20: 20,
      D24: 24,
      D27: 27,
      D30: 30,
      D40: 40,
      D45: 45,
      D60: 60,
    };
    return divisions[vargaType] || 1;
  }

  public getVargaName(vargaType: VargaType): string {
    const names: Record<VargaType, string> = {
      D1: 'Rashi Chart',
      D2: 'Hora (Wealth & Prosperity)',
      D3: 'Drekkana (Siblings & Courage)',
      D4: 'Chaturthamsa (Fortune & Fixed Assets)',
      D7: 'Saptamsa (Children & Progeny)',
      D9: 'Navamsha (Spouse & Destiny)',
      D10: 'Dasamsa (Career & Profession)',
      D12: 'Dwadasamsa (Parents & Lineage)',
      D16: 'Shodashamsha (Vehicles & Desires)',
      D20: 'Vimshamsha (Spiritual Progress & Worship)',
      D24: 'Chaturvimshamsha (Knowledge & Higher Learning)',
      D27: 'Saptavimshamsha / Bhamsa (Strengths & Vulnerabilities)',
      D30: 'Trimsamsa (Misfortunes & Arishta)',
      D40: 'Khavedamsa (Auspicious Effects & Virtues)',
      D45: 'Akshavedamsa (General Character & Well-being)',
      D60: 'Shashtiamsa (Past Life Karma & Deep Potential)',
    };
    return names[vargaType] || vargaType;
  }

  public getCalculationRule(vargaType: VargaType): string {
    const rules: Record<VargaType, string> = {
      D1: 'Direct placement in natal sidereal sign',
      D2: '15-degree division: Odd signs Sun/Leo 0-15 then Moon/Cancer 15-30; Even signs Moon/Cancer 0-15 then Sun/Leo 15-30',
      D3: '10-degree decanate division: 1st self, 2nd 5th from self, 3rd 9th from self',
      D4: '7.5-degree quadrant division: 1st self, 2nd 4th from self, 3rd 7th from self, 4th 10th from self',
      D7: '4.2857-degree division: Odd signs start from self; Even signs start from 7th from self',
      D9: '3.3333-degree division: Fiery signs from Aries, Earthy from Capricorn, Airy from Libra, Watery from Cancer',
      D10: '3-degree division: Odd signs start from self; Even signs start from 9th from self',
      D12: '2.5-degree division: Starts from self for all signs',
      D16: '1.875-degree division: Movable signs from Aries, Fixed from Leo, Dual from Sagittarius',
      D20: '1.5-degree division: Movable signs from Aries, Fixed from Sagittarius, Dual from Leo',
      D24: '1.25-degree division: Odd signs from Leo; Even signs from Cancer',
      D27: '1.1111-degree division: Fiery from Aries, Earthy from Cancer, Airy from Libra, Watery from Capricorn',
      D30: 'Unequal degrees: Odd signs Mars 5, Saturn 5, Jupiter 8, Mercury 7, Venus 5; Even signs Venus 5, Mercury 7, Jupiter 8, Saturn 5, Mars 5',
      D40: '0.75-degree division: Odd signs start from Aries; Even signs start from Libra',
      D45: '0.6667-degree division: Movable signs from Aries, Fixed from Leo, Dual from Sagittarius',
      D60: '0.5-degree division: Starts from self across 60 half-degree portions',
    };
    return rules[vargaType] || 'Standard Parashara division';
  }
}

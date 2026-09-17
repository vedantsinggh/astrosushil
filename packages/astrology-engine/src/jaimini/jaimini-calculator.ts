import { PlanetSymbol } from '../planets/planet.types';
import { AstroChart } from '../chart/astro-chart.types';
import { RASHIS } from '../zodiac/rashi';
import {
  CharaKarakaScheme,
  CharaKarakaDetail,
  RashiDrishtiDetail,
  KarakamshaReport,
  JaiminiReport,
} from './jaimini.types';
import { ArudhaCalculator } from './arudha-calculator';
import { ArgalaCalculator } from './argala-calculator';
import { VargaCalculator } from '../varga/varga-calculator';

export class JaiminiCalculator {
  private vargaCalculator: VargaCalculator;

  constructor(vargaCalculator?: VargaCalculator) {
    this.vargaCalculator = vargaCalculator || new VargaCalculator();
  }

  /**
   * Computes Chara Karakas for either 7-Karaka or 8-Karaka schemes.
   */
  public calculateCharaKarakas(
    planets: Record<string, { degreeInRashi: number }>,
    scheme: CharaKarakaScheme = 'SEVEN_KARAKA'
  ): CharaKarakaDetail[] {
    const eligiblePlanets: { planet: PlanetSymbol; effectiveDegree: number }[] = [];

    const SEVEN_PLANETS = [
      PlanetSymbol.SUN,
      PlanetSymbol.MOON,
      PlanetSymbol.MARS,
      PlanetSymbol.MERCURY,
      PlanetSymbol.JUPITER,
      PlanetSymbol.VENUS,
      PlanetSymbol.SATURN,
    ];

    for (const sym of SEVEN_PLANETS) {
      const pos = planets[sym];
      if (pos && typeof pos.degreeInRashi === 'number') {
        eligiblePlanets.push({
          planet: sym,
          effectiveDegree: pos.degreeInRashi,
        });
      }
    }

    if (scheme === 'EIGHT_KARAKA') {
      const rahuPos = planets[PlanetSymbol.RAHU];
      if (rahuPos && typeof rahuPos.degreeInRashi === 'number') {
        // Rahu counts backwards in degrees (30° - degree)
        eligiblePlanets.push({
          planet: PlanetSymbol.RAHU,
          effectiveDegree: 30 - rahuPos.degreeInRashi,
        });
      }
    }

    // Sort descending by effective degrees
    eligiblePlanets.sort((a, b) => b.effectiveDegree - a.effectiveDegree);

    const SEVEN_CODES: { code: CharaKarakaDetail['code']; name: string; sanskritName: string; significance: string }[] = [
      { code: 'AK', name: 'Atmakaraka', sanskritName: 'Atmakaraka', significance: 'Soul, self, core destiny' },
      { code: 'AmK', name: 'Amatyakaraka', sanskritName: 'Amatyakaraka', significance: 'Career, counsel, intellect' },
      { code: 'BK', name: 'Bhratrikaraka', sanskritName: 'Bhratrikaraka', significance: 'Siblings, mentors, courage' },
      { code: 'MK', name: 'Matrikaraka', sanskritName: 'Matrikaraka', significance: 'Mother, emotional grounding, home' },
      { code: 'PK', name: 'Putrakaraka', sanskritName: 'Putrakaraka', significance: 'Children, creativity, intellect' },
      { code: 'GK', name: 'Gnatikaraka', sanskritName: 'Gnatikaraka', significance: 'Obstacles, rivals, kin' },
      { code: 'DK', name: 'Darakaraka', sanskritName: 'Darakaraka', significance: 'Spouse, partnerships, relationships' },
    ];

    const EIGHT_CODES: { code: CharaKarakaDetail['code']; name: string; sanskritName: string; significance: string }[] = [
      { code: 'AK', name: 'Atmakaraka', sanskritName: 'Atmakaraka', significance: 'Soul, self, core destiny' },
      { code: 'AmK', name: 'Amatyakaraka', sanskritName: 'Amatyakaraka', significance: 'Career, counsel, intellect' },
      { code: 'BK', name: 'Bhratrikaraka', sanskritName: 'Bhratrikaraka', significance: 'Siblings, mentors, courage' },
      { code: 'MK', name: 'Matrikaraka', sanskritName: 'Matrikaraka', significance: 'Mother, emotional grounding' },
      { code: 'PiK', name: 'Pitrikaraka', sanskritName: 'Pitrikaraka', significance: 'Father, lineage, traditions' },
      { code: 'PK', name: 'Putrakaraka', sanskritName: 'Putrakaraka', significance: 'Children, creativity' },
      { code: 'GK', name: 'Gnatikaraka', sanskritName: 'Gnatikaraka', significance: 'Obstacles, rivals' },
      { code: 'DK', name: 'Darakaraka', sanskritName: 'Darakaraka', significance: 'Spouse, partnerships' },
    ];

    const codeDefs = scheme === 'EIGHT_KARAKA' ? EIGHT_CODES : SEVEN_CODES;

    return eligiblePlanets.map((ep, idx) => {
      const def = codeDefs[idx] || codeDefs[codeDefs.length - 1];
      return {
        planet: ep.planet,
        code: def.code,
        name: def.name,
        sanskritName: def.sanskritName,
        significance: def.significance,
        rank: idx + 1,
        degreeInSign: Number(ep.effectiveDegree.toFixed(4)),
      };
    });
  }

  /**
   * Computes Jaimini Rashi Drishti (Sign aspects) and lists aspecting planets.
   *
   * - Movable signs (1, 4, 7, 10) aspect Fixed signs except adjacent (2, 5, 8, 11).
   * - Fixed signs (2, 5, 8, 11) aspect Movable signs except adjacent (1, 4, 7, 10).
   * - Dual signs (3, 6, 9, 12) aspect all other Dual signs.
   */
  public calculateRashiDrishti(
    planetSigns: Partial<Record<PlanetSymbol, number>>
  ): RashiDrishtiDetail[] {
    const drishtiList: RashiDrishtiDetail[] = [];

    for (let s = 1; s <= 12; s++) {
      const rashiDef = RASHIS[s - 1];
      const modality = rashiDef.modality;
      const aspectedSignIndices: number[] = [];

      if (modality === 'CHARA') {
        // Movable: aspects Fixed signs (2, 5, 8, 11) except adjacent fixed sign
        const adjacentFixed = ((s % 12) + 1); // For 1: 2; For 4: 5; For 7: 8; For 10: 11
        const allFixed = [2, 5, 8, 11];
        for (const f of allFixed) {
          if (f !== adjacentFixed) aspectedSignIndices.push(f);
        }
      } else if (modality === 'STHIRA') {
        // Fixed: aspects Movable signs (1, 4, 7, 10) except adjacent movable sign
        const adjacentMovable = ((s - 2 + 12) % 12) + 1; // For 2: 1; For 5: 4; For 8: 7; For 11: 10
        const allMovable = [1, 4, 7, 10];
        for (const m of allMovable) {
          if (m !== adjacentMovable) aspectedSignIndices.push(m);
        }
      } else {
        // Dual: aspects all other Dual signs (3, 6, 9, 12)
        const allDual = [3, 6, 9, 12];
        for (const d of allDual) {
          if (d !== s) aspectedSignIndices.push(d);
        }
      }

      // Find planets in the source sign
      const planetsInSource = Object.entries(planetSigns)
        .filter(([_, signIdx]) => signIdx === s)
        .map(([sym]) => sym as PlanetSymbol);

      const aspectedSigns = aspectedSignIndices.map((targetSignIdx) => {
        const targetRashiDef = RASHIS[targetSignIdx - 1];
        return {
          signIndex: targetSignIdx,
          signName: targetRashiDef.sanskritName,
          aspectingPlanets: planetsInSource,
        };
      });

      drishtiList.push({
        sourceSignIndex: s,
        sourceSignName: rashiDef.sanskritName,
        modality,
        aspectedSigns,
      });
    }

    return drishtiList;
  }

  /**
   * Evaluates Karakamsha and Karakamsha Lagna placements.
   */
  public calculateKarakamsha(
    chart: AstroChart,
    charaKarakas: CharaKarakaDetail[]
  ): KarakamshaReport {
    const atmakaraka = charaKarakas.find((k) => k.code === 'AK') || charaKarakas[0];
    const akPlanet = atmakaraka.planet;

    // Get D9 Navamsha chart
    const d9Chart = this.vargaCalculator.calculateVarga(chart, 'D9');
    const akNavPlacement = d9Chart.placements[akPlanet];
    const karakamshaRashiIndex = akNavPlacement?.rashiIndex ?? 1;
    const karakamshaRashiDef = RASHIS[karakamshaRashiIndex - 1];

    const ascRashi = chart.ascendant?.rashiIndex ?? 1;
    const karakamshaHouseFromLagna = ((karakamshaRashiIndex - ascRashi + 12) % 12) + 1;

    // Find planets in Kendra (1, 4, 7, 10) and Trikona (1, 5, 9) from Karakamsha in D9
    const planetsInKendra: PlanetSymbol[] = [];
    const planetsInTrikona: PlanetSymbol[] = [];

    const kendraHouses = [1, 4, 7, 10];
    const trikonaHouses = [1, 5, 9];

    for (const [symStr, placement] of Object.entries(d9Chart.placements)) {
      if (symStr === 'Ascendant' || !placement) continue;
      const sym = symStr as PlanetSymbol;
      const houseFromKL = ((placement.rashiIndex - karakamshaRashiIndex + 12) % 12) + 1;

      if (kendraHouses.includes(houseFromKL)) planetsInKendra.push(sym);
      if (trikonaHouses.includes(houseFromKL)) planetsInTrikona.push(sym);
    }

    return {
      atmakarakaPlanet: akPlanet,
      karakamshaRashiIndex,
      karakamshaRashiName: karakamshaRashiDef.sanskritName,
      karakamshaHouseFromLagna,
      karakamshaPlanetsInKendra: Array.from(new Set(planetsInKendra)),
      karakamshaPlanetsInTrikona: Array.from(new Set(planetsInTrikona)),
    };
  }

  /**
   * Main entry point to compile complete deterministic Jaimini intelligence.
   */
  public calculateFromChart(
    chart: AstroChart,
    scheme: CharaKarakaScheme = 'SEVEN_KARAKA'
  ): JaiminiReport {
    const ascRashi = chart.ascendant?.rashiIndex ?? 1;

    const planetSigns: Partial<Record<PlanetSymbol, number>> = {};
    const planetDegrees: Record<string, { degreeInRashi: number }> = {};

    for (const [symStr, pos] of Object.entries(chart.planets)) {
      if (!pos) continue;
      const sym = symStr as PlanetSymbol;
      planetSigns[sym] = pos.rashiIndex;
      planetDegrees[sym] = { degreeInRashi: pos.degreeInRashi };
    }

    const charaKarakas = this.calculateCharaKarakas(planetDegrees, scheme);
    const arudhaPadas = ArudhaCalculator.calculateAllArudhas(ascRashi, planetSigns);
    const arudhaLagna = arudhaPadas.find((p) => p.houseNumber === 1)!;
    const upapadaLagna = arudhaPadas.find((p) => p.houseNumber === 12)!;
    const darapada = arudhaPadas.find((p) => p.houseNumber === 7)!;

    const rashiDrishtis = this.calculateRashiDrishti(planetSigns);
    const argalas = ArgalaCalculator.calculateArgalaForHouses(ascRashi, planetSigns);
    const karakamsha = this.calculateKarakamsha(chart, charaKarakas);

    return {
      scheme,
      charaKarakas,
      arudhaPadas,
      arudhaLagna,
      upapadaLagna,
      darapada,
      rashiDrishtis,
      argalas,
      karakamsha,
    };
  }
}

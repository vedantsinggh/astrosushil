import { PlanetSymbol, PlanetPosition } from '../planets/planet.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { getRashiByLongitude, getDegreeInRashi } from '../zodiac/rashi';
import { AstroChart } from '../chart/astro-chart.types';
import { SahamResult } from './varshaphala.types';

export class SahamsCalculator {
  public calculateSahams(
    varshaLagnaLongitude: number,
    varshaLagnaRashiIndex: number,
    planets: Record<PlanetSymbol, PlanetPosition>
  ): SahamResult[] {
    const ascLon = normalizeDegree(varshaLagnaLongitude);

    const sunLon = planets[PlanetSymbol.SUN]?.longitude ?? 0;
    const moonLon = planets[PlanetSymbol.MOON]?.longitude ?? 0;
    const marsLon = planets[PlanetSymbol.MARS]?.longitude ?? 0;
    const mercuryLon = planets[PlanetSymbol.MERCURY]?.longitude ?? 0;
    const jupiterLon = planets[PlanetSymbol.JUPITER]?.longitude ?? 0;
    const venusLon = planets[PlanetSymbol.VENUS]?.longitude ?? 0;
    const saturnLon = planets[PlanetSymbol.SATURN]?.longitude ?? 0;

    // Day vs Night return
    const sunRashi = planets[PlanetSymbol.SUN]?.rashiIndex ?? 1;
    const sunHouse = ((sunRashi - varshaLagnaRashiIndex + 12) % 12) + 1;
    const isDayReturn = (sunHouse >= 7 && sunHouse <= 12);

    const calcPoint = (a: number, b: number): number => {
      return normalizeDegree(ascLon + a - b);
    };

    // 1. Punya Saham (Fortune / Spiritual Merit)
    const punyaLon = isDayReturn ? calcPoint(moonLon, sunLon) : calcPoint(sunLon, moonLon);

    // 2. Vidya Saham (Education / Knowledge)
    const vidyaLon = isDayReturn ? calcPoint(sunLon, moonLon) : calcPoint(moonLon, sunLon);

    // 3. Yashas Saham (Fame / Glory)
    const yashasLon = isDayReturn ? calcPoint(jupiterLon, punyaLon) : calcPoint(punyaLon, jupiterLon);

    // 4. Mitra Saham (Friendship)
    const mitraLon = isDayReturn ? calcPoint(jupiterLon, punyaLon) : calcPoint(punyaLon, jupiterLon);

    // 5. Mahatmya Saham (Greatness / Magnitude)
    const mahatmyaLon = isDayReturn ? calcPoint(punyaLon, marsLon) : calcPoint(marsLon, punyaLon);

    // 6. Karma Saham (Action / Occupation)
    const karmaLon = isDayReturn ? calcPoint(marsLon, mercuryLon) : calcPoint(mercuryLon, marsLon);

    // 7. Roga Saham (Disease / Physical Affliction)
    const rogaLon = isDayReturn ? calcPoint(saturnLon, moonLon) : calcPoint(moonLon, saturnLon);

    // 8. Karya Siddhi Saham (Accomplishment / Success of Work)
    const karyaSiddhiLon = isDayReturn ? calcPoint(saturnLon, sunLon) : calcPoint(sunLon, saturnLon);

    // 9. Asha Saham (Hopes / Desires)
    const ashaLon = isDayReturn ? calcPoint(saturnLon, marsLon) : calcPoint(marsLon, saturnLon);

    // 10. Preeti Saham (Love / Affection)
    const preetiLon = isDayReturn ? calcPoint(venusLon, sunLon) : calcPoint(sunLon, venusLon);

    const sahamDefs = [
      {
        name: 'Punya Saham',
        sanskritName: 'पुण्य सहम',
        lon: punyaLon,
        formula: isDayReturn ? 'Asc + Moon - Sun' : 'Asc + Sun - Moon',
        sourcePoints: ['Ascendant', isDayReturn ? 'Moon' : 'Sun', isDayReturn ? 'Sun' : 'Moon'],
      },
      {
        name: 'Vidya Saham',
        sanskritName: 'विद्या सहम',
        lon: vidyaLon,
        formula: isDayReturn ? 'Asc + Sun - Moon' : 'Asc + Moon - Sun',
        sourcePoints: ['Ascendant', isDayReturn ? 'Sun' : 'Moon', isDayReturn ? 'Moon' : 'Sun'],
      },
      {
        name: 'Yashas Saham',
        sanskritName: 'यशस् सहम',
        lon: yashasLon,
        formula: isDayReturn ? 'Asc + Jupiter - Punya' : 'Asc + Punya - Jupiter',
        sourcePoints: ['Ascendant', isDayReturn ? 'Jupiter' : 'Punya', isDayReturn ? 'Punya' : 'Jupiter'],
      },
      {
        name: 'Mitra Saham',
        sanskritName: 'मित्र सहम',
        lon: mitraLon,
        formula: isDayReturn ? 'Asc + Jupiter - Punya' : 'Asc + Punya - Jupiter',
        sourcePoints: ['Ascendant', isDayReturn ? 'Jupiter' : 'Punya', isDayReturn ? 'Punya' : 'Jupiter'],
      },
      {
        name: 'Mahatmya Saham',
        sanskritName: 'माहात्म्य सहम',
        lon: mahatmyaLon,
        formula: isDayReturn ? 'Asc + Punya - Mars' : 'Asc + Mars - Punya',
        sourcePoints: ['Ascendant', isDayReturn ? 'Punya' : 'Mars', isDayReturn ? 'Mars' : 'Punya'],
      },
      {
        name: 'Karma Saham',
        sanskritName: 'कर्म सहम',
        lon: karmaLon,
        formula: isDayReturn ? 'Asc + Mars - Mercury' : 'Asc + Mercury - Mars',
        sourcePoints: ['Ascendant', isDayReturn ? 'Mars' : 'Mercury', isDayReturn ? 'Mercury' : 'Mars'],
      },
      {
        name: 'Roga Saham',
        sanskritName: 'रोग सहम',
        lon: rogaLon,
        formula: isDayReturn ? 'Asc + Saturn - Moon' : 'Asc + Moon - Saturn',
        sourcePoints: ['Ascendant', isDayReturn ? 'Saturn' : 'Moon', isDayReturn ? 'Moon' : 'Saturn'],
      },
      {
        name: 'Karya Siddhi Saham',
        sanskritName: 'कार्य सिद्धि सहम',
        lon: karyaSiddhiLon,
        formula: isDayReturn ? 'Asc + Saturn - Sun' : 'Asc + Sun - Saturn',
        sourcePoints: ['Ascendant', isDayReturn ? 'Saturn' : 'Sun', isDayReturn ? 'Sun' : 'Saturn'],
      },
      {
        name: 'Asha Saham',
        sanskritName: 'आशा सहम',
        lon: ashaLon,
        formula: isDayReturn ? 'Asc + Saturn - Mars' : 'Asc + Mars - Saturn',
        sourcePoints: ['Ascendant', isDayReturn ? 'Saturn' : 'Mars', isDayReturn ? 'Mars' : 'Saturn'],
      },
      {
        name: 'Preeti Saham',
        sanskritName: 'प्रीति सहम',
        lon: preetiLon,
        formula: isDayReturn ? 'Asc + Venus - Sun' : 'Asc + Sun - Venus',
        sourcePoints: ['Ascendant', isDayReturn ? 'Venus' : 'Sun', isDayReturn ? 'Sun' : 'Venus'],
      },
    ];

    return sahamDefs.map((def) => {
      const norm = normalizeDegree(def.lon);
      const rashiDef = getRashiByLongitude(norm);
      const degreeInRashi = getDegreeInRashi(norm);
      const houseInVarshaChart = ((rashiDef.index - varshaLagnaRashiIndex + 12) % 12) + 1;

      return {
        name: def.name,
        sanskritName: def.sanskritName,
        longitude: norm,
        rashiIndex: rashiDef.index,
        rashiName: rashiDef.englishName,
        degreeInRashi,
        houseInVarshaChart,
        formula: def.formula,
        isDayFormula: isDayReturn,
        sourcePoints: def.sourcePoints,
        convention: 'TAJIKA_NEELAKANTHI_STANDARD',
      };
    });
  }

  /**
   * Static helper to compute all Sahams directly from annual AstroChart.
   */
  public static calculateAll(annualChart: AstroChart): SahamResult[] {
    const calc = new SahamsCalculator();
    const ascLon = annualChart.ascendant?.longitude ?? 0;
    const ascRashi = annualChart.ascendant?.rashiIndex ?? 1;
    return calc.calculateSahams(ascLon, ascRashi, annualChart.planets);
  }
}

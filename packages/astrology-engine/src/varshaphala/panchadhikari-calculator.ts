import { PlanetSymbol, PlanetPosition } from '../planets/planet.types';
import { RASHIS } from '../zodiac/rashi';
import { AstroChart } from '../chart/astro-chart.types';
import {
  PanchadhikariCandidate,
  PanchadhikariDetails,
  VarsheshaDetails,
  HarshaBalaScores,
  MunthaDetails,
} from './varshaphala.types';

// Classical Tajika aspecting houses from 1st house (Lagna)
// In Tajika astrology, houses 1 (conjunction), 3, 4, 5, 7, 9, 10, 11 cast valid aspects to Lagna.
// Houses 2, 6, 8, and 12 do NOT cast aspects to the Ascendant.
const TAJIKA_ASPECTING_HOUSES = new Set([1, 3, 4, 5, 7, 9, 10, 11]);

/**
 * Classical Tajika Neelakanthi & Dr. B.V. Raman Tri-Rashi Pati table across 12 signs:
 */
const TRIRASHI_LORDS_TABLE: Record<number, { day: PlanetSymbol; night: PlanetSymbol }> = {
  1: { day: PlanetSymbol.SUN, night: PlanetSymbol.JUPITER },      // Aries
  2: { day: PlanetSymbol.VENUS, night: PlanetSymbol.MOON },        // Taurus
  3: { day: PlanetSymbol.SATURN, night: PlanetSymbol.MERCURY },    // Gemini
  4: { day: PlanetSymbol.VENUS, night: PlanetSymbol.MARS },        // Cancer
  5: { day: PlanetSymbol.JUPITER, night: PlanetSymbol.SUN },       // Leo
  6: { day: PlanetSymbol.MOON, night: PlanetSymbol.VENUS },        // Virgo
  7: { day: PlanetSymbol.MERCURY, night: PlanetSymbol.SATURN },    // Libra
  8: { day: PlanetSymbol.MARS, night: PlanetSymbol.VENUS },        // Scorpio
  9: { day: PlanetSymbol.SATURN, night: PlanetSymbol.SATURN },     // Sagittarius
  10: { day: PlanetSymbol.MARS, night: PlanetSymbol.MARS },        // Capricorn
  11: { day: PlanetSymbol.JUPITER, night: PlanetSymbol.JUPITER },  // Aquarius
  12: { day: PlanetSymbol.MOON, night: PlanetSymbol.MOON },        // Pisces
};

function getTrirashisha(varshaLagnaRashiIndex: number, isDayReturn: boolean): PlanetSymbol {
  const entry = TRIRASHI_LORDS_TABLE[varshaLagnaRashiIndex] || TRIRASHI_LORDS_TABLE[1];
  return isDayReturn ? entry.day : entry.night;
}

export class PanchadhikariCalculator {
  public evaluatePanchadhikariAndVarshesha(
    natalLagnaRashiIndex: number,
    varshaLagnaRashiIndex: number,
    munthaRashiIndex: number,
    planets: Record<PlanetSymbol, PlanetPosition>,
    harshaBala: HarshaBalaScores
  ): { panchadhikari: PanchadhikariDetails; varshesha: VarsheshaDetails } {
    // 1. Determine Day vs Night return from Sun's house placement in the annual chart
    const sunPos = planets[PlanetSymbol.SUN];
    const sunRashi = sunPos?.rashiIndex ?? 1;
    const sunHouse = ((sunRashi - varshaLagnaRashiIndex + 12) % 12) + 1;
    const isDayReturn = (sunHouse >= 7 && sunHouse <= 12);

    const moonPos = planets[PlanetSymbol.MOON];
    const moonRashi = moonPos?.rashiIndex ?? 1;

    // 2. Identify the 5 office bearers (Panchadhikari) according to Tajika Neelakanthi
    const munthesha = RASHIS[munthaRashiIndex - 1].ruler as PlanetSymbol;
    const janmesha = RASHIS[natalLagnaRashiIndex - 1].ruler as PlanetSymbol;
    const varshaLagnesha = RASHIS[varshaLagnaRashiIndex - 1].ruler as PlanetSymbol;
    const trirashisha = getTrirashisha(varshaLagnaRashiIndex, isDayReturn);

    // Dina-Ratri Pati: Lord of the Sun's sign for Day return, Lord of the Moon's sign for Night return
    const dinaRatriPati = isDayReturn
      ? (RASHIS[sunRashi - 1].ruler as PlanetSymbol)
      : (RASHIS[moonRashi - 1].ruler as PlanetSymbol);

    const candidateDefs = [
      {
        role: 'VARSHA_LAGNESHA' as const,
        roleTitle: 'Varsha Lagna Lord',
        planet: varshaLagnesha,
        sourceDescription: `Ruler of Annual Ascendant (${RASHIS[varshaLagnaRashiIndex - 1].englishName})`,
      },
      {
        role: 'JANMESHA' as const,
        roleTitle: 'Natal Lagna Lord',
        planet: janmesha,
        sourceDescription: `Ruler of Natal Ascendant (${RASHIS[natalLagnaRashiIndex - 1].englishName})`,
      },
      {
        role: 'MUNTHESHA' as const,
        roleTitle: 'Muntha Lord',
        planet: munthesha,
        sourceDescription: `Ruler of Muntha Sign (${RASHIS[munthaRashiIndex - 1].englishName})`,
      },
      {
        role: 'TRIRASHISHA' as const,
        roleTitle: 'Tri-Rashi Lord',
        planet: trirashisha,
        sourceDescription: `Tri-Rashi table ruler for ${isDayReturn ? 'Day' : 'Night'} return in ${RASHIS[varshaLagnaRashiIndex - 1].englishName}`,
      },
      {
        role: 'DINA_RATRI_PATI' as const,
        roleTitle: isDayReturn ? 'Dina Pati (Day Lord)' : 'Ratri Pati (Night Lord)',
        planet: dinaRatriPati,
        sourceDescription: isDayReturn
          ? `Ruler of Sun sign (${RASHIS[sunRashi - 1].englishName}) for Day Return`
          : `Ruler of Moon sign (${RASHIS[moonRashi - 1].englishName}) for Night Return`,
      },
    ];

    const candidates: PanchadhikariCandidate[] = candidateDefs.map((def) => {
      const pos = planets[def.planet];
      const rashi = pos?.rashiIndex ?? 1;
      const houseInVarsha = ((rashi - varshaLagnaRashiIndex + 12) % 12) + 1;
      const aspectsVarshaLagna = TAJIKA_ASPECTING_HOUSES.has(houseInVarsha);
      const score = harshaBala[def.planet]?.totalScore ?? 0;

      return {
        role: def.role,
        roleTitle: def.roleTitle,
        planet: def.planet,
        sourceDescription: def.sourceDescription,
        aspectsVarshaLagna,
        harshaBalaScore: score,
        houseInVarshaChart: houseInVarsha,
      };
    });

    const panchadhikari: PanchadhikariDetails = {
      isDayReturn,
      sunHouseInVarshaChart: sunHouse,
      candidates,
    };

    // 3. Determine Varshesha (Year Lord)
    // Classical Rule (Tajika Neelakanthi & Dr. B.V. Raman):
    // The candidate among the 5 office-bearers who aspects the Varsha Lagna
    // and has the highest strength is selected.
    const aspectingCandidates = candidates.filter((c) => c.aspectsVarshaLagna);
    let chosen: PanchadhikariCandidate;
    let reason = '';

    if (aspectingCandidates.length > 0) {
      // Sort descending by Harsha Bala score
      aspectingCandidates.sort((a, b) => b.harshaBalaScore - a.harshaBalaScore);
      chosen = aspectingCandidates[0];
      reason = `${chosen.planet} (${chosen.roleTitle}) aspects Varsha Lagna (placed in house ${chosen.houseInVarshaChart}) with highest Harsha Bala (${chosen.harshaBalaScore}/20).`;
    } else {
      // Fallback: highest Harsha Bala among all candidates
      const sorted = [...candidates].sort((a, b) => b.harshaBalaScore - a.harshaBalaScore);
      chosen = sorted[0];
      reason = `No Panchadhikari candidate directly aspects Varsha Lagna; ${chosen.planet} (${chosen.roleTitle}) selected based on highest Harsha Bala (${chosen.harshaBalaScore}/20).`;
    }

    const varshesha: VarsheshaDetails = {
      selectedVarshesha: chosen.planet,
      role: chosen.role,
      selectionReason: reason,
      aspectsVarshaLagna: chosen.aspectsVarshaLagna,
      harshaBalaScore: chosen.harshaBalaScore,
      candidates,
      convention: 'TAJIKA_NEELAKANTHI_RAMAN',
    };

    return {
      panchadhikari,
      varshesha,
    };
  }

  /**
   * Static helper to compute Panchadhikari and Varshesha from annual chart, natal chart, and Muntha.
   */
  public static calculate(
    annualChart: AstroChart,
    natalChart: AstroChart,
    muntha: MunthaDetails,
    harshaBala: HarshaBalaScores
  ): { panchadhikari: PanchadhikariDetails; varshesha: VarsheshaDetails } {
    const calc = new PanchadhikariCalculator();
    const natalLagnaRashi = natalChart.ascendant?.rashiIndex ?? 1;
    const varshaLagnaRashi = annualChart.ascendant?.rashiIndex ?? 1;

    return calc.evaluatePanchadhikariAndVarshesha(
      natalLagnaRashi,
      varshaLagnaRashi,
      muntha.rashiIndex,
      annualChart.planets,
      harshaBala
    );
  }
}

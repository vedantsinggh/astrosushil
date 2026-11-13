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
    const isUntimedNatal = natalLagnaRashiIndex <= 0;
    const isUntimedMuntha = munthaRashiIndex <= 0;

    const varshaLagnesha = RASHIS[varshaLagnaRashiIndex - 1].ruler as PlanetSymbol;
    const janmesha = !isUntimedNatal ? (RASHIS[natalLagnaRashiIndex - 1].ruler as PlanetSymbol) : ('' as any);
    const munthesha = !isUntimedMuntha ? (RASHIS[munthaRashiIndex - 1].ruler as PlanetSymbol) : ('' as any);
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
        isIndeterminate: false,
      },
      {
        role: 'JANMESHA' as const,
        roleTitle: 'Natal Lagna Lord',
        planet: janmesha,
        sourceDescription: !isUntimedNatal
          ? `Ruler of Natal Ascendant (${RASHIS[natalLagnaRashiIndex - 1].englishName})`
          : 'Natal Lagna Lord unavailable for untimed birth profile',
        isIndeterminate: isUntimedNatal,
      },
      {
        role: 'MUNTHESHA' as const,
        roleTitle: 'Muntha Lord',
        planet: munthesha,
        sourceDescription: !isUntimedMuntha
          ? `Ruler of Muntha Sign (${RASHIS[munthaRashiIndex - 1].englishName})`
          : 'Muntha Lord unavailable because Muntha depends on Natal Lagna',
        isIndeterminate: isUntimedMuntha,
      },
      {
        role: 'TRIRASHISHA' as const,
        roleTitle: 'Tri-Rashi Lord',
        planet: trirashisha,
        sourceDescription: `Tri-Rashi table ruler for ${isDayReturn ? 'Day' : 'Night'} return in ${RASHIS[varshaLagnaRashiIndex - 1].englishName}`,
        isIndeterminate: false,
      },
      {
        role: 'DINA_RATRI_PATI' as const,
        roleTitle: isDayReturn ? 'Dina Pati (Day Lord)' : 'Ratri Pati (Night Lord)',
        planet: dinaRatriPati,
        sourceDescription: isDayReturn
          ? `Ruler of Sun sign (${RASHIS[sunRashi - 1].englishName}) for Day Return`
          : `Ruler of Moon sign (${RASHIS[moonRashi - 1].englishName}) for Night Return`,
        isIndeterminate: false,
      },
    ];

    const candidates: PanchadhikariCandidate[] = candidateDefs.map((def) => {
      if (def.isIndeterminate || !def.planet) {
        return {
          role: def.role,
          roleTitle: def.roleTitle,
          planet: '' as any,
          sourceDescription: def.sourceDescription,
          aspectsVarshaLagna: false,
          aspectToVarshaLagna: 0,
          harshaBalaScore: 0,
          houseInVarshaChart: 0,
          isIndeterminate: true,
        };
      }

      const pos = planets[def.planet];
      const rashi = pos?.rashiIndex ?? 1;
      // House placement in the chart (Lagna to Planet)
      const houseInVarsha = ((rashi - varshaLagnaRashiIndex + 12) % 12) + 1;
      // Aspect cast FROM Planet TO Varsha Lagna (Planet to Lagna)
      const aspectToVarshaLagna = ((varshaLagnaRashiIndex - rashi + 12) % 12) + 1;
      const aspectsVarshaLagna = TAJIKA_ASPECTING_HOUSES.has(aspectToVarshaLagna);
      const score = harshaBala[def.planet]?.totalScore ?? 0;

      return {
        role: def.role,
        roleTitle: def.roleTitle,
        planet: def.planet,
        sourceDescription: def.sourceDescription,
        aspectsVarshaLagna,
        aspectToVarshaLagna,
        harshaBalaScore: score,
        houseInVarshaChart: houseInVarsha,
        isIndeterminate: false,
      };
    });

    const panchadhikari: PanchadhikariDetails = {
      isDayReturn,
      sunHouseInVarshaChart: sunHouse,
      candidates,
    };

    // 3. Determine Varshesha (Year Lord)
    // Classical Rule (Tajika Neelakanthi & Dr. B.V. Raman):
    // The candidate among the 5 office-bearers who casts an authentic Tajika aspect onto
    // the Varsha Lagna and has the highest strength is selected.
    const aspectingCandidates = candidates.filter((c) => !c.isIndeterminate && c.aspectsVarshaLagna);
    let chosen: PanchadhikariCandidate;
    let reason = '';

    // Classical precedence order for tie-breaking:
    // 1. Count of offices held (multiple qualification)
    // 2. Classical office hierarchy: Varsha Lagnesha > Janmesha > Munthesha > Trirashisha > Dina/Ratri Pati
    const ROLE_PRIORITY: Record<string, number> = {
      VARSHA_LAGNESHA: 1,
      JANMESHA: 2,
      MUNTHESHA: 3,
      TRIRASHISHA: 4,
      DINA_RATRI_PATI: 5,
    };

    // Calculate office counts for each planet among non-indeterminate candidates
    const officeCounts: Record<string, number> = {};
    for (const c of candidates) {
      if (!c.isIndeterminate && c.planet) {
        officeCounts[c.planet] = (officeCounts[c.planet] || 0) + 1;
      }
    }

    const sortCandidates = (a: PanchadhikariCandidate, b: PanchadhikariCandidate) => {
      // 1. Highest Harsha Bala score
      if (b.harshaBalaScore !== a.harshaBalaScore) {
        return b.harshaBalaScore - a.harshaBalaScore;
      }
      // 2. Count of offices held (multiple portfolios)
      const countA = officeCounts[a.planet] || 0;
      const countB = officeCounts[b.planet] || 0;
      if (countB !== countA) {
        return countB - countA;
      }
      // 3. Office precedence hierarchy
      return (ROLE_PRIORITY[a.role] ?? 99) - (ROLE_PRIORITY[b.role] ?? 99);
    };

    if (aspectingCandidates.length > 0) {
      aspectingCandidates.sort(sortCandidates);
      chosen = aspectingCandidates[0];
      const count = officeCounts[chosen.planet] || 1;
      const multiNote = count > 1 ? ` (holding ${count} Panchadhikari portfolios)` : '';
      reason = `${chosen.planet} (${chosen.roleTitle})${multiNote} casts a ${chosen.aspectToVarshaLagna}th-sign Tajika aspect onto Varsha Lagna (situated in house ${chosen.houseInVarshaChart}) with highest Harsha Bala (${chosen.harshaBalaScore}/20).`;
    } else {
      // Fallback: available candidates without aspect
      const validCandidates = candidates.filter((c) => !c.isIndeterminate && c.planet);
      if (validCandidates.length > 0) {
        validCandidates.sort(sortCandidates);
        chosen = validCandidates[0];
        reason = `No Panchadhikari candidate directly aspects Varsha Lagna; ${chosen.planet} (${chosen.roleTitle}) selected based on highest Harsha Bala (${chosen.harshaBalaScore}/20).`;
      } else {
        chosen = {
          role: 'VARSHA_LAGNESHA',
          roleTitle: 'Varsha Lagna Lord',
          planet: '' as any,
          sourceDescription: 'Indeterminate: No available Panchadhikari candidates',
          aspectsVarshaLagna: false,
          aspectToVarshaLagna: 0,
          harshaBalaScore: 0,
          houseInVarshaChart: 0,
          isIndeterminate: true,
        };
        reason = 'Indeterminate: No available Panchadhikari candidate could be established.';
      }
    }

    const varshesha: VarsheshaDetails = {
      selectedVarshesha: chosen.planet,
      role: chosen.role,
      selectionReason: reason,
      aspectsVarshaLagna: chosen.aspectsVarshaLagna,
      harshaBalaScore: chosen.harshaBalaScore,
      candidates,
      convention: 'TAJIKA_NEELAKANTHI_RAMAN',
      isIndeterminate: chosen.isIndeterminate,
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

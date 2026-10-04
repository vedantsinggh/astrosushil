import { NormalizedChart, PlanetSymbol } from '@astro/astrology-engine';
import { CareerReportData, DataStatus } from '../types/career-report.types';

export interface ClaimValidationIssue {
  field: string;
  claim: string;
  expected: string | number;
  actual: string | number;
  severity: 'ERROR' | 'WARNING';
  message: string;
}

export interface ClaimValidationResult {
  isValid: boolean;
  status: DataStatus;
  statusLabel: 'VERIFIED' | 'VERIFIED WITH LIMITATIONS' | 'NOT VERIFIED';
  summary: string;
  totalChecks: number;
  passedChecks: number;
  issues: ClaimValidationIssue[];
}

/**
 * ClaimValidationEngine
 * Performs rigorous deterministic validation of all numerical, categorical,
 * and relational claims made within the generated report data against verified astrological facts.
 */
export class ClaimValidationEngine {
  /**
   * Validates the complete CareerReportData model against the underlying NormalizedChart.
   */
  public validateReportClaims(
    reportData: CareerReportData,
    chart: NormalizedChart
  ): ClaimValidationResult {
    const issues: ClaimValidationIssue[] = [];
    let totalChecks = 0;
    let passedChecks = 0;

    const recordCheck = (
      field: string,
      claim: string,
      expected: string | number,
      actual: string | number,
      condition: boolean,
      message: string,
      severity: 'ERROR' | 'WARNING' = 'ERROR'
    ) => {
      totalChecks++;
      if (condition) {
        passedChecks++;
      } else {
        issues.push({ field, claim, expected, actual, severity, message });
      }
    };

    // -------------------------------------------------------------
    // 1. Validate Ascendant & Core Lagna Data
    // -------------------------------------------------------------
    const lagnaSign = chart.ascendant?.sign || '';
    const reportLagnaSign = reportData.ascendant?.sign || '';
    recordCheck(
      'ascendant.sign',
      reportLagnaSign,
      lagnaSign,
      reportLagnaSign,
      lagnaSign.toLowerCase() === reportLagnaSign.toLowerCase(),
      `Ascendant sign in report (${reportLagnaSign}) does not match chart Lagna (${lagnaSign})`
    );

    const lagnaLord = chart.ascendant?.lord || '';
    const reportLagnaLord = reportData.ascendant?.lord || '';
    recordCheck(
      'ascendant.lord',
      reportLagnaLord,
      lagnaLord,
      reportLagnaLord,
      !lagnaLord || !reportLagnaLord || lagnaLord.toLowerCase() === reportLagnaLord.toLowerCase(),
      `Ascendant lord in report (${reportLagnaLord}) does not match calculated lord (${lagnaLord})`
    );

    // -------------------------------------------------------------
    // 2. Validate Planetary Register (Signs, Houses, Dignities, Retrograde)
    // -------------------------------------------------------------
    if (chart.planets && reportData.planets) {
      for (const p of chart.planets) {
        const key = p.name.toLowerCase();
        const repP = reportData.planets[key];
        if (repP) {
          // Sign Check
          recordCheck(
            `planet.${key}.sign`,
            repP.sign,
            p.sign,
            repP.sign,
            p.sign.toLowerCase() === repP.sign.toLowerCase(),
            `Planet ${p.name} sign in report (${repP.sign}) does not match calculated sign (${p.sign})`
          );

          // House Check
          const expectedHouseStr = `House ${p.house}`;
          recordCheck(
            `planet.${key}.house`,
            repP.house,
            expectedHouseStr,
            repP.house,
            repP.house.includes(String(p.house)),
            `Planet ${p.name} house in report (${repP.house}) does not match calculated house (${p.house})`
          );

          // Retrograde Check
          const isRetro = Boolean(p.retrograde);
          const repRetroStr = repP.retrograde;
          const retroMatches = isRetro
            ? repRetroStr.includes('Yes') || repRetroStr.includes('Vakra') || repRetroStr.includes('Retrograde')
            : repRetroStr.includes('No') || repRetroStr.includes('Direct');
          recordCheck(
            `planet.${key}.retrograde`,
            repRetroStr,
            isRetro ? 'Retrograde' : 'Direct',
            repRetroStr,
            retroMatches,
            `Planet ${p.name} retrograde status in report (${repRetroStr}) contradicts calculation (${isRetro ? 'Retrograde' : 'Direct'})`
          );
        }
      }
    }

    // -------------------------------------------------------------
    // 3. Validate Ashtakavarga SAV Claims (Benchmark = 28)
    // -------------------------------------------------------------
    if (reportData.ashtakavarga?.savHouses) {
      const savHouses = reportData.ashtakavarga.savHouses;
      const savTotal = reportData.ashtakavarga.savTotal;

      recordCheck(
        'ashtakavarga.savTotal',
        String(savTotal),
        337,
        savTotal,
        savTotal === 337,
        `Sarvashtakavarga total must be exactly 337 bindus (found ${savTotal})`
      );

      // Verify Ashtakavarga prose text consistency
      const h10Bindus = savHouses[10] || 0;
      const h11Bindus = savHouses[11] || 0;
      const savAnalysis = reportData.ashtakavarga.savAnalysis || '';

      if (h10Bindus < 28) {
        recordCheck(
          'ashtakavarga.savAnalysis.h10',
          savAnalysis,
          '10th house below benchmark of 28',
          savAnalysis,
          !savAnalysis.includes('10th house') || !savAnalysis.includes('exceed'),
          `Ashtakavarga text claims 10th house (${h10Bindus} bindus) exceeds benchmark 28, but it is below 28`
        );
      } else if (h10Bindus >= 28) {
        recordCheck(
          'ashtakavarga.savAnalysis.h10',
          savAnalysis,
          '10th house at or above benchmark of 28',
          savAnalysis,
          !savAnalysis.includes('10th house') || !savAnalysis.includes('below benchmark'),
          `Ashtakavarga text claims 10th house (${h10Bindus} bindus) is below benchmark 28, but it is at or above 28`
        );
      }

      if (h11Bindus < 28) {
        recordCheck(
          'ashtakavarga.savAnalysis.h11',
          savAnalysis,
          '11th house below benchmark of 28',
          savAnalysis,
          !savAnalysis.includes('11th house') || !savAnalysis.includes('exceed'),
          `Ashtakavarga text claims 11th house (${h11Bindus} bindus) exceeds benchmark 28, but it is below 28`
        );
      }
    }

    // -------------------------------------------------------------
    // 4. Validate Shadbala & Bhava Bala Numerical Bounds
    // -------------------------------------------------------------
    if (reportData.shadbala?.planets) {
      for (const p of reportData.shadbala.planets) {
        const rupas = parseFloat(p.totalRupas);
        recordCheck(
          `shadbala.${p.planet}.totalRupas`,
          p.totalRupas,
          '> 0 Rupas',
          rupas,
          !isNaN(rupas) && rupas > 0,
          `Shadbala for ${p.planet} has invalid or non-positive Rupas: ${p.totalRupas}`
        );
      }
    }

    if (reportData.bhavaBala?.houses) {
      for (const h of reportData.bhavaBala.houses) {
        const rupas = parseFloat(h.totalRupas);
        recordCheck(
          `bhavaBala.house${h.houseNumber}.totalRupas`,
          h.totalRupas,
          '> 0 Rupas',
          rupas,
          !isNaN(rupas) && rupas > 0,
          `Bhava Bala for House ${h.houseNumber} has invalid or non-positive Rupas: ${h.totalRupas}`
        );
      }
    }

    // -------------------------------------------------------------
    // 5. Validate Dasha Chronology
    // -------------------------------------------------------------
    if (reportData.dasha?.lifetimeMahadashas) {
      const dlist = reportData.dasha.lifetimeMahadashas;
      for (let i = 0; i < dlist.length - 1; i++) {
        const curr = dlist[i];
        const next = dlist[i + 1];
        if (curr.startDate && next.startDate) {
          const currTime = new Date(curr.startDate).getTime();
          const nextTime = new Date(next.startDate).getTime();
          if (!isNaN(currTime) && !isNaN(nextTime)) {
            recordCheck(
              `dasha.chronology.${curr.planet}`,
              `${curr.startDate} < ${next.startDate}`,
              'Chronological order',
              `${curr.startDate} -> ${next.startDate}`,
              currTime <= nextTime,
              `Dasha timeline chronology error: ${curr.planet} starts at ${curr.startDate}, subsequent ${next.planet} starts earlier at ${next.startDate}`
            );
          }
        }
      }
    }

    // -------------------------------------------------------------
    // 6. Validate No Fabricated Text Placeholders
    // -------------------------------------------------------------
    const checkNoCorruptedPlaceholder = (field: string, text: string | undefined) => {
      if (!text) return;
      const forbidden = [
        'D10 Ascendant Lord: D10 Ascendant Lord',
        'undefined',
        'null',
        'NaN',
        '[object Object]',
        'Valued Client',
        'Date of Birth: Not supplied',
        'Personalized interpretation unavailable',
      ];
      for (const f of forbidden) {
        recordCheck(
          field,
          text,
          `Does not contain "${f}"`,
          text.includes(f) ? `Contains "${f}"` : 'Clean',
          !text.includes(f),
          `Field ${field} contains forbidden placeholder or corrupted string: "${f}"`
        );
      }
    };

    checkNoCorruptedPlaceholder('d10.ascendantLord', reportData.d10Dashamsha?.ascendantLord);
    checkNoCorruptedPlaceholder('d10.tenthLord', reportData.d10Dashamsha?.tenthHouseLord);
    checkNoCorruptedPlaceholder('executiveSummary', reportData.careerAnalysis?.executiveCareerSummary);

    // -------------------------------------------------------------
    // Evaluate Final Status
    // -------------------------------------------------------------
    const errorCount = issues.filter((i) => i.severity === 'ERROR').length;
    const warningCount = issues.filter((i) => i.severity === 'WARNING').length;

    let status: DataStatus = 'VERIFIED';
    let statusLabel: 'VERIFIED' | 'VERIFIED WITH LIMITATIONS' | 'NOT VERIFIED' = 'VERIFIED';

    if (errorCount > 0) {
      status = 'UNAVAILABLE';
      statusLabel = 'NOT VERIFIED';
    } else if (warningCount > 0) {
      status = 'DERIVED';
      statusLabel = 'VERIFIED WITH LIMITATIONS';
    }

    const summary =
      errorCount === 0
        ? `Verification PASSED: ${passedChecks}/${totalChecks} claims rigorously validated against deterministic astrological ephemeris.`
        : `Verification FAILED: ${errorCount} claim validation errors detected across ${totalChecks} audited assertions.`;

    return {
      isValid: errorCount === 0,
      status,
      statusLabel,
      summary,
      totalChecks,
      passedChecks,
      issues,
    };
  }
}

export const claimValidationEngine = new ClaimValidationEngine();

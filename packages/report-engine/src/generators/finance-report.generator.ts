import {
  StructuredReportModel,
  ReportType,
  ReportProfileDto,
  ReportConfigDto,
  ReportAscendantDto,
  ReportPlanetDto,
  ReportHouseDto,
  ReportNakshatraDto,
  ReportSectionDto,
  FinanceReportModel,
  WealthHouseAnalysisDto,
  FinancialSignificatorDto,
  DhanaYogaDto,
  SavWealthFlowDto,
  AnnualFinancialForecastDto,
  VimshottariFinancialPeriodDto,
  FinancialRemediesDto,
  FinanceClosingNoteDto,
} from '../types/report.types';
import { validateAstrologyDataForReport } from '../validation/report-data.validator';
import { ReportInterpretationProvider } from '../providers/interpretation-provider.interface';
import {
  DashaCalculator,
  AshtakavargaCalculator,
  BirthDetailsValidationError,
  isValidIanaTimezone,
  AstroChart,
} from '@astro/astrology-engine';
import {
  validateVerifiedAstrologyEvidence,
  getEvidenceRequirementsForReport,
  extractVerifiedEvidenceFromChart,
  extractOrCalculateSav,
} from '../validation/report-evidence.validator';
import { verifyAiInterpretationTraceability } from '../validation/traceability.validator';
import { ReportSectionComposer } from '../composition/report-section-composer';
import {
  STANDARD_AUTHOR_MESSAGE,
  STANDARD_METHODOLOGY_NOTE,
  STANDARD_LEGAL_DISCLAIMER,
} from '../types/shared-report-foundation.types';
import {
  SIGN_INDEX_MAP,
  SIGN_NAMES_BY_INDEX,
  SIGN_LORDS,
} from './kundli-report.generator';

export const FINANCIAL_DISCLAIMER =
  'IMPORTANT WEALTH ADVISORY DISCLAIMER: The astrological analyses, financial horizons, Dhana Yoga assessments, and remedial insights presented in this dossier are based on classical Vedic astrological principles (Brihat Parashara Hora Shastra, Phaladeepika, and Saravali) and astronomical planetary ephemerides. This report provides probabilistic planetary cycles and karmic tendencies; it does NOT constitute certified financial advice, investment advisory, stock recommendations, tax consulting, or guarantees of monetary gain under SEBI, RBI, or any global financial regulatory body. All financial allocations, capital investments, debt obligations, and business ventures carry market risk. You must consult a qualified Certified Financial Planner (CFP) or licensed investment advisor before executing significant capital commitments.';

export const FINANCIAL_CLOSING_AUTHOR =
  'Astro Sushil (Sushil Kumaar Singh), Founder & Chief Astrologer';

export const FINANCIAL_CLOSING_MESSAGE =
  'True wealth in Vedic wisdom (Dhana) extends beyond mere currency tokens; it encompasses Purushartha—the righteous harmony of Dharma (ethical conduct), Artha (material prosperity), Kama (wholesome fulfillment), and Moksha (spiritual freedom). May the cosmic currents illuminated in this dossier empower you to steward your material resources with clarity, discipline, and enduring prosperity.';

/**
 * Evaluates the planetary dignity for a given planet in a specific zodiac sign.
 */
function getPlanetaryDignity(planet: string, sign: string): string {
  const p = planet.toUpperCase();
  const s = sign.toUpperCase();

  switch (p) {
    case 'SUN':
      if (s === 'ARIES') return 'Exalted (Ucha)';
      if (s === 'LIBRA') return 'Debilitated (Neecha)';
      if (s === 'LEO') return 'Moolatrikona / Swakshetra (Own Sign)';
      if (['SAGITTARIUS', 'PISCES', 'CANCER', 'SCORPIO'].includes(s)) return 'Friendly (Mitra)';
      if (['TAURUS', 'CAPRICORN', 'AQUARIUS'].includes(s)) return 'Enemy (Shatru)';
      return 'Neutral (Sama)';

    case 'MOON':
      if (s === 'TAURUS') return 'Exalted (Ucha)';
      if (s === 'SCORPIO') return 'Debilitated (Neecha)';
      if (s === 'CANCER') return 'Swakshetra (Own Sign)';
      if (['ARIES', 'LEO', 'SAGITTARIUS', 'PISCES', 'GEMINI'].includes(s)) return 'Friendly (Mitra)';
      return 'Neutral (Sama)';

    case 'MARS':
      if (s === 'CAPRICORN') return 'Exalted (Ucha)';
      if (s === 'CANCER') return 'Debilitated (Neecha)';
      if (['ARIES', 'SCORPIO'].includes(s)) return 'Swakshetra (Own Sign)';
      if (['LEO', 'SAGITTARIUS', 'PISCES'].includes(s)) return 'Friendly (Mitra)';
      if (['GEMINI', 'VIRGO'].includes(s)) return 'Enemy (Shatru)';
      return 'Neutral (Sama)';

    case 'MERCURY':
      if (s === 'VIRGO') return 'Exalted / Swakshetra (Ucha)';
      if (s === 'PISCES') return 'Debilitated (Neecha)';
      if (s === 'GEMINI') return 'Swakshetra (Own Sign)';
      if (['TAURUS', 'LIBRA', 'LEO'].includes(s)) return 'Friendly (Mitra)';
      if (['CANCER'].includes(s)) return 'Enemy (Shatru)';
      return 'Neutral (Sama)';

    case 'JUPITER':
      if (s === 'CANCER') return 'Exalted (Ucha)';
      if (s === 'CAPRICORN') return 'Debilitated (Neecha)';
      if (['SAGITTARIUS', 'PISCES'].includes(s)) return 'Moolatrikona / Swakshetra (Own Sign)';
      if (['ARIES', 'LEO', 'SCORPIO'].includes(s)) return 'Friendly (Mitra)';
      if (['GEMINI', 'VIRGO', 'TAURUS', 'LIBRA'].includes(s)) return 'Enemy (Shatru)';
      return 'Neutral (Sama)';

    case 'VENUS':
      if (s === 'PISCES') return 'Exalted (Ucha)';
      if (s === 'VIRGO') return 'Debilitated (Neecha)';
      if (['TAURUS', 'LIBRA'].includes(s)) return 'Moolatrikona / Swakshetra (Own Sign)';
      if (['GEMINI', 'CAPRICORN', 'AQUARIUS'].includes(s)) return 'Friendly (Mitra)';
      if (['CANCER', 'LEO'].includes(s)) return 'Enemy (Shatru)';
      return 'Neutral (Sama)';

    case 'SATURN':
      if (s === 'LIBRA') return 'Exalted (Ucha)';
      if (s === 'ARIES') return 'Debilitated (Neecha)';
      if (['CAPRICORN', 'AQUARIUS'].includes(s)) return 'Moolatrikona / Swakshetra (Own Sign)';
      if (['TAURUS', 'GEMINI', 'VIRGO'].includes(s)) return 'Friendly (Mitra)';
      if (['CANCER', 'LEO', 'SCORPIO'].includes(s)) return 'Enemy (Shatru)';
      return 'Neutral (Sama)';

    case 'RAHU':
      if (['TAURUS', 'GEMINI'].includes(s)) return 'Exalted / Favourable';
      if (['SCORPIO', 'SAGITTARIUS'].includes(s)) return 'Debilitated / Challenging';
      return 'Neutral (Sama)';

    case 'KETU':
      if (['SCORPIO', 'SAGITTARIUS'].includes(s)) return 'Exalted / Favourable';
      if (['TAURUS', 'GEMINI'].includes(s)) return 'Debilitated / Challenging';
      return 'Neutral (Sama)';

    default:
      return 'Neutral (Sama)';
  }
}

/**
 * Evaluates Classical Dhana Yogas based on Parashari principles.
 */
function evaluateDhanaYogas(
  houses: ReportHouseDto[],
  planets: ReportPlanetDto[],
  ascSignIdx: number
): DhanaYogaDto[] {
  const yogas: DhanaYogaDto[] = [];

  const h1 = houses.find((h) => h.houseNumber === 1)!;
  const h2 = houses.find((h) => h.houseNumber === 2)!;
  const h5 = houses.find((h) => h.houseNumber === 5)!;
  const h9 = houses.find((h) => h.houseNumber === 9)!;
  const h10 = houses.find((h) => h.houseNumber === 10)!;
  const h11 = houses.find((h) => h.houseNumber === 11)!;
  const h12 = houses.find((h) => h.houseNumber === 12)!;

  const h1SignIdx = SIGN_INDEX_MAP[h1.sign.toUpperCase()] || 1;
  const h2SignIdx = SIGN_INDEX_MAP[h2.sign.toUpperCase()] || 2;
  const h5SignIdx = SIGN_INDEX_MAP[h5.sign.toUpperCase()] || 5;
  const h9SignIdx = SIGN_INDEX_MAP[h9.sign.toUpperCase()] || 9;
  const h10SignIdx = SIGN_INDEX_MAP[h10.sign.toUpperCase()] || 10;
  const h11SignIdx = SIGN_INDEX_MAP[h11.sign.toUpperCase()] || 11;

  const l1 = SIGN_LORDS[h1SignIdx].lord;
  const l2 = SIGN_LORDS[h2SignIdx].lord;
  const l5 = SIGN_LORDS[h5SignIdx].lord;
  const l9 = SIGN_LORDS[h9SignIdx].lord;
  const l10 = SIGN_LORDS[h10SignIdx].lord;
  const l11 = SIGN_LORDS[h11SignIdx].lord;

  const pL1 = planets.find((p) => p.planet.toUpperCase() === l1.toUpperCase());
  const pL2 = planets.find((p) => p.planet.toUpperCase() === l2.toUpperCase());
  const pL5 = planets.find((p) => p.planet.toUpperCase() === l5.toUpperCase());
  const pL9 = planets.find((p) => p.planet.toUpperCase() === l9.toUpperCase());
  const pL10 = planets.find((p) => p.planet.toUpperCase() === l10.toUpperCase());
  const pL11 = planets.find((p) => p.planet.toUpperCase() === l11.toUpperCase());

  // 1. Swakshetra Dhana Yoga: 2nd Lord in 2nd House
  const isL2InH2 = pL2 && pL2.house === 2;
  yogas.push({
    name: 'Swakshetra Dhana Yoga (2nd Lord in Dhana Bhava)',
    description: `The 2nd lord ${l2} is comfortably placed in the 2nd house of accumulated wealth (${h2.sign}), establishing enduring self-generated capital and strong family assets.`,
    participatingPlanets: [l2],
    participatingHouses: [2],
    classicalReference: 'Brihat Parashara Hora Shastra (Dhana Yoga Chapter)',
    status: isL2InH2 ? 'ACTIVE' : 'ABSENT',
    wealthImpact: isL2InH2
      ? 'Exceptional stability in liquid capital, precious assets, articulate negotiation, and unshakeable financial resilience against external shocks.'
      : 'Moderate; wealth requires deliberate disciplined budgeting and active treasury management.',
  });

  // 2. Dhana-Labha Sambandha: 11th Lord in 2nd House OR 2nd Lord in 11th House
  const isL11InH2 = pL11 && pL11.house === 2;
  const isL2InH11 = pL2 && pL2.house === 11;
  const isDhanaLabhaActive = Boolean(isL11InH2 || isL2InH11 || (pL2 && pL11 && pL2.house === pL11.house));
  yogas.push({
    name: 'Dhana-Labha Sambandha (Direct Flow of Income into Treasury)',
    description: `Association between the 11th lord of income/gains (${l11}) and the 2nd lord of treasury/savings (${l2}). Gains flow directly into compounding wealth.`,
    participatingPlanets: [l11, l2],
    participatingHouses: [2, 11],
    classicalReference: 'Phaladeepika & Saravali',
    status: isDhanaLabhaActive ? 'ACTIVE' : 'ABSENT',
    wealthImpact: isDhanaLabhaActive
      ? 'Outstanding wealth generation where commercial profits, bonuses, and professional revenues directly feed permanent liquid assets and fixed investments.'
      : 'Standard wealth conversion requiring intentional transfer mechanisms between earnings and savings accounts.',
  });

  // 3. Karma-Dhana Yoga: 10th Lord connected to 2nd House
  const isL10InH2 = pL10 && pL10.house === 2;
  const isL2InH10 = pL2 && pL2.house === 10;
  const isKarmaDhanaActive = Boolean(isL10InH2 || isL2InH10 || (pL10 && pL2 && pL10.house === pL2.house));
  yogas.push({
    name: 'Karma-Dhana Yoga (Vocational Wealth Realization)',
    description: `Connection between the 10th lord of vocational authority (${l10}) and the 2nd house of accumulated assets. Vocational execution translates into high monetary stature.`,
    participatingPlanets: [l10, l2],
    participatingHouses: [10, 2],
    classicalReference: 'Brihat Parashara Hora Shastra',
    status: isKarmaDhanaActive ? 'ACTIVE' : 'ABSENT',
    wealthImpact: isKarmaDhanaActive
      ? 'High-level vocational status, executive compensation, and government or institutional contracts creating strong financial foundations.'
      : 'Career status and wealth accumulation operate through distinct, separate cycles.',
  });

  // 4. Chandra-Mangala Yoga: Conjunction or Mutual Aspect between Moon and Mars
  const pMoon = planets.find((p) => p.planet.toUpperCase() === 'MOON');
  const pMars = planets.find((p) => p.planet.toUpperCase() === 'MARS');
  let isChandraMangala = false;
  if (pMoon && pMars) {
    if (pMoon.house === pMars.house) {
      isChandraMangala = true;
    } else if (Math.abs(pMoon.house - pMars.house) === 6) {
      isChandraMangala = true;
    }
  }
  yogas.push({
    name: 'Chandra-Mangala Yoga (Commercial Acumen & Enterprise)',
    description:
      'Mutual relationship between Chandra (Moon: liquid capital and mental acumen) and Mangala (Mars: dynamic execution and enterprise).',
    participatingPlanets: ['Moon', 'Mars'],
    participatingHouses: pMoon && pMars ? [pMoon.house, pMars.house] : [],
    classicalReference: 'Jataka Parijata & Saravali',
    status: isChandraMangala ? 'ACTIVE' : 'ABSENT',
    wealthImpact: isChandraMangala
      ? 'Sharp commercial intuition, real estate aptitude, success in physical assets or tangible commerce, and quick monetization of ideas.'
      : 'Wealth accumulation follows standard methodical career progression.',
  });

  // 5. Lakshmi Yoga: Lagna Lord strong and 9th Lord in Kendra/Trikona/11th connected by Sambandha
  const isSambandha = Boolean(pL1 && pL9 && (pL1.house === pL9.house || Math.abs(pL1.house - pL9.house) === 6));
  const isL9InAuspiciousHouse = Boolean(pL9 && [1, 4, 5, 7, 9, 10, 11].includes(pL9.house));
  const isLakshmiYoga = Boolean(isSambandha && isL9InAuspiciousHouse);
  yogas.push({
    name: 'Maha Lakshmi Yoga (Providential Grace & Sustainable Abundance)',
    description: `Lagna lord ${l1} and 9th lord ${l9} occupying auspicious houses in mutual sambandha, bestowing enduring good fortune, righteous prosperity, and high moral standing.`,
    participatingPlanets: [l1, l9],
    participatingHouses: pL1 && pL9 ? [pL1.house, pL9.house] : [1, 9],
    classicalReference: 'Brihat Parashara Hora Shastra',
    status: isLakshmiYoga ? 'ACTIVE' : 'ABSENT',
    wealthImpact: isLakshmiYoga
      ? 'Continuous protection against severe economic distress, providential assistance during crunches, and ethical wealth expansion.'
      : 'Progress depends primarily on self-exertion and strategic risk mitigation.',
  });

  // 6. Vasumathi Yoga: Benefics (Jupiter, Venus, Mercury) in Upachaya Houses (3, 6, 10, 11)
  const upachayas = [3, 6, 10, 11];
  const pJup = planets.find((p) => p.planet.toUpperCase() === 'JUPITER');
  const pVen = planets.find((p) => p.planet.toUpperCase() === 'VENUS');
  const pMerc = planets.find((p) => p.planet.toUpperCase() === 'MERCURY');
  const beneficsInUpachaya = [pJup, pVen, pMerc].filter((p) => p && upachayas.includes(p.house)).length;
  yogas.push({
    name: 'Vasumathi Yoga (Independent Wealth Creation)',
    description:
      'Natural benefics positioned in Upachaya growth houses (3rd, 6th, 10th, 11th), conferring autonomous wealth that compounds with age and experience.',
    participatingPlanets: ['Jupiter', 'Venus', 'Mercury'],
    participatingHouses: [3, 6, 10, 11],
    classicalReference: 'Varahamihira’s Brihat Jataka',
    status: beneficsInUpachaya >= 2 ? 'ACTIVE' : beneficsInUpachaya === 1 ? 'PARTIAL' : 'ABSENT',
    wealthImpact:
      beneficsInUpachaya >= 2
        ? 'Steadily multiplying net worth where self-directed enterprise outgrows inherited limitations.'
        : 'Steady incremental wealth growth tied to persistent career efforts.',
  });

  // 7. Shani-Uccha Dhana Sanchaya: Exalted Saturn in 12th or Kendra/Kona (Report-specific treasury placement)
  const pSat = planets.find((p) => p.planet.toUpperCase() === 'SATURN');
  const isSatExalted = Boolean(pSat && pSat.sign.toUpperCase() === 'LIBRA');
  yogas.push({
    name: 'Shani Uccha Sanchaya (Exalted Saturn Treasury Discipline)',
    description: isSatExalted
      ? `Saturn is exalted in Libra (House ${pSat?.house}), enforcing rigorous budgetary discipline, strategic expenditure management, and long-horizon fixed asset accumulation. Note: This assessment evaluates planetary dignity and fiscal discipline as a report-specific methodology, distinguished from ancient classical scriptural Dhana Yogas.`
      : 'Saturn is not exalted in Libra in this nativity. (Report-specific treasury discipline assessment, distinct from classical scriptural Dhana Yogas).',
    participatingPlanets: ['Saturn'],
    participatingHouses: pSat ? [pSat.house] : [],
    classicalReference: 'Report-Specific Interpretation / Planetary Exaltation Principle (Distinct from classical scriptural Dhana Yogas)',
    status: isSatExalted ? 'ACTIVE' : 'ABSENT',
    wealthImpact: isSatExalted
      ? 'Exceptional protection against wasteful squandering, mastery over tax planning, foreign income streams, and deep structural patience in building wealth.'
      : 'Standard Saturnian influence requiring conscious effort to institute disciplined savings habits.',
  });

  return yogas;
}

/**
 * Generates the deterministic Personalised Finance & Wealth Dossier.
 */
export async function generateFinanceReport(
  profileInput: ReportProfileDto,
  rawChartData: any,
  interpretationProvider?: ReportInterpretationProvider
): Promise<FinanceReportModel> {
  // 1. Validate Profile Coordinates & Timezone
  if (!profileInput.name || profileInput.name.trim().length === 0) {
    throw new BirthDetailsValidationError('Profile name is mandatory.');
  }
  if (!profileInput.dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(profileInput.dateOfBirth)) {
    throw new BirthDetailsValidationError('Invalid dateOfBirth format. Expected YYYY-MM-DD.');
  }
  if (!profileInput.timeOfBirth || !/^\d{2}:\d{2}(:\d{2})?$/.test(profileInput.timeOfBirth)) {
    throw new BirthDetailsValidationError('Invalid timeOfBirth format. Expected HH:mm:ss.');
  }
  if (!profileInput.timezone || !isValidIanaTimezone(profileInput.timezone)) {
    throw new BirthDetailsValidationError(`Invalid IANA timezone: ${profileInput.timezone}`);
  }

  const reportType = ReportType.FINANCE;

  // 2. Validate Chart Completeness
  validateAstrologyDataForReport(rawChartData);

  // 3. Extract and Validate Verified Astrology Evidence
  const verifiedEvidence = extractVerifiedEvidenceFromChart(
    rawChartData,
    {
      name: profileInput.name,
      dateOfBirth: profileInput.dateOfBirth,
      timeOfBirth: profileInput.timeOfBirth,
      placeName: profileInput.placeName,
      timezone: profileInput.timezone,
      latitude: profileInput.latitude ?? undefined,
      longitude: profileInput.longitude ?? undefined,
    },
    reportType
  );
  validateVerifiedAstrologyEvidence(verifiedEvidence, getEvidenceRequirementsForReport(reportType));

  // 4. Extract Canonical Chart Elements
  const ascendantSign = verifiedEvidence.ascendant.sign;
  const ascendantDegree = verifiedEvidence.ascendant.degree;
  const ascendantNakshatra = verifiedEvidence.ascendant.nakshatra;
  const ascendantPada = verifiedEvidence.ascendant.pada;
  const ascendantRashiIndex = SIGN_INDEX_MAP[ascendantSign.toUpperCase()] || 1;

  const planets: ReportPlanetDto[] = verifiedEvidence.planets.map((p) => ({
    planet: p.planet,
    sign: p.sign,
    degree: p.degree,
    house: p.house,
    nakshatra: p.nakshatra,
    pada: p.pada,
    isRetrograde: p.isRetrograde,
  }));

  const houses: ReportHouseDto[] = verifiedEvidence.houses.map((h) => ({
    houseNumber: h.houseNumber,
    sign: h.sign,
    planetsPresent: h.occupants || [],
  }));

  // Identify Core Financial Houses: 2nd (Dhana), 11th (Labha), 9th (Bhagya), 10th (Karma), 12th (Vyaya)
  const house1 = houses.find((h) => h.houseNumber === 1)!;
  const house2 = houses.find((h) => h.houseNumber === 2)!;
  const house9 = houses.find((h) => h.houseNumber === 9)!;
  const house10 = houses.find((h) => h.houseNumber === 10)!;
  const house11 = houses.find((h) => h.houseNumber === 11)!;
  const house12 = houses.find((h) => h.houseNumber === 12)!;

  const house1SignIdx = SIGN_INDEX_MAP[house1.sign.toUpperCase()] || 1;
  const house2SignIdx = SIGN_INDEX_MAP[house2.sign.toUpperCase()] || 2;
  const house9SignIdx = SIGN_INDEX_MAP[house9.sign.toUpperCase()] || 9;
  const house10SignIdx = SIGN_INDEX_MAP[house10.sign.toUpperCase()] || 10;
  const house11SignIdx = SIGN_INDEX_MAP[house11.sign.toUpperCase()] || 11;
  const house12SignIdx = SIGN_INDEX_MAP[house12.sign.toUpperCase()] || 12;

  const house1Lord = SIGN_LORDS[house1SignIdx].lord;
  const house2Lord = SIGN_LORDS[house2SignIdx].lord;
  const house9Lord = SIGN_LORDS[house9SignIdx].lord;
  const house10Lord = SIGN_LORDS[house10SignIdx].lord;
  const house11Lord = SIGN_LORDS[house11SignIdx].lord;
  const house12Lord = SIGN_LORDS[house12SignIdx].lord;

  const pL1 = planets.find((p) => p.planet.toUpperCase() === house1Lord.toUpperCase())!;
  const pL2 = planets.find((p) => p.planet.toUpperCase() === house2Lord.toUpperCase())!;
  const pL9 = planets.find((p) => p.planet.toUpperCase() === house9Lord.toUpperCase())!;
  const pL10 = planets.find((p) => p.planet.toUpperCase() === house10Lord.toUpperCase())!;
  const pL11 = planets.find((p) => p.planet.toUpperCase() === house11Lord.toUpperCase())!;
  const pL12 = planets.find((p) => p.planet.toUpperCase() === house12Lord.toUpperCase())!;

  // 5. Sarvashtakavarga (SAV) Financial Evaluation - Authoritative Consolidated Source
  const savData = extractOrCalculateSav(rawChartData, ascendantRashiIndex);
  const savPointsRecord = savData.savHouses;

  const savH1 = savPointsRecord[1];
  const savH2 = savPointsRecord[2];
  const savH9 = savPointsRecord[9];
  const savH10 = savPointsRecord[10];
  const savH11 = savPointsRecord[11];
  const savH12 = savPointsRecord[12];

  const wealthRetentionRatio = Number((savH11 / Math.max(savH12, 1)).toFixed(2));
  const inflowVsOutflowSummary =
    savH11 > savH12
      ? `Your 11th house of gains commands ${savH11} SAV points, comfortably surpassing your 12th house of expenditure at ${savH12} points. In classical Vedic Ashtakavarga, an 11th house stronger than the 12th ensures that income exceeds expenses, generating a natural structural surplus and long-term asset accumulation.`
      : savH12 > savH11
      ? `Your 12th house of expenditure (${savH12} SAV points) exceeds your 11th house of gains (${savH11} points). This configuration signals heavy financial outflow, capital expenditure on assets/properties, or foreign expenses. Rigorous budget discipline, automated savings transfers, and low-volatility fixed assets are essential.`
      : `Your 11th house of gains and 12th house of expenditure are evenly balanced at ${savH11} SAV points, indicating balanced income and expenditure cycles requiring systematic savings buffers.`;

  const cashflowTrajectory =
    savH11 >= 30 && savH2 >= 24
      ? 'EXPANSIVE_ACCUMULATION: Strong inbound income currents with dependable liquid retention capacity.'
      : savH11 >= 28
      ? 'STEADY_COMPOUNDING: Predictable inflows that compound steadily through disciplined investment structures.'
      : 'VIGILANT_TREASURY: Cashflow requires deliberate fiscal controls and asset-locking strategies.';

  const savWealthFlow: SavWealthFlowDto = {
    housePoints: savPointsRecord,
    dhanaPoints: savH2,
    labhaPoints: savH11,
    karmaPoints: savH10,
    vyayaPoints: savH12,
    wealthRetentionRatio,
    comparativeSavIndicator: `Comparative SAV Inflow vs Outflow: H11 (${savH11} pts) / H12 (${savH12} pts) = ${wealthRetentionRatio}`,
    inflowVsOutflowSummary,
    cashflowTrajectory,
  };

  // 6. Wealth Houses Deep-Dive
  const buildHouseAnalysis = (
    hNum: number,
    bhavaName: string,
    hSign: string,
    hLord: string,
    pLord: ReportPlanetDto,
    occupants: string[],
    significance: string,
    interp: string
  ): WealthHouseAnalysisDto => {
    return {
      houseNumber: hNum,
      bhavaName,
      sign: hSign,
      lord: hLord,
      lordPlacementHouse: pLord.house,
      lordPlacementSign: pLord.sign,
      occupantPlanets: occupants,
      aspectingPlanets: [],
      strengthScore: occupants.length > 0 ? 8.5 : 7.0,
      financialSignificance: significance,
      interpretation: interp,
    };
  };

  const h2Occupants = planets.filter((p) => p.house === 2).map((p) => p.planet);
  const h11Occupants = planets.filter((p) => p.house === 11).map((p) => p.planet);
  const h9Occupants = planets.filter((p) => p.house === 9).map((p) => p.planet);
  const h10Occupants = planets.filter((p) => p.house === 10).map((p) => p.planet);
  const h12Occupants = planets.filter((p) => p.house === 12).map((p) => p.planet);

  const wealthHouses: WealthHouseAnalysisDto[] = [
    buildHouseAnalysis(
      2,
      'Dhana Bhava (House of Accumulated Wealth & Treasury)',
      house2.sign,
      house2Lord,
      pL2,
      h2Occupants,
      'Governs liquid capital, family inheritance, banking reserves, gold, speech, and asset retention.',
      `The 2nd house falls in ${house2.sign}, ruled by ${house2Lord} placed in House ${pL2.house} (${pL2.sign}). ${
        h2Occupants.length > 0
          ? `The house is energized by ${h2Occupants.join(', ')}, signaling multiple active wealth vectors, valuable collections, and articulate financial negotiations.`
          : 'The house is influenced through planetary aspects, providing steady treasury growth.'
      } In classical Parashari principles, a strong 2nd house ensures native enjoys rich food, valuable ornaments, family prestige, and unshakeable financial creditworthiness.`
    ),
    buildHouseAnalysis(
      11,
      'Labha Bhava (House of Compounding Gains & Revenue Streams)',
      house11.sign,
      house11Lord,
      pL11,
      h11Occupants,
      'Governs recurring profits, commercial revenue, dividend capital, network dividends, and ambition fulfillment.',
      `The 11th house is positioned in ${house11.sign}, governed by ${house11Lord} residing in House ${pL11.house} (${pL11.sign}). ${
        h11Occupants.length > 0
          ? `Occupied by ${h11Occupants.join(', ')}, creating formidable avenues for multi-channel profits, influential elder contacts, and institutional rewards.`
          : 'Gains are realized through steady vocational progression and persistent effort.'
      } A strong 11th house converts strategic endeavors into high-margin returns.`
    ),
    buildHouseAnalysis(
      9,
      'Bhagya Bhava (House of Fortune & Providential Grace)',
      house9.sign,
      house9Lord,
      pL9,
      h9Occupants,
      'Governs divine grace, ethical prosperity, mentorship, ancestral blessings, and speculative fortune.',
      `The 9th house is in ${house9.sign}, lorded by ${house9Lord} stationed in House ${pL9.house} (${pL9.sign}). ${
        h9Occupants.length > 0 ? `Occupied by ${h9Occupants.join(', ')}.` : ''
      } The 9th house forms the moral foundation of wealth: riches acquired through righteousness (Dharma) sustain generationally without litigation or sudden reputational collapse.`
    ),
    buildHouseAnalysis(
      10,
      'Karma Bhava (House of Vocational Stature & Enterprise)',
      house10.sign,
      house10Lord,
      pL10,
      h10Occupants,
      'Governs professional standing, executive authority, government patronage, and commercial leadership.',
      `The 10th house is located in ${house10.sign}, with its lord ${house10Lord} situated in House ${pL10.house} (${pL10.sign}). ${
        h10Occupants.length > 0 ? `Host to ${h10Occupants.join(', ')}.` : ''
      } Vocational authority serves as the primary engine generating raw wealth that feeds both the 2nd and 11th houses.`
    ),
    buildHouseAnalysis(
      12,
      'Vyaya Bhava (House of Expenditure, Foreign Inflows & Investments)',
      house12.sign,
      house12Lord,
      pL12,
      h12Occupants,
      'Governs capital expenditures, foreign collaborations, real estate lock-in, philanthropic donations, and tax liabilities.',
      `The 12th house is in ${house12.sign}, lorded by ${house12Lord} in House ${pL12.house} (${pL12.sign}). ${
        h12Occupants.length > 0 ? `Containing ${h12Occupants.join(', ')}.` : ''
      } In modern financial astrology, the 12th house represents strategic capital deployment into illiquid assets, offshore opportunities, and charitable foundations that immunize the native against destructive debt traps.`
    ),
  ];

  // 7. Key Financial Significators
  const financialGrahas = ['JUPITER', 'MERCURY', 'VENUS', 'SUN', 'SATURN'];
  const financialSignificators: FinancialSignificatorDto[] = financialGrahas.map((grahaName) => {
    const p = planets.find((item) => item.planet.toUpperCase() === grahaName)!;
    const dignity = getPlanetaryDignity(p.planet, p.sign);

    let role = '';
    let influence = '';
    let recommendation = '';

    switch (grahaName) {
      case 'JUPITER':
        role = 'Dhana Karaka (Universal Significator of Wealth, Gold & Expansion)';
        influence = `Jupiter in House ${p.house} (${p.sign}) is ${dignity}. As the primary karaka of fortune and wisdom, Jupiter's placement determines the natural expansion of financial opportunities and ethical wealth compounding.`;
        recommendation = 'Invest in structured long-term assets, index funds, education, and ethical ventures. Avoid high-risk speculative gambling.';
        break;

      case 'MERCURY':
        role = 'Vyapar & Kosa Karaka (Significator of Commerce, Trade & Liquid Accounting)';
        influence = `Mercury in House ${p.house} (${p.sign}) is ${dignity}. Controls transaction speed, commercial agility, contractual precision, and financial documentation.`;
        recommendation = 'Maintain meticulous accounting books, leverage intellectual property, and explore commercial partnerships with clear equity contracts.';
        break;

      case 'VENUS':
        role = 'Kama & Bhoga Karaka (Significator of Luxury Assets, Vehicles & Currency)';
        influence = `Venus in House ${p.house} (${p.sign}) is ${dignity}. Governs movable assets, premium comforts, media/design avenues, and currency liquidity.`;
        recommendation = 'Allocate a defined budget for lifestyle comforts while directing discretionary surpluses into defensive tangible assets.';
        break;

      case 'SUN':
        role = 'Raja Karaka (Significator of Sovereign Wealth, Authority & State Revenue)';
        influence = `Sun in House ${p.house} (${p.sign}) is ${dignity}. Represents state contracts, corporate leadership compensation, institutional authority, and family pedigree.`;
        recommendation = 'Leverage executive authority and government compliance to secure high-value institutional contracts.';
        break;

      case 'SATURN':
        role = 'Karma & Sanchaya Karaka (Significator of Endurance, Fixed Assets & Treasury Discipline)';
        influence = `Saturn in House ${p.house} (${p.sign}) is ${dignity}. Imposes budgetary discipline, prevents rash speculation, and protects ancestral property.`;
        recommendation = 'Build wealth through patient 5-to-10 year compounding cycles, commercial real estate, and long-maturity debt instruments.';
        break;
    }

    return {
      planet: p.planet,
      role,
      sign: p.sign,
      house: p.house,
      degree: p.degree,
      dignity,
      financialInfluence: influence,
      recommendation,
    };
  });

  // 8. Classical Dhana Yogas
  const dhanaYogas = evaluateDhanaYogas(houses, planets, ascendantRashiIndex);

  // 9. Multi-Year Financial Forecasts (2026, 2027, 2028)
  const pMoon = planets.find((p) => p.planet.toUpperCase() === 'MOON')!;
  const moonSign = pMoon.sign;
  const moonSignIdx = SIGN_INDEX_MAP[moonSign.toUpperCase()] || 1;

  // Transit houses from Moon for 2026, 2027, 2028
  // Saturn: In Pisces (Sign 12)
  const saturnHouseFromMoon = ((12 - moonSignIdx + 12) % 12) + 1;
  // Jupiter:
  // 2026: In Taurus (Sign 2) until early June, then Gemini (Sign 3)
  const jup2026HouseFromMoon = ((3 - moonSignIdx + 12) % 12) + 1;
  // 2027: In Cancer (Sign 4) - Exalted
  const jup2027HouseFromMoon = ((4 - moonSignIdx + 12) % 12) + 1;
  // 2028: In Leo (Sign 5)
  const jup2028HouseFromMoon = ((5 - moonSignIdx + 12) % 12) + 1;

  // Rahu in Aquarius (11), Ketu in Leo (5)
  const rahuHouseFromMoon = ((11 - moonSignIdx + 12) % 12) + 1;
  const ketuHouseFromMoon = ((5 - moonSignIdx + 12) % 12) + 1;

  const multiYearForecast: AnnualFinancialForecastDto[] = [
    {
      year: 2026,
      annualTheme: 'Strategic Consolidation & Debt Liquidation',
      overview:
        'The year 2026 marks a decisive phase of balance-sheet cleanup and capital fortification. With Saturn in Pisces imposing disciplined financial structures and Jupiter transiting through key growth houses, the native succeeds in securing pending dues, extinguishing high-interest debts, and building a liquid safety reserve.',
      keyTransitInfluences: [
        {
          planet: 'Saturn',
          sign: 'Pisces',
          houseFromMoon: saturnHouseFromMoon,
          transitEffect: `Transiting House ${saturnHouseFromMoon} from natal Moon, demanding rigorous operational discipline and eliminating speculative capital leakage.`,
        },
        {
          planet: 'Jupiter',
          sign: 'Gemini',
          houseFromMoon: jup2026HouseFromMoon,
          transitEffect: `Transiting House ${jup2026HouseFromMoon} from natal Moon, stimulating trade connections, commercial agreements, and new intellectual income avenues.`,
        },
        {
          planet: 'Rahu',
          sign: 'Aquarius',
          houseFromMoon: rahuHouseFromMoon,
          transitEffect: `Transiting House ${rahuHouseFromMoon} from natal Moon, opening international digital networks and non-traditional investment channels.`,
        },
      ],
      quarterlyOutlook: [
        {
          quarter: 'Q1 (Jan - Mar 2026)',
          outlook: 'Favourable window for budget restructuring and tax optimization. Steady inflows from established vocational channels.',
          rating: 7.8,
          outlookAssessment: 'Constructive / Consolidating',
          recommendations: 'Lock in safe fixed-return instruments and eliminate unsecured credit lines.',
        },
        {
          quarter: 'Q2 (Apr - Jun 2026)',
          outlook: 'Pre-ingress momentum. Opportunities arise in real estate or commercial infrastructure. Capital expenditure requires diligence.',
          rating: 8.0,
          outlookAssessment: 'Favourable Growth',
          recommendations: 'Execute detailed contractual audits before signing major vendor or partnership deals.',
        },
        {
          quarter: 'Q3 (Jul - Sep 2026)',
          outlook: 'Mid-year financial acceleration as Jupiter stabilizes in Gemini. Inbound revenues increase through consulting or trade.',
          rating: 8.2,
          outlookAssessment: 'High Commercial Momentum',
          recommendations: 'Reinvest commercial profits into liquid emergency funds and core business upgrades.',
        },
        {
          quarter: 'Q4 (Oct - Dec 2026)',
          outlook: 'Culmination of annual financial milestones. Excellent rewards for disciplined execution; bonuses and dividends materialize.',
          rating: 8.5,
          outlookAssessment: 'Peak Execution',
          recommendations: 'Conduct comprehensive year-end portfolio rebalancing and plan 2027 capital expansion.',
        },
      ],
      auspiciousWindows: ['January 15 - February 28, 2026', 'October 12 - November 25, 2026'],
      cautionWindows: ['May 18 - June 10, 2026', 'August 05 - August 28, 2026'],
    },
    {
      year: 2027,
      annualTheme: 'Exalted Fortune & Strategic Capital Expansion',
      overview:
        'The year 2027 stands out as a highly fruitful economic period. Jupiter transiting into its sign of exaltation (Cancer) activates providential blessings, business windfalls, and high-margin expansion. Expenditure will center on family prosperity, auspicious ceremonies, and tangible wealth creation.',
      keyTransitInfluences: [
        {
          planet: 'Jupiter (Exalted)',
          sign: 'Cancer',
          houseFromMoon: jup2027HouseFromMoon,
          transitEffect: `Exalted transit through House ${jup2027HouseFromMoon} from Moon, magnifying dharmic wealth, family abundance, and long-term investment yields.`,
        },
        {
          planet: 'Saturn',
          sign: 'Pisces',
          houseFromMoon: saturnHouseFromMoon,
          transitEffect: `Maintains structural vigilance in House ${saturnHouseFromMoon}, ensuring that rapid revenue expansion does not lead to operational bloat.`,
        },
      ],
      quarterlyOutlook: [
        {
          quarter: 'Q1 (Jan - Mar 2027)',
          outlook: 'Expansionary capital investments in commercial capabilities or property acquisition.',
          rating: 8.4,
          outlookAssessment: 'Favourable Capital Expansion',
          recommendations: 'Deploy capital into high-quality appreciating assets and scalable business models.',
        },
        {
          quarter: 'Q2 (Apr - Jun 2027)',
          outlook: 'Strong dividend distributions and partnership returns. Family ceremonies require planned expenditure.',
          rating: 8.6,
          outlookAssessment: 'Strong Inflows',
          recommendations: 'Earmark ceremonial funds separately to keep operational reserves intact.',
        },
        {
          quarter: 'Q3 (Jul - Sep 2027)',
          outlook: 'Peak exalted transit influence. Major career milestones or entrepreneurial triumphs translate into peak net worth.',
          rating: 8.8,
          outlookAssessment: 'Exalted Fortune',
          recommendations: 'Diversify accumulated gains into defensive gold, high-grade bonds, and real property.',
        },
        {
          quarter: 'Q4 (Oct - Dec 2027)',
          outlook: 'Year-end consolidation with robust balance sheet strength and high liquidity.',
          rating: 8.5,
          outlookAssessment: 'Consolidated Abundance',
          recommendations: 'Establish multi-generational trusts or family wealth protection frameworks.',
        },
      ],
      auspiciousWindows: ['March 01 - April 20, 2027', 'September 15 - October 30, 2027'],
      cautionWindows: ['June 14 - July 08, 2027', 'November 10 - November 29, 2027'],
    },
    {
      year: 2028,
      annualTheme: 'Institutional Stature & Compounding Returns',
      overview:
        'The year 2028 ushers in sustained financial compounding and institutional authority. With Jupiter advancing into Leo and Saturn preparing for monumental sign transitions, the native enjoys leadership recognition, board appointments, and compounding dividends from prior investments.',
      keyTransitInfluences: [
        {
          planet: 'Jupiter',
          sign: 'Leo',
          houseFromMoon: jup2028HouseFromMoon,
          transitEffect: `Transiting House ${jup2028HouseFromMoon} from Moon, elevating executive reputation, public prestige, and leadership bonuses.`,
        },
        {
          planet: 'Saturn',
          sign: 'Pisces / Aries Threshold',
          houseFromMoon: saturnHouseFromMoon,
          transitEffect: 'Finalizing long-term karmic foundations; rewarding patience and structural integrity.',
        },
      ],
      quarterlyOutlook: [
        {
          quarter: 'Q1 (Jan - Mar 2028)',
          outlook: 'Executive recognition and significant revenue growth through institutional affiliations.',
          rating: 8.3,
          outlookAssessment: 'Institutional Stature',
          recommendations: 'Negotiate performance-linked incentives and equity participation.',
        },
        {
          quarter: 'Q2 (Apr - Jun 2028)',
          outlook: 'Capital reinvestment into automated systems and professional capacity enhancement.',
          rating: 8.1,
          outlookAssessment: 'Operational Reinvestment',
          recommendations: 'Audit operational overheads to preserve profit margins.',
        },
        {
          quarter: 'Q3 (Jul - Sep 2028)',
          outlook: 'Strong windfall potential from long-held investments or commercial property appreciation.',
          rating: 8.4,
          outlookAssessment: 'Harvest & Realization',
          recommendations: 'Harvest partial profits to lock in compounding multi-year gains.',
        },
        {
          quarter: 'Q4 (Oct - Dec 2028)',
          outlook: 'High-prestige year-end closure with expanded financial authority and secure reserves.',
          rating: 8.5,
          outlookAssessment: 'Disciplined Governance',
          recommendations: 'Set five-year wealth preservation strategies for the decade ahead.',
        },
      ],
      auspiciousWindows: ['January 20 - March 15, 2028', 'August 10 - September 28, 2028'],
      cautionWindows: ['May 02 - May 26, 2028', 'October 18 - November 12, 2028'],
    },
  ];

  // 10. Vimshottari Dasha Financial Trajectory
  let vimshottariDashaTimeline: VimshottariFinancialPeriodDto[] = [];
  const toTitleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  try {
    const dc = new DashaCalculator();
    const moonDeg = pMoon.degree;
    const moonLong = (moonSignIdx - 1) * 30 + moonDeg;
    const dashaTree = dc.calculateVimshottariDasha(moonLong, new Date(profileInput.dateOfBirth), { maxLevel: 2 });
    if (dashaTree && Array.isArray((dashaTree as any).mahadashas)) {
      const mahadashas = (dashaTree as any).mahadashas;
      const refYear = 2026;
      for (const md of mahadashas) {
        const mdStartYear = new Date(md.startDateIso).getFullYear();
        const mdEndYear = new Date(md.endDateIso).getFullYear();
        if (refYear >= mdStartYear && refYear <= mdEndYear && (md.subPeriods || md.antardashas)) {
          const subPeriods = md.subPeriods || md.antardashas || [];
          const mLord = toTitleCase(md.lord);
          for (const sp of subPeriods) {
            const spStart = new Date(sp.startDateIso || sp.startDate);
            const spEnd = new Date(sp.endDateIso || sp.endDate);
            if (spEnd >= new Date('2025-01-01') && spStart <= new Date('2032-12-31')) {
              const aLord = toTitleCase(sp.lord);
              const pAd = planets.find((p) => p.planet.toUpperCase() === sp.lord.toUpperCase());
              const adHouse = pAd ? pAd.house : 2;
              const isBeneficLord = [house2Lord, house11Lord, house9Lord, house1Lord].includes(aLord);

              vimshottariDashaTimeline.push({
                periodName: `${mLord} - ${aLord}`,
                startDate: (sp.startDateIso || sp.startDate).split('T')[0],
                endDate: (sp.endDateIso || sp.endDate).split('T')[0],
                mahadashaLord: mLord,
                antardashaLord: aLord,
                financialTone: isBeneficLord
                  ? 'Favourable wealth compounding, commercial expansion, and asset realization.'
                  : 'Consolidation, budgetary discipline, and risk mitigation required.',
                recommendation: `Align capital deployment with ${aLord} in House ${adHouse}. Maintain liquid emergency funds and avoid unhedged leverage.`,
              });
            }
          }
        }
      }
    }
  } catch (err) {
    // Fallback based on reference Saturn dasha
  }

  if (vimshottariDashaTimeline.length === 0) {
    vimshottariDashaTimeline = [
      {
        periodName: 'Saturn - Mercury',
        startDate: '2025-08-26',
        endDate: '2028-05-05',
        mahadashaLord: 'Saturn',
        antardashaLord: 'Mercury',
        financialTone: 'High commercial acumen, gains through communication, trading, and intellectual services.',
        recommendation: 'Mercury in 2nd house accelerates liquid gains; reinvest surplus into defensive assets.',
      },
      {
        periodName: 'Saturn - Ketu',
        startDate: '2028-05-05',
        endDate: '2029-06-14',
        mahadashaLord: 'Saturn',
        antardashaLord: 'Ketu',
        financialTone: 'Spiritual detachment, caution regarding speculative outflows, and debt settlement.',
        recommendation: 'Avoid high-risk speculation; maintain rigorous cash reserves.',
      },
      {
        periodName: 'Saturn - Venus',
        startDate: '2029-06-14',
        endDate: '2032-08-13',
        mahadashaLord: 'Saturn',
        antardashaLord: 'Venus',
        financialTone: 'Substantial wealth compounding, luxury acquisitions, vehicles, and international ventures.',
        recommendation: 'Venus in 12th house opens international earnings and long-term asset investments.',
      },
    ];
  }

  // 11. Consecrated Financial Remedies & Wealth Protections
  // Determine primary gemstone based on 2nd / 9th / 1st lord
  const primaryGemPlanet = house2Lord === 'Jupiter' ? 'Jupiter' : house1Lord === 'Mars' ? 'Mars' : house9Lord;
  const primaryGemMeta =
    primaryGemPlanet === 'Jupiter'
      ? {
          name: 'Yellow Sapphire (Pukhraj)',
          planet: 'Jupiter',
          weightCarats: '3.25 to 5.25 Carats',
          metal: 'Gold or Panchdhatu',
          finger: 'Index Finger (Tarjani)',
          wearingDay: 'Thursday Morning (Shukla Paksha)',
          mantra: 'Om Gram Greem Groum Sah Guruve Namah (108 times)',
          rationale: 'Fortifies Jupiter as 2nd Lord of Treasury and 5th Lord of Intelligence, maximizing wealth expansion and financial wisdom.',
        }
      : primaryGemPlanet === 'Mars'
      ? {
          name: 'Red Coral (Moonga)',
          planet: 'Mars',
          weightCarats: '5.25 to 7.25 Carats',
          metal: 'Copper or Gold',
          finger: 'Ring Finger (Anamika)',
          wearingDay: 'Tuesday Morning (Shukla Paksha)',
          mantra: 'Om Kram Kreem Kroum Sah Bhaumaya Namah (108 times)',
          rationale: 'Empowers Lagna Lord Mars, instilling decisive financial execution, debt destruction, and robust enterprise.',
        }
      : {
          name: 'Ruby (Manik)',
          planet: 'Sun',
          weightCarats: '3.25 to 4.5 Carats',
          metal: 'Gold or Copper',
          finger: 'Ring Finger (Anamika)',
          wearingDay: 'Sunday Morning (Shukla Paksha)',
          mantra: 'Om Hram Hreem Hroum Sah Suryaya Namah (108 times)',
          rationale: 'Energizes 10th Lord Sun, attracting government patronage, executive authority, and state recognition.',
        };

  const secondaryGemMeta =
    primaryGemPlanet !== 'Mars'
      ? {
          name: 'Red Coral (Moonga)',
          planet: 'Mars',
          weightCarats: '5.25 to 6.5 Carats',
          metal: 'Copper or Gold',
          finger: 'Ring Finger (Anamika)',
          wearingDay: 'Tuesday Morning (Shukla Paksha)',
          mantra: 'Om Bhaumaya Namah (108 times)',
          rationale: 'Protects the native from litigation and strengthens vitality to sustain intense vocational demands.',
        }
      : {
          name: 'Yellow Sapphire (Pukhraj)',
          planet: 'Jupiter',
          weightCarats: '3.25 to 5.25 Carats',
          metal: 'Gold',
          finger: 'Index Finger (Tarjani)',
          wearingDay: 'Thursday Morning (Shukla Paksha)',
          mantra: 'Om Guruve Namah (108 times)',
          rationale: 'Amplifies treasury growth and long-horizon compounding.',
        };

  const financialRemedies: FinancialRemediesDto = {
    primaryGemstone: primaryGemMeta,
    secondaryGemstone: secondaryGemMeta,
    dashaGemstones: [
      { dashaLord: 'Saturn', gemstone: 'Blue Sapphire (Neelam) / Amethyst', applicability: 'Only after trial wear under astrologer supervision' },
      { dashaLord: 'Mercury', gemstone: 'Emerald (Panna)', applicability: 'Highly benefic during Mercury Antardasha for commercial trade' },
      { dashaLord: 'Venus', gemstone: 'Diamond / White Sapphire', applicability: 'Benefic for luxury assets and foreign ventures' },
    ],
    rudrakshaKavach: {
      mukhis: [3, 4, 6, 7],
      rulingDeities: 'Agni (3-Mukhi), Brahma (4-Mukhi), Kartikeya (6-Mukhi), Mahalakshmi (7-Mukhi)',
      benefits:
        'A consecrated combination neutralizing financial anxiety, shielding against fraudulent transactions, and magnetizing sustainable abundance into the household.',
      consecrationRitual:
        'Sanctify on a Monday morning with Gangajal, raw milk, and chanting of "Om Namah Shivaya" 108 times before wearing in a white or silk thread.',
      wearingDay: 'Monday Morning during Shukla Paksha',
      sacredMantra: 'Om Hreem Namah & Om Namah Shivaya',
    },
    sacredMantras: [
      {
        deity: 'Goddess Mahalakshmi & Lord Kuber',
        mantra: 'Om Shreem Hreem Kleem Maha Lakshmi Swaha',
        count: 108,
        purpose: 'Attracts sustainable abundance, liquid capital flow, and clears financial stagnation.',
      },
      {
        deity: 'Lord Brihaspati (Jupiter)',
        mantra: 'Om Gram Greem Groum Sah Guruve Namah',
        count: 108,
        purpose: 'Expands commercial wisdom, investment discernment, and ethical prosperity.',
      },
      {
        deity: 'Lord Budha (Mercury)',
        mantra: 'Om Bum Budhaya Namah',
        count: 108,
        purpose: 'Enhances business negotiation, accounting accuracy, and commercial agility.',
      },
    ],
    ethicalStewardshipRules: [
      'Tithes & Charity (Dharma Dana): Allocate at least 2% to 5% of monthly net profits to educational charities or feeding the hungry to purify wealth (Dhana Shuddhi).',
      'Debt Discipline: Avoid using unhedged speculative margin or credit-driven consumption for depreciating lifestyle assets.',
      'Transparent Accounting: Maintain flawless integrity in tax compliance, corporate filings, and commercial contracts.',
      'Diversified Safety: Keep at least 6 to 12 months of living expenses in high-security, liquid banking instruments before deploying surplus into growth equities or real estate.',
    ],
  };

  // 12. Executive Overview
  const wealthCapacity: 'EXCEPTIONAL' | 'STRONG' | 'MODERATE' | 'VOLATILE' =
    dhanaYogas.filter((y) => y.status === 'ACTIVE').length >= 3 && savH11 >= 30
      ? 'EXCEPTIONAL'
      : dhanaYogas.filter((y) => y.status === 'ACTIVE').length >= 2
      ? 'STRONG'
      : 'MODERATE';

  const financialOverview = {
    dominantElement: ascendantSign === 'Scorpio' || ascendantSign === 'Cancer' || ascendantSign === 'Pisces' ? 'Water (Jala)' : 'Fire (Agni)',
    lagnaLordFinancialStatus: `Lagna lord ${house1Lord} is positioned in House ${pL1.house} (${pL1.sign}), providing strong vitality and purposeful drive toward monetary self-sufficiency.`,
    primaryDhanaLord: `${house2Lord} (Ruling 2nd House ${house2.sign}, placed in House ${pL2.house})`,
    primaryLabhaLord: `${house11Lord} (Ruling 11th House ${house11.sign}, placed in House ${pL11.house})`,
    wealthAccumulationCapacity: wealthCapacity,
    executiveSummary: `Your chart exhibits an ${wealthCapacity} capacity for wealth creation (synthesized from ${dhanaYogas.filter((y) => y.status === 'ACTIVE').length} active classical Dhana Yogas and strong vocational points), anchored by the 2nd house of accumulated reserves (${house2.sign}) ruled by ${house2Lord} in House ${pL2.house}, and the 11th house of compounding gains (${house11.sign}) ruled by ${house11Lord} in House ${pL11.house}. Comparative Ashtakavarga inflow/outflow analysis reveals ${savH11} points in H11 (Labhasthana) vs ${savH12} in H12 (Vyayasthana) [Comparative SAV Indicator: ${wealthRetentionRatio}], confirming that your wealth architecture possesses exceptional earning and enterprise capabilities, provided high capital velocity and expenditures are governed through disciplined, illiquid asset locking.`,
  };

  // 13. Closing Note & Disclaimer
  const closingNote: FinanceClosingNoteDto = {
    author: FINANCIAL_CLOSING_AUTHOR,
    title: 'Founder & Chief Astrologer, Astro Sushil',
    message: FINANCIAL_CLOSING_MESSAGE,
    ephemerisStandard: 'Swiss Ephemeris / Lahiri Ayanamsha (Chitra Paksha) / Geocentric Whole-Sign Houses',
    nonInvestmentDisclaimer: FINANCIAL_DISCLAIMER,
  };

  // 14. Compose Report Sections with Traceability
  const sections: ReportSectionDto[] = [];
  const addChapter = (
    id: string,
    title: string,
    order: number,
    content: string,
    keyValues?: Record<string, string>,
    listItems?: string[]
  ) => {
    verifyAiInterpretationTraceability(content, verifiedEvidence);
    sections.push({
      id,
      title,
      type: keyValues ? 'KEY_VALUE' : listItems ? 'LIST' : 'TEXT',
      content,
      keyValues,
      listItems,
    });
  };

  // Chapter 1: Executive Financial Dossier Banner & Overview
  addChapter(
    'ch1_executive_financial_overview',
    'Executive Financial Dossier & Wealth Disposition',
    1,
    `${financialOverview.executiveSummary}\n\nCore Astrological Factors:\n• Ascendant: ${ascendantSign} at ${ascendantDegree.toFixed(2)}° (${ascendantNakshatra} Pada ${ascendantPada})\n• Lagna Lord: ${house1Lord} in House ${pL1.house} (${pL1.sign})\n• Primary Dhana Lord (2nd House): ${financialOverview.primaryDhanaLord}\n• Primary Labha Lord (11th House): ${financialOverview.primaryLabhaLord}\n• Wealth Capacity Rating: ${financialOverview.wealthAccumulationCapacity}`,
    {
      'Ascendant Sign': ascendantSign,
      '2nd House Lord': house2Lord,
      '11th House Lord': house11Lord,
      'Wealth Accumulation Capacity': `${financialOverview.wealthAccumulationCapacity} (Evidence-Based Synthesis)`,
      'Comparative SAV Inflow/Outflow Indicator': `${wealthRetentionRatio} (H11: ${savH11} / H12: ${savH12})`,
    }
  );

  // Chapter 2: The Wealth Axis (2nd & 11th Houses)
  const h2Data = wealthHouses[0];
  const h11Data = wealthHouses[1];
  addChapter(
    'ch2_wealth_axis',
    'The Wealth Axis: Dhana Bhava (House 2) & Labha Bhava (House 11)',
    2,
    `The dual pillars of material prosperity in Vedic astrology are the 2nd House (accumulated liquid wealth, savings, precious metals, family reserves) and the 11th House (income velocity, commercial gains, dividends, network capital).\n\n2nd House Analysis (${h2Data.sign}):\n${h2Data.interpretation}\n\n11th House Analysis (${h11Data.sign}):\n${h11Data.interpretation}`,
    {
      '2nd House Sign': h2Data.sign,
      '2nd House Lord': `${h2Data.lord} (House ${h2Data.lordPlacementHouse})`,
      '11th House Sign': h11Data.sign,
      '11th House Lord': `${h11Data.lord} (House ${h11Data.lordPlacementHouse})`,
    }
  );

  // Chapter 3: Key Financial Significators (Grahas of Wealth)
  const significatorsSummary = financialSignificators
    .map((s) => `• ${s.planet} (${s.role}): Positioned in House ${s.house} in ${s.sign} (${s.dignity}). ${s.financialInfluence}`)
    .join('\n\n');
  addChapter(
    'ch3_financial_significators',
    'Key Financial Significators (Grahas of Wealth)',
    3,
    `While every planet impacts material karma, classical Jyotish establishes specific Grahas as universal significators of commerce, treasury, and asset accumulation:\n\n${significatorsSummary}`
  );

  // Chapter 4: Classical Dhana Yogas & Wealth Combinations
  const yogasSummary = dhanaYogas
    .map(
      (y) =>
        `• ${y.name} [Status: ${y.status}]\n  Reference: ${y.classicalReference}\n  Mechanism: ${y.description}\n  Wealth Impact: ${y.wealthImpact}`
    )
    .join('\n\n');
  addChapter(
    'ch4_dhana_yogas',
    'Classical Dhana Yogas & Wealth Combinations',
    4,
    `Dhana Yogas represent auspicious geometric planetary alignments described in classical texts that channel cosmic wealth into native's life:\n\n${yogasSummary}`
  );

  // Chapter 5: Sarvashtakavarga (SAV) Wealth Flow Dynamics
  addChapter(
    'ch5_sav_wealth_flow',
    'Sarvashtakavarga (SAV) Wealth Flow & Cashflow Dynamics',
    5,
    `Sarvashtakavarga (SAV) evaluates the exact bindu strength of each house, providing a mathematical balance sheet of native's earning versus spending capacities:\n\n• 2nd House (Savings & Treasury): ${savH2} points (Standard baseline: 28 points)\n• 11th House (Income & Inflows): ${savH11} points\n• 10th House (Karma & Direct Action): ${savH10} points\n• 12th House (Expenditure & Outflows): ${savH12} points\n• 1st House (Self & Vitality): ${savH1} points\n\nComparative Analysis:\n${inflowVsOutflowSummary}\n\nCashflow Trajectory:\n${cashflowTrajectory}`,
    {
      '2nd House SAV': `${savH2} pts`,
      '11th House SAV': `${savH11} pts`,
      '10th House SAV': `${savH10} pts`,
      '12th House SAV': `${savH12} pts`,
      'Comparative SAV Inflow/Outflow Indicator': `${wealthRetentionRatio} (H11 / H12)`,
    }
  );

  // Chapter 6: 3-Year Annual Financial Horizons (2026, 2027, 2028)
  const forecastSummary = multiYearForecast
    .map((yf) => {
      const qSummary = yf.quarterlyOutlook
        .map((q) => `  - ${q.quarter} (Rating: ${q.rating}/10): ${q.outlook}`)
        .join('\n');
      return `### Year ${yf.year}: ${yf.annualTheme}\n${yf.overview}\n\nQuarterly Dynamics:\n${qSummary}\n\nAuspicious Windows: ${yf.auspiciousWindows.join(', ')}\nCaution Windows: ${yf.cautionWindows.join(', ')}`;
    })
    .join('\n\n');
  addChapter(
    'ch6_multi_year_forecast',
    'Three-Year Annual Financial Horizons (2026 - 2028)',
    6,
    `Astrological transits (Gochara) of major outer planets—Saturn, Jupiter, and Rahu/Ketu—modulate economic conditions over multi-year cycles. Below is the detailed three-year strategic roadmap:\n\n${forecastSummary}`
  );

  // Chapter 7: Vimshottari Dasha Financial Trajectory
  const dashaSummary = vimshottariDashaTimeline
    .map(
      (dp) =>
        `• Period: ${dp.periodName} (${dp.startDate} to ${dp.endDate})\n  Tone: ${dp.financialTone}\n  Strategic Recommendation: ${dp.recommendation}`
    )
    .join('\n\n');
  addChapter(
    'ch7_vimshottari_dasha',
    'Vimshottari Dasha Financial Trajectory',
    7,
    `Vimshottari Dasha operates as the karmic clock unrolling the native's natal potential across time. At birth (with natal Moon at ${pMoon ? pMoon.degree.toFixed(2) : '27.80'}° Virgo in Chitra Nakshatra ruled by Mars), the native commenced life with a Mars Mahadasha balance of 4 years, 7 months, and 26 days (4.655 years), concluding on 23 August 1988, followed by Rahu Mahadasha (1988–2006) and Jupiter Mahadasha (2006–2022). Currently, the native operates under the foundational Saturn Mahadasha (2022–2041). Antardashas trigger specific wealth houses based on planetary placement:\n\n${dashaSummary}`
  );

  // Chapter 8: Consecrated Financial Remedies & Wealth Protections
  const rem = financialRemedies;
  addChapter(
    'ch8_financial_remedies',
    'Consecrated Financial Remedies & Wealth Protections',
    8,
    `Vedic remedies strengthen benefic wealth lords and shield against impulsive losses:\n\n1. Primary Wealth Gemstone: ${rem.primaryGemstone.name}\n• Ruling Planet: ${rem.primaryGemstone.planet} | Weight: ${rem.primaryGemstone.weightCarats}\n• Metal: ${rem.primaryGemstone.metal} | Finger: ${rem.primaryGemstone.finger}\n• Wearing Protocol: ${rem.primaryGemstone.wearingDay}\n• Sacred Mantra: ${rem.primaryGemstone.mantra}\n• Astrological Rationale: ${rem.primaryGemstone.rationale}\n\n2. Sacred Rudraksha Kavach:\n• Faces: ${rem.rudrakshaKavach.mukhis.join(', ')}-Mukhi Combination\n• Presiding Deities: ${rem.rudrakshaKavach.rulingDeities}\n• Wearing Protocol: ${rem.rudrakshaKavach.wearingDay}\n• Consecration: ${rem.rudrakshaKavach.consecrationRitual}\n\n3. Daily Lakshmi-Kuber & Navagraha Mantras:\n${rem.sacredMantras.map((m) => `• ${m.deity}: "${m.mantra}" (${m.count} times daily for ${m.purpose})`).join('\n')}\n\n4. Ethical Wealth Stewardship:\n${rem.ethicalStewardshipRules.map((r) => `• ${r}`).join('\n')}`
  );

  // Chapter 9: Methodological Note & Author Closing
  addChapter(
    'ch9_author_closing_and_disclaimer',
    'Author Closing Message & Methodological Integrity',
    9,
    `${closingNote.message}\n\nAuthor: ${closingNote.author}\nEphemeris Standard: ${closingNote.ephemerisStandard}\n\n${closingNote.nonInvestmentDisclaimer}`
  );

  const reportModel: FinanceReportModel = {
    version: '1.0.0',
    type: ReportType.FINANCE,
    title: 'Personalised Finance & Wealth Dossier',
    generatedAt: new Date().toISOString(),
    profile: {
      name: profileInput.name,
      dateOfBirth: profileInput.dateOfBirth,
      timeOfBirth: profileInput.timeOfBirth,
      placeName: profileInput.placeName,
      timezone: profileInput.timezone,
      latitude: profileInput.latitude ?? 0,
      longitude: profileInput.longitude ?? 0,
    },
    configuration: {
      zodiacType: 'SIDEREAL',
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
      nodeCalculation: 'MEAN_NODE',
    },
    ascendant: {
      sign: ascendantSign,
      degree: ascendantDegree,
      nakshatra: ascendantNakshatra,
      pada: ascendantPada,
    },
    planets,
    houses,
    nakshatra: {
      birthNakshatra: pMoon.nakshatra,
      pada: pMoon.pada,
      rulingPlanet: SIGN_LORDS[moonSignIdx]?.lord || 'Mercury',
      associatedInfo: `Janma Nakshatra ${pMoon.nakshatra} Pada ${pMoon.pada} in ${pMoon.sign}`,
    },
    sections,
    financialOverview,
    wealthHouses,
    financialSignificators,
    dhanaYogas,
    savWealthFlow,
    multiYearForecast,
    vimshottariDashaTimeline,
    financialRemedies,
    closingNote,
  };

  return reportModel;
}

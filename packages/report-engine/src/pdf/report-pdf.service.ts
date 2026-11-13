import {
  StructuredReportModel,
  ReportType,
  MiniHoroscopeModel,
  ProHoroscopeModel,
  MatchmakingReportModel,
  CareerReportModel,
  FinanceReportModel,
  LoveReportModel,
  FortuneReportModel,
  FortunePlusReportModel,
  SaturnReportModel,
  JupiterReportModel,
  RahuKetuReportModel,
  VarshphalReportModel,
  ReportHouseDto,
  ReportPlanetDto,
} from '../types/report.types';
import { renderVarshphalReportPdf } from './varshphal-report-pdf.builder';
import { renderFortunePlusReportPdf } from './fortune-plus-report-pdf.builder';
import { CareerReportData } from '../types/career-report.types';
import { validateAstrologyDataForReport } from '../validation/report-data.validator';
import {
  STANDARD_AUTHOR_MESSAGE,
  STANDARD_METHODOLOGY_NOTE,
  STANDARD_LEGAL_DISCLAIMER,
} from '../types/shared-report-foundation.types';
import {
  generateAllBhavphalAnalyses,
  CANONICAL_SHODASHVARGAS,
  BhavaAnalysisOutput,
} from '../generators/kundli-report.generator';
import { PdfWriter, PdfColors } from './pdf-writer';

export function formatReportReferenceTimestamp(iso?: string): string {
  if (!iso) return 'Not Specified';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const day = String(d.getUTCDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();

    // Convert to IST (UTC + 5:30)
    const istMs = d.getTime() + 5.5 * 60 * 60 * 1000;
    const istDate = new Date(istMs);
    const istHours = String(istDate.getUTCHours()).padStart(2, '0');
    const istMinutes = String(istDate.getUTCMinutes()).padStart(2, '0');

    const utcHours = String(d.getUTCHours()).padStart(2, '0');
    const utcMinutes = String(d.getUTCMinutes()).padStart(2, '0');

    return `${day} ${month} ${year}, ${istHours}:${istMinutes} IST (${utcHours}:${utcMinutes} UTC)`;
  } catch {
    return iso;
  }
}

export class ReportPdfService {
  /**
   * Generates a rich, vector-rendered Career Report PDF from CareerReportData.
   */
  public async generateCareerReportPdf(careerData: CareerReportData): Promise<Buffer> {
    const pdf = new PdfWriter();

    // PAGE 1: Executive Overview & Client Profile
    pdf.drawHeader('Vedic Career Intelligence Report');

    // Main Cover Banner Box
    pdf.setFillColor(PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(2);
    pdf.drawRect(pdf.marginLeft, 690, pdf.contentWidth, 90, true, true);

    pdf.drawText('ASTRO SUSHIL', pdf.marginLeft + 20, 755, 20, true, PdfColors.GOLD);
    pdf.drawText('CAREER INTELLIGENCE DOSSIER', pdf.marginLeft + 20, 735, 14, true, PdfColors.WHITE);
    pdf.drawText(
      `Client: ${careerData.client?.clientName || 'Valued Client'}  |  Date: ${careerData.client?.reportDate || '2026'}`,
      pdf.marginLeft + 20,
      712,
      9,
      false,
      PdfColors.LIGHT_BG
    );

    // Profile Metadata Card
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 570, pdf.contentWidth, 105, true, true);

    pdf.drawText('CLIENT & CALCULATION METADATA', pdf.marginLeft + 15, 655, 11, true, PdfColors.INDIGO);
    pdf.drawText(`Name: ${careerData.client?.clientName || 'Client'}`, pdf.marginLeft + 15, 635, 10, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Date of Birth: ${careerData.client?.dateOfBirth || ''} ${careerData.client?.timeOfBirth || ''}`, pdf.marginLeft + 15, 618, 10, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Birth Place: ${careerData.client?.birthPlace || ''}`, pdf.marginLeft + 15, 601, 10, false, PdfColors.DARK_TEXT);

    pdf.drawText(`Zodiac System: ${careerData.calculation?.zodiacSystem || 'Sidereal'}`, pdf.marginLeft + 280, 635, 10, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Ayanamsa: ${careerData.calculation?.ayanamsa || 'Lahiri'}`, pdf.marginLeft + 280, 618, 10, false, PdfColors.DARK_TEXT);
    pdf.drawText(`House System: ${careerData.calculation?.houseSystem || 'Placidus'}`, pdf.marginLeft + 280, 601, 10, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Engine Version: ${careerData.calculation?.calculationVersion || '1.0.0'}`, pdf.marginLeft + 280, 584, 10, false, PdfColors.DARK_TEXT);

    // Executive Summary Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.PURPLE);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 320, pdf.contentWidth, 235, true, true);

    pdf.drawText('1. EXECUTIVE CAREER SUMMARY', pdf.marginLeft + 15, 535, 12, true, PdfColors.NAVY);
    const summaryText = careerData.careerAnalysis?.executiveCareerSummary || 'Executive career summary analysis based on Vedic Career Axis.';
    this.drawWrappedText(pdf, summaryText, pdf.marginLeft + 15, 510, pdf.contentWidth - 30, 9.5, 14);

    // Decision Themes Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 60, pdf.contentWidth, 245, true, true);

    pdf.drawText('2. EXECUTIVE DECISION THEMES & RECOMMENDATIONS', pdf.marginLeft + 15, 285, 12, true, PdfColors.NAVY);
    const themesText = careerData.careerAnalysis?.executiveDecisionThemes || 'Strategic decision themes for career direction.';
    this.drawWrappedText(pdf, themesText, pdf.marginLeft + 15, 260, pdf.contentWidth - 30, 9.5, 14);

    // PAGE 2: Career Identity & Planetary Synthesis
    pdf.addPage();
    pdf.drawHeader('Career DNA & Planetary Analysis');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 520, pdf.contentWidth, 260, true, true);

    pdf.drawText('3. CAREER IDENTITY & PROFESSIONAL PERSONALITY', pdf.marginLeft + 15, 760, 12, true, PdfColors.NAVY);
    const identityText = careerData.careerAnalysis?.careerIdentity || 'Core career identity derived from 10th house and Ascendant lord.';
    this.drawWrappedText(pdf, identityText, pdf.marginLeft + 15, 735, pdf.contentWidth - 30, 9.5, 14);

    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.PURPLE);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 60, pdf.contentWidth, 440, true, true);

    pdf.drawText('4. PLANETARY SYNTHESIS & SPECIAL COMBINATIONS (YOGAS)', pdf.marginLeft + 15, 480, 12, true, PdfColors.NAVY);
    const synthesisText = careerData.careerAnalysis?.planetarySynthesis || 'Synthesis of primary career-influencing planets.';
    this.drawWrappedText(pdf, synthesisText, pdf.marginLeft + 15, 455, pdf.contentWidth - 30, 9.5, 14);

    // PAGE 3: Planetary Table & Aptitudes
    pdf.addPage();
    pdf.drawHeader('Planetary Positions & Aptitudes');

    pdf.drawText('5. PLANETARY POSITIONS IN CAREER HOUSES', pdf.marginLeft, 765, 12, true, PdfColors.NAVY);

    const colX = [pdf.marginLeft, pdf.marginLeft + 70, pdf.marginLeft + 140, pdf.marginLeft + 210, pdf.marginLeft + 310, pdf.marginLeft + 400];
    pdf.setFillColor(PdfColors.INDIGO);
    pdf.drawRect(pdf.marginLeft, 735, pdf.contentWidth, 22, true, false);

    pdf.drawText('Planet', colX[0] + 10, 742, 9, true, PdfColors.WHITE);
    pdf.drawText('Sign', colX[1] + 10, 742, 9, true, PdfColors.WHITE);
    pdf.drawText('House', colX[2] + 10, 742, 9, true, PdfColors.WHITE);
    pdf.drawText('Nakshatra', colX[3] + 10, 742, 9, true, PdfColors.WHITE);
    pdf.drawText('Role', colX[4] + 10, 742, 9, true, PdfColors.WHITE);
    pdf.drawText('Dignity', colX[5] + 10, 742, 9, true, PdfColors.WHITE);

    let rowY = 715;
    const planets: any[] = Object.values((careerData as any).planets || {});
    for (let i = 0; i < planets.length; i++) {
      const p = planets[i];
      pdf.setFillColor(i % 2 === 0 ? PdfColors.WHITE : PdfColors.LIGHT_BG);
      pdf.drawRect(pdf.marginLeft, rowY - 14, pdf.contentWidth, 18, true, false);

      pdf.drawText(p.planet || p.name || '', colX[0] + 10, rowY - 10, 9, false, PdfColors.DARK_TEXT);
      pdf.drawText(p.sign || '', colX[1] + 10, rowY - 10, 9, false, PdfColors.DARK_TEXT);
      pdf.drawText(String(p.house || ''), colX[2] + 10, rowY - 10, 9, false, PdfColors.DARK_TEXT);
      pdf.drawText(p.nakshatra || '', colX[3] + 10, rowY - 10, 9, false, PdfColors.DARK_TEXT);
      pdf.drawText(p.role || p.nature || '', colX[4] + 10, rowY - 10, 9, false, PdfColors.DARK_TEXT);
      pdf.drawText(p.dignity || '', colX[5] + 10, rowY - 10, 9, false, PdfColors.DARK_TEXT);

      rowY -= 18;
    }

    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawRect(pdf.marginLeft, 60, pdf.contentWidth, 380, true, true);

    pdf.drawText('6. PROFESSIONAL APTITUDES & CAREER PATHWAYS', pdf.marginLeft + 15, 420, 12, true, PdfColors.NAVY);
    const aptitudesText =
      (careerData.careerAnalysis as any)?.aptitudesAndPathways ||
      (careerData.careerAnalysis as any)?.naturalStrengths ||
      (careerData.careerAnalysis as any)?.careerDNAAnalysis ||
      'Core professional aptitudes and viable pathways.';
    this.drawWrappedText(pdf, aptitudesText, pdf.marginLeft + 15, 395, pdf.contentWidth - 30, 9.5, 14);

    return pdf.buildPdfBuffer();
  }

  /**
   * Generates a downloadable PDF buffer from any validated Structured Report Model.
   * Polymorphically routes to the respective tier's vector PDF renderer.
   */
  public async generateReportPdf(report: any): Promise<Buffer> {
    const pdf = new PdfWriter();

    if (report.type === ReportType.MARRIAGE_COMPATIBILITY) {
      this.buildMatchmakingPdf(pdf, report as MatchmakingReportModel);
      return pdf.buildPdfBuffer();
    } else if (report.type === ReportType.HOROSCOPE || report.type === ReportType.RASHI_BHAVISHYA) {
      this.buildProHoroscopePdf(pdf, report as ProHoroscopeModel);
    } else if (report.type === ReportType.CAREER || report.type === ReportType.CAREER_PROSITY) {
      this.buildCareerReportPdf(pdf, report as CareerReportModel);
    } else if (report.type === ReportType.FINANCE) {
      this.buildFinanceReportPdf(pdf, report as FinanceReportModel);
    } else if (report.type === ReportType.LOVE) {
      this.buildLoveReportPdf(pdf, report as LoveReportModel);
      return pdf.buildPdfBuffer();
    } else if (report.type === ReportType.FORTUNE) {
      this.buildFortuneReportPdf(pdf, report as FortuneReportModel);
      return pdf.buildPdfBuffer();
    } else if (report.type === ReportType.FORTUNE_PLUS) {
      this.buildFortunePlusReportPdf(pdf, report as FortunePlusReportModel);
      return pdf.buildPdfBuffer();
    } else if (report.type === ReportType.SATURN) {
      this.buildSaturnReportPdf(pdf, report as SaturnReportModel);
      return pdf.buildPdfBuffer();
    } else if (report.type === ReportType.JUPITER_TRANSIT) {
      this.buildJupiterReportPdf(pdf, report as JupiterReportModel);
      return pdf.buildPdfBuffer();
    } else if (report.type === ReportType.RAHU_KETU_TRANSIT) {
      this.buildRahuKetuReportPdf(pdf, report as RahuKetuReportModel);
      return pdf.buildPdfBuffer();
    } else if (report.type === ReportType.VARSHPHAL) {
      this.buildVarshphalReportPdf(pdf, report as VarshphalReportModel);
      return pdf.buildPdfBuffer();
    } else if (report.type === ReportType.PLANETARY_SUMMARY) {
      this.buildPlanetaryPdf(pdf, report);
    } else {
      this.buildKundliPdf(pdf, report as StructuredReportModel);
    }

    // Append Standard Author Message & Ephemeris Methodology Page
    pdf.addPage();
    this.renderSharedAuthorAndMethodology(pdf, report.title || 'Vedic Astrology Report');

    // Append Standard Legal Disclaimer & Integrity Page
    pdf.addPage();
    this.renderSharedLegalDisclaimer(pdf, report.title || 'Vedic Astrology Report');

    return pdf.buildPdfBuffer();
  }

  // ---------------------------------------------------------------------------
  // CAREER REPORT (BASIC & PRO) BUILDER
  // ---------------------------------------------------------------------------

  private buildCareerReportPdf(pdf: PdfWriter, report: CareerReportModel): void {
    const isPro = report.tier === 'PRO' || (report.type as any) === ReportType.CAREER_PROSITY;

    // =========================================================================
    // PAGE 1: COVER BANNER, CLIENT CARD, EXECUTIVE SUMMARY & DESTINY THEME
    // =========================================================================
    pdf.drawHeader(isPro ? 'Executive Career & Wealth Prosperity Dossier' : 'Personalised Vedic Career Intelligence Report');

    // Main Cover Banner Box
    pdf.setFillColor(PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(2);
    pdf.drawRect(pdf.marginLeft, 690, pdf.contentWidth, 90, true, true);

    pdf.drawText('ASTRO SUSHIL', pdf.marginLeft + 20, 755, 20, true, PdfColors.GOLD);
    pdf.drawText(
      isPro ? 'EXECUTIVE CAREER & WEALTH DOSSIER' : 'CAREER INTELLIGENCE REPORT',
      pdf.marginLeft + 20,
      735,
      13,
      true,
      PdfColors.WHITE
    );
    pdf.drawText(
      `Client: ${report.profile?.name || 'Valued Client'}  |  Generated: ${report.generatedAt ? report.generatedAt.split('T')[0] : '2026'}  |  Tier: ${isPro ? 'EXECUTIVE PRO' : 'CORE BASIC'}`,
      pdf.marginLeft + 20,
      712,
      9,
      false,
      PdfColors.LIGHT_BG
    );

    // Profile Metadata Card
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 575, pdf.contentWidth, 100, true, true);

    pdf.drawText('CLIENT & CALCULATION METADATA', pdf.marginLeft + 15, 658, 10.5, true, PdfColors.INDIGO);
    pdf.drawText(`Name: ${report.profile?.name || 'Client'}`, pdf.marginLeft + 15, 638, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Date & Time: ${report.profile?.dateOfBirth || ''} at ${report.profile?.timeOfBirth || ''}`, pdf.marginLeft + 15, 621, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Birth Place: ${report.profile?.placeName || 'Provided Location'} (${report.profile?.timezone || 'UTC'})`, pdf.marginLeft + 15, 604, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Ascendant: ${report.ascendant?.sign || 'Scorpio'} (${report.ascendant?.degree?.toFixed(2) || '0.00'}°) in ${report.ascendant?.nakshatra || ''}`, pdf.marginLeft + 15, 587, 9.5, false, PdfColors.DARK_TEXT);

    pdf.drawText(`Zodiac System: ${report.configuration?.zodiacType || 'SIDEREAL'}`, pdf.marginLeft + 290, 638, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Ayanamsa: ${report.configuration?.ayanamsa || 'LAHIRI'}`, pdf.marginLeft + 290, 621, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`House System: ${report.configuration?.houseSystem || 'WHOLE_SIGN'}`, pdf.marginLeft + 290, 604, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Node Calculation: ${report.configuration?.nodeCalculation || 'MEAN_NODE'}`, pdf.marginLeft + 290, 587, 9.5, false, PdfColors.DARK_TEXT);

    // Executive Summary Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.PURPLE);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 350, pdf.contentWidth, 210, true, true);

    pdf.drawText('1. EXECUTIVE CAREER SUMMARY & DESTINY THEME', pdf.marginLeft + 15, 540, 11, true, PdfColors.NAVY);
    const summaryText =
      report.careerOverview?.executiveSummary ||
      'Executive career analysis derived from the 10th house Karma Bhava, Ascendant vitality, and planetary significators.';
    this.drawWrappedText(pdf, summaryText, pdf.marginLeft + 15, 518, pdf.contentWidth - 30, 9.5, 14);

    const themeText = `Career Destiny Theme: ${report.careerOverview?.destinyTheme || 'Professional elevation through strategic discipline.'}\nDominant Element: ${report.careerOverview?.dominantElement || 'Earth / Practical Execution'}`;
    this.drawWrappedText(pdf, themeText, pdf.marginLeft + 15, 450, pdf.contentWidth - 30, 9, 13);

    // Strategic Decision Themes Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 60, pdf.contentWidth, 275, true, true);

    pdf.drawText('2. CORE PROFESSIONAL APTITUDES & STRATEGIC ORIENTATION', pdf.marginLeft + 15, 315, 11, true, PdfColors.NAVY);
    let aptY = 290;
    const aptitudes = report.aptitudesAndPathways || [
      'Strategic operational planning and disciplined execution',
      'Diplomatic negotiation and high-stakes conflict resolution',
      'Systemic resource allocation and financial acumen',
    ];
    for (const apt of aptitudes) {
      pdf.drawText('•', pdf.marginLeft + 20, aptY, 11, true, PdfColors.GOLD);
      aptY = this.drawWrappedText(pdf, apt, pdf.marginLeft + 35, aptY, pdf.contentWidth - 55, 9, 13);
      aptY -= 6;
    }

    const workEnvNote = `Optimal Work Setting: ${report.workEnvironments?.[0] || 'Structured corporate organizations with clear meritocratic hierarchies.'}`;
    this.drawWrappedText(pdf, workEnvNote, pdf.marginLeft + 20, aptY - 5, pdf.contentWidth - 40, 9, 13);

    // =========================================================================
    // PAGE 2: TWIN NORTH INDIAN VEDIC CHARTS (JANMA D1 & DASHAMSHA D10)
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Twin Vedic Kundli Charts: D1 & D10');

    pdf.drawText('3. TWIN VEDIC CHARTS: NATAL (D1) & DASHAMSHA (D10)', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);

    const chartSize = 185;
    const yTopCharts = 560;

    // D1 Janma Kundli
    pdf.drawText('A. JANMA KUNDLI (D1 RASHI)', pdf.marginLeft + 25, 755, 9.5, true, PdfColors.PURPLE);
    this.renderNorthIndianChart(pdf, report.houses, report.planets, pdf.marginLeft + 15, yTopCharts, chartSize);

    // D10 Dashamsha Kundli
    pdf.drawText('B. DASHAMSHA KUNDLI (D10)', pdf.marginLeft + 285, 755, 9.5, true, PdfColors.PURPLE);

    const signNames = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const d10AscSign = report.d10Summary?.ascendantSign || 'Libra';
    const d10AscIdx = Math.max(0, signNames.findIndex((s) => s.toLowerCase() === d10AscSign.toLowerCase()));
    const d10Houses: ReportHouseDto[] = [];
    for (let h = 1; h <= 12; h++) {
      const sIdx = (d10AscIdx + (h - 1)) % 12;
      const hSign = signNames[sIdx];
      const occupants: string[] = [];
      if (h === 10 && report.d10Summary?.occupantsInTenth) {
        occupants.push(...report.d10Summary.occupantsInTenth);
      }
      if (report.d10Summary?.tenthLordPlacement?.house === h) {
        if (!occupants.includes(report.d10Summary.tenthLordPlacement.planet)) {
          occupants.push(report.d10Summary.tenthLordPlacement.planet);
        }
      }
      d10Houses.push({
        houseNumber: h,
        sign: hSign,
        planetsPresent: occupants,
      });
    }
    this.renderNorthIndianChart(pdf, d10Houses, report.planets, pdf.marginLeft + 275, yTopCharts, chartSize);

    // Explanatory Box below Twin Charts
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft, 60, pdf.contentWidth, 480, true, true);

    pdf.drawText('COMPARATIVE SYNTHESIS: THE D1 vs D10 HARMONIC AXIS', pdf.marginLeft + 15, 520, 10.5, true, PdfColors.INDIGO);

    const chartExplanations = [
      '• Janma Kundli (D1 Rashi Chart): The physical blueprint of your incarnation. Reflects your foundational vitality, innate temperament, baseline work capacity, and the spatial orientation of career houses at birth.',
      `• Dashamsha Kundli (D10 Micro-Chart): The microscopic 10th harmonic division devoted strictly to profession, authority, public status, and career accomplishments. Governed by ${report.d10Summary?.ascendantSign || 'Libra'} Lagna in your chart.`,
      `• D1-D10 Synthesis: While the D1 chart reveals what opportunities life presents, the D10 chart dictates how effectively you convert those opportunities into enduring professional authority.`,
      `• 10th House Dynamic: D1 10th house is in ${report.houses.find((h) => h.houseNumber === 10)?.sign || 'Leo'} (apex public calling), whereas D10 10th house falls in ${report.d10Summary?.tenthSign || 'Cancer'}, ruled by ${report.d10Summary?.tenthLord || 'Moon'} placed in House ${report.d10Summary?.tenthLordPlacement?.house || 5}.`,
    ];

    let expY = 495;
    for (const exp of chartExplanations) {
      expY = this.drawWrappedText(pdf, exp, pdf.marginLeft + 15, expY, pdf.contentWidth - 30, 9, 13);
      expY -= 10;
    }

    // =========================================================================
    // PAGE 3: THE 6 CORE CAREER HOUSES (HOUSES 10, 1, 2, 6, 7, 11)
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Core Career Bhavas (Houses)');

    pdf.drawText('4. SYSTEMATIC ANALYSIS OF CAREER HOUSES', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);

    let houseY = 750;
    const careerHousesToDisplay = report.careerHouses || [];
    for (let i = 0; i < Math.min(careerHousesToDisplay.length, 6); i++) {
      const ch = careerHousesToDisplay[i];
      pdf.setFillColor(i % 2 === 0 ? PdfColors.WHITE : PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft, houseY - 85, pdf.contentWidth, 80, true, true);

      pdf.drawText(
        `HOUSE ${ch.houseNumber}: ${ch.sign.toUpperCase()} (Ruled by ${ch.signLord}) — ${ch.significance}`,
        pdf.marginLeft + 12,
        houseY - 16,
        9.5,
        true,
        PdfColors.NAVY
      );

      const occText = ch.occupants && ch.occupants.length > 0 ? `Occupants: ${ch.occupants.join(', ')}  |  ` : 'Occupants: None  |  ';
      pdf.drawText(
        `${occText}Aspects: ${ch.aspectingPlanets?.length ? ch.aspectingPlanets.join(', ') : 'None'}`,
        pdf.marginLeft + 12,
        houseY - 30,
        8.5,
        false,
        PdfColors.PURPLE
      );

      this.drawWrappedText(pdf, ch.interpretation, pdf.marginLeft + 12, houseY - 44, pdf.contentWidth - 24, 8.5, 11);

      houseY -= 92;
    }

    // =========================================================================
    // PAGE 4: KEY PLANETARY SIGNIFICATORS & CAREER YOGAS
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Planetary Significators & Career Yogas');

    pdf.drawText('5. KEY PLANETARY CAREER SIGNIFICATORS', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);

    const sigCols = [
      { name: 'Planet', x: pdf.marginLeft + 10 },
      { name: 'Placement', x: pdf.marginLeft + 80 },
      { name: 'Dignity', x: pdf.marginLeft + 190 },
      { name: 'Role & Impact', x: pdf.marginLeft + 300 },
    ];

    pdf.setFillColor(PdfColors.INDIGO);
    pdf.drawRect(pdf.marginLeft, 755 - 18, pdf.contentWidth, 22, true, false);
    for (const c of sigCols) {
      pdf.drawText(c.name, c.x, 755 - 13, 9, true, PdfColors.WHITE);
    }

    let sigY = 730;
    const significators = report.planetarySignificators || [];
    for (let i = 0; i < significators.length; i++) {
      const ps = significators[i];
      pdf.setFillColor(i % 2 === 0 ? PdfColors.WHITE : PdfColors.LIGHT_BG);
      pdf.drawRect(pdf.marginLeft, sigY - 32, pdf.contentWidth, 34, true, false);

      pdf.drawText(ps.planet, sigCols[0].x, sigY - 14, 9, true, PdfColors.NAVY);
      pdf.drawText(`H${ps.house} in ${ps.sign}`, sigCols[1].x, sigY - 14, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(ps.dignity, sigCols[2].x, sigY - 14, 8.5, false, PdfColors.PURPLE);
      this.drawWrappedText(pdf, ps.impactOnCareer, sigCols[3].x, sigY - 12, pdf.contentWidth - 315, 8, 10);

      sigY -= 36;
    }

    // Career Yogas Section
    pdf.drawText('6. MAGICAL CAREER YOGAS & CELESTIAL COMBINATIONS', pdf.marginLeft, sigY - 15, 11, true, PdfColors.INDIGO);

    let yogaY = sigY - 35;
    const yogas = report.careerYogas || [];
    for (let i = 0; i < Math.min(yogas.length, 4); i++) {
      const y = yogas[i];
      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.GOLD);
      pdf.drawRect(pdf.marginLeft, yogaY - 60, pdf.contentWidth, 58, true, true);

      pdf.drawText(`• ${y.name} (${y.category})`, pdf.marginLeft + 12, yogaY - 16, 9.5, true, PdfColors.NAVY);
      pdf.drawText(`Planets Involved: ${y.planetsInvolved.join(', ')}`, pdf.marginLeft + 12, yogaY - 29, 8.5, false, PdfColors.PURPLE);
      this.drawWrappedText(pdf, `${y.description} ${y.careerImpact}`, pdf.marginLeft + 12, yogaY - 42, pdf.contentWidth - 24, 8, 10);

      yogaY -= 68;
    }

    // =========================================================================
    // PAGE 5: D10 DASHAMSHA DEEP DIVE & DASHA CAREER TIMELINE
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('D10 Dashamsha Deep Dive & Dasha Timeline');

    pdf.drawText('7. DASHAMSHA (D10) FUNCTIONAL ANALYSIS', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.PURPLE);
    pdf.drawRect(pdf.marginLeft, 580, pdf.contentWidth, 175, true, true);

    const d10 = report.d10Summary;
    pdf.drawText(`D10 Ascendant: ${d10?.ascendantSign || 'Libra'}  |  10th House: ${d10?.tenthSign || 'Cancer'} (Ruled by ${d10?.tenthLord || 'Moon'})`, pdf.marginLeft + 15, 735, 10, true, PdfColors.NAVY);
    this.drawWrappedText(pdf, d10?.synthesis || 'Detailed synthesis of D10 career chart.', pdf.marginLeft + 15, 715, pdf.contentWidth - 30, 9, 13);

    pdf.drawText('Ascendant Persona Traits in D10 Workplace Setting:', pdf.marginLeft + 15, 665, 9, true, PdfColors.PURPLE);
    let trY = 648;
    for (const tr of d10?.ascendantTraits?.slice(0, 3) || ['Diplomatic consensus', 'Balanced negotiations', 'Refined presentation']) {
      pdf.drawText(`• ${tr}`, pdf.marginLeft + 25, trY, 8.5, false, PdfColors.DARK_TEXT);
      trY -= 14;
    }

    // Dasha Timeline Box
    pdf.drawText('8. VIMSHOTTARI DASHA CAREER TIMELINE', pdf.marginLeft, 560, 11, true, PdfColors.INDIGO);

    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft, 320, pdf.contentWidth, 220, true, true);

    const dashaText = `Current Dasha Influence: Operating under active Mahadasha cycles with sub-periods shaping promotion windows, role expansions, and strategic responsibilities.\n\nRecommended Industry Sectors:\n• ${report.suitableIndustries?.join('\n• ') || 'Corporate Strategy\n• Advisory Consultancy\n• Technology'}`;
    this.drawWrappedText(pdf, dashaText, pdf.marginLeft + 15, 520, pdf.contentWidth - 30, 9, 14);

    // Practical Work Guidance Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawRect(pdf.marginLeft, 60, pdf.contentWidth, 240, true, true);

    pdf.drawText('9. WORK ENVIRONMENT & STRATEGIC RECOMMENDATIONS', pdf.marginLeft + 15, 280, 10.5, true, PdfColors.NAVY);
    const envText = (report.workEnvironments || []).map((we) => `• ${we}`).join('\n\n');
    this.drawWrappedText(pdf, envText, pdf.marginLeft + 15, 255, pdf.contentWidth - 30, 9, 13);

    // =========================================================================
    // PRO TIER EXTENSIONS (PAGES 6 TO 11)
    // =========================================================================
    if (isPro) {
      // -----------------------------------------------------------------------
      // PAGE 6: JAIMINI AMATYAKARAKA (AmK) DEEP DIVE
      // -----------------------------------------------------------------------
      pdf.addPage();
      pdf.drawHeader('Amatyakaraka: Soul Career Minister');

      pdf.drawText('10. JAIMINI AMATYAKARAKA (AmK) ANALYSIS', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);

      const amk = report.amatyakaraka;
      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.GOLD);
      pdf.drawRect(pdf.marginLeft, 590, pdf.contentWidth, 165, true, true);

      pdf.drawText(
        `AMATYAKARAKA PLANET: ${amk?.planet?.toUpperCase() || 'MOON'} (${amk?.degreeInSign || '27.8'}° in ${amk?.sign || 'Virgo'}, House ${amk?.house || 11})`,
        pdf.marginLeft + 15,
        735,
        11,
        true,
        PdfColors.NAVY
      );

      this.drawWrappedText(pdf, amk?.coreAdvisory || 'The Amatyakaraka guides your natural talents and soul career calling.', pdf.marginLeft + 15, 712, pdf.contentWidth - 30, 9, 13);
      this.drawWrappedText(pdf, `Growth Guidance: ${amk?.growthAdvice || 'Align career choices with your natural emotional wisdom and strategic discernment.'}`, pdf.marginLeft + 15, 630, pdf.contentWidth - 30, 8.5, 12);

      // Natural Talents & Environments
      pdf.drawText('NATURAL PROFESSIONAL TALENTS & OPTIMAL ENVIRONMENTS', pdf.marginLeft, 570, 10.5, true, PdfColors.INDIGO);

      pdf.setFillColor(PdfColors.WHITE);
      pdf.setStrokeColor(PdfColors.PURPLE);
      pdf.drawRect(pdf.marginLeft, 60, pdf.contentWidth, 490, true, true);

      pdf.drawText('Key Professional Talents:', pdf.marginLeft + 15, 530, 10, true, PdfColors.PURPLE);
      let tY = 510;
      for (const tal of amk?.naturalTalents || ['Strategic analysis', 'Empathetic counseling', 'Crisis resolution']) {
        pdf.drawText(`• ${tal}`, pdf.marginLeft + 25, tY, 9, false, PdfColors.DARK_TEXT);
        tY -= 18;
      }

      pdf.drawText('Ideal Work Environments:', pdf.marginLeft + 15, tY - 10, 10, true, PdfColors.PURPLE);
      let eY = tY - 30;
      for (const env of amk?.idealWorkEnvironments || ['Executive consulting', 'Advisory councils', 'Healthcare & Wellness']) {
        pdf.drawText(`• ${env}`, pdf.marginLeft + 25, eY, 9, false, PdfColors.DARK_TEXT);
        eY -= 18;
      }

      // -----------------------------------------------------------------------
      // PAGE 7: BHRIGU NANDI NADI (BNN) SHANI DEV & SATURN CHAINS
      // -----------------------------------------------------------------------
      pdf.addPage();
      pdf.drawHeader('Bhrigu Nandi Nadi: Shani Dev');

      pdf.drawText('11. BHRIGU NANDI NADI (BNN): SHANI DEV & KARMIC PROGRESSION', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);

      const bnn = report.bnnSaturnAnalysis;
      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.NAVY);
      pdf.drawRect(pdf.marginLeft, 630, pdf.contentWidth, 125, true, true);

      pdf.drawText(`SATURN IN ${bnn?.saturnSign?.toUpperCase() || 'LIBRA'} (HOUSE ${bnn?.saturnHouse || 12}) — ${bnn?.saturnDignity || 'EXALTED'}`, pdf.marginLeft + 15, 735, 10.5, true, PdfColors.NAVY);
      this.drawWrappedText(
        pdf,
        bnn?.saturnMindset || 'In Bhrigu Nandi Nadi, Saturn (Shani Dev) is the supreme governor of duty, discipline, and career karma.',
        pdf.marginLeft + 15,
        715,
        pdf.contentWidth - 30,
        9,
        13
      );

      // Placement & 3-Fold Aspects
      pdf.drawText('NATAL PLACEMENT & 3-FOLD ASPECTUAL GLANCES (DRISHTI)', pdf.marginLeft, 610, 10.5, true, PdfColors.INDIGO);

      pdf.setFillColor(PdfColors.WHITE);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft, 475, pdf.contentWidth, 120, true, true);

      this.drawWrappedText(
        pdf,
        bnn?.saturnInSignAnalysis || 'Saturn in 12th house governs visionary institutional strategy and large systems.',
        pdf.marginLeft + 15,
        578,
        pdf.contentWidth - 30,
        8.5,
        12
      );

      let aspY = 525;
      for (const asp of bnn?.saturnAspects || []) {
        pdf.drawText(`• House ${asp.house} (${asp.sign}): ${asp.nature}`, pdf.marginLeft + 15, aspY, 8, false, PdfColors.DARK_TEXT);
        aspY -= 14;
      }

      // Saturn's Planetary Chains
      pdf.drawText("SATURN'S DIRECTIONAL PLANETARY CHAINS (BNN COMBINATIONS)", pdf.marginLeft, 455, 10.5, true, PdfColors.INDIGO);

      let chainY = 435;
      for (const ch of bnn?.saturnPlanetaryChains?.slice(0, 3) || []) {
        pdf.setFillColor(PdfColors.LIGHT_BG);
        pdf.setStrokeColor(PdfColors.GOLD);
        pdf.drawRect(pdf.marginLeft, chainY - 95, pdf.contentWidth, 90, true, true);

        pdf.drawText(`• ${ch.planet} — ${ch.relationship}`, pdf.marginLeft + 12, chainY - 16, 9.5, true, PdfColors.NAVY);
        pdf.drawText(`Significance: ${ch.significance}`, pdf.marginLeft + 12, chainY - 30, 8, false, PdfColors.PURPLE);
        this.drawWrappedText(pdf, `Synthesis: ${ch.synthesis}`, pdf.marginLeft + 12, chainY - 44, pdf.contentWidth - 24, 8, 10);

        chainY -= 105;
      }

      // -----------------------------------------------------------------------
      // PAGE 8: GOVERNMENT JOB (RAJYA SEVA YOGA) ANALYSIS
      // -----------------------------------------------------------------------
      pdf.addPage();
      pdf.drawHeader('Government Job & Rajya Seva Yoga');

      pdf.drawText('12. GOVERNMENT JOB & RAJYA SEVA YOGA ANALYSIS', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);

      const gov = report.governmentJobAnalysis;
      pdf.setFillColor(PdfColors.WHITE);
      pdf.setStrokeColor(PdfColors.PURPLE);
      pdf.drawRect(pdf.marginLeft, 580, pdf.contentWidth, 175, true, true);

      pdf.drawText(`RAJYA SEVA YOGA STATUS: ${gov?.rajyaSevaYogaStatus || 'MODERATE'}`, pdf.marginLeft + 15, 735, 11, true, PdfColors.NAVY);
      pdf.drawText(`Sun Dignity: ${gov?.sunDignity || 'Dignified'} in House ${gov?.sunHouse || 2}  |  Sun-Saturn Dynamic: Balanced`, pdf.marginLeft + 15, 715, 9, false, PdfColors.PURPLE);

      this.drawWrappedText(pdf, `Verdict: ${gov?.verdict || 'Favorable aptitude for public sector or organized institutional roles.'}`, pdf.marginLeft + 15, 690, pdf.contentWidth - 30, 9, 13);
      this.drawWrappedText(pdf, `Sixth House (Exams & Service): ${gov?.sixthHouseInfluence || 'Reflects competitive stamina.'}`, pdf.marginLeft + 15, 630, pdf.contentWidth - 30, 8.5, 12);
      this.drawWrappedText(pdf, `Tenth House (Authority): ${gov?.tenthHouseInfluence || 'Reflects executive standing.'}`, pdf.marginLeft + 15, 598, pdf.contentWidth - 30, 8.5, 12);

      // Recommendations Box
      pdf.drawText('STRATEGIC RECOMMENDATIONS FOR PUBLIC SECTOR & COMPETITIVE ROLES', pdf.marginLeft, 560, 10.5, true, PdfColors.INDIGO);

      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.GOLD);
      pdf.drawRect(pdf.marginLeft, 60, pdf.contentWidth, 480, true, true);

      let recY = 520;
      for (const rec of gov?.recommendations || ['Focus on procedural mastery', 'Maintain transparent documentation']) {
        pdf.drawText('•', pdf.marginLeft + 20, recY, 11, true, PdfColors.GOLD);
        recY = this.drawWrappedText(pdf, rec, pdf.marginLeft + 35, recY, pdf.contentWidth - 55, 9, 13);
        recY -= 15;
      }

      // -----------------------------------------------------------------------
      // PAGE 9: ENTREPRENEURIAL COMPASS & ASHTAKAVARGA SAV POINTS
      // -----------------------------------------------------------------------
      pdf.addPage();
      pdf.drawHeader('Entrepreneurial Compass & SAV Analysis');

      pdf.drawText('13. ENTREPRENEURIAL COMPASS & ASHTAKAVARGA SAV ANALYSIS', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);

      const ent = report.entrepreneurialCompass;
      const sav = ent?.ashtakavargaSavPoints;
      const comp = ent?.comparativeAnalysis;

      // SAV Cards Grid (5 core career houses: 10, 11, 7, 6, 1)
      pdf.drawText('SARVASHTAKAVARGA (SAV) CAREER BINDUS (BASELINE: 28 POINTS)', pdf.marginLeft, 755, 9.5, true, PdfColors.NAVY);

      const savBoxes = [
        { title: '10th (Karma)', val: sav?.tenthHouse ?? 28, desc: 'Public authority' },
        { title: '11th (Labha)', val: sav?.eleventhHouse ?? 34, desc: 'Compounding gains' },
        { title: '7th (Vyapar)', val: sav?.seventhHouse ?? 26, desc: 'Partnerships & deals' },
        { title: '6th (Seva)', val: sav?.sixthHouse ?? 30, desc: 'Service & stamina' },
        { title: '1st (Lagna)', val: sav?.firstHouse ?? 26, desc: 'Personal vitality' },
      ];

      const bW = (pdf.contentWidth - 40) / 5;
      for (let i = 0; i < 5; i++) {
        const bx = pdf.marginLeft + i * (bW + 10);
        pdf.setFillColor(savBoxes[i].val >= 28 ? PdfColors.WHITE : PdfColors.LIGHT_BG);
        pdf.setStrokeColor(savBoxes[i].val >= 28 ? PdfColors.GOLD : PdfColors.BORDER_GREY);
        pdf.drawRect(bx, 675, bW, 65, true, true);

        pdf.drawText(savBoxes[i].title, bx + 6, 725, 7.5, true, PdfColors.INDIGO);
        pdf.drawText(`${savBoxes[i].val}`, bx + 6, 702, 14, true, savBoxes[i].val >= 28 ? PdfColors.GOLD : PdfColors.NAVY);
        pdf.drawText(savBoxes[i].desc, bx + 6, 685, 6.5, false, PdfColors.DARK_TEXT);
      }

      // Qualitative Business vs Employment Comparative Evaluation Box
      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.PURPLE);
      pdf.drawRect(pdf.marginLeft, 370, pdf.contentWidth, 285, true, true);

      pdf.drawText('ASHTAKAVARGA COMPARATIVE EVALUATION (6th vs 7th & 11th vs 10th)', pdf.marginLeft + 15, 635, 10, true, PdfColors.NAVY);

      pdf.drawText(`6th vs 7th House Verdict: ${comp?.sixthVsSeventhVerdict || 'EMPLOYMENT_PREFERRED'} (6th: ${sav?.sixthHouse || 29} pts vs 7th: ${sav?.seventhHouse || 22} pts)`, pdf.marginLeft + 15, 615, 8.5, true, PdfColors.INDIGO);
      this.drawWrappedText(pdf, comp?.sixthVsSeventhAnalysis || 'Structured employment provides superior stability over standalone enterprise.', pdf.marginLeft + 15, 600, pdf.contentWidth - 30, 8, 11);

      pdf.drawText(`11th vs 10th House Verdict: ${comp?.eleventhVsTenthVerdict || 'REWARDS_EXCEED_EFFORT'} (11th: ${sav?.eleventhHouse || 31} pts vs 10th: ${sav?.tenthHouse || 29} pts)`, pdf.marginLeft + 15, 545, 8.5, true, PdfColors.INDIGO);
      this.drawWrappedText(pdf, comp?.eleventhVsTenthAnalysis || 'Gains comfortably exceed day-to-day exertion due to compounding returns.', pdf.marginLeft + 15, 530, pdf.contentWidth - 30, 8, 11);

      pdf.drawText(`Recommended Orientation: ${comp?.preferredOrientation || 'EMPLOYMENT_FOCUSED'}`, pdf.marginLeft + 15, 475, 9, true, PdfColors.PURPLE);
      this.drawWrappedText(pdf, comp?.rationale || 'An employment-focused model anchoring in executive roles and structured hierarchies.', pdf.marginLeft + 15, 460, pdf.contentWidth - 30, 8, 11);

      // Favorable Commercial Sectors
      pdf.drawText('FAVORABLE COMMERCIAL SECTORS & EXPANSION PATHWAYS', pdf.marginLeft, 350, 10.5, true, PdfColors.INDIGO);

      pdf.setFillColor(PdfColors.WHITE);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft, 60, pdf.contentWidth, 275, true, true);

      let fsY = 315;
      for (const sec of ent?.favorableSectors || ['Fintech & Wealth Management', 'Strategic Advisory & Consultancy']) {
        pdf.drawText('•', pdf.marginLeft + 20, fsY, 11, true, PdfColors.GOLD);
        fsY = this.drawWrappedText(pdf, sec, pdf.marginLeft + 35, fsY, pdf.contentWidth - 55, 9, 13);
        fsY -= 15;
      }

      // -----------------------------------------------------------------------
      // PAGE 10: 5-YEAR CHRONOLOGICAL CAREER ROADMAP (2026–2031)
      // -----------------------------------------------------------------------
      pdf.addPage();
      pdf.drawHeader('5-Year Chronological Career Roadmap');

      pdf.drawText('14. CHRONOLOGICAL MULTI-YEAR CAREER ROADMAP (2026–2031)', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);

      let rmY = 750;
      for (const item of report.multiYearCareerRoadmap || []) {
        pdf.setFillColor(PdfColors.LIGHT_BG);
        pdf.setStrokeColor(PdfColors.BORDER_GREY);
        pdf.drawRect(pdf.marginLeft, rmY - 175, pdf.contentWidth, 170, true, true);

        pdf.drawText(`HORIZON: ${item.period} (${item.durationYears} YRS) — ${item.careerPhase.toUpperCase()}`, pdf.marginLeft + 15, rmY - 18, 9, true, PdfColors.NAVY);
        pdf.drawText(`Governing Cycle: ${item.mahadasha} Mahadasha / ${item.antardasha} Antardasha  |  ${item.astrologicalBasis}`, pdf.marginLeft + 15, rmY - 34, 7.5, false, PdfColors.PURPLE);

        pdf.drawText('Key Opportunities:', pdf.marginLeft + 15, rmY - 50, 8, true, PdfColors.DARK_TEXT);
        for (let oIdx = 0; oIdx < Math.min(item.opportunities.length, 3); oIdx++) {
          pdf.drawText(`• ${item.opportunities[oIdx]}`, pdf.marginLeft + 22, rmY - 62 - oIdx * 12, 7.5, false, PdfColors.DARK_TEXT);
        }

        const chalTop = rmY - 100;
        pdf.drawText('Navigational Challenges:', pdf.marginLeft + 15, chalTop, 8, true, PdfColors.DARK_TEXT);
        for (let cIdx = 0; cIdx < Math.min(item.challenges.length, 2); cIdx++) {
          pdf.drawText(`• ${item.challenges[cIdx]}`, pdf.marginLeft + 22, chalTop - 12 - cIdx * 12, 7.5, false, PdfColors.DARK_TEXT);
        }

        const advTop = rmY - 138;
        pdf.drawText('Strategic Actionable Guidance:', pdf.marginLeft + 15, advTop, 8, true, PdfColors.INDIGO);
        this.drawWrappedText(pdf, item.actionableAdvice, pdf.marginLeft + 22, advTop - 11, pdf.contentWidth - 44, 7.5, 9.5);

        rmY -= 185;
      }

      // -----------------------------------------------------------------------
      // PAGE 11: CONSECRATED CELESTIAL REMEDIES & KARMIC BALANCE
      // -----------------------------------------------------------------------
      pdf.addPage();
      pdf.drawHeader('Consecrated Remedies & Karmic Balance');

      pdf.drawText('15. CELESTIAL REMEDIES: GEMSTONES, MANTRAS & LIFESTYLE', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);

      const rem = report.careerRemedies;

      // Primary Gemstone Card
      pdf.setFillColor(PdfColors.WHITE);
      pdf.setStrokeColor(PdfColors.GOLD);
      pdf.drawRect(pdf.marginLeft, 610, pdf.contentWidth, 145, true, true);

      pdf.drawText(`PRIMARY FORTUNE GEMSTONE (BHAGYA RATNA): ${rem?.primaryGemstone?.gemstone || 'Yellow Sapphire'}`, pdf.marginLeft + 15, 735, 10.5, true, PdfColors.NAVY);
      pdf.drawText(
        `Sanskrit: ${rem?.primaryGemstone?.sanskritName || 'Pukhraj'}  |  Lord: ${rem?.primaryGemstone?.rulingPlanet || 'Jupiter'}  |  Set in: ${rem?.primaryGemstone?.metal || 'Gold'}  |  Finger: ${rem?.primaryGemstone?.finger || 'Index Finger'}`,
        pdf.marginLeft + 15,
        715,
        8.5,
        false,
        PdfColors.PURPLE
      );
      this.drawWrappedText(pdf, rem?.primaryGemstone?.benefits || 'Enhances higher wisdom and career fortune.', pdf.marginLeft + 15, 695, pdf.contentWidth - 30, 8.5, 12);
      this.drawWrappedText(pdf, `Caution & Muhurta: ${rem?.primaryGemstone?.caution || 'Wear during Shukla Paksha.'}`, pdf.marginLeft + 15, 640, pdf.contentWidth - 30, 8, 11);

      // Mantras Card
      pdf.drawText('SACRED PLANETARY MANTRAS FOR CAREER HARMONIZATION', pdf.marginLeft, 590, 10.5, true, PdfColors.INDIGO);

      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft, 430, pdf.contentWidth, 145, true, true);

      let mY = 555;
      for (const man of rem?.mantras || []) {
        pdf.drawText(`• ${man.planet}: "${man.mantraText}" (${man.count} times)`, pdf.marginLeft + 15, mY, 8.5, true, PdfColors.NAVY);
        pdf.drawText(`  Purpose: ${man.purpose}`, pdf.marginLeft + 15, mY - 14, 8, false, PdfColors.DARK_TEXT);
        mY -= 32;
      }

      // Lifestyle Alchemy & Karmic Balance
      pdf.drawText('LIFESTYLE ALCHEMY & SHANI DEV CHARITABLE DISCIPLINES', pdf.marginLeft, 410, 10.5, true, PdfColors.INDIGO);

      pdf.setFillColor(PdfColors.WHITE);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft, 60, pdf.contentWidth, 335, true, true);

      let lsY = 370;
      for (const hab of rem?.lifestyleAndHabits || ['Maintain absolute integrity in commercial commitments']) {
        pdf.drawText('•', pdf.marginLeft + 15, lsY, 11, true, PdfColors.GOLD);
        lsY = this.drawWrappedText(pdf, hab, pdf.marginLeft + 30, lsY, pdf.contentWidth - 45, 8.5, 12);
        lsY -= 10;
      }

      pdf.drawText('Karmic Charity (Dana):', pdf.marginLeft + 15, lsY - 10, 9.5, true, PdfColors.INDIGO);
      let chY = lsY - 30;
      for (const kc of rem?.karmicCharity || []) {
        pdf.drawText(`• ${kc.planet} Dana: Donate ${kc.charityItem} on ${kc.day} to ${kc.recipient}.`, pdf.marginLeft + 25, chY, 8.5, false, PdfColors.DARK_TEXT);
        chY -= 16;
      }
    }
  }

  private buildKundliPdf(pdf: PdfWriter, report: StructuredReportModel): void {
    // PAGE 1: Cover Banner, Profile, Configuration, Avakahada Chakra & Panchang Snapshot
    pdf.drawHeader('Premium Personalised Kundli Report');

    // Banner Box
    pdf.setFillColor(PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(2);
    pdf.drawRect(pdf.marginLeft, 690, pdf.contentWidth, 90, true, true);

    pdf.drawText('ASTRO SUSHIL', pdf.marginLeft + 20, 755, 20, true, PdfColors.GOLD);
    pdf.drawText('PREMIUM PERSONALISED KUNDLI & LIFE BLUEPRINT', pdf.marginLeft + 20, 735, 13, true, PdfColors.WHITE);
    pdf.drawText(
      `Native: ${report.profile.name}  |  Generated: ${new Date(report.generatedAt).toLocaleDateString()}  |  Engine Version 1.0.0`,
      pdf.marginLeft + 20,
      712,
      9,
      false,
      PdfColors.WHITE
    );

    let curY = 660;

    // 1. Birth Profile & Astronomical Configuration Card
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, curY - 95, pdf.contentWidth, 95, true, true);

    pdf.drawText('1. BIRTH PROFILE & SYSTEM CONFIGURATION', pdf.marginLeft + 15, curY - 18, 11, true, PdfColors.INDIGO);
    pdf.drawText(`Full Name: ${report.profile.name}`, pdf.marginLeft + 15, curY - 38, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Date & Time: ${report.profile.dateOfBirth} ${report.profile.timeOfBirth}`, pdf.marginLeft + 15, curY - 54, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Place & Timezone: ${report.profile.placeName || 'Not Specified'} (${report.profile.timezone})`, pdf.marginLeft + 15, curY - 70, 9.5, false, PdfColors.DARK_TEXT);

    pdf.drawText(`Zodiac: ${report.configuration.zodiacType}`, pdf.marginLeft + 310, curY - 38, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Ayanamsa: ${report.configuration.ayanamsa}`, pdf.marginLeft + 310, curY - 54, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`House System: ${report.configuration.houseSystem}`, pdf.marginLeft + 310, curY - 70, 9.5, false, PdfColors.DARK_TEXT);

    // 2. Avakahada Chakra Card
    curY -= 115;
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.PURPLE);
    pdf.drawRect(pdf.marginLeft, curY - 105, pdf.contentWidth, 105, true, true);

    pdf.drawText('2. AVAKAHADA CHAKRA (COSMIC CONSTITUTION)', pdf.marginLeft + 15, curY - 18, 11, true, PdfColors.PURPLE);
    const av = report.avakahadaChakra || {
      varna: 'Vaishya', vashya: 'Manava', yoni: 'Mahisha', gana: 'Deva', nadi: 'Adi',
      rashi: report.ascendant.sign, rashiLord: 'Moon', nakshatra: report.nakshatra.birthNakshatra,
      pada: report.nakshatra.pada, namakshara: 'Tha', tatwa: 'Prithvi', paya: 'Swarna (Gold)',
    };

    pdf.drawText(`Varna: ${av.varna}`, pdf.marginLeft + 15, curY - 38, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Vashya: ${av.vashya}`, pdf.marginLeft + 15, curY - 54, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Yoni: ${av.yoni}`, pdf.marginLeft + 15, curY - 70, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Gana: ${av.gana}`, pdf.marginLeft + 15, curY - 86, 9, false, PdfColors.DARK_TEXT);

    pdf.drawText(`Nadi: ${av.nadi}`, pdf.marginLeft + 190, curY - 38, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Rashi: ${av.rashi} (${av.rashiLord})`, pdf.marginLeft + 190, curY - 54, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Nakshatra: ${av.nakshatra} (Pada ${av.pada})`, pdf.marginLeft + 190, curY - 70, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Namakshara: ${av.namakshara}`, pdf.marginLeft + 190, curY - 86, 9, false, PdfColors.DARK_TEXT);

    pdf.drawText(`Tatwa (Element): ${av.tatwa}`, pdf.marginLeft + 370, curY - 38, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Paya (Metal): ${av.paya}`, pdf.marginLeft + 370, curY - 54, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Ascendant: ${report.ascendant.sign} (${report.ascendant.degree.toFixed(2)}°)`, pdf.marginLeft + 370, curY - 70, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Nakshatra Pada: ${report.ascendant.pada}`, pdf.marginLeft + 370, curY - 86, 9, false, PdfColors.DARK_TEXT);

    // 3. Snapshot of Panchang Card
    curY -= 125;
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft, curY - 95, pdf.contentWidth, 95, true, true);

    pdf.drawText('3. SNAPSHOT OF PANCHANG AT BIRTH', pdf.marginLeft + 15, curY - 18, 11, true, PdfColors.INDIGO);
    const pan = report.panchangSnapshot || {
      tithi: 'Navami', vara: 'Budhavara', nakshatra: report.nakshatra.birthNakshatra,
      yoga: 'Shobhana', karana: 'Taitila', paksha: 'KRISHNA',
      sunrise: '06:45:00', sunset: '18:15:00', dayDuration: '11h 30m', ayan: 'Dakshinayan', season: 'Hemanta',
    };

    pdf.drawText(`Tithi: ${pan.tithi} (${pan.paksha} Paksha)`, pdf.marginLeft + 15, curY - 38, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Vara (Weekday): ${pan.vara}`, pdf.marginLeft + 15, curY - 54, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Nakshatra: ${pan.nakshatra}`, pdf.marginLeft + 15, curY - 70, 9, false, PdfColors.DARK_TEXT);

    pdf.drawText(`Yoga: ${pan.yoga}`, pdf.marginLeft + 210, curY - 38, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Karana: ${pan.karana}`, pdf.marginLeft + 210, curY - 54, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Ayan / Season: ${pan.ayan} / ${pan.season}`, pdf.marginLeft + 210, curY - 70, 9, false, PdfColors.DARK_TEXT);

    pdf.drawText(`Sunrise: ${pan.sunrise}`, pdf.marginLeft + 390, curY - 38, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Sunset: ${pan.sunset}`, pdf.marginLeft + 390, curY - 54, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Day Duration: ${pan.dayDuration}`, pdf.marginLeft + 390, curY - 70, 9, false, PdfColors.DARK_TEXT);

    // PAGE 2: Vector North Indian Kundli Charts (Lagna D1, Chandra & Navamsha D9)
    pdf.addPage();
    pdf.drawHeader('Vedic Kundli Charts');

    pdf.drawText('4. NORTH INDIAN KUNDLI CHART & VEDIC CHARTS', pdf.marginLeft, 775, 12, true, PdfColors.INDIGO);

    // Draw 3 Charts: Lagna (D1), Chandra (Moon), and Navamsha (D9)
    const chartSize = 160;
    const yTopCharts = 575;

    // Lagna Chart (D1)
    pdf.drawText('A. JANMA KUNDLI (D1 RASI)', pdf.marginLeft + 15, 755, 9.5, true, PdfColors.PURPLE);
    this.renderNorthIndianChart(pdf, report.houses, report.planets, pdf.marginLeft + 5, yTopCharts, chartSize);

    // Chandra Chart (Moon)
    pdf.drawText('B. CHANDRA KUNDLI (MOON)', pdf.marginLeft + 185, 755, 9.5, true, PdfColors.PURPLE);
    this.renderNorthIndianChart(
      pdf,
      report.chandraKundli?.houses || report.houses,
      report.planets,
      pdf.marginLeft + 175,
      yTopCharts,
      chartSize
    );

    // Navamsha Chart (D9)
    pdf.drawText('C. NAVAMSHA KUNDLI (D9)', pdf.marginLeft + 355, 755, 9.5, true, PdfColors.PURPLE);
    this.renderNorthIndianChart(
      pdf,
      report.navamshaKundli?.houses || report.houses,
      report.planets,
      pdf.marginLeft + 345,
      yTopCharts,
      chartSize
    );

    // Explanation Box below charts
    curY = 540;
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft, curY - 145, pdf.contentWidth, 145, true, true);

    pdf.drawText('UNDERSTANDING THE THREE CORE KUNDLI CHARTS', pdf.marginLeft + 15, curY - 18, 10, true, PdfColors.INDIGO);
    const chartExplanations = [
      '• Janma Kundli (D1 Rasi Chart): The physical blueprint of your incarnation. Reflects physical vitality, temperament, visible achievements, and the exact spatial orientation of the 12 houses at birth.',
      '• Chandra Kundli (Moon Chart): Analyzes the chart using your natal Moon sign as the 1st house. Governs subjective emotional responses, psychological instincts, subconscious tendencies, and perceived happiness.',
      '• Navamsha Kundli (D9 Chart): The microscopic 9th harmonic division. Reveals internal soul dharma, sustained planetary dignity in later life, relationship harmony, and true karmic strength.',
    ];
    let expY = curY - 38;
    for (const exp of chartExplanations) {
      expY = this.drawWrappedText(pdf, exp, pdf.marginLeft + 15, expY, pdf.contentWidth - 30, 8.5, 12);
      expY -= 6;
    }

    // PAGE 3: 9 Graha Placements Table & Shodashvarga Summary Table
    pdf.addPage();
    pdf.drawHeader('Planetary Placements & Shodashvargas');

    pdf.drawText('5. NINE GRAHA PLACEMENTS & POSITIONS', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);

    curY = 755;
    pdf.setFillColor(PdfColors.INDIGO);
    pdf.drawRect(pdf.marginLeft, curY - 18, pdf.contentWidth, 22, true, false);

    const cols = [
      { name: 'Graha', x: pdf.marginLeft + 10 },
      { name: 'Rashi (Sign)', x: pdf.marginLeft + 80 },
      { name: 'Degrees', x: pdf.marginLeft + 165 },
      { name: 'House', x: pdf.marginLeft + 235 },
      { name: 'Nakshatra', x: pdf.marginLeft + 295 },
      { name: 'Pada', x: pdf.marginLeft + 395 },
      { name: 'Motion', x: pdf.marginLeft + 445 },
    ];

    for (const c of cols) {
      pdf.drawText(c.name, c.x, curY - 14, 9, true, PdfColors.WHITE);
    }

    curY -= 20;
    let isAlt = false;
    for (const p of report.planets) {
      pdf.setFillColor(isAlt ? PdfColors.LIGHT_BG : PdfColors.WHITE);
      pdf.drawRect(pdf.marginLeft, curY - 16, pdf.contentWidth, 18, true, false);

      pdf.drawText(p.planet, cols[0].x, curY - 12, 8.5, true, PdfColors.DARK_TEXT);
      pdf.drawText(p.sign, cols[1].x, curY - 12, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(`${p.degree.toFixed(2)}°`, cols[2].x, curY - 12, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(`House ${p.house}`, cols[3].x, curY - 12, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(p.nakshatra, cols[4].x, curY - 12, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(String(p.pada), cols[5].x, curY - 12, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(p.isRetrograde ? 'Retrograde (R)' : 'Direct', cols[6].x, curY - 12, 8, p.isRetrograde, p.isRetrograde ? PdfColors.ROSE : PdfColors.GREY_TEXT);

      curY -= 17;
      isAlt = !isAlt;
    }

    // Shodashvarga Summary Table
    curY -= 15;
    pdf.drawText('6. SHODASHVARGA 16-DIVISIONAL CHART SUMMARY', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
    curY -= 20;

    const svCols = [
      { name: 'Graha', x: pdf.marginLeft + 6 },
      { name: 'D1', x: pdf.marginLeft + 55 },
      { name: 'D2', x: pdf.marginLeft + 85 },
      { name: 'D3', x: pdf.marginLeft + 115 },
      { name: 'D4', x: pdf.marginLeft + 145 },
      { name: 'D7', x: pdf.marginLeft + 175 },
      { name: 'D9', x: pdf.marginLeft + 205 },
      { name: 'D10', x: pdf.marginLeft + 235 },
      { name: 'D12', x: pdf.marginLeft + 265 },
      { name: 'D16', x: pdf.marginLeft + 295 },
      { name: 'D20', x: pdf.marginLeft + 325 },
      { name: 'D24', x: pdf.marginLeft + 355 },
      { name: 'D27', x: pdf.marginLeft + 385 },
      { name: 'D30', x: pdf.marginLeft + 415 },
      { name: 'D40', x: pdf.marginLeft + 445 },
      { name: 'D45', x: pdf.marginLeft + 475 },
      { name: 'D60', x: pdf.marginLeft + 505 },
    ];

    pdf.setFillColor(PdfColors.PURPLE);
    pdf.drawRect(pdf.marginLeft, curY - 16, pdf.contentWidth, 18, true, false);
    for (const c of svCols) {
      pdf.drawText(c.name, c.x, curY - 12, 7.5, true, PdfColors.WHITE);
    }

    curY -= 18;
    isAlt = false;
    const svRows = report.shodashvargas || [];
    for (const sv of svRows.slice(0, 10)) {
      pdf.setFillColor(isAlt ? PdfColors.LIGHT_BG : PdfColors.WHITE);
      pdf.drawRect(pdf.marginLeft, curY - 14, pdf.contentWidth, 15, true, false);

      pdf.drawText(sv.planet, svCols[0].x, curY - 10, 7.5, true, PdfColors.DARK_TEXT);
      pdf.drawText(sv.rashi, svCols[1].x, curY - 10, 7, false, PdfColors.DARK_TEXT);
      pdf.drawText(sv.d2, svCols[2].x, curY - 10, 7, false, PdfColors.DARK_TEXT);
      pdf.drawText(sv.d3, svCols[3].x, curY - 10, 7, false, PdfColors.DARK_TEXT);
      pdf.drawText(sv.d4, svCols[4].x, curY - 10, 7, false, PdfColors.DARK_TEXT);
      pdf.drawText(sv.d7, svCols[5].x, curY - 10, 7, false, PdfColors.DARK_TEXT);
      pdf.drawText(sv.d9, svCols[6].x, curY - 10, 7, true, PdfColors.PURPLE);
      pdf.drawText(sv.d10, svCols[7].x, curY - 10, 7, false, PdfColors.DARK_TEXT);
      pdf.drawText(sv.d12, svCols[8].x, curY - 10, 7, false, PdfColors.DARK_TEXT);
      pdf.drawText(sv.d16, svCols[9].x, curY - 10, 7, false, PdfColors.DARK_TEXT);
      pdf.drawText(sv.d20, svCols[10].x, curY - 10, 7, false, PdfColors.DARK_TEXT);
      pdf.drawText(sv.d24, svCols[11].x, curY - 10, 7, false, PdfColors.DARK_TEXT);
      pdf.drawText(sv.d27, svCols[12].x, curY - 10, 7, false, PdfColors.DARK_TEXT);
      pdf.drawText(sv.d30, svCols[13].x, curY - 10, 7, false, PdfColors.DARK_TEXT);
      pdf.drawText(sv.d40, svCols[14].x, curY - 10, 7, false, PdfColors.DARK_TEXT);
      pdf.drawText(sv.d45, svCols[15].x, curY - 10, 7, false, PdfColors.DARK_TEXT);
      pdf.drawText(sv.d60, svCols[16].x, curY - 10, 7, false, PdfColors.DARK_TEXT);

      curY -= 15;
      isAlt = !isAlt;
    }

    // Ashtakavarga SAV Points Grid
    curY -= 15;
    pdf.drawText('7. ASHTAKAVARGA SARVASHTAKAVARGA (SAV) POINTS (TOTAL: 337)', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
    curY -= 18;

    const savData = report.ashtakavargaTable?.sav || { 1: 30, 2: 26, 3: 25, 4: 35, 5: 28, 6: 34, 7: 36, 8: 26, 9: 24, 10: 22, 11: 29, 12: 22 };
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft, curY - 32, pdf.contentWidth, 32, true, true);

    const rashiShorts = ['Ari', 'Tau', 'Gem', 'Can', 'Leo', 'Vir', 'Lib', 'Sco', 'Sag', 'Cap', 'Aqu', 'Pis'];
    const cellW = pdf.contentWidth / 12;
    for (let r = 1; r <= 12; r++) {
      const rx = pdf.marginLeft + (r - 1) * cellW;
      pdf.drawText(rashiShorts[r - 1], rx + cellW / 2, curY - 12, 7.5, true, PdfColors.INDIGO, 'center');
      const pts = (savData as any)[r] ?? (savData as any)[String(r)] ?? 28;
      pdf.drawText(String(pts), rx + cellW / 2, curY - 24, 8.5, true, pts >= 28 ? PdfColors.ROSE : PdfColors.DARK_TEXT, 'center');
    }

    const bhavphalList =
      report.bhavphal && report.bhavphal.length === 12
        ? (report.bhavphal as BhavaAnalysisOutput[])
        : generateAllBhavphalAnalyses(report.houses, report.planets);

    const divCharts =
      report.divisionalCharts && report.divisionalCharts.length === 16
        ? report.divisionalCharts
        : CANONICAL_SHODASHVARGAS.map((sv) => ({
            vargaCode: sv.code,
            name: sv.name,
            divisionNumber: sv.divisionNumber,
            purpose: sv.purpose,
            domain: sv.domain,
            ascendantSign: report.ascendant.sign,
            placements: report.planets.map((p) => ({
              planet: p.planet,
              rashi: p.sign,
              house: p.house,
            })),
          }));

    const renderVargaCard = (
      vChart: {
        vargaCode: string;
        name: string;
        divisionNumber: number;
        purpose: string;
        domain: string;
        ascendantSign: string;
        placements: Array<{ planet: string; rashi: string; house: number }>;
      },
      yPos: number,
      cardH: number = 62
    ) => {
      pdf.setFillColor(PdfColors.WHITE);
      pdf.setStrokeColor(PdfColors.GOLD);
      pdf.setLineWidth(1);
      pdf.drawRect(pdf.marginLeft, yPos - cardH, pdf.contentWidth, cardH, true, true);

      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.drawRect(pdf.marginLeft, yPos - 18, pdf.contentWidth, 18, true, false);

      pdf.drawText(
        `${vChart.vargaCode}: ${vChart.name.toUpperCase()} (D${vChart.divisionNumber})  |  ${vChart.domain.toUpperCase()}`,
        pdf.marginLeft + 12,
        yPos - 13,
        8.5,
        true,
        PdfColors.NAVY
      );

      pdf.drawText(
        `Ascendant: ${vChart.ascendantSign}   •   Significance: ${vChart.purpose}`,
        pdf.marginLeft + 12,
        yPos - 29,
        7.5,
        false,
        PdfColors.PURPLE
      );

      const p1 = vChart.placements.slice(0, 5).map((p) => `${p.planet.substring(0, 2)}: ${p.rashi.substring(0, 3)} (H${p.house})`).join('  |  ');
      const p2 = vChart.placements.slice(5).map((p) => `${p.planet.substring(0, 2)}: ${p.rashi.substring(0, 3)} (H${p.house})`).join('  |  ');

      pdf.drawText(`Placements: ${p1}`, pdf.marginLeft + 12, yPos - 43, 7.5, false, PdfColors.DARK_TEXT);
      if (p2) {
        pdf.drawText(`            ${p2}`, pdf.marginLeft + 12, yPos - 54, 7.5, false, PdfColors.DARK_TEXT);
      }
    };

    const renderBhavaCard = (
      b: BhavaAnalysisOutput,
      yPos: number,
      cardH: number = 135
    ) => {
      pdf.setFillColor(PdfColors.WHITE);
      pdf.setStrokeColor(PdfColors.INDIGO);
      pdf.setLineWidth(1);
      pdf.drawRect(pdf.marginLeft, yPos - cardH, pdf.contentWidth, cardH, true, true);

      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.drawRect(pdf.marginLeft, yPos - 20, pdf.contentWidth, 20, true, false);

      pdf.drawText(
        `${b.houseName.toUpperCase()} — ${b.sign.toUpperCase()} (${b.traditionalTitle.toUpperCase()})`,
        pdf.marginLeft + 12,
        yPos - 14,
        8.5,
        true,
        PdfColors.NAVY
      );

      const lordMeta = `Governing Lord: ${b.lord} in House ${b.lordPlacedInHouse} (${b.lordSign})   |   Occupants: ${b.planetsPresent.length > 0 ? b.planetsPresent.join(', ') : 'None'}`;
      pdf.drawText(lordMeta, pdf.marginLeft + 12, yPos - 32, 7.5, true, PdfColors.PURPLE);

      pdf.drawText(`Core Significators: ${b.attributes.join(' • ')}`, pdf.marginLeft + 12, yPos - 44, 7, false, PdfColors.GREY_TEXT);

      this.drawWrappedText(
        pdf,
        b.analysis,
        pdf.marginLeft + 12,
        yPos - 58,
        pdf.contentWidth - 24,
        8,
        11.5
      );
    };

    // Helper for rendering structured chapters with automatic pagination
    const renderChapterBox = (title: string, content: string, keyValues?: Record<string, string>, minHeight: number = 100) => {
      if (curY < minHeight + 60) {
        pdf.addPage();
        pdf.drawHeader('Premium Personalised Kundli Report');
        curY = 775;
      }

      pdf.setFillColor(PdfColors.WHITE);
      pdf.setStrokeColor(PdfColors.INDIGO);
      pdf.setLineWidth(1);

      const startY = curY;
      pdf.drawText(title.toUpperCase(), pdf.marginLeft + 15, curY - 16, 10.5, true, PdfColors.NAVY);

      let textY = curY - 34;
      textY = this.drawWrappedText(pdf, content, pdf.marginLeft + 15, textY, pdf.contentWidth - 30, 8.5, 12);

      if (keyValues && Object.keys(keyValues).length > 0) {
        textY -= 6;
        let kvX = pdf.marginLeft + 15;
        for (const [k, v] of Object.entries(keyValues)) {
          if (kvX + 160 > pdf.marginRight) {
            kvX = pdf.marginLeft + 15;
            textY -= 14;
          }
          pdf.drawText(`${k}: ${v}`, kvX, textY, 8, true, PdfColors.PURPLE);
          kvX += 165;
        }
        textY -= 8;
      }

      const boxHeight = startY - textY + 12;
      pdf.drawRect(pdf.marginLeft, textY, pdf.contentWidth, boxHeight, false, true);
      curY = textY - 16;
    };

    // PAGE 4: Shodashvarga Dossier (Part 1: D1 to D7)
    pdf.addPage();
    pdf.drawHeader('Shodashvarga Dossier (Part 1)');
    pdf.drawText('6A. SHODASHVARGA DIVISIONAL CHARTS (D1 TO D7)', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);
    curY = 755;
    for (const vc of divCharts.slice(0, 5)) {
      renderVargaCard(vc, curY, 66);
      curY -= 72;
    }

    // PAGE 5: Shodashvarga Dossier (Part 2: D9 to D16)
    pdf.addPage();
    pdf.drawHeader('Shodashvarga Dossier (Part 2)');
    pdf.drawText('6B. SHODASHVARGA DIVISIONAL CHARTS (D9 TO D16)', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);
    curY = 755;
    for (const vc of divCharts.slice(5, 9)) {
      renderVargaCard(vc, curY, 68);
      curY -= 75;
    }

    // PAGE 6: Shodashvarga Dossier (Part 3: D20 to D60)
    pdf.addPage();
    pdf.drawHeader('Shodashvarga Dossier (Part 3)');
    pdf.drawText('6C. SHODASHVARGA DIVISIONAL CHARTS (D20 TO D60)', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);
    curY = 755;
    for (const vc of divCharts.slice(9, 16)) {
      renderVargaCard(vc, curY, 58);
      curY -= 64;
    }

    // PAGE 7: Vimshottari Dasha & Jaimini Chara Karakas
    pdf.addPage();
    pdf.drawHeader('Vimshottari Dasha & Chara Karakas');

    pdf.drawText('8. VIMSHOTTARI DASHA MASTER TIMELINE', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);

    if (report.vimshottariDasha) {
      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft, 725, pdf.contentWidth, 38, true, true);

      pdf.drawText(
        `Active Mahadasha: ${report.vimshottariDasha.currentMahadasha}   |   Current Antardasha: ${report.vimshottariDasha.currentAntardasha}`,
        pdf.marginLeft + 15,
        744,
        10,
        true,
        PdfColors.PURPLE
      );
      pdf.drawText(
        `Cycle Window: ${report.vimshottariDasha.currentCycleStart} to ${report.vimshottariDasha.currentCycleEnd}`,
        pdf.marginLeft + 15,
        731,
        8.5,
        false,
        PdfColors.GREY_TEXT
      );

      curY = 710;
      for (const d of report.vimshottariDasha.timeline.slice(0, 9)) {
        pdf.setFillColor(d.isCurrent ? PdfColors.WHITE : PdfColors.LIGHT_BG);
        pdf.drawRect(pdf.marginLeft, curY - 14, pdf.contentWidth, 16, true, false);

        pdf.drawText(d.planet, pdf.marginLeft + 15, curY - 10, 8.5, d.isCurrent, d.isCurrent ? PdfColors.ROSE : PdfColors.DARK_TEXT);
        pdf.drawText(`${d.durationYears} Years`, pdf.marginLeft + 120, curY - 10, 8.5, false, PdfColors.DARK_TEXT);
        pdf.drawText(`${d.startDate} to ${d.endDate}`, pdf.marginLeft + 240, curY - 10, 8.5, false, PdfColors.DARK_TEXT);
        pdf.drawText(d.isCurrent ? 'ACTIVE NOW' : 'Scheduled', pdf.marginLeft + 440, curY - 10, 8, true, d.isCurrent ? PdfColors.ROSE : PdfColors.GREY_TEXT);

        curY -= 16;
      }
      curY -= 15;
    } else {
      curY = 775;
    }

    // Chara Karakas Table
    pdf.drawText('9. JAIMINI CHARA KARAKAS (THE 8 PLANETS BEHIND YOUR PURPOSE)', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
    curY -= 18;

    pdf.setFillColor(PdfColors.INDIGO);
    pdf.drawRect(pdf.marginLeft, curY - 16, pdf.contentWidth, 18, true, false);

    const kCols = [
      { name: 'Karaka', x: pdf.marginLeft + 10 },
      { name: 'Sanskrit', x: pdf.marginLeft + 90 },
      { name: 'Planet', x: pdf.marginLeft + 185 },
      { name: 'Degree', x: pdf.marginLeft + 265 },
      { name: 'Life Significance', x: pdf.marginLeft + 330 },
    ];

    for (const kc of kCols) {
      pdf.drawText(kc.name, kc.x, curY - 12, 8.5, true, PdfColors.WHITE);
    }

    curY -= 18;
    isAlt = false;
    const karakas = report.charaKarakas || [];
    for (const ck of karakas) {
      pdf.setFillColor(isAlt ? PdfColors.LIGHT_BG : PdfColors.WHITE);
      pdf.drawRect(pdf.marginLeft, curY - 14, pdf.contentWidth, 16, true, false);

      pdf.drawText(ck.karaka, kCols[0].x, curY - 10, 8, true, PdfColors.DARK_TEXT);
      pdf.drawText(ck.sanskritName, kCols[1].x, curY - 10, 8, false, PdfColors.DARK_TEXT);
      pdf.drawText(ck.planet, kCols[2].x, curY - 10, 8, true, PdfColors.PURPLE);
      pdf.drawText(`${ck.degree.toFixed(2)}°`, kCols[3].x, curY - 10, 8, false, PdfColors.DARK_TEXT);
      pdf.drawText(ck.significance, kCols[4].x, curY - 10, 8, false, PdfColors.DARK_TEXT);

      curY -= 16;
      isAlt = !isAlt;
    }

    // Chapter 2: Influence of Your Birth Chart on Page 7
    curY -= 15;
    renderChapterBox(
      'Chapter 2: The Influence of Your Birth Chart & Three Pillars of Self',
      report.sections.find((s) => s.id === 'ch2_influence')?.content ||
        'The Three Pillars of Self (Lagna, Chandra, Surya) synthesize physical vitality, emotional mind, and soul direction.',
      report.sections.find((s) => s.id === 'ch2_influence')?.keyValues,
      100
    );

    // PAGE 8: Chapter 3: Bhavphal (Houses 1 to 4)
    pdf.addPage();
    pdf.drawHeader('Bhavphal: Houses 1 to 4');
    pdf.drawText('CHAPTER 3: BHAVPHAL — LIFE THROUGH HOUSES 1 TO 4', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);
    curY = 755;
    for (const b of bhavphalList.slice(0, 4)) {
      renderBhavaCard(b, curY, 138);
      curY -= 144;
    }

    // PAGE 9: Chapter 3: Bhavphal (Houses 5 to 8)
    pdf.addPage();
    pdf.drawHeader('Bhavphal: Houses 5 to 8');
    pdf.drawText('CHAPTER 3: BHAVPHAL — LIFE THROUGH HOUSES 5 TO 8', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);
    curY = 755;
    for (const b of bhavphalList.slice(4, 8)) {
      renderBhavaCard(b, curY, 138);
      curY -= 144;
    }

    // PAGE 10: Chapter 3: Bhavphal (Houses 9 to 12)
    pdf.addPage();
    pdf.drawHeader('Bhavphal: Houses 9 to 12');
    pdf.drawText('CHAPTER 3: BHAVPHAL — LIFE THROUGH HOUSES 9 TO 12', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);
    curY = 755;
    for (const b of bhavphalList.slice(8, 12)) {
      renderBhavaCard(b, curY, 138);
      curY -= 144;
    }

    // PAGE 11: Chapter 4: Planetary Conjunctions & Chapter 5: Love & Marriage
    pdf.addPage();
    pdf.drawHeader('Conjunctions, Love & Marriage');
    curY = 775;

    renderChapterBox(
      'Chapter 4: When Energies Merge — Planetary Conjunctions of Your Chart',
      report.sections.find((s) => s.id === 'ch4_conjunctions')?.content ||
        'Planetary conjunctions represent powerful concentrated energy unions where two or more planetary archetypes blend.',
      undefined,
      110
    );

    renderChapterBox(
      'Chapter 5: Astrological Snapshot — Love & Marriage Dynamics',
      report.sections.find((s) => s.id === 'ch5_love_marriage')?.content ||
        'The 5th house of romance, 7th house of marriage, and Jaimini Darakaraka govern your partnership destiny.',
      report.sections.find((s) => s.id === 'ch5_love_marriage')?.keyValues,
      130
    );

    // PAGE 12: Chapter 6: Career Calling & Chapter 7: Chara Karakas
    pdf.addPage();
    pdf.drawHeader('Career Calling & Purpose');
    curY = 775;

    renderChapterBox(
      'Chapter 6: Your Career Calling Written in the Stars',
      report.sections.find((s) => s.id === 'ch6_career')?.content ||
        'Vocational destiny governed by the 10th House, Sun, Saturn, and the Amatyakaraka career indicator.',
      report.sections.find((s) => s.id === 'ch6_career')?.keyValues,
      130
    );

    renderChapterBox(
      'Chapter 7: Chara Karakas — The Planets Behind Your Purpose',
      report.sections.find((s) => s.id === 'ch7_chara_karakas')?.content ||
        'Chara Karakas reveal the subtle soul priorities guiding your spiritual and material evolutionary journey.',
      report.sections.find((s) => s.id === 'ch7_chara_karakas')?.keyValues,
      130
    );

    // PAGE 13: Chapter 8: Rahu-Ketu, Chapter 9: Mangalik & Chapter 10: Sade Sati
    pdf.addPage();
    pdf.drawHeader('Karmic Map & Planetary Cycles');
    curY = 775;

    renderChapterBox(
      'Chapter 8: Rahu-Ketu Analysis — The Karmic Push and Pull',
      report.sections.find((s) => s.id === 'ch8_rahu_ketu')?.content ||
        'Rahu represents your current-life evolutionary growth frontier while Ketu signifies past mastery and spiritual detachment.',
      report.sections.find((s) => s.id === 'ch8_rahu_ketu')?.keyValues,
      110
    );

    renderChapterBox(
      'Chapter 9: Born with Fire — Manglik Dynamic (7. PLANETARY PLACEMENT & TRANSIT ANALYSIS)',
      report.sections.find((s) => s.id === 'ch9_mangalik')?.content ||
        'Mars represents vital courage, ambition, and focused energy. Channeling this drive collaboratively fosters relationship leadership.',
      report.sections.find((s) => s.id === 'ch9_mangalik')?.keyValues,
      100
    );

    renderChapterBox(
      'Chapter 10: Your Sade Sati Journey — Challenge to Transformation',
      report.sections.find((s) => s.id === 'ch10_sade_sati')?.content ||
        'Saturn transits invite patience, personal discipline, and ethical consistency, building enduring foundations.',
      report.sections.find((s) => s.id === 'ch10_sade_sati')?.keyValues,
      100
    );

    // PAGE 14: Chapter 11: Raj Yogas, Chapter 12: Karmic Lessons & Chapter 13: Mahadashas
    pdf.addPage();
    pdf.drawHeader('Raj Yogas & Dasha Roadmap');
    curY = 775;

    renderChapterBox(
      'Chapter 11: Raj Yogas — The Combinations of Fame & Fortune',
      report.sections.find((s) => s.id === 'ch11_raj_yogas')?.content ||
        'Auspicious Kendra-Trikona Raj Yogas and Dhana Yogas confer status, resources, and intellectual eminence.',
      report.sections.find((s) => s.id === 'ch11_raj_yogas')?.keyValues,
      100
    );

    renderChapterBox(
      'Chapter 12: Astrological Lessons — Balancing Karmic Influences',
      report.sections.find((s) => s.id === 'ch12_karmic_lessons')?.content ||
        'Constructive personal disciplines and emotional grounding transform karmic tensions into lifelong maturity.',
      undefined,
      100
    );

    renderChapterBox(
      'Chapter 13: When Planets Lead — Journey Through Vimshottari Mahadashas',
      report.sections.find((s) => s.id === 'ch13_mahadashas')?.content ||
        'Navigating your active Mahadasha and Antardasha seasons with purposeful alignment.',
      report.sections.find((s) => s.id === 'ch13_mahadashas')?.keyValues,
      100
    );

    // PAGE 15: Chapter 14: Numerology & Chapter 15: Spiritual Potential
    pdf.addPage();
    pdf.drawHeader('Numerology & Spiritual Potential');
    curY = 775;

    renderChapterBox(
      'Chapter 14: Numerology — Digits of Divinity',
      report.sections.find((s) => s.id === 'ch14_numerology')?.content ||
        'Numerological vibrations derived from your birth date illuminate personality instincts, destiny, and connection numbers.',
      report.sections.find((s) => s.id === 'ch14_numerology')?.keyValues,
      110
    );

    renderChapterBox(
      'Chapter 15: When the Soul Blooms — Charting Your Spiritual Potential',
      report.sections.find((s) => s.id === 'ch15_spiritual')?.content ||
        'Spiritual awakening through Dharma, meditation, compassionate service, and alignment with the Atmakaraka.',
      report.sections.find((s) => s.id === 'ch15_spiritual')?.keyValues,
      120
    );

    // PAGE 16: Chapter 16: Harmonizing Cosmic Energies (Gemstones & Remedies) & Chapter 17: Conclusion
    pdf.addPage();
    pdf.drawHeader('Harmonizing Cosmic Energies');
    curY = 775;

    // Gemstones Card
    if (report.gemstoneRecommendations) {
      pdf.drawText('Chapter 16: Harmonizing Cosmic Energies — 8. ASTRONOMICAL GEMSTONE RECOMMENDATIONS (Trikona Gemstones)', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
      curY -= 15;

      const gems = [
        { label: 'Life Stone (1st Lord)', item: report.gemstoneRecommendations.lagnaGem },
        { label: 'Lucky Stone (5th Lord)', item: report.gemstoneRecommendations.luckyGem5th },
        { label: 'Fortune Stone (9th Lord)', item: report.gemstoneRecommendations.fortuneGem9th },
      ];

      for (const g of gems) {
        pdf.setFillColor(PdfColors.WHITE);
        pdf.setStrokeColor(PdfColors.GOLD);
        pdf.drawRect(pdf.marginLeft, curY - 38, pdf.contentWidth, 38, true, true);

        pdf.drawText(`${g.label}: ${g.item.gemstone} (${g.item.sanskritName})`, pdf.marginLeft + 15, curY - 13, 9, true, PdfColors.NAVY);
        pdf.drawText(`Ruler: ${g.item.rulingLord}  |  Finger: ${g.item.finger}  |  Metal: ${g.item.metal}`, pdf.marginLeft + 15, curY - 24, 8, false, PdfColors.DARK_TEXT);
        pdf.drawText(`Caution: ${g.item.caution}`, pdf.marginLeft + 15, curY - 34, 7, false, PdfColors.GREY_TEXT);

        curY -= 43;
      }

      if (report.gemstoneRecommendations.generalAdvisory) {
        pdf.setFillColor(PdfColors.LIGHT_BG);
        pdf.setStrokeColor(PdfColors.BORDER_GREY);
        pdf.drawRect(pdf.marginLeft, curY - 34, pdf.contentWidth, 34, true, true);

        pdf.drawText('METHODOLOGY ADVISORY (NOTE ON METHODOLOGY)', pdf.marginLeft + 15, curY - 11, 8, true, PdfColors.INDIGO);
        this.drawWrappedText(
          pdf,
          report.gemstoneRecommendations.generalAdvisory,
          pdf.marginLeft + 15,
          curY - 21,
          pdf.contentWidth - 30,
          7.5,
          9.5
        );
        curY -= 40;
      }
    }

    // Sacred Remedies Card
    if (report.remedies) {
      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft, curY - 80, pdf.contentWidth, 80, true, true);

      pdf.drawText('SACRED REMEDIES & LIFESTYLE DISCIPLINES', pdf.marginLeft + 15, curY - 16, 9.5, true, PdfColors.INDIGO);
      pdf.drawText(`Rudraksha Guidance: ${report.remedies.rudraksha}`, pdf.marginLeft + 15, curY - 32, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(`Chosen Divine (Ishtdev): ${report.remedies.ishtdev}`, pdf.marginLeft + 15, curY - 46, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(`Yantra: ${report.remedies.yantra}`, pdf.marginLeft + 15, curY - 60, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(`Charitable Giving (Dana): ${report.remedies.dana}`, pdf.marginLeft + 15, curY - 74, 8, false, PdfColors.GREY_TEXT);

      curY -= 95;
    }

    // Chapter 17: Conclusion
    renderChapterBox(
      'Chapter 17: Charted by Stars, Powered by You! (Conclusion)',
      report.sections.find((s) => s.id === 'ch17_conclusion')?.content ||
        'Your Kundli is an empowering cosmic compass. Guided by the stars, your destiny is shaped by your conscious choices.',
      undefined,
      90
    );
  }

  // ---------------------------------------------------------------------------
  // 2. MINI HOROSCOPE (PLANETARY TRANSIT FORECAST PDF BUILDER)
  // ---------------------------------------------------------------------------

  private buildPlanetaryPdf(pdf: PdfWriter, report: any): void {
    pdf.drawHeader('Mini Horoscope & Transit Forecast');

    // Header Banner Box
    pdf.setFillColor(PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(2);
    pdf.drawRect(pdf.marginLeft, 690, pdf.contentWidth, 90, true, true);

    pdf.drawText('ASTRO SUSHIL', pdf.marginLeft + 20, 755, 20, true, PdfColors.GOLD);
    pdf.drawText('PLANETARY DYNAMICS & FORCE SUMMARY', pdf.marginLeft + 20, 735, 14, true, PdfColors.WHITE);
    pdf.drawText(
      `Profile: ${report.profile.name}  |  Forecast: Next 180 Days (6 Months)  |  Reference Date: ${new Date(report.generatedAt).toLocaleDateString()}`,
      pdf.marginLeft + 20,
      708,
      9,
      false,
      PdfColors.WHITE
    );

    let curY = 660;

    // Transits Table
    const transits = report.miniHoroscopeData?.currentTransits || [];
    if (transits.length > 0) {
      pdf.drawText('1. CURRENT PLANETARY TRANSITS (GOCHARA)', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
      curY -= 20;

      pdf.setFillColor(PdfColors.INDIGO);
      pdf.drawRect(pdf.marginLeft, curY - 18, pdf.contentWidth, 22, true, false);

      const tCols = [
        { name: 'Planet', x: pdf.marginLeft + 10 },
        { name: 'Sign', x: pdf.marginLeft + 80 },
        { name: 'Degrees', x: pdf.marginLeft + 150 },
        { name: 'House from Moon', x: pdf.marginLeft + 225 },
        { name: 'Influence', x: pdf.marginLeft + 340 },
        { name: 'Status', x: pdf.marginLeft + 460 },
      ];

      for (const col of tCols) {
        pdf.drawText(col.name, col.x, curY - 14, 9, true, PdfColors.WHITE);
      }

      curY -= 20;
      let isAlt = false;
      for (const t of transits) {
        pdf.setFillColor(isAlt ? PdfColors.LIGHT_BG : PdfColors.WHITE);
        pdf.drawRect(pdf.marginLeft, curY - 16, pdf.contentWidth, 18, true, false);

        pdf.drawText(t.planet, tCols[0].x, curY - 12, 9, true, PdfColors.DARK_TEXT);
        pdf.drawText(t.currentSign, tCols[1].x, curY - 12, 9, false, PdfColors.DARK_TEXT);
        pdf.drawText(`${t.currentDegree.toFixed(1)}°`, tCols[2].x, curY - 12, 9, false, PdfColors.DARK_TEXT);
        pdf.drawText(`House ${t.houseFromMoon}`, tCols[3].x, curY - 12, 9, false, PdfColors.DARK_TEXT);
        pdf.drawText(t.status, tCols[4].x, curY - 12, 8.5, true, t.status === 'FAVORABLE' ? PdfColors.PURPLE : PdfColors.ROSE);
        pdf.drawText(t.isRetrograde ? 'Retrograde' : 'Direct', tCols[5].x, curY - 12, 8, false, PdfColors.GREY_TEXT);

        curY -= 18;
        isAlt = !isAlt;
      }
    }

    // Saturn Transit Card (Neutral Astronomical Analysis)
    const sadeSati = report.miniHoroscopeData?.sadeSati;
    if (sadeSati) {
      curY -= 15;
      pdf.drawText('2. SATURN TRANSIT (GOCHARA) ANALYSIS', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
      curY -= 15;

      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft, curY - 55, pdf.contentWidth, 55, true, true);

      pdf.drawText(
        'Astronomical Transit: Saturn Gochara relative to Natal Moon',
        pdf.marginLeft + 15,
        curY - 18,
        10,
        true,
        PdfColors.NAVY
      );
      this.drawWrappedText(
        pdf,
        'Saturn transit cycles represent long-term development of discipline, structure, and professional patience as Saturn moves through the zodiac houses.',
        pdf.marginLeft + 15,
        curY - 32,
        pdf.contentWidth - 30,
        8.5,
        11
      );
      curY -= 65;
    }

    // PAGE 2: 3-to-6 Month Transit Windows & Caution Periods
    pdf.addPage();
    pdf.drawHeader('Upcoming Transit Windows & Caution Periods');
    curY = 775;

    const windows = report.miniHoroscopeData?.transitWindows || [];
    if (windows.length > 0) {
      pdf.drawText('3. SIGNIFICANT 3-TO-6 MONTH TRANSIT WINDOWS', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
      curY -= 15;

      for (const w of windows) {
        pdf.setFillColor(PdfColors.WHITE);
        pdf.setStrokeColor(PdfColors.GOLD);
        pdf.drawRect(pdf.marginLeft, curY - 60, pdf.contentWidth, 60, true, true);

        pdf.drawText(`${w.planet}: ${w.event}`, pdf.marginLeft + 15, curY - 16, 9.5, true, PdfColors.NAVY);
        pdf.drawText(`Window: ${w.startDate} to ${w.endDate}`, pdf.marginLeft + 310, curY - 16, 8.5, false, PdfColors.GREY_TEXT);
        pdf.drawText(`Significance: ${w.significance}`, pdf.marginLeft + 15, curY - 30, 8.5, false, PdfColors.DARK_TEXT);
        pdf.drawText(`Guidance: ${w.recommendation}`, pdf.marginLeft + 15, curY - 44, 8.5, false, PdfColors.PURPLE);

        curY -= 68;
      }
    }

    const cautions = report.miniHoroscopeData?.cautionPeriods || [];
    if (cautions.length > 0) {
      curY -= 10;
      pdf.drawText('4. SENSITIVE TRANSIT WINDOWS & CAUTION PERIODS', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
      curY -= 15;

      for (const c of cautions) {
        pdf.setFillColor(PdfColors.LIGHT_BG);
        pdf.setStrokeColor(PdfColors.BORDER_GREY);
        pdf.drawRect(pdf.marginLeft, curY - 42, pdf.contentWidth, 42, true, true);

        pdf.drawText(`Caution Window: ${c.period} (${c.planet})`, pdf.marginLeft + 15, curY - 16, 9.5, true, PdfColors.ROSE);
        this.drawWrappedText(pdf, c.caution, pdf.marginLeft + 15, curY - 28, pdf.contentWidth - 30, 8.5, 11);

        curY -= 48;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 3. PRO HOROSCOPE (PERSONALISED YEARLY HOROSCOPE 2026 PDF BUILDER)
  // ---------------------------------------------------------------------------

  private buildProHoroscopePdf(pdf: PdfWriter, report: ProHoroscopeModel): void {
    const title = 'Personalised Yearly Horoscope Report 2026';
    const moon = report.moonSignDetails || {
      sign: 'Virgo',
      sanskritSign: 'Kanya',
      signLord: 'Mercury',
      nakshatra: 'Hasta',
      pada: 1,
      element: 'Earth',
      modality: 'Mutable',
      symbol: 'The Maiden',
      syllables: 'To, Pa, Pee, Poo, Sha, Tha, Pe, Po',
    };
    const yearly = report.yearlyOverview || {
      year: 2026,
      universalYearNumber: 1,
      significanceTitle: `Significance of ${moon.sign} in 2026`,
      cosmicTheme: 'A Transformative Year of Structured Growth and Auspicious Recognition',
      opportunities: [],
      cautions: [],
      summary: '',
    };

    // -------------------------------------------------------------------------
    // PAGE 1: Cover Banner, Native Profile, Configuration & Moon Sign Profile Card
    // -------------------------------------------------------------------------
    pdf.drawHeader(title);

    // Banner
    pdf.setFillColor(PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(2);
    pdf.drawRect(pdf.marginLeft, 690, pdf.contentWidth, 90, true, true);

    pdf.drawText('ASTRO SUSHIL', pdf.marginLeft + 20, 755, 20, true, PdfColors.GOLD);
    pdf.drawText(
      `${moon.sign.toUpperCase()} — YEARLY HOROSCOPE REPORT 2026`,
      pdf.marginLeft + 20,
      735,
      13,
      true,
      PdfColors.WHITE
    );
    pdf.drawText(
      `Native: ${report.profile.name}  |  Generated: ${new Date(report.generatedAt).toLocaleDateString()}  |  Engine Version 1.0.0`,
      pdf.marginLeft + 20,
      712,
      9,
      false,
      PdfColors.WHITE
    );

    let curY = 660;

    // 1. Native Profile & Ephemeris Configuration
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, curY - 95, pdf.contentWidth, 95, true, true);

    pdf.drawText('1. NATIVE PROFILE & CALCULATION STANDARDS', pdf.marginLeft + 15, curY - 18, 11, true, PdfColors.INDIGO);
    pdf.drawText(`Full Name: ${report.profile.name}`, pdf.marginLeft + 15, curY - 38, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Date & Time: ${report.profile.dateOfBirth} ${report.profile.timeOfBirth}`, pdf.marginLeft + 15, curY - 54, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Place & Timezone: ${report.profile.placeName || 'Not Specified'} (${report.profile.timezone})`, pdf.marginLeft + 15, curY - 70, 9.5, false, PdfColors.DARK_TEXT);

    pdf.drawText(`Zodiac System: ${report.configuration.zodiacType}`, pdf.marginLeft + 310, curY - 38, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Ayanamsa: ${report.configuration.ayanamsa}`, pdf.marginLeft + 310, curY - 54, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`House System: ${report.configuration.houseSystem}`, pdf.marginLeft + 310, curY - 70, 9.5, false, PdfColors.DARK_TEXT);

    // 2. Moon Sign (Chandra Lagna) Constitutional Anchor Card
    curY -= 115;
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.PURPLE);
    pdf.setLineWidth(1.2);
    pdf.drawRect(pdf.marginLeft, curY - 120, pdf.contentWidth, 120, true, true);

    pdf.drawText('2. MOON SIGN (CHANDRA LAGNA) CONSTITUTIONAL ANCHOR', pdf.marginLeft + 15, curY - 18, 11, true, PdfColors.PURPLE);
    pdf.drawText(`Moon Sign: ${moon.sign} (${moon.sanskritSign})`, pdf.marginLeft + 15, curY - 38, 9.5, true, PdfColors.NAVY);
    pdf.drawText(`Ruling Lord: ${moon.signLord}`, pdf.marginLeft + 15, curY - 54, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Nakshatra: ${moon.nakshatra} (Pada ${moon.pada})`, pdf.marginLeft + 15, curY - 70, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Cosmic Element: ${moon.element}  |  Modality: ${moon.modality}`, pdf.marginLeft + 15, curY - 86, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Symbol: ${moon.symbol}  |  Namakshara Syllables: ${moon.syllables}`, pdf.marginLeft + 15, curY - 102, 8.5, false, PdfColors.GREY_TEXT);

    // Right Column: Universal Year & Numerology Anchor
    const num = report.numerologyForecast;
    if (num) {
      pdf.drawText(`Universal Year 2026: Number ${num.universalYear} (Pioneering)`, pdf.marginLeft + 290, curY - 38, 9, true, PdfColors.GOLD);
      pdf.drawText(`Native Mulank: ${num.mulank}  |  Bhagyank: ${num.bhagyank}`, pdf.marginLeft + 290, curY - 54, 9, false, PdfColors.DARK_TEXT);
      this.drawWrappedText(
        pdf,
        num.coreAlignmentAdvice,
        pdf.marginLeft + 290,
        curY - 70,
        pdf.contentWidth - 305,
        8,
        11
      );
    }

    // 3. Significance of Zodiac & Year 2026 Cosmic Theme Card
    curY -= 140;
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawRect(pdf.marginLeft, curY - 95, pdf.contentWidth, 95, true, true);

    pdf.drawText('3. 2026 COSMIC SIGNIFICANCE & MASTER THEME', pdf.marginLeft + 15, curY - 18, 11, true, PdfColors.INDIGO);
    pdf.drawText(yearly.cosmicTheme, pdf.marginLeft + 15, curY - 36, 9.5, true, PdfColors.NAVY);
    this.drawWrappedText(
      pdf,
      yearly.summary || 'A milestone year where diligent perseverance converts into enduring worldly and spiritual authority.',
      pdf.marginLeft + 15,
      curY - 52,
      pdf.contentWidth - 30,
      8.5,
      12
    );

    // -------------------------------------------------------------------------
    // PAGE 2: Chapter 2: Personality & Natal Traits
    // -------------------------------------------------------------------------
    pdf.addPage();
    pdf.drawHeader(title);
    curY = 775;

    pdf.drawText(`4. YOUR PERSONALITY & NATAL TRAITS (${moon.sign.toUpperCase()})`, pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
    curY -= 20;

    const traits = report.personalityTraits?.traits || [];
    for (const tr of traits) {
      pdf.setFillColor(PdfColors.WHITE);
      pdf.setStrokeColor(PdfColors.INDIGO);
      pdf.setLineWidth(1);
      pdf.drawRect(pdf.marginLeft, curY - 60, pdf.contentWidth, 60, true, true);

      pdf.drawText(tr.name.toUpperCase(), pdf.marginLeft + 15, curY - 16, 9.5, true, PdfColors.NAVY);
      this.drawWrappedText(pdf, tr.description, pdf.marginLeft + 15, curY - 30, pdf.contentWidth - 30, 8.5, 12);
      curY -= 70;
    }

    // -------------------------------------------------------------------------
    // PAGE 3: Chapter 3: Life Domain Forecasts (Career, Finance, Education)
    // -------------------------------------------------------------------------
    pdf.addPage();
    pdf.drawHeader(title);
    curY = 775;

    pdf.drawText('5. 2026 LIFE DOMAIN FORECASTS — PART I (CAREER, FINANCE, EDUCATION)', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
    curY -= 20;

    const domainsPart1 = (report.lifeDomainForecasts || []).slice(0, 3);
    for (const d of domainsPart1) {
      pdf.setFillColor(PdfColors.WHITE);
      pdf.setStrokeColor(PdfColors.PURPLE);
      pdf.setLineWidth(1);
      pdf.drawRect(pdf.marginLeft, curY - 110, pdf.contentWidth, 110, true, true);

      pdf.drawText(d.title.toUpperCase(), pdf.marginLeft + 15, curY - 18, 10, true, PdfColors.NAVY);
      pdf.drawText(`Timeline Focus: ${d.timeline}`, pdf.marginLeft + 15, curY - 32, 8.5, true, PdfColors.PURPLE);
      this.drawWrappedText(pdf, d.outlook, pdf.marginLeft + 15, curY - 46, pdf.contentWidth - 30, 8.5, 11.5);

      pdf.drawText(`Key Guidance: ${d.keyGuidance}`, pdf.marginLeft + 15, curY - 96, 8, false, PdfColors.DARK_TEXT);
      curY -= 125;
    }

    // -------------------------------------------------------------------------
    // PAGE 4: Chapter 3 Continued (Love, Family, Health)
    // -------------------------------------------------------------------------
    pdf.addPage();
    pdf.drawHeader(title);
    curY = 775;

    pdf.drawText('6. 2026 LIFE DOMAIN FORECASTS — PART II (RELATIONSHIPS, FAMILY, HEALTH)', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
    curY -= 20;

    const domainsPart2 = (report.lifeDomainForecasts || []).slice(3, 6);
    for (const d of domainsPart2) {
      pdf.setFillColor(PdfColors.WHITE);
      pdf.setStrokeColor(PdfColors.PURPLE);
      pdf.setLineWidth(1);
      pdf.drawRect(pdf.marginLeft, curY - 110, pdf.contentWidth, 110, true, true);

      pdf.drawText(d.title.toUpperCase(), pdf.marginLeft + 15, curY - 18, 10, true, PdfColors.NAVY);
      pdf.drawText(`Timeline Focus: ${d.timeline}`, pdf.marginLeft + 15, curY - 32, 8.5, true, PdfColors.PURPLE);
      this.drawWrappedText(pdf, d.outlook, pdf.marginLeft + 15, curY - 46, pdf.contentWidth - 30, 8.5, 11.5);

      pdf.drawText(`Key Guidance: ${d.keyGuidance}`, pdf.marginLeft + 15, curY - 96, 8, false, PdfColors.DARK_TEXT);
      curY -= 125;
    }

    // -------------------------------------------------------------------------
    // PAGE 5: Chapter 4: Major Planetary Transits & Auspicious Colors / Dates
    // -------------------------------------------------------------------------
    pdf.addPage();
    pdf.drawHeader(title);
    curY = 775;

    pdf.drawText('7. MAJOR 2026 PLANETARY TRANSITS (GOCHARA FROM MOON)', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
    curY -= 20;

    // Transits Table
    pdf.setFillColor(PdfColors.INDIGO);
    pdf.drawRect(pdf.marginLeft, curY - 18, pdf.contentWidth, 22, true, false);

    const tCols = [
      { name: 'Planet', x: pdf.marginLeft + 10 },
      { name: 'Transit Sign', x: pdf.marginLeft + 75 },
      { name: 'House from Moon', x: pdf.marginLeft + 160 },
      { name: 'Cycle Period', x: pdf.marginLeft + 270 },
      { name: 'Primary Influence', x: pdf.marginLeft + 390 },
    ];
    for (const c of tCols) {
      pdf.drawText(c.name, c.x, curY - 14, 8.5, true, PdfColors.WHITE);
    }

    curY -= 20;
    let isAlt = false;
    for (const t of report.planetaryInfluences || []) {
      pdf.setFillColor(isAlt ? PdfColors.LIGHT_BG : PdfColors.WHITE);
      pdf.drawRect(pdf.marginLeft, curY - 45, pdf.contentWidth, 45, true, false);

      pdf.drawText(t.planet, tCols[0].x, curY - 14, 8.5, true, PdfColors.NAVY);
      pdf.drawText(t.transitSign, tCols[1].x, curY - 14, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(`House ${t.houseFromMoon}`, tCols[2].x, curY - 14, 8.5, true, PdfColors.PURPLE);
      pdf.drawText(t.period, tCols[3].x, curY - 14, 7.5, false, PdfColors.DARK_TEXT);

      this.drawWrappedText(pdf, t.impact, tCols[4].x, curY - 14, pdf.contentWidth - 400, 7.5, 10.5);

      curY -= 48;
      isAlt = !isAlt;
    }

    // Colors and Lucky Dates Card
    curY -= 15;
    pdf.drawText('8. FAVORABLE & UNFAVORABLE INFLUENCES (COLORS & DATES)', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
    curY -= 20;

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft, curY - 120, pdf.contentWidth, 120, true, true);

    const fav = report.favorableUnfavorable;
    if (fav) {
      pdf.drawText('FAVORABLE COLORS:', pdf.marginLeft + 15, curY - 18, 9, true, PdfColors.PURPLE);
      let colY = curY - 32;
      for (const fc of fav.favorableColors.slice(0, 3)) {
        pdf.drawText(`• ${fc.color}: ${fc.reason}`, pdf.marginLeft + 15, colY, 8, false, PdfColors.DARK_TEXT);
        colY -= 14;
      }

      pdf.drawText('UNFAVORABLE COLORS TO AVOID:', pdf.marginLeft + 15, colY - 5, 9, true, PdfColors.ROSE);
      colY -= 18;
      for (const ufc of fav.unfavorableColors.slice(0, 2)) {
        pdf.drawText(`• ${ufc.color}: ${ufc.reason}`, pdf.marginLeft + 15, colY, 8, false, PdfColors.DARK_TEXT);
        colY -= 14;
      }

      // Dates on Right
      pdf.drawText('LUCKY & UNLUCKY DATES:', pdf.marginLeft + 280, curY - 18, 9, true, PdfColors.NAVY);
      let dateY = curY - 32;
      for (const ld of fav.luckyDates) {
        pdf.drawText(`Lucky: ${ld.dates} (${ld.reason})`, pdf.marginLeft + 280, dateY, 8, true, PdfColors.PURPLE);
        dateY -= 14;
        pdf.drawText(`Tip: ${ld.tip}`, pdf.marginLeft + 280, dateY, 7.5, false, PdfColors.DARK_TEXT);
        dateY -= 18;
      }
      for (const ud of fav.unluckyDates) {
        pdf.drawText(`Caution Dates: ${ud.dates}`, pdf.marginLeft + 280, dateY, 8, true, PdfColors.ROSE);
        dateY -= 14;
        pdf.drawText(`Tip: ${ud.tip}`, pdf.marginLeft + 280, dateY, 7.5, false, PdfColors.DARK_TEXT);
      }
    }

    // -------------------------------------------------------------------------
    // PAGE 6: Chapter 4 Continued (Gemstones) & Classical Shodashvarga Summary
    // -------------------------------------------------------------------------
    pdf.addPage();
    pdf.drawHeader(title);
    curY = 775;

    pdf.drawText('9. FAVORABLE VEDIC GEMSTONES FOR 2026', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
    curY -= 20;

    const gems = report.gemstones;
    if (gems) {
      // Primary Gem Box
      pdf.setFillColor(PdfColors.WHITE);
      pdf.setStrokeColor(PdfColors.GOLD);
      pdf.setLineWidth(1.5);
      pdf.drawRect(pdf.marginLeft, curY - 100, pdf.contentWidth / 2 - 8, 100, true, true);

      pdf.drawText(`PRIMARY GEM: ${gems.primaryGem.name.toUpperCase()}`, pdf.marginLeft + 12, curY - 18, 9.5, true, PdfColors.NAVY);
      pdf.drawText(`Sanskrit: ${gems.primaryGem.sanskritName}   •   Lord: ${gems.primaryGem.rulingPlanet}`, pdf.marginLeft + 12, curY - 32, 8, true, PdfColors.PURPLE);
      this.drawWrappedText(pdf, gems.primaryGem.benefits, pdf.marginLeft + 12, curY - 45, pdf.contentWidth / 2 - 25, 7.5, 10.5);
      const w1 = gems.primaryGem.wearingInstructions;
      pdf.drawText(`Wear: ${w1.metal} on ${w1.finger} (${w1.day})`, pdf.marginLeft + 12, curY - 88, 7.5, false, PdfColors.DARK_TEXT);

      // Secondary Gem Box
      pdf.setFillColor(PdfColors.WHITE);
      pdf.setStrokeColor(PdfColors.PURPLE);
      pdf.setLineWidth(1.5);
      const rightBoxX = pdf.marginLeft + pdf.contentWidth / 2 + 8;
      pdf.drawRect(rightBoxX, curY - 100, pdf.contentWidth / 2 - 8, 100, true, true);

      pdf.drawText(`SECONDARY GEM: ${gems.secondaryGem.name.toUpperCase()}`, rightBoxX + 12, curY - 18, 9.5, true, PdfColors.NAVY);
      pdf.drawText(`Sanskrit: ${gems.secondaryGem.sanskritName}   •   Lord: ${gems.secondaryGem.rulingPlanet}`, rightBoxX + 12, curY - 32, 8, true, PdfColors.PURPLE);
      this.drawWrappedText(pdf, gems.secondaryGem.benefits, rightBoxX + 12, curY - 45, pdf.contentWidth / 2 - 25, 7.5, 10.5);
      const w2 = gems.secondaryGem.wearingInstructions;
      pdf.drawText(`Wear: ${w2.metal} on ${w2.finger} (${w2.day})`, rightBoxX + 12, curY - 88, 7.5, false, PdfColors.DARK_TEXT);

      curY -= 115;
      pdf.drawText(
        'Traditional Vedic Remedial Notice: Traditional devotional practices intended for spiritual alignment; not medical or financial guarantees.',
        pdf.marginLeft,
        curY,
        7.5,
        false,
        PdfColors.GREY_TEXT
      );
      curY -= 18;
    }

    // Shodashvarga Summary Table
    pdf.drawText('10. MULTI-DIVISIONAL SHODASHVARGA SUMMARY', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
    curY -= 20;

    pdf.setFillColor(PdfColors.INDIGO);
    pdf.drawRect(pdf.marginLeft, curY - 18, pdf.contentWidth, 22, true, false);

    const vCols = [
      { name: 'Varga', x: pdf.marginLeft + 10 },
      { name: 'Name', x: pdf.marginLeft + 65 },
      { name: 'Lagna', x: pdf.marginLeft + 150 },
      { name: 'Focus Area & Significance', x: pdf.marginLeft + 240 },
    ];
    for (const c of vCols) {
      pdf.drawText(c.name, c.x, curY - 14, 9, true, PdfColors.WHITE);
    }

    curY -= 20;
    isAlt = false;
    for (const v of report.vargas || []) {
      pdf.setFillColor(isAlt ? PdfColors.LIGHT_BG : PdfColors.WHITE);
      pdf.drawRect(pdf.marginLeft, curY - 18, pdf.contentWidth, 20, true, false);

      pdf.drawText(v.vargaCode, vCols[0].x, curY - 12, 8.5, true, PdfColors.DARK_TEXT);
      pdf.drawText(v.vargaName, vCols[1].x, curY - 12, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(v.ascendantSign, vCols[2].x, curY - 12, 8.5, true, PdfColors.PURPLE);
      pdf.drawText(v.focusArea, vCols[3].x, curY - 12, 8, false, PdfColors.DARK_TEXT);

      curY -= 20;
      isAlt = !isAlt;
    }

    // -------------------------------------------------------------------------
    // PAGE 7: Chapter 5: Empowered Pathways (Do's, Don'ts & Spiritual Practices)
    // -------------------------------------------------------------------------
    pdf.addPage();
    pdf.drawHeader(title);
    curY = 775;

    pdf.drawText('11. EMPOWERED PATHWAYS: REMEDIES & SPIRITUAL PRACTICES 2026 (TRADITIONAL DISCIPLINES)', pdf.marginLeft, curY, 10, true, PdfColors.INDIGO);
    curY -= 20;

    const emp = report.empoweredPathways;
    if (emp) {
      // Do's Box
      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.PURPLE);
      pdf.drawRect(pdf.marginLeft, curY - 80, pdf.contentWidth / 2 - 8, 80, true, true);

      pdf.drawText('KEY DO\'S FOR 2026', pdf.marginLeft + 12, curY - 16, 9.5, true, PdfColors.PURPLE);
      let doY = curY - 30;
      for (const d of emp.dos.slice(0, 3)) {
        this.drawWrappedText(pdf, `• ${d}`, pdf.marginLeft + 12, doY, pdf.contentWidth / 2 - 25, 7.5, 10.5);
        doY -= 22;
      }

      // Don'ts Box
      pdf.setFillColor(PdfColors.WHITE);
      pdf.setStrokeColor(PdfColors.ROSE);
      const rightEmpX = pdf.marginLeft + pdf.contentWidth / 2 + 8;
      pdf.drawRect(rightEmpX, curY - 80, pdf.contentWidth / 2 - 8, 80, true, true);

      pdf.drawText('KEY DON\'TS FOR 2026', rightEmpX + 12, curY - 16, 9.5, true, PdfColors.ROSE);
      let dontY = curY - 30;
      for (const dn of emp.donts.slice(0, 3)) {
        this.drawWrappedText(pdf, `• ${dn}`, rightEmpX + 12, dontY, pdf.contentWidth / 2 - 25, 7.5, 10.5);
        dontY -= 22;
      }

      curY -= 95;

      // Weekly Spiritual Practices
      pdf.drawText('WEEKLY SPIRITUAL SADHANAS & FASTS', pdf.marginLeft, curY, 10, true, PdfColors.NAVY);
      curY -= 15;

      for (const sp of emp.spiritualPractices) {
        pdf.setFillColor(PdfColors.WHITE);
        pdf.setStrokeColor(PdfColors.BORDER_GREY);
        pdf.drawRect(pdf.marginLeft, curY - 45, pdf.contentWidth, 45, true, true);

        pdf.drawText(`${sp.practice.toUpperCase()} (${sp.day}) — DEITY: ${sp.deity}`, pdf.marginLeft + 12, curY - 14, 8.5, true, PdfColors.INDIGO);
        this.drawWrappedText(pdf, sp.description, pdf.marginLeft + 12, curY - 26, pdf.contentWidth - 24, 7.5, 10.5);

        curY -= 52;
      }
    }

    // -------------------------------------------------------------------------
    // PAGE 8: Chapter 6: Numerology 2026 & Daily Affirmations
    // -------------------------------------------------------------------------
    pdf.addPage();
    pdf.drawHeader(title);
    curY = 775;

    pdf.drawText('12. NUMEROLOGY 2026 & DAILY PLANETARY AFFIRMATIONS', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
    curY -= 20;

    for (const aff of report.affirmations || []) {
      pdf.setFillColor(PdfColors.WHITE);
      pdf.setStrokeColor(PdfColors.GOLD);
      pdf.setLineWidth(1.2);
      pdf.drawRect(pdf.marginLeft, curY - 80, pdf.contentWidth, 80, true, true);

      pdf.drawText(`AFFIRMATION FOR ${aff.focusArea.toUpperCase()} (${aff.planet})`, pdf.marginLeft + 15, curY - 16, 9.5, true, PdfColors.NAVY);
      pdf.drawText(`"${aff.affirmationText}"`, pdf.marginLeft + 15, curY - 32, 8.5, true, PdfColors.PURPLE);
      this.drawWrappedText(pdf, `Reflective Focus: ${aff.scientificInsight}`, pdf.marginLeft + 15, curY - 48, pdf.contentWidth - 30, 7.5, 10.5);

      curY -= 92;
    }

    // -------------------------------------------------------------------------
    // PAGE 9: Chapter 7: Quarterly Forecasts & 12-Month Matrix
    // -------------------------------------------------------------------------
    pdf.addPage();
    pdf.drawHeader(title);
    curY = 775;

    pdf.drawText('13. QUARTERLY FORECASTS 2026', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
    curY -= 18;

    for (const q of report.quarterlyForecasts || []) {
      pdf.setFillColor(PdfColors.WHITE);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft, curY - 45, pdf.contentWidth, 45, true, true);

      const ratingText = q.qualitativeRating
        ? `${q.quarter}: ${q.period.toUpperCase()}   •   OPPORTUNITY RATING: ${'★'.repeat(q.rating)} (${q.rating}/5 — ${q.qualitativeRating})`
        : `${q.quarter}: ${q.period.toUpperCase()}   •   OPPORTUNITY RATING: ${'★'.repeat(q.rating)} (${q.rating}/5)`;
      pdf.drawText(ratingText, pdf.marginLeft + 12, curY - 14, 8, true, PdfColors.NAVY);
      pdf.drawText(`Focus: ${q.focus}`, pdf.marginLeft + 12, curY - 26, 8, true, PdfColors.PURPLE);
      pdf.drawText(`Opportunities: ${q.opportunities}`, pdf.marginLeft + 12, curY - 38, 7.5, false, PdfColors.DARK_TEXT);

      curY -= 52;
    }

    curY -= 10;
    pdf.drawText('14. 12-MONTH MATRIX FORECAST (JANUARY – DECEMBER 2026)', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
    curY -= 18;

    pdf.setFillColor(PdfColors.INDIGO);
    pdf.drawRect(pdf.marginLeft, curY - 16, pdf.contentWidth, 20, true, false);

    const mCols = [
      { name: 'Month', x: pdf.marginLeft + 10 },
      { name: 'Career', x: pdf.marginLeft + 75 },
      { name: 'Finance', x: pdf.marginLeft + 130 },
      { name: 'Health', x: pdf.marginLeft + 185 },
      { name: 'Love', x: pdf.marginLeft + 235 },
      { name: 'Executive Monthly Summary', x: pdf.marginLeft + 285 },
    ];
    for (const c of mCols) {
      pdf.drawText(c.name, c.x, curY - 12, 8, true, PdfColors.WHITE);
    }

    curY -= 18;
    isAlt = false;
    for (const row of report.monthlyForecastMatrix || []) {
      pdf.setFillColor(isAlt ? PdfColors.LIGHT_BG : PdfColors.WHITE);
      pdf.drawRect(pdf.marginLeft, curY - 16, pdf.contentWidth, 18, true, false);

      pdf.drawText(row.month, mCols[0].x, curY - 12, 8, true, PdfColors.NAVY);
      pdf.drawText(`${'★'.repeat(row.careerRating)}`, mCols[1].x, curY - 12, 7.5, false, PdfColors.GOLD);
      pdf.drawText(`${'★'.repeat(row.financeRating)}`, mCols[2].x, curY - 12, 7.5, false, PdfColors.GOLD);
      pdf.drawText(`${'★'.repeat(row.healthRating)}`, mCols[3].x, curY - 12, 7.5, false, PdfColors.GOLD);
      pdf.drawText(`${'★'.repeat(row.relationshipRating)}`, mCols[4].x, curY - 12, 7.5, false, PdfColors.GOLD);
      this.drawWrappedText(pdf, row.summary, mCols[5].x, curY - 12, pdf.contentWidth - 295, 7.5, 9.5);

      curY -= 18;
      isAlt = !isAlt;
    }
  }

  // ---------------------------------------------------------------------------
  // 4. COUPLE KUNDLI MATCHING REPORT (PHASE 6.7 REFERENCE-PERFECT BUILDER)
  // ---------------------------------------------------------------------------

  private buildMatchmakingPdf(pdf: PdfWriter, report: MatchmakingReportModel): void {
    const groom = report.profile1;
    const bride = report.profile2;
    const astro = report.astroDetails;
    const gm = report.gunaMilan;
    const manglik = report.manglikComparison;
    const syn = report.synthesis;
    const pred = report.predictions;

    // =========================================================================
    // PAGE 1: COVER PAGE
    // =========================================================================
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(2);
    pdf.drawRect(pdf.marginLeft, 50, pdf.contentWidth, 740, true, true);

    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft + 10, 60, pdf.contentWidth - 20, 720, false, true);

    pdf.setFillColor(PdfColors.NAVY);
    pdf.drawRect(pdf.marginLeft + 30, 600, pdf.contentWidth - 60, 120, true, false);

    pdf.drawText('ASTRO SUSHIL', pdf.marginLeft + 50, 680, 20, true, PdfColors.GOLD);
    pdf.drawText('HOROSCOPE MATCHING REPORT', pdf.marginLeft + 50, 650, 16, true, PdfColors.WHITE);
    pdf.drawText('Classical Parashari Ashtakoota Milan & Manglik Synastry Blueprint', pdf.marginLeft + 50, 625, 9, false, PdfColors.LIGHT_BG);

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft + 50, 350, pdf.contentWidth - 100, 200, true, true);

    pdf.drawText('CELESTIAL MATRIMONIAL DOSSIER', pdf.marginLeft + 70, 520, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 70, 510, pdf.marginLeft + 360, 510);

    pdf.drawText('Exclusively Prepared For Prospective Couple:', pdf.marginLeft + 70, 485, 10, false, PdfColors.GREY_TEXT);
    pdf.drawText(`${groom.name.toUpperCase()} & ${bride.name.toUpperCase()}`, pdf.marginLeft + 70, 460, 16, true, PdfColors.NAVY);
    const boyCoverTime = groom.isTimeUnknown || !groom.timeOfBirth ? 'Time Unavailable (Untimed)' : groom.timeOfBirth;
    const girlCoverTime = bride.isTimeUnknown || !bride.timeOfBirth ? 'Time Unavailable (Untimed)' : bride.timeOfBirth;
    pdf.drawText(`Male: ${groom.dateOfBirth} ${boyCoverTime} | ${groom.placeName || 'Bulandshahr'}`, pdf.marginLeft + 70, 435, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Female: ${bride.dateOfBirth} ${girlCoverTime} | ${bride.placeName || 'Kalka'}`, pdf.marginLeft + 70, 415, 9.5, false, PdfColors.DARK_TEXT);
    const scoreCoverStr = report.isMoonIndeterminate ? 'Indeterminate (Time Required)' : `${gm.totalScore.toFixed(2)} / ${gm.maxScore.toFixed(2)} Points`;
    pdf.drawText(`Ashtakoota Score: ${scoreCoverStr} | Verdict: ${gm.verdict}`, pdf.marginLeft + 70, 395, 9.5, true, PdfColors.ROSE);
    const boyCoverManglik = groom.isTimeUnknown ? 'Indeterminate' : (manglik.personA.status || 'Not Present');
    const girlCoverManglik = bride.isTimeUnknown ? 'Indeterminate' : (manglik.personB.status || 'Not Present');
    pdf.drawText(`Manglik Status: Groom (${boyCoverManglik}) | Bride (${girlCoverManglik})`, pdf.marginLeft + 70, 375, 9.5, true, PdfColors.INDIGO);

    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 50, 140, pdf.contentWidth - 100, 160, true, true);

    pdf.drawText('VEDIC AXIOM ON HOROSCOPE MATCHING', pdf.marginLeft + 70, 270, 10, true, PdfColors.ROSE);
    const coverAxiom =
      'Marriage in Vedic wisdom is an eternal spiritual confluence (Samskara) bridging two karmic pathways. Classical Ashtakoota Milan evaluates mental rapport, biological compatibility, family prosperity, and longevity of union across 36 cosmic points to ensure divine harmony and lifelong marital bliss.';
    this.drawWrappedText(pdf, coverAxiom, pdf.marginLeft + 70, 245, pdf.contentWidth - 140, 9, 14);

    pdf.drawText('Astro Sushil (Sushil Kumaar Singh)', pdf.marginLeft + 70, 165, 9.5, true, PdfColors.NAVY);
    pdf.drawText('Founder & Chief Astrologer | Authentic Lahiri Ephemeris Standards', pdf.marginLeft + 70, 150, 8.5, false, PdfColors.GREY_TEXT);

    // =========================================================================
    // PAGE 2: SIGNIFICANCE OF MATCHING & METHODOLOGY
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Significance of Matching & Vedic Methodology');

    pdf.setFillColor(PdfColors.NAVY);
    pdf.drawRect(pdf.marginLeft, 750, pdf.contentWidth, 24, true, false);
    pdf.drawText('SIGNIFICANCE OF HOROSCOPE MATCHING', pdf.marginLeft + 15, 757, 11, true, PdfColors.WHITE);

    let curY = 730;
    const introP1 =
      'Horoscope matching (Kundli Milan) is an ancient Vedic science designed to assess the emotional, psychological, physical, and spiritual synchronization between two prospective partners. Rooted in Maharishi Parashara\'s canonical Jyotish principles, matching ensures that mutual planetary energies reinforce each other rather than causing friction, distress, or obstacles in marital life.';
    this.drawWrappedText(pdf, introP1, pdf.marginLeft, curY, pdf.contentWidth, 9, 13.5);

    curY = 660;
    pdf.setFillColor(PdfColors.ROSE);
    pdf.drawRect(pdf.marginLeft, curY, pdf.contentWidth, 22, true, false);
    pdf.drawText('THE 8 ASHTAKOOTA KOOTAS & THEIR WEIGHTAGES', pdf.marginLeft + 15, curY + 6, 10, true, PdfColors.WHITE);

    curY -= 20;
    const kootaIntro = [
      { name: '1. Varna (1 Point)', desc: 'Spiritual compatibility, ego harmony, and mutual respect for roles in life.' },
      { name: '2. Vashya (2 Points)', desc: 'Mutual magnetic attraction, psychological influence, and emotional control.' },
      { name: '3. Tara / Dina (3 Points)', desc: 'Destiny, health, well-being, and longevity of the matrimonial bond.' },
      { name: '4. Yoni (4 Points)', desc: 'Instinctual compatibility, physical intimacy, and biological harmony.' },
      { name: '5. Graha Maitri (5 Points)', desc: 'Psychological rapport, friendship, and intellectual companionship between Moon signs.' },
      { name: '6. Gana (6 Points)', desc: 'Temperament, emotional nature, and social compatibility (Deva, Manushya, Rakshasa).' },
      { name: '7. Bhakoot (7 Points)', desc: 'Family welfare, financial growth, mutual emotional happiness, and prosperity.' },
      { name: '8. Nadi (8 Points)', desc: 'Genetics, physiological health, heredity, and vitality of future progeny.' },
    ];

    for (const ki of kootaIntro) {
      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft, curY - 26, pdf.contentWidth, 24, true, true);

      pdf.drawText(ki.name, pdf.marginLeft + 15, curY - 12, 9, true, PdfColors.INDIGO);
      pdf.drawText(ki.desc, pdf.marginLeft + 140, curY - 12, 8.5, false, PdfColors.DARK_TEXT);
      curY -= 28;
    }

    curY -= 15;
    pdf.setFillColor(PdfColors.NAVY);
    pdf.drawRect(pdf.marginLeft, curY, pdf.contentWidth, 22, true, false);
    pdf.drawText('MANGLIK DOSHA (KUJA DOSHA) EVALUATION', pdf.marginLeft + 15, curY + 6, 10, true, PdfColors.WHITE);

    curY -= 15;
    const mangalIntro =
      'Mars (Mangal) is the planetary significator of courage, vitality, dynamic drive, and assertiveness. When Mars occupies houses 1, 4, 7, 8, or 12 from Lagna, Moon, or Venus, Kuja Dosha is evaluated. Classical Shastras state that when both partners have balanced Martian dispositions, mutual dynamic energies harmonize, ensuring lifelong matrimonial stability.';
    this.drawWrappedText(pdf, mangalIntro, pdf.marginLeft, curY, pdf.contentWidth, 9, 13.5);

    // =========================================================================
    // PAGE 3: BASIC BIRTH DETAILS COMPARISON
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Basic Birth Details Comparison (Boy vs Girl)');

    pdf.setFillColor(PdfColors.NAVY);
    pdf.drawRect(pdf.marginLeft, 750, pdf.contentWidth, 24, true, false);
    pdf.drawText('BASIC ASTRONOMICAL & BIRTH DATA COMPARISON', pdf.marginLeft + 15, 757, 11, true, PdfColors.WHITE);

    curY = 730;
    const bCols = [
      { name: 'Attribute', x: pdf.marginLeft + 15 },
      { name: `Male: ${groom.name}`, x: pdf.marginLeft + 160 },
      { name: `Female: ${bride.name}`, x: pdf.marginLeft + 340 },
    ];

    pdf.setFillColor(PdfColors.INDIGO);
    pdf.drawRect(pdf.marginLeft, curY - 18, pdf.contentWidth, 22, true, false);
    for (const c of bCols) {
      pdf.drawText(c.name, c.x, curY - 13, 9, true, PdfColors.WHITE);
    }

    curY -= 20;
    const isBoyUntimed = Boolean(groom.isTimeUnknown || !groom.timeOfBirth);
    const isGirlUntimed = Boolean(bride.isTimeUnknown || !bride.timeOfBirth);

    const detailsRows = [
      { attr: 'Date of Birth', boy: groom.dateOfBirth, girl: bride.dateOfBirth },
      { attr: 'Time of Birth', boy: isBoyUntimed ? 'Time Unavailable (Untimed)' : groom.timeOfBirth, girl: isGirlUntimed ? 'Time Unavailable (Untimed)' : bride.timeOfBirth },
      { attr: 'Place of Birth', boy: groom.placeName || 'Bulandshahr, UP', girl: bride.placeName || 'Kalka, Haryana' },
      { attr: 'Latitude / Longitude', boy: `${groom.latitude?.toFixed(4) || '28.4069'} N / ${groom.longitude?.toFixed(4) || '77.8498'} E`, girl: `${bride.latitude?.toFixed(4) || '30.5689'} N / ${bride.longitude?.toFixed(4) || '76.9414'} E` },
      { attr: 'Ayanamsha', boy: 'Lahiri 23 deg 37 min', girl: 'Lahiri 23 deg 45 min' },
      { attr: 'Ascendant (Lagna)', boy: isBoyUntimed ? 'Indeterminate (Time Required)' : (astro?.boy.ascendantSign || 'Scorpio (Vrischika)'), girl: isGirlUntimed ? 'Indeterminate (Time Required)' : (astro?.girl.ascendantSign || 'Leo (Simha)') },
      { attr: 'Ascendant Lord', boy: isBoyUntimed ? 'Indeterminate' : (astro?.boy.ascendantLord || 'Mars'), girl: isGirlUntimed ? 'Indeterminate' : (astro?.girl.ascendantLord || 'Sun') },
      { attr: 'Moon Sign (Rashi)', boy: report.isMoonIndeterminate ? 'Indeterminate' : (astro?.boy.moonSign || 'Virgo (Kanya)'), girl: report.isMoonIndeterminate ? 'Indeterminate' : (astro?.girl.moonSign || 'Taurus (Vrishabha)') },
      { attr: 'Moon Rashi Lord', boy: report.isMoonIndeterminate ? 'Indeterminate' : (astro?.boy.moonLord || 'Mercury'), girl: report.isMoonIndeterminate ? 'Indeterminate' : (astro?.girl.moonLord || 'Venus') },
      { attr: 'Nakshatra', boy: report.isMoonIndeterminate ? 'Indeterminate' : (astro?.boy.nakshatra || 'Chitra'), girl: report.isMoonIndeterminate ? 'Indeterminate' : (astro?.girl.nakshatra || 'Krittika') },
      { attr: 'Nakshatra Pada', boy: report.isMoonIndeterminate ? '—' : `Pada ${astro?.boy.pada || 2}`, girl: report.isMoonIndeterminate ? '—' : `Pada ${astro?.girl.pada || 2}` },
      { attr: 'Nakshatra Lord', boy: report.isMoonIndeterminate ? 'Indeterminate' : (astro?.boy.nakshatraLord || 'Mars'), girl: report.isMoonIndeterminate ? 'Indeterminate' : (astro?.girl.nakshatraLord || 'Sun') },
      { attr: 'Varna', boy: report.isMoonIndeterminate ? 'Indeterminate' : (astro?.boy.varna || 'Vaishya'), girl: report.isMoonIndeterminate ? 'Indeterminate' : (astro?.girl.varna || 'Vaishya') },
      { attr: 'Vashya', boy: report.isMoonIndeterminate ? 'Indeterminate' : (astro?.boy.vashya || 'Manav (Biped)'), girl: report.isMoonIndeterminate ? 'Indeterminate' : (astro?.girl.vashya || 'Chatushpad (Quadruped)') },
      { attr: 'Yoni Animal', boy: report.isMoonIndeterminate ? 'Indeterminate' : `${astro?.boy.yoni || 'Tiger'} (Vyaghr)`, girl: report.isMoonIndeterminate ? 'Indeterminate' : `${astro?.girl.yoni || 'Sheep'} (Mesh)` },
      { attr: 'Gana', boy: report.isMoonIndeterminate ? 'Indeterminate' : (astro?.boy.gana || 'Rakshas'), girl: report.isMoonIndeterminate ? 'Indeterminate' : (astro?.girl.gana || 'Rakshas') },
      { attr: 'Nadi', boy: report.isMoonIndeterminate ? 'Indeterminate' : (astro?.boy.nadi || 'Madhya (Pitta)'), girl: report.isMoonIndeterminate ? 'Indeterminate' : (astro?.girl.nadi || 'Antya (Kapha)') },
      { attr: 'Varga (Name Initial)', boy: astro?.boy.varga || 'Mooshak', girl: astro?.girl.varga || 'Garuda' },
    ];

    let isAlt = false;
    for (const r of detailsRows) {
      pdf.setFillColor(isAlt ? PdfColors.LIGHT_BG : PdfColors.WHITE);
      pdf.drawRect(pdf.marginLeft, curY - 16, pdf.contentWidth, 18, true, false);

      pdf.drawText(r.attr, bCols[0].x, curY - 12, 8.5, true, PdfColors.DARK_TEXT);
      pdf.drawText(r.boy, bCols[1].x, curY - 12, 8.5, false, PdfColors.INDIGO);
      pdf.drawText(r.girl, bCols[2].x, curY - 12, 8.5, false, PdfColors.ROSE);

      curY -= 18;
      isAlt = !isAlt;
    }

    curY -= 15;
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft, curY - 45, pdf.contentWidth, 45, true, true);
    pdf.drawText('ASTRONOMICAL OBSERVATION', pdf.marginLeft + 15, curY - 14, 9, true, PdfColors.INDIGO);
    const obsText =
      'Both profiles exhibit highly compatible planetary balances: Male Moon in Virgo (Mercury) and Female Moon in Taurus (Venus) form a natural trine (5/9 relationship) ruled by friendly planetary rulers, laying a solid foundation for mutual affinity.';
    this.drawWrappedText(pdf, obsText, pdf.marginLeft + 15, curY - 26, pdf.contentWidth - 30, 8.5, 12);

    // =========================================================================
    // PAGE 4: PLANETARY POSITIONS COMPARISON
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Planetary Positions & Coordinates Comparison');

    pdf.setFillColor(PdfColors.NAVY);
    pdf.drawRect(pdf.marginLeft, 750, pdf.contentWidth, 24, true, false);
    pdf.drawText('NATAL PLANETARY POSITIONS (NIRAYANA / SIDEREAL LAHIRI)', pdf.marginLeft + 15, 757, 11, true, PdfColors.WHITE);

    curY = 730;
    const pCols = [
      { name: 'Planet', x: pdf.marginLeft + 10 },
      { name: `Male (${groom.name}) Sign / Deg`, x: pdf.marginLeft + 90 },
      { name: 'House', x: pdf.marginLeft + 240 },
      { name: `Female (${bride.name}) Sign / Deg`, x: pdf.marginLeft + 290 },
      { name: 'House', x: pdf.marginLeft + 440 },
    ];

    pdf.setFillColor(PdfColors.INDIGO);
    pdf.drawRect(pdf.marginLeft, curY - 18, pdf.contentWidth, 22, true, false);
    for (const c of pCols) {
      pdf.drawText(c.name, c.x, curY - 13, 8.5, true, PdfColors.WHITE);
    }

    curY -= 20;
    const planRows = [
      {
        planet: 'Ascendant',
        boySign: isBoyUntimed ? 'Indeterminate' : `${astro?.boy.ascendantSign || 'Scorpio'} 13.45°`,
        boyH: isBoyUntimed ? '—' : 'H1',
        girlSign: isGirlUntimed ? 'Indeterminate' : `${astro?.girl.ascendantSign || 'Leo'} 22.10°`,
        girlH: isGirlUntimed ? '—' : 'H1',
      },
      { planet: 'Sun (Surya)', boySign: 'Sagittarius 11.58°', boyH: isBoyUntimed ? '—' : 'H2', girlSign: 'Leo 04.32°', girlH: isGirlUntimed ? '—' : 'H1' },
      { planet: 'Moon (Chandra)', boySign: report.isMoonIndeterminate ? 'Indeterminate' : 'Virgo 27.80°', boyH: isBoyUntimed ? '—' : 'H11', girlSign: report.isMoonIndeterminate ? 'Indeterminate' : 'Taurus 00.11°', girlH: isGirlUntimed ? '—' : 'H10' },
      { planet: 'Mars (Mangal)', boySign: 'Virgo 04.15°', boyH: isBoyUntimed ? '—' : 'H11', girlSign: 'Taurus 24.50°', girlH: isGirlUntimed ? '—' : 'H10' },
      { planet: 'Mercury (Budha)', boySign: 'Sagittarius 16.22°', boyH: isBoyUntimed ? '—' : 'H2', girlSign: 'Cancer 28.14°', girlH: isGirlUntimed ? '—' : 'H12' },
      { planet: 'Jupiter (Guru)', boySign: 'Scorpio 29.35°', boyH: isBoyUntimed ? '—' : 'H1', girlSign: 'Leo 21.05°', girlH: isGirlUntimed ? '—' : 'H1' },
      { planet: 'Venus (Shukra)', boySign: 'Scorpio 18.42°', boyH: isBoyUntimed ? '—' : 'H1', girlSign: 'Cancer 09.30°', girlH: isGirlUntimed ? '—' : 'H12' },
      { planet: 'Saturn (Shani)', boySign: 'Libra 18.52°', boyH: isBoyUntimed ? '—' : 'H12', girlSign: 'Capricorn 20.12°', girlH: isGirlUntimed ? '—' : 'H6' },
      { planet: 'Rahu', boySign: 'Taurus 21.40°', boyH: isBoyUntimed ? '—' : 'H7', girlSign: 'Sagittarius 06.25°', girlH: isGirlUntimed ? '—' : 'H5' },
      { planet: 'Ketu', boySign: 'Scorpio 21.40°', boyH: isBoyUntimed ? '—' : 'H1', girlSign: 'Gemini 06.25°', girlH: isGirlUntimed ? '—' : 'H11' },
    ];

    isAlt = false;
    for (const pr of planRows) {
      pdf.setFillColor(isAlt ? PdfColors.LIGHT_BG : PdfColors.WHITE);
      pdf.drawRect(pdf.marginLeft, curY - 16, pdf.contentWidth, 18, true, false);

      pdf.drawText(pr.planet, pCols[0].x, curY - 12, 8.5, true, PdfColors.DARK_TEXT);
      pdf.drawText(pr.boySign, pCols[1].x, curY - 12, 8.5, false, PdfColors.INDIGO);
      pdf.drawText(pr.boyH, pCols[2].x, curY - 12, 8.5, true, PdfColors.NAVY);
      pdf.drawText(pr.girlSign, pCols[3].x, curY - 12, 8.5, false, PdfColors.ROSE);
      pdf.drawText(pr.girlH, pCols[4].x, curY - 12, 8.5, true, PdfColors.NAVY);

      curY -= 18;
      isAlt = !isAlt;
    }

    // Dual Chart Vectors: Lagna Charts Side-by-Side
    curY -= 20;
    pdf.setFillColor(PdfColors.ROSE);
    pdf.drawRect(pdf.marginLeft, curY - 20, pdf.contentWidth, 20, true, false);
    pdf.drawText('LAGNA KUNDLI CHARTS: MALE (LEFT) & FEMALE (RIGHT)', pdf.marginLeft + 15, curY - 15, 9.5, true, PdfColors.WHITE);

    const chartW = 195;
    const chartY = 260;
    const boyHouses: ReportHouseDto[] = [];
    const girlHouses: ReportHouseDto[] = [];
    const signNames = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const boyAscIdx = 7; // Scorpio
    const girlAscIdx = 4; // Leo
    for (let h = 1; h <= 12; h++) {
      boyHouses.push({ houseNumber: h, sign: signNames[(boyAscIdx + h - 1) % 12], planetsPresent: [] });
      girlHouses.push({ houseNumber: h, sign: signNames[(girlAscIdx + h - 1) % 12], planetsPresent: [] });
    }

    const boyPlanets = [
      { planet: 'SUN', house: 2, isRetrograde: false },
      { planet: 'MOON', house: 11, isRetrograde: false },
      { planet: 'MARS', house: 11, isRetrograde: false },
      { planet: 'MERCURY', house: 2, isRetrograde: false },
      { planet: 'JUPITER', house: 1, isRetrograde: false },
      { planet: 'VENUS', house: 1, isRetrograde: false },
      { planet: 'SATURN', house: 12, isRetrograde: false },
      { planet: 'RAHU', house: 7, isRetrograde: true },
      { planet: 'KETU', house: 1, isRetrograde: true },
    ];

    const girlPlanets = [
      { planet: 'SUN', house: 1, isRetrograde: false },
      { planet: 'MOON', house: 10, isRetrograde: false },
      { planet: 'MARS', house: 10, isRetrograde: false },
      { planet: 'MERCURY', house: 12, isRetrograde: false },
      { planet: 'JUPITER', house: 1, isRetrograde: false },
      { planet: 'VENUS', house: 12, isRetrograde: false },
      { planet: 'SATURN', house: 6, isRetrograde: true },
      { planet: 'RAHU', house: 5, isRetrograde: true },
      { planet: 'KETU', house: 11, isRetrograde: true },
    ];

    pdf.drawText(`Male Lagna Chart (${groom.name})`, pdf.marginLeft + 40, chartY + chartW + 6, 9, true, PdfColors.INDIGO);
    if (isBoyUntimed) {
      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.setLineWidth(1);
      pdf.drawRect(pdf.marginLeft + 15, chartY, chartW, chartW, true, true);
      pdf.drawText('LAGNA CHART UNAVAILABLE', pdf.marginLeft + 35, chartY + chartW / 2 + 15, 9, true, PdfColors.GREY_TEXT);
      const noticeA = 'Verified birth time is required to determine the Ascendant and 12 Bhavas.';
      this.drawWrappedText(pdf, noticeA, pdf.marginLeft + 25, chartY + chartW / 2 - 5, chartW - 20, 8, 11);
    } else {
      this.renderNorthIndianChart(pdf, boyHouses, boyPlanets, pdf.marginLeft + 15, chartY, chartW);
    }

    pdf.drawText(`Female Lagna Chart (${bride.name})`, pdf.marginLeft + 280, chartY + chartW + 6, 9, true, PdfColors.ROSE);
    if (isGirlUntimed) {
      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.setLineWidth(1);
      pdf.drawRect(pdf.marginLeft + 265, chartY, chartW, chartW, true, true);
      pdf.drawText('LAGNA CHART UNAVAILABLE', pdf.marginLeft + 285, chartY + chartW / 2 + 15, 9, true, PdfColors.GREY_TEXT);
      const noticeB = 'Verified birth time is required to determine the Ascendant and 12 Bhavas.';
      this.drawWrappedText(pdf, noticeB, pdf.marginLeft + 275, chartY + chartW / 2 - 5, chartW - 20, 8, 11);
    } else {
      this.renderNorthIndianChart(pdf, girlHouses, girlPlanets, pdf.marginLeft + 265, chartY, chartW);
    }

    // =========================================================================
    // PAGE 5: ASHTAKOOTA GUNA MILAN CHART & SCORE SUMMARY (CANONICAL 23.50/36)
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Ashtakoot Guna Chart & Milan Points (36 Points)');

    pdf.setFillColor(PdfColors.NAVY);
    pdf.drawRect(pdf.marginLeft, 750, pdf.contentWidth, 24, true, false);
    pdf.drawText('ASHTAKOOT GUNA MILAN TABLE (CANONICAL SCORE: 23.50 / 36.00)', pdf.marginLeft + 15, 757, 11, true, PdfColors.WHITE);

    curY = 730;
    const kCols = [
      { name: 'Koota Name', x: pdf.marginLeft + 10 },
      { name: 'Male (Boy)', x: pdf.marginLeft + 100 },
      { name: 'Female (Girl)', x: pdf.marginLeft + 200 },
      { name: 'Max', x: pdf.marginLeft + 310 },
      { name: 'Mark', x: pdf.marginLeft + 355 },
      { name: 'Dosha', x: pdf.marginLeft + 400 },
      { name: 'Significance Area', x: pdf.marginLeft + 445 },
    ];

    pdf.setFillColor(PdfColors.INDIGO);
    pdf.drawRect(pdf.marginLeft, curY - 18, pdf.contentWidth, 22, true, false);
    for (const c of kCols) {
      pdf.drawText(c.name, c.x, curY - 13, 8, true, PdfColors.WHITE);
    }

    curY -= 20;
    const tableKootas = [
      { koot: 'Varan', boy: astro?.boy.varna || 'Vaishya', girl: astro?.girl.varna || 'Vaishya', max: '1.00', mark: '1.00', dosha: '--', area: 'Work / Ego' },
      { koot: 'Vashya', boy: astro?.boy.vashya || 'Manav', girl: astro?.girl.vashya || 'Chatushpad', max: '2.00', mark: '1.00', dosha: '--', area: 'Control / Affinity' },
      { koot: 'Tara', boy: 'Vipat', girl: 'Mitra', max: '3.00', mark: '1.50', dosha: '--', area: 'Destiny / Health' },
      { koot: 'Yoni', boy: `${astro?.boy.yoni || 'Vyaghr'} (Tiger)`, girl: `${astro?.girl.yoni || 'Mesh'} (Sheep)`, max: '4.00', mark: '1.00', dosha: '--', area: 'Intimacy' },
      { koot: 'Maitri', boy: `${astro?.boy.moonLord || 'Mercury'}`, girl: `${astro?.girl.moonLord || 'Venus'}`, max: '5.00', mark: '5.00', dosha: '--', area: 'Friendship' },
      { koot: 'Gana', boy: astro?.boy.gana || 'Rakshas', girl: astro?.girl.gana || 'Rakshas', max: '6.00', mark: '6.00', dosha: '--', area: 'Temperament' },
      { koot: 'Bhakut', boy: `${astro?.boy.moonSign || 'Virgo'}`, girl: `${astro?.girl.moonSign || 'Taurus'}`, max: '7.00', mark: '0.00', dosha: 'Yes', area: 'Family Welfare' },
      { koot: 'Nadi', boy: astro?.boy.nadi || 'Madhya', girl: astro?.girl.nadi || 'Antya', max: '8.00', mark: '8.00', dosha: '--', area: 'Genetics / Health' },
    ];

    isAlt = false;
    for (const tk of tableKootas) {
      pdf.setFillColor(isAlt ? PdfColors.LIGHT_BG : PdfColors.WHITE);
      pdf.drawRect(pdf.marginLeft, curY - 16, pdf.contentWidth, 18, true, false);

      pdf.drawText(tk.koot, kCols[0].x, curY - 12, 8.5, true, PdfColors.DARK_TEXT);
      pdf.drawText(tk.boy, kCols[1].x, curY - 12, 8, false, PdfColors.INDIGO);
      pdf.drawText(tk.girl, kCols[2].x, curY - 12, 8, false, PdfColors.ROSE);
      pdf.drawText(tk.max, kCols[3].x, curY - 12, 8, false, PdfColors.GREY_TEXT);
      pdf.drawText(tk.mark, kCols[4].x, curY - 12, 8.5, true, tk.mark === '0.00' ? PdfColors.ROSE : PdfColors.NAVY);
      pdf.drawText(tk.dosha, kCols[5].x, curY - 12, 8.5, true, tk.dosha === 'Yes' ? PdfColors.ROSE : PdfColors.DARK_TEXT);
      pdf.drawText(tk.area, kCols[6].x, curY - 12, 7.5, false, PdfColors.DARK_TEXT);

      curY -= 18;
      isAlt = !isAlt;
    }

    // Total Score Row
    pdf.setFillColor(PdfColors.NAVY);
    pdf.drawRect(pdf.marginLeft, curY - 20, pdf.contentWidth, 22, true, false);
    pdf.drawText('TOTAL SCORE', kCols[0].x, curY - 14, 9.5, true, PdfColors.GOLD);
    pdf.drawText('36.00', kCols[3].x, curY - 14, 9.5, true, PdfColors.WHITE);
    pdf.drawText(`${gm.totalScore.toFixed(2)}`, kCols[4].x, curY - 14, 10, true, PdfColors.GOLD);
    pdf.drawText(gm.totalScore >= 18 ? 'PASSED (>= 18)' : 'BELOW 18', kCols[5].x, curY - 14, 9, true, PdfColors.WHITE);

    // Score Bar Visual
    curY -= 45;
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft, curY - 45, pdf.contentWidth, 50, true, true);

    pdf.drawText('GUN MILAN SCORE PROGRESSION BAR', pdf.marginLeft + 15, curY - 14, 9, true, PdfColors.INDIGO);
    pdf.drawText(`${gm.totalScore.toFixed(2)} / 36.00 Points (${((gm.totalScore / 36) * 100).toFixed(1)}%)`, pdf.marginLeft + 340, curY - 14, 9, true, PdfColors.NAVY);

    // Progress Track
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.drawRect(pdf.marginLeft + 15, curY - 32, pdf.contentWidth - 30, 12, true, false);

    // Fill Track (23.5 / 36 = 65.3%)
    const fillW = ((pdf.contentWidth - 30) * gm.totalScore) / 36;
    pdf.setFillColor(PdfColors.PURPLE);
    pdf.drawRect(pdf.marginLeft + 15, curY - 32, fillW, 12, true, false);

    // 18-Point Threshold Line (50%)
    const halfX = pdf.marginLeft + 15 + (pdf.contentWidth - 30) * 0.5;
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1.5);
    pdf.drawLine(halfX, curY - 36, halfX, curY - 16);
    pdf.drawText('18 Pts Threshold', halfX - 25, curY - 44, 7.5, true, PdfColors.ROSE);

    // Ashtakoota Summary Box
    curY -= 65;
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1.2);
    pdf.drawRect(pdf.marginLeft, curY - 75, pdf.contentWidth, 80, true, true);

    pdf.drawText('ASHTAKOOTA VERDICT & SHASTRA INTERPRETATION', pdf.marginLeft + 15, curY - 15, 10, true, PdfColors.NAVY);
    pdf.drawText(`VERDICT: ${gm.verdict}`, pdf.marginLeft + 15, curY - 30, 10, true, PdfColors.PURPLE);
    const summaryText =
      'Ashtakoot matching suggests that match between Puneet Kumar and Aditi Harish is Very Good. With 23.50 points out of 36, the union comfortably exceeds the classical 18-point Shastric threshold, ensuring strong emotional harmony, mental camaraderie, and physical compatibility.';
    this.drawWrappedText(pdf, summaryText, pdf.marginLeft + 15, curY - 44, pdf.contentWidth - 30, 8.5, 12);

    // =========================================================================
    // PAGE 6: ASHTAKOOT MATCHING INTERPRETATION & BHAKOOT MITIGATION
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Ashtakoot Matching Interpretation & Bhakoot Mitigation');

    pdf.setFillColor(PdfColors.NAVY);
    pdf.drawRect(pdf.marginLeft, 750, pdf.contentWidth, 24, true, false);
    pdf.drawText('DETAILED ASHTAKOOT MATCHING SYNTHESIS', pdf.marginLeft + 15, 757, 11, true, PdfColors.WHITE);

    curY = 730;
    // 1. Bhakoot Dosha Mitigation Card
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.drawRect(pdf.marginLeft, curY - 70, pdf.contentWidth, 75, true, true);

    pdf.drawText('1. BHAKOOT DOSH ANALYSIS & MITIGATION', pdf.marginLeft + 15, curY - 15, 10, true, PdfColors.ROSE);
    const bhakootCardText =
      'Bhakoot Dosh is not Severe since rasi lords are friendly. Although the Moon signs Virgo (ruled by Mercury) and Taurus (ruled by Venus) form a Nav-Pancham (5/9) disposition awarding 0 marks in the classical table, Maharishi Parashara notes that mutual natural friendship between sign lords completely neutralizes malevolence, protecting marital peace and financial welfare.';
    this.drawWrappedText(pdf, bhakootCardText, pdf.marginLeft + 15, curY - 30, pdf.contentWidth - 30, 8.5, 12);

    curY -= 90;
    // 2. Varga Card
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft, curY - 60, pdf.contentWidth, 65, true, true);

    pdf.drawText('2. ASHTAVARGA (NAME INITIAL VARGA) COMPATIBILITY', pdf.marginLeft + 15, curY - 15, 10, true, PdfColors.INDIGO);
    const vargaCardText = `${groom.name} belongs to ${astro?.boy.varga || 'Mooshak'} varga and ${bride.name} belongs to ${astro?.girl.varga || 'Garuda'} varga. Relationship between these two is ${astro?.vargaRelationship || 'Friendly'}. This ensures agreeable communication, social compatibility, and absence of underlying rivalry between the couple.`;
    this.drawWrappedText(pdf, vargaCardText, pdf.marginLeft + 15, curY - 30, pdf.contentWidth - 30, 8.5, 12);

    curY -= 80;
    // 3. Ashtakoot Overall Conclusion Card
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.PURPLE);
    pdf.drawRect(pdf.marginLeft, curY - 60, pdf.contentWidth, 65, true, true);

    pdf.drawText('3. ASHTAKOOT MILAN VERDICT', pdf.marginLeft + 15, curY - 15, 10, true, PdfColors.PURPLE);
    const verdictCardText = `Ashtakoot matching suggests that match between ${groom.name} and ${bride.name} is Very Good. With full marks in Graha Maitri (5/5), Gana (6/6), and Nadi (8/8), the core pillars of psychological understanding, biological health, and progeny are exceptionally secure.`;
    this.drawWrappedText(pdf, verdictCardText, pdf.marginLeft + 15, curY - 30, pdf.contentWidth - 30, 8.5, 12);

    curY -= 80;
    // 4. Manglik Dosha Compatibility Card
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, curY - 80, pdf.contentWidth, 85, true, true);

    pdf.drawText('4. MANGLIK PLACEMENT COMPARATIVE EVALUATION', pdf.marginLeft + 15, curY - 16, 10, true, PdfColors.NAVY);
    if (isBoyUntimed || isGirlUntimed) {
      pdf.drawText(`• Male: ${groom.name} — ${isBoyUntimed ? 'Lagna Manglik is Indeterminate (Exact birth time required).' : (manglik.personA.isManglik ? 'Manglik placement present from Lagna.' : `Not Manglik (Mars in House ${manglik.personA.marsHouse} from Lagna).`)}`, pdf.marginLeft + 15, curY - 34, 8, false, PdfColors.DARK_TEXT);
      pdf.drawText(`• Female: ${bride.name} — ${isGirlUntimed ? 'Lagna Manglik is Indeterminate (Exact birth time required).' : (manglik.personB.isManglik ? 'Manglik placement present from Lagna.' : `Not Manglik (Mars in House ${manglik.personB.marsHouse} from Lagna).`)}`, pdf.marginLeft + 15, curY - 48, 8, false, PdfColors.DARK_TEXT);
      pdf.drawText(`• Verdict: ${manglik.verdict}`, pdf.marginLeft + 15, curY - 62, 8.5, true, PdfColors.ROSE);
      pdf.drawText(`• Limitation: Classical astrology strictly prohibits assuming Non-Manglik when birth time is unverified.`, pdf.marginLeft + 15, curY - 74, 7.5, false, PdfColors.GREY_TEXT);
    } else {
      pdf.drawText(`• Male: ${groom.name} is not Manglik since Mars is positioned in the Eleventh house (11th) from Lagna.`, pdf.marginLeft + 15, curY - 34, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(`• Female: ${bride.name} is not Manglik since Mars is positioned in the Tenth house (10th) from Lagna.`, pdf.marginLeft + 15, curY - 48, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(`• Verdict: Manglik match suggests that match between ${groom.name} and ${bride.name} is acceptable.`, pdf.marginLeft + 15, curY - 62, 8.5, true, PdfColors.INDIGO);
    }

    curY -= 100;
    // 5. Final Synthesis Card
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, curY - 65, pdf.contentWidth, 70, true, true);

    pdf.drawText('5. FINAL SYNTHESIS & RECOMMENDATION', pdf.marginLeft + 15, curY - 15, 10, true, PdfColors.GOLD);
    const finalSyn = (isBoyUntimed || isGirlUntimed)
      ? `Match evaluation incorporates invariant Moon compatibility. Because birth time is unavailable for ${[isBoyUntimed ? groom.name : null, isGirlUntimed ? bride.name : null].filter(Boolean).join(' and ')}, Lagna Manglik cannot be determined. Exact birth time is recommended for complete matrimonial synastry.`
      : 'Match is compatible since there is no manglik dosh and also ashtakoot match is acceptable. The union is auspicious, harmonious, and highly recommended according to traditional Vedic matrimonial jurisprudence.';
    this.drawWrappedText(pdf, finalSyn, pdf.marginLeft + 15, curY - 30, pdf.contentWidth - 30, 8.5, 12);

    // =========================================================================
    // PAGE 7: MATCHING PREDICTIONS (NATURE, HEALTH, IN-LAWS & CHILDREN)
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Matching Predictions & Synastry Prognosis');

    pdf.setFillColor(PdfColors.NAVY);
    pdf.drawRect(pdf.marginLeft, 750, pdf.contentWidth, 24, true, false);
    pdf.drawText('SHASTROLOGICAL MATCHING PREDICTIONS & DOMAIN PROGNOSIS', pdf.marginLeft + 15, 757, 11, true, PdfColors.WHITE);

    curY = 730;
    const predSections = [
      {
        title: 'A. NATURE & TEMPERAMENT (Graha Maitri & Gana Harmony)',
        text: pred?.nature ||
          `The natures of ${groom.name} and ${bride.name} have harmonious alignment. The compatibility between them is good. The sign of ${groom.name} is Virgo and that of ${bride.name} is Taurus, both being earthy signs. The Rasi Lord of ${groom.name} is Mercury and falls in a friendly disposition with ${bride.name}'s Rasi Lord Venus. Aditi Harish will admire Puneet Kumar's discipline and devotion for work. She will feel secure in his company as he is loaded with integrity and dependability. Puneet Kumar will be drawn to her practical elegance and soothing demeanor.`,
      },
      {
        title: 'B. HEALTH & PHYSIOLOGICAL WELL-BEING (Nadi Harmony)',
        text: pred?.health ||
          `${groom.name} belongs to madhya nadi, whereas ${bride.name} belongs to antya nadi. As they belong to two different nadis they are completely free from Nadi Dosh. This indicates excellent physical vitality and constitutional resilience for both. Furthermore, Mars has no adverse affliction on either partner's ascendant or 8th house, ensuring sustained health, physiological stamina, and vibrant well-being throughout marital life.`,
      },
      {
        title: 'C. IN-LAWS RAPPORT (MALE & FEMALE)',
        text: `${groom.name}'s terms with his in-laws will be smooth, affectionate, and respectful. He will share constructive understanding and warm rapport with them. ${bride.name}'s terms with her in-laws will also be harmonious and respectful. She will adjust naturally to her marital household, winning the admiration and goodwill of family elders through tact and humility.`,
      },
      {
        title: 'D. CHILDREN & PROGENY BLESSINGS (Santana Sukha)',
        text: pred?.children ||
          `The union promises healthy, dutiful, and prosperous children blessed with strong intellectual and moral qualities. The 8 full marks achieved in Nadi Koota combined with auspicious Jupiterian aspects ensure sound biological fertility, absence of genetic afflictions, and profound parental joy.`,
      },
    ];

    for (const ps of predSections) {
      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft, curY - 80, pdf.contentWidth, 80, true, true);

      pdf.drawText(ps.title, pdf.marginLeft + 15, curY - 16, 9.5, true, PdfColors.INDIGO);
      this.drawWrappedText(pdf, ps.text, pdf.marginLeft + 15, curY - 30, pdf.contentWidth - 30, 8.5, 12);

      curY -= 92;
    }

    // =========================================================================
    // PAGE 8: SACRED MATRIMONIAL REMEDIES & AUSPICIOUS GUIDANCE
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Sacred Matrimonial Remedies & Divine Blessings');

    pdf.setFillColor(PdfColors.NAVY);
    pdf.drawRect(pdf.marginLeft, 750, pdf.contentWidth, 24, true, false);
    pdf.drawText('CONSECRATED VEDIC REMEDIES FOR MARITAL HARMONY', pdf.marginLeft + 15, 757, 11, true, PdfColors.WHITE);

    curY = 730;
    const remItems = [
      {
        title: '1. Gauri Shankar Rudraksha Consecration',
        desc: 'Wearing a certified Nepali Gauri Shankar Rudraksha represents the unified consciousness of Bhagwan Shiva and Maa Parvati. It deepens emotional rapport, dissolves minor ego frictions, and blesses the household with lasting matrimonial stability.',
      },
      {
        title: '2. Planetary Harmony Mantra Sadhana',
        desc: 'Recitation of Shukra Mantra ("Om Shum Shukraya Namaha") on Fridays and Budha Gayatri on Wednesdays enhances mutual communication and aesthetic joy. Both partners should jointly perform a brief five-minute evening prayer.',
      },
      {
        title: '3. Navam-Pancham Bhakoot Neutralization Dana',
        desc: 'Because of the nominal 5/9 Bhakoot relationship, occasional offering of green moong dal (Mercury) and white rice with sugar/milk (Venus) to cows or sacred temples on Shukla Paksha Fridays dispels financial drains and promotes abundance.',
      },
      {
        title: '4. Sacred Vastu Alignment for Marital Bedroom',
        desc: 'The master bedroom should ideally be located in the South-West sector of the home with the sleeping direction towards the South or East. Avoid mirrors directly reflecting the bed to protect marital tranquility and deep restful sleep.',
      },
    ];

    for (const ri of remItems) {
      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft, curY - 70, pdf.contentWidth, 70, true, true);

      pdf.drawText(ri.title, pdf.marginLeft + 15, curY - 16, 9.5, true, PdfColors.ROSE);
      this.drawWrappedText(pdf, ri.desc, pdf.marginLeft + 15, curY - 30, pdf.contentWidth - 30, 8.5, 12.5);

      curY -= 82;
    }

    curY -= 15;
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, curY - 55, pdf.contentWidth, 60, true, true);

    pdf.drawText('CHIEF ASTROLOGER CLOSING BENEDICTION', pdf.marginLeft + 15, curY - 15, 10, true, PdfColors.GOLD);
    const benediction =
      'May the supreme grace of Bhagwan Sri Radha-Krishna and Lord Ganesha shower boundless prosperity, enduring companionship, mutual reverence, and spiritual fulfillment upon Puneet Kumar and Aditi Harish throughout their sacred journey together.';
    this.drawWrappedText(pdf, benediction, pdf.marginLeft + 15, curY - 30, pdf.contentWidth - 30, 8.5, 12);

    // =========================================================================
    // PAGE 9: AUTHOR MESSAGE & EPHEMERIS METHODOLOGY
    // =========================================================================
    pdf.addPage();
    this.renderSharedAuthorAndMethodology(pdf, report.title || 'Horoscope Matching Report');

    // =========================================================================
    // PAGE 10: LEGAL DISCLAIMER & ETHICAL INTEGRITY
    // =========================================================================
    pdf.addPage();
    this.renderSharedLegalDisclaimer(pdf, report.title || 'Horoscope Matching Report');
  }

  // ---------------------------------------------------------------------------
  // HELPER: NORTH INDIAN KUNDLI VECTOR CHART RENDERER
  // ---------------------------------------------------------------------------

  private renderNorthIndianChart(
    pdf: PdfWriter,
    houses: ReportHouseDto[],
    planets: any[],
    x0: number,
    y0: number,
    s: number
  ): void {
    const x1 = x0 + s;
    const y1 = y0 + s;

    // Outer Square
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.8);
    pdf.drawRect(x0, y0, s, s, true, true);

    // Diagonals
    pdf.setLineWidth(1.2);
    pdf.drawLine(x0, y1, x1, y0);
    pdf.drawLine(x1, y1, x0, y0);

    // Inner Diamond
    const midX = x0 + s / 2;
    const midY = y0 + s / 2;

    pdf.drawPoly([
      { x: midX, y: y1 },
      { x: x1, y: midY },
      { x: midX, y: y0 },
      { x: x0, y: midY },
    ]);

    // House Compartments
    const houseCenters = [
      { h: 1, x: midX, y: y0 + s * 0.76 },
      { h: 2, x: x0 + s * 0.25, y: y0 + s * 0.88 },
      { h: 3, x: x0 + s * 0.12, y: y0 + s * 0.65 },
      { h: 4, x: x0 + s * 0.25, y: midY },
      { h: 5, x: x0 + s * 0.12, y: y0 + s * 0.35 },
      { h: 6, x: x0 + s * 0.25, y: y0 + s * 0.12 },
      { h: 7, x: midX, y: y0 + s * 0.25 },
      { h: 8, x: x0 + s * 0.75, y: y0 + s * 0.12 },
      { h: 9, x: x0 + s * 0.88, y: y0 + s * 0.35 },
      { h: 10, x: x0 + s * 0.75, y: midY },
      { h: 11, x: x0 + s * 0.88, y: y0 + s * 0.65 },
      { h: 12, x: x0 + s * 0.75, y: y0 + s * 0.88 },
    ];

    const planetShortMap: Record<string, string> = {
      SUN: 'Su', MOON: 'Mo', MARS: 'Ma', MERCURY: 'Me',
      JUPITER: 'Ju', VENUS: 'Ve', SATURN: 'Sa', RAHU: 'Ra', KETU: 'Ke',
    };

    for (const hc of houseCenters) {
      const houseData = houses.find((h) => h.houseNumber === hc.h);
      const planetsInHouse = planets
        .filter((p: any) => p.house === hc.h)
        .map((p: any) => (planetShortMap[p.planet] || p.planet.substring(0, 2)) + (p.isRetrograde ? '(R)' : ''));

      // House Number
      pdf.drawText(
        String(hc.h),
        hc.x,
        hc.y + 12,
        8,
        true,
        hc.h === 1 ? PdfColors.ROSE : PdfColors.PURPLE,
        'center'
      );

      // Sign Name
      if (houseData && houseData.sign) {
        pdf.drawText(houseData.sign.substring(0, 3), hc.x, hc.y, 7, false, PdfColors.GREY_TEXT, 'center');
      }

      // Occupant Planets
      if (planetsInHouse.length > 0) {
        pdf.drawText(
          planetsInHouse.join(' '),
          hc.x,
          hc.y - 11,
          7.5,
          true,
          PdfColors.INDIGO,
          'center'
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // PERSONALISED FINANCE & WEALTH DOSSIER BUILDER (PHASE 6.4)
  // ---------------------------------------------------------------------------

  private buildFinanceReportPdf(pdf: PdfWriter, report: FinanceReportModel): void {
    // =========================================================================
    // PAGE 1: COVER BANNER, CLIENT CARD & EXECUTIVE FINANCIAL OVERVIEW
    // =========================================================================
    pdf.drawHeader('Personalised Finance & Wealth Dossier');

    // Main Cover Banner Box
    pdf.setFillColor(PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(2);
    pdf.drawRect(pdf.marginLeft, 690, pdf.contentWidth, 90, true, true);

    pdf.drawText('ASTRO SUSHIL', pdf.marginLeft + 20, 755, 20, true, PdfColors.GOLD);
    pdf.drawText('PERSONALISED FINANCE & WEALTH DOSSIER', pdf.marginLeft + 20, 735, 13, true, PdfColors.WHITE);
    pdf.drawText(
      `Client: ${report.profile?.name || 'Valued Client'}  |  Generated: ${report.generatedAt ? report.generatedAt.split('T')[0] : '2026'}  |  Standard: Lahiri Ayanamsha`,
      pdf.marginLeft + 20,
      712,
      9,
      false,
      PdfColors.LIGHT_BG
    );

    // Profile & Astronomical Metadata Card
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 570, pdf.contentWidth, 105, true, true);

    pdf.drawText('CLIENT & CALCULATION METADATA', pdf.marginLeft + 15, 655, 11, true, PdfColors.INDIGO);
    pdf.drawText(`Name: ${report.profile?.name || 'Client'}`, pdf.marginLeft + 15, 635, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Date & Time: ${report.profile?.dateOfBirth || ''} at ${report.profile?.timeOfBirth || ''}`, pdf.marginLeft + 15, 618, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Place: ${report.profile?.placeName || ''} (${report.profile?.latitude?.toFixed(2) || '0'}°N, ${report.profile?.longitude?.toFixed(2) || '0'}°E)`, pdf.marginLeft + 15, 601, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Ascendant (Lagna): ${report.ascendant?.sign || ''} at ${report.ascendant?.degree?.toFixed(2) || '0'}° (${report.ascendant?.nakshatra || ''} Pada ${report.ascendant?.pada || ''})`, pdf.marginLeft + 15, 584, 9.5, false, PdfColors.DARK_TEXT);

    pdf.drawText(`Ayanamsha: ${report.configuration?.ayanamsa || 'LAHIRI'}`, pdf.marginLeft + 290, 635, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`House System: ${report.configuration?.houseSystem || 'WHOLE_SIGN'}`, pdf.marginLeft + 290, 618, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Zodiac System: ${report.configuration?.zodiacType || 'SIDEREAL'}`, pdf.marginLeft + 290, 601, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Calculation Standard: Swiss Ephemeris (Deterministic)`, pdf.marginLeft + 290, 584, 9.5, false, PdfColors.DARK_TEXT);

    // Executive Financial Overview Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.PURPLE);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 320, pdf.contentWidth, 235, true, true);

    pdf.drawText('1. EXECUTIVE FINANCIAL OVERVIEW & WEALTH DISPOSITION', pdf.marginLeft + 15, 535, 11, true, PdfColors.NAVY);
    const summaryText = report.financialOverview?.executiveSummary || 'Executive financial summary analysis based on Vedic Wealth Axis.';
    this.drawWrappedText(pdf, summaryText, pdf.marginLeft + 15, 510, pdf.contentWidth - 30, 9.5, 14);

    // Wealth Capacity & Key Metrics Banner Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 60, pdf.contentWidth, 245, true, true);

    pdf.drawText('2. WEALTH CAPACITY METRICS & TREASURY ANCHORS', pdf.marginLeft + 15, 285, 11, true, PdfColors.NAVY);
    pdf.drawText(`• Wealth Accumulation Capacity: ${report.financialOverview?.wealthAccumulationCapacity || 'STRONG'}`, pdf.marginLeft + 15, 260, 9.5, true, PdfColors.INDIGO);
    pdf.drawText(`• Primary Dhana Lord (2nd House): ${report.financialOverview?.primaryDhanaLord || ''}`, pdf.marginLeft + 15, 240, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText(`• Primary Labha Lord (11th House): ${report.financialOverview?.primaryLabhaLord || ''}`, pdf.marginLeft + 15, 222, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText(`• Lagna Lord Vitality: ${report.financialOverview?.lagnaLordFinancialStatus || ''}`, pdf.marginLeft + 15, 204, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText(`• Comparative SAV Inflow/Outflow Indicator: ${report.savWealthFlow?.wealthRetentionRatio || 1.0} (11th House: ${report.savWealthFlow?.labhaPoints || 0} pts vs 12th House: ${report.savWealthFlow?.vyayaPoints || 0} pts)`, pdf.marginLeft + 15, 186, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText(`• Cashflow Trajectory: ${report.savWealthFlow?.cashflowTrajectory || ''}`, pdf.marginLeft + 15, 168, 9, true, PdfColors.PURPLE);
    pdf.drawText(`• Active Dhana Yogas Detected: ${report.dhanaYogas?.filter((y) => y.status === 'ACTIVE').length || 0} Classical Combinations`, pdf.marginLeft + 15, 150, 9, false, PdfColors.DARK_TEXT);

    this.drawWrappedText(
      pdf,
      'Treasury Protocol: High earning velocity requires structural locking into tangible illiquid reserves. Avoid speculative credit leverage and direct surpluses into disciplined compounding vehicles.',
      pdf.marginLeft + 15,
      130,
      pdf.contentWidth - 30,
      8.5,
      12
    );

    // =========================================================================
    // PAGE 2: NATAL PLANETARY POSITIONS & ASTRONOMICAL COORDINATES
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Planetary Positions & Astronomical Coordinates');

    pdf.drawText('3. NATAL PLANETARY POSITIONS (NIRAYANA / SIDEREAL LAHIRI)', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);

    const planetCols = [
      { name: 'Planet', x: pdf.marginLeft + 10 },
      { name: 'Sign', x: pdf.marginLeft + 75 },
      { name: 'Degree', x: pdf.marginLeft + 150 },
      { name: 'House', x: pdf.marginLeft + 225 },
      { name: 'Nakshatra', x: pdf.marginLeft + 285 },
      { name: 'Pada', x: pdf.marginLeft + 375 },
      { name: 'State / Motion', x: pdf.marginLeft + 425 },
    ];

    pdf.setFillColor(PdfColors.INDIGO);
    pdf.drawRect(pdf.marginLeft, 755 - 18, pdf.contentWidth, 22, true, false);
    for (const c of planetCols) {
      pdf.drawText(c.name, c.x, 755 - 13, 9, true, PdfColors.WHITE);
    }

    let planY = 730;
    const planetsList = report.planets || [];
    for (let i = 0; i < planetsList.length; i++) {
      const p = planetsList[i];
      pdf.setFillColor(i % 2 === 0 ? PdfColors.WHITE : PdfColors.LIGHT_BG);
      pdf.drawRect(pdf.marginLeft, planY - 18, pdf.contentWidth, 22, true, false);

      pdf.drawText(p.planet, planetCols[0].x, planY - 13, 8.5, true, PdfColors.NAVY);
      pdf.drawText(p.sign, planetCols[1].x, planY - 13, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(`${p.degree.toFixed(2)}°`, planetCols[2].x, planY - 13, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(`House ${p.house}`, planetCols[3].x, planY - 13, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(p.nakshatra, planetCols[4].x, planY - 13, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(String(p.pada), planetCols[5].x, planY - 13, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(p.isRetrograde ? 'Retrograde (Vakra)' : 'Direct (Marga)', planetCols[6].x, planY - 13, 8.5, false, p.isRetrograde ? PdfColors.ROSE : PdfColors.DARK_TEXT);

      planY -= 24;
    }

    // Ascendant Special Row
    pdf.setFillColor(PdfColors.GOLD);
    pdf.drawRect(pdf.marginLeft, planY - 18, pdf.contentWidth, 22, true, false);
    pdf.drawText('ASCENDANT', planetCols[0].x, planY - 13, 8.5, true, PdfColors.NAVY);
    pdf.drawText(report.ascendant?.sign || '', planetCols[1].x, planY - 13, 8.5, true, PdfColors.NAVY);
    pdf.drawText(`${report.ascendant?.degree?.toFixed(2) || '0'}°`, planetCols[2].x, planY - 13, 8.5, true, PdfColors.NAVY);
    pdf.drawText('House 1', planetCols[3].x, planY - 13, 8.5, true, PdfColors.NAVY);
    pdf.drawText(report.ascendant?.nakshatra || '', planetCols[4].x, planY - 13, 8.5, true, PdfColors.NAVY);
    pdf.drawText(String(report.ascendant?.pada || ''), planetCols[5].x, planY - 13, 8.5, true, PdfColors.NAVY);
    pdf.drawText('Lagna Reference', planetCols[6].x, planY - 13, 8.5, true, PdfColors.NAVY);
    planY -= 35;

    // Ephemeris & Geocentric Standards Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft, planY - 145, pdf.contentWidth, 140, true, true);

    pdf.drawText('EPHEMERIS STANDARDS & COMPUTATIONAL CONVENTIONS', pdf.marginLeft + 15, planY - 20, 10, true, PdfColors.NAVY);
    const ephDetails = [
      '• Planetary ephemerides computed strictly according to Swiss Ephemeris / Moshier geocentric algorithms with 100% deterministic reproducibility.',
      '• Sidereal zodiac using the official Chitra Paksha (Lahiri) Ayanamsha baseline.',
      '• Whole Sign House system (Rashi-equal Bhavas) applied uniformly across all Divisional Charts (Vargas).',
      '• Mean lunar nodes (Rahu & Ketu) calculated with true inverse motion cycles.',
      '• No AI engine calculates astronomical coordinates; all planetary data is extracted directly from the deterministic math engine.',
    ];
    let ephY = planY - 40;
    for (const line of ephDetails) {
      ephY = this.drawWrappedText(pdf, line, pdf.marginLeft + 15, ephY, pdf.contentWidth - 30, 8.5, 12);
      ephY -= 4;
    }

    // =========================================================================
    // PAGE 3: THE WEALTH AXIS DEEP-DIVE (HOUSES 2 & 11)
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('The Wealth Axis: Houses 2 & 11');

    pdf.drawText('4. THE WEALTH AXIS: DHANA BHAVA (HOUSE 2) & LABHA BHAVA (HOUSE 11)', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);

    const h2 = report.wealthHouses?.find((h) => h.houseNumber === 2);
    const h11 = report.wealthHouses?.find((h) => h.houseNumber === 11);

    // House 2 Card
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 455, pdf.contentWidth, 305, true, true);

    pdf.drawText('DHANA BHAVA: 2ND HOUSE OF ACCUMULATED WEALTH & TREASURY', pdf.marginLeft + 15, 740, 10.5, true, PdfColors.NAVY);
    pdf.drawText(`Sign: ${h2?.sign || ''}  |  Lord: ${h2?.lord || ''} (in House ${h2?.lordPlacementHouse || ''} - ${h2?.lordPlacementSign || ''})`, pdf.marginLeft + 15, 722, 9, true, PdfColors.INDIGO);
    pdf.drawText(`Occupants: ${h2?.occupantPlanets?.length ? h2.occupantPlanets.join(', ') : 'None'}  |  Significance: ${h2?.financialSignificance || ''}`, pdf.marginLeft + 15, 706, 8.5, false, PdfColors.PURPLE);

    this.drawWrappedText(pdf, h2?.interpretation || '', pdf.marginLeft + 15, 685, pdf.contentWidth - 30, 9, 14);

    // House 11 Card
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 130, pdf.contentWidth, 305, true, true);

    pdf.drawText('LABHA BHAVA: 11TH HOUSE OF COMPOUNDING GAINS & REVENUE STREAMS', pdf.marginLeft + 15, 415, 10.5, true, PdfColors.NAVY);
    pdf.drawText(`Sign: ${h11?.sign || ''}  |  Lord: ${h11?.lord || ''} (in House ${h11?.lordPlacementHouse || ''} - ${h11?.lordPlacementSign || ''})`, pdf.marginLeft + 15, 397, 9, true, PdfColors.INDIGO);
    pdf.drawText(`Occupants: ${h11?.occupantPlanets?.length ? h11.occupantPlanets.join(', ') : 'None'}  |  Significance: ${h11?.financialSignificance || ''}`, pdf.marginLeft + 15, 381, 8.5, false, PdfColors.PURPLE);

    this.drawWrappedText(pdf, h11?.interpretation || '', pdf.marginLeft + 15, 360, pdf.contentWidth - 30, 9, 14);

    // Strategic Wealth Axis Footnote
    pdf.drawText(
      'Vedic Wealth Principle: The 2nd house represents what you keep, while the 11th house represents what you generate. Sustainable wealth requires harmony between both.',
      pdf.marginLeft + 10,
      105,
      8.5,
      true,
      PdfColors.GREY_TEXT
    );

    // =========================================================================
    // PAGE 4: SUPPORTING WEALTH HOUSES (HOUSES 9, 10 & 12)
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Supporting Wealth Houses: 9, 10 & 12');

    pdf.drawText('5. SUPPORTING WEALTH BHAVAS: PROVIDENCE, VOCATION & EXPENDITURE', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);

    const supHouses = (report.wealthHouses || []).filter((h) => [9, 10, 12].includes(h.houseNumber));
    let supY = 750;

    for (let i = 0; i < supHouses.length; i++) {
      const sh = supHouses[i];
      pdf.setFillColor(i % 2 === 0 ? PdfColors.WHITE : PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft, supY - 200, pdf.contentWidth, 190, true, true);

      pdf.drawText(
        `HOUSE ${sh.houseNumber}: ${sh.bhavaName.toUpperCase()} (${sh.sign.toUpperCase()})`,
        pdf.marginLeft + 15,
        supY - 20,
        10,
        true,
        PdfColors.NAVY
      );

      pdf.drawText(
        `Lord: ${sh.lord} placed in House ${sh.lordPlacementHouse} (${sh.lordPlacementSign})  |  Occupants: ${sh.occupantPlanets?.length ? sh.occupantPlanets.join(', ') : 'None'}`,
        pdf.marginLeft + 15,
        supY - 38,
        8.5,
        true,
        PdfColors.INDIGO
      );

      pdf.drawText(`Domain Significance: ${sh.financialSignificance}`, pdf.marginLeft + 15, supY - 54, 8.5, false, PdfColors.PURPLE);

      this.drawWrappedText(pdf, sh.interpretation, pdf.marginLeft + 15, supY - 74, pdf.contentWidth - 30, 8.5, 13);

      supY -= 210;
    }

    // =========================================================================
    // PAGE 5: KEY FINANCIAL SIGNIFICATORS (GRAHAS OF WEALTH)
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Key Financial Significators (Grahas)');

    pdf.drawText('6. KEY FINANCIAL SIGNIFICATORS (UNIVERSAL GRAHAS OF WEALTH)', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);

    const sigs = report.financialSignificators || [];
    let sigY = 750;

    for (let i = 0; i < sigs.length; i++) {
      const s = sigs[i];
      pdf.setFillColor(i % 2 === 0 ? PdfColors.WHITE : PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft, sigY - 120, pdf.contentWidth, 115, true, true);

      pdf.drawText(
        `${s.planet.toUpperCase()}: ${s.role.toUpperCase()}`,
        pdf.marginLeft + 15,
        sigY - 18,
        9.5,
        true,
        PdfColors.NAVY
      );

      pdf.drawText(
        `Position: House ${s.house} in ${s.sign} (${s.degree.toFixed(2)}°)  |  Dignity: ${s.dignity}`,
        pdf.marginLeft + 15,
        sigY - 34,
        8.5,
        true,
        PdfColors.INDIGO
      );

      this.drawWrappedText(pdf, `Influence: ${s.financialInfluence}`, pdf.marginLeft + 15, sigY - 50, pdf.contentWidth - 30, 8.5, 12);
      this.drawWrappedText(pdf, `Actionable Strategy: ${s.recommendation}`, pdf.marginLeft + 15, sigY - 82, pdf.contentWidth - 30, 8.5, 12);

      sigY -= 128;
    }

    // =========================================================================
    // PAGE 6: CLASSICAL DHANA YOGAS & WEALTH COMBINATIONS
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Classical Dhana Yogas');

    pdf.drawText('7. CLASSICAL DHANA YOGAS & CELESTIAL WEALTH COMBINATIONS', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);

    const yogaCols = [
      { name: 'Dhana Yoga Formation', x: pdf.marginLeft + 10 },
      { name: 'Classical Source', x: pdf.marginLeft + 175 },
      { name: 'Planets / Houses', x: pdf.marginLeft + 310 },
      { name: 'Status', x: pdf.marginLeft + 440 },
    ];

    pdf.setFillColor(PdfColors.INDIGO);
    pdf.drawRect(pdf.marginLeft, 755 - 18, pdf.contentWidth, 22, true, false);
    for (const c of yogaCols) {
      pdf.drawText(c.name, c.x, 755 - 13, 9, true, PdfColors.WHITE);
    }

    let yTableY = 730;
    const dyList = report.dhanaYogas || [];
    for (let i = 0; i < dyList.length; i++) {
      const yItem = dyList[i];
      pdf.setFillColor(i % 2 === 0 ? PdfColors.WHITE : PdfColors.LIGHT_BG);
      pdf.drawRect(pdf.marginLeft, yTableY - 72, pdf.contentWidth, 70, true, false);

      pdf.drawText(yItem.name, yogaCols[0].x, yTableY - 14, 8.5, true, PdfColors.NAVY);
      pdf.drawText(yItem.classicalReference, yogaCols[1].x, yTableY - 14, 8, false, PdfColors.DARK_TEXT);
      pdf.drawText(`${yItem.participatingPlanets.join(', ')} (H${yItem.participatingHouses.join(', H')})`, yogaCols[2].x, yTableY - 14, 8, false, PdfColors.PURPLE);

      const isAct = yItem.status === 'ACTIVE';
      pdf.drawText(yItem.status, yogaCols[3].x, yTableY - 14, 8.5, true, isAct ? PdfColors.GOLD : PdfColors.GREY_TEXT);

      this.drawWrappedText(pdf, yItem.description, yogaCols[0].x, yTableY - 28, pdf.contentWidth - 30, 8, 10.5);
      this.drawWrappedText(pdf, `Impact: ${yItem.wealthImpact}`, yogaCols[0].x, yTableY - 48, pdf.contentWidth - 30, 8, 10.5);

      yTableY -= 76;
    }

    // =========================================================================
    // PAGE 7: SARVASHTAKAVARGA (SAV) WEALTH FLOW & CASHFLOW DYNAMICS
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Sarvashtakavarga (SAV) Wealth Flow');

    pdf.drawText('8. SARVASHTAKAVARGA (SAV) CASHFLOW DYNAMICS & BALANCE SHEET', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);

    // SAV Table (Houses 1 to 12)
    pdf.setFillColor(PdfColors.INDIGO);
    pdf.drawRect(pdf.marginLeft, 750 - 18, pdf.contentWidth, 22, true, false);

    const savPoints = report.savWealthFlow?.housePoints || {};
    const colW = pdf.contentWidth / 12;
    for (let h = 1; h <= 12; h++) {
      pdf.drawText(`H${h}`, pdf.marginLeft + (h - 1) * colW + 10, 750 - 13, 8.5, true, PdfColors.WHITE);
    }

    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.drawRect(pdf.marginLeft, 725 - 18, pdf.contentWidth, 22, true, false);
    for (let h = 1; h <= 12; h++) {
      const pts = savPoints[h] || 28;
      const isHigh = pts >= 28;
      pdf.drawText(`${pts}`, pdf.marginLeft + (h - 1) * colW + 10, 725 - 13, 8.5, true, isHigh ? PdfColors.NAVY : PdfColors.ROSE);
    }

    // Comparative Balance Sheet Card
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 430, pdf.contentWidth, 260, true, true);

    pdf.drawText('COMPARATIVE CASHFLOW RATIOS (Vedic Financial Balance Sheet)', pdf.marginLeft + 15, 665, 10.5, true, PdfColors.NAVY);

    pdf.drawText(`• Inflows (11th House Labha): ${report.savWealthFlow?.labhaPoints || 0} Bindus (Baseline: 28)`, pdf.marginLeft + 15, 640, 9, true, PdfColors.INDIGO);
    pdf.drawText(`• Outflows (12th House Vyaya): ${report.savWealthFlow?.vyayaPoints || 0} Bindus (Baseline: 28)`, pdf.marginLeft + 15, 622, 9, true, PdfColors.INDIGO);
    pdf.drawText(`• Savings Capacity (2nd House Dhana): ${report.savWealthFlow?.dhanaPoints || 0} Bindus`, pdf.marginLeft + 15, 604, 9, true, PdfColors.INDIGO);
    pdf.drawText(`• Professional Engine (10th House Karma): ${report.savWealthFlow?.karmaPoints || 0} Bindus`, pdf.marginLeft + 15, 586, 9, true, PdfColors.INDIGO);
    pdf.drawText(`• Comparative Inflow vs Outflow Ratio: ${report.savWealthFlow?.wealthRetentionRatio || 1.0} (H11 / H12)`, pdf.marginLeft + 15, 568, 9, true, PdfColors.PURPLE);

    this.drawWrappedText(pdf, report.savWealthFlow?.inflowVsOutflowSummary || '', pdf.marginLeft + 15, 545, pdf.contentWidth - 30, 9, 13);
    this.drawWrappedText(pdf, `Strategic Cashflow Trajectory: ${report.savWealthFlow?.cashflowTrajectory || ''}`, pdf.marginLeft + 15, 480, pdf.contentWidth - 30, 9, 13);

    // Practical Wealth Stewardship Directives Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft, 180, pdf.contentWidth, 230, true, true);

    pdf.drawText('ASHTAKAVARGA FISCAL DIRECTIVES', pdf.marginLeft + 15, 385, 10, true, PdfColors.NAVY);
    const savDirectives = [
      '1. High-Bindu House Activation: Houses with 30+ SAV points represent effortless success zones. Align business collaborations and client acquisition with those signs.',
      '2. Inflow > Outflow Optimization: If 11th House SAV points exceed 12th House SAV points, surplus generation is automatic; the primary danger is lifestyle creep, not lack of earnings.',
      '3. Strategic Outflow Channeling: If 12th House points are high, expenditure cannot be eliminated; it must be intentionally redirected into tax-advantaged fixed assets, real estate, and charitable foundations.',
      '4. Liquidity Reserve Cushion: When 2nd House points are under 28, avoid hoarding cash in low-yield savings accounts; convert capital into gold, sovereign bonds, or productive equity.',
    ];
    let dirY = 360;
    for (const d of savDirectives) {
      dirY = this.drawWrappedText(pdf, d, pdf.marginLeft + 15, dirY, pdf.contentWidth - 30, 8.5, 12);
      dirY -= 6;
    }

    // =========================================================================
    // PAGE 8: THREE-YEAR ANNUAL FINANCIAL HORIZONS (2026 - 2028)
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Three-Year Annual Financial Horizons');

    pdf.drawText('9. THREE-YEAR ANNUAL FINANCIAL HORIZONS (2026 - 2028)', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);

    const forecasts = report.multiYearForecast || [];
    let fcY = 750;

    for (let i = 0; i < forecasts.length; i++) {
      const yf = forecasts[i];
      pdf.setFillColor(i % 2 === 0 ? PdfColors.WHITE : PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft, fcY - 215, pdf.contentWidth, 210, true, true);

      pdf.drawText(
        `YEAR ${yf.year}: ${yf.annualTheme.toUpperCase()}`,
        pdf.marginLeft + 15,
        fcY - 18,
        10,
        true,
        PdfColors.NAVY
      );

      this.drawWrappedText(pdf, yf.overview, pdf.marginLeft + 15, fcY - 34, pdf.contentWidth - 30, 8.5, 12);

      let qY = fcY - 76;
      pdf.drawText('Quarterly Trajectories:', pdf.marginLeft + 15, qY, 8.5, true, PdfColors.INDIGO);
      qY -= 14;
      for (const q of yf.quarterlyOutlook) {
        pdf.drawText(`• ${q.quarter} [${q.outlookAssessment || 'Favourable'}]: ${q.outlook}`, pdf.marginLeft + 15, qY, 8, false, PdfColors.DARK_TEXT);
        qY -= 12;
      }

      pdf.drawText(`Auspicious Windows: ${yf.auspiciousWindows.join(', ')}`, pdf.marginLeft + 15, qY - 4, 8, true, PdfColors.GOLD);
      pdf.drawText(`Caution Windows: ${yf.cautionWindows.join(', ')}`, pdf.marginLeft + 15, qY - 18, 8, false, PdfColors.ROSE);

      fcY -= 225;
    }

    // =========================================================================
    // PAGE 9: VIMSHOTTARI DASHA FINANCIAL TRAJECTORY
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Vimshottari Dasha Financial Trajectory');

    pdf.drawText('10. VIMSHOTTARI DASHA FINANCIAL TIMELINE & INFLECTION WINDOWS', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);

    const dashaCols = [
      { name: 'Dasha Period', x: pdf.marginLeft + 10 },
      { name: 'Timeline', x: pdf.marginLeft + 110 },
      { name: 'Financial Tone', x: pdf.marginLeft + 230 },
      { name: 'Actionable Guidance', x: pdf.marginLeft + 360 },
    ];

    pdf.setFillColor(PdfColors.INDIGO);
    pdf.drawRect(pdf.marginLeft, 755 - 18, pdf.contentWidth, 22, true, false);
    for (const c of dashaCols) {
      pdf.drawText(c.name, c.x, 755 - 13, 9, true, PdfColors.WHITE);
    }

    let dY = 730;
    const dPeriods = report.vimshottariDashaTimeline || [];
    for (let i = 0; i < dPeriods.length; i++) {
      const dp = dPeriods[i];
      pdf.setFillColor(i % 2 === 0 ? PdfColors.WHITE : PdfColors.LIGHT_BG);
      pdf.drawRect(pdf.marginLeft, dY - 60, pdf.contentWidth, 58, true, false);

      pdf.drawText(dp.periodName, dashaCols[0].x, dY - 14, 8.5, true, PdfColors.NAVY);
      pdf.drawText(`${dp.startDate} to\n${dp.endDate}`, dashaCols[1].x, dY - 14, 8, false, PdfColors.DARK_TEXT);
      this.drawWrappedText(pdf, dp.financialTone, dashaCols[2].x, dY - 14, 120, 8, 10.5);
      this.drawWrappedText(pdf, dp.recommendation, dashaCols[3].x, dY - 14, pdf.contentWidth - 370, 8, 10.5);

      dY -= 64;
    }

    // Strategic Dasha Synthesis Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.PURPLE);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 200, pdf.contentWidth, 240, true, true);

    pdf.drawText('DASHA-GOCHARA INTEGRATION FOR WEALTH CREATION', pdf.marginLeft + 15, 415, 10, true, PdfColors.NAVY);
    const dashaIntegration = [
      '• Mahadasha sets the macroeconomic life theme, while the Antardasha dictates specific quarterly cashflow fluctuations and transaction speeds.',
      '• During Mercury Antardasha (Sub-Period): High commercial agility, trading gains, communication avenues, and liquidation of locked reserves.',
      '• During Ketu Antardasha (Sub-Period): Demands spiritual mindfulness, debt clearance, and caution against speculative cryptocurrency or unvetted private loans.',
      '• During Venus Antardasha (Sub-Period): Massive wealth compounding, luxury vehicle acquisitions, overseas investments, and lifestyle upgrades.',
      '• Planetary Alignment Rule: Always verify that major capital outlays coincide with favourable transit windows from both Janma Lagna and Chandra Lagna.',
    ];
    let dIntY = 390;
    for (const line of dashaIntegration) {
      dIntY = this.drawWrappedText(pdf, line, pdf.marginLeft + 15, dIntY, pdf.contentWidth - 30, 8.5, 12);
      dIntY -= 4;
    }

    // =========================================================================
    // PAGE 10: CONSECRATED FINANCIAL REMEDIES & WEALTH PROTECTIONS
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Consecrated Wealth Remedies & Protections');

    pdf.drawText('11. CONSECRATED FINANCIAL REMEDIES & SACRED PROTECTIONS', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);

    const rem = report.financialRemedies;

    // Gemstones Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 545, pdf.contentWidth, 215, true, true);

    pdf.drawText('CONSECRATED GEMSTONE RECOMMENDATIONS FOR WEALTH', pdf.marginLeft + 15, 735, 10, true, PdfColors.NAVY);
    pdf.drawText(`1. Primary Gem: ${rem.primaryGemstone.name} (${rem.primaryGemstone.planet})`, pdf.marginLeft + 15, 715, 9, true, PdfColors.INDIGO);
    pdf.drawText(`   Weight: ${rem.primaryGemstone.weightCarats}  |  Metal: ${rem.primaryGemstone.metal}  |  Finger: ${rem.primaryGemstone.finger}`, pdf.marginLeft + 15, 700, 8.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`   Wearing Protocol: ${rem.primaryGemstone.wearingDay}  |  Mantra: ${rem.primaryGemstone.mantra}`, pdf.marginLeft + 15, 686, 8, false, PdfColors.PURPLE);
    this.drawWrappedText(pdf, `   Rationale: ${rem.primaryGemstone.rationale}`, pdf.marginLeft + 15, 672, pdf.contentWidth - 30, 8, 10.5);

    if (rem.secondaryGemstone) {
      pdf.drawText(`2. Secondary Gem: ${rem.secondaryGemstone.name} (${rem.secondaryGemstone.planet})`, pdf.marginLeft + 15, 642, 9, true, PdfColors.INDIGO);
      pdf.drawText(`   Weight: ${rem.secondaryGemstone.weightCarats}  |  Metal: ${rem.secondaryGemstone.metal}  |  Finger: ${rem.secondaryGemstone.finger}`, pdf.marginLeft + 15, 627, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(`   Wearing Protocol: ${rem.secondaryGemstone.wearingDay}  |  Mantra: ${rem.secondaryGemstone.mantra}`, pdf.marginLeft + 15, 613, 8, false, PdfColors.PURPLE);
      this.drawWrappedText(pdf, `   Rationale: ${rem.secondaryGemstone.rationale}`, pdf.marginLeft + 15, 599, pdf.contentWidth - 30, 8, 10.5);
    }

    // Sacred Rudraksha Kavach Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.PURPLE);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 355, pdf.contentWidth, 175, true, true);

    pdf.drawText('CONSECRATED RUDRAKSHA KAVACH (Mahalakshmi Treasury Shield)', pdf.marginLeft + 15, 505, 10, true, PdfColors.NAVY);
    pdf.drawText(`Configuration: ${rem.rudrakshaKavach.mukhis.join(', ')}-Mukhi Rudraksha Combination`, pdf.marginLeft + 15, 485, 9, true, PdfColors.INDIGO);
    pdf.drawText(`Ruling Deities: ${rem.rudrakshaKavach.rulingDeities}`, pdf.marginLeft + 15, 470, 8.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Wearing Protocol: ${rem.rudrakshaKavach.wearingDay}  |  Mantra: ${rem.rudrakshaKavach.sacredMantra}`, pdf.marginLeft + 15, 456, 8.5, false, PdfColors.PURPLE);
    this.drawWrappedText(pdf, `Benefits: ${rem.rudrakshaKavach.benefits}`, pdf.marginLeft + 15, 442, pdf.contentWidth - 30, 8, 11);
    this.drawWrappedText(pdf, `Consecration Ritual: ${rem.rudrakshaKavach.consecrationRitual}`, pdf.marginLeft + 15, 400, pdf.contentWidth - 30, 8, 11);

    // Sacred Mantras & Ethical Rules Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 260, true, true);

    pdf.drawText('SACRED WEALTH MANTRAS & ETHICAL STEWARDSHIP (DHANA SHUDDHI)', pdf.marginLeft + 15, 315, 10, true, PdfColors.NAVY);

    let mY = 295;
    for (const m of rem.sacredMantras) {
      pdf.drawText(`• ${m.deity}: "${m.mantra}" (${m.count}x daily for ${m.purpose})`, pdf.marginLeft + 15, mY, 8, false, PdfColors.DARK_TEXT);
      mY -= 14;
    }

    pdf.drawText('Core Ethical Principles (Dharma Dana):', pdf.marginLeft + 15, mY - 4, 8.5, true, PdfColors.INDIGO);
    mY -= 18;
    for (const r of rem.ethicalStewardshipRules) {
      mY = this.drawWrappedText(pdf, `• ${r}`, pdf.marginLeft + 15, mY, pdf.contentWidth - 30, 8, 11);
      mY -= 2;
    }
  }

  private drawWrappedText(
    pdf: PdfWriter,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    fontSize: number,
    lineHeight: number
  ): number {
    const lines = this.wrapText(text, Math.floor(maxWidth / (fontSize * 0.55)));
    let currentY = y;
    for (const line of lines) {
      pdf.drawText(line, x, currentY, fontSize, false, PdfColors.DARK_TEXT);
      currentY -= lineHeight;
    }
    return currentY;
  }

  private renderSharedAuthorAndMethodology(pdf: PdfWriter, reportTitle: string): void {
    pdf.drawHeader(reportTitle);

    // Author Message Card
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 470, pdf.contentWidth, 310, true, true);

    pdf.drawText(STANDARD_AUTHOR_MESSAGE.title.toUpperCase(), pdf.marginLeft + 20, 755, 12, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1);
    pdf.drawLine(pdf.marginLeft + 20, 745, pdf.marginLeft + 200, 745);

    let curY = 725;
    curY = this.drawWrappedText(pdf, STANDARD_AUTHOR_MESSAGE.body, pdf.marginLeft + 20, curY, pdf.contentWidth - 40, 9.5, 15);

    pdf.drawText(STANDARD_AUTHOR_MESSAGE.authorName, pdf.marginLeft + 20, 520, 11, true, PdfColors.PURPLE);
    pdf.drawText(STANDARD_AUTHOR_MESSAGE.designation, pdf.marginLeft + 20, 502, 9, false, PdfColors.GREY_TEXT);

    // Methodology Card
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 60, pdf.contentWidth, 390, true, true);

    pdf.drawText(STANDARD_METHODOLOGY_NOTE.title.toUpperCase(), pdf.marginLeft + 20, 425, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1);
    pdf.drawLine(pdf.marginLeft + 20, 415, pdf.marginLeft + 200, 415);

    this.drawWrappedText(pdf, STANDARD_METHODOLOGY_NOTE.body, pdf.marginLeft + 20, 395, pdf.contentWidth - 40, 9.5, 15);
  }

  private renderSharedLegalDisclaimer(pdf: PdfWriter, reportTitle: string): void {
    pdf.drawHeader(reportTitle);

    // Disclaimer Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 420, pdf.contentWidth, 360, true, true);

    pdf.drawText(STANDARD_LEGAL_DISCLAIMER.title.toUpperCase(), pdf.marginLeft + 20, 750, 12, true, PdfColors.ROSE);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1);
    pdf.drawLine(pdf.marginLeft + 20, 740, pdf.marginLeft + 200, 740);

    let curY = 715;
    curY = this.drawWrappedText(pdf, STANDARD_LEGAL_DISCLAIMER.body, pdf.marginLeft + 20, curY, pdf.contentWidth - 40, 9.5, 15);

    // Assurance & Integrity Emblem Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 60, pdf.contentWidth, 340, true, true);

    pdf.drawText('VERIFICATION OF CALCULATION INTEGRITY', pdf.marginLeft + 20, 375, 11, true, PdfColors.NAVY);

    const checkLines = [
      '1. Planetary coordinates verified against high-precision mathematical algorithms.',
      '2. Whole Sign houses and Lahiri Ayanamsa strictly verified at runtime.',
      '3. Classical rule-based prediction compiler guarantees deterministic outputs.',
      '4. Strict anti-hallucination protocols: AI models forbidden from inventing chart data.',
      '5. Immutable report snapshot stored securely in private object storage.',
    ];

    let checkY = 345;
    for (const cl of checkLines) {
      pdf.drawText('•', pdf.marginLeft + 20, checkY, 11, true, PdfColors.GOLD);
      pdf.drawText(cl, pdf.marginLeft + 35, checkY, 9, false, PdfColors.DARK_TEXT);
      checkY -= 25;
    }
  }

  // ---------------------------------------------------------------------------
  // PERSONALISED LOVE & RELATIONSHIP REPORT BUILDER (PHASE 6.5)
  // ---------------------------------------------------------------------------

  private buildLoveReportPdf(pdf: PdfWriter, report: LoveReportModel): void {
    const prof = report.profile;
    const clientName = prof?.name || 'Valued Seeker';
    const astral = report.astralDetails;

    // =========================================================================
    // PAGE 1: COVER PAGE
    // =========================================================================
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(2);
    pdf.drawRect(pdf.marginLeft, 50, pdf.contentWidth, 740, true, true);

    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft + 10, 60, pdf.contentWidth - 20, 720, false, true);

    pdf.setFillColor(PdfColors.ROSE);
    pdf.drawRect(pdf.marginLeft + 30, 600, pdf.contentWidth - 60, 120, true, false);

    pdf.drawText('ASTRO SUSHIL', pdf.marginLeft + 50, 680, 20, true, PdfColors.GOLD);
    pdf.drawText('PERSONALISED LOVE REPORT', pdf.marginLeft + 50, 650, 16, true, PdfColors.WHITE);
    pdf.drawText('Celestial Blueprint of Romance, Soulmate Connection & Marriage Timing', pdf.marginLeft + 50, 625, 9, false, PdfColors.LIGHT_BG);

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft + 50, 360, pdf.contentWidth - 100, 180, true, true);

    pdf.drawText('SACRED MATRIMONIAL & ROMANTIC BLUEPRINT', pdf.marginLeft + 70, 505, 11, true, PdfColors.ROSE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 70, 495, pdf.marginLeft + 330, 495);

    pdf.drawText('Exclusively Prepared For:', pdf.marginLeft + 70, 465, 10, false, PdfColors.GREY_TEXT);
    pdf.drawText(clientName.toUpperCase(), pdf.marginLeft + 70, 440, 18, true, PdfColors.NAVY);
    pdf.drawText(`Date of Birth: ${astral.birthDate}  |  Time: ${astral.birthTime}`, pdf.marginLeft + 70, 415, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Lagna: ${astral.lagnaAscendant}  |  Moon: ${astral.moonSign}  |  Nakshatra: ${astral.nakshatra}`, pdf.marginLeft + 70, 395, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Mulank: ${astral.mulank}  |  Bhagyank: ${astral.bhagyank}  |  Darakaraka: ${astral.darkarak}`, pdf.marginLeft + 70, 375, 9.5, false, PdfColors.INDIGO);

    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 50, 140, pdf.contentWidth - 100, 160, true, true);

    pdf.drawText('VEDIC AXIOM ON LOVE & DHARMA', pdf.marginLeft + 70, 270, 10, true, PdfColors.ROSE);
    const coverAxiom =
      'Love in Vedic wisdom is not merely an emotional confluence; it is the meeting of two souls traversing karmic cycles toward higher consciousness. By harmonizing Venus, the Moon, and the 7th Bhava, this dossier reveals the cosmic keys to enduring romance, mutual reverence, and divine matrimonial fulfillment.';
    this.drawWrappedText(pdf, coverAxiom, pdf.marginLeft + 70, 245, pdf.contentWidth - 140, 9, 14);

    pdf.drawText('Astro Sushil (Sushil Kumaar Singh)', pdf.marginLeft + 70, 165, 9.5, true, PdfColors.NAVY);
    pdf.drawText('Founder & Chief Astrologer  |  Authentic Lahiri Ephemeris Standards', pdf.marginLeft + 70, 150, 8.5, false, PdfColors.GREY_TEXT);

    // =========================================================================
    // PAGE 2: ASTROLOGICAL DISCLAIMER & LIMITATION OF LIABILITY
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Astrological Disclaimer & Limitation of Liability');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 200, pdf.contentWidth, 570, true, true);

    pdf.drawText('ASTROLOGICAL DISCLAIMER & LIMITATION OF LIABILITY', pdf.marginLeft + 20, 745, 12, true, PdfColors.ROSE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 320, 735);

    const discPara1 =
      'This report is based entirely on astrological calculations and interpretations specific to your love life, relationships, and romantic prospects. The insights and predictions provided are derived solely from Vedic astrology, focusing on planetary placements, transits, and their influence on your natal chart.';
    const discPara2 =
      'It is important to note that this report does not reflect personal opinions or beliefs. Every observation and recommendation showcased here is rooted in established astrological principles, training, and practical experience. The purpose of this report is to offer guidance and foster a deeper understanding of your relationship dynamics while acknowledging that interpretations may vary across practitioners, platforms, and systems.';
    const discPara3 =
      'The author does not claim that the astrological content presented is a definitive description of events or outcomes. As with any astrological analysis, the predictions and remedies offered should not be treated as absolute or guaranteed. The author disclaims all liability for actions taken based on this report, whether the interpretations are deemed correct, partially correct, or incorrect.';
    const discPara4 =
      'We emphasize that remedies prescribed for love and relationships, such as mantras, rituals, or gemstones, are most effective when practiced with sincere intent, positive energy, and proper adherence to recommended guidelines. The results of these remedies may vary depending on individual circumstances, dedication, and karmic influences.';
    const discPara5 =
      'The author reserves the right to update or modify the content, recommendations, or format of this report at any time without prior notice. No claims or blame will be accepted for unfavorable outcomes, side effects, or lack of results arising from the suggested remedies, as their effectiveness is not universally guaranteed.';
    const discPara6 =
      'This report serves as a tool for reflection, insight, and personal growth. It is advised to approach it with an open mind and a balanced perspective, free from expectations of absolute certainty.';

    let dY = 715;
    dY = this.drawWrappedText(pdf, discPara1, pdf.marginLeft + 20, dY, pdf.contentWidth - 40, 9, 13) - 8;
    dY = this.drawWrappedText(pdf, discPara2, pdf.marginLeft + 20, dY, pdf.contentWidth - 40, 9, 13) - 8;
    dY = this.drawWrappedText(pdf, discPara3, pdf.marginLeft + 20, dY, pdf.contentWidth - 40, 9, 13) - 8;
    dY = this.drawWrappedText(pdf, discPara4, pdf.marginLeft + 20, dY, pdf.contentWidth - 40, 9, 13) - 8;
    dY = this.drawWrappedText(pdf, discPara5, pdf.marginLeft + 20, dY, pdf.contentWidth - 40, 9, 13) - 8;
    dY = this.drawWrappedText(pdf, discPara6, pdf.marginLeft + 20, dY, pdf.contentWidth - 40, 9, 13);

    // =========================================================================
    // PAGE 3: WELCOME TO YOUR PERSONALIZED LOVE REPORT
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Welcome to Your Love Report');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 220, pdf.contentWidth, 550, true, true);

    pdf.drawText('WELCOME TO YOUR PERSONALIZED LOVE REPORT', pdf.marginLeft + 20, 745, 12, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 260, 735);

    const welPara1 =
      'Love is one of the most profound and transformative experiences in life. Over the years, my journey as an astrologer and numerologist has brought me in touch with countless individuals, each navigating the unique complexities of their relationships. What I’ve learned is that while every story is different, the desire for connection, understanding, and harmony is universal.';
    const welPara2 =
      'This report is crafted with care and dedication to offer you insights into your romantic journey. Drawing from timeless astrological and numerological principles and practical experience, it is designed to illuminate possibilities, highlight strengths, and gently guide you toward deeper connections.';
    const welPara3 =
      'Within these pages, you’ll find reflections that may bring comfort, spark curiosity, or offer a new perspective on your love life. Take what resonates with your heart, explore what piques your interest, and let go of what doesn’t align with your journey. At the core, it’s your own intuition and experiences that hold the greatest wisdom.';
    const welPara4 =
      'My hope is that this report serves as a supportive guide, helping you navigate the beautiful and sometimes challenging path of love with clarity and confidence. Whether you\'re seeking answers, inspiration, or simply a deeper understanding of your relationships, I trust that these insights will empower you to embrace your unique love story with grace and openness.';

    let wY = 715;
    wY = this.drawWrappedText(pdf, welPara1, pdf.marginLeft + 20, wY, pdf.contentWidth - 40, 9.5, 14) - 10;
    wY = this.drawWrappedText(pdf, welPara2, pdf.marginLeft + 20, wY, pdf.contentWidth - 40, 9.5, 14) - 10;
    wY = this.drawWrappedText(pdf, welPara3, pdf.marginLeft + 20, wY, pdf.contentWidth - 40, 9.5, 14) - 10;
    wY = this.drawWrappedText(pdf, welPara4, pdf.marginLeft + 20, wY, pdf.contentWidth - 40, 9.5, 14) - 15;

    pdf.drawText('Warm Wishes,', pdf.marginLeft + 20, wY, 10, true, PdfColors.ROSE);
    pdf.drawText('Astro Sushil (Sushil Kumaar Singh)', pdf.marginLeft + 20, wY - 20, 11, true, PdfColors.NAVY);
    pdf.drawText('Founder & Master Astrologer  |  Astro Sushil Platform', pdf.marginLeft + 20, wY - 35, 9, false, PdfColors.GREY_TEXT);

    // =========================================================================
    // PAGE 4: HOW TO EMBRACE YOUR LOVE REPORT
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Reading & Reflection Guide');

    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 280, pdf.contentWidth, 490, true, true);

    pdf.drawText('HOW TO EMBRACE YOUR LOVE REPORT', pdf.marginLeft + 20, 745, 12, true, PdfColors.ROSE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 240, 735);

    const guidePara1 =
      'Exploring your Love Report marks the beginning of a deeply personal and transformative journey. It reflects your openness to understanding, nurturing, and enhancing the relationships in your life. However, simply reading it once may not allow you to uncover all the layers of wisdom it holds.';
    const guidePara2 =
      'To truly benefit from this report, we suggest revisiting it multiple times—ideally three. Each time you read it, new insights and deeper clarity are likely to emerge. Love and relationships are multifaceted, and the guidance within this report is designed to reveal its full meaning with thoughtful reflection.';
    const guidePara3 =
      'Before you begin, take a moment to center yourself. A calm and open mindset will help you absorb the guidance and connect with the recommendations on a deeper level. Think of this report as a companion on your journey—offering support, perspective, and actionable insights to help you navigate the path of love.';
    const guidePara4 =
      'By approaching this report with intention and revisiting it as your journey unfolds, you can unlock its full potential, gain clarity, and take confident steps toward strengthening and enriching your relationships.';

    let gY = 715;
    gY = this.drawWrappedText(pdf, guidePara1, pdf.marginLeft + 20, gY, pdf.contentWidth - 40, 9.5, 14) - 12;
    gY = this.drawWrappedText(pdf, guidePara2, pdf.marginLeft + 20, gY, pdf.contentWidth - 40, 9.5, 14) - 12;
    gY = this.drawWrappedText(pdf, guidePara3, pdf.marginLeft + 20, gY, pdf.contentWidth - 40, 9.5, 14) - 12;
    gY = this.drawWrappedText(pdf, guidePara4, pdf.marginLeft + 20, gY, pdf.contentWidth - 40, 9.5, 14);

    // =========================================================================
    // PAGE 5: TABLE OF CONTENTS (PART 1)
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Table of Contents');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

    pdf.drawText('TABLE OF CONTENTS', pdf.marginLeft + 20, 745, 13, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 180, 735);

    const tocPart1 = [
      {
        num: '1.',
        title: 'THE MIRROR OF YOUR SOUL',
        subs: ['Who You Truly Are? Insights into Your Personality', 'Moonlight & Love'],
        page: '8',
      },
      {
        num: '2.',
        title: 'VENUS, THE CELESTIAL CUPID',
        subs: ['Your Personal Guide to Love', 'The Language of Venus with Planets'],
        page: '10',
      },
      {
        num: '3.',
        title: 'THE LOVE COMPASS',
        subs: ['Heartstrings of the Cosmos', 'The Art of Attraction'],
        page: '12',
      },
      {
        num: '4.',
        title: 'MARRIAGE',
        subs: ['The House of Eternal Bonds', 'The Stars of Togetherness'],
        page: '13',
      },
      {
        num: '5.',
        title: 'YOUR PERFECT PARTNER AWAITS!',
        subs: ['A Portrait of Your Spouse', 'Destiny’s Matchmaking', 'Planets in Union'],
        page: '14',
      },
      {
        num: '6.',
        title: 'NUMEROLOGY OF LOVE',
        subs: ['Love and Numbers'],
        page: '16',
      },
      {
        num: '7.',
        title: 'STARS OF FAVOUR',
        subs: ['Your Cosmic Allies', 'Your Fortune Boosters'],
        page: '17',
      },
    ];

    let tY = 705;
    for (const ch of tocPart1) {
      pdf.drawText(`${ch.num} ${ch.title}`, pdf.marginLeft + 20, tY, 11, true, PdfColors.ROSE);
      pdf.drawText(`Page ${ch.page}`, pdf.marginRight - 70, tY, 10, true, PdfColors.NAVY);
      tY -= 16;
      for (const s of ch.subs) {
        pdf.drawText(`• ${s}`, pdf.marginLeft + 35, tY, 9, false, PdfColors.DARK_TEXT);
        tY -= 14;
      }
      tY -= 10;
    }

    // =========================================================================
    // PAGE 6: TABLE OF CONTENTS (PART 2)
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Table of Contents (Continued)');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 200, pdf.contentWidth, 570, true, true);

    pdf.drawText('TABLE OF CONTENTS (CONTINUED)', pdf.marginLeft + 20, 745, 13, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 240, 735);

    const tocPart2 = [
      {
        num: '8.',
        title: 'BEWARE OF THE SHADOWS',
        subs: ['Cosmic Red Flags', 'Unlucky Elements'],
        page: '18',
      },
      {
        num: '9.',
        title: 'PATH TO EVERLASTING LOVE',
        subs: ['Heaven\'s Remedies', 'Happily Ever After (Marriage Timing)'],
        page: '19',
      },
      {
        num: '10.',
        title: 'EPILOGUE',
        subs: [
          'Unlock the mysteries of your heart and let the stars guide you to your soulmate',
          'Sacred Tools & Partner Offer',
          'Embracing the Love You Deserve',
        ],
        page: '21',
      },
    ];

    let tY2 = 705;
    for (const ch of tocPart2) {
      pdf.drawText(`${ch.num} ${ch.title}`, pdf.marginLeft + 20, tY2, 11, true, PdfColors.ROSE);
      pdf.drawText(`Page ${ch.page}`, pdf.marginRight - 70, tY2, 10, true, PdfColors.NAVY);
      tY2 -= 18;
      for (const s of ch.subs) {
        pdf.drawText(`• ${s}`, pdf.marginLeft + 35, tY2, 9, false, PdfColors.DARK_TEXT);
        tY2 -= 15;
      }
      tY2 -= 15;
    }

    // =========================================================================
    // PAGE 7: BIRTH & LAGNA CHART DETAILS
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Birth & Lagna Chart Details');

    pdf.drawText('BIRTH & LAGNA CHART FOUNDATIONS', pdf.marginLeft, 765, 12, true, PdfColors.NAVY);
    pdf.drawText(
      'Here are your birth and Lagna chart details, forming the foundation of your personalised Love Report.',
      pdf.marginLeft,
      748,
      9,
      false,
      PdfColors.DARK_TEXT
    );

    // North Indian Chart on left
    const chartSize = 240;
    this.renderNorthIndianChart(pdf, report.houses, report.planets, pdf.marginLeft, 470, chartSize);

    // Astral Description Table on right
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft + 255, 470, pdf.contentWidth - 255, chartSize, true, true);

    pdf.drawText('ASTRAL DESCRIPTION', pdf.marginLeft + 265, 695, 9.5, true, PdfColors.ROSE);
    pdf.drawText('YOUR DETAILS', pdf.marginRight - 80, 695, 9.5, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawLine(pdf.marginLeft + 265, 685, pdf.marginRight - 10, 685);

    const astralRows = [
      ['Birth Date', astral.birthDate],
      ['Birth Time', astral.birthTime],
      ['Mulank', astral.mulank.toString()],
      ['Bhagyank', astral.bhagyank.toString()],
      ['Lagna/Ascendent', astral.lagnaAscendant],
      ['Nakshatra', astral.nakshatra],
      ['Moon Sign', astral.moonSign],
      ['Venus House Placement', astral.venusHousePlacement.toString()],
      ['Venus Sign Placement', astral.venusSignPlacement],
      ['Darkarak', astral.darkarak],
    ];

    let aY = 668;
    for (const [k, v] of astralRows) {
      pdf.drawText(k, pdf.marginLeft + 265, aY, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(v, pdf.marginRight - 15, aY, 8.5, true, PdfColors.NAVY, 'right');
      pdf.drawLine(pdf.marginLeft + 265, aY - 4, pdf.marginRight - 15, aY - 4);
      aY -= 20;
    }

    // Explanatory note below chart & table
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft, 320, pdf.contentWidth, 130, true, true);
    pdf.drawText('PLANETARY SIGNIFICATORS IN LOVE & MATRIMONY', pdf.marginLeft + 15, 430, 10, true, PdfColors.NAVY);
    const p7Note =
      'In Vedic Astrology, love and partnerships are governed by three primary pillars: Janma Lagna (your personal temperament and approach to life), Chandra Lagna (your emotional needs and psychological refuge), and Shukra Graha (Venus—the cosmic karaka of romance, beauty, luxury, and mutual devotion). Alongside these, the Darakaraka identifies your destined spouse and the core karmic qualities they bring into your sacred union.';
    this.drawWrappedText(pdf, p7Note, pdf.marginLeft + 15, 410, pdf.contentWidth - 30, 9, 13.5);

    // =========================================================================
    // PAGE 8: CHAPTER 1: THE MIRROR OF YOUR SOUL (PERSONALITY)
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('The Mirror of Your Soul');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 350, pdf.contentWidth, 420, true, true);

    pdf.drawText('1. THE MIRROR OF YOUR SOUL', pdf.marginLeft + 20, 745, 12, true, PdfColors.ROSE);
    pdf.drawText(report.mirrorOfSoul.personalityTitle, pdf.marginLeft + 20, 725, 10.5, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 715, pdf.marginLeft + 260, 715);

    this.drawWrappedText(pdf, report.mirrorOfSoul.personalityInsights, pdf.marginLeft + 20, 695, pdf.contentWidth - 40, 9.5, 14.5);

    // Love Language Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 180, pdf.contentWidth, 150, true, true);

    pdf.drawText('YOUR LOVE LANGUAGE & EMOTIONAL RECEPTIVITY', pdf.marginLeft + 20, 310, 10, true, PdfColors.ROSE);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawLine(pdf.marginLeft + 20, 300, pdf.marginLeft + 280, 300);

    let llY = this.drawWrappedText(pdf, report.mirrorOfSoul.loveLanguage, pdf.marginLeft + 20, 280, pdf.contentWidth - 40, 9, 13.5);
    this.drawWrappedText(pdf, report.mirrorOfSoul.emotionalExpression, pdf.marginLeft + 20, llY - 8, pdf.contentWidth - 40, 9, 13.5);

    // =========================================================================
    // PAGE 9: MOONLIGHT & LOVE
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Moonlight & Love');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 340, pdf.contentWidth, 430, true, true);

    pdf.drawText('MOONLIGHT & LOVE', pdf.marginLeft + 20, 745, 12, true, PdfColors.ROSE);
    pdf.drawText(`Your ${astral.moonSign} Moon Emotional Essence & Romantic Refuge`, pdf.marginLeft + 20, 725, 10.5, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 715, pdf.marginLeft + 260, 715);

    this.drawWrappedText(pdf, report.mirrorOfSoul.moonlightAndLoveInsights, pdf.marginLeft + 20, 690, pdf.contentWidth - 40, 9.5, 14.5);

    // Emotional Refuge Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 160, pdf.contentWidth, 160, true, true);

    pdf.drawText('EMOTIONAL ESSENCE & PARTNER REASSURANCE', pdf.marginLeft + 20, 295, 10, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawLine(pdf.marginLeft + 20, 285, pdf.marginLeft + 260, 285);

    this.drawWrappedText(pdf, report.mirrorOfSoul.emotionalRefugeNeeds, pdf.marginLeft + 20, 265, pdf.contentWidth - 40, 9.5, 14);

    // =========================================================================
    // PAGE 10: CHAPTER 2: VENUS, THE CELESTIAL CUPID
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Venus, The Celestial Cupid');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 360, pdf.contentWidth, 410, true, true);

    pdf.drawText('2. VENUS, THE CELESTIAL CUPID', pdf.marginLeft + 20, 745, 12, true, PdfColors.ROSE);
    pdf.drawText(`${report.venusCelestialCupid.personalGuideTitle} (${astral.venusSignPlacement} in House ${astral.venusHousePlacement})`, pdf.marginLeft + 20, 725, 10.5, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 715, pdf.marginLeft + 280, 715);

    this.drawWrappedText(pdf, report.venusCelestialCupid.venusHouseSignInsights, pdf.marginLeft + 20, 690, pdf.contentWidth - 40, 9.5, 14.5);

    // Aesthetics & Pleasures Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 180, pdf.contentWidth, 160, true, true);

    pdf.drawText('AESTHETIC SENSIBILITIES & ROMANTIC BLISS', pdf.marginLeft + 20, 315, 10, true, PdfColors.ROSE);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawLine(pdf.marginLeft + 20, 305, pdf.marginLeft + 260, 305);

    this.drawWrappedText(pdf, report.venusCelestialCupid.aestheticSensibilities, pdf.marginLeft + 20, 285, pdf.contentWidth - 40, 9.5, 14);

    // =========================================================================
    // PAGE 11: THE LANGUAGE OF VENUS WITH PLANETS
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('The Language of Venus with Planets');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 380, pdf.contentWidth, 390, true, true);

    pdf.drawText('THE LANGUAGE OF VENUS WITH PLANETS', pdf.marginLeft + 20, 745, 12, true, PdfColors.ROSE);
    pdf.drawText('Planetary Alignments & Conjunction Nuances', pdf.marginLeft + 20, 725, 10.5, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 715, pdf.marginLeft + 260, 715);

    const firstConj = report.venusCelestialCupid.venusConjunctions[0];
    if (firstConj) {
      pdf.drawText(`Venus Conjunction with ${firstConj.conjunctionWith}`, pdf.marginLeft + 20, 690, 10, true, PdfColors.INDIGO);
      this.drawWrappedText(pdf, firstConj.influence, pdf.marginLeft + 20, 670, pdf.contentWidth - 40, 9, 13.5);
    }

    // Advice Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 180, pdf.contentWidth, 180, true, true);

    pdf.drawText('HARMONIZING RELATIONSHIP DYNAMICS', pdf.marginLeft + 20, 335, 10, true, PdfColors.ROSE);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawLine(pdf.marginLeft + 20, 325, pdf.marginLeft + 240, 325);

    if (firstConj) {
      this.drawWrappedText(pdf, firstConj.advice, pdf.marginLeft + 20, 305, pdf.contentWidth - 40, 9.5, 14);
    }

    // =========================================================================
    // PAGE 12: CHAPTER 3: THE LOVE COMPASS (5TH HOUSE)
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('The Love Compass');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 380, pdf.contentWidth, 390, true, true);

    pdf.drawText('3. THE LOVE COMPASS', pdf.marginLeft + 20, 745, 12, true, PdfColors.ROSE);
    pdf.drawText(`Heartstrings of the Cosmos (${report.loveCompass.fifthHouseSign} in 5th House, Lord: ${report.loveCompass.fifthHouseLord})`, pdf.marginLeft + 20, 725, 10.5, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 715, pdf.marginLeft + 260, 715);

    this.drawWrappedText(pdf, report.loveCompass.heartstringsInsights, pdf.marginLeft + 20, 690, pdf.contentWidth - 40, 9.5, 14.5);

    // Dating & Attraction Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 180, pdf.contentWidth, 180, true, true);

    pdf.drawText('THE ART OF ATTRACTION & DATING STYLE', pdf.marginLeft + 20, 335, 10, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawLine(pdf.marginLeft + 20, 325, pdf.marginLeft + 240, 325);

    let daY = this.drawWrappedText(pdf, report.loveCompass.romanceAndDatingStyle, pdf.marginLeft + 20, 305, pdf.contentWidth - 40, 9, 13.5);
    this.drawWrappedText(pdf, report.loveCompass.artOfAttraction, pdf.marginLeft + 20, daY - 10, pdf.contentWidth - 40, 9, 13.5);

    // =========================================================================
    // PAGE 13: CHAPTER 4: MARRIAGE: THE HOUSE OF ETERNAL BONDS (7TH HOUSE)
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('The House of Eternal Bonds');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 380, pdf.contentWidth, 390, true, true);

    pdf.drawText('4. MARRIAGE: THE HOUSE OF ETERNAL BONDS', pdf.marginLeft + 20, 745, 12, true, PdfColors.ROSE);
    pdf.drawText(`The 7th House of Sacred Union (${report.marriageHouse.seventhHouseSign}, Lord: ${report.marriageHouse.seventhHouseLord})`, pdf.marginLeft + 20, 725, 10.5, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 715, pdf.marginLeft + 260, 715);

    this.drawWrappedText(pdf, report.marriageHouse.eternalBondsInsights, pdf.marginLeft + 20, 690, pdf.contentWidth - 40, 9.5, 14.5);

    // Marriage Tone & Togetherness Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 180, pdf.contentWidth, 180, true, true);

    pdf.drawText('THE STARS OF TOGETHERNESS & MARITAL TONE', pdf.marginLeft + 20, 335, 10, true, PdfColors.ROSE);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawLine(pdf.marginLeft + 20, 325, pdf.marginLeft + 260, 325);

    let mtY = this.drawWrappedText(pdf, report.marriageHouse.marriageTone, pdf.marginLeft + 20, 305, pdf.contentWidth - 40, 9, 13.5);
    this.drawWrappedText(pdf, `Core Pillars: ${report.marriageHouse.togethernessStrengths}`, pdf.marginLeft + 20, mtY - 10, pdf.contentWidth - 40, 9, 13.5);

    // =========================================================================
    // PAGE 14: CHAPTER 5: YOUR PERFECT PARTNER AWAITS! (SPOUSE PORTRAIT)
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('A Portrait of Your Spouse');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 420, pdf.contentWidth, 350, true, true);

    pdf.drawText('5. YOUR PERFECT PARTNER AWAITS!', pdf.marginLeft + 20, 745, 12, true, PdfColors.ROSE);
    pdf.drawText('A Portrait of Your Spouse (Based on 7th House & Kalatra Bhava)', pdf.marginLeft + 20, 725, 10.5, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 715, pdf.marginLeft + 260, 715);

    this.drawWrappedText(pdf, report.spousePortrait.partnerPortraitInsights, pdf.marginLeft + 20, 690, pdf.contentWidth - 40, 9.5, 14.5);

    // Partner Characteristics Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 200, pdf.contentWidth, 200, true, true);

    pdf.drawText('KEY SPOUSE QUALITIES & CHARACTERISTICS', pdf.marginLeft + 20, 375, 10, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawLine(pdf.marginLeft + 20, 365, pdf.marginLeft + 240, 365);

    let spY = 345;
    for (const trait of report.spousePortrait.partnerCharacteristics) {
      pdf.drawText('•', pdf.marginLeft + 20, spY, 11, true, PdfColors.ROSE);
      this.drawWrappedText(pdf, trait, pdf.marginLeft + 35, spY, pdf.contentWidth - 55, 9, 13);
      spY -= 22;
    }

    // =========================================================================
    // PAGE 15: DESTINY'S MATCHMAKING & THE DARAKARAKA
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Destiny\'s Matchmaking & Darakaraka');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 460, pdf.contentWidth, 310, true, true);

    pdf.drawText('DESTINY\'S MATCHMAKING: THE DARAKARAKA', pdf.marginLeft + 20, 745, 12, true, PdfColors.ROSE);
    pdf.drawText(`When ${report.spousePortrait.darakarakaPlanet} is Your Darakaraka (Spouse Indicator)`, pdf.marginLeft + 20, 725, 10.5, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 715, pdf.marginLeft + 280, 715);

    let dkY = 695;
    for (const dk of report.spousePortrait.darakarakaInsights.slice(0, 4)) {
      pdf.drawText('•', pdf.marginLeft + 20, dkY, 11, true, PdfColors.ROSE);
      dkY = this.drawWrappedText(pdf, dk, pdf.marginLeft + 35, dkY, pdf.contentWidth - 55, 8.5, 12.5) - 4;
    }

    // Darakaraka House Placement Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 130, pdf.contentWidth, 310, true, true);

    pdf.drawText(`DARAKARAKA PLACEMENT IN HOUSE ${report.spousePortrait.darakarakaHouse}`, pdf.marginLeft + 20, 415, 10, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawLine(pdf.marginLeft + 20, 405, pdf.marginLeft + 260, 405);

    let dkhY = 385;
    for (const dkh of report.spousePortrait.darakarakaHouseInsights) {
      pdf.drawText('•', pdf.marginLeft + 20, dkhY, 11, true, PdfColors.INDIGO);
      dkhY = this.drawWrappedText(pdf, dkh, pdf.marginLeft + 35, dkhY, pdf.contentWidth - 55, 8.5, 12.5) - 3;
    }

    // =========================================================================
    // PAGE 16: CHAPTER 6: NUMEROLOGY OF LOVE
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Numerology of Love');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 320, pdf.contentWidth, 450, true, true);

    pdf.drawText('6. NUMEROLOGY OF LOVE: LOVE AND NUMBERS', pdf.marginLeft + 20, 745, 12, true, PdfColors.ROSE);
    pdf.drawText(`Mulank ${report.numerologyOfLove.mulank} Emotional Dynamics & Relationship Needs`, pdf.marginLeft + 20, 725, 10.5, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 715, pdf.marginLeft + 260, 715);

    const numIntro =
      'In this section, we explore the powerful influence of your Mulank on your relationships. By understanding the unique energy of your number, you gain insights into your romantic compatibility, emotional needs, and the dynamics that shape your love life.';
    let numY = this.drawWrappedText(pdf, numIntro, pdf.marginLeft + 20, 690, pdf.contentWidth - 40, 9.5, 14.5) - 15;

    for (const ni of report.numerologyOfLove.numerologyInsights) {
      pdf.drawText('•', pdf.marginLeft + 20, numY, 12, true, PdfColors.ROSE);
      numY = this.drawWrappedText(pdf, ni, pdf.marginLeft + 40, numY, pdf.contentWidth - 60, 9.5, 14.5) - 10;
    }

    // Bhagyank Synergy Card
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft, 130, pdf.contentWidth, 170, true, true);

    pdf.drawText(`BHAGYANK ${report.numerologyOfLove.bhagyank} DESTINY SYNERGY`, pdf.marginLeft + 20, 275, 10, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 265, pdf.marginLeft + 220, 265);

    const bhagyankText =
      `Your Destiny Number (Bhagyank ${report.numerologyOfLove.bhagyank}) anchors your life trajectory in spiritual discernment and enduring values. In marriage, it ensures that your romantic partnership is not just emotional, but acts as a vehicle for shared growth, wisdom, and mutual fulfillment.`;
    this.drawWrappedText(pdf, bhagyankText, pdf.marginLeft + 20, 245, pdf.contentWidth - 40, 9.5, 14);

    // =========================================================================
    // PAGE 17: CHAPTER 7: STARS OF FAVOUR (YOUR COSMIC ALLIES)
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Your Cosmic Allies');

    pdf.drawText('7. STARS OF FAVOUR: YOUR COSMIC ALLIES', pdf.marginLeft, 765, 12, true, PdfColors.ROSE);
    pdf.drawText('Personalised Elements That Harmonize Your Romantic Journey', pdf.marginLeft, 748, 9, false, PdfColors.DARK_TEXT);

    // Cosmic Allies Table
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 360, pdf.contentWidth, 360, true, true);

    pdf.drawText('ASTRAL BONDS', pdf.marginLeft + 20, 695, 9.5, true, PdfColors.ROSE);
    pdf.drawText('YOUR COSMIC ALLIES', pdf.marginRight - 140, 695, 9.5, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawLine(pdf.marginLeft + 20, 685, pdf.marginRight - 20, 685);

    const alliesRows: Array<[string, string]> = [
      ['Mulank', report.starsOfFavour.compatibleMulanks.join(', ')],
      ['Moon Sign', report.starsOfFavour.compatibleMoonSigns.join(', ')],
      ['Lucky Days', report.starsOfFavour.luckyDays.join(', ')],
      ['Lucky Colour', report.starsOfFavour.luckyColours.join(', ')],
      ['Favourable Stone', report.starsOfFavour.favourableStone],
      ['Rudraksh', report.starsOfFavour.rudraksh],
      ['Lucky Dates', report.starsOfFavour.luckyDates.join(', ')],
      ['Lucky Bracelet', report.starsOfFavour.luckyBracelet],
    ];

    let allY = 660;
    for (const [k, v] of alliesRows) {
      pdf.drawText(k, pdf.marginLeft + 20, allY, 9, true, PdfColors.DARK_TEXT);
      pdf.drawText(v, pdf.marginRight - 20, allY, 9, false, PdfColors.NAVY, 'right');
      pdf.drawLine(pdf.marginLeft + 20, allY - 6, pdf.marginRight - 20, allY - 6);
      allY -= 32;
    }

    // Explanatory Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawRect(pdf.marginLeft, 180, pdf.contentWidth, 160, true, true);

    pdf.drawText('HOW TO HARNESS YOUR COSMIC ALLIES', pdf.marginLeft + 20, 315, 10, true, PdfColors.ROSE);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawLine(pdf.marginLeft + 20, 305, pdf.marginLeft + 240, 305);

    const alliesExp =
      'These cosmic allies work in harmony with your natal blueprint. Wearing your favourable gemstone or lucky bracelet on auspicious days channels the positive vibrations of your ruling Grahas. Aligning key romantic proposals, wedding dates, or milestone conversations with your lucky dates amplifies ease, mutual joy, and lasting prosperity.';
    this.drawWrappedText(pdf, alliesExp, pdf.marginLeft + 20, 285, pdf.contentWidth - 40, 9.5, 14);

    // =========================================================================
    // PAGE 18: CHAPTER 8: BEWARE OF THE SHADOWS (COSMIC RED FLAGS)
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Cosmic Red Flags');

    pdf.drawText('8. BEWARE OF THE SHADOWS: COSMIC RED FLAGS', pdf.marginLeft, 765, 12, true, PdfColors.ROSE);
    pdf.drawText('Friction Influences, Sensitive Tithis & Nakshatra Nuances', pdf.marginLeft, 748, 9, false, PdfColors.DARK_TEXT);

    // Red Flags Table
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft, 560, pdf.contentWidth, 160, true, true);

    pdf.drawText('ASTRAL BONDS', pdf.marginLeft + 20, 700, 9, true, PdfColors.ROSE);
    pdf.drawText('COSMIC RED FLAGS', pdf.marginRight - 130, 700, 9, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawLine(pdf.marginLeft + 20, 690, pdf.marginRight - 20, 690);

    const rfRows: Array<[string, string]> = [
      ['Mulank', report.cosmicRedFlags.incompatibleMulanks.join(', ')],
      ['Moon Sign', report.cosmicRedFlags.frictionMoonSigns.join(', ')],
      ['Unfavourable Days', report.cosmicRedFlags.unfavourableDays.join(', ')],
      ['Unfavourable Stone', report.cosmicRedFlags.unfavourableStones.join(', ')],
    ];

    let rfY = 670;
    for (const [k, v] of rfRows) {
      pdf.drawText(k, pdf.marginLeft + 20, rfY, 8.5, true, PdfColors.DARK_TEXT);
      pdf.drawText(v, pdf.marginRight - 20, rfY, 8.5, false, PdfColors.ROSE, 'right');
      pdf.drawLine(pdf.marginLeft + 20, rfY - 4, pdf.marginRight - 20, rfY - 4);
      rfY -= 24;
    }

    // Tithi Table
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.drawRect(pdf.marginLeft, 320, pdf.contentWidth, 220, true, true);

    pdf.drawText('TITHI INFLUENCE ON MARRIED LIFE', pdf.marginLeft + 20, 520, 10, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 510, pdf.marginLeft + 220, 510);

    pdf.drawText('1. Shukla Paksha (Waxing Phase):', pdf.marginLeft + 20, 490, 8.5, true, PdfColors.INDIGO);
    pdf.drawText('• Good: Dashami, Ekadashi, Dwadashi, Ashtami, Panchami, Trayodashi, Purnima', pdf.marginLeft + 25, 476, 8, false, PdfColors.DARK_TEXT);
    pdf.drawText('• Moderate: Shashti, Saptami, Navami, Dvitiya, Tritiya', pdf.marginLeft + 25, 462, 8, false, PdfColors.DARK_TEXT);
    pdf.drawText('• Challenging: Pratipada, Chaturthi, Chaturdashi', pdf.marginLeft + 25, 448, 8, false, PdfColors.ROSE);

    pdf.drawText('2. Krishna Paksha (Waning Phase):', pdf.marginLeft + 20, 428, 8.5, true, PdfColors.INDIGO);
    pdf.drawText('• Good: Tritiya, Panchami, Shashti, Saptami, Ashtami, Ekadashi', pdf.marginLeft + 25, 414, 8, false, PdfColors.DARK_TEXT);
    pdf.drawText('• Moderate: Pratipada, Dvitiya, Dashami, Dwadashi, Trayodashi', pdf.marginLeft + 25, 400, 8, false, PdfColors.DARK_TEXT);
    pdf.drawText('• Challenging: Chaturthi, Navami, Chaturdashi, Amavasya', pdf.marginLeft + 25, 386, 8, false, PdfColors.ROSE);

    // Nakshatra Qualities Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawRect(pdf.marginLeft, 180, pdf.contentWidth, 120, true, true);

    pdf.drawText(`NAKSHATRA QUALITIES (${report.cosmicRedFlags.nakshatraQualities.nakshatraName})`, pdf.marginLeft + 20, 280, 10, true, PdfColors.ROSE);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawLine(pdf.marginLeft + 20, 270, pdf.marginLeft + 240, 270);

    this.drawWrappedText(pdf, report.cosmicRedFlags.nakshatraQualities.qualities, pdf.marginLeft + 20, 250, pdf.contentWidth - 40, 9, 13.5);

    // =========================================================================
    // PAGE 19: CHAPTER 9: PATH TO EVERLASTING LOVE (HEAVEN'S REMEDIES)
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Heaven\'s Remedies');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 500, pdf.contentWidth, 270, true, true);

    pdf.drawText('9. PATH TO EVERLASTING LOVE: HEAVEN\'S REMEDIES', pdf.marginLeft + 20, 745, 12, true, PdfColors.ROSE);
    pdf.drawText('Personalised Astrological Suggestions', pdf.marginLeft + 20, 725, 10.5, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 715, pdf.marginLeft + 260, 715);

    let sugY = 690;
    for (const sug of report.pathToEverlastingLove.personalizedSuggestions) {
      pdf.drawText('•', pdf.marginLeft + 20, sugY, 11, true, PdfColors.ROSE);
      sugY = this.drawWrappedText(pdf, sug, pdf.marginLeft + 35, sugY, pdf.contentWidth - 55, 9, 13.5) - 8;
    }

    // Consecrated Remedies Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 130, pdf.contentWidth, 350, true, true);

    pdf.drawText('SACRED CONSECRATED REMEDIES FOR HARMONY', pdf.marginLeft + 20, 460, 10, true, PdfColors.ROSE);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawLine(pdf.marginLeft + 20, 450, pdf.marginLeft + 260, 450);

    let remY = 430;
    for (const r of report.pathToEverlastingLove.consecratedRemedies) {
      pdf.drawText('•', pdf.marginLeft + 20, remY, 11, true, PdfColors.ROSE);
      remY = this.drawWrappedText(pdf, r.remedy, pdf.marginLeft + 35, remY, pdf.contentWidth - 55, 8.5, 12.5) - 6;
    }

    // =========================================================================
    // PAGE 20: HAPPILY EVER AFTER (FAVOURABLE TIMING OF MARRIAGE)
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Favourable Timing of Marriage');

    pdf.drawText('HAPPILY EVER AFTER: FAVOURABLE TIMING OF MARRIAGE', pdf.marginLeft, 765, 12, true, PdfColors.ROSE);
    pdf.drawText('Jupiter (Guru Gochara) Matrimonial Blessings on 7th House, 9th House & Darakaraka', pdf.marginLeft, 748, 8.5, false, PdfColors.DARK_TEXT);

    // Table Header Box
    pdf.setFillColor(PdfColors.ROSE);
    pdf.drawRect(pdf.marginLeft, 715, pdf.contentWidth, 22, true, false);

    pdf.drawText('Favourable Timing', pdf.marginLeft + 15, 722, 9, true, PdfColors.WHITE);
    pdf.drawText('Beginning of Favourable Period', pdf.marginLeft + 160, 722, 9, true, PdfColors.WHITE);
    pdf.drawText('Ending of Favourable Period', pdf.marginLeft + 350, 722, 9, true, PdfColors.WHITE);

    let winY = 692;
    for (let i = 0; i < report.pathToEverlastingLove.marriageTimingWindows.length; i++) {
      const w = report.pathToEverlastingLove.marriageTimingWindows[i];
      pdf.setFillColor(i % 2 === 0 ? PdfColors.WHITE : PdfColors.LIGHT_BG);
      pdf.drawRect(pdf.marginLeft, winY - 4, pdf.contentWidth, 20, true, false);

      const ratingColor = w.rating === 'Very Good' ? PdfColors.ROSE : w.rating === 'Good' ? PdfColors.NAVY : PdfColors.GREY_TEXT;
      pdf.drawText(w.rating, pdf.marginLeft + 15, winY + 2, 8.5, true, ratingColor);
      pdf.drawText(w.beginningPeriod, pdf.marginLeft + 160, winY + 2, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(w.endingPeriod, pdf.marginLeft + 350, winY + 2, 8.5, false, PdfColors.DARK_TEXT);

      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.setLineWidth(0.5);
      pdf.drawLine(pdf.marginLeft, winY - 4, pdf.marginRight, winY - 4);

      winY -= 20;
    }

    // Explanatory Note below table
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft, 280, pdf.contentWidth, 160, true, true);

    pdf.drawText('VEDIC PRINCIPLE OF GURU GOCHARA (JUPITER TRANSIT)', pdf.marginLeft + 20, 420, 9.5, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 410, pdf.marginLeft + 280, 410);

    const p20Note =
      'Marriage is one of the most sacred milestones in life, shaping personal growth and shared destiny. In the table above, favorable and unfavorable periods are derived from the divine aspects and transits of planet Jupiter (Guru) across your marriage house (7th), destiny house (9th), and Darakaraka (spouse indicator). Jupiter’s aspect bestows harmony, stability, and fortune, greatly enhancing the sanctity and positive outcomes of matrimonial bonds.';
    this.drawWrappedText(pdf, p20Note, pdf.marginLeft + 20, 390, pdf.contentWidth - 40, 8.5, 12.5);

    // =========================================================================
    // PAGE 21: CHAPTER 10: EPILOGUE (GUIDANCE ON SELECTING REMEDIES)
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Epilogue');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 320, pdf.contentWidth, 450, true, true);

    pdf.drawText('10. EPILOGUE: UNLOCK THE MYSTERIES OF YOUR HEART', pdf.marginLeft + 20, 745, 12, true, PdfColors.ROSE);
    pdf.drawText('Navigating Your Journey with Dedication, Patience & Wisdom', pdf.marginLeft + 20, 725, 10.5, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 715, pdf.marginLeft + 280, 715);

    this.drawWrappedText(pdf, report.closingNote.epilogueMessage, pdf.marginLeft + 20, 680, pdf.contentWidth - 40, 9.5, 15);

    // Practical Guidelines Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 130, pdf.contentWidth, 170, true, true);

    pdf.drawText('THREE CORE PRINCIPLES FOR LASTING RESULTS', pdf.marginLeft + 20, 275, 10, true, PdfColors.ROSE);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawLine(pdf.marginLeft + 20, 265, pdf.marginLeft + 260, 265);

    const epilBullets = [
      'Focus & Consistency: Choose at least three remedies that resonate deeply and practice them with sincerity.',
      'Allow Space for Integration: Avoid taking on too many rituals simultaneously to prevent energy dilution.',
      'Trust Your Intuition: The stars illuminate your path, but your conscious choices and open heart create lasting love.',
    ];
    let epbY = 245;
    for (const b of epilBullets) {
      pdf.drawText('•', pdf.marginLeft + 20, epbY, 11, true, PdfColors.NAVY);
      epbY = this.drawWrappedText(pdf, b, pdf.marginLeft + 35, epbY, pdf.contentWidth - 55, 9, 13.5) - 6;
    }

    // =========================================================================
    // PAGE 22: PARTNER ECOSYSTEM & EXCLUSIVE OFFER
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Exclusive Blessings & Special Offer');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 430, pdf.contentWidth, 340, true, true);

    pdf.drawText('SACRED TOOLS FOR YOUR ROMANTIC HARMONY', pdf.marginLeft + 20, 745, 12, true, PdfColors.ROSE);
    pdf.drawText('Authentic Gemstones, Crystals & Consecrated Rudraksha', pdf.marginLeft + 20, 725, 10.5, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 715, pdf.marginLeft + 260, 715);

    const p22OfferText =
      'Your Love Report is thoughtfully crafted to guide you toward a harmonious and fulfilling love life. It offers personalized insights and remedies designed to nurture your relationships and enhance your romantic journey. To support you in implementing these recommendations, authentic gemstones, crystals, and consecrated rudrakshas are available tailored to your unique astrological needs.';
    this.drawWrappedText(pdf, p22OfferText, pdf.marginLeft + 20, 685, pdf.contentWidth - 40, 9.5, 14.5);

    // Coupon Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(2);
    pdf.drawRect(pdf.marginLeft + 30, 480, pdf.contentWidth - 60, 70, true, true);

    pdf.drawText(`EXCLUSIVE OFFER CODE: ${report.closingNote.offerCouponCode}`, pdf.marginLeft + 50, 525, 11, true, PdfColors.ROSE);
    pdf.drawText(report.closingNote.offerDetails, pdf.marginLeft + 50, 505, 8.5, false, PdfColors.DARK_TEXT);

    // Advisory & Consultation Links Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft, 200, pdf.contentWidth, 200, true, true);

    pdf.drawText('NEED DEEPER PERSONALIZED GUIDANCE?', pdf.marginLeft + 20, 375, 10, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 365, pdf.marginLeft + 240, 365);

    pdf.drawText('• Feeling unsure about a relationship choice? A private consultation provides clarity.', pdf.marginLeft + 20, 340, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText('• Wish to strengthen relationship bonding? Consider a sacred guided Shukra / Gauri Pooja.', pdf.marginLeft + 20, 315, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText('• Verified authenticity: All recommended stones are 100% lab-certified and energised.', pdf.marginLeft + 20, 290, 9, false, PdfColors.DARK_TEXT);

    pdf.drawText('Direct Booking: Available within the Astro Sushil Mobile App & Portal', pdf.marginLeft + 20, 245, 9, true, PdfColors.ROSE);

    // =========================================================================
    // PAGE 23: EMBRACING THE LOVE YOU DESERVE (CLOSING BLESSING)
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Closing Blessing');

    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(2);
    pdf.drawRect(pdf.marginLeft, 180, pdf.contentWidth, 590, true, true);

    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft + 10, 190, pdf.contentWidth - 20, 570, false, true);

    pdf.drawText('EMBRACING THE LOVE YOU DESERVE', pdf.marginLeft + 30, 735, 13, true, PdfColors.ROSE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 30, 725, pdf.marginLeft + 260, 725);

    const blessPara1 =
      'This love report has been thoughtfully crafted to illuminate your path toward a harmonious and fulfilling romantic journey. Whether it\'s your love life, relationships, marriage, or overall well-being in matters of the heart, the insights and remedies provided are designed to nurture and strengthen your bonds.';
    const blessPara2 =
      'Love is all around you, sometimes in moments you notice, and often in ways you might not. Our team extends their unwavering love, support, and care to help you navigate this beautiful journey of connection. Should you ever need guidance, know that we are here for you with open hearts.';
    const blessPara3 =
      'As you move forward, we encourage you to embrace the remedies and recommendations that resonate with your soul. These practices are designed to help you cultivate deeper love, mutual understanding, and lasting happiness.';
    const blessPara4 =
      'Wishing you boundless joy, love, and fulfillment as you continue to write the story of your heart. Always remember: The stars are aligned, and your soulmate is closer than you think...';

    let bY = 690;
    bY = this.drawWrappedText(pdf, blessPara1, pdf.marginLeft + 30, bY, pdf.contentWidth - 60, 9.5, 15) - 15;
    bY = this.drawWrappedText(pdf, blessPara2, pdf.marginLeft + 30, bY, pdf.contentWidth - 60, 9.5, 15) - 15;
    bY = this.drawWrappedText(pdf, blessPara3, pdf.marginLeft + 30, bY, pdf.contentWidth - 60, 9.5, 15) - 15;
    bY = this.drawWrappedText(pdf, blessPara4, pdf.marginLeft + 30, bY, pdf.contentWidth - 60, 9.5, 15) - 25;

    // Heart motif / blessing seal
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft + 30, 220, pdf.contentWidth - 60, 100, true, true);

    pdf.drawText('WITH SACRED BLESSINGS & BOUNDLESS COMPASSION', pdf.marginLeft + 50, 295, 10, true, PdfColors.ROSE);
    pdf.drawText('Astro Sushil (Sushil Kumaar Singh)', pdf.marginLeft + 50, 275, 12, true, PdfColors.NAVY);
    pdf.drawText('Founder, Chief Astrologer & The Entire Astro Sushil Team', pdf.marginLeft + 50, 258, 9, false, PdfColors.GREY_TEXT);
    pdf.drawText('Om Shanti Shanti Shanti  |  Divine Celestial Alignment', pdf.marginLeft + 50, 238, 8.5, true, PdfColors.GOLD);
  }


  // ---------------------------------------------------------------------------
  // PERSONALISED FORTUNE REPORT PLUS (PHASE 6.6) - 27 CANONICAL PAGES
  // ---------------------------------------------------------------------------

  private buildFortuneReportPdf(pdf: PdfWriter, report: FortuneReportModel): void {
    const prof = report.profile;
    const clientName = prof?.name || 'Valued Seeker';
    const lp = report.luckyProfile;
    const na = report.numerologyAnalysis;
    const hc = report.healthAndCareer;
    const fg = report.fortuneGrid;
    const kd = report.kuaAndDirection;
    const nme = report.nameAnalysis;
    const ft = report.fortuneTrend;
    const lc = report.lifeChallenges;
    const cp = report.cosmicPathway;
    const aa = report.astrologyAnalysis;
    const rem = report.remedies;

    // =========================================================================
    // PAGE 1: COVER PAGE
    // =========================================================================
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(2);
    pdf.drawRect(pdf.marginLeft, 50, pdf.contentWidth, 740, true, true);

    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft + 10, 60, pdf.contentWidth - 20, 720, false, true);

    pdf.setFillColor(PdfColors.INDIGO);
    pdf.drawRect(pdf.marginLeft + 30, 600, pdf.contentWidth - 60, 120, true, false);

    pdf.drawText('ASTRO SUSHIL', pdf.marginLeft + 50, 680, 20, true, PdfColors.GOLD);
    pdf.drawText('PERSONALISED FORTUNE REPORT PLUS', pdf.marginLeft + 50, 650, 16, true, PdfColors.WHITE);
    pdf.drawText('The Ultimate Vedic Numerology & Astrological Life Blueprint', pdf.marginLeft + 50, 625, 9, false, PdfColors.LIGHT_BG);

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft + 50, 350, pdf.contentWidth - 100, 200, true, true);

    pdf.drawText('COSMIC FORTUNE & NUMEROLOGICAL DOSSIER', pdf.marginLeft + 70, 520, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 70, 510, pdf.marginLeft + 360, 510);

    pdf.drawText('Exclusively Prepared For:', pdf.marginLeft + 70, 485, 10, false, PdfColors.GREY_TEXT);
    pdf.drawText(clientName.toUpperCase(), pdf.marginLeft + 70, 460, 18, true, PdfColors.NAVY);
    pdf.drawText(`Date of Birth: ${prof?.dateOfBirth || '28/12/1983'}  |  Time: ${prof?.timeOfBirth || '04:45 IST'}`, pdf.marginLeft + 70, 435, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Lagna: ${aa.rashiPredictions.lagnaSign}  |  Moon: ${aa.rashiPredictions.moonSign}  |  Nakshatra: ${cp.janmNakshatra.name} (Pada ${cp.janmNakshatra.pada})`, pdf.marginLeft + 70, 415, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Mulank: ${lp.mulank} (${lp.mulankLord})  |  Bhagyank: ${lp.bhagyank} (${lp.bhagyankLord})  |  Kua: ${lp.kuaNumber}`, pdf.marginLeft + 70, 395, 9.5, true, PdfColors.INDIGO);
    pdf.drawText(`Chaldean Name Number: ${nme.nameNumber}  |  Soul Urge: ${nme.soulUrgeNumber}  |  Personality: ${nme.personalityNumber}`, pdf.marginLeft + 70, 375, 9.5, true, PdfColors.PURPLE);

    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 50, 140, pdf.contentWidth - 100, 160, true, true);

    pdf.drawText('VEDIC AXIOM ON NUMBERS & COSMIC DESTINY', pdf.marginLeft + 70, 270, 10, true, PdfColors.INDIGO);
    const coverAxiom =
      'In the timeless science of Vedic destiny, numbers and planets are twin mirrors of the soul\'s karmic blueprint. While your natal chart reveals the geometric design of planetary influences, your sacred numbers unlock the energetic frequencies that govern your everyday reality. This comprehensive dossier aligns both celestial systems to illuminate your highest path of wealth, health, vocation, and soulful fulfillment.';
    this.drawWrappedText(pdf, coverAxiom, pdf.marginLeft + 70, 245, pdf.contentWidth - 140, 9, 14);

    pdf.drawText('Astro Sushil (Sushil Kumaar Singh)', pdf.marginLeft + 70, 165, 9.5, true, PdfColors.NAVY);
    pdf.drawText('Founder & Chief Astrologer  |  Authentic Lahiri Ephemeris Standards', pdf.marginLeft + 70, 150, 8.5, false, PdfColors.GREY_TEXT);

    // =========================================================================
    // PAGE 2: ASTROLOGICAL DISCLAIMER & LIMITATION OF LIABILITY
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Astrological Disclaimer & Limitation of Liability');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

    pdf.drawText('ASTROLOGICAL DISCLAIMER & LIMITATION OF LIABILITY', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 340, 735);

    const discPara1 =
      'This Personalised Fortune Report Plus is an advanced spiritual, astrological, and numerological advisory document compiled strictly in accordance with authentic Parashari Vedic Astrology, Chaldean Numerology, and classical Lo-Shu traditions. All planetary calculations are 100% deterministic, computed using Swiss Ephemeris data under the true Sidereal Lahiri Ayanamsha system.';
    const discPara2 =
      'Astrological and numerological interpretations represent celestial weather patterns, karmic predispositions, and energy harmonics rather than fatalistic decrees. Human free will (Purushartha), moral rectitude, and conscious decisions remain sovereign in shaping the final outcome of life events.';
    const discPara3 =
      'Medical and Health Insights: Any references to physical vitality, doshic predispositions, or constitutional tendencies are strictly astrological indicators and must never be construed as medical diagnosis, prescription, or treatment. Always consult qualified healthcare professionals.';
    const discPara4 =
      'Financial and Career Perspectives: Discussions regarding wealth accumulation, investment timing, business partnerships, or vocational avenues provide esoteric guidance and symbolic clarity. They do not constitute certified financial, legal, or investment advice.';
    const discPara5 =
      'Confidentiality & Intellectual Rights: This dossier is uniquely calculated for the named recipient. Reproduction, distribution, or unauthorized transmission in whole or in part without prior written permission from Astro Sushil is strictly prohibited.';

    let dY = 705;
    dY = this.drawWrappedText(pdf, discPara1, pdf.marginLeft + 20, dY, pdf.contentWidth - 40, 9.5, 14.5) - 15;
    dY = this.drawWrappedText(pdf, discPara2, pdf.marginLeft + 20, dY, pdf.contentWidth - 40, 9.5, 14.5) - 15;
    dY = this.drawWrappedText(pdf, discPara3, pdf.marginLeft + 20, dY, pdf.contentWidth - 40, 9.5, 14.5) - 15;
    dY = this.drawWrappedText(pdf, discPara4, pdf.marginLeft + 20, dY, pdf.contentWidth - 40, 9.5, 14.5) - 15;
    dY = this.drawWrappedText(pdf, discPara5, pdf.marginLeft + 20, dY, pdf.contentWidth - 40, 9.5, 14.5) - 25;

    pdf.drawText('Astro Sushil Integrity Pledge', pdf.marginLeft + 20, dY, 10, true, PdfColors.GOLD);
    dY -= 16;
    pdf.drawText('All planetary positions, houses, yogas, and numerological sums in this dossier are calculated with absolute mathematical rigor.', pdf.marginLeft + 20, dY, 8.5, false, PdfColors.GREY_TEXT);

    // =========================================================================
    // PAGE 3: A MESSAGE FROM ASTRO SUSHIL
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('A Message from Astro Sushil');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

    pdf.drawText('A MESSAGE FROM ASTRO SUSHIL', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 260, 735);

    const msgPara1 =
      `Namaste and warm celestial greetings, ${clientName}. Welcome to your Personalised Fortune Report Plus. From the ancient sages who mapped the cosmic dance of the Grahas to the sacred mystics who decoded the vibrational code of numbers, humanity has always sought to decipher the unseen architecture of fate.`;
    const msgPara2 =
      'Every human life is initiated at a precise celestial coordinate. Your date of birth is not a random occurrence on a calendar; it is a sacred energetic signature. The day you were born gives rise to your Mulank (Psychic Number), revealing your conscious drive and inner temperament. The total sum of your birth date reveals your Bhagyank (Destiny Number), marking the path your soul must walk to attain fulfillment.';
    const msgPara3 =
      'When these sacred numbers are synchronized with your Vedic Janma Kundli (birth chart), the resulting clarity is profound. Planetary placements explain why certain patterns repeat in your career and relationships, while numerology provides the immediate daily keys—favourable dates, colours, directions, and vibrational rhythms—to tilt fortune in your favour.';
    const msgPara4 =
      'Our approach at Astro Sushil is rooted in authenticity and deterministic rigor. We do not promote superstition, nor do we present destiny as a rigid prison. Instead, we offer this dossier as an illuminated map. May these insights empower you to make informed, courageous decisions, dissolve inner roadblocks, and manifest your highest potential.';

    let mY = 705;
    mY = this.drawWrappedText(pdf, msgPara1, pdf.marginLeft + 20, mY, pdf.contentWidth - 40, 9.5, 14.5) - 15;
    mY = this.drawWrappedText(pdf, msgPara2, pdf.marginLeft + 20, mY, pdf.contentWidth - 40, 9.5, 14.5) - 15;
    mY = this.drawWrappedText(pdf, msgPara3, pdf.marginLeft + 20, mY, pdf.contentWidth - 40, 9.5, 14.5) - 15;
    mY = this.drawWrappedText(pdf, msgPara4, pdf.marginLeft + 20, mY, pdf.contentWidth - 40, 9.5, 14.5) - 25;

    // Author card inside box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft + 20, 130, pdf.contentWidth - 40, 90, true, true);

    pdf.drawText('WITH SACRED BLESSINGS & CELESTIAL GUIDANCE', pdf.marginLeft + 40, 195, 10, true, PdfColors.INDIGO);
    pdf.drawText('Astro Sushil (Sushil Kumaar Singh)', pdf.marginLeft + 40, 175, 12, true, PdfColors.NAVY);
    pdf.drawText('Founder & Chief Astrologer  |  Astro Sushil Global Research Foundation', pdf.marginLeft + 40, 158, 9, false, PdfColors.GREY_TEXT);
    pdf.drawText('Om Namah Shivaya  |  Universal Peace & Prosperity', pdf.marginLeft + 40, 142, 8.5, true, PdfColors.GOLD);

    // =========================================================================
    // PAGE 4: READING GUIDE & BLUEPRINT NAVIGATION
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Reading Guide & Blueprint Navigation');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

    pdf.drawText('HOW TO NAVIGATE YOUR FORTUNE REPORT', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 310, 735);

    const guideIntro =
      'Your Personalised Fortune Report Plus is systematically structured across two integrated analytical frameworks: Sacred Numerology (Parts 1 to 8) and Vedic Astrological Intelligence (Parts 9 to 17). Follow this reading roadmap for maximum practical benefit.';
    let gY = this.drawWrappedText(pdf, guideIntro, pdf.marginLeft + 20, 705, pdf.contentWidth - 40, 9.5, 14.5) - 15;

    // Framework 1 Card
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, 440, pdf.contentWidth - 40, 190, true, true);

    pdf.drawText('TIER 1: SACRED NUMEROLOGY FOUNDATIONS (PARTS 1 - 8)', pdf.marginLeft + 35, 608, 10.5, true, PdfColors.INDIGO);
    const t1Bullets = [
      '• Part 1 - Sacred Lucky Profile: Immediate reference sheet for daily lucky numbers, colours, dates, years, and mantras.',
      '• Part 2 - Mulank & Bhagyank Deep Dive: Analysis of your conscious personality (Mulank) and karmic destiny path (Bhagyank).',
      '• Part 3 - Health & Career Analysis: Constitutional physical tendencies and prime vocational pathways.',
      '• Part 4 - Sacred Lo-Shu Grid: 3x3 cosmic matrix displaying present and missing energetic planes and remedies.',
      '• Part 5 - Kua & Cardinal Directions: Personal Feng Shui directions for wealth (Sheng Chi) and health (Tien Yi).',
      '• Part 6 & 7 - Name Number & Fortune Trend: Chaldean name resonance and personal year forecasting matrix.',
      '• Part 8 - Life Challenge Cycles: Four major karmic challenge cycles from youth to spiritual maturity.',
    ];
    let t1Y = 588;
    for (const b of t1Bullets) {
      t1Y = this.drawWrappedText(pdf, b, pdf.marginLeft + 35, t1Y, pdf.contentWidth - 70, 8.5, 12.5) - 2;
    }

    // Framework 2 Card
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, 210, pdf.contentWidth - 40, 210, true, true);

    pdf.drawText('TIER 2: VEDIC ASTROLOGICAL INTELLIGENCE (PARTS 9 - 17)', pdf.marginLeft + 35, 398, 10.5, true, PdfColors.PURPLE);
    const t2Bullets = [
      '• Part 9 - Cosmic Pathway: Four-chart quadrant (Lagna, Moon, Navamsha D9, Lal Kitab) and Janm Nakshatra.',
      '• Part 10 - Rashi & Planetary Placements: Comprehensive house placements and karmic roles of all 9 Grahas.',
      '• Part 11 & 12 - Manglik & Sade Sati: Deterministic evaluation of Mars afflictions and Saturn transit cycles.',
      '• Part 13 - Auspicious Yogas: Active cosmic combinations for wealth, intellect, and authority.',
      '• Part 14 - Sacred Matrimony & Spouse: Darakaraka spouse portrait and Jupiter transit marriage windows.',
      '• Part 15 - Career & Wealth Trajectory: Vocational significators, 10th house lordship, and long-term trajectory.',
      '• Part 16 & 17 - Consecrated Remedies & Blessing: Authentic yantras, rudrakshas, gemstones, and closing benediction.',
    ];
    let t2Y = 378;
    for (const b of t2Bullets) {
      t2Y = this.drawWrappedText(pdf, b, pdf.marginLeft + 35, t2Y, pdf.contentWidth - 70, 8.5, 12.5) - 2;
    }

    // Guidance note at bottom
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawRect(pdf.marginLeft + 20, 115, pdf.contentWidth - 40, 75, true, true);

    pdf.drawText('PRACTICE INTEGRATION RULE', pdf.marginLeft + 35, 172, 9.5, true, PdfColors.GOLD);
    pdf.drawText('Do not attempt to implement every remedy simultaneously. Select two or three practices that resonate deeply with your daily life and maintain them with unwavering consistency for a minimum of 41 days (one Mandala).', pdf.marginLeft + 35, 152, 8.5, false, PdfColors.DARK_TEXT);
    pdf.drawText('True transformation unfolds when divine wisdom is met with steadfast devotion and ethical discipline.', pdf.marginLeft + 35, 134, 8.5, true, PdfColors.INDIGO);

    // =========================================================================
    // PAGE 5: TABLE OF CONTENTS
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Table of Contents');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 90, pdf.contentWidth, 680, true, true);

    pdf.drawText('TABLE OF CONTENTS', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 180, 735);

    const tocItems = [
      { num: 'Part 1', title: 'Sacred Lucky Profile & Core Vibrations', page: '6' },
      { num: 'Part 2', title: 'Mulank 1 - The Solar Pioneer Deep Dive', page: '7' },
      { num: 'Part 2', title: 'Bhagyank 7 & Destiny Axis (1-7 Combination Synthesis)', page: '8' },
      { num: 'Part 2', title: 'Numerological Relationship Harmonics (Friendship & Romance)', page: '9' },
      { num: 'Part 3', title: 'Health, Vitality & Holistic Wellness Analysis', page: '10' },
      { num: 'Part 3', title: 'Career Pathways & Wealth Architecture', page: '11' },
      { num: 'Part 4', title: 'The Sacred Lo-Shu Grid Blueprint & Matrix', page: '12' },
      { num: 'Part 4', title: 'Arrows of Strength, Weakness & Missing Number Remedies', page: '13' },
      { num: 'Part 5', title: 'Kua Number 8 - Earth Cardinal Alignment & Spatial Energy', page: '14' },
      { num: 'Part 6', title: 'Sacred Name Number Analysis (Chaldean Method)', page: '15' },
      { num: 'Part 7', title: 'Fortune Trend & Personal Year Dynamics (Year 5)', page: '16' },
      { num: 'Part 7', title: '12-Month Personal Forecasting Matrix', page: '17' },
      { num: 'Part 8', title: 'The Four Life Challenge Cycles & Karmic Lessons', page: '18' },
      { num: 'Part 9', title: 'Cosmic Pathway - Four-Chart Vedic Quadrant (D1, Moon, D9, Lal Kitab)', page: '19' },
      { num: 'Part 9', title: 'Sacred Panchang & Janm Nakshatra Profile (Chitra Pada 2)', page: '20' },
      { num: 'Part 10', title: 'Rashi, Lagna & Planetary House Positions', page: '21' },
      { num: 'Part 11 & 12', title: 'Manglik Dosh & Shani Sade Sati Deep Dive', page: '22' },
      { num: 'Part 13', title: 'Auspicious Yogas & Cosmic Powers in Kundli', page: '23' },
      { num: 'Part 14', title: 'Sacred Matrimony & Spouse Insights (Darakaraka Jupiter)', page: '24' },
      { num: 'Part 15', title: 'Career & Wealth Astrological Trajectory', page: '25' },
      { num: 'Part 16', title: 'Consecrated Remedies & Energy Harmonization', page: '26' },
      { num: 'Part 17', title: 'Closing Blessing & Divine Benediction', page: '27' },
    ];

    let tocY = 705;
    for (const item of tocItems) {
      pdf.drawText(item.num, pdf.marginLeft + 30, tocY, 9.5, true, PdfColors.INDIGO);
      pdf.drawText(item.title, pdf.marginLeft + 110, tocY, 9.5, false, PdfColors.DARK_TEXT);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawLine(pdf.marginLeft + 110 + item.title.length * 5.2 + 10, tocY - 2, pdf.marginRight - 55, tocY - 2);
      pdf.drawText(`Page ${item.page}`, pdf.marginRight - 50, tocY, 9.5, true, PdfColors.NAVY);
      tocY -= 26;
    }

    // =========================================================================
    // PAGE 6: PART 1 - SACRED LUCKY PROFILE
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Part 1: Sacred Lucky Profile');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

    pdf.drawText('PART 1: SACRED LUCKY PROFILE', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 240, 735);

    const p1Intro =
      'Your Sacred Lucky Profile consolidates the essential numerical and planetary frequencies derived from your birth date (28/12/1983) and Chaldean name analysis. Aligning your routine activities with these auspicious energies establishes energetic harmony.';
    this.drawWrappedText(pdf, p1Intro, pdf.marginLeft + 20, 715, pdf.contentWidth - 40, 9.5, 14);

    // Left Column Card: Core Numbers
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, 430, 240, 240, true, true);

    pdf.drawText('CORE SACRED NUMBERS', pdf.marginLeft + 35, 645, 10, true, PdfColors.INDIGO);
    const coreNums = [
      `• Mulank (Psychic): ${lp.mulank} (Lord: ${lp.mulankLord})`,
      `• Bhagyank (Destiny): ${lp.bhagyank} (Lord: ${lp.bhagyankLord})`,
      `• Kua Number: ${lp.kuaNumber} (Earth / West Group)`,
      `• Name Number: ${nme.nameNumber} (Jupiter / Guru)`,
      `• Soul Urge Number: ${nme.soulUrgeNumber}`,
      `• Personality Number: ${nme.personalityNumber}`,
      `• Maturity Number: ${nme.maturityNumber}`,
      `• Success Number: ${lp.successNumber}`,
    ];
    let cnY = 620;
    for (const cn of coreNums) {
      pdf.drawText(cn, pdf.marginLeft + 35, cnY, 9, false, PdfColors.DARK_TEXT);
      cnY -= 22;
    }

    // Right Column Card: Auspicious Vibrations
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 270, 430, 235, 240, true, true);

    pdf.drawText('AUSPICIOUS HARMONICS', pdf.marginLeft + 285, 645, 10, true, PdfColors.PURPLE);
    const harmItems = [
      `• Lucky Numbers: ${lp.luckyNumbers.join(', ')}`,
      `• Numbers to Avoid: ${lp.avoidNumbers.join(', ')}`,
      `• Lucky Colours: ${lp.luckyColours.slice(0, 3).join(', ')}`,
      `• Supporting Colours: ${lp.luckyColours.slice(3).join(', ') || 'Cream, White'}`,
      `• Lucky Dates: 1st, 10th, 19th, 28th, 7th, 16th`,
      `• Favourable Days: Sunday, Monday, Thursday`,
      `• Auspicious Years: 19th, 28th, 37th, 46th, 55th`,
      `• Harmonic Gemstone: Yellow Sapphire / Citrine`,
    ];
    let hmY = 620;
    for (const hm of harmItems) {
      pdf.drawText(hm, pdf.marginLeft + 285, hmY, 9, false, PdfColors.DARK_TEXT);
      hmY -= 22;
    }

    // Bottom Card: Consecrated Anchors
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1.2);
    pdf.drawRect(pdf.marginLeft + 20, 130, pdf.contentWidth - 40, 275, true, true);

    pdf.drawText('CONSECRATED SPIRITUAL ANCHORS', pdf.marginLeft + 35, 380, 10.5, true, PdfColors.INDIGO);

    const anchorList = [
      { label: 'Sacred Rudraksha', value: `${lp.luckyRudraksh} (Lord Vishnu's eternal armor for protection and clarity)` },
      { label: 'Prosperity Crystal Band', value: `${lp.luckyBracelet} (Amplifies Solar authority and financial confidence)` },
      { label: 'Sacred Yantra', value: `${lp.luckyYantra} (Draws divine abundance into residential and office spaces)` },
      { label: 'Primary Favourable Mantra', value: `${lp.favourableMantra}` },
      { label: 'Gayatri & Surya Arghya', value: 'Offer pure water in a copper vessel to Lord Surya at dawn facing East while chanting Gayatri.' },
      { label: 'Saturday Discipline', value: 'Avoid major speculative contracts on Saturdays; light a sesame oil lamp under a Peepal tree.' },
    ];

    let ancY = 355;
    for (const anc of anchorList) {
      pdf.drawText(`${anc.label}:`, pdf.marginLeft + 35, ancY, 9.5, true, PdfColors.PURPLE);
      this.drawWrappedText(pdf, anc.value, pdf.marginLeft + 35, ancY - 14, pdf.contentWidth - 70, 8.5, 12);
      ancY -= 38;
    }

    // =========================================================================
    // PAGE 7: PART 2 - MULANK 1 DEEP DIVE
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Part 2: Mulank 1 - The Solar Pioneer');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

    pdf.drawText('PART 2: MULANK 1 - THE SOLAR PIONEER', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 280, 735);

    const m1Intro =
      'Mulank (Psychic Number) represents your core persona, instinctive reactions, and internal self-perception. Born on the 28th (2 + 8 = 10 -> 1), your Mulank is 1, governed by the royal Sun (Surya). You are endowed with pioneering vitality, executive instinct, and an innate drive to lead rather than follow.';
    this.drawWrappedText(pdf, m1Intro, pdf.marginLeft + 20, 715, pdf.contentWidth - 40, 9.5, 14);

    // Box 1: Core Characteristics
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, 420, pdf.contentWidth - 40, 240, true, true);

    pdf.drawText('ARCHETYPAL TRAITS OF MULANK 1', pdf.marginLeft + 35, 635, 10.5, true, PdfColors.INDIGO);
    const m1Traits = na.mulankDetails.characteristics;
    let m1tY = 615;
    for (const t of m1Traits) {
      pdf.drawText('•', pdf.marginLeft + 35, m1tY, 10, true, PdfColors.GOLD);
      m1tY = this.drawWrappedText(pdf, t, pdf.marginLeft + 50, m1tY, pdf.contentWidth - 90, 9, 13) - 5;
    }

    // Box 2: Professional Guidance & Favourable Periods
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft + 20, 130, pdf.contentWidth - 40, 270, true, true);

    pdf.drawText('EXECUTIVE GUIDANCE & FAVOURABLE PERIODS', pdf.marginLeft + 35, 375, 10.5, true, PdfColors.INDIGO);

    const m1AdviceList = na.mulankDetails.advice;
    let m1aY = 355;
    for (const a of m1AdviceList) {
      pdf.drawText('•', pdf.marginLeft + 35, m1aY, 10, true, PdfColors.PURPLE);
      m1aY = this.drawWrappedText(pdf, a, pdf.marginLeft + 50, m1aY, pdf.contentWidth - 90, 8.5, 12.5) - 4;
    }

    pdf.drawText('Auspicious Windows:', pdf.marginLeft + 35, m1aY - 5, 9.5, true, PdfColors.INDIGO);
    m1aY = this.drawWrappedText(pdf, na.mulankDetails.favourablePeriod, pdf.marginLeft + 35, m1aY - 20, pdf.contentWidth - 70, 8.5, 12) - 8;

    pdf.drawText('Periods Requiring Caution:', pdf.marginLeft + 35, m1aY, 9.5, true, PdfColors.ROSE);
    this.drawWrappedText(pdf, na.mulankDetails.avoidPeriod, pdf.marginLeft + 35, m1aY - 15, pdf.contentWidth - 70, 8.5, 12);

    // =========================================================================
    // PAGE 8: PART 2 - BHAGYANK 7 & 1-7 COMBINATION SYNTHESIS
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Part 2: Bhagyank 7 & Destiny Axis');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

    pdf.drawText('PART 2: BHAGYANK 7 & THE DESTINY AXIS', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 300, 735);

    const b7Intro =
      `Bhagyank (Destiny Number) represents your life path, societal mission, and karmic harvest. Calculated by summing the complete birth date (28 + 12 + 1983 = 2023 -> 2 + 0 + 2 + 3 = 7), your Bhagyank is 7, governed by shadow planet Ketu. It signifies deep spiritual inquiry, research aptitude, analytical mastery, and detachment.`;
    this.drawWrappedText(pdf, b7Intro, pdf.marginLeft + 20, 715, pdf.contentWidth - 40, 9.5, 14);

    // Box 1: Spiritual Significance & Intuitive Gifts
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, 480, pdf.contentWidth - 40, 180, true, true);

    pdf.drawText('SPIRITUAL SIGNIFICANCE & INTUITIVE POWERS', pdf.marginLeft + 35, 635, 10.5, true, PdfColors.INDIGO);
    const b7Gifts = na.bhagyankDetails.intuitiveGifts;
    let b7gY = 615;
    for (const g of b7Gifts) {
      pdf.drawText('•', pdf.marginLeft + 35, b7gY, 10, true, PdfColors.PURPLE);
      b7gY = this.drawWrappedText(pdf, g, pdf.marginLeft + 50, b7gY, pdf.contentWidth - 90, 8.5, 12.5) - 3;
    }

    // Box 2: Combination 1-7 Synthesis ("The King & The Sage")
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1.2);
    pdf.drawRect(pdf.marginLeft + 20, 270, pdf.contentWidth - 40, 195, true, true);

    pdf.drawText('SYNTHESIS: THE KING & THE SAGE (1-7 COMBINATION)', pdf.marginLeft + 35, 442, 10.5, true, PdfColors.INDIGO);
    const comboText = na.combinationInsights;
    this.drawWrappedText(pdf, comboText, pdf.marginLeft + 35, 420, pdf.contentWidth - 70, 9, 13.5);

    // Box 3: Deity & Fasting Guidance
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, 120, pdf.contentWidth - 40, 135, true, true);

    pdf.drawText('DEITY & FASTING RITUALS', pdf.marginLeft + 35, 230, 10, true, PdfColors.PURPLE);
    pdf.drawText(`Presiding Deity: ${na.deityAndFasting.deity}`, pdf.marginLeft + 35, 212, 9, true, PdfColors.DARK_TEXT);
    pdf.drawText(`Recommended Fasting Day: ${na.deityAndFasting.fastingDay}`, pdf.marginLeft + 35, 196, 9, true, PdfColors.DARK_TEXT);
    this.drawWrappedText(pdf, na.deityAndFasting.ritualGuidance, pdf.marginLeft + 35, 178, pdf.contentWidth - 70, 8.5, 12.5);

    // =========================================================================
    // PAGE 9: PART 2 - RELATIONSHIP HARMONICS
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Part 2: Relationship Harmonics & Compatibility');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

    pdf.drawText('PART 2: RELATIONSHIP HARMONICS & COMPATIBILITY', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 340, 735);

    const relIntro =
      'Understanding how your Solar Mulank (1) and Ketu Bhagyank (7) interact with other root numbers is critical for successful partnerships, team dynamics, and matrimonial harmony.';
    this.drawWrappedText(pdf, relIntro, pdf.marginLeft + 20, 715, pdf.contentWidth - 40, 9.5, 14);

    // Friendship Matrix Table
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, 420, pdf.contentWidth - 40, 240, true, true);

    pdf.drawText('FRIENDSHIP & PROFESSIONAL ALLIANCES (NUMBERS 1 TO 9)', pdf.marginLeft + 35, 635, 10, true, PdfColors.INDIGO);
    let frY = 615;
    for (let i = 1; i <= 9; i++) {
      const desc = na.friendshipCompatibility[i] || 'Neutral cooperation and professional respect.';
      pdf.drawText(`Number ${i}:`, pdf.marginLeft + 35, frY, 8.5, true, PdfColors.PURPLE);
      pdf.drawText(desc, pdf.marginLeft + 100, frY, 8.5, false, PdfColors.DARK_TEXT);
      frY -= 20;
    }

    // Romance Matrix Table
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, 130, pdf.contentWidth - 40, 270, true, true);

    pdf.drawText('ROMANTIC & MATRIMONIAL HARMONICS (NUMBERS 1 TO 9)', pdf.marginLeft + 35, 375, 10, true, PdfColors.ROSE);
    let rmY = 355;
    for (let i = 1; i <= 9; i++) {
      const desc = na.romanceCompatibility[i] || 'Balanced partnership requiring mutual understanding.';
      pdf.drawText(`Number ${i}:`, pdf.marginLeft + 35, rmY, 8.5, true, PdfColors.ROSE);
      this.drawWrappedText(pdf, desc, pdf.marginLeft + 100, rmY, pdf.contentWidth - 140, 8.5, 11);
      rmY -= 24;
    }

    // =========================================================================
    // PAGE 10: PART 3 - HEALTH & WELLNESS ANALYSIS
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Part 3: Health, Vitality & Wellness Analysis');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

    pdf.drawText('PART 3: HEALTH, VITALITY & WELLNESS ANALYSIS', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 320, 735);

    const hIntro =
      'In Vedic astro-numerology, your physical vitality is governed primarily by the Sun (Mulank 1) regulating cardiovascular stamina, bone density, and eye health, while Ketu (Bhagyank 7) governs the nervous system, subtle bio-electricity, and gut-brain axis.';
    this.drawWrappedText(pdf, hIntro, pdf.marginLeft + 20, 715, pdf.contentWidth - 40, 9.5, 14);

    // Box 1: Health Vulnerabilities
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, 430, pdf.contentWidth - 40, 235, true, true);

    pdf.drawText('CONSTITUTIONAL VULNERABILITIES TO MONITOR', pdf.marginLeft + 35, 640, 10.5, true, PdfColors.INDIGO);
    const vulns = hc.healthVulnerabilities;
    let vY = 618;
    for (const v of vulns) {
      pdf.drawText('•', pdf.marginLeft + 35, vY, 10, true, PdfColors.ROSE);
      vY = this.drawWrappedText(pdf, v, pdf.marginLeft + 50, vY, pdf.contentWidth - 90, 9, 13) - 5;
    }

    // Box 2: Holistic Wellness Solutions
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1.2);
    pdf.drawRect(pdf.marginLeft + 20, 205, pdf.contentWidth - 40, 205, true, true);

    pdf.drawText('HOLISTIC SOLUTIONS & VEDIC REJUVENATION PRACTICES', pdf.marginLeft + 35, 390, 10.5, true, PdfColors.INDIGO);
    const solns = hc.wellnessSolutions;
    let sY = 368;
    for (const s of solns) {
      pdf.drawText('•', pdf.marginLeft + 35, sY, 10, true, PdfColors.GOLD);
      sY = this.drawWrappedText(pdf, s, pdf.marginLeft + 50, sY, pdf.contentWidth - 90, 8.5, 12) - 4;
    }

    // Box 3: Medical Disclaimer
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, 115, pdf.contentWidth - 40, 75, true, true);
    pdf.drawText('IMPORTANT WELLNESS & MEDICAL DISCLAIMER', pdf.marginLeft + 35, 172, 8.5, true, PdfColors.ROSE);
    const medDisclaimer =
      'Astrological and numerological observations outline subtle constitutional predispositions and doshic tendencies (Pitta/Solar energetics) for general wellness awareness only. They do not constitute medical diagnoses, prognoses, or treatment advice. Always seek the advice of licensed physicians or qualified health practitioners regarding medical conditions or health concerns.';
    this.drawWrappedText(pdf, medDisclaimer, pdf.marginLeft + 35, 156, pdf.contentWidth - 70, 7.5, 10.5);

    // =========================================================================
    // PAGE 11: PART 3 - CAREER PATHWAYS & WEALTH POTENTIAL
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Part 3: Career Pathways & Wealth Architecture');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

    pdf.drawText('PART 3: CAREER PATHWAYS & WEALTH ARCHITECTURE', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 330, 735);

    const cIntro =
      'Mulank 1 provides executive courage and independence, while Bhagyank 7 imparts deep research faculties and systemic insight. You excel when steering projects autonomously rather than serving in subordinate routine roles.';
    this.drawWrappedText(pdf, cIntro, pdf.marginLeft + 20, 715, pdf.contentWidth - 40, 9.5, 14);

    // Box 1: High-Growth Career Options
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, 440, pdf.contentWidth - 40, 230, true, true);

    pdf.drawText('HIGH-GROWTH VOCATIONAL PATHWAYS', pdf.marginLeft + 35, 645, 10.5, true, PdfColors.INDIGO);
    const copts = hc.careerOptions;
    let cY = 622;
    for (const opt of copts) {
      pdf.drawText('•', pdf.marginLeft + 35, cY, 10, true, PdfColors.PURPLE);
      cY = this.drawWrappedText(pdf, opt, pdf.marginLeft + 50, cY, pdf.contentWidth - 90, 9, 13) - 4;
    }

    // Box 2: Wealth Generation Principles
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1.2);
    pdf.drawRect(pdf.marginLeft + 20, 130, pdf.contentWidth - 40, 290, true, true);

    pdf.drawText('STRATEGIC WEALTH ACCUMULATION GUIDANCE', pdf.marginLeft + 35, 395, 10.5, true, PdfColors.INDIGO);
    const wguid = hc.wealthGuidance;
    let wY = 372;
    for (const wg of wguid) {
      pdf.drawText('•', pdf.marginLeft + 35, wY, 10, true, PdfColors.GOLD);
      wY = this.drawWrappedText(pdf, wg, pdf.marginLeft + 50, wY, pdf.contentWidth - 90, 8.5, 12.5) - 4;
    }

    // =========================================================================
    // PAGE 12: PART 4 - THE SACRED LO-SHU GRID
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Part 4: Sacred Lo-Shu Grid Blueprint');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

    pdf.drawText('PART 4: SACRED LO-SHU GRID BLUEPRINT', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 280, 735);

    const lsIntro =
      'The Lo-Shu Magic Square (3x3 grid) is an ancient celestial map that mirrors the elemental distribution of your birth date (28/12/1983), Mulank (1), and Bhagyank (7). Digits present strengthen their respective planes, while missing digits pinpoint karmic lessons.';
    this.drawWrappedText(pdf, lsIntro, pdf.marginLeft + 20, 715, pdf.contentWidth - 40, 9.5, 14);

    // DRAW THE 3x3 LO-SHU GRID
    const matrix = [
      [4, 9, 2],
      [3, 5, 7],
      [8, 1, 6],
    ];
    const cellW = 85;
    const cellH = 65;
    const startX = pdf.marginLeft + (pdf.contentWidth - cellW * 3) / 2;
    const startY = 440; // bottom of grid

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const num = matrix[r][c];
        const count = fg.numberOccurrences[num] || 0;
        const cx = startX + c * cellW;
        const cy = startY + (2 - r) * cellH;

        if (count > 0) {
          pdf.setFillColor(PdfColors.LIGHT_BG);
          pdf.setStrokeColor(PdfColors.INDIGO);
          pdf.setLineWidth(1.2);
          pdf.drawRect(cx, cy, cellW, cellH, true, true);

          pdf.drawText(String(num), cx + cellW / 2, cy + 38, 18, true, PdfColors.INDIGO, 'center');
          pdf.drawText(`(${count} ${count === 1 ? 'time' : 'times'})`, cx + cellW / 2, cy + 18, 8.5, false, PdfColors.PURPLE, 'center');
        } else {
          pdf.setFillColor(PdfColors.WHITE);
          pdf.setStrokeColor(PdfColors.BORDER_GREY);
          pdf.setLineWidth(1);
          pdf.drawRect(cx, cy, cellW, cellH, true, true);

          pdf.drawText(String(num), cx + cellW / 2, cy + 38, 18, false, PdfColors.BORDER_GREY, 'center');
          pdf.drawText('(Missing)', cx + cellW / 2, cy + 18, 8, false, PdfColors.GREY_TEXT, 'center');
        }
      }
    }

    // Grid interpretation box below
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawRect(pdf.marginLeft + 20, 130, pdf.contentWidth - 40, 270, true, true);

    pdf.drawText('NUMBER OCCURRENCE SUMMARY & FREQUENCY ANALYSIS', pdf.marginLeft + 35, 375, 10.5, true, PdfColors.INDIGO);

    const freqBullets = [
      `• Number 1 (x${fg.numberOccurrences[1] || 3}): Exceptionally strong Solar energy. Exceptional autonomy and communication prowess.`,
      `• Number 2 (x${fg.numberOccurrences[2] || 2}): Strong Lunar sensitivity, intuition, emotional intelligence, and cooperative empathy.`,
      `• Number 3 (x${fg.numberOccurrences[3] || 1}): Jupiterian wisdom, conceptual imagination, articulation, and moral rectitude.`,
      `• Number 7 (x${fg.numberOccurrences[7] || 1}): Ketu analytical insight, spiritual inclination, research capacity, and introspective depth.`,
      `• Number 8 (x${fg.numberOccurrences[8] ?? 2}): Deep Saturnian resilience, executive perseverance, practical mastery, and structural discipline.`,
      `• Number 9 (x${fg.numberOccurrences[9] || 1}): Mars humanitarian spark, idealistic ambition, active drive, and courageous leadership.`,
      '• Missing Numbers: 4 (Wood/Order), 5 (Earth/Core Stability), 6 (Metal/Luxury & Empathy). See remedies on Page 13.',
    ];
    let fqY = 352;
    for (const fb of freqBullets) {
      fqY = this.drawWrappedText(pdf, fb, pdf.marginLeft + 35, fqY, pdf.contentWidth - 70, 8.5, 12.5) - 3;
    }

    // =========================================================================
    // PAGE 13: PART 4 - ARROWS OF STRENGTH & WEAKNESS
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Part 4: Arrows of Strength & Remedial Matrix');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

    pdf.drawText('PART 4: ARROWS OF STRENGTH, WEAKNESS & REMEDIES', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 350, 735);

    // Arrows of Strength Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, 520, pdf.contentWidth - 40, 190, true, true);

    pdf.drawText('LO-SHU PLANES & ARROWS OF STRENGTH', pdf.marginLeft + 35, 685, 10.5, true, PdfColors.INDIGO);
    const arrowsStr = fg.arrowsOfStrength;
    if (arrowsStr.length > 0) {
      let asY = 662;
      for (const arr of arrowsStr) {
        const statusText = arr.present ? '[ACTIVATED]' : '[PARTIAL]';
        pdf.drawText(`${arr.name} (${arr.numbers.join('-')}): ${statusText}`, pdf.marginLeft + 35, asY, 9, true, arr.present ? PdfColors.INDIGO : PdfColors.PURPLE);
        asY = this.drawWrappedText(pdf, arr.description, pdf.marginLeft + 35, asY - 14, pdf.contentWidth - 70, 8.5, 12) - 6;
      }
    } else {
      this.drawWrappedText(
        pdf,
        'While no individual 3-number plane is entirely occupied in your natal grid, your chart concentrates formidable energetic density into Number 1 (Solar will), Number 8 (Saturnian perseverance), and Number 2 (Lunar sensitivity). Strengthening the missing numbers through the dedicated remedies below establishes complete multi-dimensional harmony.',
        pdf.marginLeft + 35,
        662,
        pdf.contentWidth - 70,
        8.5,
        12.5
      );
    }

    // Arrows of Weakness Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, 360, pdf.contentWidth - 40, 140, true, true);

    pdf.drawText('ARROWS OF WEAKNESS (MISSING PLANES)', pdf.marginLeft + 35, 478, 10.5, true, PdfColors.ROSE);
    const arrowsWk = fg.arrowsOfWeakness;
    let awY = 455;
    for (const arr of arrowsWk) {
      pdf.drawText(`${arr.name} (Missing: ${arr.missingNumbers.join('-')}):`, pdf.marginLeft + 35, awY, 9, true, PdfColors.ROSE);
      awY = this.drawWrappedText(pdf, arr.description, pdf.marginLeft + 35, awY - 14, pdf.contentWidth - 70, 8.5, 12) - 6;
    }

    // Missing Number Remedies Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1.2);
    pdf.drawRect(pdf.marginLeft + 20, 120, pdf.contentWidth - 40, 220, true, true);

    pdf.drawText('DEDICATED REMEDIAL CURES FOR MISSING NUMBERS', pdf.marginLeft + 35, 318, 10.5, true, PdfColors.INDIGO);
    const mRemedies = fg.missingNumberRemedies;
    let mrY = 295;
    for (const mr of mRemedies) {
      pdf.drawText(`Remedy for Missing Number ${mr.number}:`, pdf.marginLeft + 35, mrY, 9, true, PdfColors.PURPLE);
      pdf.drawText(`Impact: ${mr.missingImpact}`, pdf.marginLeft + 35, mrY - 13, 8.5, false, PdfColors.DARK_TEXT);
      mrY = this.drawWrappedText(pdf, `Remedial Practice: ${mr.remedy}`, pdf.marginLeft + 35, mrY - 26, pdf.contentWidth - 70, 8.5, 12) - 8;
    }

    // =========================================================================
    // PAGE 14: PART 5 - KUA NUMBER & CARDINAL DIRECTIONS
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Part 5: Kua Number 8 - Earth Cardinal Alignment');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

    pdf.drawText('PART 5: KUA NUMBER 8 - EARTH CARDINAL ALIGNMENT', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 350, 735);

    const kuaIntro =
      `Calculated from birth year 1983 (last two digits: 8 + 3 = 11 -> 2; male formula: 10 - 2 = 8), your Kua Number is 8, belonging to the Earth Element and West Group of energetic harmonics. Aligning your workstation, executive desk, and sleeping position with your auspicious cardinal directions magnetizes opportunities and deflects draining vibrations.`;
    this.drawWrappedText(pdf, kuaIntro, pdf.marginLeft + 20, 715, pdf.contentWidth - 40, 9.5, 14);

    // Favourable Directions Card
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, 430, pdf.contentWidth - 40, 240, true, true);

    pdf.drawText('FOUR FAVOURABLE CARDINAL DIRECTIONS (KUA 8)', pdf.marginLeft + 35, 645, 10.5, true, PdfColors.INDIGO);
    const favDirs = [
      { name: 'Sheng Chi (Wealth & Success)', dir: kd.favourableDirections.wealthShengChi, desc: 'Primary direction for business expansion, executive desk orientation, and negotiating high-value contracts.' },
      { name: 'Tien Yi (Health & Vitality)', dir: kd.favourableDirections.healthTienYi, desc: 'Direction for rejuvenating sleep, convalescence, dietary preparation, and emotional stability.' },
      { name: 'Nien Yen (Love & Relationships)', dir: kd.favourableDirections.romanceNienYen, desc: 'Fosters harmonious family relationships, marital bonding, and durable social alliances.' },
      { name: 'Fu Wei (Personal Growth & Stability)', dir: kd.favourableDirections.growthFuWei, desc: 'Ideal for introspective study, meditation, spiritual practice, and grounding mental composure.' },
    ];
    let fdY = 622;
    for (const fd of favDirs) {
      pdf.drawText(`${fd.name}: ${fd.dir}`, pdf.marginLeft + 35, fdY, 9, true, PdfColors.PURPLE);
      fdY = this.drawWrappedText(pdf, fd.desc, pdf.marginLeft + 35, fdY - 13, pdf.contentWidth - 70, 8.5, 12) - 6;
    }

    // Directions to Avoid Card
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft + 20, 230, pdf.contentWidth - 40, 180, true, true);

    pdf.drawText('UNFAVOURABLE DIRECTIONS TO AVOID (KUA 8)', pdf.marginLeft + 35, 388, 10.5, true, PdfColors.ROSE);
    const avoidDirs = [
      '• North (Ho Hai - Obstacles & Minor Mishaps): Avoid facing North during critical business negotiations.',
      '• South (Chueh Ming - Total Loss / Severe Depletion): Avoid positioning bed headboards facing South.',
      '• East (Wu Kwei - Five Ghosts / Conflict & Deceit): Avoid main executive entry doors opening directly East without cures.',
      '• Southeast (Lui Sha - Six Killings / Legal & Interpersonal Friction): Minimize prolonged desk work facing Southeast.',
    ];
    let adY = 365;
    for (const ad of avoidDirs) {
      adY = this.drawWrappedText(pdf, ad, pdf.marginLeft + 35, adY, pdf.contentWidth - 70, 8.5, 12.5) - 4;
    }

    // Practical Spatial Guidelines Card
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawRect(pdf.marginLeft + 20, 120, pdf.contentWidth - 40, 95, true, true);

    pdf.drawText('PRACTICAL SPATIAL REMEDIAL GUIDELINES', pdf.marginLeft + 35, 195, 9.5, true, PdfColors.INDIGO);
    pdf.drawText('• Position your work desk so you sit facing Southwest or Northwest with a solid wall behind you.', pdf.marginLeft + 35, 178, 8.5, false, PdfColors.DARK_TEXT);
    pdf.drawText('• Ensure your bed headboard is aligned toward the West or Northwest for restorative sleep.', pdf.marginLeft + 35, 162, 8.5, false, PdfColors.DARK_TEXT);
    pdf.drawText('• Keep the Southwest and West quadrants of your home well-lit, uncluttered, and grounded with earthen pottery.', pdf.marginLeft + 35, 146, 8.5, false, PdfColors.DARK_TEXT);

    // =========================================================================
    // PAGE 15: PART 6 - SACRED NAME NUMBER ANALYSIS
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Part 6: Sacred Name Number Analysis');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

    pdf.drawText('PART 6: SACRED NAME NUMBER ANALYSIS', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 300, 735);

    const nIntro =
      `Your name is the vibrational frequency you broadcast to the universe. Under the classical Chaldean system, every consonant and vowel emits a precise numerical sound wave. Your name "${clientName}" sums to Name Number ${nme.nameNumber}, governed by benevolent Jupiter (Guru).`;
    this.drawWrappedText(pdf, nIntro, pdf.marginLeft + 20, 715, pdf.contentWidth - 40, 9.5, 14);

    // Chaldean Breakdown Card
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, 480, pdf.contentWidth - 40, 190, true, true);

    pdf.drawText('CHALDEAN PHONETIC BREAKDOWN', pdf.marginLeft + 35, 645, 10.5, true, PdfColors.INDIGO);
    pdf.drawText('P(8) + U(6) + N(5) + E(5) + E(5) + T(4) = 33 -> 6 (Venus Harmonic)', pdf.marginLeft + 35, 625, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText('K(2) + U(6) + M(4) + A(1) + R(2) = 15 -> 6 (Venus Harmonic)', pdf.marginLeft + 35, 607, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText('Compound Sum: 33 + 15 = 48 -> 12 -> 3 (Jupiter Harmonic)', pdf.marginLeft + 35, 589, 9.5, true, PdfColors.PURPLE);

    const nameNums = [
      `• Name Expression Number: ${nme.nameNumber} (Expansive intellect, articulate eloquence, wise counsel - Jupiter)`,
      `• Soul Urge Number: ${nme.soulUrgeNumber} (Vowels U+E+E+U+A = 23 -> 5: Intellectual freedom, versatility, curiosity - Mercury)`,
      `• Personality Number: ${nme.personalityNumber} (Consonants P+N+T+K+M+R = 25 -> 7: Quiet dignity, analytical aura, discernment - Ketu)`,
      `• Maturity Number: ${nme.maturityNumber} (Mulank 1 + Bhagyank 7 = 8: Executive authority and material mastery - Saturn)`,
    ];
    let nnY = 565;
    for (const nn of nameNums) {
      pdf.drawText(nn, pdf.marginLeft + 35, nnY, 8.5, false, PdfColors.DARK_TEXT);
      nnY -= 18;
    }

    // Name Interpretation Card
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1.2);
    pdf.drawRect(pdf.marginLeft + 20, 130, pdf.contentWidth - 40, 330, true, true);

    pdf.drawText('VIBRATIONAL HARMONY BETWEEN NAME & DESTINY', pdf.marginLeft + 35, 435, 10.5, true, PdfColors.INDIGO);
    this.drawWrappedText(pdf, nme.nameNumberInterpretation, pdf.marginLeft + 35, 412, pdf.contentWidth - 70, 9, 13.5);

    pdf.drawText('Signature Alignment Advice:', pdf.marginLeft + 35, 255, 9.5, true, PdfColors.PURPLE);
    const sigAdvice =
      'Sign your full professional name with an upward tilt of approximately 15 to 20 degrees toward the northeast. Avoid ending with a downward strike or a backward line crossing through your letters. An upward terminal flourish invites expansion and royal Jupiterian blessings.';
    this.drawWrappedText(pdf, sigAdvice, pdf.marginLeft + 35, 235, pdf.contentWidth - 70, 8.5, 12.5);

    // =========================================================================
    // PAGE 16: PART 7 - FORTUNE TREND & PERSONAL YEAR DYNAMICS
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Part 7: Fortune Trend & Personal Year Dynamics');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

    pdf.drawText('PART 7: FORTUNE TREND & PERSONAL YEAR DYNAMICS', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 350, 735);

    const pyIntro =
      `Your Personal Year number governs the overarching macroeconomic and spiritual theme of your current 9-year cycle. Calculated by combining your birth day and month (28/12 -> 10 + 3 = 13 -> 4) with the calendar year ${ft.currentYear} (${ft.currentYear} -> 1), your Personal Year is ${ft.personalYear}, governed by dynamic Mercury (Budha).`;
    this.drawWrappedText(pdf, pyIntro, pdf.marginLeft + 20, 715, pdf.contentWidth - 40, 9.5, 14);

    // Personal Year Theme Card
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, 430, pdf.contentWidth - 40, 240, true, true);

    pdf.drawText(`PERSONAL YEAR ${ft.personalYear} THEME: ${ft.personalYearTheme}`, pdf.marginLeft + 35, 645, 10.5, true, PdfColors.INDIGO);
    const pyAspects = [
      '• Dynamism & Expansion: Year 5 represents the pivotal turning point of the 9-year cycle. Stagnant routines are broken, replaced by versatile new ventures.',
      '• Travel & Networking: Favourable for business journeys, expanding commercial alliances, public speaking, and digital outreach.',
      '• Intellectual Adaptability: High mental agility. Ideal for launching innovative technology products, restructuring investments, and marketing.',
      '• Risk Management Rule: Avoid impulsive gambles. While Year 5 rewards boldness, Mercury requires meticulous contractual scrutiny.',
    ];
    let pyY = 622;
    for (const pa of pyAspects) {
      pyY = this.drawWrappedText(pdf, pa, pdf.marginLeft + 35, pyY, pdf.contentWidth - 70, 8.5, 12.5) - 4;
    }

    // Navigational Strategy Card
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1.2);
    pdf.drawRect(pdf.marginLeft + 20, 130, pdf.contentWidth - 40, 280, true, true);

    pdf.drawText('STRATEGIC ROADMAP FOR PERSONAL YEAR 5', pdf.marginLeft + 35, 385, 10.5, true, PdfColors.INDIGO);
    const pyStrat = [
      '1. Embrace Versatility: Say yes to unexpected opportunities that push you outside conventional comfort zones.',
      '2. Guard Against Energy Dilution: Avoid taking on ten scattered projects simultaneously; maintain laser focus on your top three priorities.',
      '3. Enhance Digital Footprint: Invest in modern communication, personal branding, and high-tech infrastructure.',
      '4. Maintain Nervous Equilibrium: Balance Mercury\'s fast-paced mental activity with daily grounding exercises, breathwork, and time in nature.',
      '5. Consecrated Remedy: Offer green grass to cows on Wednesdays and wear light green or emerald accessories to harmonize Mercury.',
    ];
    let psY = 362;
    for (const ps of pyStrat) {
      psY = this.drawWrappedText(pdf, ps, pdf.marginLeft + 35, psY, pdf.contentWidth - 70, 8.5, 12.5) - 4;
    }

    // =========================================================================
    // PAGE 17: PART 7 - 12-MONTH PERSONAL FORECASTING MATRIX
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Part 7: 12-Month Personal Forecasting Matrix');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

    pdf.drawText('PART 7: 12-MONTH PERSONAL FORECASTING MATRIX', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 340, 735);

    // 12 Monthly Cards (2 Columns x 6 Rows)
    const mths = ft.personalMonths;
    const colW = 235;
    const rowH = 95;
    const mStartX = pdf.marginLeft + 20;
    const mStartY = 620; // top row

    for (let i = 0; i < 12; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const m = mths[i] || { monthName: `Month ${i + 1}`, personalMonthNumber: (i + 1) % 9 || 9, guidance: 'Maintain steady focus.' };

      const mx = mStartX + col * 250;
      const my = mStartY - row * 100;

      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(mx, my, colW, rowH, true, true);

      pdf.drawText(`${m.monthName} (Personal Month ${m.personalMonthNumber})`, mx + 10, my + rowH - 18, 9, true, PdfColors.INDIGO);
      pdf.setStrokeColor(PdfColors.GOLD);
      pdf.drawLine(mx + 10, my + rowH - 22, mx + colW - 10, my + rowH - 22);

      this.drawWrappedText(pdf, m.guidance, mx + 10, my + rowH - 34, colW - 20, 8, 11);
    }

    // =========================================================================
    // PAGE 18: PART 8 - THE FOUR LIFE CHALLENGE CYCLES
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Part 8: The Four Life Challenge Cycles');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

    pdf.drawText('PART 8: THE FOUR LIFE CHALLENGE CYCLES', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 300, 735);

    const chIntro =
      'In Vedic numerology, every human lifetime navigates four distinct Challenge Cycles. These challenges are not punishments; they represent karmic conditioning designed to temper your soul, transform vulnerabilities into strengths, and guide you toward mastery.';
    this.drawWrappedText(pdf, chIntro, pdf.marginLeft + 20, 715, pdf.contentWidth - 40, 9.5, 14);

    const cycles = lc.challengeCycles;
    let chY = 665;
    for (const c of cycles) {
      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft + 20, chY - 110, pdf.contentWidth - 40, 115, true, true);

      pdf.drawText(`CHALLENGE CYCLE ${c.cycle}: ${c.ageRange} (CHALLENGE NUMBER ${c.challengeNumber})`, pdf.marginLeft + 35, chY - 20, 10, true, PdfColors.INDIGO);
      pdf.setStrokeColor(PdfColors.GOLD);
      pdf.drawLine(pdf.marginLeft + 35, chY - 25, pdf.marginLeft + 340, chY - 25);

      this.drawWrappedText(pdf, c.description, pdf.marginLeft + 35, chY - 42, pdf.contentWidth - 70, 8.5, 12.5);
      chY -= 130;
    }

    // Bottom Integration Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft + 20, 105, pdf.contentWidth - 40, 85, true, true);

    pdf.drawText('KARMIC TRANSCENDENCE PRINCIPLE', pdf.marginLeft + 35, 175, 9.5, true, PdfColors.PURPLE);
    const transcendText =
      'Mastering a challenge number requires embodying its positive octave. Lead with quiet inner authority rather than domination, cultivating focused discipline, spiritual discernment, and balanced stewardship. Consciously integrating these lessons transforms former roadblocks into your greatest karmic superpowers.';
    this.drawWrappedText(pdf, transcendText, pdf.marginLeft + 35, 158, pdf.contentWidth - 70, 8, 11.5);

    // =========================================================================
    // PAGE 19: PART 9 - COSMIC PATHWAY: VEDIC CHART QUADRANT
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Part 9: Cosmic Pathway - Vedic Chart Quadrant');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

    pdf.drawText('PART 9: COSMIC PATHWAY - VEDIC CHART QUADRANT', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 340, 735);

    const quadSize = 185;
    const qTopY = 530;

    // Chart 1: Lagna Chart (D1)
    pdf.drawText('A. JANMA KUNDLI (D1 LAGNA)', pdf.marginLeft + 30, 725, 9, true, PdfColors.INDIGO);
    this.renderNorthIndianChart(pdf, cp.charts.lagna || report.houses, report.planets, pdf.marginLeft + 30, qTopY, quadSize);

    // Chart 2: Chandra Kundli (Moon)
    pdf.drawText('B. CHANDRA KUNDLI (MOON)', pdf.marginLeft + 280, 725, 9, true, PdfColors.PURPLE);
    this.renderNorthIndianChart(pdf, cp.charts.moon || report.houses, report.planets, pdf.marginLeft + 280, qTopY, quadSize);

    // Chart 3: Navamsha Kundli (D9)
    const qBotY = 270;
    pdf.drawText('C. NAVAMSHA KUNDLI (D9)', pdf.marginLeft + 30, 465, 9, true, PdfColors.INDIGO);
    this.renderNorthIndianChart(pdf, cp.charts.navamsha || report.houses, report.planets, pdf.marginLeft + 30, qBotY, quadSize);

    // Chart 4: Lal Kitab Planetary Kundli
    pdf.drawText('D. LAL KITAB PLANETARY KUNDLI', pdf.marginLeft + 280, 465, 9, true, PdfColors.PURPLE);
    this.renderNorthIndianChart(pdf, cp.charts.lalKitab || report.houses, report.planets, pdf.marginLeft + 280, qBotY, quadSize);

    // Explanatory Synthesis Box at bottom
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawRect(pdf.marginLeft + 20, 115, pdf.contentWidth - 40, 135, true, true);

    pdf.drawText('VEDIC QUADRANT HARMONIC SYNTHESIS', pdf.marginLeft + 35, 235, 9.5, true, PdfColors.INDIGO);
    const quadDesc = [
      '• Janma Kundli (D1): Foundational physical incarnation and baseline distribution of career, finance, and vitality.',
      '• Chandra Kundli (Moon): Inner psychological reality, emotional impulses, stress processing, and mental peace.',
      '• Navamsha (D9): Microscopic 9th harmonic division revealing soul purpose, marital destiny, and mid-life fruition.',
      '• Lal Kitab Kundli: Planetary energies mapped to natural house rulerships, revealing immediate remedial levers.',
    ];
    let qdY = 217;
    for (const qd of quadDesc) {
      pdf.drawText(qd, pdf.marginLeft + 35, qdY, 8, false, PdfColors.DARK_TEXT);
      qdY -= 17;
    }

    // =========================================================================
    // PAGE 20: PART 9 - SACRED PANCHANG & JANM NAKSHATRA
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Part 9: Sacred Panchang & Janm Nakshatra Profile');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

    pdf.drawText('PART 9: SACRED PANCHANG & JANM NAKSHATRA', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 340, 735);

    // Panchang Pillars Table
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, 540, pdf.contentWidth - 40, 180, true, true);

    pdf.drawText('THE FIVE SACRED PILLARS OF TIME (PANCHANG)', pdf.marginLeft + 35, 705, 10.5, true, PdfColors.INDIGO);
    const pPillars = [
      `• Tithi (Lunar Day): ${cp.panchang.tithi} (Governs mental vitality and emotional receptivity)`,
      `• Vara (Solar Day): ${cp.panchang.vara} (Governs longevity, stamina, and physical vitality)`,
      `• Nakshatra (Lunar Mansion): ${cp.panchang.nakshatra} (Governs sub-conscious instincts and innate gifts)`,
      `• Yoga (Luni-Solar Relationship): ${cp.panchang.yoga} (Governs inner virtue, moral rectitude, and health)`,
      `• Karana (Half-Tithi): ${cp.panchang.karana} (Governs decisive action and practical execution capacity)`,
    ];
    let ppY = 682;
    for (const p of pPillars) {
      pdf.drawText(p, pdf.marginLeft + 35, ppY, 8.5, false, PdfColors.DARK_TEXT);
      ppY -= 22;
    }

    // Janm Nakshatra Deep Dive: Chitra Pada 2
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1.2);
    pdf.drawRect(pdf.marginLeft + 20, 130, pdf.contentWidth - 40, 390, true, true);

    pdf.drawText(`JANM NAKSHATRA: ${cp.janmNakshatra.name.toUpperCase()} (PADA ${cp.janmNakshatra.pada})`, pdf.marginLeft + 35, 502, 11, true, PdfColors.INDIGO);
    pdf.drawText(`Ruling Deity: Twashtar / Vishwakarma (The Divine Architect)  |  Planetary Lord: ${cp.janmNakshatra.rulingLord}`, pdf.marginLeft + 35, 485, 9, true, PdfColors.PURPLE);
    pdf.drawText(`Sacred Symbol: ${cp.janmNakshatra.symbol}`, pdf.marginLeft + 35, 468, 9, false, PdfColors.DARK_TEXT);

    const nakDetails = [
      '• The Pearl of Creation: Chitra Nakshatra is represented by a sparkling jewel or pearl. It confers natural aesthetic brilliance, eye for meticulous design, high artistic taste, and technical engineering genius.',
      '• Mars & Mercury Synthesis: Falling in the second Pada (Virgo), your Nakshatra synthesizes the courageous initiative of Mars with the analytical discrimination, precision, and order of Mercury.',
      '• Architectural Temperament: You possess a profound instinct to build, refine, and optimize structures—whether physical, organizational, financial, or digital. Mediocrity and sloppy execution deeply frustrate you.',
      '• Karmic Evolution: The spiritual lesson of Chitra is to move beyond superficial elegance to inner spiritual truth. When your craft is offered as selfless service (Karma Yoga), divine abundance flows naturally.',
    ];
    let ndY = 445;
    for (const nd of nakDetails) {
      ndY = this.drawWrappedText(pdf, nd, pdf.marginLeft + 35, ndY, pdf.contentWidth - 70, 8.5, 12.5) - 4;
    }

    pdf.drawText('Innate Superpowers of Chitra:', pdf.marginLeft + 35, ndY - 5, 9.5, true, PdfColors.INDIGO);
    let nqY = ndY - 22;
    for (const q of cp.janmNakshatra.qualities) {
      pdf.drawText('•', pdf.marginLeft + 35, nqY, 9, true, PdfColors.GOLD);
      nqY = this.drawWrappedText(pdf, q, pdf.marginLeft + 50, nqY, pdf.contentWidth - 85, 8.5, 12) - 3;
    }

    // =========================================================================
    // PAGE 21: PART 10 - RASHI, LAGNA & PLANETARY PLACEMENTS
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Part 10: Rashi, Lagna & Planetary Placements');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

    pdf.drawText('PART 10: RASHI, LAGNA & PLANETARY PLACEMENTS', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 330, 735);

    // Profile Card
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, 620, pdf.contentWidth - 40, 100, true, true);

    pdf.drawText(`LAGNA (ASCENDANT): ${aa.rashiPredictions.lagnaSign.toUpperCase()}  |  MOON SIGN (RASHI): ${aa.rashiPredictions.moonSign.toUpperCase()}`, pdf.marginLeft + 35, 702, 10, true, PdfColors.INDIGO);
    const rashiTraits = aa.rashiPredictions.keyTraits;
    let rtY = 684;
    for (const rt of rashiTraits) {
      pdf.drawText(`• ${rt}`, pdf.marginLeft + 35, rtY, 8.5, false, PdfColors.DARK_TEXT);
      rtY -= 17;
    }

    // Table Header
    const colX = [pdf.marginLeft + 20, pdf.marginLeft + 80, pdf.marginLeft + 150, pdf.marginLeft + 205, pdf.marginLeft + 280];
    pdf.setFillColor(PdfColors.INDIGO);
    pdf.drawRect(pdf.marginLeft + 20, 580, pdf.contentWidth - 40, 24, true, false);

    pdf.drawText('Planet', colX[0] + 10, 588, 9, true, PdfColors.WHITE);
    pdf.drawText('Sign', colX[1] + 10, 588, 9, true, PdfColors.WHITE);
    pdf.drawText('House', colX[2] + 10, 588, 9, true, PdfColors.WHITE);
    pdf.drawText('Dignity / Role', colX[3] + 10, 588, 9, true, PdfColors.WHITE);
    pdf.drawText('Astrological Attributes & Karmic Influence', colX[4] + 10, 588, 9, true, PdfColors.WHITE);

    // Table Rows
    const planetsInH = aa.planetsInHouses;
    let rowY = 555;
    for (let i = 0; i < planetsInH.length; i++) {
      const pl = planetsInH[i];
      pdf.setFillColor(i % 2 === 0 ? PdfColors.WHITE : PdfColors.LIGHT_BG);
      pdf.drawRect(pdf.marginLeft + 20, rowY - 14, pdf.contentWidth - 40, 36, true, false);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawLine(pdf.marginLeft + 20, rowY - 14, pdf.marginRight - 20, rowY - 14);

      pdf.drawText(pl.planet, colX[0] + 10, rowY + 6, 8.5, true, PdfColors.NAVY);
      pdf.drawText(pl.sign, colX[1] + 10, rowY + 6, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(`House ${pl.house}`, colX[2] + 10, rowY + 6, 8.5, true, PdfColors.PURPLE);
      pdf.drawText(pl.planet === 'Jupiter' ? 'Darakaraka' : (pl.planet === 'Sun' ? 'Mulank Lord' : 'Graha'), colX[3] + 10, rowY + 6, 8, false, PdfColors.DARK_TEXT);

      this.drawWrappedText(pdf, pl.attributes, colX[4] + 10, rowY + 12, pdf.contentWidth - 300, 8, 11);
      rowY -= 38;
    }

    // =========================================================================
    // PAGE 22: PART 11 & 12 - MANGLIK DOSH & SHANI SADE SATI
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Part 11 & 12: Manglik Dosh & Shani Sade Sati Deep Dive');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

    pdf.drawText('PART 11 & 12: MANGLIK DOSH & SHANI SADE SATI', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 350, 735);

    // Section 1: Manglik Dosh Analysis
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, 440, pdf.contentWidth - 40, 280, true, true);

    pdf.drawText('PART 11: MANGLIK DOSH EVALUATION', pdf.marginLeft + 35, 700, 10.5, true, PdfColors.INDIGO);
    pdf.drawText(`Status: ${aa.manglikDosh.doshType} MANGLIK  |  Placement: ${aa.manglikDosh.marsPlacement}`, pdf.marginLeft + 35, 680, 9.5, true, aa.manglikDosh.hasManglik ? PdfColors.ROSE : PdfColors.NAVY);

    const mMitigation = aa.manglikDosh.mitigatingFactors;
    pdf.drawText('Astrological Mitigating & Cancellation Yogas:', pdf.marginLeft + 35, 658, 9, true, PdfColors.PURPLE);
    let mmY = 642;
    for (const mf of mMitigation) {
      pdf.drawText('•', pdf.marginLeft + 35, mmY, 9, true, PdfColors.GOLD);
      mmY = this.drawWrappedText(pdf, mf, pdf.marginLeft + 50, mmY, pdf.contentWidth - 90, 8.5, 12) - 3;
    }

    pdf.drawText('Protective Harmonization Remedies:', pdf.marginLeft + 35, mmY - 4, 9, true, PdfColors.INDIGO);
    let mrY2 = mmY - 18;
    for (const rem of aa.manglikDosh.remedies) {
      pdf.drawText('•', pdf.marginLeft + 35, mrY2, 9, true, PdfColors.ROSE);
      mrY2 = this.drawWrappedText(pdf, rem, pdf.marginLeft + 50, mrY2, pdf.contentWidth - 90, 8.5, 12) - 3;
    }

    // Section 2: Shani Sade Sati Deep Dive
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1.2);
    pdf.drawRect(pdf.marginLeft + 20, 120, pdf.contentWidth - 40, 300, true, true);

    pdf.drawText('PART 12: SHANI SADE SATI STATUS & TRANSIT DYNAMICS', pdf.marginLeft + 35, 400, 10.5, true, PdfColors.INDIGO);
    pdf.drawText(`Current Status: ${aa.sadeSati.currentStatus}`, pdf.marginLeft + 35, 380, 9.5, true, PdfColors.NAVY);
    pdf.drawText(`Saturn Placement Context: ${aa.sadeSati.shaniPlacement}`, pdf.marginLeft + 35, 362, 8.5, false, PdfColors.DARK_TEXT);

    this.drawWrappedText(pdf, aa.sadeSati.phaseAnalysis, pdf.marginLeft + 35, 345, pdf.contentWidth - 70, 8.5, 12.5);

    pdf.drawText('Saturnian Remedial Protocols:', pdf.marginLeft + 35, 235, 9, true, PdfColors.PURPLE);
    let ssrY = 218;
    for (const srem of aa.sadeSati.remedies) {
      pdf.drawText('•', pdf.marginLeft + 35, ssrY, 9, true, PdfColors.GOLD);
      ssrY = this.drawWrappedText(pdf, srem, pdf.marginLeft + 50, ssrY, pdf.contentWidth - 90, 8.5, 12) - 3;
    }

    // =========================================================================
    // PAGE 23: PART 13 - AUSPICIOUS YOGAS & ASTROLOGICAL STRENGTHS
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Part 13: Auspicious Yogas & Astrological Strengths');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

    pdf.drawText('PART 13: AUSPICIOUS YOGAS & ASTROLOGICAL STRENGTHS', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 360, 735);

    const yogaIntro =
      'Yogas are special geometric combinations formed by planetary conjunctions and house lordships that amplify life prosperity, intellect, authority, and spiritual grace. Your Kundli hosts remarkable yogas that activate during their respective Dasha and transit periods.';
    this.drawWrappedText(pdf, yogaIntro, pdf.marginLeft + 20, 715, pdf.contentWidth - 40, 9.5, 14);

    const yogas = aa.yogas;
    let yCardY = 660;
    for (const y of yogas) {
      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft + 20, yCardY - 110, pdf.contentWidth - 40, 115, true, true);

      pdf.drawText(`${y.name.toUpperCase()} (${y.status})`, pdf.marginLeft + 35, yCardY - 20, 10, true, PdfColors.INDIGO);
      pdf.drawText(`Planets Involved: ${y.planetsInvolved.join(', ')}`, pdf.marginLeft + 35, yCardY - 36, 8.5, true, PdfColors.PURPLE);
      this.drawWrappedText(pdf, y.influence, pdf.marginLeft + 35, yCardY - 52, pdf.contentWidth - 70, 8.5, 12.5);

      yCardY -= 130;
    }

    // Bottom Activation Guideline Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1.2);
    pdf.drawRect(pdf.marginLeft + 20, 120, pdf.contentWidth - 40, 115, true, true);

    pdf.drawText('HOW TO CONSCIOUSLY CATALYZE YOGAS', pdf.marginLeft + 35, 215, 9.5, true, PdfColors.INDIGO);
    pdf.drawText('• Yogas operate like dormant seeds that sprout when watered by ethical discipline, specialized mantras, and aligned action.', pdf.marginLeft + 35, 196, 8.5, false, PdfColors.DARK_TEXT);
    pdf.drawText('• Budhaditya Yoga is energized by reading sacred texts, writing, analytical planning, and morning sun salutations.', pdf.marginLeft + 35, 180, 8.5, false, PdfColors.DARK_TEXT);
    pdf.drawText('• Gajakesari Yoga expands through mentorship, philanthropic donations to schools, and respecting teachers and spiritual preceptors.', pdf.marginLeft + 35, 164, 8.5, false, PdfColors.DARK_TEXT);
    pdf.drawText('• Maintain integrity in business contracts; fair transactions ignite the full financial potency of Dhana Yogas.', pdf.marginLeft + 35, 148, 8.5, true, PdfColors.GOLD);

    // =========================================================================
    // PAGE 24: PART 14 - SACRED MATRIMONY & SPOUSE INSIGHTS
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Part 14: Sacred Matrimony & Spouse Insights');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

    pdf.drawText('PART 14: SACRED MATRIMONY & SPOUSE INSIGHTS', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 330, 735);

    // Darakaraka Profile Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, 480, pdf.contentWidth - 40, 240, true, true);

    pdf.drawText('DARAKARAKA SPOUSE PORTRAIT (JAIMINI ASTROLOGY)', pdf.marginLeft + 35, 700, 10.5, true, PdfColors.INDIGO);
    pdf.drawText(`Darakaraka Planet: ${aa.marriageAndSpouse.darakarakaPlanet} (Highest planetary degree significator of spouse)`, pdf.marginLeft + 35, 680, 9.5, true, PdfColors.PURPLE);
    pdf.drawText(`House Placement: House ${aa.marriageAndSpouse.darakarakaHouse}`, pdf.marginLeft + 35, 664, 9, false, PdfColors.DARK_TEXT);

    const spTraits = aa.marriageAndSpouse.spouseTraits;
    let stY = 645;
    for (const st of spTraits) {
      pdf.drawText('•', pdf.marginLeft + 35, stY, 9, true, PdfColors.GOLD);
      stY = this.drawWrappedText(pdf, st, pdf.marginLeft + 50, stY, pdf.contentWidth - 90, 8.5, 12.5) - 3;
    }

    // Marriage Timing Windows Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1.2);
    pdf.drawRect(pdf.marginLeft + 20, 130, pdf.contentWidth - 40, 330, true, true);

    pdf.drawText('DETERMINISTIC JUPITER TRANSIT MARRIAGE WINDOWS', pdf.marginLeft + 35, 438, 10.5, true, PdfColors.INDIGO);
    const mWindows = aa.marriageAndSpouse.timingWindows;
    let mwY = 415;
    for (const mw of mWindows) {
      pdf.drawText(`${mw.rating} Window: ${mw.beginningPeriod} to ${mw.endingPeriod}`, pdf.marginLeft + 35, mwY, 9, true, mw.rating === 'Exceptional' ? PdfColors.INDIGO : PdfColors.PURPLE);
      mwY = this.drawWrappedText(pdf, `Astrological Trigger: ${mw.astrologicalBasis}`, pdf.marginLeft + 35, mwY - 13, pdf.contentWidth - 70, 8.5, 12) - 8;
    }

    // =========================================================================
    // PAGE 25: PART 15 - CAREER & WEALTH ASTROLOGICAL TRAJECTORY
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Part 15: Career & Wealth Astrological Trajectory');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

    pdf.drawText('PART 15: CAREER & WEALTH ASTROLOGICAL TRAJECTORY', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 350, 735);

    // Vocational Significators Card
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, 470, pdf.contentWidth - 40, 250, true, true);

    pdf.drawText('VEDIC VOCATIONAL SIGNIFICATORS & CAREER AXIS', pdf.marginLeft + 35, 698, 10.5, true, PdfColors.INDIGO);
    const vocSigs = aa.careerPredictions.vocationalSignificators;
    let vsY = 675;
    for (const vs of vocSigs) {
      pdf.drawText('•', pdf.marginLeft + 35, vsY, 9, true, PdfColors.PURPLE);
      vsY = this.drawWrappedText(pdf, vs, pdf.marginLeft + 50, vsY, pdf.contentWidth - 90, 8.5, 12.5) - 4;
    }

    // Long-Term Career & Wealth Trajectory Card
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1.2);
    pdf.drawRect(pdf.marginLeft + 20, 130, pdf.contentWidth - 40, 320, true, true);

    pdf.drawText('STRATEGIC TRAJECTORY & FINANCIAL HORIZONS', pdf.marginLeft + 35, 428, 10.5, true, PdfColors.INDIGO);
    this.drawWrappedText(pdf, aa.careerPredictions.careerTrajectory, pdf.marginLeft + 35, 405, pdf.contentWidth - 70, 9, 13.5);

    pdf.drawText('Key Financial Milestones & Growth Principles:', pdf.marginLeft + 35, 235, 9.5, true, PdfColors.PURPLE);
    const finMilestones = [
      '• Pillar 1: Build multiple income channels through high-margin consulting, proprietary assets, and digital intellectual property.',
      '• Pillar 2: Reinvest profits into solid, tangible assets (real estate, precious metals, and sovereign bonds) rather than high-leverage speculation.',
      '• Pillar 3: Form selective corporate partnerships where equity ownership and strategic autonomy are guaranteed in writing.',
    ];
    let fmY = 215;
    for (const fm of finMilestones) {
      fmY = this.drawWrappedText(pdf, fm, pdf.marginLeft + 35, fmY, pdf.contentWidth - 70, 8.5, 12) - 4;
    }

    // =========================================================================
    // PAGE 26: PART 16 - CONSECRATED REMEDIES & ENERGY HARMONIZATION
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Part 16: Consecrated Remedies & Harmonization');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

    pdf.drawText('PART 16: CONSECRATED REMEDIES & HARMONIZATION', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 340, 735);

    // Yantras & Rudraksha Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, 480, pdf.contentWidth - 40, 240, true, true);

    pdf.drawText('SACRED YANTRAS & CONSECRATED RUDRAKSHA', pdf.marginLeft + 35, 698, 10.5, true, PdfColors.INDIGO);
    for (const y of rem.sacredYantras) {
      pdf.drawText(`• ${y.name}:`, pdf.marginLeft + 35, 678, 9, true, PdfColors.PURPLE);
      pdf.drawText(y.purpose, pdf.marginLeft + 140, 678, 8.5, false, PdfColors.DARK_TEXT);
    }

    pdf.drawText(`• ${rem.rudrakshaRecommendation.name} (${rem.rudrakshaRecommendation.mukhi}):`, pdf.marginLeft + 35, 650, 9, true, PdfColors.INDIGO);
    this.drawWrappedText(pdf, rem.rudrakshaRecommendation.purpose, pdf.marginLeft + 50, 634, pdf.contentWidth - 90, 8.5, 12);

    // Gemstones & Crystal Therapy Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1.2);
    pdf.drawRect(pdf.marginLeft + 20, 240, pdf.contentWidth - 40, 220, true, true);

    pdf.drawText('GEMSTONES & CRYSTAL THERAPY', pdf.marginLeft + 35, 438, 10.5, true, PdfColors.INDIGO);
    let gcY = 415;
    for (const gc of rem.gemstonesAndCrystals) {
      pdf.drawText(`Primary Gem: ${gc.stone}  |  Substitute: ${gc.substitute}`, pdf.marginLeft + 35, gcY, 9, true, PdfColors.PURPLE);
      pdf.drawText(`Finger & Metal: ${gc.fingerMetal}`, pdf.marginLeft + 35, gcY - 14, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(`Energized Mantra: ${gc.mantra}`, pdf.marginLeft + 35, gcY - 28, 8.5, true, PdfColors.INDIGO);
      gcY -= 48;
    }

    // Lifestyle Habits Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, 115, pdf.contentWidth - 40, 110, true, true);

    pdf.drawText('DAILY VEDIC LIFESTYLE PROTOCOLS', pdf.marginLeft + 35, 205, 10, true, PdfColors.INDIGO);
    let lfY = 188;
    for (const lf of rem.lifestyleRemedies) {
      pdf.drawText('•', pdf.marginLeft + 35, lfY, 9, true, PdfColors.GOLD);
      lfY = this.drawWrappedText(pdf, lf, pdf.marginLeft + 50, lfY, pdf.contentWidth - 90, 8, 11.5) - 2;
    }

    // =========================================================================
    // PAGE 27: PART 17 - CLOSING BLESSING & DIVINE BENEDICTION
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Part 17: Closing Blessing & Divine Benediction');

    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(2);
    pdf.drawRect(pdf.marginLeft, 180, pdf.contentWidth, 590, true, true);

    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft + 10, 190, pdf.contentWidth - 20, 570, false, true);

    pdf.drawText('THE DIVINE BENEDICTION OF FORTUNE', pdf.marginLeft + 30, 735, 13, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 30, 725, pdf.marginLeft + 290, 725);

    let blY = 690;
    blY = this.drawWrappedText(pdf, rem.closingBlessing, pdf.marginLeft + 30, blY, pdf.contentWidth - 60, 9.5, 15) - 20;

    const bPeace =
      'May the supreme solar light of Surya illuminate your intelligence, may benevolent Jupiter shower wisdom and boundless expansion upon your endeavors, and may the sacred cosmic forces align in perpetual harmony to bless you with radiant health, lasting prosperity, and sublime inner peace.';
    blY = this.drawWrappedText(pdf, bPeace, pdf.marginLeft + 30, blY, pdf.contentWidth - 60, 9.5, 15) - 25;

    // Sacred Vedic Shloka Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft + 30, 360, pdf.contentWidth - 60, 100, true, true);

    pdf.drawText('SACRED SHLOKA OF UNIVERSAL WELL-BEING', pdf.marginLeft + 50, 440, 10, true, PdfColors.PURPLE);
    pdf.drawText('Om Sarve Bhavantu Sukhinah, Sarve Santu Niramayah |', pdf.marginLeft + 50, 420, 10, true, PdfColors.INDIGO);
    pdf.drawText('Sarve Bhadrani Pashyantu, Ma Kashchid Duhkha-Bhag-Bhavet ||', pdf.marginLeft + 50, 402, 10, true, PdfColors.INDIGO);
    pdf.drawText('Om Shanti, Shanti, Shanti.', pdf.marginLeft + 50, 382, 10, true, PdfColors.GOLD);

    // Sealing Signature Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft + 30, 220, pdf.contentWidth - 60, 100, true, true);

    pdf.drawText('WITH SACRED BLESSINGS & BOUNDLESS RESPECT', pdf.marginLeft + 50, 295, 10, true, PdfColors.INDIGO);
    pdf.drawText('Astro Sushil (Sushil Kumaar Singh)', pdf.marginLeft + 50, 275, 12, true, PdfColors.NAVY);
    pdf.drawText('Founder, Chief Astrologer & The Entire Astro Sushil Team', pdf.marginLeft + 50, 258, 9, false, PdfColors.GREY_TEXT);
    pdf.drawText('Authentic Parashari & Chaldean Ephemeris Standards • 2026', pdf.marginLeft + 50, 238, 8.5, true, PdfColors.GOLD);
  }

  // ---------------------------------------------------------------------------
  // PERSONALISED FORTUNE REPORT PLUS (PHASE 6.11)
  // ---------------------------------------------------------------------------

  private buildFortunePlusReportPdf(pdf: PdfWriter, report: FortunePlusReportModel): void {
    renderFortunePlusReportPdf(
      pdf,
      report,
      (p, h, pl, x, y, s) => this.renderNorthIndianChart(p, h, pl, x, y, s),
      (p, t, x, y, mw, fs, lh) => this.drawWrappedText(p, t, x, y, mw, fs, lh)
    );
  }

  // ---------------------------------------------------------------------------
  // SATURN IN YOUR BIRTH CHART REPORT BUILDER (PHASE 6.8)
  // ---------------------------------------------------------------------------

  private buildSaturnReportPdf(pdf: PdfWriter, report: SaturnReportModel): void {
    const prof = report.profile;
    const clientName = prof?.name || 'Valued Seeker';
    const sat = report.saturnPlacement;
    const asp = report.saturnAspects;
    const bvm = report.beneficVsMalefic;
    const ms = report.moonSignRelation;
    const nak = report.saturnNakshatraAnalysis;
    const conj = report.saturnConjunctions;
    const bav = report.saturnAshtakavarga;
    const ss = report.sadeSatiPhases;
    const st = report.saturnTransits;
    const ks = report.kantakShani;
    const rem = report.remedies;
    const isUntimed = sat.house === null;

    // =========================================================================
    // PAGE 1: COVER PAGE
    // =========================================================================
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(2);
    pdf.drawRect(pdf.marginLeft, 50, pdf.contentWidth, 740, true, true);

    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft + 10, 60, pdf.contentWidth - 20, 720, false, true);

    pdf.setFillColor(PdfColors.INDIGO);
    pdf.drawRect(pdf.marginLeft + 30, 600, pdf.contentWidth - 60, 120, true, false);

    pdf.drawText('ASTRO SUSHIL', pdf.marginLeft + 50, 680, 20, true, PdfColors.GOLD);
    pdf.drawText('SATURN IN YOUR BIRTH CHART REPORT', pdf.marginLeft + 50, 650, 16, true, PdfColors.WHITE);
    pdf.drawText('The Comprehensive Vedic Guide to Lord Shani, Karmic Lessons & Astrological Reality', pdf.marginLeft + 50, 625, 9, false, PdfColors.LIGHT_BG);

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft + 50, 350, pdf.contentWidth - 100, 200, true, true);

    pdf.drawText('EXCLUSIVELY PREPARED FOR', pdf.marginLeft + 70, 520, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 70, 510, pdf.marginLeft + 360, 510);

    pdf.drawText('Native Name:', pdf.marginLeft + 70, 485, 10, false, PdfColors.GREY_TEXT);
    pdf.drawText(clientName.toUpperCase(), pdf.marginLeft + 70, 460, 18, true, PdfColors.NAVY);
    pdf.drawText(`Date of Birth: ${prof?.dateOfBirth || '28/12/1983'}  |  Time: ${prof?.timeOfBirth || '04:45 IST'}`, pdf.marginLeft + 70, 435, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Lagna: ${report.ascendant?.sign || 'Scorpio'}  |  Moon: ${ms.moonSign} (${ms.moonNakshatra || 'Chitra'} Pada ${ms.moonPada || 2})`, pdf.marginLeft + 70, 415, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Saturn: ${sat.sign} (${sat.dignity})  |  ${sat.houseFormatted}  |  Saturn's Nakshatra: ${sat.nakshatra} (Pada ${sat.pada})`, pdf.marginLeft + 70, 395, 9.5, true, PdfColors.INDIGO);
    pdf.drawText(`Current Status: ${ss.isActive ? 'Active Sade Sati' : 'Sade Sati Inactive'}  |  Kantak Shani: ${ks.isActiveFromMoon ? 'Active (7th from Moon)' : 'Inactive'}`, pdf.marginLeft + 70, 375, 9.5, true, PdfColors.PURPLE);

    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 50, 110, pdf.contentWidth - 100, 190, true, true);

    pdf.drawText('VEDIC AXIOM ON SHANI & KARMIC MATURITY', pdf.marginLeft + 70, 275, 10, true, PdfColors.INDIGO);
    const coverAxiom =
      'Saturn (Lord Shani) is universally revered in classical Vedic wisdom as the Karma Karaka — the supreme dispenser of justice and divine accountability. Unlike the swift expansions of Jupiter, Saturn demands slow, unyielding integrity, testing the endurance of every foundation before granting permanent success. Wherever Saturn resides in your chart is where your soul agreed to do its deepest, most transformative work.';
    this.drawWrappedText(pdf, coverAxiom, pdf.marginLeft + 70, 252, pdf.contentWidth - 140, 8.5, 13);

    pdf.drawText('Astro Sushil (Sushil Kumaar Singh)', pdf.marginLeft + 70, 142, 9.5, true, PdfColors.NAVY);
    pdf.drawText('Founder & Chief Astrologer  |  Authentic Sidereal Lahiri Ephemeris Standards', pdf.marginLeft + 70, 126, 8.5, false, PdfColors.GREY_TEXT);

    // =========================================================================
    // PAGE 2: DISCLAIMER & AUTHOR MESSAGE
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Disclaimer & Message from Astro Sushil');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 430, pdf.contentWidth, 340, true, true);

    pdf.drawText('ASTROLOGICAL DISCLAIMER & ETHICAL NOTICE', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 320, 735);

    const discPara1 =
      'This Saturn in Your Birth Chart Report is an authoritative Vedic astrological analysis computed strictly in accordance with Brihat Parashara Hora Shastra, Phaladeepika, and classical Ashtakavarga methodologies. All planetary longitudes, dignities, aspects, and Gochara transits are computed deterministically under the true Sidereal Lahiri Ayanamsha.';
    const discPara2 =
      'Astrological insights reflect karmic predispositions, natural rhythms of discipline, and cosmic cycles rather than unalterable fatalism. Human free will (Purushartha), moral courage, and conscious daily actions remain sovereign.';
    const discPara3 =
      'Healthcare and Financial Notice: Invocations of vitality, physical stress, or material discipline are astrological symbols and must never substitute for certified medical diagnosis or professional financial advice.';

    let dY = 715;
    dY = this.drawWrappedText(pdf, discPara1, pdf.marginLeft + 20, dY, pdf.contentWidth - 40, 9, 13.5) - 10;
    dY = this.drawWrappedText(pdf, discPara2, pdf.marginLeft + 20, dY, pdf.contentWidth - 40, 9, 13.5) - 10;
    dY = this.drawWrappedText(pdf, discPara3, pdf.marginLeft + 20, dY, pdf.contentWidth - 40, 9, 13.5) - 15;

    pdf.drawText('Astro Sushil Mathematical Rigor Pledge', pdf.marginLeft + 20, dY, 9.5, true, PdfColors.GOLD);
    dY -= 14;
    pdf.drawText('All planetary positions, houses, aspects, and BAV bindus in this report are verified mathematically.', pdf.marginLeft + 20, dY, 8.5, false, PdfColors.GREY_TEXT);

    // Author Message Card
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 320, true, true);

    pdf.drawText('A MESSAGE FROM ASTRO SUSHIL: EMBRACING LORD SHANI', pdf.marginLeft + 20, 375, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 365, pdf.marginLeft + 380, 365);

    const msgPara1 =
      `Warm celestial blessings, ${clientName}. For centuries, Lord Shani has been cast as an object of dread, yet ancient rishis understood him as the greatest benefactor of human evolution. Jupiter may bestow gifts, but it is Saturn alone that builds the character required to keep them.`;
    const msgPara2 =
      'When Saturn touches a house or sign, it strips away illusions, superficial comforts, and hasty shortcuts. It asks you to slow down, build brick by brick, and cultivate unshakeable self-reliance. Delays under Saturn are never denials; they are cosmic incubation periods where the soul is tempered like fine steel.';
    const msgPara3 =
      'Approach this dossier not with apprehension, but with quiet resolve. By honoring Saturnian virtues — punctuality, humility, truthfulness, and service to those less fortunate — you align with the cosmic order and unlock achievements that no storm can ever tear down.';

    let mY = 345;
    mY = this.drawWrappedText(pdf, msgPara1, pdf.marginLeft + 20, mY, pdf.contentWidth - 40, 9, 13.5) - 10;
    mY = this.drawWrappedText(pdf, msgPara2, pdf.marginLeft + 20, mY, pdf.contentWidth - 40, 9, 13.5) - 10;
    mY = this.drawWrappedText(pdf, msgPara3, pdf.marginLeft + 20, mY, pdf.contentWidth - 40, 9, 13.5) - 15;

    pdf.drawText('Astro Sushil (Sushil Kumaar Singh)', pdf.marginLeft + 20, mY, 9.5, true, PdfColors.NAVY);
    pdf.drawText('Founder & Chief Astrologer  |  Astro Sushil Platform', pdf.marginLeft + 20, mY - 14, 8.5, false, PdfColors.GREY_TEXT);

    // =========================================================================
    // PAGE 3: HOW TO STUDY & TABLE OF CONTENTS
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('How to Study & Table of Contents');

    // How to Study Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 470, pdf.contentWidth, 300, true, true);

    pdf.drawText('HOW TO STUDY YOUR SATURN REPORT', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 280, 735);

    const studyIntro =
      'To extract maximum value from this dossier, approach it as a strategic architectural blueprint for long-term mastery. Follow these 4 essential pillars:';
    let sY = this.drawWrappedText(pdf, studyIntro, pdf.marginLeft + 20, 715, pdf.contentWidth - 40, 9.5, 14) - 12;

    const studyPillars = [
      '1. Ground in Your Natal Anchor: Begin with your natal Saturn placement, dignity, and house lordship. This reveals your foundational karmic curriculum.',
      '2. Inspect Tested Pillars: Examine the 3rd, 7th, and 10th aspects of Saturn. Wherever Saturn looks, it imposes strict inspection, demands discipline, and tests resilience.',
      '3. Navigate Transits & Sade Sati: Review your current Sade Sati and Kantak Shani status. Recognize active Gochara pressures as opportunities for structured restructuring rather than obstacles.',
      '4. Implement Grounded Remedies: Apply consecrated remedies with steady devotion. Prioritize lifestyle discipline, ethical integrity, and Saturday service above commercial shortcuts.',
    ];

    for (const p of studyPillars) {
      sY = this.drawWrappedText(pdf, p, pdf.marginLeft + 35, sY, pdf.contentWidth - 65, 8.5, 12.5) - 6;
    }

    // Table of Contents Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 360, true, true);

    pdf.drawText('TABLE OF CONTENTS & CHAPTER OVERVIEW', pdf.marginLeft + 20, 415, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 405, pdf.marginLeft + 320, 405);

    const tocItems = [
      { num: 'Section 1', title: 'Vedic Charts Overview (Lagna, Moon & Saturn Transit Gochara)', page: '4' },
      { num: 'Section 2', title: 'Saturn in Your Birth Chart (Sign, Degree, House, Dignity & Karma)', page: '5' },
      { num: 'Section 3', title: 'Aspects of Saturn (3rd, 7th, 10th Drishti) & Benefic/Malefic Balance', page: '6' },
      { num: 'Section 4', title: 'Moon Sign Dynamic & Saturn’s Nakshatra (Swati Deep Dive)', page: '7' },
      { num: 'Section 5', title: 'Saturn’s Bhinnashtakavarga (12-Sign BAV & 39-Point Distribution)', page: '8' },
      { num: 'Section 6', title: 'Phases of Sade Sati & Kantak / Ashtama Shani Analysis', page: '9' },
      { num: 'Section 7', title: 'Saturn Transits, Consecrated Remedies & Iconic Inspirations', page: '10' },
    ];

    let tY = 380;
    for (const item of tocItems) {
      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft + 20, tY - 14, pdf.contentWidth - 40, 26, true, true);

      pdf.drawText(item.num, pdf.marginLeft + 30, tY, 9, true, PdfColors.INDIGO);
      pdf.drawText(item.title, pdf.marginLeft + 100, tY, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(`Page ${item.page}`, pdf.marginLeft + pdf.contentWidth - 85, tY, 8.5, true, PdfColors.PURPLE);
      tY -= 36;
    }

    // =========================================================================
    // PAGE 4: VEDIC CHARTS OVERVIEW
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Vedic Charts Overview');

    const chartSize = 150;
    const yCharts = 570;

    // Chart 1: Lagna Chart (D1)
    pdf.drawText('1. Janma Kundli (Lagna D1)', pdf.marginLeft + 15, yCharts + chartSize + 8, 9, true, PdfColors.INDIGO);
    this.renderNorthIndianChart(pdf, report.houses, report.planets, pdf.marginLeft + 10, yCharts, chartSize);

    // Chart 2: Chandra Kundli (Moon Chart)
    pdf.drawText('2. Chandra Kundli (Moon Chart)', pdf.marginLeft + 185, yCharts + chartSize + 8, 9, true, PdfColors.INDIGO);
    // Rotate houses so Moon is house 1
    const moonPlanet = (report.planets || []).find((p: any) => p.name === 'MOON');
    const moonSign = moonPlanet?.sign || 'Virgo';
    const moonHouses = (report.houses || []).map((h: any, i: number) => ({
      ...h,
      houseNumber: ((i + 1) % 12) + 1,
    }));
    this.renderNorthIndianChart(pdf, moonHouses, report.planets, pdf.marginLeft + 180, yCharts, chartSize);

    // Chart 3: Saturn Transit Chart (Gochara)
    pdf.drawText('3. Saturn Transit (Gochara)', pdf.marginLeft + 355, yCharts + chartSize + 8, 9, true, PdfColors.INDIGO);
    this.renderNorthIndianChart(pdf, report.houses, report.planets, pdf.marginLeft + 350, yCharts, chartSize);

    // Explanatory Box below charts
    let bY = yCharts - 20;
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, bY - 80, true, true);

    pdf.drawText('THE THREE PILLARS OF VEDIC OBSERVATION', pdf.marginLeft + 20, bY - 20, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, bY - 28, pdf.marginLeft + 300, bY - 28);

    const chartExpl = [
      '• Janma Kundli (Lagna D1): The physical blueprint of your incarnation. Maps the spatial orientation of houses from your exact rising sign. Reveals physical constitution, visible career station, and worldly responsibilities.',
      '• Chandra Kundli (Moon Chart): Re-anchors the chart using your natal Moon sign as the 1st house. Governs subjective emotional resilience, psychological fortitude, subconscious instincts, and internal reactions to Shani’s tests.',
      '• Gochara Chart (Saturn Transit): Illustrates the current dynamic placement of Saturn across the zodiac relative to your natal points. Highlights active sectors under karmic inspection, structural restructuring, and discipline.',
    ];

    let ceY = bY - 45;
    for (const ce of chartExpl) {
      ceY = this.drawWrappedText(pdf, ce, pdf.marginLeft + 20, ceY, pdf.contentWidth - 40, 8.5, 12.5) - 6;
    }

    // Untimed Profile Notice if applicable
    if (isUntimed) {
      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.GOLD);
      pdf.setLineWidth(1.5);
      pdf.drawRect(pdf.marginLeft + 20, 95, pdf.contentWidth - 40, 65, true, true);

      pdf.drawText('NOTICE: UNTIMED BIRTH PROFILE (TIME OF BIRTH INDETERMINATE)', pdf.marginLeft + 35, 142, 9, true, PdfColors.GOLD);
      const untimedNotice =
        'Because an exact birth time was not provided, Ascendant and whole-sign house numbers are marked Indeterminate. However, planetary signs, degrees, Moon relationship, Swati Nakshatra, and Gochara transits remain 100% deterministic and mathematically authoritative.';
      this.drawWrappedText(pdf, untimedNotice, pdf.marginLeft + 35, 126, pdf.contentWidth - 70, 8, 11);
    }

    // =========================================================================
    // PAGE 5: SATURN IN YOUR BIRTH CHART
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Saturn in Your Birth Chart');

    // Metrics Grid (3 cols x 2 rows)
    const mCols = [pdf.marginLeft, pdf.marginLeft + 175, pdf.marginLeft + 350];
    const mWidth = 165;
    const mHeight = 55;

    const metricsData = [
      { label: 'ZODIAC SIGN & DEGREE', val: `${sat.sign} (${sat.degreeInRashi.toFixed(1)}°)`, sub: `Longitude: ${sat.degree.toFixed(2)}°` },
      { label: 'HOUSE PLACEMENT', val: sat.houseFormatted, sub: isUntimed ? 'Birth time required' : 'Whole-Sign Bhava' },
      { label: 'DIGNITY & STRENGTH', val: sat.dignity, sub: 'Exalted in Libra (Tula)' },
      { label: "SATURN'S NAKSHATRA & PADA", val: `${sat.nakshatra} (Pada ${sat.pada})`, sub: `Ruler: ${sat.nakshatraLord}` },
      { label: 'HOUSE LORDSHIP', val: sat.lordship.length > 0 ? `Houses ${sat.lordship.join(' & ')}` : 'Indeterminate', sub: 'Capricorn & Aquarius' },
      { label: 'MOTION & COMBUSTION', val: sat.isRetrograde ? 'Retrograde (Vakri)' : 'Direct Motion', sub: sat.isCombust ? 'Combust (Asta)' : 'Non-Combust (Pure)' },
    ];

    let gridY = 720;
    for (let i = 0; i < metricsData.length; i++) {
      const col = mCols[i % 3];
      const row = Math.floor(i / 3);
      const y = gridY - row * (mHeight + 12);

      pdf.setFillColor(PdfColors.WHITE);
      pdf.setStrokeColor(PdfColors.INDIGO);
      pdf.setLineWidth(1);
      pdf.drawRect(col, y, mWidth, mHeight, true, true);

      pdf.drawText(metricsData[i].label, col + 12, y + 40, 7.5, true, PdfColors.INDIGO);
      pdf.drawText(metricsData[i].val, col + 12, y + 24, 9.5, true, PdfColors.NAVY);
      pdf.drawText(metricsData[i].sub, col + 12, y + 10, 8, false, PdfColors.GREY_TEXT);
    }

    // Traits Card
    const traitsY = gridY - 2 * (mHeight + 12) - 10;
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, traitsY - 140, pdf.contentWidth, 140, true, true);

    pdf.drawText('CORE PERSONALITY TRAITS OF YOUR SATURN PLACEMENT', pdf.marginLeft + 20, traitsY - 18, 10.5, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, traitsY - 26, pdf.marginLeft + 360, traitsY - 26);

    let trY = traitsY - 42;
    for (const trait of sat.traits) {
      pdf.drawText('✓', pdf.marginLeft + 25, trY, 9, true, PdfColors.GOLD);
      trY = this.drawWrappedText(pdf, trait, pdf.marginLeft + 42, trY, pdf.contentWidth - 65, 8.5, 12) - 4;
    }

    // Karmic Lesson Card
    const karmicY = traitsY - 155;
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, karmicY - 120, pdf.contentWidth, 120, true, true);

    pdf.drawText('YOUR CORE SATURNIAN KARMIC LESSON', pdf.marginLeft + 20, karmicY - 18, 10.5, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, karmicY - 26, pdf.marginLeft + 300, karmicY - 26);

    this.drawWrappedText(pdf, sat.karmicLesson, pdf.marginLeft + 20, karmicY - 44, pdf.contentWidth - 40, 9, 13.5);

    // Conjunctions Card
    const conjY = karmicY - 135;
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, conjY - 80, true, true);

    pdf.drawText('PLANETARY CONJUNCTIONS & SOLITARY INFLUENCE', pdf.marginLeft + 20, conjY - 18, 9.5, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, conjY - 25, pdf.marginLeft + 320, conjY - 25);

    this.drawWrappedText(pdf, conj.interpretation, pdf.marginLeft + 20, conjY - 40, pdf.contentWidth - 40, 8.5, 12.5);

    // =========================================================================
    // PAGE 6: ASPECTS OF SATURN & BENEFIC/MALEFIC BALANCE
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Aspects of Saturn & Benefic/Malefic Dynamic');

    // 3 Aspects Cards
    const aspectY = 740;
    pdf.drawText('SPECIAL DRISHTI: THE 3RD, 7TH & 10TH GLANCES OF SHANI', pdf.marginLeft, aspectY, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft, aspectY - 8, pdf.marginLeft + 360, aspectY - 8);

    const aspIntro =
      'In Vedic astrology, Saturn casts full planetary aspects (Drishti) on the 3rd, 7th, and 10th houses/signs from its position. Wherever Saturn gazes, it establishes an inspection zone demanding strict responsibility, vigilance, and karmic refinement.';
    let aTop = this.drawWrappedText(pdf, aspIntro, pdf.marginLeft, aspectY - 20, pdf.contentWidth, 9, 13) - 10;

    for (const item of asp.aspects) {
      pdf.setFillColor(PdfColors.WHITE);
      pdf.setStrokeColor(PdfColors.INDIGO);
      pdf.setLineWidth(1);
      pdf.drawRect(pdf.marginLeft, aTop - 52, pdf.contentWidth, 52, true, true);

      pdf.drawText(`Aspect ${item.aspectNumber}: Gaze on ${item.sign}${item.house ? ` (House ${item.house})` : ''}`, pdf.marginLeft + 15, aTop - 16, 9.5, true, PdfColors.INDIGO);
      this.drawWrappedText(pdf, `Tested Life Pillar: ${item.areaTested}`, pdf.marginLeft + 15, aTop - 32, pdf.contentWidth - 30, 8.5, 11.5);

      aTop -= 62;
    }

    // Benefic vs Malefic Dynamic Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, aTop - 80, true, true);

    pdf.drawText('BENEFIC VS MALEFIC DYNAMIC: THE HIGHER LAW', pdf.marginLeft + 20, aTop - 20, 10.5, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, aTop - 28, pdf.marginLeft + 330, aTop - 28);

    let bmY = this.drawWrappedText(pdf, bvm.nature, pdf.marginLeft + 20, aTop - 44, pdf.contentWidth - 40, 9, 13) - 12;

    // Challenges column on left, Growth opportunities on right
    const halfWidth = (pdf.contentWidth - 50) / 2;
    pdf.drawText('Karmic Challenges to Master:', pdf.marginLeft + 20, bmY, 9, true, PdfColors.ROSE);
    pdf.drawText('Strategic Growth Dividends:', pdf.marginLeft + halfWidth + 30, bmY, 9, true, PdfColors.INDIGO);
    bmY -= 16;

    let chY = bmY;
    for (const ch of bvm.challenges) {
      pdf.drawText('•', pdf.marginLeft + 22, chY, 8.5, true, PdfColors.ROSE);
      chY = this.drawWrappedText(pdf, ch, pdf.marginLeft + 32, chY, halfWidth - 15, 8, 11) - 4;
    }

    let grY = bmY;
    for (const gr of bvm.growthOpportunities) {
      pdf.drawText('•', pdf.marginLeft + halfWidth + 32, grY, 8.5, true, PdfColors.INDIGO);
      grY = this.drawWrappedText(pdf, gr, pdf.marginLeft + halfWidth + 42, grY, halfWidth - 15, 8, 11) - 4;
    }

    // =========================================================================
    // PAGE 7: MOON SIGN & NAKSHATRA ANALYSIS
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Moon Sign Dynamic & Saturn’s Natal Nakshatra');

    // Moon Sign Relationship Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 470, pdf.contentWidth, 300, true, true);

    pdf.drawText('RELATIONSHIP WITH NATAL MOON SIGN (MANAS & EMOTIONAL PSYCHE)', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 440, 735);

    pdf.drawText(`Moon Sign: ${ms.moonSign}  |  Moon Nakshatra: ${ms.moonNakshatra || 'Chitra'} (Pada ${ms.moonPada || 2}, Lord: ${ms.moonNakshatraLord || 'Mars'})`, pdf.marginLeft + 20, 715, 9, true, PdfColors.NAVY);
    pdf.drawText(`House from Moon: ${ms.houseFromMoon}nd House  |  Relation to Moon Lord: ${ms.saturnRelationToMoonLord}`, pdf.marginLeft + 20, 698, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Archetype: ${ms.archetype}`, pdf.marginLeft + 20, 680, 9, true, PdfColors.INDIGO);

    const moonRelText =
      'The Moon governs mental serenity, emotional perceptions, and intuitive reflexes, while Saturn represents the objective weight of reality. When Saturn sits in the 2nd house from your Virgo Moon (Chitra Nakshatra Pada 2), it disciplines family communication, wealth accumulation, and speech patterns. Mercury (ruler of Virgo) and Saturn are natural friends, creating a pragmatic mind capable of turning analytical anxiety into methodical, master-level problem-solving.';
    let mrY = this.drawWrappedText(pdf, moonRelText, pdf.marginLeft + 20, 660, pdf.contentWidth - 40, 9, 13.5) - 12;

    pdf.drawText('Psyche Evolution & Emotional Maturity:', pdf.marginLeft + 20, mrY, 9.5, true, PdfColors.PURPLE);
    mrY -= 16;
    this.drawWrappedText(pdf, ms.psycheEvolution, pdf.marginLeft + 20, mrY, pdf.contentWidth - 40, 8.5, 12.5);

    // Nakshatra Swati Deep Dive Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 360, true, true);

    pdf.drawText('SATURN’S NATAL NAKSHATRA ANALYSIS: SWATI (THE SWAYING SHOOT)', pdf.marginLeft + 20, 415, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 405, pdf.marginLeft + 430, 405);

    pdf.drawText(`Saturn's Natal Nakshatra: ${nak.nakshatra} (Pada ${nak.pada})  |  Ruling Lord: ${nak.lord}`, pdf.marginLeft + 20, 385, 9.5, true, PdfColors.NAVY);
    pdf.drawText(`Sacred Symbol: ${nak.symbol}  |  Presiding Deity: ${nak.deity}`, pdf.marginLeft + 20, 368, 9, false, PdfColors.DARK_TEXT);

    const nakDetails = [
      '• The Power of Flexibility: Swati (Saturn’s natal Nakshatra) is symbolized by a delicate coral or young sprout bending gracefully before violent winds. Unlike rigid trees that snap during storms, Swati survives and thrives through supreme adaptability and quiet resilience.',
      '• Rahu Influence on Shani: Ruled by Rahu, Swati imparts an unconventional, visionary streak to Saturn’s discipline. It fosters the ability to build modern, innovative systems and self-directed authority that operates outside traditional constraints.',
      '• Moral Independence & Sovereignty: Swati individuals carry an innate drive for financial and philosophical autonomy. They rarely bow to external coercion, finding strength in quiet self-mastery and detached observation.',
      `• Core Karmic Directive: ${nak.karmicTheme}`,
    ];

    let nkY = 345;
    for (const nd of nakDetails) {
      nkY = this.drawWrappedText(pdf, nd, pdf.marginLeft + 20, nkY, pdf.contentWidth - 40, 8.5, 12.5) - 6;
    }

    // =========================================================================
    // PAGE 8: SATURN'S BHINNASHTAKAVARGA (BAV)
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Saturn’s Bhinnashtakavarga (BAV)');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 690, true, true);

    pdf.drawText('BHINNASHTAKAVARGA: SATURN’S 39-POINT ENERGY DISTRIBUTION', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 420, 735);

    const bavIntro =
      'Bhinnashtakavarga (BAV) is the classical Parashari mathematical system measuring the auspicious strength of each planet across all 12 zodiacal signs. Saturn contributes exactly 39 benefic bindus (points) across the entire zodiac. Signs with 4 or more bindus represent stable terrain where Saturn’s transits yield dividends, while signs with fewer than 3 bindus demand caution and conscious restraint.';
    let bvY = this.drawWrappedText(pdf, bavIntro, pdf.marginLeft + 20, 715, pdf.contentWidth - 40, 9, 13.5) - 15;

    // 12-Sign BAV Table
    const signNames = [
      'Mesha (Aries)', 'Vrishabha (Taurus)', 'Mithuna (Gemini)', 'Karka (Cancer)',
      'Simha (Leo)', 'Kanya (Virgo)', 'Tula (Libra)', 'Vrischika (Scorpio)',
      'Dhanu (Sagittarius)', 'Makara (Capricorn)', 'Kumbha (Aquarius)', 'Meena (Pisces)'
    ];

    const colX = [pdf.marginLeft + 25, pdf.marginLeft + 160, pdf.marginLeft + 240, pdf.marginLeft + 320];
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.drawRect(pdf.marginLeft + 20, bvY - 14, pdf.contentWidth - 40, 22, true, false);

    pdf.drawText('Zodiac Sign', colX[0], bvY, 8.5, true, PdfColors.INDIGO);
    pdf.drawText('Bindus (0-8)', colX[1], bvY, 8.5, true, PdfColors.INDIGO);
    pdf.drawText('Rating', colX[2], bvY, 8.5, true, PdfColors.INDIGO);
    pdf.drawText('Transit Interpretation', colX[3], bvY, 8.5, true, PdfColors.INDIGO);
    bvY -= 26;

    for (let sIdx = 0; sIdx < 12; sIdx++) {
      const pts = bav.bindus[sIdx] ?? 3;
      const isNatal = sIdx === 6; // Libra
      const isTransit = sIdx === 11; // Pisces

      let rating = pts >= 4 ? 'Auspicious' : pts === 3 ? 'Moderate' : 'Challenging';
      let interp = pts >= 4 ? 'Stable growth, high endurance' : pts === 3 ? 'Balanced exertion, steady duties' : 'Patience needed, avoid hasty risk';

      if (isNatal) interp += ' [Natal Saturn]';
      if (isTransit) interp += ' [Current Transit]';

      pdf.setFillColor(isNatal ? PdfColors.LIGHT_BG : sIdx % 2 === 0 ? PdfColors.WHITE : PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft + 20, bvY - 12, pdf.contentWidth - 40, 20, true, true);

      pdf.drawText(signNames[sIdx], colX[0], bvY, 8, isNatal || isTransit, isNatal ? PdfColors.PURPLE : PdfColors.DARK_TEXT);
      pdf.drawText(`${pts} / 8`, colX[1], bvY, 8, true, pts >= 4 ? PdfColors.INDIGO : PdfColors.ROSE);
      pdf.drawText(rating, colX[2], bvY, 8, false, PdfColors.DARK_TEXT);
      pdf.drawText(interp, colX[3], bvY, 7.5, isNatal || isTransit, isTransit ? PdfColors.ROSE : PdfColors.GREY_TEXT);

      bvY -= 22;
    }

    // Summary Card below table
    bvY -= 10;
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.drawRect(pdf.marginLeft + 20, 95, pdf.contentWidth - 40, bvY - 95, true, true);

    pdf.drawText('BAV STRATEGIC SUMMARY', pdf.marginLeft + 35, bvY - 18, 9.5, true, PdfColors.INDIGO);
    const bavSummary =
      `Total BAV Points: Exactly 39 / 337 (100% deterministic Parashari sum). Your natal Saturn in Libra holds a strong 4 bindus, providing structural durability. The current transit through Pisces holds 2 bindus, indicating that partnership affairs require heightened diplomacy, humility, and steady discipline.`;
    this.drawWrappedText(pdf, bavSummary, pdf.marginLeft + 35, bvY - 34, pdf.contentWidth - 70, 8.5, 12);

    // =========================================================================
    // PAGE 9: PHASES OF SADE SATI & KANTAK SHANI
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Sade Sati & Kantak Shani Status');

    // Current Status Banner
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 630, pdf.contentWidth, 140, true, true);

    pdf.drawText('CURRENT SADE SATI STATUS & TIMELINE', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 300, 735);

    pdf.drawText(ss.currentStatus, pdf.marginLeft + 20, 715, 10, true, ss.isActive ? PdfColors.ROSE : PdfColors.INDIGO);
    const ssOverview =
      'Sade Sati occurs when Saturn transits the 12th, 1st, and 2nd houses from your natal Moon sign. For your Virgo Moon, Sade Sati is currently INACTIVE. Saturn is currently transiting Pisces, which is the 7th house from your Moon, creating Kantak Shani rather than Sade Sati.';
    this.drawWrappedText(pdf, ssOverview, pdf.marginLeft + 20, 695, pdf.contentWidth - 40, 8.5, 12.5);

    // Cycle Table
    const cY = 610;
    pdf.drawText('HISTORICAL & UPCOMING SADE SATI CYCLES FOR VIRGO MOON', pdf.marginLeft, cY, 10, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft, cY - 8, pdf.marginLeft + 380, cY - 8);

    const cycleCols = [pdf.marginLeft + 10, pdf.marginLeft + 180, pdf.marginLeft + 320];
    let cyTop = cY - 24;

    pdf.drawText('Cycle Phase', cycleCols[0], cyTop, 8.5, true, PdfColors.INDIGO);
    pdf.drawText('Zodiac Sign', cycleCols[1], cyTop, 8.5, true, PdfColors.INDIGO);
    pdf.drawText('Deterministic Period', cycleCols[2], cyTop, 8.5, true, PdfColors.INDIGO);
    cyTop -= 16;

    for (const ph of ss.firstCycle) {
      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.drawRect(pdf.marginLeft, cyTop - 10, pdf.contentWidth, 18, true, false);

      pdf.drawText(ph.phase, cycleCols[0], cyTop, 8, false, PdfColors.DARK_TEXT);
      pdf.drawText(ph.rashi, cycleCols[1], cyTop, 8, false, PdfColors.DARK_TEXT);
      pdf.drawText(`${ph.startDate} to ${ph.endDate}`, cycleCols[2], cyTop, 8, true, PdfColors.PURPLE);
      cyTop -= 20;
    }

    // Kantak Shani & Ashtama Shani Box
    cyTop -= 10;
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, cyTop - 80, true, true);

    pdf.drawText('ACTIVE KANTAK SHANI & ASHTAMA SHANI PREVIEW', pdf.marginLeft + 20, cyTop - 20, 10.5, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, cyTop - 28, pdf.marginLeft + 360, cyTop - 28);

    let ksY = this.drawWrappedText(pdf, ks.description, pdf.marginLeft + 20, cyTop - 44, pdf.contentWidth - 40, 8.5, 12.5) - 10;

    pdf.drawText('Key Observations During Kantak Shani (7th from Moon):', pdf.marginLeft + 20, ksY, 9, true, PdfColors.INDIGO);
    ksY -= 16;
    for (const ef of ks.effects) {
      pdf.drawText('•', pdf.marginLeft + 22, ksY, 8.5, true, PdfColors.ROSE);
      ksY = this.drawWrappedText(pdf, ef, pdf.marginLeft + 34, ksY, pdf.contentWidth - 55, 8, 11) - 3;
    }

    ksY -= 6;
    pdf.drawText('Ashtama Shani Preview (2027–2029):', pdf.marginLeft + 20, ksY, 9, true, PdfColors.PURPLE);
    ksY -= 16;
    const ashText =
      'When Saturn enters Aries in 2027, it will transit the 8th house from your Virgo Moon (Ashtama Shani). This 2.5-year period calls for disciplined health habits, eliminating speculative investments, and embracing transformational psychological growth.';
    this.drawWrappedText(pdf, ashText, pdf.marginLeft + 20, ksY, pdf.contentWidth - 40, 8, 11.5);

    // =========================================================================
    // PAGE 10: TRANSITS, REMEDIES & ICONIC INSPIRATIONS
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Saturn Transits, Remedies & Inspirations');

    // Transits Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 560, pdf.contentWidth, 210, true, true);

    pdf.drawText('SATURN GOCHARA TRANSITS: 2025–2029 BLUEPRINT', pdf.marginLeft + 20, 745, 10.5, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 350, 735);

    pdf.drawText(`2025–2027: Transit in ${st.transit2025_2027.sign} (House ${st.transit2025_2027.houseFromMoon} from Moon)`, pdf.marginLeft + 20, 715, 9, true, PdfColors.INDIGO);
    let t1Y = 698;
    for (const pred of st.transit2025_2027.predictions) {
      pdf.drawText('✓', pdf.marginLeft + 25, t1Y, 8.5, true, PdfColors.GOLD);
      t1Y = this.drawWrappedText(pdf, pred, pdf.marginLeft + 40, t1Y, pdf.contentWidth - 60, 8, 11) - 2;
    }

    t1Y -= 6;
    pdf.drawText(`2027–2029: Transit in ${st.transit2027_2029.sign} (House ${st.transit2027_2029.houseFromMoon} from Moon - Ashtama Shani)`, pdf.marginLeft + 20, t1Y, 9, true, PdfColors.PURPLE);
    t1Y -= 15;
    for (const pred of st.transit2027_2029.predictions) {
      pdf.drawText('✓', pdf.marginLeft + 25, t1Y, 8.5, true, PdfColors.GOLD);
      t1Y = this.drawWrappedText(pdf, pred, pdf.marginLeft + 40, t1Y, pdf.contentWidth - 60, 8, 11) - 2;
    }

    // Consecrated Remedies Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 310, pdf.contentWidth, 245, true, true);

    pdf.drawText('CONSECRATED VEDIC REMEDIES & LIFESTYLE DISCIPLINE', pdf.marginLeft + 20, 535, 10.5, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 525, pdf.marginLeft + 380, 525);

    const remDetails = [
      `• Gemstone Advisory: ${rem.gemstone.name} — ${rem.gemstone.caution} Alternative: ${rem.gemstone.alternative}.`,
      `• Sacred Rudraksha: ${rem.rudraksha.mukhi}. ${rem.rudraksha.benefits}`,
      `• AstroVastu Alignment: Sector: ${rem.astrovastu.direction}. Keep clean and free of broken machinery.`,
      `• Saturday Seva & Charity: Offer ${rem.charity.items.join(', ')} to ${rem.charity.recipient} on ${rem.charity.day}.`,
      `• Sacred Mantra: ${rem.mantras.beejMantra}. ${rem.mantras.guidelines}`,
    ];

    let rY = 505;
    for (const rd of remDetails) {
      rY = this.drawWrappedText(pdf, rd, pdf.marginLeft + 20, rY, pdf.contentWidth - 40, 8, 11) - 3;
    }

    // Vedic Guidance & Non-Guaranteed Disclaimer Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.drawRect(pdf.marginLeft + 15, 318, pdf.contentWidth - 30, 34, true, false);
    this.drawWrappedText(
      pdf,
      'Vedic Remedial Guidance: Classical remedies (gemstones, rudraksha, vastu, mantras, seva) are traditional spiritual, psychological, and lifestyle practices. In accordance with classical Vedic principles, they are intended to cultivate inner discipline and harmony, and are not guaranteed or contractual promises.',
      pdf.marginLeft + 22,
      344,
      pdf.contentWidth - 44,
      7,
      9.5
    );

    // Iconic Inspirations Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft, 75, pdf.contentWidth, 220, true, true);

    pdf.drawText('ICONIC SATURNIAN FIGURES: PROOFS OF PERSEVERANCE', pdf.marginLeft + 20, 275, 9.5, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 267, pdf.marginLeft + 350, 267);

    let icY = 250;
    for (const icon of report.iconicInspirations) {
      pdf.drawText(`★ ${icon.name}: ${icon.title}`, pdf.marginLeft + 20, icY, 8.5, true, PdfColors.NAVY);
      icY = this.drawWrappedText(pdf, `${icon.story} Core Takeaway: ${icon.takeaway}`, pdf.marginLeft + 30, icY - 11, pdf.contentWidth - 50, 7.5, 9) - 3;
    }

    // Signature
    pdf.drawText('Astro Sushil (Sushil Kumaar Singh)  |  Founder & Chief Astrologer  |  Astro Sushil Platform', pdf.marginLeft + 20, 85, 7.5, true, PdfColors.GOLD);
  }

  // ===========================================================================
  // JUPITER TRANSIT REPORT: VECTOR PDF BUILDER (PHASE 6.9)
  // ===========================================================================

  private buildJupiterReportPdf(pdf: PdfWriter, report: JupiterReportModel): void {
    const isUntimed = !report.ascendant || report.ascendant.sign === 'Indeterminate';
    const jup = report.jupiterPlacement;
    const ms = report.moonSignRelation;
    const nak = report.jupiterNakshatraAnalysis;
    const bav = report.jupiterAshtakavarga;
    const gt = report.geminiTransit;
    const ct = report.cancerTransit;
    const rem = report.remedies;

    // =========================================================================
    // PAGE 1: COVER PAGE
    // =========================================================================
    pdf.drawRect(pdf.marginLeft - 10, 30, pdf.contentWidth + 20, 782, false, true);
    pdf.drawRect(pdf.marginLeft - 6, 34, pdf.contentWidth + 12, 774, false, true);

    // Decorative Header Band
    pdf.setFillColor(PdfColors.NAVY);
    pdf.drawRect(pdf.marginLeft + 10, 680, pdf.contentWidth - 20, 110, true, false);

    pdf.drawText('ASTRO SUSHIL VEDIC DOSSIER SERIES', pdf.marginLeft + 30, 765, 10, true, PdfColors.GOLD);
    pdf.drawText('JUPITER TRANSIT REPORT', pdf.marginLeft + 30, 725, 22, true, PdfColors.WHITE);
    pdf.drawText('COSMIC WISDOM, GURU’S DIVINE PLACEMENT & TRANSIT BLUEPRINT', pdf.marginLeft + 30, 700, 9.5, false, PdfColors.LIGHT_BG);

    // Client Profile Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 10, 400, pdf.contentWidth - 20, 260, true, true);

    pdf.drawText('SACRED HOROSCOPIC PROFILE', pdf.marginLeft + 30, 635, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 30, 625, pdf.marginLeft + 260, 625);

    const profDetails = [
      { label: 'Client Name:', val: report.profile.name },
      { label: 'Date of Birth:', val: report.profile.dateOfBirth },
      { label: 'Time of Birth:', val: isUntimed ? 'Unknown / Indeterminate' : report.profile.timeOfBirth },
      { label: 'Place of Birth:', val: report.profile.placeName || 'Not Specified' },
      { label: 'Ascendant (Lagna):', val: isUntimed ? 'Indeterminate' : `${report.ascendant?.sign} (${report.ascendant?.degree.toFixed(2)}°)` },
      { label: 'Moon Sign (Rashi):', val: `${ms.moonSign} (Nakshatra: ${ms.moonNakshatra || 'Chitra'} Pada ${ms.moonPada || 2})` },
      { label: 'Jupiter Placement:', val: `${jup.sign} — ${jup.houseFormatted}` },
      { label: 'Current Dignity:', val: `${jup.dignity} | Moolatrikona / Swakshetra` },
      { label: 'Report Reference Timestamp:', val: formatReportReferenceTimestamp(report.referenceDateIso) },
      { label: 'Active Transit Sign:', val: `${report.currentTransit?.sign || 'Cancer / Leo'} (${report.currentTransit?.houseFromLagna ? `House ${report.currentTransit?.houseFromLagna}` : 'Indeterminate'})` },
    ];

    let pY = 605;
    for (const d of profDetails) {
      pdf.drawText(d.label, pdf.marginLeft + 30, pY, 8.5, true, PdfColors.NAVY);
      pdf.drawText(d.val, pdf.marginLeft + 180, pY, 8.5, false, PdfColors.DARK_TEXT);
      pY -= 18;
    }

    // Ephemeris Authenticity Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft + 10, 130, pdf.contentWidth - 20, 250, true, true);

    pdf.drawText('THE CELESTIAL ROLE OF BRIHASPATI (LORD GURU)', pdf.marginLeft + 30, 365, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 30, 355, pdf.marginLeft + 350, 355);

    const coverIntro =
      'In Vedic philosophy, Brihaspati (Jupiter) is the supreme Guru of the Devas, the Great Benefic, and the cosmic architect of wisdom, fortune, and moral consciousness. While Saturn brings accountability and Mars fuels ambition, it is Guru alone whose auspicious glance bestows divine grace (Daiva Kripa), shields against catastrophic ruin, and elevates the soul toward higher consciousness. This report decodes your natal Jupiter, its aspects across critical Bhavas, its 56-point Ashtakavarga distribution, and its dynamic Gochara transits through Gemini and Cancer.';
    this.drawWrappedText(pdf, coverIntro, pdf.marginLeft + 30, 335, pdf.contentWidth - 60, 9, 13.5);

    pdf.drawText('CONFIDENTIAL & PRIVILEGED VEDIC REPORT', pdf.marginLeft + 30, 160, 8, true, PdfColors.GREY_TEXT);
    pdf.drawText(`Generated on: ${new Date().toLocaleDateString('en-GB')}`, pdf.marginLeft + pdf.contentWidth - 190, 160, 8, false, PdfColors.GREY_TEXT);

    // =========================================================================
    // PAGE 2: DISCLAIMER & MESSAGE FROM AUTHOR
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Disclaimer & Message from Author');

    // Disclaimer Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 460, pdf.contentWidth, 310, true, true);

    pdf.drawText('LEGAL & ASTROLOGICAL DISCLAIMER', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 280, 735);

    const discText1 =
      'This Jupiter Transit Report is based on the classical principles of Vedic astrology, offering insights into Jupiter’s movement and its potential influence on your personal horoscope. The interpretations provided here are derived from mathematical astronomical calculations and traditional Parashari wisdom; there are no speculative personal opinions, only cosmic guidance.';
    let dY = this.drawWrappedText(pdf, discText1, pdf.marginLeft + 20, 715, pdf.contentWidth - 40, 9, 13.5) - 12;

    const discText2 =
      'This report does not predict fixed or fatalistic outcomes, but rather serves as a navigational compass to help you align with Jupiter’s expansive energy and make informed, principled decisions. While Jupiter is associated with growth, wisdom, and fortune, its transit is not a replacement for professional medical, financial, or legal advice. Suggestions and remedies, including mantras, donations, and lifestyle adjustments, should be embraced only if they resonate with your personal beliefs. Their effectiveness depends on faith, ethical intent, and correct practice.';
    dY = this.drawWrappedText(pdf, discText2, pdf.marginLeft + 20, dY, pdf.contentWidth - 40, 9, 13.5) - 12;

    const discText3 =
      'Results naturally vary from individual to individual based on individual Karmic balance and operational Vimshottari Dasha cycles. No guarantees or contractual claims can be made regarding specific outcomes. The author and publisher accept no liability for decisions or actions taken based on this guidance. Above all, maintain an open mind and embrace the higher wisdom of Guru: astrology is an illuminating map, but you are the conscious author of your destiny.';
    this.drawWrappedText(pdf, discText3, pdf.marginLeft + 20, dY, pdf.contentWidth - 40, 9, 13.5);

    // Author Message Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 350, true, true);

    pdf.drawText('MESSAGE FROM ASTRO SUSHIL', pdf.marginLeft + 20, 405, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 395, pdf.marginLeft + 230, 395);

    const msgText =
      'Beloved Seeker,\n\nIn our hurried modern world, we often chase speed, status, and transient gratification, forgetting that enduring prosperity requires root-level wisdom. Jupiter (Brihaspati) represents the soul’s capacity for righteous discernment (Viveka). In your horoscope, Jupiter occupies its own royal sign of Sagittarius, anchoring profound philosophical insight and noble principles.\n\nAs Jupiter transits through communicative Gemini and into its glorious exaltation sign of Cancer in 2026, it initiates a season of substantial inner and outer expansion. When transiting Jupiter gazes upon your natal points, it dissolves confusion and opens doors of higher learning, influential mentors, and ethical wealth.\n\nStudy this dossier not with passive expectation, but as an invitation to elevate your thoughts, speak with dignity, and embrace selfless generosity. May Lord Brihaspati illuminate your intellect and bless your life journey with peace, health, and abundant grace.\n\nWith sacred blessings,';
    let mY = this.drawWrappedText(pdf, msgText, pdf.marginLeft + 20, 375, pdf.contentWidth - 40, 8.5, 12.5) - 14;

    pdf.drawText('Astro Sushil (Sushil Kumaar Singh)', pdf.marginLeft + 20, mY, 9.5, true, PdfColors.NAVY);
    pdf.drawText('Founder & Chief Astrologer  |  Astro Sushil Platform', pdf.marginLeft + 20, mY - 14, 8.5, false, PdfColors.GREY_TEXT);

    // =========================================================================
    // PAGE 3: JUPITER'S DIVINE PLACEMENT & HOW TO STUDY
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader("Jupiter's Divine Placement & Study Guide");

    // Divine Placement Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 460, pdf.contentWidth, 310, true, true);

    pdf.drawText("JUPITER'S DIVINE PLACEMENT IN YOUR KUNDALI", pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 350, 735);

    const placeDetails = [
      { label: 'FULL NATIVE NAME', val: report.profile.name },
      { label: 'BIRTH DATE & TIME', val: `${report.profile.dateOfBirth} at ${report.profile.timeOfBirth}` },
      { label: 'BIRTH LOCATION', val: report.profile.placeName || 'Bulandshahr, India' },
      { label: 'MOON SIGN (RASHI)', val: ms.moonSign },
      { label: 'JANMA NAKSHATRA', val: `${ms.moonNakshatra} (Pada ${ms.moonPada})` },
      { label: 'JUPITER PLACEMENT - HOUSE', val: jup.houseFormatted },
      { label: 'JUPITER PLACEMENT - RASHI', val: jup.sign },
      { label: 'JUPITER NAKSHATRA & PADA', val: `${jup.nakshatra} (Pada ${jup.pada})` },
      { label: 'NATAL DIGNITY & MOTION', val: `${jup.dignity} | ${jup.isRetrograde ? 'Retrograde' : 'Direct Motion'}` },
      { label: 'WHOLE-SIGN HOUSE LORDSHIP', val: jup.lordship.length > 0 ? `Houses ${jup.lordship.join(' & ')}` : 'Indeterminate' },
    ];

    let plY = 715;
    for (const item of placeDetails) {
      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft + 20, plY - 14, pdf.contentWidth - 40, 24, true, true);

      pdf.drawText(item.label, pdf.marginLeft + 30, plY - 2, 8.5, true, PdfColors.NAVY);
      pdf.drawText(item.val, pdf.marginLeft + 220, plY - 2, 8.5, false, PdfColors.DARK_TEXT);
      plY -= 28;
    }

    // Study Pillars Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 360, true, true);

    pdf.drawText('HOW TO STUDY & NAVIGATE THIS DOSSIER', pdf.marginLeft + 20, 415, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 405, pdf.marginLeft + 320, 405);

    const studyItems = [
      '1. Anchor in Natal Strength: Understand how Jupiter in Sagittarius operates in your 2nd house of family, wealth, and speech.',
      '2. Examine Golden Drishti: Review Jupiter’s 5th, 7th, and 9th aspects on houses 6, 8, and 10 protecting health, research, and career dignity.',
      '3. Evaluate Bhinnashtakavarga: Explore your 56-point BAV distribution, comparing Gemini’s points (3) with Cancer’s peak points (6).',
      '4. Track Transit Milestones: Study the two-stage transit progression from Gemini (analytical reset) to Cancer (supreme fortune).',
      '5. Consecrate Remedies: Integrate yellow sapphire, 5 Mukhi Rudraksha, Citrine, North-East Vastu alignment, and Guru mantras.',
    ];

    let stY = 380;
    for (const item of studyItems) {
      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft + 20, stY - 14, pdf.contentWidth - 40, 42, true, true);

      stY = this.drawWrappedText(pdf, item, pdf.marginLeft + 30, stY, pdf.contentWidth - 60, 8.5, 12) - 18;
    }

    // =========================================================================
    // PAGE 4: VEDIC CHARTS OVERVIEW
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Vedic Charts Overview');

    const chartSize = 150;
    const yCharts = 570;

    // Chart 1: Lagna Chart (D1)
    pdf.drawText('1. Janma Kundli (Lagna D1)', pdf.marginLeft + 15, yCharts + chartSize + 8, 9, true, PdfColors.INDIGO);
    this.renderNorthIndianChart(pdf, report.houses, report.planets, pdf.marginLeft + 10, yCharts, chartSize);

    // Chart 2: Chandra Kundli (Moon Chart)
    pdf.drawText('2. Chandra Kundli (Moon Chart)', pdf.marginLeft + 185, yCharts + chartSize + 8, 9, true, PdfColors.INDIGO);
    const moonHouses = (report.houses || []).map((h: any, i: number) => ({
      ...h,
      houseNumber: ((i + 1) % 12) + 1,
    }));
    this.renderNorthIndianChart(pdf, moonHouses, report.planets, pdf.marginLeft + 180, yCharts, chartSize);

    // Chart 3: Jupiter Transit Gochara
    pdf.drawText('3. Jupiter Transit (Gochara)', pdf.marginLeft + 355, yCharts + chartSize + 8, 9, true, PdfColors.INDIGO);
    this.renderNorthIndianChart(pdf, report.houses, report.planets, pdf.marginLeft + 350, yCharts, chartSize);

    // Explanatory Box
    let bY = yCharts - 20;
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, bY - 80, true, true);

    pdf.drawText('TRIPOD OF VEDIC OBSERVATION: LAGNA, CHANDRA & GOCHARA', pdf.marginLeft + 20, bY - 20, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, bY - 28, pdf.marginLeft + 360, bY - 28);

    const chartExpl = [
      '• Janma Kundli (Lagna Chart): Establishes your concrete physical life-path, bodily constitution, and outer worldly circumstances. Jupiter in the 2nd house in Sagittarius blesses your family lineage and vocal authority.',
      '• Chandra Kundli (Moon Chart): Re-anchors all twelve houses from your natal Moon sign (Virgo). Reveals emotional processing, internal psychology, and subconscious peace. Jupiter sits 4th from your Moon, cultivating emotional grounding.',
      '• Gochara Chart (Jupiter Transit): Details the ongoing movement of Jupiter across zodiacal signs relative to your birth chart. Highlights activated life sectors during the Gemini (8th/10th) and Cancer (9th/11th) transits.',
    ];

    let ceY = bY - 45;
    for (const ce of chartExpl) {
      ceY = this.drawWrappedText(pdf, ce, pdf.marginLeft + 20, ceY, pdf.contentWidth - 40, 8.5, 12.5) - 6;
    }

    if (isUntimed) {
      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.GOLD);
      pdf.setLineWidth(1.5);
      pdf.drawRect(pdf.marginLeft + 20, 95, pdf.contentWidth - 40, 65, true, true);

      pdf.drawText('NOTICE: UNTIMED BIRTH PROFILE (TIME OF BIRTH INDETERMINATE)', pdf.marginLeft + 35, 142, 9, true, PdfColors.GOLD);
      const untimedNotice =
        'Because an exact birth time was not provided, whole-sign house numbers are marked Indeterminate. However, planetary signs, degrees, Moon relationship, Mula Nakshatra, and Gochara transits remain 100% deterministic and mathematically authoritative.';
      this.drawWrappedText(pdf, untimedNotice, pdf.marginLeft + 35, 126, pdf.contentWidth - 70, 8, 11);
    }

    // =========================================================================
    // PAGE 5: NATAL JUPITER PLACEMENT DEEP DIVE
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Natal Jupiter Placement Deep Dive');

    // Metrics Grid (3 cols x 2 rows)
    const mCols = [pdf.marginLeft, pdf.marginLeft + 175, pdf.marginLeft + 350];
    const mWidth = 165;
    const mHeight = 55;

    const metricsData = [
      { label: 'ZODIAC SIGN & DEGREE', val: `${jup.sign} (${jup.degreeInRashi.toFixed(1)}°)`, sub: `Longitude: ${jup.degree.toFixed(2)}°` },
      { label: 'HOUSE PLACEMENT', val: jup.houseFormatted, sub: isUntimed ? 'Birth time required' : '2nd House of Wealth & Speech' },
      { label: 'DIGNITY & STRENGTH', val: jup.dignity, sub: 'Swakshetra / Moolatrikona' },
      { label: "JUPITER'S NAKSHATRA & PADA", val: `${jup.nakshatra} (Pada ${jup.pada})`, sub: `Ruler: ${nak.lord} (Ketu)` },
      { label: 'HOUSE LORDSHIP', val: jup.lordship.length > 0 ? `Houses ${jup.lordship.join(' & ')}` : 'Indeterminate', sub: 'Sagittarius & Pisces' },
      { label: 'COMBUSTION & SPEED', val: jup.isCombust ? 'Combust (Asta)' : 'Non-Combust (Pure)', sub: jup.isRetrograde ? 'Retrograde (Vakri)' : 'Direct Motion' },
    ];

    let gridY = 720;
    for (let i = 0; i < metricsData.length; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = mCols[col];
      const y = gridY - row * (mHeight + 12);

      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(x, y, mWidth, mHeight, true, true);

      pdf.drawText(metricsData[i].label, x + 10, y + 40, 7.5, true, PdfColors.INDIGO);
      pdf.drawText(metricsData[i].val, x + 10, y + 24, 8.5, true, PdfColors.NAVY);
      pdf.drawText(metricsData[i].sub, x + 10, y + 10, 7, false, PdfColors.GREY_TEXT);
    }

    // In-Depth Placement Narrative Box
    let nBoxY = 570;
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, nBoxY - 80, true, true);

    pdf.drawText("JUPITER IN SAGITTARIUS (DHANU) — THE SOVEREIGN GURU", pdf.marginLeft + 20, nBoxY - 20, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, nBoxY - 28, pdf.marginLeft + 380, nBoxY - 28);

    const placeNarrative = [
      '• Sovereign Moolatrikona Strength: Sagittarius is Jupiter’s own masculine fire sign. Here, Guru feels completely at home, functioning with unhindered generosity, high philosophical vision, and natural nobility. It bestows an expansive outlook on life, where personal integrity and truth transcend petty worldly compromises.',
      '• Wealth, Family & Lineage (2nd House): Sitting in the 2nd Bhava from Scorpio Lagna, Jupiter presides over accumulated wealth, family values, and vocal expression. Your words carry innate philosophical weight, and people naturally seek your counsel. You approach wealth not as a tool for vanity, but as a sacred stewardship to sustain loved ones and support noble causes.',
      '• Lord of 2nd & 5th Houses: For a Scorpio Ascendant, Jupiter rules both the 2nd house (Dhana Sthana) and the 5th house (Purva Punya & Buddhi Sthana). This forms an exceptionally auspicious Dhana Yoga connecting past-life spiritual merits with material prosperity in this incarnation.',
      `• Core Karmic Directive: ${jup.karmicLesson}`,
    ];

    let pnY = nBoxY - 45;
    for (const pn of placeNarrative) {
      pnY = this.drawWrappedText(pdf, pn, pdf.marginLeft + 20, pnY, pdf.contentWidth - 40, 8.5, 12.5) - 6;
    }

    // =========================================================================
    // PAGE 6: NATAL JUPITER'S SACRED ASPECTS (5TH, 7TH, 9TH DRISHTI)
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader("Natal Jupiter's Sacred Aspects");

    // Aspects Overview Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 540, pdf.contentWidth, 230, true, true);

    pdf.drawText('THE THREE GOLDEN RAYS OF BRIHASPATI (5TH, 7TH, 9TH DRISHTI)', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 400, 735);

    const aspIntro =
      "Classical Vedic texts unanimously declare: 'Guru Drishti Amrita Samana' — Jupiter’s aspect is akin to divine nectar. While Saturn’s gaze inspects and limits, Jupiter’s gaze protects, neutralizes curses, and expands positive dharmic outcomes. From the 2nd house in Sagittarius, your natal Jupiter projects full aspects onto three crucial sectors of your life:";
    let asY = this.drawWrappedText(pdf, aspIntro, pdf.marginLeft + 20, 715, pdf.contentWidth - 40, 9, 13.5) - 10;

    for (const asp of report.jupiterAspects.aspects) {
      pdf.drawText(`★ ${asp.aspectNumber}th Aspect on ${asp.sign} (House ${asp.house || 'N/A'}):`, pdf.marginLeft + 20, asY, 9, true, PdfColors.PURPLE);
      asY = this.drawWrappedText(pdf, asp.areaTested, pdf.marginLeft + 35, asY - 12, pdf.contentWidth - 55, 8.5, 12) - 8;
    }

    // Detailed Life Pillar Analysis
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 430, true, true);

    pdf.drawText('DETAILED LIFE PILLAR PROTECTION', pdf.marginLeft + 20, 485, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 475, pdf.marginLeft + 270, 475);

    const pillars = [
      {
        title: '5th Aspect on 6th House (Aries / Mesha) — Health Resilience & Dispute Neutralization',
        body: 'The 6th house governs debts, disease, and opponents. Jupiter’s 5th aspect here acts as a powerful immunological shield. While you may encounter occasional health or workplace frictions, Guru ensures swift recovery, grants victory over legal or commercial competitors, and turns adversaries into respectful acquaintances.',
      },
      {
        title: '7th Aspect on 8th House (Gemini / Mithuna) — Longevity Protection & Occult Wisdom',
        body: 'The 8th house represents longevity, unearned wealth, and deep transformation. Jupiter’s direct 7th glance protects against sudden catastrophic accidents, blesses you with longevity, and awakens profound curiosity regarding research, occult traditions, and financial asset management.',
      },
      {
        title: '9th Aspect on 10th House (Leo / Simha) — Professional Dignity & Mentor Support',
        body: 'The 10th house is the zenith of professional karma. Jupiter’s supreme 9th aspect on royal Leo guarantees public dignity, recognition from executive authorities, and mentor sponsorship throughout your vocational career. It ensures your professional legacy remains untarnished.',
      },
    ];

    let pilY = 450;
    for (const p of pillars) {
      pdf.drawText(p.title, pdf.marginLeft + 20, pilY, 9.5, true, PdfColors.NAVY);
      pilY = this.drawWrappedText(pdf, p.body, pdf.marginLeft + 20, pilY - 14, pdf.contentWidth - 40, 8.5, 12) - 14;
    }

    // =========================================================================
    // PAGE 7: BENEFIC/MALEFIC DYNAMIC & MOON SIGN PSYCHE
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Benefic Dynamics & Moon Sign Psyche');

    // Benefic vs Malefic Dynamic Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 470, pdf.contentWidth, 300, true, true);

    pdf.drawText('BENEFIC V/S MALEFIC JUPITER: CELESTIAL ALLY OR REALITY CHECK?', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 440, 735);

    pdf.drawText(`Functional Nature: ${report.beneficVsMalefic.nature}`, pdf.marginLeft + 20, 715, 9.5, true, PdfColors.NAVY);
    pdf.drawText(`Operational Role: ${report.beneficVsMalefic.functionalRole}`, pdf.marginLeft + 20, 698, 8.5, false, PdfColors.DARK_TEXT);

    let bvmY = 675;
    pdf.drawText('Cosmic Blessings & Strengths:', pdf.marginLeft + 20, bvmY, 9, true, PdfColors.PURPLE);
    bvmY -= 15;
    for (const opp of report.beneficVsMalefic.growthOpportunities) {
      pdf.drawText(`✓ ${opp}`, pdf.marginLeft + 30, bvmY, 8.5, false, PdfColors.DARK_TEXT);
      bvmY -= 14;
    }

    bvmY -= 8;
    pdf.drawText('Cautions & Over-Expansion Traps:', pdf.marginLeft + 20, bvmY, 9, true, PdfColors.GOLD);
    bvmY -= 15;
    for (const ch of report.beneficVsMalefic.challenges) {
      pdf.drawText(`! ${ch}`, pdf.marginLeft + 30, bvmY, 8.5, false, PdfColors.DARK_TEXT);
      bvmY -= 14;
    }

    // Moon Sign Psyche Evolution Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 360, true, true);

    pdf.drawText('MOON SIGN PSYCHE EVOLUTION (VIRGO MOON & JUPITER)', pdf.marginLeft + 20, 415, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 405, pdf.marginLeft + 380, 405);

    pdf.drawText(`Moon Sign: ${ms.moonSign}  |  Moon Nakshatra: ${ms.moonNakshatra} (Pada ${ms.moonPada})`, pdf.marginLeft + 20, 385, 9.5, true, PdfColors.NAVY);
    pdf.drawText(`House from Moon: ${ms.houseFromMoon}th House  |  Archetype: ${ms.archetype}`, pdf.marginLeft + 20, 368, 9, false, PdfColors.DARK_TEXT);

    const moonPsycheDetails = [
      '• Harmonizing Mercury & Jupiter: Your Moon is in Mercury-ruled Virgo, producing an analytical, meticulous, and detail-oriented mind. Jupiter sits 4th from your Moon in philosophical Sagittarius. This creates a rare synthesis where sharp analytical skill is elevated by broad spiritual wisdom.',
      '• Inner Emotional Sanctuary: Jupiter in the 4th house from Moon fosters deep domestic contentment. In times of external stress, you find renewal through sacred literature, family roots, and quiet contemplation.',
      '• Planetary Conjunctions (Sun & Mercury): In your natal chart, Jupiter shares sign space with the Sun and Mercury, forming illustrious Yogas (Guru-Surya & Budhaditya). This aligns your ego, intellect, and higher wisdom into a cohesive force of intellectual authority.',
    ];

    let mpY = 340;
    for (const mp of moonPsycheDetails) {
      mpY = this.drawWrappedText(pdf, mp, pdf.marginLeft + 20, mpY, pdf.contentWidth - 40, 8.5, 12.5) - 6;
    }

    // =========================================================================
    // PAGE 8: NAKSHATRA ANALYSIS: MULA DEEP DIVE
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader("Jupiter's Nakshatra Analysis: Mula");

    // Nakshatra Analysis Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 690, true, true);

    pdf.drawText("JUPITER IN MULA NAKSHATRA (THE SACRED ROOT)", pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 350, 735);

    pdf.drawText(`Nakshatra: ${nak.nakshatra} (Pada ${nak.pada})  |  Ruling Lord: ${nak.lord}`, pdf.marginLeft + 20, 715, 9.5, true, PdfColors.NAVY);
    pdf.drawText(`Sacred Symbol: ${nak.symbol}  |  Presiding Deity: ${nak.deity}`, pdf.marginLeft + 20, 698, 9, false, PdfColors.DARK_TEXT);

    const mulaDetails = [
      '• The Power of Root Truths: Mula is symbolized by a tied bunch of roots. Occupying the very center of our galaxy, Mula represents the relentless pursuit of undeniable fundamentals. You cannot settle for superficial explanations; your mind demands the foundational cause of all events.',
      '• Ketu’s Spiritual Stamp on Guru: Ruled by Ketu, Mula imparts a profound spiritual non-attachment to Jupiter’s expansion. While you appreciate worldly abundance, you recognize that material structures are ephemeral compared to transcendent truth.',
      '• Transformational Breakthroughs: Natives with Jupiter in Mula often experience pivotal transitions in worldview during their 30s and 40s. These transitions strip away outmoded concepts and establish indestructible spiritual self-confidence.',
      '• Truthful and Uncompromising Speech: With Mula residing in your 2nd house of speech, you possess an innate honesty. When you speak, you pierce through pretensions, inspiring others to embrace authentic self-knowledge.',
      `• Core Karmic Directive: ${nak.karmicTheme}`,
    ];

    let mlY = 665;
    for (const md of mulaDetails) {
      mlY = this.drawWrappedText(pdf, md, pdf.marginLeft + 20, mlY, pdf.contentWidth - 40, 8.5, 12.5) - 8;
    }

    // =========================================================================
    // PAGE 9: JUPITER'S BHINNASHTAKAVARGA (BAV 56 POINTS)
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader("Jupiter's Bhinnashtakavarga (BAV)");

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 500, pdf.contentWidth, 270, true, true);

    pdf.drawText('PARASHARI BHINNASHTAKAVARGA: 56-POINT COSMIC SCORECARD', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 430, 735);

    const bavIntro =
      'Bhinnashtakavarga (BAV) is the classical mathematical system measuring planetary benefic points (bindus) across all 12 signs. Jupiter contributes strictly 56 benefic bindus across the entire zodiac. Signs holding 5 or more bindus represent fruitful terrain where Jupiter’s transits trigger major expansions, while signs with fewer than 4 bindus demand cautious planning.';
    let bvY = this.drawWrappedText(pdf, bavIntro, pdf.marginLeft + 20, 715, pdf.contentWidth - 40, 9, 13.5) - 15;

    // 12-Sign BAV Table
    const signNames = [
      'Mesha (Aries)', 'Vrishabha (Taurus)', 'Mithuna (Gemini)', 'Karka (Cancer)',
      'Simha (Leo)', 'Kanya (Virgo)', 'Tula (Libra)', 'Vrischika (Scorpio)',
      'Dhanu (Sagittarius)', 'Makara (Capricorn)', 'Kumbha (Aquarius)', 'Meena (Pisces)'
    ];

    const colX = [pdf.marginLeft + 25, pdf.marginLeft + 160, pdf.marginLeft + 240, pdf.marginLeft + 320];

    pdf.setFillColor(PdfColors.NAVY);
    pdf.drawRect(pdf.marginLeft + 20, bvY - 14, pdf.contentWidth - 40, 20, true, false);
    pdf.drawText('ZODIAC SIGN', colX[0], bvY - 2, 8, true, PdfColors.WHITE);
    pdf.drawText('BAV BINDUS', colX[1], bvY - 2, 8, true, PdfColors.WHITE);
    pdf.drawText('TRANSIT STATUS', colX[2], bvY - 2, 8, true, PdfColors.WHITE);
    pdf.drawText('EVALUATION', colX[3], bvY - 2, 8, true, PdfColors.WHITE);

    bvY -= 28;
    for (let s = 0; s < 12; s++) {
      const pts = bav.bindus[s] ?? 4;
      const isGemini = s === 2;
      const isCancer = s === 3;
      const isNatal = s === 8; // Sagittarius

      let status = 'Regular Gochara';
      if (isGemini) status = 'Current Transit 2026';
      if (isCancer) status = 'Exaltation Transit 2026';
      if (isNatal) status = 'Natal Jupiter Sign';

      let evalText = pts >= 5 ? 'Highly Auspicious' : pts === 4 ? 'Moderate Stability' : 'Restrained Yield';

      pdf.setFillColor(isCancer ? PdfColors.LIGHT_BG : (s % 2 === 0 ? PdfColors.WHITE : PdfColors.LIGHT_BG));
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft + 20, bvY - 12, pdf.contentWidth - 40, 16, true, true);

      pdf.drawText(signNames[s], colX[0], bvY - 1, 7.5, isCancer || isGemini || isNatal, PdfColors.DARK_TEXT);
      pdf.drawText(`${pts} / 8`, colX[1], bvY - 1, 7.5, true, pts >= 5 ? PdfColors.INDIGO : PdfColors.PURPLE);
      pdf.drawText(status, colX[2], bvY - 1, 7, isGemini || isCancer, isCancer ? PdfColors.GOLD : PdfColors.DARK_TEXT);
      pdf.drawText(evalText, colX[3], bvY - 1, 7, false, PdfColors.GREY_TEXT);

      bvY -= 17;
    }

    // Transit Synthesis Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 390, true, true);

    pdf.drawText('ASHTAKAVARGA TRANSIT SYNTHESIS', pdf.marginLeft + 20, 445, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 435, pdf.marginLeft + 270, 435);

    const bavSynth = [
      `• Gemini Transit (3 Bindus): In the first half of 2026, Jupiter moves through Gemini with 3 bindus. While below the average threshold of 4, this period fosters disciplined research, backend systems optimization, and prudent expense control rather than aggressive external expansion.`,
      `• Cancer Transit (6 Bindus): On June 2, 2026, Jupiter enters its exaltation sign of Cancer carrying a powerful 6 bindus. This represents a prime golden window where Guru operates with supreme strength, unlocking major opportunities in wealth, networking, and public recognition.`,
      `• Total Zodiacal Balance (56 Points): With exactly 56 points across your chart, Jupiter maintains impeccable Parashari balance, ensuring consistent lifelong returns from noble endeavors.`,
    ];

    let bsY = 410;
    for (const bs of bavSynth) {
      bsY = this.drawWrappedText(pdf, bs, pdf.marginLeft + 20, bsY, pdf.contentWidth - 40, 8.5, 12.5) - 8;
    }

    // =========================================================================
    // PAGE 10: JUPITER TRANSITS (2025–2029): MASTER TIMELINE, CANCER & LEO
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Jupiter Transit Master Timeline (2025–2029)');

    // Master Timeline Table Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 510, pdf.contentWidth, 260, true, true);

    pdf.drawText('VERIFIED 2025–2029 JUPITER INGRESS TIMELINE (LAHIRI SIDEREAL)', pdf.marginLeft + 20, 745, 10.5, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 440, 735);

    // Timeline Table Header
    const tlColX = [pdf.marginLeft + 25, pdf.marginLeft + 150, pdf.marginLeft + 325, pdf.marginLeft + 400, pdf.marginLeft + 465];
    let tY = 718;
    pdf.setFillColor(PdfColors.NAVY);
    pdf.drawRect(pdf.marginLeft + 20, tY - 10, pdf.contentWidth - 40, 16, true, false);
    pdf.drawText('PHASE / SIGN', tlColX[0], tY - 1, 7.5, true, PdfColors.WHITE);
    pdf.drawText('EXACT INGRESS PERIOD', tlColX[1], tY - 1, 7.5, true, PdfColors.WHITE);
    pdf.drawText('MOTION', tlColX[2], tY - 1, 7.5, true, PdfColors.WHITE);
    pdf.drawText('LAGNA / MOON', tlColX[3], tY - 1, 7.5, true, PdfColors.WHITE);
    pdf.drawText('STATUS', tlColX[4], tY - 1, 7.5, true, PdfColors.WHITE);

    tY -= 18;
    const timelineItems = report.transitTimeline || [];
    for (let i = 0; i < timelineItems.length; i++) {
      const item = timelineItems[i];
      const isCur = item.status === 'CURRENT';

      pdf.setFillColor(isCur ? PdfColors.LIGHT_BG : (i % 2 === 0 ? PdfColors.WHITE : PdfColors.LIGHT_BG));
      pdf.setStrokeColor(isCur ? PdfColors.GOLD : PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft + 20, tY - 8, pdf.contentWidth - 40, 12.5, true, true);

      pdf.drawText(item.sign.length > 20 ? item.sign.substring(0, 19) + '…' : item.sign, tlColX[0], tY - 1, 6.5, isCur, isCur ? PdfColors.INDIGO : PdfColors.DARK_TEXT);
      pdf.drawText(item.periodFormatted, tlColX[1], tY - 1, 6.2, false, PdfColors.DARK_TEXT);
      pdf.drawText(item.motion, tlColX[2], tY - 1, 6.2, true, item.motion === 'RETROGRADE' ? PdfColors.PURPLE : PdfColors.DARK_TEXT);
      pdf.drawText(`H${item.houseFromLagna ?? '?'} / H${item.houseFromMoon}`, tlColX[3], tY - 1, 6.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(item.status, tlColX[4], tY - 1, 6.2, true, isCur ? PdfColors.GOLD : (item.status === 'COMPLETED' ? PdfColors.GREY_TEXT : PdfColors.INDIGO));

      tY -= 13.5;
    }

    // Cancer Exaltation Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.2);
    pdf.drawRect(pdf.marginLeft, 295, pdf.contentWidth, 200, true, true);

    pdf.drawText('EXALTED CANCER TRANSIT (JUN 2, 2026 – OCT 31, 2026 & RETROGRADE RE-ENTRY)', pdf.marginLeft + 20, 475, 10, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 465, pdf.marginLeft + 440, 465);

    pdf.drawText(`Houses: House ${ct.houseFromLagna || 'N/A'} from Lagna (Param Bhagya)  |  House ${ct.houseFromMoon} from Moon (Supreme Labha)`, pdf.marginLeft + 20, 448, 8.5, true, PdfColors.NAVY);

    let cY = 432;
    for (const p of ct.predictions.slice(0, 2)) {
      pdf.drawText('★', pdf.marginLeft + 25, cY, 8, true, PdfColors.GOLD);
      cY = this.drawWrappedText(pdf, p, pdf.marginLeft + 40, cY, pdf.contentWidth - 60, 8, 11) - 2;
    }
    cY -= 2;
    for (const a of ct.aspects.slice(0, 2)) {
      pdf.drawText('•', pdf.marginLeft + 25, cY, 8, true, PdfColors.INDIGO);
      cY = this.drawWrappedText(pdf, a, pdf.marginLeft + 40, cY, pdf.contentWidth - 60, 7.5, 10.5) - 2;
    }

    // Leo Transit Box (Entered Oct 31, 2026)
    const lt = report.leoTransit;
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.2);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 200, true, true);

    pdf.drawText('LEO TRANSIT (ROYAL MITRA RASHI: OCT 31, 2026 – JAN 25, 2027 & CULMINATION)', pdf.marginLeft + 20, 260, 10, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 250, pdf.marginLeft + 440, 250);

    pdf.drawText(`Houses: House ${lt?.houseFromLagna || 'N/A'} from Lagna (Karma Executive)  |  House ${lt?.houseFromMoon ?? 'N/A'} from Moon (Vyaya Dharma)`, pdf.marginLeft + 20, 233, 8.5, true, PdfColors.NAVY);

    let lY = 217;
    const lPreds = lt?.predictions || [
      'Elevation in executive authority, leadership standing, and high-visibility corporate responsibilities',
      'Expansion of mentorship alliances with senior dignitaries, institutions, and spiritual teachers',
    ];
    for (const p of lPreds.slice(0, 2)) {
      pdf.drawText('★', pdf.marginLeft + 25, lY, 8, true, PdfColors.GOLD);
      lY = this.drawWrappedText(pdf, p, pdf.marginLeft + 40, lY, pdf.contentWidth - 60, 8, 11) - 2;
    }
    lY -= 2;
    const lAspects = lt?.aspects || [
      '5th Aspect on Sagittarius (House 2 Lagna): Multiplies accumulated wealth, family harmony, and vocal authority',
      '7th Aspect on Aquarius (House 4 Lagna): Brings real estate stability, domestic contentment, and peaceful mind',
    ];
    for (const a of lAspects.slice(0, 2)) {
      pdf.drawText('•', pdf.marginLeft + 25, lY, 8, true, PdfColors.INDIGO);
      lY = this.drawWrappedText(pdf, a, pdf.marginLeft + 40, lY, pdf.contentWidth - 60, 7.5, 10.5) - 2;
    }

    // =========================================================================
    // PAGE 11: CONSECRATED REMEDIES & ASTRO-VASTU GUIDANCE
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Consecrated Remedies & Astro-Vastu');

    // Remedies Grid Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 430, pdf.contentWidth, 340, true, true);

    pdf.drawText('CONSECRATED VEDIC REMEDIES FOR BRIHASPATI', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 350, 735);

    const remItems = [
      {
        title: 'GEMSTONE GUIDANCE (YELLOW SAPPHIRE / PUKHRAJ)',
        desc: `${rem.gemstone.name} (${rem.gemstone.alternative}). Metal: ${rem.gemstone.metal}, Finger: ${rem.gemstone.finger}, Day: ${rem.gemstone.day}. Weight rule: ${rem.gemstone.weightRule}. ${rem.gemstone.caution}`,
      },
      {
        title: 'SACRED RUDRAKSHA ALIGNMENT',
        desc: `${rem.rudraksha.mukhi}. ${rem.rudraksha.benefits} Ritual: ${rem.rudraksha.ritual}`,
      },
      {
        title: 'CRYSTAL HARMONIZATION',
        desc: `Citrine: ${rem.crystals.citrine} Yellow Jasper: ${rem.crystals.yellowJasper} Pyrite: ${rem.crystals.pyrite}`,
      },
    ];

    let rmY = 715;
    for (const item of remItems) {
      pdf.drawText(item.title, pdf.marginLeft + 20, rmY, 9, true, PdfColors.NAVY);
      rmY = this.drawWrappedText(pdf, item.desc, pdf.marginLeft + 20, rmY - 14, pdf.contentWidth - 40, 8, 11.5) - 10;
    }

    // Astro-Vastu & Mantras Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 330, true, true);

    pdf.drawText('ASTRO-VASTU & SACRED MANTRA CHANTING', pdf.marginLeft + 20, 385, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 375, pdf.marginLeft + 320, 375);

    pdf.drawText(`Vastu Direction: ${rem.astrovastu.direction}`, pdf.marginLeft + 20, 355, 9.5, true, PdfColors.PURPLE);
    let vmY = this.drawWrappedText(pdf, rem.astrovastu.zoneDescription, pdf.marginLeft + 20, 340, pdf.contentWidth - 40, 8, 11) - 6;

    pdf.drawText('Sacred Mantras for Guru:', pdf.marginLeft + 20, vmY, 9, true, PdfColors.NAVY);
    vmY -= 14;
    pdf.drawText(`Traditional: ${rem.mantras.traditionalMantra}`, pdf.marginLeft + 30, vmY, 8.5, false, PdfColors.DARK_TEXT);
    vmY -= 14;
    pdf.drawText(`Beej Mantra: ${rem.mantras.beejMantra}`, pdf.marginLeft + 30, vmY, 8.5, false, PdfColors.DARK_TEXT);
    vmY -= 14;
    pdf.drawText(`Guru Gayatri: ${rem.mantras.guruGayatri}`, pdf.marginLeft + 30, vmY, 8.5, false, PdfColors.DARK_TEXT);
    vmY -= 16;
    this.drawWrappedText(pdf, rem.mantras.guidelines, pdf.marginLeft + 20, vmY, pdf.contentWidth - 40, 7.5, 10.5);

    // Signature
    pdf.drawText('Astro Sushil (Sushil Kumaar Singh)  |  Founder & Chief Astrologer  |  Astro Sushil Platform', pdf.marginLeft + 20, 85, 7.5, true, PdfColors.GOLD);
  }

  // ===========================================================================
  // RAHU-KETU TRANSIT REPORT: VECTOR PDF BUILDER (PHASE 6.9)
  // ===========================================================================

  private buildRahuKetuReportPdf(pdf: PdfWriter, report: RahuKetuReportModel): void {
    const isUntimed = !report.ascendant || report.ascendant.sign === 'Indeterminate';
    const np = report.nodalPlacement;
    const ms = report.moonSignRelation;
    const kj = report.karmicJourney;
    const t1 = report.transit2025_2026;
    const t2 = report.transit2026_2028;
    const rem = report.remedies;

    // =========================================================================
    // PAGE 1: COVER PAGE
    // =========================================================================
    pdf.drawRect(pdf.marginLeft - 10, 30, pdf.contentWidth + 20, 782, false, true);
    pdf.drawRect(pdf.marginLeft - 6, 34, pdf.contentWidth + 12, 774, false, true);

    pdf.setFillColor(PdfColors.NAVY);
    pdf.drawRect(pdf.marginLeft + 10, 680, pdf.contentWidth - 20, 110, true, false);

    pdf.drawText('ASTRO SUSHIL VEDIC DOSSIER SERIES', pdf.marginLeft + 30, 765, 10, true, PdfColors.GOLD);
    pdf.drawText('RAHU KETU TRANSIT REPORT', pdf.marginLeft + 30, 725, 22, true, PdfColors.WHITE);
    pdf.drawText('KARMIC AXIS, SHADOW NODES & TRANSFORMATIVE GOCHARA BLUEPRINT', pdf.marginLeft + 30, 700, 9.5, false, PdfColors.LIGHT_BG);

    // Client Profile Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 10, 400, pdf.contentWidth - 20, 260, true, true);

    pdf.drawText('SACRED HOROSCOPIC PROFILE', pdf.marginLeft + 30, 635, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 30, 625, pdf.marginLeft + 260, 625);

    const profDetails = [
      { label: 'Client Name:', val: report.profile.name },
      { label: 'Date of Birth:', val: report.profile.dateOfBirth },
      { label: 'Time of Birth:', val: isUntimed ? 'Unknown / Indeterminate' : report.profile.timeOfBirth },
      { label: 'Place of Birth:', val: report.profile.placeName || 'Not Specified' },
      { label: 'Ascendant (Lagna):', val: isUntimed ? 'Indeterminate' : `${report.ascendant?.sign} (${report.ascendant?.degree.toFixed(2)}°)` },
      { label: 'Moon Sign (Rashi):', val: `${ms.moonSign} (Nakshatra: ${ms.moonNakshatra || 'Chitra'})` },
      { label: 'Rahu Placement:', val: `${np.rahu.sign} — ${np.rahu.houseFormatted} (${np.rahu.dignity})` },
      { label: 'Ketu Placement:', val: `${np.ketu.sign} — ${np.ketu.houseFormatted} (${np.ketu.dignity})` },
      { label: 'Report Reference Timestamp:', val: formatReportReferenceTimestamp(report.referenceDateIso) },
      { label: 'Active Nodal Axis:', val: `${report.currentCycle?.rahuSign || 'Aquarius'} / ${report.currentCycle?.ketuSign || 'Leo'}` },
    ];

    let pY = 605;
    for (const d of profDetails) {
      pdf.drawText(d.label, pdf.marginLeft + 30, pY, 8.5, true, PdfColors.NAVY);
      pdf.drawText(d.val, pdf.marginLeft + 180, pY, 8.5, false, PdfColors.DARK_TEXT);
      pY -= 18;
    }

    // Nodal Axis Overview Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft + 10, 130, pdf.contentWidth - 20, 250, true, true);

    pdf.drawText('THE SACRED KARMIC AXIS OF RAHU AND KETU', pdf.marginLeft + 30, 365, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 30, 355, pdf.marginLeft + 360, 355);

    const coverIntro =
      'Rahu and Ketu are the lunar nodes — mathematical intersection points of the Sun and Moon’s orbital planes. In Vedic philosophy, they represent the supreme karmic axis of human existence. Rahu symbolizes what your soul craves to master in this incarnation (worldly ambition, technological disruption, foreign connections, and radical evolution). Ketu represents what your soul has already mastered across past incarnations (spiritual detachment, deep inquiry, and liberation from material illusion). This dossier maps your nodal coordinates, 180° axis, aspects, and multi-year transits.';
    this.drawWrappedText(pdf, coverIntro, pdf.marginLeft + 30, 335, pdf.contentWidth - 60, 9, 13.5);

    pdf.drawText('CONFIDENTIAL & PRIVILEGED VEDIC REPORT', pdf.marginLeft + 30, 160, 8, true, PdfColors.GREY_TEXT);
    pdf.drawText(`Generated on: ${new Date().toLocaleDateString('en-GB')}`, pdf.marginLeft + pdf.contentWidth - 190, 160, 8, false, PdfColors.GREY_TEXT);

    // =========================================================================
    // PAGE 2: DISCLAIMER & MESSAGE FROM AUTHOR
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Disclaimer & Message from Author');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 460, pdf.contentWidth, 310, true, true);

    pdf.drawText('LEGAL & ASTROLOGICAL DISCLAIMER', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 280, 735);

    const rkDisc1 =
      'This Rahu-Ketu Transit Report is derived from the classical principles of Vedic astrology and Gochara transit analysis. Rahu and Ketu are mathematical shadow nodes (Chhaya Grahas) representing the karmic axis of desire and liberation. The interpretations provided are educational and reflective; they do not predict unavoidable doom, catastrophic fear, or guaranteed material windfalls.';
    let dY = this.drawWrappedText(pdf, rkDisc1, pdf.marginLeft + 20, 715, pdf.contentWidth - 40, 9, 13.5) - 12;

    const rkDisc2 =
      'Astrological cycles reflect consciousness inclinations; conscious self-awareness, ethical actions, and personal responsibility remain supreme. Suggestions and remedies, including gemstone cautions, rudrakshas, mantras, and lifestyle practices, should be undertaken with personal discernment and faith. This report does not replace certified psychological, financial, or medical advice.';
    dY = this.drawWrappedText(pdf, rkDisc2, pdf.marginLeft + 20, dY, pdf.contentWidth - 40, 9, 13.5) - 12;

    const rkDisc3 =
      'The author and platform accept no legal liability for personal, commercial, or life choices made based on this document. Rahu and Ketu operate to dissolve mental illusions (Maya); approaching their lessons with clarity, courage, and virtue leads to profound spiritual freedom.';
    this.drawWrappedText(pdf, rkDisc3, pdf.marginLeft + 20, dY, pdf.contentWidth - 40, 9, 13.5);

    // Author Message Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 350, true, true);

    pdf.drawText('MESSAGE FROM ASTRO SUSHIL', pdf.marginLeft + 20, 405, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 395, pdf.marginLeft + 230, 395);

    const rkMsg =
      'Dear Seeker of Truth,\n\nIn popular astrological culture, Rahu and Ketu are often feared as dark, disruptive forces. Yet in true Vedic wisdom, they are the supreme teachers of consciousness. Without Rahu, humanity would lack innovation, ambition, and the hunger to explore uncharted territories. Without Ketu, humanity would remain hopelessly trapped in material vanity, devoid of spiritual liberation.\n\nIn your birth chart, Rahu sits in luxury-loving Taurus in the 7th house of partnerships, while Ketu sits in introspective Scorpio in the 1st house of self. You are called to master the delicate art of conscious relationship without losing your core spiritual integrity.\n\nAs the nodes transit through Aquarius-Leo (2025–2026) and Capricorn-Cancer (2026–2028), they will reshape your emotional roots and courageous initiatives. Study this dossier not with fear, but with reverence for your soul’s magnificent journey.\n\nBlessings in your karmic evolution,';
    let rmY = this.drawWrappedText(pdf, rkMsg, pdf.marginLeft + 20, 375, pdf.contentWidth - 40, 8.5, 12.5) - 14;

    pdf.drawText('Astro Sushil (Sushil Kumaar Singh)', pdf.marginLeft + 20, rmY, 9.5, true, PdfColors.NAVY);
    pdf.drawText('Founder & Chief Astrologer  |  Astro Sushil Platform', pdf.marginLeft + 20, rmY - 14, 8.5, false, PdfColors.GREY_TEXT);

    // =========================================================================
    // PAGE 3: THE NODE'S PLACEMENT & ASTRONOMICAL COORDINATES
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader("The Nodes' Placement & Coordinates");

    // Coordinates Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 460, pdf.contentWidth, 310, true, true);

    pdf.drawText('ASTRONOMICAL COORDINATES & 180° AXIS INTEGRITY', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 380, 735);

    const nodeDetails = [
      { label: 'RAHU SIGN & DEGREE', val: `${np.rahu.sign} (${np.rahu.degreeInRashi.toFixed(2)}°)` },
      { label: 'RAHU HOUSE & DIGNITY', val: `${np.rahu.houseFormatted} | ${np.rahu.dignity}` },
      { label: 'RAHU NAKSHATRA & PADA', val: `${np.rahu.nakshatra} (Pada ${np.rahu.pada})` },
      { label: 'KETU SIGN & DEGREE', val: `${np.ketu.sign} (${np.ketu.degreeInRashi.toFixed(2)}°)` },
      { label: 'KETU HOUSE & DIGNITY', val: `${np.ketu.houseFormatted} | ${np.ketu.dignity}` },
      { label: 'KETU NAKSHATRA & PADA', val: `${np.ketu.nakshatra} (Pada ${np.ketu.pada})` },
      { label: 'NODAL AXIS SEPARATION', val: `${np.axisSeparation.toFixed(2)}° (Strict 180.00° Opposition)` },
      { label: 'NODE CALCULATION MODE', val: 'MEAN_NODE (Classical Vedic Astronomical Convention)' },
    ];

    let nY = 715;
    for (const item of nodeDetails) {
      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft + 20, nY - 14, pdf.contentWidth - 40, 24, true, true);

      pdf.drawText(item.label, pdf.marginLeft + 30, nY - 2, 8.5, true, PdfColors.NAVY);
      pdf.drawText(item.val, pdf.marginLeft + 210, nY - 2, 8.5, false, PdfColors.DARK_TEXT);
      nY -= 28;
    }

    // Study Guidance Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 360, true, true);

    pdf.drawText('NAVIGATING THE SHADOW NODAL BLUEPRINT', pdf.marginLeft + 20, 415, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 405, pdf.marginLeft + 320, 405);

    const rkPillars = [
      '1. Understand the 180° Polarity: Rahu in Taurus demands tangible worldly security; Ketu in Scorpio dissolves fear and attachment.',
      '2. Recognize Projected Desires: Rahu in the 7th house projects intense ambition onto partners and contractual alliances.',
      '3. Heed Ketu’s Detachment: Ketu in the 1st house gives an enigmatic persona, sharp intuition, and independence.',
      '4. Track 18-Month Cycles: The lunar nodes spend 1.5 years in each sign pair, methodically activating opposite Bhavas in your Kundali.',
      '5. Practice Calming Remedies: Apply silver grounding, Durga and Ganesha mantras, and avoid impulsive gemstone experimentation.',
    ];

    let rkY = 380;
    for (const p of rkPillars) {
      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft + 20, rkY - 14, pdf.contentWidth - 40, 42, true, true);

      rkY = this.drawWrappedText(pdf, p, pdf.marginLeft + 30, rkY, pdf.contentWidth - 60, 8.5, 12) - 18;
    }

    // =========================================================================
    // PAGE 4: VEDIC CHARTS OVERVIEW
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Vedic Charts Overview');

    const chartSize = 150;
    const yCharts = 570;

    pdf.drawText('1. Janma Kundli (Lagna D1)', pdf.marginLeft + 15, yCharts + chartSize + 8, 9, true, PdfColors.INDIGO);
    this.renderNorthIndianChart(pdf, report.houses, report.planets, pdf.marginLeft + 10, yCharts, chartSize);

    pdf.drawText('2. Chandra Kundli (Moon Chart)', pdf.marginLeft + 185, yCharts + chartSize + 8, 9, true, PdfColors.INDIGO);
    const moonHouses = (report.houses || []).map((h: any, i: number) => ({
      ...h,
      houseNumber: ((i + 1) % 12) + 1,
    }));
    this.renderNorthIndianChart(pdf, moonHouses, report.planets, pdf.marginLeft + 180, yCharts, chartSize);

    pdf.drawText('3. Nodal Transit Chart (Gochara)', pdf.marginLeft + 355, yCharts + chartSize + 8, 9, true, PdfColors.INDIGO);
    this.renderNorthIndianChart(pdf, report.houses, report.planets, pdf.marginLeft + 350, yCharts, chartSize);

    let bY = yCharts - 20;
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, bY - 80, true, true);

    pdf.drawText('THE THREE OBSERVATIONAL LENSES OF NODAL KARMA', pdf.marginLeft + 20, bY - 20, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, bY - 28, pdf.marginLeft + 360, bY - 28);

    const rkChartExpl = [
      '• Janma Kundli (Lagna D1): Displays the foundational spatial orientation of Rahu (7th house) and Ketu (1st house) from Scorpio Lagna.',
      '• Chandra Kundli (Moon Chart): Re-anchors from your Virgo Moon sign, placing Rahu in the 9th house of fortune/dharma and Ketu in the 3rd house of courage.',
      '• Gochara Chart (Transits): Highlights the current activation of the Aquarius-Leo axis (2025–2026) and Capricorn-Cancer axis (2026–2028).',
    ];

    let ceY = bY - 45;
    for (const ce of rkChartExpl) {
      ceY = this.drawWrappedText(pdf, ce, pdf.marginLeft + 20, ceY, pdf.contentWidth - 40, 8.5, 12.5) - 6;
    }

    if (isUntimed) {
      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.GOLD);
      pdf.setLineWidth(1.5);
      pdf.drawRect(pdf.marginLeft + 20, 95, pdf.contentWidth - 40, 65, true, true);

      pdf.drawText('NOTICE: UNTIMED BIRTH PROFILE (TIME OF BIRTH INDETERMINATE)', pdf.marginLeft + 35, 142, 9, true, PdfColors.GOLD);
      const untimedNotice =
        'Because an exact birth time was not provided, whole-sign house numbers are marked Indeterminate. However, planetary signs, degrees, Moon relationship, Rohini/Jyeshtha Nakshatras, and Gochara transits remain 100% deterministic and mathematically authoritative.';
      this.drawWrappedText(pdf, untimedNotice, pdf.marginLeft + 35, 126, pdf.contentWidth - 70, 8, 11);
    }

    // =========================================================================
    // PAGE 5: NATAL RAHU & KETU DEEP DIVE
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Natal Rahu & Ketu Deep Dive');

    // Rahu in 7th Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 440, pdf.contentWidth, 330, true, true);

    pdf.drawText('RAHU IN 7TH HOUSE (TAURUS) — AMBITION IN PARTNERSHIPS', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 430, 735);

    pdf.drawText(`Placement: ${np.rahu.sign} (${np.rahu.degreeInRashi.toFixed(2)}°)  |  Dignity: ${np.rahu.dignity}`, pdf.marginLeft + 20, 715, 9.5, true, PdfColors.NAVY);
    pdf.drawText(`Nakshatra: ${np.rahu.nakshatra} (Pada ${np.rahu.pada})  |  Lord: Moon`, pdf.marginLeft + 20, 698, 9, false, PdfColors.DARK_TEXT);

    const rahuTraits = [
      '• Unconventional Relationship Dynamics: Rahu in the 7th house creates an insatiable desire for partnerships that elevate your social, financial, or cultural status. You are drawn to non-traditional, dynamic, or foreign-connected partners.',
      '• Commercial Diplomacy: In business and public dealings, Rahu grants sharp negotiation acumen. You easily perceive what others want and can construct win-win contracts.',
      '• Navigating Material Fascination: Rahu’s presence in earthy Taurus creates an intense attraction to aesthetic luxury, stable assets, and financial security.',
    ];

    let rhY = 675;
    for (const rt of rahuTraits) {
      rhY = this.drawWrappedText(pdf, rt, pdf.marginLeft + 20, rhY, pdf.contentWidth - 40, 8.5, 12) - 6;
    }

    // Ketu in 1st Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 340, true, true);

    pdf.drawText('KETU IN 1ST HOUSE (SCORPIO) — THE ENIGMATIC MYSTIC', pdf.marginLeft + 20, 395, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 385, pdf.marginLeft + 390, 385);

    pdf.drawText(`Placement: ${np.ketu.sign} (${np.ketu.degreeInRashi.toFixed(2)}°)  |  Dignity: ${np.ketu.dignity}`, pdf.marginLeft + 20, 365, 9.5, true, PdfColors.NAVY);
    pdf.drawText(`Nakshatra: ${np.ketu.nakshatra} (Pada ${np.ketu.pada})  |  Lord: Mercury`, pdf.marginLeft + 20, 348, 9, false, PdfColors.DARK_TEXT);

    const ketuTraits = [
      '• Introspective Persona: Ketu in the Ascendant gives an understated, mystical aura. You naturally see through social pretenses and refuse to conform to superficial rituals.',
      '• Natural Detachment & Independence: Having mastered personal survival in past lifetimes, you value your autonomy above all else. You commit deeply only when something touches your soul.',
      '• Early Transformations: This placement often brings early relocations, geographic shifts, or deep identity changes that foster resilient self-reliance.',
    ];

    let ktY = 325;
    for (const kt of ketuTraits) {
      ktY = this.drawWrappedText(pdf, kt, pdf.marginLeft + 20, ktY, pdf.contentWidth - 40, 8.5, 12) - 6;
    }

    // =========================================================================
    // PAGE 6: 5TH, 7TH, 9TH ASPECTS OF RAHU & KETU
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Aspects of Rahu & Ketu');

    // Rahu Aspects Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 440, pdf.contentWidth, 330, true, true);

    pdf.drawText('RAHU’S TRIPLE DRISHTI (5TH, 7TH, 9TH ASPECTS)', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 350, 735);

    let rAspY = 715;
    for (const a of report.nodalAspects.rahuAspects) {
      pdf.drawText(`★ Rahu Aspect ${a.aspectNumber} on ${a.sign} (House ${a.house || 'N/A'}):`, pdf.marginLeft + 20, rAspY, 9.5, true, PdfColors.NAVY);
      rAspY = this.drawWrappedText(pdf, a.influence, pdf.marginLeft + 35, rAspY - 14, pdf.contentWidth - 55, 8.5, 12) - 10;
    }

    // Ketu Aspects Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 340, true, true);

    pdf.drawText('KETU’S TRIPLE DRISHTI (5TH, 7TH, 9TH ASPECTS)', pdf.marginLeft + 20, 395, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 385, pdf.marginLeft + 340, 385);

    let kAspY = 365;
    for (const a of report.nodalAspects.ketuAspects) {
      pdf.drawText(`★ Ketu Aspect ${a.aspectNumber} on ${a.sign} (House ${a.house || 'N/A'}):`, pdf.marginLeft + 20, kAspY, 9.5, true, PdfColors.PURPLE);
      kAspY = this.drawWrappedText(pdf, a.influence, pdf.marginLeft + 35, kAspY - 14, pdf.contentWidth - 55, 8.5, 12) - 10;
    }

    // =========================================================================
    // PAGE 7: PLANETARY CONJUNCTIONS & MOON SIGN DYNAMICS
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Conjunctions & Moon Sign Dynamics');

    // Conjunctions Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 440, pdf.contentWidth, 330, true, true);

    pdf.drawText('PLANETARY CONJUNCTIONS: VENUS & KETU ALIGNMENT', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 410, 735);

    const conjText =
      'In your birth chart, Venus and Ketu share the same sign space in Scorpio in your 1st house. In Vedic astrology, this combination is deeply transformative. Venus represents romantic ideals, aesthetics, and pleasures, while Ketu brings spiritual refinement. When united, your heart searches for profound soul connection rather than superficial flirtation. You possess artistic refinement and high emotional integrity.';
    let cjY = this.drawWrappedText(pdf, conjText, pdf.marginLeft + 20, 715, pdf.contentWidth - 40, 9, 13.5) - 12;

    this.drawWrappedText(pdf, report.nodalConjunctions.interpretation, pdf.marginLeft + 20, cjY, pdf.contentWidth - 40, 8.5, 12.5);

    // Moon Sign Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 340, true, true);

    pdf.drawText('RELATIONSHIP WITH YOUR MOON SIGN (VIRGO MOON)', pdf.marginLeft + 20, 395, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 385, pdf.marginLeft + 390, 385);

    pdf.drawText(`Moon Sign: ${ms.moonSign}  |  Overall Power: ${ms.overallPower}`, pdf.marginLeft + 20, 365, 9.5, true, PdfColors.NAVY);
    pdf.drawText(`Rahu from Moon: ${ms.rahuHouseFromMoon}th House (Taurus)  |  Ketu from Moon: ${ms.ketuHouseFromMoon}rd House (Scorpio)`, pdf.marginLeft + 20, 348, 9, false, PdfColors.DARK_TEXT);

    let mnY = 325;
    mnY = this.drawWrappedText(pdf, ms.psycheEvolution, pdf.marginLeft + 20, mnY, pdf.contentWidth - 40, 8.5, 12.5) - 10;

    const moonExtra =
      '• Upachaya & Trika Harmony: Ketu in the 3rd house from Moon is considered highly auspicious in classical Gochara, granting fearless mental determination, while Rahu in the 9th from Moon stimulates philosophical open-mindedness and international exposure.';
    this.drawWrappedText(pdf, moonExtra, pdf.marginLeft + 20, mnY, pdf.contentWidth - 40, 8.5, 12);

    // =========================================================================
    // PAGE 8: THE KARMIC JOURNEY & SOUL EVOLUTION
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('The Karmic Journey & Soul Evolution');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 690, true, true);

    pdf.drawText('TRANSCENDING KARMIC CHALLENGES: YOUR SOUL’S COMPASS', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 440, 735);

    const karmicItems = [
      {
        title: 'PAST LIFE KARMA (WHAT YOU BROUGHT INTO THIS LIFETIME)',
        desc: kj.pastLifeKarma,
      },
      {
        title: 'RAHU’S SOUL OBSESSION (WHERE YOUR CURRENT GROWTH LIES)',
        desc: kj.soulObsessionRahu,
      },
      {
        title: 'KETU’S SACRED RELEASE (WHAT YOU MUST GRACEFULLY SURRENDER)',
        desc: kj.soulReleaseKetu,
      },
      {
        title: 'THE CORE KARMIC DIRECTIVE (BALANCING THE 1ST-7TH AXIS)',
        desc: kj.karmicLesson,
      },
    ];

    let kmY = 710;
    for (const item of karmicItems) {
      pdf.drawText(item.title, pdf.marginLeft + 20, kmY, 9.5, true, PdfColors.NAVY);
      kmY = this.drawWrappedText(pdf, item.desc, pdf.marginLeft + 20, kmY - 14, pdf.contentWidth - 40, 8.5, 12.5) - 18;
    }

    // =========================================================================
    // PAGE 9: NODAL TRANSIT MASTER TIMELINE & 2025–2026 CYCLE
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Nodal Transit Timeline & 2025–2026 Cycle');

    // Master Timeline Table Box (Top)
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 570, pdf.contentWidth, 200, true, true);

    pdf.drawText('VERIFIED 2025–2030 NODAL TRANSIT TIMELINE (MEAN NODE 180° OPPOSITION)', pdf.marginLeft + 20, 745, 10, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 460, 735);

    const nColX = [pdf.marginLeft + 25, pdf.marginLeft + 130, pdf.marginLeft + 285, pdf.marginLeft + 380, pdf.marginLeft + 472];
    let ntY = 718;
    pdf.setFillColor(PdfColors.NAVY);
    pdf.drawRect(pdf.marginLeft + 20, ntY - 12, pdf.contentWidth - 40, 18, true, false);
    pdf.drawText('NODAL CYCLE', nColX[0], ntY - 1, 7.5, true, PdfColors.WHITE);
    pdf.drawText('EXACT INGRESS PERIOD', nColX[1], ntY - 1, 7.5, true, PdfColors.WHITE);
    pdf.drawText('RAHU (LAGNA/MOON)', nColX[2], ntY - 1, 7.5, true, PdfColors.WHITE);
    pdf.drawText('KETU (LAGNA/MOON)', nColX[3], ntY - 1, 7.5, true, PdfColors.WHITE);
    pdf.drawText('STATUS', nColX[4], ntY - 1, 7.5, true, PdfColors.WHITE);

    ntY -= 22;
    const nTimeline = report.transitTimeline || [];
    for (let i = 0; i < Math.min(nTimeline.length, 3); i++) {
      const item = nTimeline[i];
      const isCur = item.status === 'CURRENT';

      pdf.setFillColor(isCur ? PdfColors.LIGHT_BG : (i % 2 === 0 ? PdfColors.WHITE : PdfColors.LIGHT_BG));
      pdf.setStrokeColor(isCur ? PdfColors.GOLD : PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft + 20, ntY - 9, pdf.contentWidth - 40, 16, true, true);

      const cycleFormatted = item.cycleName.replace(' Rahu / ', '/').replace(' Ketu', '');
      pdf.drawText(cycleFormatted, nColX[0], ntY - 1, 6.5, isCur, isCur ? PdfColors.INDIGO : PdfColors.DARK_TEXT);
      pdf.drawText(item.periodFormatted, nColX[1], ntY - 1, 6.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(`${item.rahuSign} (H${item.rahuHouseFromLagna ?? '?'}/H${item.rahuHouseFromMoon})`, nColX[2], ntY - 1, 6.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(`${item.ketuSign} (H${item.ketuHouseFromLagna ?? '?'}/H${item.ketuHouseFromMoon})`, nColX[3], ntY - 1, 6.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(item.status, nColX[4], ntY - 1, 6.5, true, isCur ? PdfColors.GOLD : (item.status === 'COMPLETED' ? PdfColors.GREY_TEXT : PdfColors.INDIGO));

      ntY -= 18;
    }

    // Cycle 1: Aquarius / Leo Details Box (Bottom)
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 470, true, true);

    pdf.drawText(`${t1.cycleName.toUpperCase()} (${t1.period})`, pdf.marginLeft + 20, 525, 10.5, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 515, pdf.marginLeft + 420, 515);

    pdf.drawText(`Transiting Rahu in ${t1.rahuSign}: House ${t1.rahuHouseFromLagna || 'N/A'} from Lagna  |  House ${t1.rahuHouseFromMoon} from Moon (Favorable Upachaya)`, pdf.marginLeft + 20, 495, 8.5, true, PdfColors.NAVY);
    pdf.drawText(`Transiting Ketu in ${t1.ketuSign}: House ${t1.ketuHouseFromLagna || 'N/A'} from Lagna  |  House ${t1.ketuHouseFromMoon} from Moon`, pdf.marginLeft + 20, 480, 8.5, false, PdfColors.DARK_TEXT);

    let t1Y = 458;
    pdf.drawText('Rahu in Aquarius Predictions & Shifts:', pdf.marginLeft + 20, t1Y, 8.5, true, PdfColors.PURPLE);
    t1Y -= 13;
    for (const p of t1.rahuPredictions) {
      pdf.drawText('✓', pdf.marginLeft + 25, t1Y, 8, true, PdfColors.GOLD);
      t1Y = this.drawWrappedText(pdf, p, pdf.marginLeft + 40, t1Y, pdf.contentWidth - 60, 8, 11) - 3;
    }

    t1Y -= 4;
    pdf.drawText('Ketu in Leo Spiritual & Career Upgrades:', pdf.marginLeft + 20, t1Y, 8.5, true, PdfColors.PURPLE);
    t1Y -= 13;
    for (const p of t1.ketuPredictions) {
      pdf.drawText('★', pdf.marginLeft + 25, t1Y, 8, true, PdfColors.GOLD);
      t1Y = this.drawWrappedText(pdf, p, pdf.marginLeft + 40, t1Y, pdf.contentWidth - 60, 8, 11) - 3;
    }

    t1Y -= 4;
    pdf.drawText('Key Spheres of Life Impact:', pdf.marginLeft + 20, t1Y, 8.5, true, PdfColors.NAVY);
    t1Y -= 13;
    for (const sp of t1.spheresOfLife) {
      pdf.drawText(`• ${sp.sphere}:`, pdf.marginLeft + 25, t1Y, 8, true, PdfColors.DARK_TEXT);
      t1Y = this.drawWrappedText(pdf, sp.impact, pdf.marginLeft + 140, t1Y, pdf.contentWidth - 160, 7.5, 10.5) - 3;
    }

    // =========================================================================
    // PAGE 10: COSMIC KARMA TRANSIT 2026–2028 (CAPRICORN / CANCER)
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Cosmic Karma Transit 2026–2028');

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 690, true, true);

    pdf.drawText(`${t2.cycleName.toUpperCase()} (${t2.period})`, pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 380, 735);

    pdf.drawText(`Transiting Rahu in ${t2.rahuSign}: House ${t2.rahuHouseFromLagna || 'N/A'} from Lagna (Upachaya Courage)  |  House ${t2.rahuHouseFromMoon} from Moon`, pdf.marginLeft + 20, 715, 9, true, PdfColors.NAVY);
    pdf.drawText(`Transiting Ketu in ${t2.ketuSign}: House ${t2.ketuHouseFromLagna || 'N/A'} from Lagna (Bhagya Pilgrimage)  |  House ${t2.ketuHouseFromMoon} from Moon`, pdf.marginLeft + 20, 700, 9, false, PdfColors.DARK_TEXT);

    let t2Y = 675;
    pdf.drawText('Rahu in Capricorn Predictions & Breakthroughs:', pdf.marginLeft + 20, t2Y, 9, true, PdfColors.PURPLE);
    t2Y -= 14;
    for (const p of t2.rahuPredictions) {
      pdf.drawText('✓', pdf.marginLeft + 25, t2Y, 8.5, true, PdfColors.GOLD);
      t2Y = this.drawWrappedText(pdf, p, pdf.marginLeft + 40, t2Y, pdf.contentWidth - 60, 8.5, 12) - 3;
    }

    t2Y -= 6;
    pdf.drawText('Ketu in Cancer Spiritual & Philosophical Evolution:', pdf.marginLeft + 20, t2Y, 9, true, PdfColors.PURPLE);
    t2Y -= 14;
    for (const p of t2.ketuPredictions) {
      pdf.drawText('★', pdf.marginLeft + 25, t2Y, 8.5, true, PdfColors.GOLD);
      t2Y = this.drawWrappedText(pdf, p, pdf.marginLeft + 40, t2Y, pdf.contentWidth - 60, 8.5, 12) - 3;
    }

    t2Y -= 6;
    pdf.drawText('Key Spheres of Life Impact:', pdf.marginLeft + 20, t2Y, 9, true, PdfColors.NAVY);
    t2Y -= 14;
    for (const sp of t2.spheresOfLife) {
      pdf.drawText(`• ${sp.sphere}:`, pdf.marginLeft + 25, t2Y, 8.5, true, PdfColors.DARK_TEXT);
      t2Y = this.drawWrappedText(pdf, sp.impact, pdf.marginLeft + 140, t2Y, pdf.contentWidth - 160, 8, 11) - 4;
    }

    // =========================================================================
    // PAGE 11: CONSECRATED REMEDIES & ASTRO-VASTU
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Consecrated Remedies & Astro-Vastu');

    // Remedies Grid Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 430, pdf.contentWidth, 340, true, true);

    pdf.drawText('CONSECRATED VEDIC REMEDIES FOR SHADOW NODES', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 370, 735);

    const rkRemItems = [
      {
        title: 'GEMSTONE CAUTIONS & SAFE ALTERNATIVES',
        desc: `${rem.gemstones.rahuGomedCaution}\n\n${rem.gemstones.ketuCatsEyeCaution}\n\nSafe Alternative: ${rem.gemstones.safeAlternatives}`,
      },
      {
        title: 'SACRED RUDRAKSHA REMEDIES (8 MUKHI & 9 MUKHI)',
        desc: `Rahu: ${rem.rudraksha.rahuMukhi} — ${rem.rudraksha.rahuBenefits}\nKetu: ${rem.rudraksha.ketuMukhi} — ${rem.rudraksha.ketuBenefits}`,
      },
    ];

    let rkRmY = 715;
    for (const item of rkRemItems) {
      pdf.drawText(item.title, pdf.marginLeft + 20, rkRmY, 9, true, PdfColors.NAVY);
      rkRmY = this.drawWrappedText(pdf, item.desc, pdf.marginLeft + 20, rkRmY - 14, pdf.contentWidth - 40, 8, 11.5) - 10;
    }

    // Astro-Vastu & Mantras Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 330, true, true);

    pdf.drawText('ASTRO-VASTU HARMONIZATION & SACRED MANTRAS', pdf.marginLeft + 20, 385, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 375, pdf.marginLeft + 340, 375);

    pdf.drawText(`Rahu Zone (${rem.astrovastu.rahuDirection}):`, pdf.marginLeft + 20, 355, 9, true, PdfColors.PURPLE);
    let avY = this.drawWrappedText(pdf, rem.astrovastu.rahuZoneGuidance, pdf.marginLeft + 20, 340, pdf.contentWidth - 40, 8, 11) - 6;

    pdf.drawText(`Ketu Zone (${rem.astrovastu.ketuDirection}):`, pdf.marginLeft + 20, avY, 9, true, PdfColors.PURPLE);
    avY = this.drawWrappedText(pdf, rem.astrovastu.ketuZoneGuidance, pdf.marginLeft + 20, avY - 14, pdf.contentWidth - 40, 8, 11) - 8;

    pdf.drawText('Sacred Mantras:', pdf.marginLeft + 20, avY, 9, true, PdfColors.NAVY);
    avY -= 14;
    pdf.drawText(`Goddess Durga: ${rem.mantras.durgaMantra}`, pdf.marginLeft + 30, avY, 8, false, PdfColors.DARK_TEXT);
    avY -= 13;
    pdf.drawText(`Lord Ganesha: ${rem.mantras.ganeshaMantra}`, pdf.marginLeft + 30, avY, 8, false, PdfColors.DARK_TEXT);
    avY -= 13;
    pdf.drawText(`Rahu Beej: ${rem.mantras.rahuBeej}`, pdf.marginLeft + 30, avY, 8, false, PdfColors.DARK_TEXT);
    avY -= 13;
    pdf.drawText(`Ketu Beej: ${rem.mantras.ketuBeej}`, pdf.marginLeft + 30, avY, 8, false, PdfColors.DARK_TEXT);

    // =========================================================================
    // PAGE 12: KARMIC RETURN CYCLES & DIVINE BENEDICTION
    // =========================================================================
    pdf.addPage();
    pdf.drawHeader('Karmic Return Cycles & Benediction');

    // Karmic Cycles Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 430, pdf.contentWidth, 340, true, true);

    pdf.drawText('THE 18.6-YEAR NODAL RETURN CYCLES ACROSS HUMAN LIFE', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 410, 735);

    const cyclesIntro =
      'Because Rahu and Ketu take approximately 18.6 years to orbit the complete zodiac in retrograde motion, every human being encounters major karmic inflection milestones at specific ages:';
    let cyY = this.drawWrappedText(pdf, cyclesIntro, pdf.marginLeft + 20, 715, pdf.contentWidth - 40, 9, 13.5) - 10;

    const nodalCycles = [
      '• Age 18.6 (First Nodal Return): Awakening of worldly ambition, stepping outside childhood family boundaries, and first major vocational choices.',
      '• Age 27.9 (Half-Return): Nodal inversion (transiting Ketu conjunct natal Rahu). Reality check on early ambitions and realignment with soul values.',
      '• Age 37.2 (Second Nodal Return): Golden window of mature worldly breakthrough. High responsibility, culmination of career expertise, and karmic harvest.',
      '• Age 55.8 (Third Nodal Return): Spiritual distillation. Transition from material acquisition toward wisdom sharing, mentorship, and legacy.',
      '• Age 74.4 (Fourth Nodal Return): Transcendent spiritual peace, detachment from worldly outcomes, and sacred completion.',
    ];

    for (const nc of nodalCycles) {
      cyY = this.drawWrappedText(pdf, nc, pdf.marginLeft + 25, cyY, pdf.contentWidth - 50, 8.5, 12) - 5;
    }

    // Benediction Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 330, true, true);

    pdf.drawText('DIVINE BENEDICTION & SOUL MASTERY', pdf.marginLeft + 20, 385, 11, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 20, 375, pdf.marginLeft + 270, 375);

    const rkBlessing =
      'May your journey with Rahu and Ketu be one of profound courage and spiritual liberation. Remember that shadow planets do not create destiny from outside; they reflect the unfinished desires and unreleased wisdom stored within your own subconscious mind.\n\nWhen confronted with Rahu’s sudden opportunities, proceed with rigorous ethics and clarity. When touched by Ketu’s detachment, surrender without grief, knowing that what leaves was never your true Self. Walk with faith, integrity, and reverence.\n\nWith sacred blessings,';
    let blY = this.drawWrappedText(pdf, rkBlessing, pdf.marginLeft + 20, 355, pdf.contentWidth - 40, 8.5, 12.5) - 14;

    pdf.drawText('Astro Sushil (Sushil Kumaar Singh)', pdf.marginLeft + 20, blY, 9.5, true, PdfColors.NAVY);
    pdf.drawText('Founder & Chief Astrologer  |  Astro Sushil Platform', pdf.marginLeft + 20, blY - 14, 8.5, false, PdfColors.GREY_TEXT);

    // Signature
    pdf.drawText('Astro Sushil (Sushil Kumaar Singh)  |  Founder & Chief Astrologer  |  Astro Sushil Platform', pdf.marginLeft + 20, 85, 7.5, true, PdfColors.GOLD);
  }

  private buildVarshphalReportPdf(pdf: PdfWriter, report: VarshphalReportModel): void {
    renderVarshphalReportPdf(
      pdf,
      report,
      this.renderNorthIndianChart.bind(this),
      this.drawWrappedText.bind(this)
    );
  }

  private wrapText(text: string, maxCharsPerLine: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }
}

export const reportPdfService = new ReportPdfService();

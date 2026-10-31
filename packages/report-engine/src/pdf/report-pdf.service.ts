import {
  StructuredReportModel,
  ReportType,
  MiniHoroscopeModel,
  ProHoroscopeModel,
  MatchmakingReportModel,
  ReportHouseDto,
  ReportPlanetDto,
} from '../types/report.types';
import { CareerReportData } from '../types/career-report.types';
import { validateAstrologyDataForReport } from '../validation/report-data.validator';
import { PdfWriter, PdfColors } from './pdf-writer';

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
    } else if (report.type === ReportType.CAREER_PROSITY) {
      this.buildProHoroscopePdf(pdf, report as ProHoroscopeModel);
    } else if (report.type === ReportType.PLANETARY_SUMMARY) {
      this.buildPlanetaryPdf(pdf, report);
    } else {
      this.buildKundliPdf(pdf, report as StructuredReportModel);
    }

    return pdf.buildPdfBuffer();
  }

  // ---------------------------------------------------------------------------
  // 1. BASIC HOROSCOPE (KUNDLI REPORT PDF BUILDER)
  // ---------------------------------------------------------------------------

  private buildKundliPdf(pdf: PdfWriter, report: StructuredReportModel): void {
    // PAGE 1: Cover Header, Profile, Config, Ascendant & Nakshatra
    pdf.drawHeader('Birth Chart & Kundli Report');

    // Banner Box
    pdf.setFillColor(PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(2);
    pdf.drawRect(pdf.marginLeft, 690, pdf.contentWidth, 90, true, true);

    pdf.drawText('ASTRO SUSHIL', pdf.marginLeft + 20, 755, 20, true, PdfColors.GOLD);
    pdf.drawText('JANMA KUNDLI & LIFE BLUEPRINT', pdf.marginLeft + 20, 735, 14, true, PdfColors.WHITE);
    pdf.drawText(
      `Native: ${report.profile.name}  |  Generated: ${new Date(report.generatedAt).toLocaleDateString()}  |  Version ${report.version}`,
      pdf.marginLeft + 20,
      712,
      9,
      false,
      PdfColors.WHITE
    );

    // Birth Profile Box
    let curY = 660;
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

    // Ascendant & Janma Nakshatra Box
    curY -= 115;
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.PURPLE);
    pdf.drawRect(pdf.marginLeft, curY - 75, pdf.contentWidth, 75, true, true);

    pdf.drawText('2. ASCENDANT (LAGNA) & JANMA NAKSHATRA', pdf.marginLeft + 15, curY - 18, 11, true, PdfColors.PURPLE);
    pdf.drawText(`Ascendant Sign: ${report.ascendant.sign} (${report.ascendant.degree.toFixed(2)}°)`, pdf.marginLeft + 15, curY - 38, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Ascendant Nakshatra: ${report.ascendant.nakshatra} (Pada ${report.ascendant.pada})`, pdf.marginLeft + 15, curY - 54, 9.5, false, PdfColors.DARK_TEXT);

    pdf.drawText(`Moon Nakshatra: ${report.nakshatra.birthNakshatra} (Pada ${report.nakshatra.pada})`, pdf.marginLeft + 280, curY - 38, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Nakshatra Lord: ${report.nakshatra.rulingPlanet}`, pdf.marginLeft + 280, curY - 54, 9.5, false, PdfColors.DARK_TEXT);

    // North Indian Chart
    curY -= 95;
    pdf.drawText('4. NORTH INDIAN KUNDLI CHART', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
    curY -= 190;
    this.renderNorthIndianChart(pdf, report.houses, report.planets, 200, curY, 175);

    // PAGE 2: Chandra Kundli & 9 Grahas Table
    pdf.addPage();
    pdf.drawHeader('Birth Chart & Planetary Placements');

    if (report.chandraKundli) {
      pdf.drawText('4. CHANDRA KUNDLI (MOON CHART)', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);
      this.renderNorthIndianChart(pdf, report.chandraKundli.houses, report.planets, 200, 580, 175);
      curY = 550;
    } else {
      curY = 775;
    }

    pdf.drawText('5. NINE GRAHA PLACEMENTS & POSITIONS', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
    curY -= 20;

    pdf.setFillColor(PdfColors.INDIGO);
    pdf.drawRect(pdf.marginLeft, curY - 18, pdf.contentWidth, 22, true, false);

    const cols = [
      { name: 'Graha', x: pdf.marginLeft + 10 },
      { name: 'Rashi (Sign)', x: pdf.marginLeft + 90 },
      { name: 'Degrees', x: pdf.marginLeft + 175 },
      { name: 'House', x: pdf.marginLeft + 250 },
      { name: 'Nakshatra', x: pdf.marginLeft + 315 },
      { name: 'Pada', x: pdf.marginLeft + 415 },
      { name: 'Motion', x: pdf.marginLeft + 470 },
    ];

    for (const c of cols) {
      pdf.drawText(c.name, c.x, curY - 14, 9, true, PdfColors.WHITE);
    }

    curY -= 20;
    let isAlt = false;
    for (const p of report.planets) {
      pdf.setFillColor(isAlt ? PdfColors.LIGHT_BG : PdfColors.WHITE);
      pdf.drawRect(pdf.marginLeft, curY - 16, pdf.contentWidth, 18, true, false);

      pdf.drawText(p.planet, cols[0].x, curY - 12, 9, true, PdfColors.DARK_TEXT);
      pdf.drawText(p.sign, cols[1].x, curY - 12, 9, false, PdfColors.DARK_TEXT);
      pdf.drawText(`${p.degree.toFixed(2)}°`, cols[2].x, curY - 12, 9, false, PdfColors.DARK_TEXT);
      pdf.drawText(`House ${p.house}`, cols[3].x, curY - 12, 9, false, PdfColors.DARK_TEXT);
      pdf.drawText(p.nakshatra, cols[4].x, curY - 12, 9, false, PdfColors.DARK_TEXT);
      pdf.drawText(String(p.pada), cols[5].x, curY - 12, 9, false, PdfColors.DARK_TEXT);
      pdf.drawText(p.isRetrograde ? 'Retrograde (R)' : 'Direct', cols[6].x, curY - 12, 8, p.isRetrograde, p.isRetrograde ? PdfColors.ROSE : PdfColors.GREY_TEXT);

      curY -= 18;
      isAlt = !isAlt;
    }

    // PAGE 3: Vimshottari Dasha & Dosha Analysis
    pdf.addPage();
    pdf.drawHeader('Vimshottari Dasha & Dosha Analysis');

    if (report.vimshottariDasha) {
      pdf.drawText('6. VIMSHOTTARI DASHA TIMELINE', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);

      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft, 715, pdf.contentWidth, 38, true, true);

      pdf.drawText(
        `Active Mahadasha: ${report.vimshottariDasha.currentMahadasha}   |   Current Antardasha: ${report.vimshottariDasha.currentAntardasha}`,
        pdf.marginLeft + 15,
        734,
        10,
        true,
        PdfColors.PURPLE
      );
      pdf.drawText(
        `Cycle Window: ${report.vimshottariDasha.currentCycleStart} to ${report.vimshottariDasha.currentCycleEnd}`,
        pdf.marginLeft + 15,
        721,
        8.5,
        false,
        PdfColors.GREY_TEXT
      );

      curY = 700;
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

    if (report.doshaAnalysis) {
      pdf.drawText('7. CLASSICAL DOSHA EVALUATION', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
      curY -= 15;

      const doshas = [
        { name: 'Manglik Dosha', status: report.doshaAnalysis.manglik.isManglik ? `Active (${report.doshaAnalysis.manglik.severity})` : 'Not Present', desc: report.doshaAnalysis.manglik.description },
        { name: 'Sade Sati Status', status: report.doshaAnalysis.sadeSati.isSadeSatiActive ? `Active (${report.doshaAnalysis.sadeSati.phaseName})` : 'Not Active', desc: report.doshaAnalysis.sadeSati.description },
        { name: 'Kaal Sarp Yoga', status: report.doshaAnalysis.kaalSarp.isKaalSarpPresent ? report.doshaAnalysis.kaalSarp.typeName : 'Not Present', desc: report.doshaAnalysis.kaalSarp.description },
      ];

      for (const d of doshas) {
        pdf.setFillColor(PdfColors.LIGHT_BG);
        pdf.setStrokeColor(PdfColors.BORDER_GREY);
        pdf.drawRect(pdf.marginLeft, curY - 45, pdf.contentWidth, 45, true, true);

        pdf.drawText(d.name, pdf.marginLeft + 15, curY - 15, 9.5, true, PdfColors.NAVY);
        pdf.drawText(`Status: ${d.status}`, pdf.marginLeft + 280, curY - 15, 9, true, d.status.includes('Active') || d.status.includes('Present') ? PdfColors.ROSE : PdfColors.PURPLE);
        this.drawWrappedText(pdf, d.desc, pdf.marginLeft + 15, curY - 28, pdf.contentWidth - 30, 8.5, 11);

        curY -= 52;
      }
    }

    // Gemstone Recommendations Card
    if (report.gemstoneRecommendations) {
      if (curY < 180) {
        pdf.addPage();
        pdf.drawHeader('Gemstone Recommendations');
        curY = 775;
      }

      pdf.drawText('8. ASTRONOMICAL GEMSTONE RECOMMENDATIONS (TRIKONA LORDS)', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
      curY -= 15;

      const gems = [
        { label: 'Life Stone (1st Lord)', item: report.gemstoneRecommendations.lagnaGem },
        { label: 'Lucky Stone (5th Lord)', item: report.gemstoneRecommendations.luckyGem5th },
        { label: 'Fortune Stone (9th Lord)', item: report.gemstoneRecommendations.fortuneGem9th },
      ];

      for (const g of gems) {
        pdf.setFillColor(PdfColors.WHITE);
        pdf.setStrokeColor(PdfColors.GOLD);
        pdf.drawRect(pdf.marginLeft, curY - 42, pdf.contentWidth, 42, true, true);

        pdf.drawText(`${g.label}: ${g.item.gemstone} (${g.item.sanskritName})`, pdf.marginLeft + 15, curY - 14, 9.5, true, PdfColors.NAVY);
        pdf.drawText(`Ruler: ${g.item.rulingLord}  |  Finger: ${g.item.finger}  |  Metal: ${g.item.metal}`, pdf.marginLeft + 15, curY - 26, 8.5, false, PdfColors.DARK_TEXT);
        pdf.drawText(`Caution: ${g.item.caution}`, pdf.marginLeft + 15, curY - 37, 7.5, false, PdfColors.GREY_TEXT);

        curY -= 48;
      }
    }
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

    // Sade Sati Status Card
    const sadeSati = report.miniHoroscopeData?.sadeSati;
    if (sadeSati) {
      curY -= 15;
      pdf.drawText('2. SHANI SADE SATI & DHAIYYA EVALUATION', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
      curY -= 15;

      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.PURPLE);
      pdf.drawRect(pdf.marginLeft, curY - 55, pdf.contentWidth, 55, true, true);

      pdf.drawText(
        `Status: ${sadeSati.isSadeSatiActive ? `Active (${sadeSati.phaseName})` : 'No Active Sade Sati'}`,
        pdf.marginLeft + 15,
        curY - 18,
        10,
        true,
        sadeSati.isSadeSatiActive ? PdfColors.ROSE : PdfColors.NAVY
      );
      this.drawWrappedText(pdf, sadeSati.description, pdf.marginLeft + 15, curY - 32, pdf.contentWidth - 30, 8.5, 11);
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
  // 3. PRO HOROSCOPE (SHODASHVARGA & SHADBALA PDF BUILDER)
  // ---------------------------------------------------------------------------

  private buildProHoroscopePdf(pdf: PdfWriter, report: ProHoroscopeModel): void {
    pdf.drawHeader('Pro Horoscope & Shodashvarga Dossier');

    // Header Banner
    pdf.setFillColor(PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(2);
    pdf.drawRect(pdf.marginLeft, 690, pdf.contentWidth, 90, true, true);

    pdf.drawText('ASTRO SUSHIL', pdf.marginLeft + 20, 755, 20, true, PdfColors.GOLD);
    pdf.drawText('PRO HOROSCOPE & SHODASHVARGA MULTI-DIMENSIONAL DOSSIER', pdf.marginLeft + 20, 735, 12, true, PdfColors.WHITE);
    pdf.drawText(
      `Native: ${report.profile.name}  |  Generated: ${new Date(report.generatedAt).toLocaleDateString()}  |  Engine Version 1.0.0`,
      pdf.marginLeft + 20,
      712,
      9,
      false,
      PdfColors.WHITE
    );

    let curY = 660;

    // Multi-Divisional Varga Summary Table
    pdf.drawText('1. SHODASHVARGA MULTI-DIVISIONAL SUMMARY', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
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
    let isAlt = false;
    for (const v of report.vargas) {
      pdf.setFillColor(isAlt ? PdfColors.LIGHT_BG : PdfColors.WHITE);
      pdf.drawRect(pdf.marginLeft, curY - 20, pdf.contentWidth, 22, true, false);

      pdf.drawText(v.vargaCode, vCols[0].x, curY - 13, 9, true, PdfColors.DARK_TEXT);
      pdf.drawText(v.vargaName, vCols[1].x, curY - 13, 9, false, PdfColors.DARK_TEXT);
      pdf.drawText(v.ascendantSign, vCols[2].x, curY - 13, 9, true, PdfColors.PURPLE);
      pdf.drawText(v.focusArea, vCols[3].x, curY - 13, 8.5, false, PdfColors.DARK_TEXT);

      curY -= 22;
      isAlt = !isAlt;
    }

    // 6-Fold Shadbala Table
    curY -= 15;
    pdf.drawText('2. 6-FOLD SHADBALA PLANETARY STRENGTHS (BPHS CH. 27)', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
    curY -= 20;

    pdf.setFillColor(PdfColors.INDIGO);
    pdf.drawRect(pdf.marginLeft, curY - 18, pdf.contentWidth, 22, true, false);

    const sCols = [
      { name: 'Planet', x: pdf.marginLeft + 10 },
      { name: 'Sthana', x: pdf.marginLeft + 70 },
      { name: 'Dig', x: pdf.marginLeft + 130 },
      { name: 'Kala', x: pdf.marginLeft + 185 },
      { name: 'Cheshta', x: pdf.marginLeft + 240 },
      { name: 'Total Rupas', x: pdf.marginLeft + 310 },
      { name: 'Required', x: pdf.marginLeft + 395 },
      { name: 'Strength', x: pdf.marginLeft + 465 },
    ];

    for (const c of sCols) {
      pdf.drawText(c.name, c.x, curY - 14, 8.5, true, PdfColors.WHITE);
    }

    curY -= 20;
    isAlt = false;
    for (const s of report.shadbala) {
      pdf.setFillColor(isAlt ? PdfColors.LIGHT_BG : PdfColors.WHITE);
      pdf.drawRect(pdf.marginLeft, curY - 16, pdf.contentWidth, 18, true, false);

      pdf.drawText(s.planet, sCols[0].x, curY - 12, 8.5, true, PdfColors.DARK_TEXT);
      pdf.drawText(s.sthanaBala.toFixed(1), sCols[1].x, curY - 12, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(s.digBala.toFixed(1), sCols[2].x, curY - 12, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(s.kalaBala.toFixed(1), sCols[3].x, curY - 12, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(s.cheshtaBala.toFixed(1), sCols[4].x, curY - 12, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(`${s.totalRupas.toFixed(2)} R`, sCols[5].x, curY - 12, 8.5, true, PdfColors.NAVY);
      pdf.drawText(`${s.requiredRupas.toFixed(2)} R`, sCols[6].x, curY - 12, 8.5, false, PdfColors.GREY_TEXT);
      pdf.drawText(s.isStrong ? 'STRONG' : 'DEFICIENT', sCols[7].x, curY - 12, 8, true, s.isStrong ? PdfColors.PURPLE : PdfColors.ROSE);

      curY -= 18;
      isAlt = !isAlt;
    }

    // PAGE 2: 12 Bhava Bala Strengths & Classical Remedies
    pdf.addPage();
    pdf.drawHeader('Bhava Bala & Classical Vedic Remedies');
    curY = 775;

    pdf.drawText('3. 12 BHAVA BALA HOUSE STRENGTHS (BPHS CH. 29)', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
    curY -= 20;

    pdf.setFillColor(PdfColors.INDIGO);
    pdf.drawRect(pdf.marginLeft, curY - 18, pdf.contentWidth, 22, true, false);

    const bCols = [
      { name: 'House', x: pdf.marginLeft + 10 },
      { name: 'Sign', x: pdf.marginLeft + 75 },
      { name: 'Lord', x: pdf.marginLeft + 155 },
      { name: 'Lord Bala', x: pdf.marginLeft + 235 },
      { name: 'Dig Bala', x: pdf.marginLeft + 315 },
      { name: 'Total Rupas', x: pdf.marginLeft + 400 },
      { name: 'Rank', x: pdf.marginLeft + 480 },
    ];

    for (const c of bCols) {
      pdf.drawText(c.name, c.x, curY - 14, 8.5, true, PdfColors.WHITE);
    }

    curY -= 20;
    isAlt = false;
    for (const b of report.bhavaBala) {
      pdf.setFillColor(isAlt ? PdfColors.LIGHT_BG : PdfColors.WHITE);
      pdf.drawRect(pdf.marginLeft, curY - 16, pdf.contentWidth, 18, true, false);

      pdf.drawText(`House ${b.houseNumber}`, bCols[0].x, curY - 12, 8.5, true, PdfColors.DARK_TEXT);
      pdf.drawText(b.sign, bCols[1].x, curY - 12, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(b.lord, bCols[2].x, curY - 12, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(b.bhavadhipatiBala.toFixed(1), bCols[3].x, curY - 12, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(b.bhavaDigBala.toFixed(1), bCols[4].x, curY - 12, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(`${b.totalRupas.toFixed(2)} R`, bCols[5].x, curY - 12, 8.5, true, PdfColors.NAVY);
      pdf.drawText(`#${b.relativeRank}`, bCols[6].x, curY - 12, 8.5, false, PdfColors.PURPLE);

      curY -= 18;
      isAlt = !isAlt;
    }

    // Classical Remedies Card
    curY -= 15;
    pdf.drawText('4. GROUNDED VEDIC REMEDIES (MANTRAS & DANA)', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
    curY -= 15;

    for (const r of report.remedies) {
      pdf.setFillColor(PdfColors.WHITE);
      pdf.setStrokeColor(PdfColors.GOLD);
      pdf.drawRect(pdf.marginLeft, curY - 45, pdf.contentWidth, 45, true, true);

      pdf.drawText(`[${r.type}] ${r.title}`, pdf.marginLeft + 15, curY - 15, 9.5, true, PdfColors.NAVY);
      this.drawWrappedText(pdf, r.description, pdf.marginLeft + 15, curY - 27, pdf.contentWidth - 30, 8.5, 11);
      if (r.mantraText) {
        pdf.drawText(`Mantra: ${r.mantraText}`, pdf.marginLeft + 15, curY - 38, 8, true, PdfColors.PURPLE);
      }

      curY -= 52;
    }
  }

  // ---------------------------------------------------------------------------
  // 4. MATCHMAKING REPORT (ASHTAKOOTA GUNA MILAN PDF BUILDER)
  // ---------------------------------------------------------------------------

  private buildMatchmakingPdf(pdf: PdfWriter, report: MatchmakingReportModel): void {
    pdf.drawHeader('Marriage Compatibility & Kundli Milan');

    // Header Banner
    pdf.setFillColor(PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(2);
    pdf.drawRect(pdf.marginLeft, 690, pdf.contentWidth, 90, true, true);

    pdf.drawText('ASTRO SUSHIL', pdf.marginLeft + 20, 755, 20, true, PdfColors.GOLD);
    pdf.drawText('VEDIC KUNDLI MILAN & ASHTAKOOTA DOSSIER', pdf.marginLeft + 20, 735, 14, true, PdfColors.WHITE);
    pdf.drawText(
      `Groom: ${report.profile1.name}   &   Bride: ${report.profile2.name}   |   Date: ${new Date(report.generatedAt).toLocaleDateString()}`,
      pdf.marginLeft + 20,
      712,
      9,
      false,
      PdfColors.WHITE
    );

    // Dual Profiles Card
    let curY = 660;
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft, curY - 80, pdf.contentWidth, 80, true, true);

    pdf.drawText('1. PARTNER PROFILES', pdf.marginLeft + 15, curY - 18, 11, true, PdfColors.INDIGO);

    // Groom (Left)
    pdf.drawText(`Groom: ${report.profile1.name}`, pdf.marginLeft + 15, curY - 36, 9.5, true, PdfColors.DARK_TEXT);
    pdf.drawText(`Birth: ${report.profile1.dateOfBirth} ${report.profile1.timeOfBirth}`, pdf.marginLeft + 15, curY - 50, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Place: ${report.profile1.placeName || 'Not Specified'}`, pdf.marginLeft + 15, curY - 64, 9, false, PdfColors.DARK_TEXT);

    // Bride (Right)
    pdf.drawText(`Bride: ${report.profile2.name}`, pdf.marginLeft + 280, curY - 36, 9.5, true, PdfColors.DARK_TEXT);
    pdf.drawText(`Birth: ${report.profile2.dateOfBirth} ${report.profile2.timeOfBirth}`, pdf.marginLeft + 280, curY - 50, 9, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Place: ${report.profile2.placeName || 'Not Specified'}`, pdf.marginLeft + 280, curY - 64, 9, false, PdfColors.DARK_TEXT);

    // Total Guna Milan Score Banner
    curY -= 100;
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1.8);
    pdf.drawRect(pdf.marginLeft, curY - 70, pdf.contentWidth, 70, true, true);

    pdf.drawText(
      `TOTAL ASHTAKOOTA SCORE: ${report.gunaMilan.totalScore} / ${report.gunaMilan.maxScore} POINTS`,
      pdf.marginLeft + 15,
      curY - 22,
      14,
      true,
      PdfColors.NAVY
    );
    pdf.drawText(`VERDICT: ${report.gunaMilan.verdict}`, pdf.marginLeft + 15, curY - 40, 11, true, PdfColors.PURPLE);
    this.drawWrappedText(pdf, report.gunaMilan.verdictDescription, pdf.marginLeft + 15, curY - 55, pdf.contentWidth - 30, 8.5, 11);

    // Manglik Comparison Card
    curY -= 90;
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.PURPLE);
    pdf.drawRect(pdf.marginLeft, curY - 65, pdf.contentWidth, 65, true, true);

    pdf.drawText('2. MANGLIK (KUJA DOSHA) COMPARATIVE VERDICT', pdf.marginLeft + 15, curY - 18, 11, true, PdfColors.PURPLE);
    pdf.drawText(`Verdict: ${report.manglikComparison.verdict}`, pdf.marginLeft + 15, curY - 34, 10, true, PdfColors.NAVY);
    this.drawWrappedText(pdf, report.manglikComparison.explanation, pdf.marginLeft + 15, curY - 48, pdf.contentWidth - 30, 8.5, 11);

    // PAGE 2: Ashtakoota 8 Kootas Table & Synthesis
    pdf.addPage();
    pdf.drawHeader('Ashtakoota Components & Compatibility Synthesis');
    curY = 775;

    pdf.drawText('3. ASHTAKOOTA 8-FOLD BREAKDOWN (36 GUNA MILAN)', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
    curY -= 20;

    pdf.setFillColor(PdfColors.INDIGO);
    pdf.drawRect(pdf.marginLeft, curY - 18, pdf.contentWidth, 22, true, false);

    const kCols = [
      { name: 'Koota Name', x: pdf.marginLeft + 10 },
      { name: 'Max', x: pdf.marginLeft + 150 },
      { name: 'Obtained', x: pdf.marginLeft + 200 },
      { name: 'Status', x: pdf.marginLeft + 270 },
      { name: 'Significance & Meaning', x: pdf.marginLeft + 350 },
    ];

    for (const c of kCols) {
      pdf.drawText(c.name, c.x, curY - 14, 8.5, true, PdfColors.WHITE);
    }

    curY -= 20;
    let isAlt = false;
    for (const k of report.gunaMilan.kootas) {
      pdf.setFillColor(isAlt ? PdfColors.LIGHT_BG : PdfColors.WHITE);
      pdf.drawRect(pdf.marginLeft, curY - 16, pdf.contentWidth, 18, true, false);

      pdf.drawText(k.name, kCols[0].x, curY - 12, 8.5, true, PdfColors.DARK_TEXT);
      pdf.drawText(String(k.maxPoints), kCols[1].x, curY - 12, 8.5, false, PdfColors.GREY_TEXT);
      pdf.drawText(String(k.obtainedPoints), kCols[2].x, curY - 12, 8.5, true, PdfColors.NAVY);
      pdf.drawText(k.status, kCols[3].x, curY - 12, 8, true, k.status === 'EXCELLENT' ? PdfColors.PURPLE : k.status === 'DOSHA' ? PdfColors.ROSE : PdfColors.DARK_TEXT);
      pdf.drawText(k.description, kCols[4].x, curY - 12, 8, false, PdfColors.DARK_TEXT);

      curY -= 18;
      isAlt = !isAlt;
    }

    // Synthesis Card
    curY -= 15;
    pdf.drawText('4. COMPATIBILITY SYNTHESIS & HARMONY ANALYSIS', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);
    curY -= 15;

    const synItems = [
      { title: 'Mental & Psychological Rapport', text: report.synthesis.mentalHarmony },
      { title: 'Emotional & Affectional Bond', text: report.synthesis.emotionalHarmony },
      { title: 'Biological & Progeny Vitality', text: report.synthesis.healthAndProgeny },
      { title: 'Astrological Guidance & Synthesis', text: report.synthesis.remediesOrGuidance },
    ];

    for (const s of synItems) {
      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft, curY - 40, pdf.contentWidth, 40, true, true);

      pdf.drawText(s.title, pdf.marginLeft + 15, curY - 14, 9.5, true, PdfColors.NAVY);
      this.drawWrappedText(pdf, s.text, pdf.marginLeft + 15, curY - 26, pdf.contentWidth - 30, 8.5, 11);

      curY -= 46;
    }
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
      if (houseData) {
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

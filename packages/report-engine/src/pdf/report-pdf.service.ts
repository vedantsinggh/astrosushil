import { StructuredReportModel, ReportType } from '../types/report.types';
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

    pdf.drawText('Planet', colX[0] + 5, 742, 9, true, PdfColors.WHITE);
    pdf.drawText('Sign', colX[1] + 5, 742, 9, true, PdfColors.WHITE);
    pdf.drawText('House', colX[2] + 5, 742, 9, true, PdfColors.WHITE);
    pdf.drawText('Nakshatra', colX[3] + 5, 742, 9, true, PdfColors.WHITE);
    pdf.drawText('Dignity', colX[4] + 5, 742, 9, true, PdfColors.WHITE);
    pdf.drawText('Career Role', colX[5] + 5, 742, 9, true, PdfColors.WHITE);

    const planetList = Object.values(careerData.planets || {});
    let tableY = 715;
    for (let i = 0; i < planetList.length; i++) {
      const p = planetList[i] as any;
      if (!p || typeof p !== 'object') continue;
      const bg = i % 2 === 0 ? PdfColors.WHITE : PdfColors.LIGHT_BG;
      pdf.setFillColor(bg);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.setLineWidth(0.5);
      pdf.drawRect(pdf.marginLeft, tableY - 5, pdf.contentWidth, 20, true, true);

      pdf.drawText(p.name || 'Planet', colX[0] + 5, tableY, 8.5, true, PdfColors.DARK_TEXT);
      pdf.drawText(p.sign || '-', colX[1] + 5, tableY, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(p.house || '-', colX[2] + 5, tableY, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(p.nakshatra || '-', colX[3] + 5, tableY, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(p.dignity || '-', colX[4] + 5, tableY, 8.5, false, PdfColors.DARK_TEXT);
      pdf.drawText(p.careerSignificance || 'Influence', colX[5] + 5, tableY, 8, false, PdfColors.DARK_TEXT);

      tableY -= 20;
    }

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 60, pdf.contentWidth, 440, true, true);

    pdf.drawText('6. APTITUDES & SECTOR FIT ANALYSIS', pdf.marginLeft + 15, 480, 12, true, PdfColors.NAVY);
    const sectorText = careerData.careerAnalysis?.sectorFit || 'Sector fit and career fields analysis.';
    this.drawWrappedText(pdf, sectorText, pdf.marginLeft + 15, 455, pdf.contentWidth - 30, 9.5, 14);

    // PAGE 4: Action Plan & Final Synthesis
    pdf.addPage();
    pdf.drawHeader('Strategic Action Plan & Synthesis');

    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 460, pdf.contentWidth, 320, true, true);

    pdf.drawText('7. STRATEGIC ACTION PLAN', pdf.marginLeft + 15, 760, 12, true, PdfColors.NAVY);
    const actionPlanText = careerData.careerAnalysis?.actionPlanSummary || 'Step-by-step career action plan.';
    this.drawWrappedText(pdf, actionPlanText, pdf.marginLeft + 15, 735, pdf.contentWidth - 30, 9.5, 14);

    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.PURPLE);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 60, pdf.contentWidth, 380, true, true);

    pdf.drawText('8. FINAL SYNTHESIS & DEVELOPMENT PRIORITIES', pdf.marginLeft + 15, 420, 12, true, PdfColors.NAVY);
    const finalSynthText = careerData.careerAnalysis?.finalSynthesis || 'Final synthesis and professional development priorities.';
    this.drawWrappedText(pdf, finalSynthText, pdf.marginLeft + 15, 395, pdf.contentWidth - 30, 9.5, 14);

    return pdf.buildPdfBuffer();
  }

  private drawWrappedText(
    pdf: PdfWriter,
    text: string,
    x: number,
    startY: number,
    maxWidth: number,
    fontSize: number = 9.5,
    lineHeight: number = 14
  ): number {
    const paragraphs = text.split('\n');
    let currentY = startY;

    for (const para of paragraphs) {
      if (!para.trim()) {
        currentY -= lineHeight * 0.6;
        continue;
      }

      const words = para.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const approxWidth = testLine.length * fontSize * 0.52;

        if (approxWidth > maxWidth && currentLine) {
          pdf.drawText(currentLine, x, currentY, fontSize, false, PdfColors.DARK_TEXT);
          currentY -= lineHeight;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        pdf.drawText(currentLine, x, currentY, fontSize, false, PdfColors.DARK_TEXT);
        currentY -= lineHeight;
      }
    }

    return currentY;
  }

  /**
   * Generates a downloadable PDF buffer from a validated StructuredReportModel.
   * Does NOT perform any astrology calculations. Uses exact structured report JSON.
   */
  public async generateReportPdf(report: StructuredReportModel): Promise<Buffer> {
    // 1. Validate complete data integrity before generating PDF
    validateAstrologyDataForReport(report);

    const pdf = new PdfWriter();

    if (report.type === ReportType.PLANETARY_SUMMARY) {
      this.buildPlanetaryPdf(pdf, report);
    } else {
      this.buildKundliPdf(pdf, report);
    }

    return pdf.buildPdfBuffer();
  }

  // --- KUNDLI REPORT PDF BUILDER ---

  private buildKundliPdf(pdf: PdfWriter, report: StructuredReportModel): void {
    // PAGE 1: Cover Header, Profile, Config, Ascendant & Nakshatra
    pdf.drawHeader('Birth Chart & Kundli Report');

    // 1. Main Cover Banner Box
    pdf.setFillColor(PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(2);
    pdf.drawRect(pdf.marginLeft, 690, pdf.contentWidth, 90, true, true);

    pdf.drawText('ASTRO SUSHIL', pdf.marginLeft + 20, 755, 20, true, PdfColors.GOLD);
    pdf.drawText('BIRTH CHART & KUNDLI DOSSIER', pdf.marginLeft + 20, 735, 14, true, PdfColors.WHITE);
    pdf.drawText(
      `Generated: ${new Date(report.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}  |  Version ${report.version}`,
      pdf.marginLeft + 20,
      708,
      9,
      false,
      PdfColors.WHITE
    );

    // 2. Birth Profile Box
    let curY = 660;
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, curY - 100, pdf.contentWidth, 100, true, true);

    pdf.drawText('1. BIRTH PROFILE', pdf.marginLeft + 15, curY - 20, 11, true, PdfColors.INDIGO);
    pdf.drawText(`Full Name:`, pdf.marginLeft + 15, curY - 42, 10, true, PdfColors.DARK_TEXT);
    pdf.drawText(report.profile.name, pdf.marginLeft + 110, curY - 42, 10, false, PdfColors.DARK_TEXT);

    pdf.drawText(`Date of Birth:`, pdf.marginLeft + 15, curY - 60, 10, true, PdfColors.DARK_TEXT);
    pdf.drawText(report.profile.dateOfBirth, pdf.marginLeft + 110, curY - 60, 10, false, PdfColors.DARK_TEXT);

    pdf.drawText(`Time of Birth:`, pdf.marginLeft + 270, curY - 60, 10, true, PdfColors.DARK_TEXT);
    pdf.drawText(report.profile.timeOfBirth, pdf.marginLeft + 360, curY - 60, 10, false, PdfColors.DARK_TEXT);

    pdf.drawText(`Place of Birth:`, pdf.marginLeft + 15, curY - 78, 10, true, PdfColors.DARK_TEXT);
    pdf.drawText(report.profile.placeName || 'Not Specified', pdf.marginLeft + 110, curY - 78, 10, false, PdfColors.DARK_TEXT);

    pdf.drawText(`Timezone:`, pdf.marginLeft + 270, curY - 78, 10, true, PdfColors.DARK_TEXT);
    pdf.drawText(report.profile.timezone, pdf.marginLeft + 360, curY - 78, 10, false, PdfColors.DARK_TEXT);

    // 3. Chart Configuration Box
    curY -= 120;
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft, curY - 80, pdf.contentWidth, 80, true, true);

    pdf.drawText('2. CHART CONFIGURATION', pdf.marginLeft + 15, curY - 20, 11, true, PdfColors.INDIGO);
    pdf.drawText(`Zodiac System:`, pdf.marginLeft + 15, curY - 42, 10, true, PdfColors.DARK_TEXT);
    pdf.drawText(report.configuration.zodiacType, pdf.marginLeft + 120, curY - 42, 10, false, PdfColors.DARK_TEXT);

    pdf.drawText(`Ayanamsa:`, pdf.marginLeft + 270, curY - 42, 10, true, PdfColors.DARK_TEXT);
    pdf.drawText(report.configuration.ayanamsa, pdf.marginLeft + 360, curY - 42, 10, false, PdfColors.DARK_TEXT);

    pdf.drawText(`House System:`, pdf.marginLeft + 15, curY - 62, 10, true, PdfColors.DARK_TEXT);
    pdf.drawText(report.configuration.houseSystem, pdf.marginLeft + 120, curY - 62, 10, false, PdfColors.DARK_TEXT);

    pdf.drawText(`Node Calc:`, pdf.marginLeft + 270, curY - 62, 10, true, PdfColors.DARK_TEXT);
    pdf.drawText(report.configuration.nodeCalculation, pdf.marginLeft + 360, curY - 62, 10, false, PdfColors.DARK_TEXT);

    // 4. Ascendant & Nakshatra Summary Box
    curY -= 100;
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.PURPLE);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, curY - 110, pdf.contentWidth, 110, true, true);

    pdf.drawText('3. ASCENDANT & JANMA NAKSHATRA', pdf.marginLeft + 15, curY - 22, 11, true, PdfColors.PURPLE);

    pdf.drawText(`Ascendant (Lagna):`, pdf.marginLeft + 15, curY - 46, 10, true, PdfColors.DARK_TEXT);
    pdf.drawText(
      `${report.ascendant.sign} (${(typeof report.ascendant.degree === 'number' ? report.ascendant.degree : 0).toFixed(2)} deg)`,
      pdf.marginLeft + 140,
      curY - 46,
      10,
      false,
      PdfColors.DARK_TEXT
    );

    pdf.drawText(`Ascendant Nakshatra:`, pdf.marginLeft + 15, curY - 66, 10, true, PdfColors.DARK_TEXT);
    pdf.drawText(
      `${report.ascendant.nakshatra} (Pada ${report.ascendant.pada})`,
      pdf.marginLeft + 140,
      curY - 66,
      10,
      false,
      PdfColors.DARK_TEXT
    );

    pdf.drawText(`Janma Nakshatra:`, pdf.marginLeft + 15, curY - 86, 10, true, PdfColors.DARK_TEXT);
    pdf.drawText(
      `${report.nakshatra.birthNakshatra} (Pada ${report.nakshatra.pada})  |  Lord: ${report.nakshatra.rulingPlanet}`,
      pdf.marginLeft + 140,
      curY - 86,
      10,
      false,
      PdfColors.DARK_TEXT
    );

    // PAGE 2: North Indian Kundli Chart Diagram & Planetary Positions Table
    pdf.addPage();
    pdf.drawHeader('Birth Chart & Kundli Report');

    pdf.drawText('4. NORTH INDIAN KUNDLI CHART', pdf.marginLeft, 775, 12, true, PdfColors.INDIGO);

    // Render Vector Kundli Chart
    this.renderNorthIndianChart(pdf, report, 197, 545, 200);

    // 5. Planetary Positions Table
    curY = 515;
    pdf.drawText('5. PLANETARY POSITIONS', pdf.marginLeft, curY, 12, true, PdfColors.INDIGO);

    curY -= 20;
    // Table Header
    pdf.setFillColor(PdfColors.INDIGO);
    pdf.drawRect(pdf.marginLeft, curY - 18, pdf.contentWidth, 22, true, false);

    const cols = [
      { name: 'Planet', x: pdf.marginLeft + 10 },
      { name: 'Sign', x: pdf.marginLeft + 90 },
      { name: 'Degree', x: pdf.marginLeft + 170 },
      { name: 'House', x: pdf.marginLeft + 250 },
      { name: 'Nakshatra', x: pdf.marginLeft + 310 },
      { name: 'Pada', x: pdf.marginLeft + 410 },
      { name: 'Status', x: pdf.marginLeft + 465 },
    ];

    for (const col of cols) {
      pdf.drawText(col.name, col.x, curY - 14, 9, true, PdfColors.WHITE);
    }

    curY -= 20;
    // Table Rows
    let isAlt = false;
    for (const p of report.planets) {
      if (curY < 60) {
        pdf.addPage();
        pdf.drawHeader('Birth Chart & Kundli Report');
        curY = 760;
      }

      pdf.setFillColor(isAlt ? PdfColors.LIGHT_BG : PdfColors.WHITE);
      pdf.drawRect(pdf.marginLeft, curY - 16, pdf.contentWidth, 18, true, false);

      pdf.drawText(p.planet, cols[0].x, curY - 12, 9, true, PdfColors.DARK_TEXT);
      pdf.drawText(p.sign, cols[1].x, curY - 12, 9, false, PdfColors.DARK_TEXT);
      pdf.drawText(`${(typeof p.degree === 'number' ? p.degree : 0).toFixed(2)} deg`, cols[2].x, curY - 12, 9, false, PdfColors.DARK_TEXT);
      pdf.drawText(`House ${p.house}`, cols[3].x, curY - 12, 9, false, PdfColors.DARK_TEXT);
      pdf.drawText(p.nakshatra, cols[4].x, curY - 12, 9, false, PdfColors.DARK_TEXT);
      pdf.drawText(String(p.pada), cols[5].x, curY - 12, 9, false, PdfColors.DARK_TEXT);

      if (p.isRetrograde) {
        pdf.drawText('Retrograde (R)', cols[6].x, curY - 12, 8, true, PdfColors.ROSE);
      } else {
        pdf.drawText('Direct', cols[6].x, curY - 12, 8, false, PdfColors.GREY_TEXT);
      }

      curY -= 18;
      isAlt = !isAlt;
    }

    // PAGE 3: House Summary & Interpretation Sections
    pdf.addPage();
    pdf.drawHeader('Birth Chart & Kundli Report');

    pdf.drawText('6. HOUSES & PLACEMENTS SUMMARY', pdf.marginLeft, 775, 12, true, PdfColors.INDIGO);

    curY = 755;
    pdf.setFillColor(PdfColors.INDIGO);
    pdf.drawRect(pdf.marginLeft, curY - 18, pdf.contentWidth, 22, true, false);

    pdf.drawText('House', pdf.marginLeft + 15, curY - 14, 9, true, PdfColors.WHITE);
    pdf.drawText('Sign (Rashi)', pdf.marginLeft + 120, curY - 14, 9, true, PdfColors.WHITE);
    pdf.drawText('Occupate Planets', pdf.marginLeft + 280, curY - 14, 9, true, PdfColors.WHITE);

    curY -= 20;
    isAlt = false;
    for (const h of report.houses) {
      pdf.setFillColor(isAlt ? PdfColors.LIGHT_BG : PdfColors.WHITE);
      pdf.drawRect(pdf.marginLeft, curY - 16, pdf.contentWidth, 18, true, false);

      pdf.drawText(`House ${h.houseNumber}`, pdf.marginLeft + 15, curY - 12, 9, true, PdfColors.DARK_TEXT);
      pdf.drawText(h.sign, pdf.marginLeft + 120, curY - 12, 9, false, PdfColors.DARK_TEXT);
      pdf.drawText(
        h.planetsPresent.length > 0 ? h.planetsPresent.join(', ') : 'None',
        pdf.marginLeft + 280,
        curY - 12,
        9,
        h.planetsPresent.length > 0,
        h.planetsPresent.length > 0 ? PdfColors.PURPLE : PdfColors.GREY_TEXT
      );

      curY -= 18;
      isAlt = !isAlt;
    }

    curY -= 25;
    pdf.drawText('7. ASTROLOGICAL INSIGHTS & INTERPRETATIONS', pdf.marginLeft, curY, 12, true, PdfColors.INDIGO);
    curY -= 15;

    for (const sec of report.sections) {
      if (curY < 120) {
        pdf.addPage();
        pdf.drawHeader('Birth Chart & Kundli Report');
        curY = 760;
      }

      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft, curY - 70, pdf.contentWidth, 70, true, true);

      pdf.drawText(sec.title, pdf.marginLeft + 15, curY - 18, 10, true, PdfColors.PURPLE);

      // Split text roughly if long
      const textLines = this.wrapText(sec.content, 95);
      let lineY = curY - 34;
      for (const line of textLines.slice(0, 3)) {
        pdf.drawText(line, pdf.marginLeft + 15, lineY, 8.5, false, PdfColors.DARK_TEXT);
        lineY -= 12;
      }

      curY -= 80;
    }
  }

  // --- PLANETARY SUMMARY PDF BUILDER ---

  private buildPlanetaryPdf(pdf: PdfWriter, report: StructuredReportModel): void {
    pdf.drawHeader('Planetary Summary Report');

    // Header Banner Box
    pdf.setFillColor(PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(2);
    pdf.drawRect(pdf.marginLeft, 690, pdf.contentWidth, 90, true, true);

    pdf.drawText('ASTRO SUSHIL', pdf.marginLeft + 20, 755, 20, true, PdfColors.GOLD);
    pdf.drawText('PLANETARY DYNAMICS & FORCE SUMMARY', pdf.marginLeft + 20, 735, 14, true, PdfColors.WHITE);
    pdf.drawText(
      `Profile: ${report.profile.name}  |  Generated: ${new Date(report.generatedAt).toLocaleDateString()}`,
      pdf.marginLeft + 20,
      708,
      9,
      false,
      PdfColors.WHITE
    );

    let curY = 660;

    // Detailed Planetary Table
    pdf.drawText('PLANETARY BREAKDOWN & SPEEDS', pdf.marginLeft, curY, 12, true, PdfColors.INDIGO);
    curY -= 20;

    pdf.setFillColor(PdfColors.INDIGO);
    pdf.drawRect(pdf.marginLeft, curY - 18, pdf.contentWidth, 22, true, false);

    const cols = [
      { name: 'Planet', x: pdf.marginLeft + 10 },
      { name: 'Sign', x: pdf.marginLeft + 90 },
      { name: 'Degree', x: pdf.marginLeft + 170 },
      { name: 'House', x: pdf.marginLeft + 250 },
      { name: 'Nakshatra', x: pdf.marginLeft + 310 },
      { name: 'Pada', x: pdf.marginLeft + 410 },
      { name: 'Status', x: pdf.marginLeft + 465 },
    ];

    for (const col of cols) {
      pdf.drawText(col.name, col.x, curY - 14, 9, true, PdfColors.WHITE);
    }

    curY -= 20;
    let isAlt = false;
    for (const p of report.planets) {
      pdf.setFillColor(isAlt ? PdfColors.LIGHT_BG : PdfColors.WHITE);
      pdf.drawRect(pdf.marginLeft, curY - 16, pdf.contentWidth, 18, true, false);

      pdf.drawText(p.planet, cols[0].x, curY - 12, 9, true, PdfColors.DARK_TEXT);
      pdf.drawText(p.sign, cols[1].x, curY - 12, 9, false, PdfColors.DARK_TEXT);
      pdf.drawText(`${(typeof p.degree === 'number' ? p.degree : 0).toFixed(2)} deg`, cols[2].x, curY - 12, 9, false, PdfColors.DARK_TEXT);
      pdf.drawText(`House ${p.house}`, cols[3].x, curY - 12, 9, false, PdfColors.DARK_TEXT);
      pdf.drawText(p.nakshatra, cols[4].x, curY - 12, 9, false, PdfColors.DARK_TEXT);
      pdf.drawText(String(p.pada), cols[5].x, curY - 12, 9, false, PdfColors.DARK_TEXT);

      if (p.isRetrograde) {
        pdf.drawText('Retrograde (R)', cols[6].x, curY - 12, 8, true, PdfColors.ROSE);
      } else {
        pdf.drawText('Direct', cols[6].x, curY - 12, 8, false, PdfColors.GREY_TEXT);
      }

      curY -= 18;
      isAlt = !isAlt;
    }

    curY -= 25;
    pdf.drawText('PLANETARY FORCE ANALYSIS', pdf.marginLeft, curY, 12, true, PdfColors.INDIGO);
    curY -= 15;

    for (const sec of report.sections) {
      pdf.setFillColor(PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawRect(pdf.marginLeft, curY - 70, pdf.contentWidth, 70, true, true);

      pdf.drawText(sec.title, pdf.marginLeft + 15, curY - 18, 10, true, PdfColors.PURPLE);

      const textLines = this.wrapText(sec.content, 95);
      let lineY = curY - 34;
      for (const line of textLines.slice(0, 3)) {
        pdf.drawText(line, pdf.marginLeft + 15, lineY, 8.5, false, PdfColors.DARK_TEXT);
        lineY -= 12;
      }

      curY -= 80;
    }
  }

  // --- NORTH INDIAN KUNDLI VECTOR CHART RENDERER ---

  private renderNorthIndianChart(
    pdf: PdfWriter,
    report: StructuredReportModel,
    x0: number,
    y0: number,
    s: number
  ): void {
    const x1 = x0 + s;
    const y1 = y0 + s;

    // 1. Draw Background Tint & Outer Square
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1.8);
    pdf.drawRect(x0, y0, s, s, true, true);

    // 2. Draw Diagonals
    pdf.setLineWidth(1.2);
    pdf.drawLine(x0, y1, x1, y0);
    pdf.drawLine(x1, y1, x0, y0);

    // 3. Draw Inner Diamond (connecting side midpoints)
    const midX = x0 + s / 2;
    const midY = y0 + s / 2;

    pdf.drawPoly([
      { x: midX, y: y1 }, // Top-Mid
      { x: x1, y: midY }, // Right-Mid
      { x: midX, y: y0 }, // Bottom-Mid
      { x: x0, y: midY }, // Left-Mid
    ]);

    // 4. House Compartment Coordinates & Content Placement
    const houseCenters = [
      { h: 1, x: midX, y: y0 + s * 0.76 }, // Top Inner Diamond (Lagna)
      { h: 2, x: x0 + s * 0.25, y: y0 + s * 0.88 }, // Top-Left Outer Triangle
      { h: 3, x: x0 + s * 0.12, y: y0 + s * 0.65 }, // Left-Top Outer Triangle
      { h: 4, x: x0 + s * 0.25, y: midY }, // Left Inner Diamond
      { h: 5, x: x0 + s * 0.12, y: y0 + s * 0.35 }, // Left-Bottom Outer Triangle
      { h: 6, x: x0 + s * 0.25, y: y0 + s * 0.12 }, // Bottom-Left Outer Triangle
      { h: 7, x: midX, y: y0 + s * 0.25 }, // Bottom Inner Diamond
      { h: 8, x: x0 + s * 0.75, y: y0 + s * 0.12 }, // Bottom-Right Outer Triangle
      { h: 9, x: x0 + s * 0.88, y: y0 + s * 0.35 }, // Right-Bottom Outer Triangle
      { h: 10, x: x0 + s * 0.75, y: midY }, // Right Inner Diamond
      { h: 11, x: x0 + s * 0.88, y: y0 + s * 0.65 }, // Right-Top Outer Triangle
      { h: 12, x: x0 + s * 0.75, y: y0 + s * 0.88 }, // Top-Right Outer Triangle
    ];

    // Helper map for planet short names
    const planetShortMap: Record<string, string> = {
      SUN: 'Su',
      MOON: 'Mo',
      MARS: 'Ma',
      MERCURY: 'Me',
      JUPITER: 'Ju',
      VENUS: 'Ve',
      SATURN: 'Sa',
      RAHU: 'Ra',
      KETU: 'Ke',
    };

    for (const hc of houseCenters) {
      const houseData = report.houses.find((h) => h.houseNumber === hc.h);
      const planetsInHouse = report.planets
        .filter((p) => p.house === hc.h)
        .map((p) => (planetShortMap[p.planet] || p.planet.substring(0, 2)) + (p.isRetrograde ? '(R)' : ''));

      // Draw House Number
      pdf.drawText(
        String(hc.h),
        hc.x,
        hc.y + 12,
        8,
        true,
        hc.h === 1 ? PdfColors.ROSE : PdfColors.PURPLE,
        'center'
      );

      // Draw Sign Name (rashi)
      if (houseData) {
        pdf.drawText(houseData.sign.substring(0, 3), hc.x, hc.y, 7, false, PdfColors.GREY_TEXT, 'center');
      }

      // Draw Occupant Planets
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

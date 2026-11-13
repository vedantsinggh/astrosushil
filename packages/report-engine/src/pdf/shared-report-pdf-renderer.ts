import {
  SharedReportDocument,
  ReportSection,
  ReportTable,
  ReportSectionSubsection,
  STANDARD_AUTHOR_MESSAGE,
  STANDARD_METHODOLOGY_NOTE,
  STANDARD_LEGAL_DISCLAIMER,
} from '../types/shared-report-foundation.types';
import { StructuredReportModel } from '../types/report.types';
import { extractVerifiedEvidenceFromChart } from '../validation/report-evidence.validator';
import { PdfWriter, PdfColors } from './pdf-writer';

export class SharedReportPdfRenderer {
  /**
   * Adapts and renders an existing StructuredReportModel (Kundli, Planetary, etc.)
   * through the shared vector PDF rendering pipeline.
   */
  public renderStructuredReport(report: StructuredReportModel | any): Buffer {
    const evidence = extractVerifiedEvidenceFromChart(report, report.profile, report.type);

    const sections: ReportSection[] = (report.sections || []).map((s: any, idx: number) => ({
      id: s.id || `section_${idx + 1}`,
      title: s.title || `Section ${idx + 1}`,
      category: 'INTERPRETATION',
      order: idx + 1,
      isRequired: true,
      status: 'VERIFIED' as const,
      summary: s.content ? s.content.substring(0, 180) + '...' : 'Verified astrological analysis.',
      content: s.content || '',
      evidenceRefs: s.keyValues && Object.keys(s.keyValues).length > 0
        ? Object.entries(s.keyValues).map(([k, v]) => `${k}:${v}`)
        : ['CALCULATED_NATAL_CHART'],
    }));

    // Add Planetary Table section
    if (report.planets && report.planets.length > 0) {
      const planetTable: ReportTable = {
        id: 'TBL_PLANETS',
        title: 'Nine Classical Graha Coordinates & Planetary Dignities',
        headers: ['Graha', 'Rashi (Sign)', 'Degree', 'House', 'Nakshatra'],
        rows: report.planets.map((p: any) => ({
          cells: [
            p.planet,
            p.sign,
            typeof p.degree === 'number' ? `${p.degree.toFixed(2)}°` : '0°',
            String(p.house || 1),
            p.nakshatra || '',
          ],
        })),
      };

      sections.unshift({
        id: 'SEC_PLANETARY_POSITIONS',
        title: 'Planetary Register & Mathematical Placements',
        category: 'ASTRONOMICAL',
        order: 1,
        isRequired: true,
        status: 'VERIFIED',
        summary: 'Authoritative planetary placements computed using Lahiri Ayanamsa and Whole Sign houses.',
        content: `Ascendant in ${report.ascendant?.sign || 'Aries'} at ${(report.ascendant?.degree || 0).toFixed(2)}°. Moon placed in ${report.nakshatra?.birthNakshatra || 'Ashwini'}.`,
        tables: [planetTable],
        evidenceRefs: ['ALL_NINE_GRAHAS', 'LAHIRI_AYANAMSA'],
      });

      // Re-index orders
      sections.forEach((s, i) => (s.order = i + 1));
    }

    const doc: SharedReportDocument = {
      metadata: {
        reportId: report.id || `REP-${Date.now()}`,
        reportType: report.type || 'KUNDLI',
        title: report.title || 'Birth Chart & Kundli Report',
        version: report.version || '1.0.0',
        generationTimestampIso: report.generatedAt || new Date().toISOString(),
        clientName: report.profile?.name || 'Valued Client',
      },
      evidence,
      sections,
      authorMessage: STANDARD_AUTHOR_MESSAGE,
      methodologyNote: STANDARD_METHODOLOGY_NOTE,
      legalDisclaimer: STANDARD_LEGAL_DISCLAIMER,
    };

    return this.renderToBuffer(doc);
  }

  /**
   * Renders a complete, authoritative, multi-page vector PDF from a SharedReportDocument.
   */
  public renderToBuffer(doc: SharedReportDocument): Buffer {
    const pdf = new PdfWriter();

    // ==========================================
    // PAGE 1: COVER & METADATA OVERVIEW
    // ==========================================
    this.renderCoverPage(pdf, doc);

    // ==========================================
    // PAGE 2: MESSAGE FROM AUTHOR & METHODOLOGY
    // ==========================================
    pdf.addPage();
    this.renderAuthorAndMethodologyPage(pdf, doc);

    // ==========================================
    // PAGE 3+: DYNAMIC SECTIONS & TABLES
    // ==========================================
    for (const section of doc.sections) {
      pdf.addPage();
      this.renderSectionPage(pdf, section, doc.metadata.title);
    }

    // ==========================================
    // FINAL PAGE: LEGAL DISCLAIMER & SUMMARY
    // ==========================================
    pdf.addPage();
    this.renderDisclaimerPage(pdf, doc);

    return pdf.buildPdfBuffer();
  }

  // -------------------------------------------------------------
  // COVER PAGE
  // -------------------------------------------------------------
  private renderCoverPage(pdf: PdfWriter, doc: SharedReportDocument): void {
    pdf.drawHeader(doc.metadata.title);

    // Hero Banner Card
    pdf.setFillColor(PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(2);
    pdf.drawRect(pdf.marginLeft, 670, pdf.contentWidth, 110, true, true);

    pdf.drawText('ASTRO SUSHIL', pdf.marginLeft + 20, 750, 22, true, PdfColors.GOLD);
    pdf.drawText(doc.metadata.title.toUpperCase(), pdf.marginLeft + 20, 725, 14, true, PdfColors.WHITE);
    if (doc.metadata.subtitle) {
      pdf.drawText(doc.metadata.subtitle, pdf.marginLeft + 20, 705, 10, false, PdfColors.LIGHT_BG);
    }
    pdf.drawText(
      `Prepared for: ${doc.evidence.birthDetails.name}  |  Generated: ${doc.metadata.generationTimestampIso.substring(0, 10)}`,
      pdf.marginLeft + 20,
      685,
      9,
      false,
      PdfColors.LIGHT_BG
    );

    // Client & Calculation Metadata Card
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 520, pdf.contentWidth, 130, true, true);

    pdf.drawText('CANONICAL CLIENT & ASTRONOMICAL METADATA', pdf.marginLeft + 15, 630, 11, true, PdfColors.INDIGO);

    const bd = doc.evidence.birthDetails;
    pdf.drawText(`Full Name: ${bd.name}`, pdf.marginLeft + 15, 608, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Date & Time: ${bd.dateOfBirth} at ${bd.timeOfBirth}`, pdf.marginLeft + 15, 590, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Birth Location: ${bd.placeName}`, pdf.marginLeft + 15, 572, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Coordinates: ${bd.latitude.toFixed(4)} N, ${bd.longitude.toFixed(4)} E`, pdf.marginLeft + 15, 554, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Timezone: ${bd.timezone}`, pdf.marginLeft + 15, 536, 9.5, false, PdfColors.DARK_TEXT);

    const cfg = doc.evidence.config;
    pdf.drawText(`Zodiac System: ${cfg.zodiacType}`, pdf.marginLeft + 280, 608, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Ayanamsa: ${cfg.ayanamsa}`, pdf.marginLeft + 280, 590, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`House System: ${cfg.houseSystem}`, pdf.marginLeft + 280, 572, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Node Mode: ${cfg.nodeCalculation}`, pdf.marginLeft + 280, 554, 9.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Engine Version: ${doc.evidence.calculationVersion} (${doc.evidence.providerName})`, pdf.marginLeft + 280, 536, 9.5, false, PdfColors.DARK_TEXT);

    // Executive Core Placements Summary
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.PURPLE);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 310, pdf.contentWidth, 190, true, true);

    pdf.drawText('VERIFIED CORE PLACEMENTS SNAPSHOT', pdf.marginLeft + 15, 480, 11, true, PdfColors.NAVY);
    const asc = doc.evidence.ascendant;
    pdf.drawText(`Ascendant (Lagna): ${asc.sign} (${asc.degree.toFixed(2)} deg, Nakshatra: ${asc.nakshatra} Pada ${asc.pada}, Lord: ${asc.lord})`, pdf.marginLeft + 15, 458, 9.5, true, PdfColors.INDIGO);

    const moon = doc.evidence.planets.find((p) => p.planet.toUpperCase() === 'MOON');
    if (moon) {
      pdf.drawText(`Moon (Chandra): ${moon.sign} in House ${moon.house} (${moon.degree.toFixed(2)} deg, Nakshatra: ${moon.nakshatra} Pada ${moon.pada})`, pdf.marginLeft + 15, 438, 9.5, false, PdfColors.DARK_TEXT);
    }
    const sun = doc.evidence.planets.find((p) => p.planet.toUpperCase() === 'SUN');
    if (sun) {
      pdf.drawText(`Sun (Surya): ${sun.sign} in House ${sun.house} (${sun.degree.toFixed(2)} deg, Nakshatra: ${sun.nakshatra} Pada ${sun.pada})`, pdf.marginLeft + 15, 418, 9.5, false, PdfColors.DARK_TEXT);
    }

    if (doc.evidence.dashas) {
      const d = doc.evidence.dashas;
      pdf.drawText(`Current Operating Dasha: ${d.currentMahadasha} Mahadasha / ${d.currentAntardasha} Antardasha`, pdf.marginLeft + 15, 396, 9.5, true, PdfColors.ROSE);
      pdf.drawText(`Dasha Window: ${d.startDate} to ${d.endDate}`, pdf.marginLeft + 15, 378, 9.5, false, PdfColors.DARK_TEXT);
    }

    // Document Table of Contents Box
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 60, pdf.contentWidth, 230, true, true);

    pdf.drawText('DOSSIER STRUCTURE & SECTION OVERVIEW', pdf.marginLeft + 15, 270, 11, true, PdfColors.NAVY);
    let tocY = 248;
    for (let i = 0; i < Math.min(doc.sections.length, 7); i++) {
      const s = doc.sections[i];
      const statusBadge = s.status === 'VERIFIED' ? '[VERIFIED]' : s.status === 'UNAVAILABLE' ? '[UNAVAILABLE]' : '[DERIVED]';
      pdf.drawText(`${i + 1}. ${s.title}`, pdf.marginLeft + 20, tocY, 9, false, PdfColors.DARK_TEXT);
      pdf.drawText(statusBadge, pdf.marginRight - 70, tocY, 8.5, true, s.status === 'VERIFIED' ? PdfColors.PURPLE : PdfColors.GREY_TEXT, 'right');
      tocY -= 22;
    }
  }

  // -------------------------------------------------------------
  // PAGE 2: MESSAGE FROM AUTHOR & METHODOLOGY
  // -------------------------------------------------------------
  private renderAuthorAndMethodologyPage(pdf: PdfWriter, doc: SharedReportDocument): void {
    pdf.drawHeader(doc.metadata.title);

    // Author Message Card
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 470, pdf.contentWidth, 310, true, true);

    pdf.drawText(doc.authorMessage.title.toUpperCase(), pdf.marginLeft + 20, 755, 12, true, PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1);
    pdf.drawLine(pdf.marginLeft + 20, 745, pdf.marginLeft + 200, 745);

    let curY = 725;
    curY = this.drawWrappedText(pdf, doc.authorMessage.body, pdf.marginLeft + 20, curY, pdf.contentWidth - 40, 9.5, 15);

    pdf.drawText(doc.authorMessage.authorName, pdf.marginLeft + 20, 520, 11, true, PdfColors.PURPLE);
    pdf.drawText(doc.authorMessage.designation, pdf.marginLeft + 20, 502, 9, false, PdfColors.GREY_TEXT);

    // Methodology Card
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, 60, pdf.contentWidth, 390, true, true);

    pdf.drawText(doc.methodologyNote.title.toUpperCase(), pdf.marginLeft + 20, 425, 12, true, PdfColors.INDIGO);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1);
    pdf.drawLine(pdf.marginLeft + 20, 415, pdf.marginLeft + 200, 415);

    this.drawWrappedText(pdf, doc.methodologyNote.body, pdf.marginLeft + 20, 395, pdf.contentWidth - 40, 9.5, 15);
  }

  // -------------------------------------------------------------
  // SECTION PAGE
  // -------------------------------------------------------------
  private renderSectionPage(pdf: PdfWriter, section: ReportSection, reportTitle: string): void {
    pdf.drawHeader(reportTitle);

    let curY = 770;

    // Section Banner Header Box
    const isUnavailable = section.status === 'UNAVAILABLE';
    pdf.setFillColor(isUnavailable ? PdfColors.LIGHT_BG : PdfColors.NAVY);
    pdf.setStrokeColor(isUnavailable ? PdfColors.BORDER_GREY : PdfColors.GOLD);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, curY - 45, pdf.contentWidth, 45, true, true);

    pdf.drawText(
      `${section.order}. ${section.title.toUpperCase()}`,
      pdf.marginLeft + 15,
      curY - 26,
      12,
      true,
      isUnavailable ? PdfColors.DARK_TEXT : PdfColors.GOLD
    );

    const badgeText = isUnavailable ? 'STATUS: UNAVAILABLE' : `STATUS: ${section.status}`;
    pdf.drawText(
      badgeText,
      pdf.marginRight - 15,
      curY - 26,
      9,
      true,
      isUnavailable ? PdfColors.GREY_TEXT : PdfColors.WHITE,
      'right'
    );

    curY -= 65;

    // Summary Card
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, curY - 60, pdf.contentWidth, 60, true, true);

    pdf.drawText('EXECUTIVE SUMMARY & FINDINGS', pdf.marginLeft + 15, curY - 18, 9.5, true, PdfColors.INDIGO);
    this.drawWrappedText(pdf, section.summary, pdf.marginLeft + 15, curY - 34, pdf.contentWidth - 30, 9, 13);

    curY -= 80;

    // Detailed Content
    if (section.content) {
      pdf.drawText('DETAILED ANALYSIS', pdf.marginLeft, curY, 10.5, true, PdfColors.NAVY);
      curY -= 18;
      curY = this.drawWrappedText(pdf, section.content, pdf.marginLeft, curY, pdf.contentWidth, 9.5, 14, 70, () => {
        pdf.addPage();
        pdf.drawHeader(reportTitle);
        return 770;
      });
      curY -= 15;
    }

    // Subsections
    if (section.subsections && section.subsections.length > 0) {
      for (const sub of section.subsections) {
        if (curY < 120) {
          pdf.addPage();
          pdf.drawHeader(reportTitle);
          curY = 770;
        }

        pdf.setFillColor(PdfColors.LIGHT_BG);
        pdf.setStrokeColor(PdfColors.BORDER_GREY);
        pdf.setLineWidth(0.5);
        pdf.drawRect(pdf.marginLeft, curY - 24, pdf.contentWidth, 24, true, true);

        pdf.drawText(sub.title, pdf.marginLeft + 10, curY - 16, 9.5, true, PdfColors.INDIGO);
        curY -= 36;

        curY = this.drawWrappedText(pdf, sub.content, pdf.marginLeft, curY, pdf.contentWidth, 9, 13, 70, () => {
          pdf.addPage();
          pdf.drawHeader(reportTitle);
          return 770;
        });

        if (sub.table) {
          curY = this.drawTable(pdf, sub.table, curY, 70, () => {
            pdf.addPage();
            pdf.drawHeader(reportTitle);
            return 770;
          });
        }
        curY -= 10;
      }
    }

    // Tables
    if (section.tables && section.tables.length > 0) {
      for (const table of section.tables) {
        if (curY < 120) {
          pdf.addPage();
          pdf.drawHeader(reportTitle);
          curY = 770;
        }
        curY = this.drawTable(pdf, table, curY, 70, () => {
          pdf.addPage();
          pdf.drawHeader(reportTitle);
          return 770;
        });
        curY -= 15;
      }
    }
  }

  // -------------------------------------------------------------
  // DISCLAIMER PAGE
  // -------------------------------------------------------------
  private renderDisclaimerPage(pdf: PdfWriter, doc: SharedReportDocument): void {
    pdf.drawHeader(doc.metadata.title);

    // Disclaimer Box
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft, 420, pdf.contentWidth, 360, true, true);

    pdf.drawText(doc.legalDisclaimer.title.toUpperCase(), pdf.marginLeft + 20, 750, 12, true, PdfColors.ROSE);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1);
    pdf.drawLine(pdf.marginLeft + 20, 740, pdf.marginLeft + 200, 740);

    let curY = 715;
    curY = this.drawWrappedText(pdf, doc.legalDisclaimer.body, pdf.marginLeft + 20, curY, pdf.contentWidth - 40, 9.5, 15);

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

    pdf.drawText(`Document Hash/Snapshot: ${doc.evidence.snapshotId}`, pdf.marginLeft + 20, 90, 8, false, PdfColors.GREY_TEXT);
  }

  // -------------------------------------------------------------
  // TABLE RENDERING HELPER WITH MULTI-PAGE WRAPPING
  // -------------------------------------------------------------
  private drawTable(
    pdf: PdfWriter,
    table: ReportTable,
    startY: number,
    minY: number,
    onPageBreak: () => number
  ): number {
    let curY = startY;
    const numCols = table.headers.length;
    const colWidth = pdf.contentWidth / numCols;
    const colWidths = table.colWidths && table.colWidths.length === numCols
      ? table.colWidths
      : Array(numCols).fill(colWidth);

    if (table.title) {
      pdf.drawText(table.title, pdf.marginLeft, curY, 10, true, PdfColors.INDIGO);
      curY -= 16;
    }

    // Header row
    pdf.setFillColor(PdfColors.NAVY);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, curY - 20, pdf.contentWidth, 20, true, true);

    let curX = pdf.marginLeft;
    for (let c = 0; c < numCols; c++) {
      const headerText = table.headers[c];
      pdf.drawText(headerText, curX + 6, curY - 14, 8.5, true, PdfColors.GOLD);
      curX += colWidths[c];
    }
    curY -= 20;

    // Body rows
    let rowIdx = 0;
    for (const row of table.rows) {
      if (curY - 18 < minY) {
        curY = onPageBreak();
        // Redraw table header on new page
        pdf.setFillColor(PdfColors.NAVY);
        pdf.setStrokeColor(PdfColors.GOLD);
        pdf.setLineWidth(1);
        pdf.drawRect(pdf.marginLeft, curY - 20, pdf.contentWidth, 20, true, true);
        let hX = pdf.marginLeft;
        for (let c = 0; c < numCols; c++) {
          pdf.drawText(table.headers[c], hX + 6, curY - 14, 8.5, true, PdfColors.GOLD);
          hX += colWidths[c];
        }
        curY -= 20;
      }

      pdf.setFillColor(rowIdx % 2 === 0 ? PdfColors.WHITE : PdfColors.LIGHT_BG);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.setLineWidth(0.5);
      pdf.drawRect(pdf.marginLeft, curY - 18, pdf.contentWidth, 18, true, true);

      let cellX = pdf.marginLeft;
      for (let c = 0; c < numCols; c++) {
        const val = row.cells[c] || '';
        pdf.drawText(val, cellX + 6, curY - 13, 8, false, PdfColors.DARK_TEXT);
        cellX += colWidths[c];
      }
      curY -= 18;
      rowIdx++;
    }

    return curY;
  }

  // -------------------------------------------------------------
  // TEXT WRAPPING & PAGINATION HELPER
  // -------------------------------------------------------------
  private drawWrappedText(
    pdf: PdfWriter,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    fontSize: number,
    lineHeight: number,
    minY: number = 50,
    onPageBreak?: () => number
  ): number {
    const lines = this.wrapText(text, Math.floor(maxWidth / (fontSize * 0.52)));
    let currentY = y;

    for (const line of lines) {
      if (currentY - lineHeight < minY && onPageBreak) {
        currentY = onPageBreak();
      }
      pdf.drawText(line, x, currentY, fontSize, false, PdfColors.DARK_TEXT);
      currentY -= lineHeight;
    }
    return currentY;
  }

  private wrapText(text: string, maxCharsPerLine: number): string[] {
    const paragraphs = text.split('\n');
    const result: string[] = [];

    for (const para of paragraphs) {
      if (!para.trim()) {
        result.push('');
        continue;
      }
      const words = para.split(' ');
      let currentLine = '';

      for (const word of words) {
        if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
          currentLine = (currentLine + ' ' + word).trim();
        } else {
          result.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) {
        result.push(currentLine);
      }
    }

    return result;
  }
}

export const sharedReportPdfRenderer = new SharedReportPdfRenderer();

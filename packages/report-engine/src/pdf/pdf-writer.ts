/**
 * Lightweight, zero-dependency PDF 1.4 document builder in TypeScript.
 * Renders crisp vector graphics, text, headers, footers, tables, and North Indian Kundli charts.
 */

export interface PdfColor {
  r: number; // 0.0 to 1.0
  g: number;
  b: number;
}

export class PdfColors {
  static readonly NAVY: PdfColor = { r: 0.071, g: 0.078, b: 0.251 }; // #121440
  static readonly INDIGO: PdfColor = { r: 0.114, g: 0.125, b: 0.349 }; // #1D2059
  static readonly PURPLE: PdfColor = { r: 0.380, g: 0.337, b: 0.549 }; // #61568C
  static readonly GOLD: PdfColor = { r: 0.851, g: 0.694, b: 0.231 }; // #D9B13B
  static readonly ROSE: PdfColor = { r: 0.510, g: 0.275, b: 0.380 }; // #824661
  static readonly DARK_TEXT: PdfColor = { r: 0.1, g: 0.1, b: 0.15 };
  static readonly GREY_TEXT: PdfColor = { r: 0.4, g: 0.4, b: 0.45 };
  static readonly LIGHT_BG: PdfColor = { r: 0.96, g: 0.96, b: 0.98 };
  static readonly WHITE: PdfColor = { r: 1.0, g: 1.0, b: 1.0 };
  static readonly BORDER_GREY: PdfColor = { r: 0.82, g: 0.82, b: 0.86 };
}

export interface PdfPage {
  streamContent: string[];
}

export class PdfWriter {
  private pages: PdfPage[] = [];
  private currentPageIndex: number = -1;

  // Page dimensions (A4 in points: 595.28 x 841.89)
  public readonly pageWidth = 595.28;
  public readonly pageHeight = 841.89;
  public readonly marginLeft = 36.0;
  public readonly marginRight = 559.28;
  public readonly contentWidth = 523.28;

  constructor() {
    this.addPage();
  }

  public addPage(): void {
    this.pages.push({ streamContent: [] });
    this.currentPageIndex = this.pages.length - 1;
  }

  private emit(op: string): void {
    if (this.currentPageIndex >= 0 && this.currentPageIndex < this.pages.length) {
      this.pages[this.currentPageIndex].streamContent.push(op);
    }
  }

  // --- Vector Graphics Operations ---

  public setStrokeColor(color: PdfColor): void {
    this.emit(`${color.r.toFixed(3)} ${color.g.toFixed(3)} ${color.b.toFixed(3)} RG`);
  }

  public setFillColor(color: PdfColor): void {
    this.emit(`${color.r.toFixed(3)} ${color.g.toFixed(3)} ${color.b.toFixed(3)} rg`);
  }

  public setLineWidth(width: number): void {
    this.emit(`${width.toFixed(2)} w`);
  }

  public drawRect(x: number, y: number, w: number, h: number, fill = false, stroke = true): void {
    this.emit(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
    if (fill && stroke) this.emit('B');
    else if (fill) this.emit('f');
    else if (stroke) this.emit('S');
  }

  public drawLine(x1: number, y1: number, x2: number, y2: number): void {
    this.emit(`${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  }

  public drawPoly(points: Array<{ x: number; y: number }>, close = true, fill = false, stroke = true): void {
    if (points.length === 0) return;
    this.emit(`${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} m`);
    for (let i = 1; i < points.length; i++) {
      this.emit(`${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)} l`);
    }
    if (close) this.emit('h');
    if (fill && stroke) this.emit('B');
    else if (fill) this.emit('f');
    else if (stroke) this.emit('S');
  }

  // --- Text Operations ---

  public sanitizeText(text: string): string {
    return text
      .replace(/°/g, ' deg')
      .replace(/•/g, '-')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }

  public drawText(
    text: string,
    x: number,
    y: number,
    fontSize: number = 10,
    isBold: boolean = false,
    color: PdfColor = PdfColors.DARK_TEXT,
    align: 'left' | 'center' | 'right' = 'left'
  ): void {
    const fontName = isBold ? '/F2' : '/F1';
    const cleanText = this.sanitizeText(text);

    // Approximate width estimation for centering/right alignment (Helvetica standard width ~0.55 * fontSize * chars)
    let approxWidth = cleanText.length * fontSize * 0.52;
    let targetX = x;
    if (align === 'center') {
      targetX = x - approxWidth / 2;
    } else if (align === 'right') {
      targetX = x - approxWidth;
    }

    this.setFillColor(color);
    this.emit('BT');
    this.emit(`${fontName} ${fontSize.toFixed(1)} Tf`);
    this.emit(`1 0 0 1 ${targetX.toFixed(2)} ${y.toFixed(2)} Tm`);
    this.emit(`(${cleanText}) Tj`);
    this.emit('ET');
  }

  // --- High-Level Layout Helpers ---

  public drawHeader(title: string): void {
    this.setStrokeColor(PdfColors.GOLD);
    this.setLineWidth(1);
    this.drawLine(this.marginLeft, 800, this.marginRight, 800);

    this.drawText('ASTRO SUSHIL', this.marginLeft, 806, 9, true, PdfColors.GOLD);
    this.drawText('•  VEDIC ASTROLOGY REPORT', this.marginLeft + 85, 806, 8, false, PdfColors.INDIGO);
    this.drawText(title, this.marginRight, 806, 9, true, PdfColors.PURPLE, 'right');
  }

  public drawFooter(): void {
    const totalPages = this.pages.length;
    for (let i = 0; i < totalPages; i++) {
      this.currentPageIndex = i;
      this.setStrokeColor(PdfColors.BORDER_GREY);
      this.setLineWidth(0.5);
      this.drawLine(this.marginLeft, 40, this.marginRight, 40);

      this.drawText(
        'Confidential  |  Deterministic Astrology Engine  |  Astro Sushil',
        this.marginLeft,
        28,
        8,
        false,
        PdfColors.GREY_TEXT
      );

      this.drawText(
        `Page ${i + 1} of ${totalPages}`,
        this.marginRight,
        28,
        8,
        false,
        PdfColors.GREY_TEXT,
        'right'
      );
    }
  }

  // --- PDF Document Assembly ---

  public buildPdfBuffer(): Buffer {
    // Inject footers onto all pages
    this.drawFooter();

    const objects: string[] = [];
    let objectCount = 0;

    // Helper to register an object
    const addObject = (content: string): number => {
      objectCount++;
      objects.push(content);
      return objectCount;
    };

    // Obj 1: Catalog
    const catalogObjId = addObject('<< /Type /Catalog /Pages 2 0 R >>');

    // Obj 2: Pages placeholder (will update kids)
    const pagesObjId = addObject(''); // Placeholder

    // Obj 3: Font Regular (Helvetica)
    const fontRegularObjId = addObject(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
    );

    // Obj 4: Font Bold (Helvetica-Bold)
    const fontBoldObjId = addObject(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
    );

    const pageObjIds: number[] = [];

    // Build Page & Content Stream objects
    for (const page of this.pages) {
      const streamText = page.streamContent.join('\n');
      const streamBuffer = Buffer.from(streamText, 'ascii');

      const streamObjId = addObject(
        `<< /Length ${streamBuffer.length} >>\nstream\n${streamText}\nendstream`
      );

      const pageObjId = addObject(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] /Contents ${streamObjId} 0 R /Resources << /Font << /F1 ${fontRegularObjId} 0 R /F2 ${fontBoldObjId} 0 R >> >> >>`
      );

      pageObjIds.push(pageObjId);
    }

    // Update Obj 2 (Pages)
    const kidsStr = pageObjIds.map((id) => `${id} 0 R`).join(' ');
    objects[1] = `<< /Type /Pages /Count ${pageObjIds.length} /Kids [${kidsStr}] >>`;

    // Calculate Byte Offsets for Xref Table
    let currentOffset = 15; // length of `%PDF-1.4\n`
    const header = '%PDF-1.4\n';
    const offsets: number[] = [];

    for (let i = 0; i < objects.length; i++) {
      offsets.push(currentOffset);
      const objHeader = `${i + 1} 0 obj\n`;
      const objFooter = '\nendobj\n';
      currentOffset += Buffer.byteLength(objHeader + objects[i] + objFooter, 'ascii');
    }

    const startXrefOffset = currentOffset;

    // Construct Xref Table
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets) {
      xref += `${offset.toString().padStart(10, '0')} 00000 n \n`;
    }

    const trailer = `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObjId} 0 R >>\nstartxref\n${startXrefOffset}\n%%EOF\n`;

    // Assemble final Buffer
    let pdfString = header;
    for (let i = 0; i < objects.length; i++) {
      pdfString += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    }
    pdfString += xref + trailer;

    return Buffer.from(pdfString, 'binary');
  }
}

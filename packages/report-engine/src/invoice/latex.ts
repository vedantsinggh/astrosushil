/**
 * Builds the LaTeX source of one invoice. Layout only: every figure is printed as given, nothing
 * is recalculated here. Content follows the website's three invoice templates
 * (`invoice.template.js`, `generateBookingInvoiceTemplate.js`, `generateReportInvoiceTemplate.js`).
 *
 * Every value that is not a number formatted in this file goes through `t()` (whitespace and
 * control characters removed, then the report pipeline's `tex()` escaping), so a name such as
 * `A & B {50%} \input{/etc/passwd}` is printed as written and can never become a command.
 */
import { tex } from '../platform/render/latex';
import { formatCalendarDate, formatIndianDate, formatMinor, formatPaise, formatRateBp } from './format';
import { InvoicePdfData, InvoicePdfLine } from './types';

const DASH = '---';

/**
 * One line of plain text: control characters, line breaks and invisible direction marks become a
 * space (a blank line inside a macro argument would stop the compile), and very long values are cut.
 * Zero-width joiners are kept: Devanagari conjuncts need them.
 */
function clean(value: string | number | null | undefined, max = 400): string {
  const text = String(value ?? '')
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B\u200E\u200F\u2028-\u202F\u2060-\u206F\uFEFF]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const chars = Array.from(text);
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : text;
}

/** Escaped text, ready to place in the document. */
function t(value: string | number | null | undefined, max?: number): string {
  return tex(clean(value, max));
}

/** Escaped text, or a dash when there is nothing to print. */
function tOrDash(value: string | number | null | undefined): string {
  return t(value) || DASH;
}

/**
 * Identifiers and e-mail addresses have no spaces, so they are allowed to break after any
 * character instead of running out of their box. Only applied to plain ASCII; anything else is
 * printed as ordinary text.
 */
function breakable(value: string | null | undefined): string {
  const text = clean(value, 120);
  if (!/^[\x21-\x7E]+$/.test(text)) return tex(text);
  return Array.from(text)
    .map((char) => tex(char))
    .join('\\allowbreak{}');
}

function inr(paise: number): string {
  return `\\Rs{}${formatPaise(paise)}`;
}

function titleCase(value: string): string {
  return clean(value)
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const METHOD_LABELS: Record<string, string> = { razorpay: 'Razorpay', manual: 'Manual', cod: 'Cash on Delivery' };
const MODE_LABELS: Record<string, string> = { audio: 'Audio Call', video: 'Video Call', in_person: 'In Person', message: 'WhatsApp Message' };

function methodLabel(method: string): string {
  return METHOD_LABELS[clean(method).toLowerCase()] ?? titleCase(method);
}

function modeLabel(mode: string): string {
  return MODE_LABELS[clean(mode).toLowerCase()] ?? titleCase(mode);
}

function paymentBadge(status: InvoicePdfData['payment']['status']): string {
  if (status === 'paid') return '\\InvPaid{PAID}';
  if (status === 'failed') return '\\InvFailed{FAILED}';
  return '\\InvPending{PENDING}';
}

function headerTex(data: InvoicePdfData): string {
  const { seller } = data;
  const contact = [seller.email, seller.phone].map((value) => t(value)).filter(Boolean).join(' \\textbullet{} ');
  const sellerLines = [t(seller.address, 600), `GSTIN: ${t(seller.gstin)}`, contact, t(seller.website)].filter(Boolean);

  const dates: string[] = [];
  const orderDate = formatIndianDate(data.orderDate);
  if (data.invoiceDate) dates.push(`Invoice Date: ${formatIndianDate(data.invoiceDate)}`);
  if (data.saleType === 'consultation') {
    dates.push(`Booked On: ${orderDate}`);
    if (data.consultation) dates.push(`Scheduled: ${t(formatCalendarDate(clean(data.consultation.date)))}`);
  } else if (data.saleType === 'report') {
    dates.push(`Order Date: ${orderDate}`);
    if (data.lines[0]) dates.push(`Report: ${t(data.lines[0].title, 120)}`);
  } else {
    dates.push(`${data.invoiceDate ? 'Order Date' : 'Date'}: ${orderDate}`);
  }

  return `\\InvHeader{${t(clean(seller.legalName).toUpperCase())}}{${t(seller.tagline)}}{${sellerLines.join('\\par ')}}{${t(data.invoiceNumber)}}{${dates.join('\\par ')}}`;
}

function factsTex(data: InvoicePdfData): string {
  const facts: Array<[string, string]> = [[data.saleType === 'consultation' ? 'Booking ID' : 'Order ID', breakable(data.orderReference)]];
  if (data.saleType === 'order') facts.push(['Order Status', tOrDash(titleCase(data.orderStatus))]);
  if (data.saleType === 'consultation' && data.consultation) {
    facts.push(['Slot', tOrDash(data.consultation.slot)], ['Mode', tOrDash(modeLabel(data.consultation.mode))]);
  }
  facts.push(['Place of Supply', tOrDash(data.placeOfSupplyLabel || data.placeOfSupply)], ['Reverse Charge', data.reverseCharge ? 'Yes' : 'No'], ['Payment', paymentBadge(data.payment.status)]);

  const n = facts.length;
  const width = `\\dimexpr(\\linewidth-${2 * (n - 1)}\\tabcolsep)/${n}\\relax`;
  return [
    '\\begin{tcolorbox}[enhanced,colback=InvSurface,colframe=InvRule,boxrule=0.5pt,arc=1.2mm,left=4mm,right=4mm,top=2.4mm,bottom=2.4mm]',
    `\\setlength{\\tabcolsep}{2mm}\\begin{tabular}{@{}*{${n}}{p{${width}}}@{}}`,
    `${facts.map(([label, value]) => `\\InvFact{${label}}{${value}}`).join(' & ')}\\\\`,
    '\\end{tabular}',
    '\\end{tcolorbox}',
  ].join('\n');
}

function cardsTex(data: InvoicePdfData): string {
  const customer = [
    `\\InvStrong{${tOrDash(data.customer.name)}}`,
    data.customer.email ? breakable(data.customer.email) : '',
    data.customer.phone ? t(data.customer.phone) : '',
  ].filter(Boolean);

  const cards: Array<[string, string]> = [['Customer Details', customer.join('\\par ')]];

  const address = data.shippingAddress;
  if (address) {
    const street = [address.addressLine1, address.addressLine2].map((value) => t(value)).filter(Boolean).join(', ');
    const place = [address.city, address.state].map((value) => t(value)).filter(Boolean).join(', ');
    const pin = t(address.postalCode);
    const lines = [
      `\\InvStrong{${tOrDash(address.fullName)}}`,
      t(address.phone),
      street,
      [place, pin].filter(Boolean).join(` ${DASH} `),
      t(address.country),
    ].filter(Boolean);
    cards.push(['Shipping Address', lines.join('\\par ')]);
  }

  const payment = [
    `\\InvPair{Status}{\\bfseries ${paymentBadge(data.payment.status)}}`,
    `\\InvPair{Method}{\\InvStrong{${tOrDash(methodLabel(data.payment.method))}}}`,
    data.payment.gatewayPaymentId ? `\\InvPair{Txn ID}{${breakable(data.payment.gatewayPaymentId)}}` : '',
    data.payment.paidAt ? `\\InvPair{Paid On}{${formatIndianDate(data.payment.paidAt)}}` : '',
  ].filter(Boolean);
  cards.push(['Payment Details', payment.join('\n')]);

  const n = cards.length;
  const width = `\\dimexpr(\\linewidth-${(n - 1) * 7}mm)/${n}\\relax`;
  return [
    '\\begin{InvCards}',
    cards.map(([heading, body]) => `\\begin{InvCard}{${heading}}{${width}}\n${body}\n\\end{InvCard}`).join('\\hfill\n'),
    '\\end{InvCards}',
  ].join('\n');
}

function lineNote(line: InvoicePdfLine, data: InvoicePdfData): string {
  const notes: string[] = [];
  const description = t(line.description, 240);
  if (description) notes.push(description);
  if (data.saleType === 'consultation' && data.consultation && data.lines.length === 1) {
    const c = data.consultation;
    notes.push(
      [`${t(c.durationMinutes)} mins`, t(modeLabel(c.mode)), [t(formatCalendarDate(clean(c.date))), t(c.slot)].filter(Boolean).join(', ')]
        .filter(Boolean)
        .join(' \\textbullet{} ')
    );
  }
  return notes.map((note) => `\\InvItemNote{${note}}`).join('');
}

/** True when the invoice carries the GST split (a full tax invoice); older data prints as before. */
function hasSplit(data: InvoicePdfData): boolean {
  return data.taxType === 'intra' || data.taxType === 'inter';
}

function itemsTex(data: InvoicePdfData): string {
  if (hasSplit(data)) return taxItemsTex(data);
  const head = ['\\#', 'Item', 'Qty', 'Unit Price', 'Taxable Value', 'GST', 'GST Amount', 'Total'].map((label) => `\\InvTh{${label}}`).join(' & ');
  const rows = data.lines.map((line, index) => {
    const taxed = line.taxRateBp > 0 && line.taxPaise > 0;
    const rate = taxed ? `${tex(formatRateBp(line.taxRateBp))}\\InvItemNote{${line.taxInclusive ? 'included' : 'added'}}` : DASH;
    const cells = [
      `\\InvTd{${index + 1}}`,
      `\\InvItemTitle{${tOrDash(line.title)}}${lineNote(line, data)}`,
      `\\InvTd{${t(line.quantity)}}`,
      `\\InvTd{${inr(line.unitPricePaise)}}`,
      `\\InvTd{${typeof line.taxablePaise === 'number' ? inr(line.taxablePaise) : DASH}}`,
      `\\InvTd{${rate}}`,
      `\\InvTd{${taxed ? inr(line.taxPaise) : DASH}}`,
      `\\InvTd{\\bfseries\\color{InvInk}${inr(line.lineTotalPaise)}}`,
    ];
    return `${cells.join(' & ')}\\\\\\hline`;
  });

  return [
    '{\\setlength{\\tabcolsep}{1.8mm}\\setlength{\\LTleft}{0pt}\\setlength{\\LTright}{0pt}\\setlength{\\LTpre}{0pt}\\setlength{\\LTpost}{3mm}\\arrayrulecolor{InvRule}',
    '\\begin{longtable}{C{6mm}L{43mm}C{8mm}R{21mm}R{22mm}C{11mm}R{18mm}R{22mm}}',
    `\\rowcolor{InvInk}${head}\\\\`,
    '\\endhead',
    ...rows,
    '\\end{longtable}}',
  ].join('\n');
}

/** Item table of a GST tax invoice: HSN/SAC column and the tax as CGST + SGST or IGST. */
function taxItemsTex(data: InvoicePdfData): string {
  const intra = data.taxType === 'intra';
  const taxHeads = intra ? ['CGST', 'SGST'] : ['IGST'];
  const head = ['\\#', 'Item', 'HSN/SAC', 'Qty', 'Taxable Value', 'Rate', ...taxHeads, 'Total'].map((label) => `\\InvTh{${label}}`).join(' & ');
  const rows = data.lines.map((line, index) => {
    const taxed = line.taxRateBp > 0 && line.taxPaise > 0;
    const amount = (value: number | undefined) => (taxed && typeof value === 'number' ? inr(value) : DASH);
    const taxCells = intra ? [amount(line.cgstPaise), amount(line.sgstPaise)] : [amount(line.igstPaise)];
    const cells = [
      `\\InvTd{${index + 1}}`,
      `\\InvItemTitle{${tOrDash(line.title)}}${lineNote(line, data)}`,
      `\\InvTd{${line.hsnSac ? t(line.hsnSac, 12) : DASH}}`,
      `\\InvTd{${t(line.quantity)}}`,
      `\\InvTd{${typeof line.taxablePaise === 'number' ? inr(line.taxablePaise) : DASH}}`,
      `\\InvTd{${taxed ? tex(formatRateBp(line.taxRateBp)) : DASH}}`,
      ...taxCells.map((cell) => `\\InvTd{${cell}}`),
      `\\InvTd{\\bfseries\\color{InvInk}${inr(line.lineTotalPaise)}}`,
    ];
    return `${cells.join(' & ')}\\\\\\hline`;
  });
  const columns = intra
    ? 'C{6mm}L{36mm}C{14mm}C{8mm}R{20mm}C{10mm}R{17mm}R{17mm}R{20mm}'
    : 'C{6mm}L{50mm}C{14mm}C{8mm}R{21mm}C{10mm}R{20mm}R{22mm}';
  return [
    '{\\setlength{\\tabcolsep}{1.5mm}\\setlength{\\LTleft}{0pt}\\setlength{\\LTright}{0pt}\\setlength{\\LTpre}{0pt}\\setlength{\\LTpost}{3mm}\\arrayrulecolor{InvRule}',
    `\\begin{longtable}{${columns}}`,
    `\\rowcolor{InvInk}${head}\\\\`,
    '\\endhead',
    ...rows,
    '\\end{longtable}}',
  ].join('\n');
}

/** Half of a GST rate (the CGST and the SGST rate), e.g. 9% of 18%. */
function halfRate(rateBp: number): string {
  if (rateBp % 2 === 0) return formatRateBp(rateBp / 2);
  return `${rateBp / 200}%`;
}

/** GST rows of the totals box for a tax invoice: CGST and SGST (half rate each) or IGST, per rate. */
function splitTaxRows(data: InvoicePdfData): string[] {
  const byRate = new Map<number, { cgst: number; sgst: number; igst: number }>();
  for (const line of data.lines) {
    if (!(line.taxRateBp > 0 && line.taxPaise > 0)) continue;
    const row = byRate.get(line.taxRateBp) ?? { cgst: 0, sgst: 0, igst: 0 };
    row.cgst += line.cgstPaise ?? 0;
    row.sgst += line.sgstPaise ?? 0;
    row.igst += line.igstPaise ?? 0;
    byRate.set(line.taxRateBp, row);
  }
  const rows: string[] = [];
  for (const [rateBp, row] of [...byRate.entries()].sort((a, b) => a[0] - b[0])) {
    if (data.taxType === 'intra') {
      rows.push(`\\InvTotalRow{CGST @ ${tex(halfRate(rateBp))}}{${inr(row.cgst)}}`);
      rows.push(`\\InvTotalRow{SGST @ ${tex(halfRate(rateBp))}}{${inr(row.sgst)}}`);
    } else {
      rows.push(`\\InvTotalRow{IGST @ ${tex(formatRateBp(rateBp))}}{${inr(row.igst)}}`);
    }
  }
  return rows;
}

function totalsTex(data: InvoicePdfData): string {
  const { totals, payment } = data;
  const rows: string[] = [`\\InvTotalRow{Subtotal}{${inr(totals.subTotalPaise)}}`];
  if (totals.discountPaise > 0) rows.push(`\\InvDiscountRow{Discount}{\\textminus\\,${inr(totals.discountPaise)}}`);
  if (totals.shippingPaise > 0) rows.push(`\\InvTotalRow{Shipping}{${inr(totals.shippingPaise)}}`);

  if (data.lines.length && data.lines.every((line) => typeof line.taxablePaise === 'number')) {
    const taxable = data.lines.reduce((sum, line) => sum + (line.taxablePaise as number), 0);
    rows.push(`\\InvTotalRow{Taxable Value (Excl. GST)}{${inr(taxable)}}`);
  }
  if (hasSplit(data)) {
    rows.push(...splitTaxRows(data));
    if (totals.taxPaise > 0) rows.push(`\\InvTotalRow{Total GST}{${inr(totals.taxPaise)}}`);
  } else if (totals.taxByRate.length) {
    for (const row of totals.taxByRate) {
      rows.push(`\\InvTotalRow{GST ${tex(formatRateBp(row.rateBp))} ${DASH} ${row.inclusive ? 'Included' : 'Added'}}{${inr(row.taxPaise)}}`);
    }
  } else if (totals.taxPaise > 0) {
    rows.push(`\\InvTotalRow{GST}{${inr(totals.taxPaise)}}`);
  }

  const currency = clean(payment.currency).toUpperCase();
  const foreign = currency !== '' && currency !== 'INR';
  let grand: string;
  if (foreign) {
    // The owner has not decided how a foreign-currency invoice should print (money.md, open question 8):
    // the amount charged, with its INR value and the stored rate beneath.
    rows.push(`\\InvTotalRow{Total in INR}{${inr(totals.grandTotalPaise)}}`);
    const charged = `${t(currency)} ${formatMinor(payment.amountMinor, payment.minorUnitExponent ?? 2)}`;
    const beneath = `INR equivalent: ${inr(totals.grandTotalPaise)}\\par Exchange rate: 1 INR = ${t(payment.exchangeRate)} ${t(currency)}`;
    grand = `\\InvGrand{Grand Total}{${charged}}{${beneath}}`;
  } else {
    grand = `\\InvGrand{Grand Total}{${inr(totals.grandTotalPaise)}}{}`;
  }

  return [
    '\\hfill\\begin{minipage}{84mm}',
    '{\\setlength{\\tabcolsep}{0pt}\\begin{tabular}{@{\\hspace{4mm}}L{46mm}R{30mm}@{\\hspace{4mm}}}',
    ...rows,
    '\\end{tabular}}\\par\\vspace{1.5mm}',
    grand,
    foreign ? '\\InvNote{\\RaggedLeft Prices and GST on this invoice are stated in Indian rupees.}' : '',
    '\\end{minipage}',
  ]
    .filter(Boolean)
    .join('\n');
}

/** PDF metadata is plain ASCII: nothing customer-supplied reaches it. */
function pdfTitle(data: InvoicePdfData): string {
  return `Invoice ${clean(data.invoiceNumber, 60).replace(/[^A-Za-z0-9 /-]/g, '')}`.trim();
}

export function buildInvoiceLatex(data: InvoicePdfData): string {
  return [
    '\\documentclass[10pt,oneside]{article}',
    '\\usepackage{astrosushil-invoice}',
    `\\renewcommand{\\InvFooterSignatory}{{\\bfseries For ${t(data.seller.legalName)}} \\textbullet{} Authorized Signatory}`,
    `\\renewcommand{\\InvFooterNumber}{${t(data.invoiceNumber)}}`,
    '\\begin{document}',
    headerTex(data),
    '\\vspace{1mm}',
    factsTex(data),
    cardsTex(data),
    itemsTex(data),
    totalsTex(data),
    `\\special{pdf:docinfo << /Title (${pdfTitle(data)}) /Creator (Astro Sushil) >>}`,
    '\\end{document}',
    '',
  ].join('\n');
}

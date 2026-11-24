import { invoicePdf } from '@astro/report-engine';
import { prisma } from '../../services/prisma.service';
import { AppError, RateLimitError } from '../../errors/app-error';
import { logger } from '../../utils/logger';
import { CURRENCY_EXPONENT, isSupportedCurrency } from '../commerce/money/currency';
import { InvoiceDocumentData, invoiceService } from './invoice.service';

/**
 * The invoice as a PDF, generated on demand from the invoice data and never stored (the website
 * does the same through its remote Chrome). The renderer is XeLaTeX in `@astro/report-engine`.
 *
 * A compile costs a few seconds of CPU, so three guards sit in front of it. They are held in this
 * process's memory: with several API processes each one applies them separately.
 *   - per user: at most `customerPerWindow` (staff: `staffPerWindow`) requests per `windowMs`;
 *   - per order: one compile at a time; requests arriving meanwhile share its result;
 *   - overall: at most `maxConcurrent` compiles at once and `maxQueued` waiting, beyond that 503.
 * The compile itself is stopped after `timeoutMs` (per XeLaTeX pass).
 */
export const INVOICE_PDF_LIMITS = {
  windowMs: 60_000,
  customerPerWindow: 10,
  staffPerWindow: 30,
  maxConcurrent: 2,
  maxQueued: 8,
  timeoutMs: 20_000,
} as const;

export interface InvoicePdfResult {
  pdf: Buffer;
  filename: string;
  invoiceNumber: string;
}

type Renderer = (data: invoicePdf.InvoicePdfData, options?: invoicePdf.RenderInvoiceOptions) => Promise<Buffer>;

export interface InvoicePdfServiceOptions {
  render?: Renderer;
  now?: () => number;
  limits?: Partial<typeof INVOICE_PDF_LIMITS>;
}

export class InvoicePdfService {
  private readonly render: Renderer;
  private readonly now: () => number;
  private readonly limits: { [K in keyof typeof INVOICE_PDF_LIMITS]: number };
  /** Request times per user inside the current window. */
  private readonly requests = new Map<string, number[]>();
  /** Compiles in progress, by order id. */
  private readonly inFlight = new Map<string, Promise<Buffer>>();
  private running = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(options: InvoicePdfServiceOptions = {}) {
    this.render = options.render ?? ((data, renderOptions) => invoicePdf.renderInvoicePdf(data, renderOptions));
    this.now = options.now ?? Date.now;
    this.limits = { ...INVOICE_PDF_LIMITS, ...options.limits };
  }

  /**
   * The PDF for one order. The requester must own the order unless `asStaff` is set (the route has
   * then already checked the admin permission). Someone else's order is "not found".
   */
  public async getInvoicePdf(orderId: string, requester: { id: string }, asStaff: boolean = false): Promise<InvoicePdfResult> {
    this.countRequest(requester.id, asStaff);

    const data = await invoiceService.getInvoiceData(orderId, requester, asStaff);

    // Website (booking and report invoice downloads): while the number is still being allocated
    // the download is refused. A product order prints with its "Invoice being prepared" label instead.
    if (data.saleType !== 'order' && !data.numberAllocated && data.allocationStatus === 'PENDING') {
      throw new AppError('Invoice is being prepared. Please try again shortly.', 409, 'INVOICE_BEING_PREPARED');
    }

    const document = await this.toDocument(data);
    const pdf = await this.compileOnce(orderId, document);
    return { pdf, filename: `invoice-${orderId}.pdf`, invoiceNumber: data.invoiceNumber };
  }

  /** Clears the counters (tests). */
  public reset(): void {
    this.requests.clear();
  }

  private countRequest(userId: string, asStaff: boolean): void {
    const now = this.now();
    const since = now - this.limits.windowMs;
    if (this.requests.size > 5000) {
      for (const [key, times] of this.requests) {
        if (!times.some((time) => time > since)) this.requests.delete(key);
      }
    }
    const key = `${asStaff ? 'staff' : 'customer'}:${userId}`;
    const recent = (this.requests.get(key) ?? []).filter((time) => time > since);
    const allowed = asStaff ? this.limits.staffPerWindow : this.limits.customerPerWindow;
    if (recent.length >= allowed) {
      this.requests.set(key, recent);
      throw new RateLimitError('Too many invoice downloads. Please wait a minute and try again.');
    }
    recent.push(now);
    this.requests.set(key, recent);
  }

  /** Adds what only the PDF prints: the currency's decimals and, for a consultation, the appointment. */
  private async toDocument(data: InvoiceDocumentData): Promise<invoicePdf.InvoicePdfData> {
    const currency = data.payment.currency.toUpperCase();
    const document: invoicePdf.InvoicePdfData = {
      ...data,
      payment: { ...data.payment, minorUnitExponent: isSupportedCurrency(currency) ? CURRENCY_EXPONENT[currency] : 2 },
    };

    if (data.saleType === 'consultation') {
      const booking = await prisma.consultationBooking.findFirst({
        where: { orderId: data.orderId },
        orderBy: { createdAt: 'asc' },
        select: { date: true, startTime: true, endTime: true, mode: true, durationMinutes: true },
      });
      if (booking) {
        document.consultation = {
          date: booking.date,
          slot: `${booking.startTime}-${booking.endTime}`,
          mode: booking.mode,
          durationMinutes: booking.durationMinutes,
        };
      }
    }
    return document;
  }

  private compileOnce(orderId: string, document: invoicePdf.InvoicePdfData): Promise<Buffer> {
    const running = this.inFlight.get(orderId);
    if (running) return running;

    const job = this.withSlot(() => this.compile(orderId, document)).finally(() => {
      this.inFlight.delete(orderId);
    });
    this.inFlight.set(orderId, job);
    return job;
  }

  private async withSlot<T>(task: () => Promise<T>): Promise<T> {
    if (this.running >= this.limits.maxConcurrent) {
      if (this.waiting.length >= this.limits.maxQueued) {
        throw new AppError('Invoice generation is busy. Please try again in a moment.', 503, 'INVOICE_PDF_BUSY');
      }
      // The finishing task hands its slot over directly, so `running` is not changed here.
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    } else {
      this.running += 1;
    }
    try {
      return await task();
    } finally {
      const next = this.waiting.shift();
      if (next) next();
      else this.running -= 1;
    }
  }

  private async compile(orderId: string, document: invoicePdf.InvoicePdfData): Promise<Buffer> {
    try {
      return await this.render(document, { timeoutMs: this.limits.timeoutMs });
    } catch (err) {
      if (err instanceof invoicePdf.InvoicePdfError) {
        // `kind` and `texError` carry no invoice content (see InvoicePdfError).
        logger.error({ orderId, kind: err.kind, texError: err.texError }, 'Invoice PDF could not be generated');
        if (err.kind === 'timeout') {
          throw new AppError('Invoice generation took too long. Please try again.', 503, 'INVOICE_PDF_TIMEOUT');
        }
        if (err.kind === 'unavailable') {
          throw new AppError('Invoice PDF generation is not available on this server.', 503, 'INVOICE_PDF_UNAVAILABLE');
        }
        throw new AppError('The invoice PDF could not be generated.', 500, 'INVOICE_PDF_FAILED');
      }
      logger.error({ orderId, error: err instanceof Error ? err.name : 'unknown' }, 'Invoice PDF could not be generated');
      throw new AppError('The invoice PDF could not be generated.', 500, 'INVOICE_PDF_FAILED');
    }
  }
}

export const invoicePdfService = new InvoicePdfService();

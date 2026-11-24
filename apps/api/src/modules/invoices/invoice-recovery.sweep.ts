import { prisma } from '../../services/prisma.service';
import { AppError } from '../../errors/app-error';
import { logger } from '../../utils/logger';
import { settleOrderPaid } from '../commerce/money/settlement';
import { INVOICE_COUNTER_KEY } from './invoice-number';
import { AllocationResult, invoiceService } from './invoice.service';
import type { Prisma } from '@prisma/client';

/** Website default: `INVOICE_RECOVERY_CRON` = every 5 minutes. */
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const MIN_INTERVAL_MS = 10 * 1000;
const DEFAULT_BATCH = 200;

function positiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

export function invoiceRecoveryIntervalMs(env: NodeJS.ProcessEnv = process.env): number {
  return Math.max(positiveInt(env.INVOICE_RECOVERY_INTERVAL_MS, DEFAULT_INTERVAL_MS), MIN_INTERVAL_MS);
}

/**
 * Settlement of one paid order during recovery (manual admin action and automatic sweep alike):
 * the ledger row becomes SUCCESS, carrying the gateway payment id stored on the order, and the
 * invoice gets its number. Called by `invoiceService.allocatePending` under the order row lock.
 */
export async function settlePaidOrderForRecovery(tx: Prisma.TransactionClient, orderId: string): Promise<AllocationResult> {
  const order = await tx.order.findUnique({ where: { id: orderId }, select: { razorpayPaymentId: true, razorpayOrderId: true } });
  const settlement = await settleOrderPaid(tx, orderId, {
    gatewayPaymentId: order?.razorpayPaymentId ?? null,
    gatewayOrderId: order?.razorpayOrderId ?? null,
  });
  return settlement.invoice;
}

export type InvoiceRecoveryOutcome =
  | { ran: false; reason: 'paused' | 'counter-not-initialised' }
  | { ran: true; allocated: number; stillPending: number; failures: number };

/**
 * Automatic invoice recovery, run in the worker process (website: `invoice-recovery.worker.js`,
 * every 5 minutes and once at start-up). It numbers paid sales whose invoice was left pending:
 * exactly what the admin action `POST /admin/invoices/allocate-pending` does, with the same
 * settlement (ledger row SUCCESS + invoice number, under the order row lock, oldest payment first).
 *
 * It never initialises the counter and never numbers anything before a super admin has done so:
 * while the counter row does not exist, or numbering is paused (`INVOICE_NUMBERING_ENABLED=false`),
 * a run does nothing. Allocation is idempotent, so a second worker process running the same sweep
 * cannot give a sale two numbers or one number to two sales.
 *
 * Env (names only): `INVOICE_RECOVERY_INTERVAL_MS` (default 300000), `INVOICE_RECOVERY_BATCH`
 * (default 200 sales per run), `INVOICE_RECOVERY_ENABLED=false` switches it off.
 */
export class InvoiceRecoveryScheduler {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private saidWhyIdle: string | null = null;

  /** One sweep. Safe to call at any time; reports why it did nothing when it did nothing. */
  public async tick(): Promise<InvoiceRecoveryOutcome> {
    if (invoiceService.isPaused()) return this.idle('paused');
    const counter = await prisma.invoiceCounter.findUnique({ where: { key: INVOICE_COUNTER_KEY }, select: { key: true } });
    if (!counter) return this.idle('counter-not-initialised');

    let result: Awaited<ReturnType<typeof invoiceService.allocatePending>>;
    try {
      result = await invoiceService.allocatePending(
        positiveInt(process.env.INVOICE_RECOVERY_BATCH, DEFAULT_BATCH),
        settlePaidOrderForRecovery
      );
    } catch (err) {
      // The counter was removed or numbering paused between the check above and the run.
      if (err instanceof AppError && err.code === 'INVOICE_COUNTER_NOT_INITIALISED') return this.idle('counter-not-initialised');
      if (err instanceof AppError && err.code === 'INVOICE_NUMBERING_PAUSED') return this.idle('paused');
      throw err;
    }

    this.saidWhyIdle = null;
    const outcome = {
      ran: true as const,
      allocated: result.allocated.length,
      stillPending: result.stillPending.length,
      failures: result.failures.length,
    };
    if (result.failures.length) {
      logger.error({ ...outcome, failed: result.failures }, '[InvoiceRecovery] Some invoices could not be numbered; they stay pending');
    } else if (result.allocated.length || result.stillPending.length) {
      logger.info(outcome, '[InvoiceRecovery] Pending invoices numbered');
    }
    return outcome;
  }

  public start(): void {
    if (this.timer) return;
    if (process.env.INVOICE_RECOVERY_ENABLED === 'false') {
      logger.info('[InvoiceRecovery] Disabled by INVOICE_RECOVERY_ENABLED=false');
      return;
    }
    const intervalMs = invoiceRecoveryIntervalMs();
    logger.info({ intervalMs }, '[InvoiceRecovery] Starting the pending-invoice sweep');
    void this.run();
    this.timer = setInterval(() => void this.run(), intervalMs);
    this.timer.unref?.();
  }

  public stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** A run that never overlaps the previous one and never throws (same shape as the messaging sweeps). */
  private async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.tick();
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, '[InvoiceRecovery] Sweep failed');
    } finally {
      this.running = false;
    }
  }

  /** Says once (not every five minutes) why nothing is being numbered. */
  private idle(reason: 'paused' | 'counter-not-initialised'): InvoiceRecoveryOutcome {
    if (this.saidWhyIdle !== reason) {
      this.saidWhyIdle = reason;
      logger.warn(
        { reason },
        reason === 'paused'
          ? '[InvoiceRecovery] Invoice numbering is paused; pending invoices are left as they are'
          : '[InvoiceRecovery] Invoice counter is not initialised; pending invoices are left as they are'
      );
    }
    return { ran: false, reason };
  }
}

export const invoiceRecoveryScheduler = new InvoiceRecoveryScheduler();

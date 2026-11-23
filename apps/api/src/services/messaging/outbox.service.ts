import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.service';
import { logger } from '../../utils/logger';
import { messagingEnv, WhatsAppTemplateKey } from './config';
import { getMessagingProviders } from './provider-registry';
import type { MessageChannel, MessagingProviders, SendResult } from './types';

/**
 * Outbox for event messages (SMS, WhatsApp, e-mail).
 *
 * Why an outbox: the business transaction only has to INSERT rows. Delivery then
 * happens outside the request, with bounded retries, and survives a crash.
 *
 * Idempotency: each message has a unique `dedupeKey`
 * (event : entity : audience : channel). Raising the same event again - a retried
 * request, a duplicate payment webhook, a worker restart - hits the unique index and
 * creates nothing. A row is sent by exactly one process: it is claimed with a
 * conditional update (PENDING -> SENDING) before the provider is called.
 *
 * Crash in the middle of a send: the row stays SENDING. We cannot know whether the
 * provider accepted it, so after MESSAGING_STALE_LOCK_MINUTES it is marked FAILED
 * with DELIVERY_UNCERTAIN and NOT sent again (a customer must never get the same
 * message twice). It is visible in the table and in the error log for follow-up.
 */

export type OutboxPayload =
  | { kind: 'sms'; text: string }
  | { kind: 'whatsapp'; template: WhatsAppTemplateKey; variables: Record<string, string> }
  | { kind: 'email'; subject: string; html: string; text?: string };

export type MessageAudience = 'CUSTOMER' | 'ADMIN';

export interface NewOutboundMessage {
  /** Event name, e.g. "booking-confirmed". */
  event: string;
  /** Identifies this occurrence of the event, e.g. the booking id (plus status/date where an entity can raise the event more than once). */
  entityKey: string;
  entityId?: string;
  userId?: string;
  audience?: MessageAudience;
  channel: MessageChannel;
  /** E.164 phone number or e-mail address. */
  recipient: string;
  payload: OutboxPayload;
  /** Earliest send time; default now. */
  notBefore?: Date;
}

export interface OutboundRow {
  id: string;
  dedupeKey: string;
  event: string;
  channel: MessageChannel;
  recipient: string;
  payload: OutboxPayload;
  attempts: number;
  maxAttempts: number;
}

export interface StoredOutboundMessage extends Required<Pick<NewOutboundMessage, 'event' | 'channel' | 'recipient' | 'payload'>> {
  dedupeKey: string;
  entityId: string | null;
  userId: string | null;
  audience: MessageAudience;
  notBefore: Date;
  maxAttempts: number;
}

/** Persistence used by the outbox; the Prisma implementation is below, tests use an in-memory one. */
export interface OutboxStore {
  /** Returns false when a row with the same dedupeKey already exists. */
  insert(row: StoredOutboundMessage): Promise<boolean>;
  findDue(now: Date, limit: number): Promise<OutboundRow[]>;
  /** PENDING -> SENDING, attempts + 1. False when another process got there first. */
  claim(id: string, now: Date): Promise<boolean>;
  markSent(id: string, now: Date, providerMessageId?: string): Promise<void>;
  markRetry(id: string, notBefore: Date, error: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  /** SENDING rows locked before `lockedBefore` -> FAILED (DELIVERY_UNCERTAIN). Returns how many. */
  failStale(lockedBefore: Date): Promise<number>;
}

export const dedupeKeyOf = (m: Pick<NewOutboundMessage, 'event' | 'entityKey' | 'audience' | 'channel'>): string =>
  `${m.event}:${m.entityKey}:${m.audience ?? 'CUSTOMER'}:${m.channel}`;

export class PrismaOutboxStore implements OutboxStore {
  public async insert(row: StoredOutboundMessage): Promise<boolean> {
    try {
      await prisma.outboundMessage.create({
        data: {
          dedupeKey: row.dedupeKey,
          event: row.event,
          entityId: row.entityId,
          userId: row.userId,
          audience: row.audience,
          channel: row.channel,
          recipient: row.recipient,
          payload: row.payload as unknown as Prisma.InputJsonValue,
          notBefore: row.notBefore,
          maxAttempts: row.maxAttempts,
        },
      });
      return true;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return false;
      throw err;
    }
  }

  public async findDue(now: Date, limit: number): Promise<OutboundRow[]> {
    const rows = await prisma.outboundMessage.findMany({
      where: { status: 'PENDING', notBefore: { lte: now } },
      orderBy: { notBefore: 'asc' },
      take: limit,
      select: {
        id: true,
        dedupeKey: true,
        event: true,
        channel: true,
        recipient: true,
        payload: true,
        attempts: true,
        maxAttempts: true,
      },
    });
    return rows.map((r) => ({ ...r, payload: r.payload as unknown as OutboxPayload }));
  }

  public async claim(id: string, now: Date): Promise<boolean> {
    const res = await prisma.outboundMessage.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'SENDING', lockedAt: now, attempts: { increment: 1 } },
    });
    return res.count === 1;
  }

  public async markSent(id: string, now: Date, providerMessageId?: string): Promise<void> {
    await prisma.outboundMessage.update({
      where: { id },
      data: { status: 'SENT', sentAt: now, lockedAt: null, lastError: null, providerMessageId: providerMessageId ?? null },
    });
  }

  public async markRetry(id: string, notBefore: Date, error: string): Promise<void> {
    await prisma.outboundMessage.update({
      where: { id },
      data: { status: 'PENDING', notBefore, lockedAt: null, lastError: error },
    });
  }

  public async markFailed(id: string, error: string): Promise<void> {
    await prisma.outboundMessage.update({
      where: { id },
      data: { status: 'FAILED', lockedAt: null, lastError: error },
    });
  }

  public async failStale(lockedBefore: Date): Promise<number> {
    const res = await prisma.outboundMessage.updateMany({
      where: { status: 'SENDING', lockedAt: { lt: lockedBefore } },
      data: { status: 'FAILED', lockedAt: null, lastError: 'DELIVERY_UNCERTAIN: process stopped during the send; not re-sent' },
    });
    return res.count;
  }
}

export interface EnqueueResult {
  /** dedupe keys of rows created by this call */
  queued: string[];
  /** dedupe keys that already existed (the event was raised before) */
  duplicates: string[];
}

export interface DispatchSummary {
  sent: number;
  retried: number;
  failed: number;
}

export interface OutboxOptions {
  store?: OutboxStore;
  providers?: () => MessagingProviders;
  now?: () => Date;
}

const errorText = (result: Extract<SendResult, { ok: false }>): string =>
  (result.detail ? `${result.code}: ${result.detail}` : result.code).slice(0, 300);

export class OutboxService {
  private readonly store: OutboxStore;
  private readonly providers: () => MessagingProviders;
  private readonly now: () => Date;
  private dispatching = false;

  constructor(options: OutboxOptions = {}) {
    this.store = options.store ?? new PrismaOutboxStore();
    this.providers = options.providers ?? getMessagingProviders;
    this.now = options.now ?? (() => new Date());
  }

  /** Inserts the messages; rows whose dedupeKey already exists are reported as duplicates and left untouched. */
  public async enqueue(messages: NewOutboundMessage[]): Promise<EnqueueResult> {
    const result: EnqueueResult = { queued: [], duplicates: [] };
    const maxAttempts = messagingEnv().outbox.maxAttempts;
    for (const m of messages) {
      const dedupeKey = dedupeKeyOf(m);
      const created = await this.store.insert({
        dedupeKey,
        event: m.event,
        entityId: m.entityId ?? null,
        userId: m.userId ?? null,
        audience: m.audience ?? 'CUSTOMER',
        channel: m.channel,
        recipient: m.recipient,
        payload: m.payload,
        notBefore: m.notBefore ?? this.now(),
        maxAttempts,
      });
      (created ? result.queued : result.duplicates).push(dedupeKey);
    }
    return result;
  }

  /**
   * Sends every due message once. Safe to run from several processes at the same
   * time: each row is claimed before it is sent.
   */
  public async processDue(): Promise<DispatchSummary> {
    const summary: DispatchSummary = { sent: 0, retried: 0, failed: 0 };
    if (this.dispatching) return summary;
    this.dispatching = true;
    try {
      const env = messagingEnv().outbox;
      const due = await this.store.findDue(this.now(), env.batchSize);
      for (const row of due) {
        if (!(await this.store.claim(row.id, this.now()))) continue;
        const attempt = row.attempts + 1;

        let result: SendResult;
        try {
          result = await this.deliver(row);
        } catch (err) {
          // Providers return failures instead of throwing; this is a last line of defence.
          result = { ok: false, code: 'UNEXPECTED_ERROR', retryable: true, detail: err instanceof Error ? err.name : undefined };
        }

        if (result.ok) {
          await this.store.markSent(row.id, this.now(), result.providerMessageId);
          summary.sent += 1;
          logger.info(
            { messageId: row.id, event: row.event, channel: row.channel, attempt, simulated: result.simulated === true },
            '[Outbox] Message sent'
          );
          continue;
        }

        const error = errorText(result);
        if (result.retryable && attempt < row.maxAttempts) {
          // 30 s, 2 min, 8 min, ... (base * 4^(attempt-1))
          const delayMs = env.retryBaseSeconds * 1000 * Math.pow(4, attempt - 1);
          await this.store.markRetry(row.id, new Date(this.now().getTime() + delayMs), error);
          summary.retried += 1;
          logger.warn({ messageId: row.id, event: row.event, channel: row.channel, attempt, error }, '[Outbox] Send failed; will retry');
        } else {
          await this.store.markFailed(row.id, error);
          summary.failed += 1;
          logger.error(
            { messageId: row.id, event: row.event, channel: row.channel, attempt, error },
            '[Outbox] Message NOT delivered; giving up'
          );
        }
      }
    } finally {
      this.dispatching = false;
    }
    return summary;
  }

  /** Marks sends interrupted by a crash as FAILED (never re-sent). */
  public async recoverStale(): Promise<number> {
    const cutoff = new Date(this.now().getTime() - messagingEnv().outbox.staleLockMinutes * 60 * 1000);
    const count = await this.store.failStale(cutoff);
    if (count > 0) {
      logger.error({ count }, '[Outbox] Sends interrupted by a process stop were marked FAILED (delivery uncertain, not re-sent)');
    }
    return count;
  }

  /**
   * Fire-and-forget dispatch right after an enqueue, so a message does not wait for
   * the worker's next sweep. Never throws. Disabled with MESSAGING_INLINE_DISPATCH=false.
   */
  public kick(): void {
    if (process.env.MESSAGING_INLINE_DISPATCH === 'false') return;
    void this.processDue().catch((err) => {
      logger.warn({ err: err instanceof Error ? err.message : String(err) }, '[Outbox] Inline dispatch failed; the worker sweep will pick the messages up');
    });
  }

  private deliver(row: OutboundRow): Promise<SendResult> {
    const providers = this.providers();
    const p = row.payload;
    switch (p.kind) {
      case 'sms':
        return providers.sms.send({ to: row.recipient, text: p.text });
      case 'whatsapp':
        return providers.whatsapp.send({ to: row.recipient, template: p.template, variables: p.variables });
      case 'email':
        return providers.email.send({ to: row.recipient, subject: p.subject, html: p.html, text: p.text });
      default:
        return Promise.resolve({ ok: false, code: 'UNKNOWN_PAYLOAD', retryable: false });
    }
  }
}

export const outboxService = new OutboxService();

/**
 * Admin notification campaigns (owner request 2026-11-27): staff send a message to one customer,
 * a chosen list, an uploaded phone/e-mail list or a ready-made group, by
 *   - app: a push banner on the phone (Firebase) and an entry in the app's notification inbox,
 *   - e-mail (free text, through the messaging outbox),
 *   - SMS and WhatsApp: only through an approved template (Indian DLT rules and WhatsApp do not
 *     allow free-text marketing). They are offered once SMS_ANNOUNCEMENT_TEMPLATE /
 *     WHATCHIMP_ANNOUNCEMENT_TEMPLATE_ID are configured.
 *
 * Consent (owner decision): an IMPORTANT message goes to everyone chosen; a PROMOTION only to
 * customers who switched promotions on. Each customer's own push / e-mail switches are respected
 * for both kinds. Sending happens in the background; the campaign row keeps the counts.
 */
import { Prisma } from '@prisma/client';
import { z } from 'zod/v3';
import { prisma } from '../../services/prisma.service';
import { logger } from '../../utils/logger';
import { NotFoundError, ValidationError } from '../../errors/app-error';
import { normalizePhoneNumber } from '../../utils/phone';
import { messagingEnv } from '../../services/messaging/config';
import { outboxService, NewOutboundMessage } from '../../services/messaging/outbox.service';
import { emailTemplates } from '../../services/messaging/templates/email.templates';
import { whatsappTemplates } from '../../services/messaging/templates/whatsapp.templates';
import { fcmProvider } from './fcm.provider';

export const CAMPAIGN_CHANNELS = ['PUSH', 'IN_APP', 'EMAIL', 'SMS', 'WHATSAPP'] as const;
export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number];

export const CAMPAIGN_SEGMENTS = [
  'ALL_CUSTOMERS',
  'APP_USERS',
  'REPORT_BUYERS',
  'CONSULTATION_BUYERS',
  'PRODUCT_BUYERS',
  'JOINED_BETWEEN',
] as const;
export type CampaignSegment = (typeof CAMPAIGN_SEGMENTS)[number];

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const campaignAudienceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('users'), userIds: z.array(z.string().uuid()).min(1).max(5000) }),
  z.object({ type: z.literal('segment'), segment: z.enum(CAMPAIGN_SEGMENTS), from: day.optional(), to: day.optional() }),
  z.object({ type: z.literal('list'), entries: z.array(z.string().trim().min(3).max(254)).min(1).max(10000) }),
]);
export type CampaignAudience = z.infer<typeof campaignAudienceSchema>;

export const createCampaignSchema = z
  .object({
    kind: z.enum(['IMPORTANT', 'PROMOTION']),
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().min(1).max(1000),
    link: z.union([z.string().trim().url().max(500).refine((v) => /^https:\/\//.test(v), 'Link must start with https://'), z.literal('')]).optional(),
    channels: z.array(z.enum(CAMPAIGN_CHANNELS)).min(1),
    audience: campaignAudienceSchema,
  })
  .strict();
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

/** SMS text of the DLT-approved announcement template, with {#var#} for the name and the message. */
function smsTemplate(): string | null {
  const t = process.env.SMS_ANNOUNCEMENT_TEMPLATE?.trim();
  return t && t.includes('{#var#}') ? t : null;
}

export function fillSmsTemplate(template: string, name: string, message: string): string {
  let index = 0;
  return template.replace(/\{#var#\}/g, () => (index++ === 0 ? name : message));
}

export interface ChannelAvailability {
  PUSH: { available: boolean; note: string | null };
  IN_APP: { available: boolean; note: string | null };
  EMAIL: { available: boolean; note: string | null };
  SMS: { available: boolean; note: string | null };
  WHATSAPP: { available: boolean; note: string | null };
}

export function channelAvailability(env = messagingEnv()): ChannelAvailability {
  const pushReady = fcmProvider.isConfigured();
  return {
    PUSH: { available: true, note: pushReady ? null : 'Firebase is not set up yet: phones will not get a banner until it is. The message still goes to the app inbox.' },
    IN_APP: { available: true, note: null },
    EMAIL: { available: true, note: env.email.host ? null : 'E-mail server (SMTP) is not configured: e-mails will wait in the outbox.' },
    SMS: smsTemplate() && env.sms.apiKey
      ? { available: true, note: null }
      : { available: false, note: 'Needs a DLT-approved announcement template (SMS_ANNOUNCEMENT_TEMPLATE) and the SMS key.' },
    WHATSAPP: env.whatsapp.templateIds.ANNOUNCEMENT && env.whatsapp.apiToken
      ? { available: true, note: null }
      : { available: false, note: 'Needs an approved WhatsApp announcement template (WHATCHIMP_ANNOUNCEMENT_TEMPLATE_ID).' },
  };
}

function istRange(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined;
  return {
    ...(from ? { gte: new Date(`${from}T00:00:00.000+05:30`) } : {}),
    ...(to ? { lte: new Date(`${to}T23:59:59.999+05:30`) } : {}),
  };
}

/** Customers only (staff accounts never receive campaigns), and never an erased account. */
const LIVE_CUSTOMER: Prisma.UserWhereInput = { role: 'USER', NOT: { fullName: 'Deleted User', phoneNumber: null, email: null } };

async function buyersOf(type: 'REPORT' | 'CONSULTATION' | 'ORDER'): Promise<string[]> {
  // The ledger knows every successful sale, including the website's migrated history.
  const rows = await prisma.paymentTransaction.findMany({
    where: { status: 'SUCCESS', type },
    select: { userId: true },
    distinct: ['userId'],
  });
  return rows.map((r) => r.userId);
}

export interface ResolvedAudience {
  userIds: string[];
  /** List entries (phone / e-mail) that matched no customer. */
  unmatched: string[];
}

export async function resolveAudience(audience: CampaignAudience): Promise<ResolvedAudience> {
  if (audience.type === 'users') {
    const rows = await prisma.user.findMany({ where: { ...LIVE_CUSTOMER, id: { in: audience.userIds } }, select: { id: true } });
    return { userIds: rows.map((r) => r.id), unmatched: [] };
  }
  if (audience.type === 'list') {
    const emails: string[] = [];
    const phones: string[] = [];
    const unmatched: string[] = [];
    const original = new Map<string, string>();
    for (const raw of audience.entries) {
      const entry = raw.trim();
      if (!entry) continue;
      if (entry.includes('@')) {
        const email = entry.toLowerCase();
        emails.push(email);
        original.set(email, entry);
      } else {
        try {
          const phone = normalizePhoneNumber(entry.replace(/[‐-―−]/g, '-'));
          phones.push(phone);
          original.set(phone, entry);
        } catch {
          unmatched.push(entry);
        }
      }
    }
    const rows = await prisma.user.findMany({
      where: { ...LIVE_CUSTOMER, OR: [{ email: { in: emails } }, { phoneNumber: { in: phones } }] },
      select: { id: true, email: true, phoneNumber: true },
    });
    const found = new Set<string>();
    for (const r of rows) {
      if (r.email) found.add(r.email);
      if (r.phoneNumber) found.add(r.phoneNumber);
    }
    for (const key of [...emails, ...phones]) if (!found.has(key)) unmatched.push(original.get(key) ?? key);
    return { userIds: [...new Set(rows.map((r) => r.id))], unmatched };
  }

  let where: Prisma.UserWhereInput = { ...LIVE_CUSTOMER };
  switch (audience.segment) {
    case 'ALL_CUSTOMERS':
      break;
    case 'APP_USERS':
      where = { ...where, deviceTokens: { some: { isActive: true } } };
      break;
    case 'REPORT_BUYERS':
      where = { ...where, id: { in: await buyersOf('REPORT') } };
      break;
    case 'CONSULTATION_BUYERS':
      where = { ...where, id: { in: await buyersOf('CONSULTATION') } };
      break;
    case 'PRODUCT_BUYERS':
      where = { ...where, id: { in: await buyersOf('ORDER') } };
      break;
    case 'JOINED_BETWEEN': {
      const range = istRange(audience.from, audience.to);
      if (!range) throw new ValidationError('Choose the "joined from" and/or "joined to" date');
      where = { ...where, createdAt: range };
      break;
    }
  }
  const rows = await prisma.user.findMany({ where, select: { id: true } });
  return { userIds: rows.map((r) => r.id), unmatched: [] };
}

interface Recipient {
  id: string;
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
  pushEnabled: boolean;
  emailEnabled: boolean;
  promotions: boolean;
  devices: number;
}

async function loadRecipients(userIds: string[]): Promise<Recipient[]> {
  const out: Recipient[] = [];
  for (let i = 0; i < userIds.length; i += 1000) {
    const rows = await prisma.user.findMany({
      where: { id: { in: userIds.slice(i, i + 1000) } },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        notificationPreference: { select: { pushEnabled: true, emailEnabled: true, promotions: true } },
        _count: { select: { deviceTokens: { where: { isActive: true } } } },
      },
    });
    for (const r of rows) {
      out.push({
        id: r.id,
        fullName: r.fullName,
        email: r.email,
        phoneNumber: r.phoneNumber,
        // No saved preferences = the defaults of NotificationPreference.
        pushEnabled: r.notificationPreference?.pushEnabled ?? true,
        emailEnabled: r.notificationPreference?.emailEnabled ?? true,
        promotions: r.notificationPreference?.promotions ?? false,
        devices: r._count.deviceTokens,
      });
    }
  }
  return out;
}

export interface CampaignPreview {
  matched: number;
  willReceive: number;
  skippedNoConsent: number;
  withApp: number;
  withEmail: number;
  withPhone: number;
  unmatched: string[];
  channels: ChannelAvailability;
}

export async function previewCampaign(input: Pick<CreateCampaignInput, 'kind' | 'audience'>): Promise<CampaignPreview> {
  const { userIds, unmatched } = await resolveAudience(input.audience);
  const recipients = await loadRecipients(userIds);
  const eligible = input.kind === 'PROMOTION' ? recipients.filter((r) => r.promotions) : recipients;
  return {
    matched: recipients.length,
    willReceive: eligible.length,
    skippedNoConsent: recipients.length - eligible.length,
    withApp: eligible.filter((r) => r.devices > 0).length,
    withEmail: eligible.filter((r) => r.email).length,
    withPhone: eligible.filter((r) => r.phoneNumber).length,
    unmatched: unmatched.slice(0, 200),
    channels: channelAvailability(),
  };
}

const display = (r: Recipient) => r.fullName?.trim() || 'Customer';

export class CampaignsService {
  public async create(input: CreateCampaignInput, actor: { id: string; name: string }) {
    const availability = channelAvailability();
    const unavailable = input.channels.filter((c) => !availability[c].available);
    if (unavailable.length) throw new ValidationError(`Not available yet: ${unavailable.join(', ')}. ${unavailable.map((c) => availability[c].note).join(' ')}`);
    const { userIds } = await resolveAudience(input.audience);
    if (userIds.length === 0) throw new ValidationError('No customer matches this audience');

    const campaign = await prisma.notificationCampaign.create({
      data: {
        kind: input.kind,
        title: input.title,
        body: input.body,
        link: input.link || null,
        channels: input.channels,
        audience: input.audience as unknown as Prisma.InputJsonValue,
        recipients: userIds.length,
        createdById: actor.id,
        createdByName: actor.name,
      },
    });
    // In the background: a large list must not hold the admin's request open.
    setImmediate(() => {
      this.run(campaign.id, userIds).catch((err) =>
        logger.error({ campaignId: campaign.id, err: err instanceof Error ? err.message : String(err) }, '[Campaigns] Campaign failed')
      );
    });
    return campaign;
  }

  /** Sends one campaign. Exported for tests; normally started by `create`. */
  public async run(campaignId: string, userIds: string[]): Promise<void> {
    const campaign = await prisma.notificationCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) return;
    const channels = new Set(campaign.channels as string[]);
    await prisma.notificationCampaign.update({ where: { id: campaignId }, data: { status: 'SENDING', startedAt: new Date() } });

    const counts = { skippedNoConsent: 0, inApp: 0, pushSent: 0, pushFailed: 0, noDevice: 0, emailQueued: 0, smsQueued: 0, whatsappQueued: 0 };
    const sms = smsTemplate();
    const isPromotion = campaign.kind === 'PROMOTION';
    const route = campaign.link ? 'OPEN_LINK' : 'OPEN_NOTIFICATIONS';
    try {
      const recipients = await loadRecipients(userIds);
      for (const r of recipients) {
        if (isPromotion && !r.promotions) {
          counts.skippedNoConsent += 1;
          continue;
        }
        if (channels.has('IN_APP') || channels.has('PUSH')) {
          await prisma.notification.create({
            data: {
              userId: r.id,
              type: isPromotion ? 'PROMOTIONAL' : 'ANNOUNCEMENT',
              title: campaign.title,
              body: campaign.body,
              metadata: JSON.stringify({ campaignId, route, ...(campaign.link ? { link: campaign.link } : {}) }),
            },
          });
          counts.inApp += 1;
        }
        if (channels.has('PUSH') && r.pushEnabled) {
          const tokens = await prisma.deviceToken.findMany({ where: { userId: r.id, isActive: true }, select: { fcmToken: true } });
          if (tokens.length === 0) counts.noDevice += 1;
          for (const t of tokens) {
            const res = await fcmProvider.sendPushNotification({
              token: t.fcmToken,
              notification: { title: campaign.title, body: campaign.body.slice(0, 240) },
              data: { type: isPromotion ? 'PROMOTIONAL' : 'ANNOUNCEMENT', route, campaignId, ...(campaign.link ? { link: campaign.link } : {}) },
            });
            if (res.success) counts.pushSent += 1;
            else counts.pushFailed += 1;
          }
        }
        const outbound: NewOutboundMessage[] = [];
        const entityKey = `${campaignId}:${r.id}`;
        if (channels.has('EMAIL') && r.emailEnabled && r.email) {
          const mail = emailTemplates.ANNOUNCEMENT({ name: display(r), title: campaign.title, message: campaign.body, link: campaign.link });
          outbound.push({ event: 'campaign', entityKey, entityId: campaignId, userId: r.id, channel: 'EMAIL', recipient: r.email, payload: { kind: 'email', subject: mail.subject, html: mail.html } });
        }
        if (channels.has('SMS') && sms && r.phoneNumber) {
          outbound.push({ event: 'campaign', entityKey, entityId: campaignId, userId: r.id, channel: 'SMS', recipient: r.phoneNumber, payload: { kind: 'sms', text: fillSmsTemplate(sms, display(r), campaign.body) } });
        }
        if (channels.has('WHATSAPP') && r.phoneNumber) {
          const wa = whatsappTemplates.ANNOUNCEMENT({ name: display(r), message: campaign.body });
          outbound.push({ event: 'campaign', entityKey, entityId: campaignId, userId: r.id, channel: 'WHATSAPP', recipient: r.phoneNumber, payload: { kind: 'whatsapp', template: wa.template, variables: wa.variables } });
        }
        if (outbound.length) {
          const result = await outboxService.enqueue(outbound);
          // Queued rows come back as dedupe keys, which end with the channel.
          for (const key of result.queued) {
            if (key.endsWith(':EMAIL')) counts.emailQueued += 1;
            else if (key.endsWith(':SMS')) counts.smsQueued += 1;
            else if (key.endsWith(':WHATSAPP')) counts.whatsappQueued += 1;
          }
        }
      }
      outboxService.kick();
      await prisma.notificationCampaign.update({ where: { id: campaignId }, data: { ...counts, status: 'SENT', finishedAt: new Date() } });
    } catch (err) {
      await prisma.notificationCampaign.update({
        where: { id: campaignId },
        data: { ...counts, status: 'FAILED', finishedAt: new Date(), error: err instanceof Error ? err.message.slice(0, 500) : 'Unknown error' },
      });
      throw err;
    }
  }

  public async list(page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      prisma.notificationCampaign.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.notificationCampaign.count(),
    ]);
    return { items, total, page, limit };
  }

  public async get(id: string) {
    const row = await prisma.notificationCampaign.findUnique({ where: { id } });
    if (!row) throw new NotFoundError('Campaign not found');
    return row;
  }
}

export const campaignsService = new CampaignsService();

/**
 * Messaging configuration, read from the environment at call time (so tests and
 * long-running processes always see the current values). Only NAMES are documented
 * in infrastructure/deployment/vm/.env.vm.example; values never appear in the code.
 */

import { recipientAllowlistFromEnv, type RecipientAllowlist } from './recipient-allowlist';

export type ProviderChoice = 'auto' | 'fake' | 'none' | string;

export interface MessagingEnv {
  nodeEnv: string;
  isProduction: boolean;
  frontendUrl: string;
  adminUrl: string;
  adminEmail: string | null;
  adminPhone: string | null;
  sms: {
    provider: ProviderChoice;
    url: string;
    apiKey: string | null;
    clientId: string | null;
    senderId: string | null;
  };
  whatsapp: {
    provider: ProviderChoice;
    url: string;
    apiToken: string | null;
    phoneNumberId: string | null;
    templateIds: Record<WhatsAppTemplateKey, string | null>;
  };
  email: {
    provider: ProviderChoice;
    host: string | null;
    port: number;
    secure: boolean;
    user: string | null;
    pass: string | null;
    fromAddress: string | null;
    fromName: string;
  };
  httpTimeoutMs: number;
  otp: {
    identifierWindowMinutes: number;
    identifierMaxPerWindow: number;
    identifierMaxPerDay: number;
    ipWindowMinutes: number;
    ipMaxPerWindow: number;
    ipMaxPerDay: number;
  };
  outbox: {
    maxAttempts: number;
    retryBaseSeconds: number;
    staleLockMinutes: number;
    dispatchIntervalMs: number;
    batchSize: number;
  };
  reportSendDelayHours: number;
  consultationReminderIstHour: number;
  /**
   * Testing deployments only (MESSAGING_RECIPIENT_ALLOWLIST_ENABLED and MESSAGING_ALLOWED_*,
   * recipient-allowlist.ts). Absent or disabled: every recipient is sent to, as before.
   */
  recipientAllowlist?: RecipientAllowlist;
}

export type WhatsAppTemplateKey =
  | 'OTP'
  | 'ORDER'
  | 'DIGITAL_ORDER'
  | 'REPORT_ORDER_CONFIRMED'
  | 'REPORT_READY'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_UPDATED'
  | 'CONSULTATION_REMINDER'
  | 'CONSULTATION_RESCHEDULE'
  /** Admin announcement (Notifications screen): must be approved on WhatChimp first. */
  | 'ANNOUNCEMENT';

/** Environment variable that holds the WhatChimp template id of each template (website names). */
export const WHATSAPP_TEMPLATE_ENV: Record<WhatsAppTemplateKey, string> = {
  OTP: 'WHATCHIMP_TEMPLATE_ID',
  ORDER: 'WHATCHIMP_ORDER_TEMPLATE_ID',
  DIGITAL_ORDER: 'WHATCHIMP_DIGITAL_ORDER_TEMPLATE_ID',
  REPORT_ORDER_CONFIRMED: 'WHATCHIMP_REPORT_ORDER_CONFIRMED_TEMPLATE_ID',
  REPORT_READY: 'WHATCHIMP_REPORT_TEMPLATE_ID',
  BOOKING_CONFIRMED: 'WHATCHIMP_BOOKING_CONFIRMED_TEMPLATE_ID',
  BOOKING_UPDATED: 'WHATCHIMP_BOOKING_UPDATED_TEMPLATE_ID',
  CONSULTATION_REMINDER: 'WHATCHIMP_CONSULTATION_REMINDER_TEMPLATE_ID',
  CONSULTATION_RESCHEDULE: 'WHATCHIMP_CONSULTATION_RESCHEDULE_TEMPLATE_ID',
  ANNOUNCEMENT: 'WHATCHIMP_ANNOUNCEMENT_TEMPLATE_ID',
};

const str = (env: NodeJS.ProcessEnv, name: string): string | null => {
  const v = env[name];
  return v && v.trim() ? v.trim() : null;
};

const num = (env: NodeJS.ProcessEnv, name: string, fallback: number, min = 0): number => {
  const raw = str(env, name);
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= min ? n : fallback;
};

const stripSlash = (url: string): string => url.replace(/\/+$/, '');

/** "Astro Sushil <noreply@astrosushil.com>" -> "noreply@astrosushil.com" */
const addressOf = (from: string | null): string | null => {
  if (!from) return null;
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim() || null;
};

export function messagingEnv(env: NodeJS.ProcessEnv = process.env): MessagingEnv {
  const nodeEnv = env.NODE_ENV || 'development';
  const templateIds = Object.fromEntries(
    (Object.keys(WHATSAPP_TEMPLATE_ENV) as WhatsAppTemplateKey[]).map((k) => [k, str(env, WHATSAPP_TEMPLATE_ENV[k])])
  ) as Record<WhatsAppTemplateKey, string | null>;

  // SMTP_* are the website's names; EMAIL_* are this backend's older names (still honoured).
  const port = num(env, 'SMTP_PORT', num(env, 'EMAIL_PORT', 587, 1), 1);
  const secureRaw = str(env, 'SMTP_SECURE');

  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    frontendUrl: stripSlash(str(env, 'FRONTEND_URL') || 'https://astrosushil.com'),
    adminUrl: stripSlash(str(env, 'ADMIN_URL') || ''),
    adminEmail: str(env, 'ADMIN_EMAIL'),
    adminPhone: str(env, 'ADMIN_PHONE') || str(env, 'SUPPORT_PHONE'),
    sms: {
      provider: (str(env, 'SMS_PROVIDER') || 'auto').toLowerCase(),
      url: str(env, 'SMSLANE_API_URL') || 'https://api.smslane.com/api/v2/SendSMS',
      apiKey: str(env, 'SMSLANE_API_KEY'),
      clientId: str(env, 'SMSLANE_CLIENT_ID'),
      senderId: str(env, 'SMSLANE_SENDER_ID'),
    },
    whatsapp: {
      provider: (str(env, 'WHATSAPP_PROVIDER') || 'auto').toLowerCase(),
      url: str(env, 'WHATCHIMP_API_URL') || 'https://app.whatchimp.com/api/v1/whatsapp/send/template',
      apiToken: str(env, 'WHATCHIMP_API_TOKEN'),
      phoneNumberId: str(env, 'WHATCHIMP_PHONE_NUMBER_ID'),
      templateIds,
    },
    email: {
      provider: (str(env, 'EMAIL_PROVIDER') || 'auto').toLowerCase(),
      host: str(env, 'SMTP_HOST') || str(env, 'EMAIL_HOST'),
      port,
      secure: secureRaw !== null ? secureRaw === 'true' : port === 465,
      user: str(env, 'SMTP_USER') || str(env, 'EMAIL_USER'),
      pass: str(env, 'SMTP_PASS') || str(env, 'EMAIL_PASSWORD'),
      fromAddress: addressOf(str(env, 'SMTP_FROM') || str(env, 'EMAIL_FROM')) || str(env, 'SMTP_USER') || str(env, 'EMAIL_USER'),
      fromName: 'Astro Sushil',
    },
    httpTimeoutMs: num(env, 'MESSAGING_HTTP_TIMEOUT_MS', 10000, 1000),
    otp: {
      // The website's names and defaults (3 sends per 10 minutes per identifier).
      identifierWindowMinutes: num(env, 'OTP_RATE_LIMIT_WINDOW_MINUTES', 10, 1),
      identifierMaxPerWindow: num(env, 'OTP_RATE_LIMIT_MAX', 3, 1),
      identifierMaxPerDay: num(env, 'OTP_RATE_LIMIT_MAX_PER_DAY', 10, 1),
      ipWindowMinutes: num(env, 'OTP_IP_RATE_LIMIT_WINDOW_MINUTES', 10, 1),
      ipMaxPerWindow: num(env, 'OTP_IP_RATE_LIMIT_MAX', 10, 1),
      ipMaxPerDay: num(env, 'OTP_IP_RATE_LIMIT_MAX_PER_DAY', 50, 1),
    },
    outbox: {
      maxAttempts: num(env, 'MESSAGING_MAX_ATTEMPTS', 4, 1),
      retryBaseSeconds: num(env, 'MESSAGING_RETRY_BASE_SECONDS', 30, 1),
      staleLockMinutes: num(env, 'MESSAGING_STALE_LOCK_MINUTES', 10, 1),
      dispatchIntervalMs: num(env, 'MESSAGING_DISPATCH_INTERVAL_MS', 15000, 1000),
      batchSize: num(env, 'MESSAGING_DISPATCH_BATCH', 50, 1),
    },
    reportSendDelayHours: num(env, 'REPORT_SEND_DELAY_HOURS', 24, 0),
    consultationReminderIstHour: num(env, 'CONSULTATION_REMINDER_IST_HOUR', 8, 0),
    recipientAllowlist: recipientAllowlistFromEnv(env),
  };
}

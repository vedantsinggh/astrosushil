import { messagingEnv, MessagingEnv } from './config';
import { logger } from '../../utils/logger';
import {
  FakeEmailProvider,
  FakeSmsProvider,
  FakeWhatsAppProvider,
  LogOnlyEmailProvider,
  LogOnlySmsProvider,
  LogOnlyWhatsAppProvider,
  UnconfiguredEmailProvider,
  UnconfiguredSmsProvider,
  UnconfiguredWhatsAppProvider,
} from './providers/fake.providers';
import { SmsLaneProvider } from './providers/smslane.provider';
import { SmtpEmailProvider } from './providers/smtp.provider';
import { WhatChimpProvider } from './providers/whatchimp.provider';
import type { EmailProvider, MessagingProviders, SmsProvider, WhatsAppProvider } from './types';

/**
 * Provider selection, per channel, by environment:
 *
 *   SMS_PROVIDER      = smslane   | fake | none   (default: auto)
 *   WHATSAPP_PROVIDER = whatchimp | fake | none   (default: auto)
 *   EMAIL_PROVIDER    = smtp      | fake | none   (default: auto)
 *
 * auto  -> the real provider when its credentials are set; otherwise the safe default.
 * fake  -> in-memory fake (refused in production).
 * none  -> the safe default.
 *
 * Safe default: in production every send FAILS loudly (Unconfigured*); elsewhere the
 * send is only logged and reported as simulated (LogOnly*).
 */
export function buildMessagingProviders(env: MessagingEnv = messagingEnv()): MessagingProviders {
  return { sms: buildSms(env), whatsapp: buildWhatsApp(env), email: buildEmail(env) };
}

function refuseFakeInProduction(channel: string): void {
  logger.error({ channel }, '[Messaging] A fake provider was requested in production; the channel is treated as not configured');
}

function buildSms(env: MessagingEnv): SmsProvider {
  const fallback = (): SmsProvider => (env.isProduction ? new UnconfiguredSmsProvider() : new LogOnlySmsProvider());
  const configured = Boolean(env.sms.apiKey && env.sms.clientId && env.sms.senderId);
  switch (env.sms.provider) {
    case 'fake':
      if (env.isProduction) {
        refuseFakeInProduction('SMS');
        return new UnconfiguredSmsProvider();
      }
      return new FakeSmsProvider();
    case 'none':
      return fallback();
    case 'smslane':
    case 'auto':
      return configured ? new SmsLaneProvider() : fallback();
    default:
      logger.error({ channel: 'SMS', provider: env.sms.provider }, '[Messaging] Unknown SMS_PROVIDER');
      return fallback();
  }
}

function buildWhatsApp(env: MessagingEnv): WhatsAppProvider {
  const fallback = (): WhatsAppProvider =>
    env.isProduction ? new UnconfiguredWhatsAppProvider() : new LogOnlyWhatsAppProvider();
  const configured = Boolean(env.whatsapp.apiToken && env.whatsapp.phoneNumberId);
  switch (env.whatsapp.provider) {
    case 'fake':
      if (env.isProduction) {
        refuseFakeInProduction('WHATSAPP');
        return new UnconfiguredWhatsAppProvider();
      }
      return new FakeWhatsAppProvider();
    case 'none':
      return fallback();
    case 'whatchimp':
    case 'auto':
      return configured ? new WhatChimpProvider() : fallback();
    default:
      logger.error({ channel: 'WHATSAPP', provider: env.whatsapp.provider }, '[Messaging] Unknown WHATSAPP_PROVIDER');
      return fallback();
  }
}

function buildEmail(env: MessagingEnv): EmailProvider {
  const fallback = (): EmailProvider => (env.isProduction ? new UnconfiguredEmailProvider() : new LogOnlyEmailProvider());
  const configured = Boolean(env.email.host && env.email.user && env.email.pass && env.email.fromAddress);
  switch (env.email.provider) {
    case 'fake':
      if (env.isProduction) {
        refuseFakeInProduction('EMAIL');
        return new UnconfiguredEmailProvider();
      }
      return new FakeEmailProvider();
    case 'none':
      return fallback();
    case 'smtp':
    case 'auto':
      return configured ? new SmtpEmailProvider() : fallback();
    default:
      logger.error({ channel: 'EMAIL', provider: env.email.provider }, '[Messaging] Unknown EMAIL_PROVIDER');
      return fallback();
  }
}

let current: MessagingProviders | null = null;

/** Process-wide providers, built once from the environment on first use. */
export function getMessagingProviders(): MessagingProviders {
  if (!current) current = buildMessagingProviders();
  return current;
}

/** Tests only: install fakes (or pass null to rebuild from the environment on next use). */
export function setMessagingProviders(providers: MessagingProviders | null): void {
  current = providers;
}

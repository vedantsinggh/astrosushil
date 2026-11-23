import type { WhatsAppTemplateKey } from './config';

export type MessageChannel = 'SMS' | 'WHATSAPP' | 'EMAIL';

/**
 * Result of one provider call. `retryable` tells the outbox whether another attempt
 * can help (network error, timeout, 5xx) or not (not configured, rejected content).
 * `detail` is a short, already-sanitised description: it never contains credentials,
 * request URLs or the message text.
 */
export type SendResult =
  | { ok: true; providerMessageId?: string; simulated?: boolean }
  | { ok: false; code: string; retryable: boolean; detail?: string };

export interface SmsMessage {
  /** E.164 */
  to: string;
  /** Exact DLT-registered text with the variables filled in. */
  text: string;
}

export interface WhatsAppMessage {
  /** E.164 */
  to: string;
  template: WhatsAppTemplateKey;
  /** WhatChimp query variables, e.g. { "templateVariable-otp-2": "123456" }. */
  variables: Record<string, string>;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SmsProvider {
  readonly name: string;
  send(message: SmsMessage): Promise<SendResult>;
}

export interface WhatsAppProvider {
  readonly name: string;
  send(message: WhatsAppMessage): Promise<SendResult>;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<SendResult>;
}

export interface MessagingProviders {
  sms: SmsProvider;
  whatsapp: WhatsAppProvider;
  email: EmailProvider;
}

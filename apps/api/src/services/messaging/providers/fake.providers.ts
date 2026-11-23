import { logger } from '../../../utils/logger';
import { maskEmail, maskPhone } from '../phone';
import type {
  EmailMessage,
  EmailProvider,
  SendResult,
  SmsMessage,
  SmsProvider,
  WhatsAppMessage,
  WhatsAppProvider,
} from '../types';

/**
 * Test double: records every message and returns the next scripted result
 * (success by default). Used by the unit tests and selectable with
 * <CHANNEL>_PROVIDER=fake outside production.
 */
class FakeBase<M> {
  public readonly sent: M[] = [];
  private scripted: SendResult[] = [];

  /** Queue results for the next sends, in order; afterwards sends succeed again. */
  public failNext(...results: SendResult[]): void {
    this.scripted.push(...results);
  }

  public reset(): void {
    this.sent.length = 0;
    this.scripted = [];
  }

  protected async record(message: M): Promise<SendResult> {
    const scripted = this.scripted.shift();
    if (scripted && !scripted.ok) return scripted;
    this.sent.push(message);
    return scripted ?? { ok: true, providerMessageId: `fake-${this.sent.length}`, simulated: true };
  }
}

export class FakeSmsProvider extends FakeBase<SmsMessage> implements SmsProvider {
  public readonly name = 'fake';
  public send(message: SmsMessage): Promise<SendResult> {
    return this.record(message);
  }
}

export class FakeWhatsAppProvider extends FakeBase<WhatsAppMessage> implements WhatsAppProvider {
  public readonly name = 'fake';
  public send(message: WhatsAppMessage): Promise<SendResult> {
    return this.record(message);
  }
}

export class FakeEmailProvider extends FakeBase<EmailMessage> implements EmailProvider {
  public readonly name = 'fake';
  public send(message: EmailMessage): Promise<SendResult> {
    return this.record(message);
  }
}

/**
 * Development default when a channel has no credentials: nothing leaves the
 * machine, the send is logged (masked recipient only, never the text or an OTP)
 * and reported as simulated. NEVER used in production.
 */
export class LogOnlySmsProvider implements SmsProvider {
  public readonly name = 'log-only';
  public async send(message: SmsMessage): Promise<SendResult> {
    logger.info({ channel: 'SMS', to: maskPhone(message.to) }, '[Messaging] [DEV] SMS not sent: no provider configured');
    return { ok: true, simulated: true };
  }
}

export class LogOnlyWhatsAppProvider implements WhatsAppProvider {
  public readonly name = 'log-only';
  public async send(message: WhatsAppMessage): Promise<SendResult> {
    logger.info(
      { channel: 'WHATSAPP', to: maskPhone(message.to), template: message.template },
      '[Messaging] [DEV] WhatsApp message not sent: no provider configured'
    );
    return { ok: true, simulated: true };
  }
}

export class LogOnlyEmailProvider implements EmailProvider {
  public readonly name = 'log-only';
  public async send(message: EmailMessage): Promise<SendResult> {
    logger.info({ channel: 'EMAIL', to: maskEmail(message.to) }, '[Messaging] [DEV] E-mail not sent: no provider configured');
    return { ok: true, simulated: true };
  }
}

const NOT_CONFIGURED: SendResult = {
  ok: false,
  code: 'PROVIDER_NOT_CONFIGURED',
  retryable: false,
  detail: 'no provider is configured for this channel',
};

/**
 * Production default when a channel has no usable provider: every send FAILS and is
 * logged as an error. A message is never reported as sent when nothing was sent.
 */
export class UnconfiguredSmsProvider implements SmsProvider {
  public readonly name = 'unconfigured';
  public async send(message: SmsMessage): Promise<SendResult> {
    logger.error({ channel: 'SMS', to: maskPhone(message.to) }, '[Messaging] SMS provider is not configured; message NOT sent');
    return NOT_CONFIGURED;
  }
}

export class UnconfiguredWhatsAppProvider implements WhatsAppProvider {
  public readonly name = 'unconfigured';
  public async send(message: WhatsAppMessage): Promise<SendResult> {
    logger.error(
      { channel: 'WHATSAPP', to: maskPhone(message.to), template: message.template },
      '[Messaging] WhatsApp provider is not configured; message NOT sent'
    );
    return NOT_CONFIGURED;
  }
}

export class UnconfiguredEmailProvider implements EmailProvider {
  public readonly name = 'unconfigured';
  public async send(message: EmailMessage): Promise<SendResult> {
    logger.error({ channel: 'EMAIL', to: maskEmail(message.to) }, '[Messaging] E-mail provider is not configured; message NOT sent');
    return NOT_CONFIGURED;
  }
}

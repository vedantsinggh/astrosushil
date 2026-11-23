import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { messagingEnv } from '../config';
import type { EmailMessage, EmailProvider, SendResult } from '../types';

/** What the provider needs from a mail transport; nodemailer's Transporter satisfies it. */
export interface MailTransport {
  sendMail(options: {
    from: { name: string; address: string };
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<{ messageId?: string }>;
}

export type MailTransportFactory = () => MailTransport;

const defaultFactory: MailTransportFactory = () => {
  const { host, port, secure, user, pass } = messagingEnv().email;
  const transporter: Transporter = nodemailer.createTransport({
    host: host ?? undefined,
    port,
    secure,
    auth: { user: user ?? '', pass: pass ?? '' },
    // Same pooling as the website; explicit timeouts so a dead SMTP host cannot hang a request.
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  });
  return transporter as unknown as MailTransport;
};

/** SMTP e-mail, sender name "Astro Sushil" as on the website. */
export class SmtpEmailProvider implements EmailProvider {
  public readonly name = 'smtp';
  private transport: MailTransport | null = null;

  constructor(private readonly factory: MailTransportFactory = defaultFactory) {}

  public async send(message: EmailMessage): Promise<SendResult> {
    const { host, user, pass, fromAddress, fromName } = messagingEnv().email;
    if (!host || !user || !pass || !fromAddress) {
      return { ok: false, code: 'PROVIDER_NOT_CONFIGURED', retryable: false, detail: 'SMTP settings are not set' };
    }

    try {
      if (!this.transport) this.transport = this.factory();
      const info = await this.transport.sendMail({
        from: { name: fromName, address: fromAddress },
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      return { ok: true, providerMessageId: info.messageId };
    } catch (err) {
      // Drop the transport so the next send opens a fresh connection (website behaviour).
      this.transport = null;
      const code = (err as { code?: unknown } | null)?.code;
      const responseCode = (err as { responseCode?: unknown } | null)?.responseCode;
      // 5xx SMTP replies (bad recipient, rejected content) will not succeed on retry.
      const permanent = typeof responseCode === 'number' && responseCode >= 500 && responseCode < 600;
      return {
        ok: false,
        code: 'EMAIL_SEND_FAILED',
        retryable: !permanent,
        detail: [typeof code === 'string' ? code : null, typeof responseCode === 'number' ? `SMTP ${responseCode}` : null]
          .filter(Boolean)
          .join(' ') || undefined,
      };
    }
  }
}

/**
 * Messaging providers, templates and phone normalisation.
 * No network: the HTTP client and the SMTP transport are substituted.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { messagingEnv } from '../../src/services/messaging/config';
import { HttpClient, HttpRequestError, HttpResponse } from '../../src/services/messaging/http';
import { toE164, toSmsLaneNumber, maskEmail } from '../../src/services/messaging/phone';
import { buildMessagingProviders } from '../../src/services/messaging/provider-registry';
import { SmsLaneProvider } from '../../src/services/messaging/providers/smslane.provider';
import { SmtpEmailProvider, MailTransport } from '../../src/services/messaging/providers/smtp.provider';
import { WhatChimpProvider } from '../../src/services/messaging/providers/whatchimp.provider';
import { emailTemplates } from '../../src/services/messaging/templates/email.templates';
import { smsTemplates, SMS_TEMPLATE_TEXT } from '../../src/services/messaging/templates/sms.templates';
import { whatsappTemplates } from '../../src/services/messaging/templates/whatsapp.templates';

const ENV_KEYS = [
  'NODE_ENV', 'SMS_PROVIDER', 'WHATSAPP_PROVIDER', 'EMAIL_PROVIDER',
  'SMSLANE_API_KEY', 'SMSLANE_CLIENT_ID', 'SMSLANE_SENDER_ID',
  'WHATCHIMP_API_TOKEN', 'WHATCHIMP_PHONE_NUMBER_ID', 'WHATCHIMP_TEMPLATE_ID', 'WHATCHIMP_ORDER_TEMPLATE_ID',
  'WHATCHIMP_DIGITAL_ORDER_TEMPLATE_ID', 'WHATCHIMP_BOOKING_CONFIRMED_TEMPLATE_ID',
  'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_SECURE', 'SMTP_FROM',
  'EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASSWORD', 'EMAIL_FROM', 'FRONTEND_URL', 'ADMIN_URL',
];
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) if (k !== 'NODE_ENV') delete process.env[k];
  process.env.FRONTEND_URL = 'https://site.example';
  process.env.ADMIN_URL = 'https://admin.example';
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

class RecordingHttp implements HttpClient {
  public calls: Array<{ url: string; params: Record<string, string>; timeoutMs: number }> = [];
  constructor(private readonly respond: () => HttpResponse | Promise<HttpResponse>) {}
  async get(url: string, params: Record<string, string>, timeoutMs: number): Promise<HttpResponse> {
    this.calls.push({ url, params, timeoutMs });
    return this.respond();
  }
}

describe('phone normalisation (one rule for every send)', () => {
  it('normalises the mixed formats the website stored to E.164, India by default', () => {
    for (const raw of ['9876543210', '919876543210', '+919876543210', '+91 98765-43210', '09876543210', '00919876543210']) {
      expect(toE164(raw)).toBe('+919876543210');
    }
    expect(toE164('+1 (555) 234-5678')).toBe('+15552345678');
  });

  it('returns null instead of throwing for unusable input', () => {
    for (const raw of [null, undefined, '', '   ', 'abc', '12345', '+12']) expect(toE164(raw as string | null)).toBeNull();
  });

  it('sends SMS to Indian mobile numbers only', () => {
    expect(toSmsLaneNumber('+919876543210')).toBe('919876543210');
    // The website would have sent this to the unrelated Indian number 91 5552345678.
    expect(toSmsLaneNumber('+15552345678')).toBeNull();
    expect(toSmsLaneNumber('+911234567890')).toBeNull();
  });

  it('masks e-mail addresses for logs', () => {
    expect(maskEmail('customer@example.com')).toBe('c***@example.com');
  });
});

describe('SMS templates (DLT texts copied from the website)', () => {
  it('keeps the registered fixed text byte for byte', () => {
    expect(SMS_TEMPLATE_TEXT.OTP_SIGNUP).toBe('Hello {#var#}, Your Signup OTP is {#var#}. ASTRO SUSHIL PRIVATE LIMITED');
    expect(SMS_TEMPLATE_TEXT.OTP_LOGIN).toBe('Hello {#var#}, Your login OTP is {#var#}. ASTRO SUSHIL PRIVATE LIMITED');
    expect(SMS_TEMPLATE_TEXT.OTP_RESET).toBe('Hello {#var#}, Your password reset OTP is {#var#}. ASTRO SUSHIL PRIVATE LIMITED');
    expect(SMS_TEMPLATE_TEXT.BOOKING_CONFIRMED).toBe(
      'Hello {#var#}, Your consultation has been booked. We look forward to connecting with you. Service Name: {#var#} Date: {#var#} Service Mode: {#var#} Time: {#var#} Amount: {#var#} Thank you for choosing ASTRO SUSHIL PRIVATE LIMITED'
    );
    // Double spaces and "₹ " are part of the registered template.
    expect(SMS_TEMPLATE_TEXT.BOOKING_RESCHEDULED).toBe(
      'Hello  {#var#}, Your Consultation has been rescheduled. We look forward to connecting with you. Service Name:  {#var#} Date:  {#var#} Service Mode:  {#var#} Time:  {#var#} Amount: ₹ {#var#} Thank you for choosing ASTRO SUSHIL PRIVATE LIMITED'
    );
    expect(SMS_TEMPLATE_TEXT.ORDER_UPDATE).toBe(
      'Hello {#var#}, Your order update is here Order ID-{#var#} Product Name-{#var#}Order Status-{#var#} Thank for ordering. ASTRO SUSHIL PRIVATE LIMITED'
    );
    expect(SMS_TEMPLATE_TEXT.REPORT_PURCHASE).toBe(
      'Hello {#var#}Thank you for purchasing your Kundali Report with us 🙏 We have successfully received your request. Your detailed Kundali report is currently being prepared and will be delivered to you within the next 48 hours. If you have any questions in the meantime, feel free to reach out to us. We appreciate your trust!  ✨. ASTRO SUSHIL PRIVATE LIMITED'
    );
  });

  it('matches the website source file when the clone is present', async () => {
    const fs = await import('fs');
    const base = '/home/pilot/Projects/astrosushil-website/backend/src';
    if (!fs.existsSync(`${base}/utils/smsTemplates.js`)) return;
    const source = fs.readFileSync(`${base}/utils/smsTemplates.js`, 'utf8') + fs.readFileSync(`${base}/service/otp.js`, 'utf8');
    for (const text of Object.values(SMS_TEMPLATE_TEXT)) expect(source).toContain('`' + text + '`');
  });

  it('fills variables in order and keeps "$" in customer data literal', () => {
    expect(smsTemplates.OTP({ purpose: 'login', name: 'Asha', otp: '482913' })).toBe(
      'Hello Asha, Your login OTP is 482913. ASTRO SUSHIL PRIVATE LIMITED'
    );
    expect(smsTemplates.OTP({ purpose: 'signup', name: 'Customer', otp: '111222' })).toContain('Your Signup OTP is 111222');
    expect(smsTemplates.OTP({ purpose: 'reset', name: 'A', otp: '1' })).toContain('password reset OTP');
    expect(
      smsTemplates.BOOKING_CONFIRMED({ userName: 'Ravi', consultationTitle: 'Career', date: '25-11-2026', mode: 'video', slot: '10:00-10:30', amount: '1500' })
    ).toBe(
      'Hello Ravi, Your consultation has been booked. We look forward to connecting with you. Service Name: Career Date: 25-11-2026 Service Mode: video Time: 10:00-10:30 Amount: 1500 Thank you for choosing ASTRO SUSHIL PRIVATE LIMITED'
    );
    expect(smsTemplates.ORDER_UPDATE({ userName: "$& $1 $'", orderId: 'o1', productName: 'Mala', orderStatus: 'shipped' })).toBe(
      "Hello $& $1 $', Your order update is here Order ID-o1 Product Name-MalaOrder Status-shipped Thank for ordering. ASTRO SUSHIL PRIVATE LIMITED"
    );
  });
});

describe('SMSLane provider', () => {
  beforeEach(() => {
    process.env.SMSLANE_API_KEY = 'sms-key-SECRET';
    process.env.SMSLANE_CLIENT_ID = 'client-1';
    process.env.SMSLANE_SENDER_ID = 'ASTSUS';
  });

  it('calls SendSMS with the website parameters and a 91-prefixed number', async () => {
    const http = new RecordingHttp(() => ({ status: 200, body: { ErrorCode: 0, Data: [{ MessageErrorCode: 0, MessageId: 'm-1' }] } }));
    const result = await new SmsLaneProvider(http).send({ to: '+919876543210', text: 'Hello' });
    expect(result).toEqual({ ok: true, providerMessageId: 'm-1' });
    expect(http.calls[0].url).toBe('https://api.smslane.com/api/v2/SendSMS');
    expect(http.calls[0].params).toEqual({
      SenderId: 'ASTSUS', Message: 'Hello', MobileNumbers: '919876543210', ApiKey: 'sms-key-SECRET', ClientId: 'client-1',
    });
    expect(http.calls[0].timeoutMs).toBe(10000);
  });

  it('flags Unicode content (rupee sign, emoji) with dc=8 as the website does', async () => {
    const http = new RecordingHttp(() => ({ status: 200, body: {} }));
    await new SmsLaneProvider(http).send({ to: '+919876543210', text: 'Amount: ₹ 500' });
    expect(http.calls[0].params.dc).toBe('8');
  });

  it('treats an HTTP 200 with an error code in the body as a rejection', async () => {
    const top = await new SmsLaneProvider(new RecordingHttp(() => ({ status: 200, body: { ErrorCode: 12, ErrorDescription: 'bad' } }))).send({ to: '+919876543210', text: 'x' });
    expect(top).toMatchObject({ ok: false, code: 'PROVIDER_REJECTED', retryable: false });
    const perMessage = await new SmsLaneProvider(new RecordingHttp(() => ({ status: 200, body: { ErrorCode: 0, Data: [{ MessageErrorCode: 28 }] } }))).send({ to: '+919876543210', text: 'x' });
    expect(perMessage).toMatchObject({ ok: false, code: 'PROVIDER_REJECTED' });
  });

  it('reports timeouts and 5xx as retryable, and never leaks the key', async () => {
    const timeout = await new SmsLaneProvider({ get: async () => { throw new HttpRequestError('TIMEOUT'); } }).send({ to: '+919876543210', text: 'x' });
    expect(timeout).toEqual({ ok: false, code: 'TIMEOUT', retryable: true });
    const down = await new SmsLaneProvider(new RecordingHttp(() => ({ status: 503, body: 'down' }))).send({ to: '+919876543210', text: 'x' });
    expect(down).toMatchObject({ ok: false, retryable: true });
    expect(JSON.stringify([timeout, down])).not.toContain('sms-key-SECRET');
    expect(new HttpRequestError('NETWORK_ERROR').message).toBe('NETWORK_ERROR');
  });

  it('does not send to a foreign number, and fails visibly without credentials', async () => {
    const http = new RecordingHttp(() => ({ status: 200, body: {} }));
    expect(await new SmsLaneProvider(http).send({ to: '+15552345678', text: 'x' })).toMatchObject({ ok: false, code: 'SMS_INDIA_ONLY', retryable: false });
    delete process.env.SMSLANE_API_KEY;
    expect(await new SmsLaneProvider(http).send({ to: '+919876543210', text: 'x' })).toMatchObject({ ok: false, code: 'PROVIDER_NOT_CONFIGURED' });
    expect(http.calls).toHaveLength(0);
  });
});

describe('WhatChimp provider and templates', () => {
  beforeEach(() => {
    process.env.WHATCHIMP_API_TOKEN = 'wa-token-SECRET';
    process.env.WHATCHIMP_PHONE_NUMBER_ID = 'pn-1';
    process.env.WHATCHIMP_TEMPLATE_ID = 'tpl-otp';
    process.env.WHATCHIMP_BOOKING_CONFIRMED_TEMPLATE_ID = 'tpl-booking';
  });

  it('sends the OTP template with the website variable name', async () => {
    const http = new RecordingHttp(() => ({ status: 200, body: { status: '1' } }));
    const result = await new WhatChimpProvider(http).send({ to: '+919876543210', ...whatsappTemplates.OTP({ otp: '482913' }) });
    expect(result.ok).toBe(true);
    expect(http.calls[0].url).toBe('https://app.whatchimp.com/api/v1/whatsapp/send/template');
    expect(http.calls[0].params).toEqual({
      apiToken: 'wa-token-SECRET', phone_number_id: 'pn-1', template_id: 'tpl-otp', phone_number: '+919876543210', 'templateVariable-otp-2': '482913',
    });
  });

  it('builds the booking variables in the website positions', () => {
    const p = whatsappTemplates.BOOKING_CONFIRMED({
      userName: 'Ravi', consultationTitle: 'Career', date: '25-11-2026', mode: 'in_person', slot: '14:00-14:30', amount: '1500', includes: ['Kundli', 'Remedies'],
    });
    expect(p.template).toBe('BOOKING_CONFIRMED');
    expect(p.variables).toEqual({
      'templateVariable-Username-1': 'Ravi',
      'templateVariable-Consultation-2': 'Career',
      'templateVariable-Date-3': '25-11-2026',
      'templateVariable-ServiceMode-4': 'In Person',
      'templateVariable-slot-5': '14:00',
      'templateVariable-ordervalue-6': '1500',
      'templateVariable-Include-7': 'Kundli, Remedies',
      'templateVariable-CallInstructions-8': 'For meeting coordination, please call this number +91 9125000013',
      'templateVariable-Invoicelink-9': 'https://site.example/dashboard?tab=consultations',
    });
    // The reschedule template has no invoice link.
    expect(Object.keys(whatsappTemplates.CONSULTATION_RESCHEDULE({ mode: 'video' }).variables)).toHaveLength(8);
    expect(whatsappTemplates.CONSULTATION_RESCHEDULE({ mode: 'video' }).variables['templateVariable-CallInstructions-8']).toContain('WhatsApp or Botim video call');
  });

  it('uses the digital order template only when there is a download link', () => {
    const physical = whatsappTemplates.ORDER({ name: 'A', orderId: 'o1', productName: 'Mala', status: 'confirmed' });
    expect(physical.template).toBe('ORDER');
    expect(physical.variables['templateVariable-Downloadlink-6']).toBeUndefined();
    const digital = whatsappTemplates.ORDER({ name: 'A', orderId: 'o1', productName: 'PDF', status: 'delivered', downloadLink: 'https://site.example/dashboard?tab=downloads' });
    expect(digital.template).toBe('DIGITAL_ORDER');
    expect(digital.variables['templateVariable-Downloadlink-6']).toBe('https://site.example/dashboard?tab=downloads');
    expect(whatsappTemplates.CONSULTATION_REMINDER({ userName: 'A', consultationTitle: 'C', date: '25-11-2026', slot: '10:00-10:30', mode: 'audio' }).variables['templateVariable-Date-3']).toBe('25-11-2026 at 10:00-10:30');
  });

  it('fails visibly when the template id or the credentials are missing', async () => {
    const http = new RecordingHttp(() => ({ status: 200, body: {} }));
    const noTemplate = await new WhatChimpProvider(http).send({ to: '+919876543210', template: 'REPORT_READY', variables: {} });
    expect(noTemplate).toMatchObject({ ok: false, code: 'TEMPLATE_NOT_CONFIGURED', retryable: false });
    expect(JSON.stringify(noTemplate)).toContain('WHATCHIMP_REPORT_TEMPLATE_ID');
    delete process.env.WHATCHIMP_API_TOKEN;
    expect(await new WhatChimpProvider(http).send({ to: '+919876543210', template: 'OTP', variables: {} })).toMatchObject({ code: 'PROVIDER_NOT_CONFIGURED' });
    expect(http.calls).toHaveLength(0);
  });

  it('treats an explicit failure body as a rejection and a network error as retryable', async () => {
    const rejected = await new WhatChimpProvider(new RecordingHttp(() => ({ status: 200, body: { status: '0', message: 'bad template' } }))).send({ to: '+919876543210', template: 'OTP', variables: {} });
    expect(rejected).toMatchObject({ ok: false, code: 'PROVIDER_REJECTED', retryable: false });
    const network = await new WhatChimpProvider({ get: async () => { throw new HttpRequestError('NETWORK_ERROR'); } }).send({ to: '+919876543210', template: 'OTP', variables: {} });
    expect(network).toEqual({ ok: false, code: 'NETWORK_ERROR', retryable: true });
    expect(JSON.stringify([rejected, network])).not.toContain('wa-token-SECRET');
  });
});

describe('SMTP e-mail provider', () => {
  const configure = () => {
    process.env.SMTP_HOST = 'smtp.example';
    process.env.SMTP_USER = 'mailer@example.com';
    process.env.SMTP_PASS = 'smtp-pass-SECRET';
    process.env.SMTP_FROM = 'noreply@example.com';
  };

  it('sends with the website sender name and returns the message id', async () => {
    configure();
    const sent: unknown[] = [];
    const transport: MailTransport = { sendMail: async (o) => { sent.push(o); return { messageId: 'id-1' }; } };
    const result = await new SmtpEmailProvider(() => transport).send({ to: 'c@example.com', subject: 'S', html: '<p>h</p>' });
    expect(result).toEqual({ ok: true, providerMessageId: 'id-1' });
    expect(sent[0]).toMatchObject({ from: { name: 'Astro Sushil', address: 'noreply@example.com' }, to: 'c@example.com', subject: 'S' });
  });

  it('accepts the older EMAIL_* names', () => {
    process.env.EMAIL_HOST = 'smtp.old';
    process.env.EMAIL_USER = 'u';
    process.env.EMAIL_PASSWORD = 'p';
    process.env.EMAIL_FROM = 'Astro Sushil <noreply@astrosushil.com>';
    const env = messagingEnv();
    expect(env.email).toMatchObject({ host: 'smtp.old', user: 'u', pass: 'p', fromAddress: 'noreply@astrosushil.com', port: 587, secure: false });
  });

  it('reports failure (retryable for connection errors, permanent for 5xx replies) without the password', async () => {
    configure();
    let builds = 0;
    const failing = (err: object): (() => MailTransport) => () => { builds += 1; return { sendMail: async () => { throw Object.assign(new Error('boom smtp-pass-SECRET'), err); } }; };
    const conn = await new SmtpEmailProvider(failing({ code: 'ECONNECTION' })).send({ to: 'c@example.com', subject: 'S', html: 'h' });
    expect(conn).toMatchObject({ ok: false, code: 'EMAIL_SEND_FAILED', retryable: true });
    const rejected = await new SmtpEmailProvider(failing({ responseCode: 550 })).send({ to: 'c@example.com', subject: 'S', html: 'h' });
    expect(rejected).toMatchObject({ ok: false, retryable: false });
    expect(JSON.stringify([conn, rejected])).not.toContain('SECRET');
    expect(builds).toBe(2);
  });

  it('fails visibly when SMTP is not configured', async () => {
    const result = await new SmtpEmailProvider(() => { throw new Error('must not be built'); }).send({ to: 'c@example.com', subject: 'S', html: 'h' });
    expect(result).toMatchObject({ ok: false, code: 'PROVIDER_NOT_CONFIGURED', retryable: false });
  });
});

describe('provider selection by environment', () => {
  it('production without configuration: every send FAILS, never a silent "sent"', async () => {
    process.env.NODE_ENV = 'production';
    const p = buildMessagingProviders(messagingEnv());
    expect([p.sms.name, p.whatsapp.name, p.email.name]).toEqual(['unconfigured', 'unconfigured', 'unconfigured']);
    expect(await p.sms.send({ to: '+919876543210', text: 'x' })).toMatchObject({ ok: false, code: 'PROVIDER_NOT_CONFIGURED' });
    expect(await p.whatsapp.send({ to: '+919876543210', template: 'OTP', variables: {} })).toMatchObject({ ok: false });
    expect(await p.email.send({ to: 'c@example.com', subject: 's', html: 'h' })).toMatchObject({ ok: false });
  });

  it('production refuses the fake provider', () => {
    process.env.NODE_ENV = 'production';
    process.env.SMS_PROVIDER = 'fake';
    process.env.WHATSAPP_PROVIDER = 'fake';
    process.env.EMAIL_PROVIDER = 'fake';
    const p = buildMessagingProviders(messagingEnv());
    expect([p.sms.name, p.whatsapp.name, p.email.name]).toEqual(['unconfigured', 'unconfigured', 'unconfigured']);
  });

  it('development without configuration: log-only, reported as simulated', async () => {
    process.env.NODE_ENV = 'development';
    const p = buildMessagingProviders(messagingEnv());
    expect([p.sms.name, p.whatsapp.name, p.email.name]).toEqual(['log-only', 'log-only', 'log-only']);
    expect(await p.sms.send({ to: '+919876543210', text: 'x' })).toEqual({ ok: true, simulated: true });
  });

  it('picks the real providers when credentials are set, and the fake on request', () => {
    process.env.NODE_ENV = 'production';
    process.env.SMSLANE_API_KEY = 'k'; process.env.SMSLANE_CLIENT_ID = 'c'; process.env.SMSLANE_SENDER_ID = 's';
    process.env.WHATCHIMP_API_TOKEN = 't'; process.env.WHATCHIMP_PHONE_NUMBER_ID = 'p';
    process.env.SMTP_HOST = 'h'; process.env.SMTP_USER = 'u@example.com'; process.env.SMTP_PASS = 'p';
    const real = buildMessagingProviders(messagingEnv());
    expect([real.sms.name, real.whatsapp.name, real.email.name]).toEqual(['smslane', 'whatchimp', 'smtp']);

    process.env.NODE_ENV = 'test';
    process.env.SMS_PROVIDER = 'fake';
    expect(buildMessagingProviders(messagingEnv()).sms.name).toBe('fake');
    process.env.SMS_PROVIDER = 'none';
    expect(buildMessagingProviders(messagingEnv()).sms.name).toBe('log-only');
  });
});

describe('e-mail templates (ported from the website)', () => {
  it('keeps the website subject lines', () => {
    expect(emailTemplates.OTP({ otp: '482913', expiryMinutes: 10 }).subject).toBe('Your Verification Code — Astro Sushil');
    expect(emailTemplates.BOOKING_CONFIRMED_USER({ userName: 'A', bookingId: 'b1', consultationTitle: 'C', mode: 'video', date: 'd', slot: 's' }).subject).toBe('Booking Confirmed #b1 — Astro Sushil');
    expect(emailTemplates.BOOKING_UPGRADED_USER({ userName: 'A', bookingId: 'b1', consultationTitle: 'C', mode: 'video', date: 'd', slot: 's' }).subject).toBe('Booking Updated #b1 — Astro Sushil');
    expect(emailTemplates.BOOKING_REMINDER_USER({ userName: 'A', bookingId: 'b1', consultationTitle: 'C', mode: 'video', date: 'd', slot: 's' }).subject).toBe('Reminder: Consultation Tomorrow — #b1');
    expect(emailTemplates.BOOKING_RESCHEDULE_USER({ userName: 'A', bookingId: 'b1', consultationTitle: 'C', mode: 'video', oldDate: 'a', oldSlot: 'b', newDate: 'c', newSlot: 'd' }).subject).toBe('Booking Rescheduled #b1 — Astro Sushil');
    expect(emailTemplates.BOOKING_CONFIRMED_ADMIN({ userName: 'A', bookingId: 'b1', consultationTitle: 'C', mode: 'video', date: 'd', slot: 's' }).subject).toBe('📅 New Booking #b1 — C');
    expect(emailTemplates.ORDER_CONFIRMED_USER({ userName: 'A', orderStatus: 'shipped', orderId: 'o1', totalAmount: 10 }).subject).toBe('Order shipped #o1 — Astro Sushil');
    expect(emailTemplates.ORDER_UPDATED_ADMIN({ userName: 'A', orderStatus: 'shipped', orderId: 'o1', totalAmount: 10 }).subject).toBe('🚚 Order Order Shipped! #o1');
    expect(emailTemplates.REPORT_ORDER_CONFIRMED_USER({ userName: 'A', reportName: 'Kundali Report' }).subject).toBe('Your Kundali Report is Being Prepared — Astro Sushil');
    expect(emailTemplates.REPORT_READY_USER({ name: 'A', reportName: 'Kundali Report', reportUrl: 'https://x' }).subject).toBe('Kundali Report — Your Report is Ready 🎯');
  });

  it('keeps the website wording', () => {
    const otp = emailTemplates.OTP({ otp: '482913', expiryMinutes: 10 }).html;
    expect(otp).toContain('Use the code below to complete your verification. Do not share this with anyone.');
    expect(otp).toContain('482913');
    expect(otp).toContain('<strong>10 minutes</strong>');
    const report = emailTemplates.REPORT_ORDER_CONFIRMED_USER({ userName: 'A', reportName: 'Kundali Report' }).html;
    expect(report).toContain('delivered to you within the next <strong style="color:#424874;">48 hours</strong>');
    const order = emailTemplates.ORDER_CONFIRMED_USER({ userName: 'A', orderStatus: 'confirmed', orderId: 'o1', totalAmount: 1500, products: [{ name: 'Mala', quantity: 2, price: 750 }] }).html;
    expect(order).toContain('Your order will be dispatched within 5 - 6 working days.');
    expect(order).toContain('₹1,500');
    expect(order).toContain('https://site.example/dashboard?tab=orders');
    const inPerson = emailTemplates.BOOKING_CONFIRMED_USER({ userName: 'A', bookingId: 'b', consultationTitle: 'C', mode: 'in_person', date: '25-11-2026', slot: '14:00-14:30', amount: 1500 }).html;
    expect(inPerson).toContain('For meeting coordination, please call this number');
    expect(inPerson).toContain('>14:00</td>');
    expect(emailTemplates.BOOKING_CONFIRMED_ADMIN({ userName: 'A', bookingId: 'b', consultationTitle: 'C', mode: 'video', date: 'd', slot: 's' }).html).toContain('https://admin.example/booking');
  });

  it('escapes customer-supplied values (the website did not)', () => {
    const html = emailTemplates.CONTACT_ADMIN({ name: '<script>alert(1)</script>', email: 'a@b.co', message: '<img src=x onerror=1>' }).html;
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<img src=x');
    const booking = emailTemplates.BOOKING_CONFIRMED_USER({ userName: 'A<b>', bookingId: 'b', consultationTitle: 'C&D', mode: 'video', date: 'd', slot: 's', includes: ['<i>x</i>'] }).html;
    expect(booking).toContain('A&lt;b&gt;');
    expect(booking).toContain('C&amp;D');
    expect(booking).toContain('&lt;i&gt;x&lt;/i&gt;');
  });
});

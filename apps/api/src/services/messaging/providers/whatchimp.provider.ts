import { messagingEnv, WHATSAPP_TEMPLATE_ENV } from '../config';
import { fetchHttpClient, httpFailureCode, HttpClient } from '../http';
import type { SendResult, WhatsAppMessage, WhatsAppProvider } from '../types';

const asRecord = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/**
 * WhatChimp "send template", called the way the website calls it: GET with
 * apiToken, phone_number_id, template_id, phone_number and the templateVariable-*
 * values as query parameters.
 *
 * The website's code is the only specification we have and it passes the token as
 * the `apiToken` query parameter only; nothing there shows a header being accepted.
 * So the token stays a query parameter, and the request URL is never logged or put
 * in an error (see ../http).
 */
export class WhatChimpProvider implements WhatsAppProvider {
  public readonly name = 'whatchimp';

  constructor(private readonly http: HttpClient = fetchHttpClient) {}

  public async send(message: WhatsAppMessage): Promise<SendResult> {
    const env = messagingEnv();
    const { apiToken, phoneNumberId, url, templateIds } = env.whatsapp;
    if (!apiToken || !phoneNumberId) {
      return { ok: false, code: 'PROVIDER_NOT_CONFIGURED', retryable: false, detail: 'WhatChimp credentials are not set' };
    }
    const templateId = templateIds[message.template];
    if (!templateId) {
      return {
        ok: false,
        code: 'TEMPLATE_NOT_CONFIGURED',
        retryable: false,
        detail: `${WHATSAPP_TEMPLATE_ENV[message.template]} is not set`,
      };
    }

    const params: Record<string, string> = {
      apiToken,
      phone_number_id: phoneNumberId,
      template_id: templateId,
      phone_number: message.to,
      ...message.variables,
    };

    try {
      const res = await this.http.get(url, params, env.httpTimeoutMs);
      if (res.status >= 500) return { ok: false, code: 'PROVIDER_HTTP_ERROR', retryable: true, detail: `HTTP ${res.status}` };
      if (res.status >= 400) return { ok: false, code: 'PROVIDER_REJECTED', retryable: false, detail: `HTTP ${res.status}` };

      // The website treats every 2xx as sent. A body that explicitly reports failure
      // ({ status: "0" | 0 | false | "error" }) is treated as a rejection here.
      const body = asRecord(res.body);
      const status = body ? body.status : undefined;
      if (status === '0' || status === 0 || status === false || status === 'error' || status === 'failed') {
        return { ok: false, code: 'PROVIDER_REJECTED', retryable: false, detail: 'provider reported failure' };
      }
      const id = body && typeof body.wa_message_id === 'string' ? body.wa_message_id : undefined;
      return { ok: true, providerMessageId: id };
    } catch (err) {
      return { ok: false, code: httpFailureCode(err), retryable: true };
    }
  }
}

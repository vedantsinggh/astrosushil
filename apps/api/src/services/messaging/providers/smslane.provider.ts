import { messagingEnv } from '../config';
import { fetchHttpClient, httpFailureCode, HttpClient } from '../http';
import { toSmsLaneNumber } from '../phone';
import type { SendResult, SmsMessage, SmsProvider } from '../types';

/** GSM-7 has no rupee sign or emoji; SMSLane swaps them for "?" unless the request is flagged Unicode. */
const needsUnicode = (text: string): boolean => !/^[\x00-\x7F]*$/.test(text);

const asRecord = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/**
 * SMSLane v2 SendSMS, called the way the website calls it: GET with SenderId,
 * Message, MobileNumbers, ApiKey and ClientId as query parameters. The website's
 * code shows no other way to pass the key, so it stays in the query string and is
 * therefore never logged (see ../http).
 *
 * SMSLane answers HTTP 200 even when it rejects a message (DLT mismatch, Unicode
 * not flagged), so the body is inspected: a non-zero ErrorCode or MessageErrorCode
 * is a failure.
 */
export class SmsLaneProvider implements SmsProvider {
  public readonly name = 'smslane';

  constructor(private readonly http: HttpClient = fetchHttpClient) {}

  public async send(message: SmsMessage): Promise<SendResult> {
    const env = messagingEnv();
    const { apiKey, clientId, senderId, url } = env.sms;
    if (!apiKey || !clientId || !senderId) {
      return { ok: false, code: 'PROVIDER_NOT_CONFIGURED', retryable: false, detail: 'SMSLane credentials are not set' };
    }

    const number = toSmsLaneNumber(message.to);
    if (!number) {
      return { ok: false, code: 'SMS_INDIA_ONLY', retryable: false, detail: 'SMS is sent to Indian mobile numbers only' };
    }

    const params: Record<string, string> = {
      SenderId: senderId,
      Message: message.text,
      MobileNumbers: number,
      ApiKey: apiKey,
      ClientId: clientId,
    };
    // Carried over from the website, which itself calls this an untested best-effort:
    // SMSLane's v1 API needs dc=8 for Unicode content.
    if (needsUnicode(message.text)) params.dc = '8';

    try {
      const res = await this.http.get(url, params, env.httpTimeoutMs);
      if (res.status >= 500) return { ok: false, code: 'PROVIDER_HTTP_ERROR', retryable: true, detail: `HTTP ${res.status}` };
      if (res.status >= 400) return { ok: false, code: 'PROVIDER_REJECTED', retryable: false, detail: `HTTP ${res.status}` };

      const body = asRecord(res.body);
      const errorCode = body ? Number(body.ErrorCode ?? 0) : 0;
      if (errorCode !== 0) {
        return { ok: false, code: 'PROVIDER_REJECTED', retryable: false, detail: `ErrorCode ${errorCode}` };
      }
      const first = body && Array.isArray(body.Data) ? asRecord(body.Data[0]) : null;
      const messageErrorCode = first ? Number(first.MessageErrorCode ?? 0) : 0;
      if (messageErrorCode !== 0) {
        return { ok: false, code: 'PROVIDER_REJECTED', retryable: false, detail: `MessageErrorCode ${messageErrorCode}` };
      }
      const id = first && typeof first.MessageId === 'string' ? first.MessageId : undefined;
      return { ok: true, providerMessageId: id };
    } catch (err) {
      return { ok: false, code: httpFailureCode(err), retryable: true };
    }
  }
}

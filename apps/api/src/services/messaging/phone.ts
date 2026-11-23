import { normalizePhoneNumber, isValidE164, maskPhoneNumber } from '../../utils/phone';

/**
 * The ONE phone normalisation used for every outbound send (SMS, WhatsApp, OTP).
 *
 * Rule (India default):
 *  - separators (spaces, dashes, dots, brackets) are removed;
 *  - "00<cc>..." becomes "+<cc>...";
 *  - a number that already starts with "+" is kept;
 *  - a bare 10-digit number, or "0" + 10 digits, is Indian: "+91" + the 10 digits;
 *  - 12 digits starting with "91" become "+91...";
 *  - any other 8-15 digit number is taken to already include its country code.
 * Returns null (never throws) when the input cannot be a phone number.
 *
 * The website stored mixed formats ("+919876543210", "919876543210", "9876543210";
 * see its buildPhoneVariants). The data migration must run every stored phone number
 * through this function and store the result; two website users whose numbers
 * normalise to the same value are the same phone and must be reported, not merged
 * silently.
 */
export function toE164(raw: string | null | undefined, defaultCountryCode = '91'): string | null {
  if (raw === null || raw === undefined) return null;
  try {
    const normalized = normalizePhoneNumber(String(raw), defaultCountryCode);
    return isValidE164(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

/**
 * SMSLane takes the number without "+". The sender id and DLT templates are Indian,
 * so SMS is sent to Indian mobile numbers only; anything else returns null.
 * (The website took the last 10 digits of ANY number and prefixed 91, which would
 * send a foreign customer's SMS to an unrelated Indian number.)
 */
export function toSmsLaneNumber(e164: string): string | null {
  return /^\+91[6-9]\d{9}$/.test(e164) ? e164.slice(1) : null;
}

export function maskPhone(phone: string | null | undefined): string {
  return phone ? maskPhoneNumber(phone) : '';
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return '';
  const at = email.indexOf('@');
  if (at < 1) return '***';
  return `${email[0]}***${email.slice(at)}`;
}

export function isPlausibleEmail(email: string | null | undefined): email is string {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

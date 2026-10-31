import { ValidationError } from '../errors/app-error';

/**
 * Normalizes phone numbers to standard canonical E.164 format.
 * Automatically handles common input patterns:
 * - Indian 10-digit: "9876543210" -> "+919876543210"
 * - Leading zero: "09876543210" -> "+919876543210"
 * - Country code without plus: "919876543210" -> "+919876543210"
 * - Full E.164 format: "+919876543210" -> "+919876543210"
 * - Formatted strings: "+91 98765-43210", "+1 (555) 234-5678"
 */
export function normalizePhoneNumber(rawPhone: string, defaultCountryCode = '91'): string {
  if (!rawPhone || typeof rawPhone !== 'string') {
    throw new ValidationError('Phone number is required');
  }

  // 1. Remove all whitespace, dashes, parens, and special formatting characters except leading '+'
  let cleaned = rawPhone.trim().replace(/[\s\-\(\)\.\,\/]/g, '');

  if (!cleaned) {
    throw new ValidationError('Invalid phone number format');
  }

  // 2. Handle double zero prefix (e.g. 0091 -> +91)
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  // 3. If phone starts with '+', validate and return
  if (cleaned.startsWith('+')) {
    const digitsOnly = cleaned.slice(1);
    if (!/^\d{8,15}$/.test(digitsOnly)) {
      throw new ValidationError('Phone number must contain between 8 and 15 digits in E.164 format');
    }
    return cleaned;
  }

  // 4. Handle leading '0' (common in domestic dialing: e.g. 09876543210 in India)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    const tenDigits = cleaned.slice(1);
    if (/^\d{10}$/.test(tenDigits)) {
      return `+${defaultCountryCode}${tenDigits}`;
    }
  }

  // 5. Handle raw 10 digits (e.g. 9876543210)
  if (/^\d{10}$/.test(cleaned)) {
    return `+${defaultCountryCode}${cleaned}`;
  }

  // 6. Handle 12 digits starting with country code (e.g. 919876543210)
  if (cleaned.startsWith(defaultCountryCode) && cleaned.length === 12 && /^\d{12}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // 7. Generic international number without '+' (8 to 15 digits)
  if (/^[1-9]\d{7,14}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  throw new ValidationError('Invalid phone number format. Please provide a valid phone number.');
}

/**
 * Validates whether a phone number string complies with E.164 format.
 */
export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

/**
 * Masks a phone number for secure client-facing display (e.g. "+91 ••••• •3210").
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 6) return phone;
  const lastFour = phone.slice(-4);
  const prefix = phone.startsWith('+91') ? '+91 ' : phone.slice(0, 3) + ' ';
  return `${prefix}••••• •${lastFour}`;
}

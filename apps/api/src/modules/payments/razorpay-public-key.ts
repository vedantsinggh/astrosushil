import { AppError } from '../../errors/app-error';

/**
 * Returns the configured public Razorpay key id for client checkout.
 * Never substitutes a placeholder key: a missing key is an explicit configuration error.
 */
export function getRazorpayPublicKeyId(): string {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  if (!keyId) {
    throw new AppError('Payments are not configured on this server.', 503, 'PAYMENT_GATEWAY_UNCONFIGURED');
  }
  return keyId;
}

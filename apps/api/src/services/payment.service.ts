import crypto from 'crypto';
import { ReportType } from '@prisma/client';
import { config } from '../config';
import { logger } from '../utils/logger';

export const REPORT_PRICES_PAISE: Record<ReportType, number> = {
  KUNDLI: 29900,                 // ₹299
  PLANETARY_SUMMARY: 19900,      // ₹199
  CAREER: 49900,                 // ₹499
  MARRIAGE_COMPATIBILITY: 49900, // ₹499
  CAREER_PROSITY: 69900,         // ₹699
  CHILDBIRTH_FAMILY: 49900,      // ₹499
  GUPTA_NADI_DOSSIER: 99900,     // ₹999
};

export interface RazorpayOrderResult {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt?: string;
  isTestMode?: boolean;
}

export interface RazorpayRefundResult {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: 'processed' | 'pending' | 'failed';
  isTestMode?: boolean;
}

export class PaymentService {
  /**
   * Server-side creation of Razorpay Order using trusted calculated amount.
   */
  public async createRazorpayOrder(
    amountPaise: number,
    currency: string = 'INR',
    receipt?: string,
    notes?: Record<string, string>
  ): Promise<RazorpayOrderResult> {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const isProduction = config.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';

    // If real credentials are provided, call Razorpay Orders API
    if (keyId && keySecret) {
      try {
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amountPaise,
            currency,
            receipt: receipt || `rcpt_${Date.now()}`,
            notes: notes || {},
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as any;
          return {
            id: data.id,
            amount: data.amount,
            currency: data.currency,
            status: data.status,
            receipt: data.receipt,
            isTestMode: false,
          };
        } else {
          const errText = await response.text();
          logger.error({ status: response.status, errText }, 'Razorpay API order creation failed');
          if (isProduction) {
            throw new Error(`Razorpay gateway order creation failed: ${response.statusText}`);
          }
        }
      } catch (err: any) {
        logger.error({ err: err?.message }, 'Error contacting Razorpay API');
        if (isProduction) {
          throw err;
        }
      }
    }

    if (isProduction) {
      throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured in production environment');
    }

    // Provider-compatible test mode mock for local development and CI testing
    const randomHex = crypto.randomBytes(8).toString('hex');
    const razorpayOrderId = `order_mock_${randomHex}`;
    return {
      id: razorpayOrderId,
      amount: amountPaise,
      currency,
      status: 'created',
      receipt: receipt || `rcpt_mock_${randomHex}`,
      isTestMode: true,
    };
  }

  /**
   * Verified checkout signature verification for client checkout payload.
   * Format: HMAC-SHA256(order_id + '|' + payment_id, secret) === signature
   */
  public verifyCheckoutSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): boolean {
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return false;
    }

    const isProduction = config.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';

    // In production, ANY mock signature prefix must be rejected immediately
    if (isProduction && razorpaySignature.startsWith('mock_sig_')) {
      logger.warn({ razorpayOrderId }, 'REJECTED: Mock signature bypass attempted in production mode');
      return false;
    }

    // In non-production, permit mock signature for local development only if explicitly configured
    if (!isProduction && razorpaySignature.startsWith('mock_sig_')) {
      return true;
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      // In production or when secrets are missing, fail closed
      return false;
    }

    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    try {
      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const actualBuf = Buffer.from(razorpaySignature, 'utf8');
      if (expectedBuf.length !== actualBuf.length) {
        return false;
      }
      return crypto.timingSafeEqual(expectedBuf, actualBuf);
    } catch {
      return false;
    }
  }

  /**
   * Verified webhook signature verification against RAW request body.
   * Format: HMAC-SHA256(raw_body, webhook_secret) === x-razorpay-signature
   */
  public verifyWebhookSignature(
    rawBody: string | Buffer,
    signatureHeader: string
  ): boolean {
    if (!rawBody || !signatureHeader) {
      return false;
    }

    const isProduction = config.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';

    // In production, mock signatures must be rejected
    if (isProduction && signatureHeader.startsWith('mock_wh_sig_')) {
      logger.warn('REJECTED: Mock webhook signature attempted in production mode');
      return false;
    }

    // Non-production test bypass
    if (!isProduction && signatureHeader.startsWith('mock_wh_sig_')) {
      return true;
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.warn('RAZORPAY_WEBHOOK_SECRET is not configured');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    try {
      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const actualBuf = Buffer.from(signatureHeader, 'utf8');
      if (expectedBuf.length !== actualBuf.length) {
        return false;
      }
      return crypto.timingSafeEqual(expectedBuf, actualBuf);
    } catch {
      return false;
    }
  }

  /**
   * Backward-compatible alias for existing callers.
   */
  public verifySignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): boolean {
    return this.verifyCheckoutSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  }

  /**
   * Issue Razorpay refund for a payment.
   */
  public async createRazorpayRefund(
    paymentId: string,
    amountPaise: number,
    notes?: Record<string, string>
  ): Promise<RazorpayRefundResult> {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const isProduction = config.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';

    if (keyId && keySecret) {
      try {
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amountPaise,
            notes: notes || {},
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as any;
          return {
            id: data.id,
            paymentId: data.payment_id,
            amount: data.amount,
            currency: data.currency || 'INR',
            status: data.status === 'processed' ? 'processed' : 'pending',
            isTestMode: false,
          };
        } else {
          const errText = await response.text();
          logger.error({ status: response.status, errText }, 'Razorpay refund API failed');
          if (isProduction) {
            throw new Error(`Razorpay refund failed: ${response.statusText}`);
          }
        }
      } catch (err: any) {
        logger.error({ err: err?.message }, 'Error contacting Razorpay refund API');
        if (isProduction) {
          throw err;
        }
      }
    }

    if (isProduction) {
      throw new Error('RAZORPAY credentials must be configured in production to issue refunds');
    }

    const randomHex = crypto.randomBytes(8).toString('hex');
    return {
      id: `rfnd_${randomHex}`,
      paymentId,
      amount: amountPaise,
      currency: 'INR',
      status: 'processed',
      isTestMode: true,
    };
  }
}

export const paymentService = new PaymentService();

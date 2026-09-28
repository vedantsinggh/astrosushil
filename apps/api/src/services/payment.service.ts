import crypto from 'crypto';
import { ReportType } from '@prisma/client';

export const REPORT_PRICES_PAISE: Record<ReportType, number> = {
  KUNDLI: 29900,                 // ₹299
  PLANETARY_SUMMARY: 19900,      // ₹199
  CAREER: 49900,                 // ₹499
  MARRIAGE_COMPATIBILITY: 49900, // ₹499
  CAREER_PROSITY: 69900,         // ₹699
  CHILDBIRTH_FAMILY: 49900,      // ₹499
  GUPTA_NADI_DOSSIER: 99900,     // ₹999
};

export class PaymentService {
  /**
   * Mock creation of Razorpay Order ID for local testing.
   */
  public async createRazorpayOrder(amountPaise: number, currency: string = 'INR') {
    const randomHex = crypto.randomBytes(8).toString('hex');
    const razorpayOrderId = `order_mock_${randomHex}`;
    return {
      id: razorpayOrderId,
      amount: amountPaise,
      currency,
      status: 'created',
    };
  }

  /**
   * Mock signature verification for Razorpay payment payload.
   */
  public verifySignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): boolean {
    if (process.env.NODE_ENV === 'test' || razorpaySignature.startsWith('mock_sig_')) {
      return true;
    }
    const secret = process.env.RAZORPAY_KEY_SECRET || 'mock_secret';
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    return expectedSignature === razorpaySignature;
  }
}

export const paymentService = new PaymentService();

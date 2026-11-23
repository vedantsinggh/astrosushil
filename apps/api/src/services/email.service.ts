import { AppError } from '../errors/app-error';
import { logger } from '../utils/logger';
import { messagingEnv } from './messaging/config';
import { maskEmail } from './messaging/phone';
import { OtpDeliveryService, OtpSendLimiter, otpDeliveryService, otpSendLimiter } from './messaging/otp-delivery.service';
import { getMessagingProviders } from './messaging/provider-registry';

/** OTP lifetime used by the e-mail flows in auth.service (createOtpRecord default). */
const EMAIL_OTP_EXPIRY_MINUTES = 10;

/**
 * E-mail OTP delivery for sign-up verification and password reset.
 *
 * Both use the website's OTP e-mail ("Your Verification Code — Astro Sushil"), as
 * the website does for its EMAIL channel, and go through the messaging e-mail
 * provider (SMTP). The method signatures are unchanged for auth.service.
 *
 * Differences from the previous implementation:
 *  - nothing is "sent" silently any more: when the provider is not configured in
 *    production, or SMTP fails, the verification e-mail throws
 *    EMAIL_DELIVERY_FAILED (503) and the password-reset e-mail logs an error
 *    (it must not throw: /auth/forgot-password answers the same whether or not the
 *    address has an account, and an error only for real accounts would reveal them);
 *    outside production the provider's log-only default is used;
 *  - a per-address send limit applies. A request over the limit is dropped QUIETLY
 *    (logged, no error) so the API answer stays the same whether or not the
 *    address has an account.
 */
export class EmailService {
  constructor(
    private readonly delivery: OtpDeliveryService = otpDeliveryService,
    private readonly limiter: OtpSendLimiter = otpSendLimiter
  ) {}

  /** Send email verification OTP to user. */
  public async sendVerificationEmail(toEmail: string, otp: string): Promise<void> {
    await this.sendOtp(toEmail, otp, 'verification');
  }

  /** Send password reset OTP to user. */
  public async sendPasswordResetEmail(toEmail: string, otp: string): Promise<void> {
    await this.sendOtp(toEmail, otp, 'password-reset');
  }

  /** Generic transactional e-mail (used by the notifications module). Throws when it cannot be sent. */
  public async sendMailDirect(params: { toEmail: string; subject: string; text?: string; html: string }): Promise<void> {
    const result = await getMessagingProviders().email.send({
      to: params.toEmail,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    if (!result.ok) throw new AppError('The e-mail could not be sent. Please try again shortly.', 503, 'EMAIL_DELIVERY_FAILED');
  }

  private async sendOtp(toEmail: string, otp: string, purpose: 'verification' | 'password-reset'): Promise<void> {
    const allowance = await this.limiter.consume({ identifier: toEmail });
    if (!allowance.allowed) {
      logger.warn({ to: maskEmail(toEmail), purpose, window: allowance.window }, '[EmailService] OTP e-mail send limit reached; e-mail not sent');
      return;
    }

    const result = await this.delivery.sendEmailOtp({ email: toEmail, otp, expiryMinutes: EMAIL_OTP_EXPIRY_MINUTES });
    if (result.ok) return;

    if (purpose === 'password-reset') {
      // Visible in the error log and in monitoring, invisible to the requester (see class comment).
      logger.error({ to: maskEmail(toEmail), purpose, code: result.code }, '[EmailService] Password reset e-mail was NOT delivered');
      return;
    }
    if (messagingEnv().isProduction) {
      throw new AppError('We could not send the verification e-mail. Please try again shortly.', 503, 'EMAIL_DELIVERY_FAILED');
    }
    logger.warn({ to: maskEmail(toEmail), purpose, code: result.code }, '[EmailService] [DEV] OTP e-mail was not delivered');
  }
}

export const emailService = new EmailService();

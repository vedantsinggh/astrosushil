import { emailService } from '../../services/email.service';
import { logger } from '../../utils/logger';

export class EmailProvider {
  /**
   * Send transactional email using the core EmailService
   */
  public async sendEmail(params: {
    toEmail: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<{ success: boolean; errorCode?: string }> {
    try {
      // Only send through a genuine generic transactional transport. Never substitute a
      // different email (previously a verification email with a fake OTP was sent instead).
      const sendMailDirect = (emailService as unknown as {
        sendMailDirect?: (p: { toEmail: string; subject: string; text: string; html: string }) => Promise<void>;
      }).sendMailDirect;
      if (typeof sendMailDirect !== 'function') {
        logger.error({ toEmail: params.toEmail }, '[EmailProvider] No generic transactional email transport is available');
        return { success: false, errorCode: 'EMAIL_TRANSPORT_UNSUPPORTED' };
      }
      await sendMailDirect.call(emailService, params);

      logger.info({ toEmail: params.toEmail, subject: params.subject }, '[EmailProvider] Transactional email sent successfully');
      return { success: true };
    } catch (err: any) {
      logger.error({ toEmail: params.toEmail, err: err?.message || String(err) }, '[EmailProvider] Failed to send email');
      return { success: false, errorCode: err?.message || 'EMAIL_SEND_FAILURE' };
    }
  }
}

export const emailProvider = new EmailProvider();

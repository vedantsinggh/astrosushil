import { getMessagingProviders } from '../../services/messaging/provider-registry';
import { maskEmail } from '../../services/messaging/phone';
import { logger } from '../../utils/logger';

export class EmailProvider {
  /**
   * Sends one e-mail through the configured messaging e-mail provider (SMTP).
   * Reports failure honestly: in production a missing SMTP configuration is
   * `success: false` with PROVIDER_NOT_CONFIGURED, never a silent success.
   */
  public async sendEmail(params: {
    toEmail: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<{ success: boolean; errorCode?: string }> {
    try {
      const result = await getMessagingProviders().email.send({
        to: params.toEmail,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
      if (result.ok) {
        logger.info({ toEmail: maskEmail(params.toEmail), simulated: result.simulated === true }, '[EmailProvider] Transactional email sent');
        return { success: true };
      }
      logger.error({ toEmail: maskEmail(params.toEmail), errorCode: result.code }, '[EmailProvider] Failed to send email');
      return { success: false, errorCode: result.code };
    } catch (err) {
      logger.error({ toEmail: maskEmail(params.toEmail), err: err instanceof Error ? err.name : 'Error' }, '[EmailProvider] Failed to send email');
      return { success: false, errorCode: 'EMAIL_SEND_FAILURE' };
    }
  }
}

export const emailProvider = new EmailProvider();

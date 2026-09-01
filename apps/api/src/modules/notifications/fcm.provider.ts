import { config } from '../../config';
import { logger } from '../../utils/logger';
import { prisma } from '../../services/prisma.service';
import { FcmPushPayload } from './notification.types';

export class FcmProvider {
  /**
   * Send FCM push message to a specific device token using Google FCM Legacy REST API / FCM v1
   */
  public async sendPushNotification(payload: FcmPushPayload): Promise<{ success: boolean; errorCode?: string }> {
    const isConfigured = Boolean(config.FCM_SERVER_KEY && config.FCM_SERVER_KEY.trim().length > 0);

    if (!isConfigured) {
      logger.warn(
        { tokenPrefix: payload.token.substring(0, 10) },
        '[FcmProvider] FCM_SERVER_KEY is not configured. Simulating push delivery in dev mode.'
      );
      return { success: true };
    }

    try {
      const url = 'https://fcm.googleapis.com/fcm/send';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const body = {
        to: payload.token,
        notification: {
          title: payload.notification.title,
          body: payload.notification.body,
          sound: 'default',
        },
        data: payload.data,
        priority: 'high',
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${config.FCM_SERVER_KEY}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        logger.error({ status: response.status, err: errText }, '[FcmProvider] FCM API HTTP error response');

        if (response.status === 400 || response.status === 404) {
          await this.markTokenInactive(payload.token, `HTTP_${response.status}`);
        }

        return { success: false, errorCode: `HTTP_${response.status}` };
      }

      const resJson: any = await response.json();
      if (resJson.failure > 0 && resJson.results?.[0]?.error) {
        const errCode = resJson.results[0].error;
        logger.warn({ tokenPrefix: payload.token.substring(0, 10), errCode }, '[FcmProvider] FCM push delivery failed');

        if (['NotRegistered', 'InvalidRegistration', 'MismatchSenderId', 'Unregistered'].includes(errCode)) {
          await this.markTokenInactive(payload.token, errCode);
        }
        return { success: false, errorCode: errCode };
      }

      return { success: true };
    } catch (err: any) {
      logger.error({ err: err?.message || String(err) }, '[FcmProvider] Exception sending FCM push notification');
      return { success: false, errorCode: 'FCM_FETCH_EXCEPTION' };
    }
  }

  /**
   * Mark an invalid or unregistered token as inactive in the database
   */
  public async markTokenInactive(fcmToken: string, reason: string): Promise<void> {
    try {
      await prisma.deviceToken.updateMany({
        where: { fcmToken },
        data: { isActive: false },
      });
      logger.info({ tokenPrefix: fcmToken.substring(0, 10), reason }, '[FcmProvider] Marked device token as inactive');
    } catch (err) {
      logger.error({ err }, '[FcmProvider] Failed to mark token inactive');
    }
  }
}

export const fcmProvider = new FcmProvider();

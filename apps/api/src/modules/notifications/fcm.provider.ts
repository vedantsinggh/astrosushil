import crypto from 'node:crypto';
import fs from 'node:fs';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { prisma } from '../../services/prisma.service';
import { FcmPushPayload } from './notification.types';

/**
 * Phone push through Firebase Cloud Messaging, HTTP v1 API.
 *
 * Google switched the old "legacy" API (fcm.googleapis.com/fcm/send with a server key) off in
 * 2024; v1 authenticates with a Firebase service account instead. The account comes from either
 *   FIREBASE_SERVICE_ACCOUNT_FILE  path to the JSON key downloaded from the Firebase console, or
 *   FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.
 * The OAuth token is made here with Node's own RS256 signing (no Firebase SDK on the server) and
 * reused until shortly before it expires.
 *
 * Not configured: in development a send is simulated (reported as success, as before); in
 * production it is reported as PUSH_NOT_CONFIGURED so nobody believes a push went out.
 */
interface ServiceAccount {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function loadServiceAccount(env: NodeJS.ProcessEnv = process.env): ServiceAccount | null {
  const file = env.FIREBASE_SERVICE_ACCOUNT_FILE?.trim();
  if (file) {
    try {
      const json = JSON.parse(fs.readFileSync(file, 'utf8')) as { project_id?: string; client_email?: string; private_key?: string };
      if (json.project_id && json.client_email && json.private_key) {
        return { projectId: json.project_id, clientEmail: json.client_email, privateKey: json.private_key };
      }
      logger.error('[FcmProvider] FIREBASE_SERVICE_ACCOUNT_FILE is not a Firebase service-account key');
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, '[FcmProvider] Could not read FIREBASE_SERVICE_ACCOUNT_FILE');
    }
    return null;
  }
  const projectId = (env.FIREBASE_PROJECT_ID ?? config.FIREBASE_PROJECT_ID)?.trim();
  const clientEmail = (env.FIREBASE_CLIENT_EMAIL ?? config.FIREBASE_CLIENT_EMAIL)?.trim();
  // Keys pasted into .env usually carry literal "\n".
  const privateKey = (env.FIREBASE_PRIVATE_KEY ?? config.FIREBASE_PRIVATE_KEY)?.replace(/\\n/g, '\n').trim();
  return projectId && clientEmail && privateKey ? { projectId, clientEmail, privateKey } : null;
}

export class FcmProvider {
  private account: ServiceAccount | null | undefined;
  private accessToken: { value: string; expiresAt: number } | null = null;

  private getAccount(): ServiceAccount | null {
    if (this.account === undefined) this.account = loadServiceAccount();
    return this.account;
  }

  public isConfigured(): boolean {
    return this.getAccount() !== null;
  }

  private async getAccessToken(account: ServiceAccount): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.accessToken && this.accessToken.expiresAt - 60 > now) return this.accessToken.value;
    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = base64url(JSON.stringify({ iss: account.clientEmail, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }));
    const signature = base64url(crypto.createSign('RSA-SHA256').update(`${header}.${claims}`).sign(account.privateKey));
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claims}.${signature}` }),
    });
    if (!response.ok) throw new Error(`Google OAuth token request failed (HTTP ${response.status})`);
    const json = (await response.json()) as { access_token: string; expires_in: number };
    this.accessToken = { value: json.access_token, expiresAt: now + (json.expires_in || 3600) };
    return json.access_token;
  }

  /** Send one push message to one device token. */
  public async sendPushNotification(payload: FcmPushPayload): Promise<{ success: boolean; errorCode?: string }> {
    const account = this.getAccount();
    if (!account) {
      if (process.env.NODE_ENV === 'production') return { success: false, errorCode: 'PUSH_NOT_CONFIGURED' };
      logger.warn({ tokenPrefix: payload.token.substring(0, 10) }, '[FcmProvider] Firebase is not configured. Simulating push delivery in dev mode.');
      return { success: true };
    }

    // FCM data values must be strings.
    const data: Record<string, string> = {};
    for (const [key, value] of Object.entries(payload.data)) if (value !== undefined) data[key] = String(value);

    try {
      const accessToken = await this.getAccessToken(account);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(`https://fcm.googleapis.com/v1/projects/${account.projectId}/messages:send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          message: {
            token: payload.token,
            notification: { title: payload.notification.title, body: payload.notification.body },
            data,
            android: { priority: 'HIGH', notification: { sound: 'default' } },
            apns: { payload: { aps: { sound: 'default' } } },
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        const code = /UNREGISTERED|registration-token-not-registered/i.test(errText)
          ? 'UNREGISTERED'
          : /INVALID_ARGUMENT/.test(errText)
            ? 'INVALID_ARGUMENT'
            : `HTTP_${response.status}`;
        logger.warn({ status: response.status, code }, '[FcmProvider] FCM push delivery failed');
        // A token the phone no longer uses: stop sending to it. (INVALID_ARGUMENT can also mean a
        // bad message, so it does not switch a token off.)
        if (code === 'UNREGISTERED') {
          await this.markTokenInactive(payload.token, code);
        }
        if (response.status === 401) this.accessToken = null;
        return { success: false, errorCode: code };
      }
      return { success: true };
    } catch (err: unknown) {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, '[FcmProvider] Exception sending FCM push notification');
      return { success: false, errorCode: 'FCM_FETCH_EXCEPTION' };
    }
  }

  /** Mark an invalid or unregistered token as inactive in the database. */
  public async markTokenInactive(fcmToken: string, reason: string): Promise<void> {
    try {
      await prisma.deviceToken.updateMany({ where: { fcmToken }, data: { isActive: false } });
      logger.info({ tokenPrefix: fcmToken.substring(0, 10), reason }, '[FcmProvider] Marked device token as inactive');
    } catch (err) {
      logger.error({ err }, '[FcmProvider] Failed to mark token inactive');
    }
  }
}

export const fcmProvider = new FcmProvider();

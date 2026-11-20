import { AppError, AuthenticationError } from '../../errors/app-error';
import { logger } from '../../utils/logger';
import { config } from '../../config';

/** Issuers Google uses for ID tokens. */
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

/**
 * Parses the comma-separated GOOGLE_OAUTH_CLIENT_IDS setting into a clean list.
 */
export function parseGoogleClientIds(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

export type GoogleAudienceCheck = 'accepted' | 'not_configured' | 'rejected';

/**
 * Decides whether a Google ID token's `aud` claim belongs to one of our OAuth clients.
 * - When client IDs are configured, `aud` must match one of them.
 * - When none are configured, production refuses (fail closed); other environments
 *   accept so local development keeps working, and the caller logs a warning.
 */
export function checkGoogleAudience(
  aud: string | undefined,
  allowedClientIds: string[],
  isProduction: boolean
): GoogleAudienceCheck {
  if (allowedClientIds.length === 0) {
    return isProduction ? 'not_configured' : 'accepted';
  }
  if (!aud) return 'rejected';
  return allowedClientIds.includes(aud) ? 'accepted' : 'rejected';
}

export interface GoogleVerifiedPayload {
  googleId: string;
  email: string;
  emailVerified: boolean;
  fullName?: string;
  picture?: string;
}

export class GoogleAuthService {
  /**
   * Verifies Google ID token server-side with Google's OAuth2 verification endpoint.
   * Extracts verified subject identifier (sub) and verified email.
   * Does NOT trust client-supplied identity claims.
   */
  public async verifyGoogleToken(idToken: string): Promise<GoogleVerifiedPayload> {
    if (!idToken || typeof idToken !== 'string') {
      throw new AuthenticationError('Google ID token is required');
    }

    const trimmedToken = idToken.trim();

    // Support deterministic testing in mock/test environments
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
      if (trimmedToken.startsWith('test-google-token-') || trimmedToken.startsWith('mock-google-token-')) {
        const suffix = trimmedToken.replace(/^(test|mock)-google-token-/, '');
        return {
          googleId: `google-user-${suffix || 'default'}`,
          email: `${suffix || 'test'}@gmail.com`,
          emailVerified: true,
          fullName: 'Test Google User',
        };
      }
    }

    try {
      const googleUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(trimmedToken)}`;
      const response = await fetch(googleUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        logger.warn({ status: response.status, error: errorText }, '[GoogleAuthService] Google tokeninfo verification rejected');
        throw new AuthenticationError('Invalid or expired Google authentication token. Please sign in again.');
      }

      const data = await response.json() as {
        sub?: string;
        email?: string;
        email_verified?: string | boolean;
        name?: string;
        picture?: string;
        exp?: string | number;
        aud?: string;
        iss?: string;
      };

      if (!data.iss || !GOOGLE_ISSUERS.has(data.iss)) {
        throw new AuthenticationError('Invalid or expired Google authentication token. Please sign in again.');
      }

      const allowedClientIds = parseGoogleClientIds(
        process.env.GOOGLE_OAUTH_CLIENT_IDS ?? config.GOOGLE_OAUTH_CLIENT_IDS
      );
      const isProduction = process.env.NODE_ENV === 'production' || config.NODE_ENV === 'production';
      const audienceCheck = checkGoogleAudience(data.aud, allowedClientIds, isProduction);
      if (audienceCheck === 'not_configured') {
        logger.error('[GoogleAuthService] GOOGLE_OAUTH_CLIENT_IDS is not configured; refusing Google sign-in');
        throw new AppError('Google sign-in is not available right now. Please use your phone number.', 503, 'GOOGLE_SIGN_IN_UNAVAILABLE');
      }
      if (audienceCheck === 'rejected') {
        logger.warn('[GoogleAuthService] Google token audience does not match a configured client ID');
        throw new AuthenticationError('Invalid or expired Google authentication token. Please sign in again.');
      }
      if (allowedClientIds.length === 0) {
        logger.warn('[GoogleAuthService] GOOGLE_OAUTH_CLIENT_IDS is empty; token audience not checked (non-production only)');
      }

      if (!data.sub) {
        throw new AuthenticationError('Google token is missing valid subject identifier');
      }

      if (!data.email) {
        throw new AuthenticationError('Google token does not contain an associated email address');
      }

      const isEmailVerified = data.email_verified === true || data.email_verified === 'true';
      if (!isEmailVerified) {
        throw new AuthenticationError('The Google account email is not verified');
      }

      return {
        googleId: data.sub,
        email: data.email.toLowerCase().trim(),
        emailVerified: true,
        fullName: data.name,
        picture: data.picture,
      };
    } catch (err: any) {
      if (err instanceof AppError) {
        throw err;
      }
      logger.error({ err: err?.message || err }, '[GoogleAuthService] Network or parsing error during Google verification');
      throw new AuthenticationError('Failed to verify Google credentials. Please try again.');
    }
  }
}

export const googleAuthService = new GoogleAuthService();

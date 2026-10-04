import { AuthenticationError } from '../../errors/app-error';
import { logger } from '../../utils/logger';

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
      if (err instanceof AuthenticationError) {
        throw err;
      }
      logger.error({ err: err?.message || err }, '[GoogleAuthService] Network or parsing error during Google verification');
      throw new AuthenticationError('Failed to verify Google credentials. Please try again.');
    }
  }
}

export const googleAuthService = new GoogleAuthService();

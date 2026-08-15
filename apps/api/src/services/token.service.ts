import crypto from 'crypto';
import { prisma } from './prisma.service';
import { AuthenticationError } from '../errors/app-error';

export interface TokenPayload {
  sub: string;
  role: 'USER' | 'ADMIN';
}

export interface GeneratedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export class TokenService {
  /**
   * Generates a cryptographically secure random refresh token string.
   */
  public static generateRawRefreshToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  /**
   * Hashes a raw refresh token using SHA-256 for secure database storage.
   */
  public static hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Helper to parse duration string (e.g. "7d", "15m", "1h") into milliseconds.
   */
  public static parseDurationToMs(durationStr: string): number {
    const unit = durationStr.slice(-1);
    const value = parseInt(durationStr.slice(0, -1), 10);

    if (isNaN(value)) {
      return 7 * 24 * 60 * 60 * 1000; // default 7 days
    }

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Persists a hashed refresh token session into PostgreSQL.
   */
  public static async saveRefreshToken(userId: string, rawRefreshToken: string, durationStr: string = '7d'): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + this.parseDurationToMs(durationStr));

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }

  /**
   * Rotates an existing refresh token: revokes old token and generates new session.
   */
  public static async rotateRefreshToken(
    rawRefreshToken: string,
    refreshDurationStr: string = '7d'
  ): Promise<{ userId: string; newRawRefreshToken: string }> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
      throw new AuthenticationError('Invalid, expired, or revoked refresh token');
    }

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    // Create new token
    const newRawRefreshToken = this.generateRawRefreshToken();
    await this.saveRefreshToken(tokenRecord.userId, newRawRefreshToken, refreshDurationStr);

    return {
      userId: tokenRecord.userId,
      newRawRefreshToken,
    };
  }

  /**
   * Revokes a refresh token session (Logout).
   */
  public static async revokeRefreshToken(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (tokenRecord && !tokenRecord.revokedAt) {
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date() },
      });
    }
  }
}

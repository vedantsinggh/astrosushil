import crypto from 'crypto';
import { prisma } from '../../services/prisma.service';
import { config } from '../../config';
import { VerificationPurpose } from '@prisma/client';

export class OtpService {
  /**
   * Generates a cryptographically secure 6-digit numeric OTP string.
   */
  public generateOtp(): string {
    const min = 100000;
    const max = 999999;
    const otpNum = crypto.randomInt(min, max + 1);
    return otpNum.toString();
  }

  /**
   * Hashes an OTP string securely using SHA-256 for fast, deterministic comparison.
   */
  public hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  /**
   * Checks if input OTP is the development master OTP.
   * STRICT SECURITY GUARANTEE: NEVER returns true in production environment!
   * Production categorically rejects development master OTP even if env var exists.
   */
  public isDevMasterOtp(inputOtp: string): boolean {
    if (process.env.NODE_ENV === 'production' || config.NODE_ENV === 'production') {
      return false;
    }
    const devMasterCode = process.env.DEV_OTP || process.env.DEV_MASTER_OTP || config.DEV_MASTER_OTP || '123456';
    if (!config.ALLOW_DEV_MASTER_OTP && !process.env.DEV_OTP && !process.env.DEV_MASTER_OTP) {
      return false;
    }
    return inputOtp === devMasterCode;
  }

  /**
   * Invalidates any active OTPs for a user and purpose.
   */
  public async invalidatePreviousOtps(userId: string, purpose: VerificationPurpose): Promise<void> {
    await prisma.otpVerification.updateMany({
      where: {
        userId,
        purpose,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });
  }

  /**
   * Checks resend cooldown for user + purpose (60 seconds default).
   * Returns true if within cooldown (should block), false if okay to send.
   */
  public async isWithinResendCooldown(userId: string, purpose: VerificationPurpose, cooldownSeconds: number = 60): Promise<boolean> {
    const recentOtp = await prisma.otpVerification.findFirst({
      where: {
        userId,
        purpose,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!recentOtp) return false;

    const elapsedMs = Date.now() - recentOtp.createdAt.getTime();
    return elapsedMs < cooldownSeconds * 1000;
  }

  /**
   * Creates and stores a hashed OTP record for user + purpose with configurable expiry (default 10 mins).
   */
  public async createOtpRecord(
    userId: string,
    otp: string,
    purpose: VerificationPurpose,
    expiryMinutes: number = 10
  ) {
    // Invalidate existing active OTPs
    await this.invalidatePreviousOtps(userId, purpose);

    const codeHash = this.hashOtp(otp);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    return prisma.otpVerification.create({
      data: {
        userId,
        codeHash,
        purpose,
        expiresAt,
        attempts: 0,
      },
    });
  }

  /**
   * Verifies an OTP input against the user's latest active OTP record.
   * Respects attempt limits (max 5), expiry, purpose matching, and single-use invalidation.
   */
  public async verifyOtp(
    userId: string,
    inputOtp: string,
    purpose: VerificationPurpose
  ): Promise<boolean> {
    const record = await prisma.otpVerification.findFirst({
      where: {
        userId,
        purpose,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!record) {
      return false;
    }

    // Attempt limit check (Max 5 attempts)
    if (record.attempts >= 5) {
      await prisma.otpVerification.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
      return false;
    }

    const isMasterMatch = this.isDevMasterOtp(inputOtp);
    const isHashMatch = this.hashOtp(inputOtp) === record.codeHash;

    if (isMasterMatch || isHashMatch) {
      // Mark OTP as used immediately (single-use)
      await prisma.otpVerification.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
      return true;
    }

    // Increment attempt count on incorrect OTP
    const updatedAttempts = record.attempts + 1;
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: {
        attempts: updatedAttempts,
        usedAt: updatedAttempts >= 5 ? new Date() : null,
      },
    });

    return false;
  }
}

export const otpService = new OtpService();

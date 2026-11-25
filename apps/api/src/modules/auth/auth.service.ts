import { Prisma, VerificationPurpose } from '@prisma/client';
import type { User } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { hashPassword } from '../../utils/hash';
import { normalizePhoneNumber, maskPhoneNumber } from '../../utils/phone';
import { maskEmail } from '../../services/messaging/phone';
import { TokenService } from '../../services/token.service';
import { emailService } from '../../services/email.service';
import { otpService } from './otp.service';
import { otpDeliveryService, otpSendLimiter } from '../../services/messaging/otp-delivery.service';
import { getMissingProfileFields } from './profile-completeness';
import { isAccountBlocked, ACCOUNT_BLOCKED_MESSAGE } from './account-status';
import { logger } from '../../utils/logger';
import { AppError, AuthenticationError, AuthorizationError, ConflictError, NotFoundError, RateLimitError } from '../../errors/app-error';
import {
  PhoneSendOtpInput,
  PhoneVerifyOtpInput,
  EmailSendOtpInput,
  EmailVerifyOtpInput,
  LinkPhoneInput,
  LinkEmailInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  UpdateProfileInput,
  birthProfileInputSchema,
} from './auth.schemas';
import type { z } from 'zod/v3';
import { config } from '../../config';
import { staffAuthAttemptService } from './staff-auth-attempt.service';

/**
 * Customer authentication is by one-time code only (owner decision, 2026-11-24): a code sent to a
 * phone number (SMS + WhatsApp) or to an e-mail address. Customers have no password and no Google
 * sign-in. Staff sign in at `/admin/auth/login` with e-mail and password (admin module) and are the
 * only accounts that can use the password reset in this file. See docs/authentication.md.
 */

export type OtpChannel = 'PHONE' | 'EMAIL';

/** Seconds a sign-in code stays valid, and the wait before another one can be requested. */
const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

/** One answer for every way a code can be wrong: unknown identifier, wrong, expired, used, too many attempts. */
const INVALID_CODE_MESSAGE = 'This code has expired or is invalid. Request a new one.';
const STAFF_SIGN_IN_MESSAGE = 'This is a staff account. Sign in at the admin panel with your e-mail address and password.';
export const PASSWORD_RESET_REQUESTED_MESSAGE =
  'If this address belongs to a staff account, a reset code has been sent to it. Customers sign in with a one-time code and have no password.';

/** The code of a channel is stored on the row that holds the identifier, under this purpose. */
const CHANNEL_PURPOSE: Record<OtpChannel, VerificationPurpose> = {
  PHONE: VerificationPurpose.PHONE_LOGIN,
  EMAIL: VerificationPurpose.EMAIL_VERIFICATION,
};

type BirthProfileInput = z.infer<typeof birthProfileInputSchema>;
type SignJwt = (payload: object) => string;

const maskIdentifier = (channel: OtpChannel, identifier: string): string =>
  channel === 'PHONE' ? maskPhoneNumber(identifier) : maskEmail(identifier);

/**
 * A row that only records "a code was requested for this identifier": created by send-otp for an
 * identifier nobody has, it becomes the account when the code is verified. It has one identifier,
 * unverified, and nothing else, so nobody can ever have had a session on it.
 */
function isPendingRecord(user: User, channel: OtpChannel): boolean {
  const otherIdentifier = channel === 'PHONE' ? user.email : user.phoneNumber;
  return (
    user.role === 'USER' &&
    !user.phoneVerifiedAt &&
    !user.emailVerifiedAt &&
    !user.googleId &&
    !user.passwordHash &&
    !otherIdentifier &&
    !user.fullName
  );
}

export class AuthService {
  private formatUser(user: any) {
    const missingProfileFields = getMissingProfileFields({
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      phoneVerifiedAt: user.phoneVerifiedAt,
    });
    return {
      id: user.id,
      email: user.email || null,
      phoneNumber: user.phoneNumber || null,
      googleId: user.googleId || null,
      fullName: user.fullName || null,
      role: user.role,
      isPhoneVerified: !!user.phoneVerifiedAt,
      isEmailVerified: !!user.emailVerifiedAt,
      emailVerifiedAt: user.emailVerifiedAt ? (user.emailVerifiedAt.toISOString ? user.emailVerifiedAt.toISOString() : user.emailVerifiedAt) : null,
      phoneVerifiedAt: user.phoneVerifiedAt ? (user.phoneVerifiedAt.toISOString ? user.phoneVerifiedAt.toISOString() : user.phoneVerifiedAt) : null,
      createdAt: user.createdAt?.toISOString ? user.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: user.updatedAt?.toISOString ? user.updatedAt.toISOString() : (user.createdAt?.toISOString ? user.createdAt.toISOString() : new Date().toISOString()),
      profileComplete: missingProfileFields.length === 0,
      missingProfileFields,
    };
  }

  /**
   * Refuses a blocked (suspended or deleted) account at the moment a session would be issued.
   *
   * Always called AFTER the caller has proved who they are (valid OTP or refresh token), so only the account's owner can learn that it is blocked: everybody else gets
   * the same "invalid credentials" answer as for an account that does not exist. Reads the
   * database (no cache) and revokes any refresh token the account still holds.
   */
  private async refuseBlockedAccount(userId: string, path: string): Promise<void> {
    if (!(await isAccountBlocked(userId, { fresh: true }))) return;
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    logger.warn({ userId, path }, '[AuthService] Sign-in refused: account is blocked');
    throw new AuthorizationError(ACCOUNT_BLOCKED_MESSAGE);
  }

  /**
   * Staff = an account with a staff role: `User.role` is not USER, or it has a staff profile that
   * has not been removed (a suspended staff account has role USER but is still a staff account).
   */
  private async isStaffAccount(user: Pick<User, 'id' | 'role'>): Promise<boolean> {
    if (user.role !== 'USER') return true;
    const profile = await prisma.staffProfile.findUnique({ where: { userId: user.id }, select: { isDeleted: true } });
    return !!profile && !profile.isDeleted;
  }

  private findByIdentifier(channel: OtpChannel, identifier: string): Promise<User | null> {
    return channel === 'PHONE'
      ? prisma.user.findFirst({ where: { phoneNumber: identifier } })
      : prisma.user.findFirst({ where: { email: identifier } });
  }

  private async issueSession(user: User, signJwt: SignJwt) {
    const accessToken = signJwt({ sub: user.id, role: user.role });
    const refreshToken = TokenService.generateRawRefreshToken();
    await TokenService.saveRefreshToken(user.id, refreshToken, config.JWT_REFRESH_EXPIRES_IN);
    return { accessToken, refreshToken, expiresIn: config.JWT_ACCESS_EXPIRES_IN };
  }

  // =========================================================================
  // CUSTOMER SIGN-IN BY ONE-TIME CODE (PHONE OR E-MAIL)
  // =========================================================================

  /**
   * Sends a sign-in code to a phone number (SMS + WhatsApp) or an e-mail address.
   *
   * The answer is the same whether or not the identifier has an account, whether the account is
   * blocked, and whether it is a staff account: this endpoint is unauthenticated, so any
   * difference would tell whoever types an identifier something about it. Blocked and staff
   * accounts are refused in `verifySignInOtp`, once the caller has proved they hold the identifier.
   *
   * Sends are limited per identifier and per IP address (`context.ip`) in a counter that a new
   * request cannot reset, plus a 60-second cooldown per identifier.
   *
   * An identifier nobody has gets a pending record (see `isPendingRecord`) to hold the code; it is
   * not an account until the code is verified.
   */
  private async sendSignInOtp(channel: OtpChannel, identifier: string, context: { ip?: string | null }) {
    const purpose = CHANNEL_PURPOSE[channel];
    const masked = maskIdentifier(channel, identifier);

    // Send rate limit, before anything is created or sent.
    const allowance = await otpSendLimiter.consume({ identifier, ip: context.ip });
    if (!allowance.allowed) {
      logger.warn({ channel, to: masked, scope: allowance.scope, window: allowance.window }, '[AuthService] OTP send limit reached');
      throw new RateLimitError('Too many verification code requests. Please try again later.');
    }

    let user = await this.findByIdentifier(channel, identifier);
    if (!user) {
      try {
        user = await prisma.user.create({
          data: channel === 'PHONE' ? { phoneNumber: identifier, role: 'USER' } : { email: identifier, role: 'USER' },
        });
      } catch (err) {
        // Two requests for the same new identifier at once: the other one created the record.
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
        user = await this.findByIdentifier(channel, identifier);
        if (!user) throw err;
      }
    }

    if (await otpService.isWithinResendCooldown(user.id, purpose, OTP_RESEND_COOLDOWN_SECONDS)) {
      // Nothing is sent, so this request does not count towards the send limit.
      await otpSendLimiter.release(allowance);
      throw new RateLimitError('Please wait 60 seconds before requesting another verification code.');
    }

    // Only the hash is stored; the code itself is never logged.
    const otp = otpService.generateOtp();
    await otpService.createOtpRecord(user.id, otp, purpose, OTP_EXPIRY_MINUTES);

    let delivered: boolean;
    if (channel === 'PHONE') {
      // The website's DLT texts: "signup" until the number has been verified once, "login" afterwards.
      const delivery = await otpDeliveryService.sendPhoneOtp({
        phone: identifier,
        otp,
        purpose: user.phoneVerifiedAt ? 'login' : 'signup',
        name: user.fullName?.trim().split(/\s+/)[0] || null,
      });
      delivered = delivery.delivered;
    } else {
      const delivery = await otpDeliveryService.sendEmailOtp({ email: identifier, otp, expiryMinutes: OTP_EXPIRY_MINUTES });
      delivered = delivery.ok;
    }

    if (!delivered) {
      if (!otpService.isDevMasterOtpEnabled()) {
        // The code reached nobody: do not leave it valid, and say so instead of "sent".
        await otpService.invalidatePreviousOtps(user.id, purpose);
        throw new AppError('We could not send the verification code. Please try again shortly.', 503, 'OTP_DELIVERY_FAILED');
      }
      logger.warn(
        { userId: user.id, channel, to: masked },
        '[AuthService] OTP was not delivered; continuing because the development master OTP is enabled'
      );
    }

    logger.info({ userId: user.id, channel, to: masked }, '[AuthService] Sign-in OTP generated and dispatched');
  }

  /**
   * Verifies a sign-in code and returns a session. The first verified code of an identifier turns
   * its pending record into the account (`isNewAccount: true`).
   *
   * The account reached is the one that holds the identifier, whatever it was created with: an old
   * password or Google account is reached through its e-mail address, and through its phone number
   * if it has one. `passwordHash` and `googleId` are neither read nor changed.
   */
  private async verifySignInOtp(
    channel: OtpChannel,
    identifier: string,
    input: { otp: string; fullName?: string; birthProfile?: BirthProfileInput },
    signJwt: SignJwt
  ) {
    const user = await this.findByIdentifier(channel, identifier);
    if (!user) {
      throw new AuthenticationError(INVALID_CODE_MESSAGE);
    }

    const isValid = await otpService.verifyOtp(user.id, input.otp, CHANNEL_PURPOSE[channel]);
    if (!isValid) {
      throw new AuthenticationError(INVALID_CODE_MESSAGE);
    }

    // Only after a valid code: a wrong code gets the same answer whatever the account is.
    await this.refuseBlockedAccount(user.id, channel === 'PHONE' ? 'phone-otp' : 'email-otp');

    // Staff sign in with e-mail and password only; a code must never be a way into the admin panel.
    if (await this.isStaffAccount(user)) {
      logger.warn({ userId: user.id, channel }, '[AuthService] OTP sign-in refused: staff account');
      throw new AuthorizationError(STAFF_SIGN_IN_MESSAGE);
    }

    const isNewAccount = !user.phoneVerifiedAt && !user.emailVerifiedAt && !user.googleId;
    const now = new Date();
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(channel === 'PHONE'
          ? { phoneVerifiedAt: user.phoneVerifiedAt ?? now }
          : { emailVerifiedAt: user.emailVerifiedAt ?? now }),
        // A name is only taken when the account has none.
        ...(input.fullName && !user.fullName?.trim() ? { fullName: input.fullName } : {}),
      },
    });

    // Optionally create the first birth profile
    if (input.birthProfile) {
      const existingProfile = await prisma.birthProfile.findFirst({ where: { userId: user.id } });
      if (!existingProfile) {
        await prisma.birthProfile.create({
          data: {
            userId: user.id,
            name: input.birthProfile.name,
            dateOfBirth: input.birthProfile.dateOfBirth,
            timeOfBirth: input.birthProfile.timeOfBirth,
            latitude: input.birthProfile.latitude,
            longitude: input.birthProfile.longitude,
            timezone: input.birthProfile.timezone,
            placeName: input.birthProfile.placeName || null,
          },
        });
      }
    }

    if (isNewAccount) {
      logger.info({ userId: user.id, channel }, '[AuthService] Customer account created by first OTP verification');
    }

    return {
      user: this.formatUser(updatedUser),
      tokens: await this.issueSession(updatedUser, signJwt),
      isNewAccount,
    };
  }

  /** POST /auth/phone/send-otp */
  public async sendPhoneOtp(input: PhoneSendOtpInput, context: { ip?: string | null } = {}) {
    const phoneNumber = normalizePhoneNumber(input.phoneNumber);
    await this.sendSignInOtp('PHONE', phoneNumber, context);
    return {
      success: true,
      message: 'Verification code sent to your phone number.',
      phoneNumber,
      expiresIn: OTP_EXPIRY_MINUTES * 60,
    };
  }

  /** POST /auth/phone/verify-otp */
  public async verifyPhoneOtp(input: PhoneVerifyOtpInput, signJwt: SignJwt) {
    return this.verifySignInOtp('PHONE', normalizePhoneNumber(input.phoneNumber), input, signJwt);
  }

  /** POST /auth/email/send-otp */
  public async sendEmailOtp(input: EmailSendOtpInput, context: { ip?: string | null } = {}) {
    const email = input.email.toLowerCase().trim();
    await this.sendSignInOtp('EMAIL', email, context);
    return {
      success: true,
      message: 'Verification code sent to your e-mail address.',
      email,
      expiresIn: OTP_EXPIRY_MINUTES * 60,
    };
  }

  /** POST /auth/email/verify-otp */
  public async verifyEmailOtp(input: EmailVerifyOtpInput, signJwt: SignJwt) {
    return this.verifySignInOtp('EMAIL', input.email.toLowerCase().trim(), input, signJwt);
  }

  // =========================================================================
  // ACCOUNT LINKING (SIGNED-IN CUSTOMER ADDS THE OTHER IDENTIFIER)
  // =========================================================================

  /**
   * Adds a phone number or an e-mail address to the signed-in customer's account, proved by a code
   * requested through the same send-otp endpoint as a sign-in (the code is stored against the
   * identifier, so it proves that identifier and nothing else).
   *
   * Two existing accounts are never merged. After a valid code:
   *  - the identifier is already on this account: it is marked verified;
   *  - it is held only by a pending record (a code was requested, nobody ever signed in): the
   *    pending record is removed and the identifier moves to this account;
   *  - it is on any other account, verified or not: 409, nothing changes.
   */
  private async linkIdentifier(userId: string, channel: OtpChannel, identifier: string, otp: string) {
    const current = await prisma.user.findUnique({ where: { id: userId } });
    if (!current) {
      throw new NotFoundError('User account not found');
    }
    if (await this.isStaffAccount(current)) {
      throw new AuthorizationError('Staff accounts manage their contact details in the admin panel.');
    }

    const holder = await this.findByIdentifier(channel, identifier);
    const isValid = holder ? await otpService.verifyOtp(holder.id, otp, CHANNEL_PURPOSE[channel]) : false;
    if (!holder || !isValid) {
      throw new AuthenticationError(INVALID_CODE_MESSAGE);
    }

    const now = new Date();
    const data =
      channel === 'PHONE'
        ? { phoneNumber: identifier, phoneVerifiedAt: holder.id === userId ? (current.phoneVerifiedAt ?? now) : now }
        : { email: identifier, emailVerifiedAt: holder.id === userId ? (current.emailVerifiedAt ?? now) : now };

    let updatedUser: User;
    if (holder.id === userId) {
      updatedUser = await prisma.user.update({ where: { id: userId }, data });
    } else {
      const conflict = new ConflictError(
        channel === 'PHONE'
          ? 'This phone number already belongs to another account. Sign in with that number instead, or contact support to combine the accounts.'
          : 'This e-mail address already belongs to another account. Sign in with that address instead, or contact support to combine the accounts.'
      );
      if (!isPendingRecord(holder, channel)) {
        logger.warn({ userId, otherUserId: holder.id, channel }, '[AuthService] Link refused: identifier belongs to another account');
        throw conflict;
      }
      try {
        // The pending record goes first: the identifier is unique.
        const [, linked] = await prisma.$transaction([
          prisma.user.delete({ where: { id: holder.id } }),
          prisma.user.update({ where: { id: userId }, data }),
        ]);
        updatedUser = linked;
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          // The record gained data or the identifier was taken in the meantime: treat as another account.
          logger.warn({ userId, channel, code: err.code }, '[AuthService] Link refused: pending record could not be replaced');
          throw conflict;
        }
        throw err;
      }
    }

    logger.info({ userId, channel, to: maskIdentifier(channel, identifier) }, '[AuthService] Identifier linked to account');
    return updatedUser;
  }

  /** POST /auth/link-phone */
  public async linkPhone(userId: string, input: LinkPhoneInput) {
    const user = await this.linkIdentifier(userId, 'PHONE', normalizePhoneNumber(input.phoneNumber), input.otp);
    return { success: true, message: 'Phone number linked successfully.', user: this.formatUser(user) };
  }

  /** POST /auth/link-email */
  public async linkEmail(userId: string, input: LinkEmailInput) {
    const user = await this.linkIdentifier(userId, 'EMAIL', input.email.toLowerCase().trim(), input.otp);
    return { success: true, message: 'E-mail address linked successfully.', user: this.formatUser(user) };
  }

  // =========================================================================
  // STAFF PASSWORD RESET BY E-MAILED CODE
  // =========================================================================

  /**
   * Staff accounts only. The answer is the same for a staff address, a customer address and an
   * address nobody has, and nothing is sent to the last two.
   */
  public async forgotPassword(input: ForgotPasswordInput) {
    const email = input.email.toLowerCase().trim();
    const user = await prisma.user.findFirst({ where: { email } });

    if (user && (await this.isStaffAccount(user))) {
      if (await staffAuthAttemptService.isLocked('PASSWORD_RESET', email)) {
        return { message: PASSWORD_RESET_REQUESTED_MESSAGE };
      }
      const isInCooldown = await otpService.isWithinResendCooldown(user.id, VerificationPurpose.PASSWORD_RESET);
      if (!isInCooldown) {
        const otp = otpService.generateOtp();
        await otpService.createOtpRecord(user.id, otp, VerificationPurpose.PASSWORD_RESET);
        await emailService.sendPasswordResetEmail(email, otp);
      }
    }

    return { message: PASSWORD_RESET_REQUESTED_MESSAGE };
  }

  /**
   * Staff accounts only. A customer address or an unknown address gets the answer of a wrong code,
   * and no password is ever stored on a customer account.
   */
  public async resetPassword(input: ResetPasswordInput) {
    const email = input.email.toLowerCase().trim();
    const user = await prisma.user.findFirst({ where: { email } });

    if (!user || !(await this.isStaffAccount(user))) {
      throw new AuthenticationError(INVALID_CODE_MESSAGE);
    }

    if (await staffAuthAttemptService.isLocked('PASSWORD_RESET', email)) {
      throw new AuthenticationError(INVALID_CODE_MESSAGE);
    }

    const isValid = await otpService.verifyOtp(user.id, input.otp, VerificationPurpose.PASSWORD_RESET);
    if (!isValid) {
      await staffAuthAttemptService.recordFailure('PASSWORD_RESET', email);
      throw new AuthenticationError(INVALID_CODE_MESSAGE);
    }

    await staffAuthAttemptService.clear('PASSWORD_RESET', email);

    const passwordHash = await hashPassword(input.newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { revokedAt: new Date() },
    });

    return { message: 'Password has been reset successfully. Please sign in with your new password.' };
  }

  public async refresh(rawRefreshToken: string, signJwt: (payload: object) => string) {
    const { userId, newRawRefreshToken } = await TokenService.rotateRefreshToken(
      rawRefreshToken,
      config.JWT_REFRESH_EXPIRES_IN
    );

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AuthenticationError('Associated user account no longer exists');
    }

    // Blocking revokes refresh tokens, so this is the second line of defence (a token issued
    // by a path that did not revoke, or a block recorded by another route). It also revokes
    // the token that the rotation above has just issued.
    await this.refuseBlockedAccount(user.id, 'refresh');

    const accessToken = signJwt({ sub: user.id, role: user.role });

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      tokens: {
        accessToken,
        refreshToken: newRawRefreshToken,
        expiresIn: config.JWT_ACCESS_EXPIRES_IN,
      },
    };
  }

  public async logout(rawRefreshToken: string): Promise<void> {
    await TokenService.revokeRefreshToken(rawRefreshToken);
  }

  public async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    return this.formatUser(user);
  }

  /**
   * Updates the authenticated user's own basic profile details (currently the full name).
   * Phone numbers are not accepted here: they must be verified through
   * POST /auth/phone/send-otp followed by POST /auth/link-phone.
   */
  public async updateProfile(userId: string, input: UpdateProfileInput) {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new NotFoundError('User profile not found');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { fullName: input.fullName },
    });

    return this.formatUser(updatedUser);
  }
}

export const authService = new AuthService();

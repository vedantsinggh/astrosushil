import { prisma } from '../../services/prisma.service';
import { hashPassword, verifyPassword } from '../../utils/hash';
import { normalizePhoneNumber, maskPhoneNumber } from '../../utils/phone';
import { TokenService } from '../../services/token.service';
import { emailService } from '../../services/email.service';
import { otpService } from './otp.service';
import { googleAuthService } from './google-auth.service';
import { logger } from '../../utils/logger';
import { AuthenticationError, ConflictError, NotFoundError, RateLimitError } from '../../errors/app-error';
import {
  PhoneSendOtpInput,
  PhoneVerifyOtpInput,
  GoogleAuthInput,
  LinkPhoneInput,
  LinkGoogleInput,
  RegisterInput,
  LoginInput,
  VerifyEmailInput,
  ResendVerificationInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.schemas';
import { config } from '../../config';
import { VerificationPurpose } from '@prisma/client';

export class AuthService {
  private formatUser(user: any) {
    return {
      id: user.id,
      email: user.email || null,
      phoneNumber: user.phoneNumber || null,
      googleId: user.googleId || null,
      fullName: user.fullName || null,
      role: user.role,
      isPhoneVerified: !!user.phoneVerifiedAt,
      emailVerifiedAt: user.emailVerifiedAt ? (user.emailVerifiedAt.toISOString ? user.emailVerifiedAt.toISOString() : user.emailVerifiedAt) : null,
      phoneVerifiedAt: user.phoneVerifiedAt ? (user.phoneVerifiedAt.toISOString ? user.phoneVerifiedAt.toISOString() : user.phoneVerifiedAt) : null,
      createdAt: user.createdAt?.toISOString ? user.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: user.updatedAt?.toISOString ? user.updatedAt.toISOString() : (user.createdAt?.toISOString ? user.createdAt.toISOString() : new Date().toISOString()),
    };
  }

  // =========================================================================
  // PHONE NUMBER + OTP AUTHENTICATION
  // =========================================================================

  /**
   * Requests an OTP verification code for a phone number.
   * Normalizes to canonical E.164 and creates/retrieves user record without exposing secret OTP.
   */
  public async sendPhoneOtp(input: PhoneSendOtpInput) {
    const normalizedPhone = normalizePhoneNumber(input.phoneNumber);

    // Find or create user record associated with normalized phone number
    let user = await prisma.user.findFirst({
      where: { phoneNumber: normalizedPhone },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phoneNumber: normalizedPhone,
          role: 'USER',
        },
      });
    }

    // Rate limiting: check 60s resend cooldown
    const isInCooldown = await otpService.isWithinResendCooldown(
      user.id,
      VerificationPurpose.PHONE_LOGIN,
      60
    );

    if (isInCooldown) {
      throw new RateLimitError('Please wait 60 seconds before requesting another verification code.');
    }

    // Generate secure 6-digit OTP and store hashed record
    const otp = otpService.generateOtp();
    await otpService.createOtpRecord(user.id, otp, VerificationPurpose.PHONE_LOGIN, 10);

    // Structured logging with phone number masked for privacy
    logger.info(
      { userId: user.id, phone: maskPhoneNumber(normalizedPhone) },
      '[AuthService] Phone login OTP generated and dispatched'
    );

    return {
      success: true,
      message: 'Verification code sent to your phone number.',
      phoneNumber: normalizedPhone,
      expiresIn: 600,
    };
  }

  /**
   * Verifies phone OTP code and returns authenticated session tokens.
   */
  public async verifyPhoneOtp(input: PhoneVerifyOtpInput, signJwt: (payload: object) => string) {
    const normalizedPhone = normalizePhoneNumber(input.phoneNumber);

    const user = await prisma.user.findFirst({
      where: { phoneNumber: normalizedPhone },
    });

    if (!user) {
      throw new AuthenticationError('Invalid phone number or verification code.');
    }

    const isValid = await otpService.verifyOtp(
      user.id,
      input.otp,
      VerificationPurpose.PHONE_LOGIN
    );

    if (!isValid) {
      throw new AuthenticationError('This code has expired or is invalid. Request a new one.');
    }

    // Mark phone number as verified
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { phoneVerifiedAt: new Date() },
    });

    // Optionally create birth profile if provided
    if (input.birthProfile) {
      const existingProfile = await prisma.birthProfile.findFirst({
        where: { userId: user.id },
      });
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

    // Issue standard JWT session tokens
    const accessToken = signJwt({ sub: updatedUser.id, role: updatedUser.role });
    const refreshToken = TokenService.generateRawRefreshToken();
    await TokenService.saveRefreshToken(updatedUser.id, refreshToken, config.JWT_REFRESH_EXPIRES_IN);

    return {
      user: this.formatUser(updatedUser),
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: config.JWT_ACCESS_EXPIRES_IN,
      },
    };
  }

  // =========================================================================
  // GOOGLE SIGN-IN AUTHENTICATION
  // =========================================================================

  /**
   * Authenticates user with verified Google ID token.
   * Resolves existing user or creates new user, linking accounts safely.
   */
  public async googleAuth(input: GoogleAuthInput, signJwt: (payload: object) => string) {
    const verifiedGoogle = await googleAuthService.verifyGoogleToken(input.idToken);

    // 1. Check if user already exists with this Google subject identifier
    let user = await prisma.user.findFirst({
      where: { googleId: verifiedGoogle.googleId },
    });

    // 2. If not found by googleId, check if user exists with matching verified email
    if (!user && verifiedGoogle.email) {
      user = await prisma.user.findFirst({
        where: { email: verifiedGoogle.email },
      });

      if (user) {
        // Link Google ID to existing account without duplicating user
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: verifiedGoogle.googleId,
            fullName: user.fullName || verifiedGoogle.fullName,
            emailVerifiedAt: user.emailVerifiedAt || new Date(),
          },
        });
        logger.info(
          { userId: user.id, email: verifiedGoogle.email },
          '[AuthService] Linked Google ID to existing account'
        );
      }
    }

    // 3. If user does not exist, create new account
    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: verifiedGoogle.googleId,
          email: verifiedGoogle.email,
          fullName: verifiedGoogle.fullName,
          emailVerifiedAt: new Date(),
          role: 'USER',
        },
      });
      logger.info(
        { userId: user.id, email: verifiedGoogle.email },
        '[AuthService] Created new user via Google Sign-In'
      );
    }

    // Optionally create birth profile if provided and user has none
    if (input.birthProfile) {
      const existingProfile = await prisma.birthProfile.findFirst({
        where: { userId: user.id },
      });
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

    // Issue standard JWT session tokens
    const accessToken = signJwt({ sub: user.id, role: user.role });
    const refreshToken = TokenService.generateRawRefreshToken();
    await TokenService.saveRefreshToken(user.id, refreshToken, config.JWT_REFRESH_EXPIRES_IN);

    return {
      user: this.formatUser(user),
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: config.JWT_ACCESS_EXPIRES_IN,
      },
    };
  }

  // =========================================================================
  // ACCOUNT LINKING
  // =========================================================================

  /**
   * Links a verified phone number to an existing authenticated user account.
   */
  public async linkPhone(userId: string, input: LinkPhoneInput) {
    const normalizedPhone = normalizePhoneNumber(input.phoneNumber);

    // Check if another account already has this phone number verified
    const existing = await prisma.user.findFirst({
      where: { phoneNumber: normalizedPhone },
    });

    // Verify OTP code for this phone / user
    const isValid =
      (existing && (await otpService.verifyOtp(existing.id, input.otp, VerificationPurpose.PHONE_VERIFICATION))) ||
      (existing && (await otpService.verifyOtp(existing.id, input.otp, VerificationPurpose.PHONE_LOGIN))) ||
      (await otpService.verifyOtp(userId, input.otp, VerificationPurpose.PHONE_VERIFICATION)) ||
      (await otpService.verifyOtp(normalizedPhone, input.otp, VerificationPurpose.PHONE_VERIFICATION));

    if (!isValid) {
      throw new AuthenticationError('This code has expired or is invalid. Request a new one.');
    }

    if (existing && existing.id !== userId) {
      if (existing.phoneVerifiedAt != null) {
        throw new ConflictError('This phone number is already verified on another account.');
      }
      // If unverified stub account, remove stub so it can be linked safely
      await prisma.user.delete({ where: { id: existing.id } });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        phoneNumber: normalizedPhone,
        phoneVerifiedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Phone number linked successfully.',
      user: this.formatUser(updatedUser),
    };
  }

  /**
   * Links Google account to an existing authenticated user account.
   */
  public async linkGoogle(userId: string, input: LinkGoogleInput) {
    const verifiedGoogle = await googleAuthService.verifyGoogleToken(input.idToken);

    // Check if another account is already linked to this Google ID
    const existing = await prisma.user.findFirst({
      where: { googleId: verifiedGoogle.googleId },
    });

    if (existing && existing.id !== userId) {
      throw new ConflictError('This Google account is already linked to another user.');
    }

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) {
      throw new NotFoundError('User account not found');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        googleId: verifiedGoogle.googleId,
        email: currentUser.email || verifiedGoogle.email,
        emailVerifiedAt: currentUser.emailVerifiedAt || new Date(),
      },
    });

    return {
      success: true,
      message: 'Google account linked successfully.',
      user: this.formatUser(updatedUser),
    };
  }

  // =========================================================================
  // LEGACY EMAIL / PASSWORD AUTH (PRESERVED FOR BACKWARD COMPATIBILITY)
  // =========================================================================

  public async register(input: RegisterInput) {
    const email = input.email.toLowerCase().trim();
    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.emailVerifiedAt != null) {
        throw new ConflictError('A user with this email address already exists');
      }

      const passwordHash = await hashPassword(input.password);
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash,
          fullName: input.fullName || existingUser.fullName,
          phoneNumber: input.phoneNumber ? normalizePhoneNumber(input.phoneNumber) : existingUser.phoneNumber,
        },
      });

      const otp = otpService.generateOtp();
      await otpService.createOtpRecord(existingUser.id, otp, VerificationPurpose.EMAIL_VERIFICATION);
      await emailService.sendVerificationEmail(existingUser.email!, otp);

      return {
        requiresEmailVerification: true,
        email: existingUser.email,
        message: 'Verification code sent to your email.',
      };
    }

    const passwordHash = await hashPassword(input.password);

    const { user, otp } = await prisma.$transaction(async (tx) => {
      const userData: Record<string, any> = {
        email,
        passwordHash,
        role: 'USER',
      };
      if (input.fullName) userData.fullName = input.fullName;
      if (input.phoneNumber) userData.phoneNumber = normalizePhoneNumber(input.phoneNumber);
      userData.emailVerifiedAt = null;

      const newUser = await tx.user.create({ data: userData as any });

      if (input.birthProfile) {
        await tx.birthProfile.create({
          data: {
            userId: newUser.id,
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

      const generatedOtp = otpService.generateOtp();
      const codeHash = otpService.hashOtp(generatedOtp);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await tx.otpVerification.create({
        data: {
          userId: newUser.id,
          codeHash,
          purpose: VerificationPurpose.EMAIL_VERIFICATION,
          expiresAt,
          attempts: 0,
        },
      });

      return { user: newUser, otp: generatedOtp };
    });

    await emailService.sendVerificationEmail(user.email!, otp);

    return {
      requiresEmailVerification: true,
      email: user.email,
      message: 'Account created. Verification code sent to your email.',
    };
  }

  public async verifyEmail(input: VerifyEmailInput, signJwt: (payload: object) => string) {
    const email = input.email.toLowerCase().trim();
    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      throw new AuthenticationError('Invalid email address or verification code.');
    }

    if (user.emailVerifiedAt != null) {
      const accessToken = signJwt({ sub: user.id, role: user.role });
      const refreshToken = TokenService.generateRawRefreshToken();
      await TokenService.saveRefreshToken(user.id, refreshToken, config.JWT_REFRESH_EXPIRES_IN);

      return {
        verified: true,
        user: this.formatUser(user),
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: config.JWT_ACCESS_EXPIRES_IN,
        },
      };
    }

    const isValid = await otpService.verifyOtp(user.id, input.otp, VerificationPurpose.EMAIL_VERIFICATION);
    if (!isValid) {
      throw new AuthenticationError('This code has expired or is invalid. Request a new one.');
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    });

    const accessToken = signJwt({ sub: updatedUser.id, role: updatedUser.role });
    const refreshToken = TokenService.generateRawRefreshToken();
    await TokenService.saveRefreshToken(updatedUser.id, refreshToken, config.JWT_REFRESH_EXPIRES_IN);

    return {
      verified: true,
      user: this.formatUser(updatedUser),
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: config.JWT_ACCESS_EXPIRES_IN,
      },
    };
  }

  public async login(input: LoginInput, signJwt: (payload: object) => string) {
    const email = input.email.toLowerCase().trim();
    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      throw new AuthenticationError('Invalid email address or password');
    }

    const isValidPassword = await verifyPassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid email address or password');
    }

    if (user.emailVerifiedAt == null) {
      const isInCooldown = await otpService.isWithinResendCooldown(user.id, VerificationPurpose.EMAIL_VERIFICATION);
      if (!isInCooldown) {
        const otp = otpService.generateOtp();
        await otpService.createOtpRecord(user.id, otp, VerificationPurpose.EMAIL_VERIFICATION);
        await emailService.sendVerificationEmail(user.email!, otp);
      }

      return {
        requiresEmailVerification: true,
        email: user.email,
        message: 'Please verify your email address before logging in.',
      };
    }

    const accessToken = signJwt({ sub: user.id, role: user.role });
    const refreshToken = TokenService.generateRawRefreshToken();
    await TokenService.saveRefreshToken(user.id, refreshToken, config.JWT_REFRESH_EXPIRES_IN);

    return {
      user: this.formatUser(user),
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: config.JWT_ACCESS_EXPIRES_IN,
      },
    };
  }

  public async resendVerification(input: ResendVerificationInput) {
    const email = input.email.toLowerCase().trim();
    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user || user.emailVerifiedAt != null) {
      return { message: 'If an account exists and requires verification, a new code has been sent.' };
    }

    const isInCooldown = await otpService.isWithinResendCooldown(user.id, VerificationPurpose.EMAIL_VERIFICATION);
    if (isInCooldown) {
      throw new RateLimitError('Please wait 60 seconds before requesting another code.');
    }

    const otp = otpService.generateOtp();
    await otpService.createOtpRecord(user.id, otp, VerificationPurpose.EMAIL_VERIFICATION);
    await emailService.sendVerificationEmail(user.email!, otp);

    return { message: 'Verification code sent to your email.' };
  }

  public async forgotPassword(input: ForgotPasswordInput) {
    const email = input.email.toLowerCase().trim();
    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      return { message: 'If an account exists for this email, you\'ll receive a reset code shortly.' };
    }

    const isInCooldown = await otpService.isWithinResendCooldown(user.id, VerificationPurpose.PASSWORD_RESET);
    if (!isInCooldown) {
      const otp = otpService.generateOtp();
      await otpService.createOtpRecord(user.id, otp, VerificationPurpose.PASSWORD_RESET);
      await emailService.sendPasswordResetEmail(user.email!, otp);
    }

    return { message: 'If an account exists for this email, you\'ll receive a reset code shortly.' };
  }

  public async resetPassword(input: ResetPasswordInput) {
    const email = input.email.toLowerCase().trim();
    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      throw new AuthenticationError('Invalid request or code expired.');
    }

    const isValid = await otpService.verifyOtp(user.id, input.otp, VerificationPurpose.PASSWORD_RESET);
    if (!isValid) {
      throw new AuthenticationError('This code has expired or is invalid. Request a new one.');
    }

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
}

export const authService = new AuthService();

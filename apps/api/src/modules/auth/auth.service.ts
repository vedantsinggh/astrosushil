import { prisma } from '../../services/prisma.service';
import { hashPassword, verifyPassword } from '../../utils/hash';
import { TokenService } from '../../services/token.service';
import { emailService } from '../../services/email.service';
import { otpService } from './otp.service';
import { AuthenticationError, ConflictError, NotFoundError, RateLimitError } from '../../errors/app-error';
import {
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
  /**
   * Registers a new user with email, password, and optional birth profile.
   * Sends an email verification OTP upon creation.
   */
  public async register(input: RegisterInput) {
    const email = input.email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.emailVerifiedAt != null) {
        throw new ConflictError('A user with this email address already exists');
      }

      // Existing unverified account: update credentials & send new OTP
      const passwordHash = await hashPassword(input.password);
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash,
          fullName: input.fullName || existingUser.fullName,
          phoneNumber: input.phoneNumber || existingUser.phoneNumber,
        },
      });

      const otp = otpService.generateOtp();
      await otpService.createOtpRecord(existingUser.id, otp, VerificationPurpose.EMAIL_VERIFICATION);
      await emailService.sendVerificationEmail(existingUser.email, otp);

      return {
        requiresEmailVerification: true,
        email: existingUser.email,
        message: 'Verification code sent to your email.',
      };
    }

    const passwordHash = await hashPassword(input.password);

    // Create User, BirthProfile, and OTP in a database transaction
    const { user, otp } = await prisma.$transaction(async (tx) => {
      const userData: Record<string, any> = {
        email,
        passwordHash,
        role: 'USER',
      };
      if (input.fullName) userData.fullName = input.fullName;
      if (input.phoneNumber) userData.phoneNumber = input.phoneNumber;
      userData.emailVerifiedAt = null;

      let newUser: any;
      try {
        newUser = await tx.user.create({ data: userData as any });
      } catch (err: any) {
        if (err?.message?.includes('Unknown argument')) {
          delete userData.fullName;
          delete userData.phoneNumber;
          delete userData.emailVerifiedAt;
          newUser = await tx.user.create({ data: userData as any });
        } else {
          throw err;
        }
      }

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

      if ((tx as any).otpVerification) {
        const codeHash = otpService.hashOtp(generatedOtp);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await (tx as any).otpVerification.create({
          data: {
            userId: newUser.id,
            codeHash,
            purpose: VerificationPurpose.EMAIL_VERIFICATION,
            expiresAt,
            attempts: 0,
          },
        });
      }

      return { user: newUser, otp: generatedOtp };
    });

    // Send verification email
    await emailService.sendVerificationEmail(user.email, otp);

    return {
      requiresEmailVerification: true,
      email: user.email,
      message: 'Account created. Verification code sent to your email.',
    };
  }

  /**
   * Verifies email OTP and returns authenticated session upon success.
   */
  public async verifyEmail(input: VerifyEmailInput, signJwt: (payload: object) => string) {
    const email = input.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AuthenticationError('Invalid email address or verification code.');
    }

    if (user.emailVerifiedAt != null) {
      // Already verified: issue session
      const accessToken = signJwt({ sub: user.id, role: user.role });
      const refreshToken = TokenService.generateRawRefreshToken();
      await TokenService.saveRefreshToken(user.id, refreshToken, config.JWT_REFRESH_EXPIRES_IN);

      return {
        verified: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
        },
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

    // Mark email as verified
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    });

    // Issue authenticated session tokens
    const accessToken = signJwt({ sub: user.id, role: user.role });
    const refreshToken = TokenService.generateRawRefreshToken();
    await TokenService.saveRefreshToken(user.id, refreshToken, config.JWT_REFRESH_EXPIRES_IN);

    return {
      verified: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: config.JWT_ACCESS_EXPIRES_IN,
      },
    };
  }

  /**
   * Authenticates user with email and password.
   * If email is unverified, triggers verification OTP and returns requiresEmailVerification state.
   */
  public async login(input: LoginInput, signJwt: (payload: object) => string) {
    const email = input.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AuthenticationError('Invalid email address or password');
    }

    const isValidPassword = await verifyPassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid email address or password');
    }

    // Check if email is verified
    if (user.emailVerifiedAt == null) {
      const isInCooldown = await otpService.isWithinResendCooldown(user.id, VerificationPurpose.EMAIL_VERIFICATION);
      if (!isInCooldown) {
        const otp = otpService.generateOtp();
        await otpService.createOtpRecord(user.id, otp, VerificationPurpose.EMAIL_VERIFICATION);
        await emailService.sendVerificationEmail(user.email, otp);
      }

      return {
        requiresEmailVerification: true,
        email: user.email,
        message: 'Please verify your email address before logging in.',
      };
    }

    // Issue session tokens for verified user
    const accessToken = signJwt({ sub: user.id, role: user.role });
    const refreshToken = TokenService.generateRawRefreshToken();
    await TokenService.saveRefreshToken(user.id, refreshToken, config.JWT_REFRESH_EXPIRES_IN);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: config.JWT_ACCESS_EXPIRES_IN,
      },
    };
  }

  /**
   * Resends verification OTP to user.
   */
  public async resendVerification(input: ResendVerificationInput) {
    const email = input.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
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
    await emailService.sendVerificationEmail(user.email, otp);

    return { message: 'Verification code sent to your email.' };
  }

  /**
   * Sends password reset OTP to user.
   */
  public async forgotPassword(input: ForgotPasswordInput) {
    const email = input.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { message: 'If an account exists for this email, you\'ll receive a reset code shortly.' };
    }

    const isInCooldown = await otpService.isWithinResendCooldown(user.id, VerificationPurpose.PASSWORD_RESET);
    if (!isInCooldown) {
      const otp = otpService.generateOtp();
      await otpService.createOtpRecord(user.id, otp, VerificationPurpose.PASSWORD_RESET);
      await emailService.sendPasswordResetEmail(user.email, otp);
    }

    return { message: 'If an account exists for this email, you\'ll receive a reset code shortly.' };
  }

  /**
   * Resets user password using reset OTP.
   */
  public async resetPassword(input: ResetPasswordInput) {
    const email = input.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
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

    // Revoke existing refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { revokedAt: new Date() },
    });

    return { message: 'Password has been reset successfully. Please sign in with your new password.' };
  }

  /**
   * Refreshes access token using a valid refresh token.
   */
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

  /**
   * Logs out user by revoking the refresh token.
   */
  public async logout(rawRefreshToken: string): Promise<void> {
    await TokenService.revokeRefreshToken(rawRefreshToken);
  }

  /**
   * Retrieves profile for authenticated user.
   */
  public async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        emailVerifiedAt: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}

export const authService = new AuthService();

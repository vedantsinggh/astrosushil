import { prisma } from '../../services/prisma.service';
import { hashPassword, verifyPassword } from '../../utils/hash';
import { TokenService } from '../../services/token.service';
import { AuthenticationError, ConflictError, NotFoundError } from '../../errors/app-error';
import { RegisterInput, LoginInput } from './auth.schemas';
import { config } from '../../config';

export class AuthService {
  /**
   * Registers a new user with email and password.
   */
  public async register(input: RegisterInput, signJwt: (payload: object) => string) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictError('A user with this email address already exists');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: 'USER',
      },
    });

    // Generate JWT access token
    const accessToken = signJwt({ sub: user.id, role: user.role });

    // Generate Refresh Token
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
   * Authenticates a user with email and password.
   */
  public async login(input: LoginInput, signJwt: (payload: object) => string) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    // Use generic error message to prevent user enumeration attacks
    if (!user) {
      throw new AuthenticationError('Invalid email address or password');
    }

    const isValidPassword = await verifyPassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid email address or password');
    }

    // Generate JWT access token
    const accessToken = signJwt({ sub: user.id, role: user.role });

    // Generate Refresh Token
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
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}

export const authService = new AuthService();

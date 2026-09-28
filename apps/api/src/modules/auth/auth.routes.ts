import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { authService } from './auth.service';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshSchema,
  logoutSchema,
} from './auth.schemas';

export async function authRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // POST /api/v1/auth/register
  fastify.post('/register', {
    schema: {
      tags: ['Auth'],
      summary: 'Register a new user',
      description: 'Creates a new user account with email, password, and optional birth profile, sending a verification OTP',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', minLength: 8, example: 'SecurePassword123!' },
          fullName: { type: 'string', example: 'Rahul Sharma' },
          phoneNumber: { type: 'string', example: '+919876543210' },
          birthProfile: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'Rahul Sharma' },
              dateOfBirth: { type: 'string', example: '1998-08-15' },
              timeOfBirth: { type: 'string', example: '08:30:00' },
              latitude: { type: 'number', example: 28.6139 },
              longitude: { type: 'number', example: 77.2090 },
              timezone: { type: 'string', example: 'Asia/Kolkata' },
              placeName: { type: 'string', example: 'New Delhi, India' },
            },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const input = registerSchema.parse(request.body);
      const result = await authService.register(input);
      return reply.status(201).send(result);
    },
  });

  // POST /api/v1/auth/verify-email
  fastify.post('/verify-email', {
    schema: {
      tags: ['Auth'],
      summary: 'Verify user email',
      description: 'Verifies email address using 6-digit OTP code and returns authenticated session',
      body: {
        type: 'object',
        required: ['email', 'otp'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          otp: { type: 'string', example: '123456' },
        },
      },
    },
    handler: async (request, reply) => {
      const input = verifyEmailSchema.parse(request.body);
      const signJwt = (payload: object) => (fastify as any).jwt.sign(payload);
      const result = await authService.verifyEmail(input, signJwt);
      return reply.status(200).send(result);
    },
  });

  // POST /api/v1/auth/login
  fastify.post('/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Login user',
      description: 'Authenticates user with email and password',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', example: 'SecurePassword123!' },
        },
      },
    },
    handler: async (request, reply) => {
      const input = loginSchema.parse(request.body);
      const signJwt = (payload: object) => (fastify as any).jwt.sign(payload);
      const result = await authService.login(input, signJwt);
      return reply.status(200).send(result);
    },
  });

  // POST /api/v1/auth/resend-verification
  fastify.post('/resend-verification', {
    schema: {
      tags: ['Auth'],
      summary: 'Resend verification OTP',
      description: 'Resends a 6-digit email verification OTP with 60-second cooldown rate limit',
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
        },
      },
    },
    handler: async (request, reply) => {
      const input = resendVerificationSchema.parse(request.body);
      const result = await authService.resendVerification(input);
      return reply.status(200).send(result);
    },
  });

  // POST /api/v1/auth/forgot-password
  fastify.post('/forgot-password', {
    schema: {
      tags: ['Auth'],
      summary: 'Request password reset code',
      description: 'Sends a 6-digit password reset OTP without revealing account existence',
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
        },
      },
    },
    handler: async (request, reply) => {
      const input = forgotPasswordSchema.parse(request.body);
      const result = await authService.forgotPassword(input);
      return reply.status(200).send(result);
    },
  });

  // POST /api/v1/auth/reset-password
  fastify.post('/reset-password', {
    schema: {
      tags: ['Auth'],
      summary: 'Reset user password',
      description: 'Resets password using 6-digit password reset OTP',
      body: {
        type: 'object',
        required: ['email', 'otp', 'newPassword'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          otp: { type: 'string', example: '123456' },
          newPassword: { type: 'string', minLength: 8, example: 'NewSecurePassword123!' },
        },
      },
    },
    handler: async (request, reply) => {
      const input = resetPasswordSchema.parse(request.body);
      const result = await authService.resetPassword(input);
      return reply.status(200).send(result);
    },
  });

  // POST /api/v1/auth/refresh
  fastify.post('/refresh', {
    schema: {
      tags: ['Auth'],
      summary: 'Refresh access token',
      description: 'Rotates refresh token and returns a new access token',
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const input = refreshSchema.parse(request.body);
      const signJwt = (payload: object) => (fastify as any).jwt.sign(payload);
      const result = await authService.refresh(input.refreshToken, signJwt);
      return reply.status(200).send(result);
    },
  });

  // POST /api/v1/auth/logout
  fastify.post('/logout', {
    schema: {
      tags: ['Auth'],
      summary: 'Logout user',
      description: 'Revokes the active refresh token session',
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const input = logoutSchema.parse(request.body);
      await authService.logout(input.refreshToken);
      return reply.status(200).send({ message: 'Logged out successfully' });
    },
  });

  // GET /api/v1/auth/me
  fastify.get('/me', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['Auth'],
      summary: 'Get current user authenticated profile',
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const profile = await authService.getProfile(request.user.id);
      return reply.status(200).send(profile);
    },
  });
}

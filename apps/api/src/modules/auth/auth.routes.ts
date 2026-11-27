import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import { authService } from './auth.service';
import {
  phoneSendOtpSchema,
  phoneVerifyOtpSchema,
  emailSendOtpSchema,
  emailVerifyOtpSchema,
  linkPhoneSchema,
  linkEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from './auth.schemas';
import { AppError } from '../../errors/app-error';
import { assertCsrfRequest, authScopeOf, clearBrowserSessionCookies, createCsrfToken, getAccessCookie, getRefreshCookie, isAllowedAuthOrigin, setBrowserSessionCookies } from './auth-cookies';

/**
 * Customer sign-in is by one-time code only (phone or e-mail). The password and Google endpoints
 * of earlier app builds are kept as routes that answer 410 `AUTH_METHOD_REMOVED` with a readable
 * message, so an old build shows the message instead of failing on a 404.
 */
export const AUTH_METHOD_REMOVED = 'AUTH_METHOD_REMOVED';
const PASSWORD_REMOVED_MESSAGE =
  'Signing in with a password is no longer available. Please update the app, then sign in with a one-time code sent to your phone number or e-mail address.';
const GOOGLE_REMOVED_MESSAGE =
  'Google sign-in is no longer available. Please update the app, then sign in with a one-time code sent to your phone number or to the e-mail address of your Google account.';

const REMOVED_ENDPOINTS: Array<{ url: string; message: string }> = [
  { url: '/register', message: PASSWORD_REMOVED_MESSAGE },
  { url: '/login', message: PASSWORD_REMOVED_MESSAGE },
  { url: '/verify-email', message: PASSWORD_REMOVED_MESSAGE },
  { url: '/resend-verification', message: PASSWORD_REMOVED_MESSAGE },
  { url: '/google', message: GOOGLE_REMOVED_MESSAGE },
  { url: '/link-google', message: GOOGLE_REMOVED_MESSAGE },
];

const birthProfileBodySchema = {
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
} as const;

export async function authRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  const signJwt = (payload: object) => (fastify as any).jwt.sign(payload);
  const sendSession = <T extends { tokens: { accessToken: string; refreshToken: string; expiresIn: string } }>(
    request: FastifyRequest,
    reply: FastifyReply,
    result: T
  ) => {
    const csrfToken = setBrowserSessionCookies(reply, request, result.tokens);
    if (csrfToken) {
      const { tokens: _tokens, ...browserResult } = result;
      return reply.status(200).send({ ...browserResult, csrfToken });
    }
    return reply.status(200).send(result);
  };

  // =========================================================================
  // PHONE NUMBER + OTP ROUTES
  // =========================================================================

  fastify.get('/csrf', {
    schema: { tags: ['Auth'], summary: 'Get the CSRF request token for the current browser session' },
    handler: async (request, reply) => {
      const accessToken = getAccessCookie(request);
      if (!isAllowedAuthOrigin(request.headers.origin) || !accessToken) {
        return reply.status(401).send({ error: { code: 'AUTHENTICATION_ERROR', message: 'Browser session is unavailable', requestId: request.id } });
      }
      return reply.status(200).send({ csrfToken: createCsrfToken(accessToken) });
    },
  });

  // POST /api/v1/auth/phone/send-otp
  fastify.post('/phone/send-otp', {
    schema: {
      tags: ['Auth'],
      summary: 'Send a sign-in code to a phone number (SMS + WhatsApp)',
      description: 'Sends a 6-digit code to the normalized E.164 phone number. Same answer whether or not the number has an account. 60-second cooldown, send limits per number and per IP.',
      body: {
        type: 'object',
        required: ['phoneNumber'],
        properties: {
          phoneNumber: { type: 'string', example: '+919876543210' },
        },
      },
    },
    handler: async (request, reply) => {
      const input = phoneSendOtpSchema.parse(request.body);
      // The caller's IP feeds the per-IP send limit (request.ip honours TRUST_PROXY).
      const result = await authService.sendPhoneOtp(input, { ip: request.ip });
      return reply.status(200).send(result);
    },
  });

  // POST /api/v1/auth/phone/verify-otp
  fastify.post('/phone/verify-otp', {
    schema: {
      tags: ['Auth'],
      summary: 'Verify a phone sign-in code and start a session',
      description: 'Verifies the code and returns session tokens with the user profile. The first verified code of a number creates the account.',
      body: {
        type: 'object',
        required: ['phoneNumber', 'otp'],
        properties: {
          phoneNumber: { type: 'string', example: '+919876543210' },
          otp: { type: 'string', example: '123456' },
          fullName: { type: 'string', example: 'Rahul Sharma' },
          birthProfile: birthProfileBodySchema,
        },
      },
    },
    handler: async (request, reply) => {
      const input = phoneVerifyOtpSchema.parse(request.body);
      const result = await authService.verifyPhoneOtp(input, signJwt);
      return sendSession(request, reply, result);
    },
  });

  // =========================================================================
  // E-MAIL ADDRESS + OTP ROUTES
  // =========================================================================

  // POST /api/v1/auth/email/send-otp
  fastify.post('/email/send-otp', {
    schema: {
      tags: ['Auth'],
      summary: 'Send a sign-in code to an e-mail address',
      description: 'Sends a 6-digit code to the e-mail address. Same answer whether or not the address has an account. 60-second cooldown, send limits per address and per IP.',
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', example: 'user@example.com' },
        },
      },
    },
    handler: async (request, reply) => {
      const input = emailSendOtpSchema.parse(request.body);
      const result = await authService.sendEmailOtp(input, { ip: request.ip });
      return reply.status(200).send(result);
    },
  });

  // POST /api/v1/auth/email/verify-otp
  fastify.post('/email/verify-otp', {
    schema: {
      tags: ['Auth'],
      summary: 'Verify an e-mail sign-in code and start a session',
      description: 'Verifies the code and returns session tokens with the user profile. The first verified code of an address creates the account.',
      body: {
        type: 'object',
        required: ['email', 'otp'],
        properties: {
          email: { type: 'string', example: 'user@example.com' },
          otp: { type: 'string', example: '123456' },
          fullName: { type: 'string', example: 'Rahul Sharma' },
          birthProfile: birthProfileBodySchema,
        },
      },
    },
    handler: async (request, reply) => {
      const input = emailVerifyOtpSchema.parse(request.body);
      const result = await authService.verifyEmailOtp(input, signJwt);
      return sendSession(request, reply, result);
    },
  });

  // =========================================================================
  // ACCOUNT LINKING ROUTES (AUTHENTICATED)
  // =========================================================================

  // POST /api/v1/auth/link-phone
  fastify.post('/link-phone', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['Auth'],
      summary: 'Add a verified phone number to the current account',
      description: 'Request the code with POST /auth/phone/send-otp first.',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['phoneNumber', 'otp'],
        properties: {
          phoneNumber: { type: 'string', example: '+919876543210' },
          otp: { type: 'string', example: '123456' },
        },
      },
    },
    handler: async (request, reply) => {
      const input = linkPhoneSchema.parse(request.body);
      const result = await authService.linkPhone(request.user.id, input);
      return reply.status(200).send(result);
    },
  });

  // POST /api/v1/auth/link-email
  fastify.post('/link-email', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['Auth'],
      summary: 'Add a verified e-mail address to the current account',
      description: 'Request the code with POST /auth/email/send-otp first.',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['email', 'otp'],
        properties: {
          email: { type: 'string', example: 'user@example.com' },
          otp: { type: 'string', example: '123456' },
        },
      },
    },
    handler: async (request, reply) => {
      const input = linkEmailSchema.parse(request.body);
      const result = await authService.linkEmail(request.user.id, input);
      return reply.status(200).send(result);
    },
  });

  // =========================================================================
  // REMOVED: PASSWORD AND GOOGLE SIGN-IN FOR CUSTOMERS (410 AUTH_METHOD_REMOVED)
  // =========================================================================

  // No body schema on purpose: whatever an old build sends, it gets the 410 and its message.
  for (const removed of REMOVED_ENDPOINTS) {
    fastify.post(removed.url, {
      schema: {
        tags: ['Auth'],
        summary: 'Removed: customers sign in with a one-time code',
        description: `Always answers 410 ${AUTH_METHOD_REMOVED}.`,
        deprecated: true,
      },
      handler: async () => {
        throw new AppError(removed.message, 410, AUTH_METHOD_REMOVED);
      },
    });
  }

  // =========================================================================
  // STAFF PASSWORD RESET (STAFF ACCOUNTS ONLY)
  // =========================================================================

  // POST /api/v1/auth/forgot-password
  fastify.post('/forgot-password', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
      },
    },
    schema: {
      tags: ['Auth'],
      summary: 'Staff: request a password reset code',
      description: 'Staff accounts only. E-mails a 6-digit reset code to a staff address; the answer is identical for a customer address and for an unknown address.',
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
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
      },
    },
    schema: {
      tags: ['Auth'],
      summary: 'Staff: reset the password with the e-mailed code',
      description: 'Staff accounts only. A customer or unknown address gets the answer of a wrong code.',
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
        properties: {
          refreshToken: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const body = request.body as { refreshToken?: string } | undefined;
      const browserRequest = isAllowedAuthOrigin(request.headers.origin);
      const refreshToken = browserRequest ? getRefreshCookie(request) : body?.refreshToken || getRefreshCookie(request);
      if (!refreshToken) return reply.status(401).send({ error: { code: 'AUTHENTICATION_ERROR', message: 'Refresh token is required', requestId: request.id } });
      if (browserRequest || (!body?.refreshToken && getRefreshCookie(request))) assertCsrfRequest(request);
      const result = await authService.refresh(refreshToken, signJwt);
      return sendSession(request, reply, result);
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
        properties: {
          refreshToken: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const body = request.body as { refreshToken?: string } | undefined;
      const browserRequest = isAllowedAuthOrigin(request.headers.origin);
      const refreshToken = browserRequest ? getRefreshCookie(request) : body?.refreshToken || getRefreshCookie(request);
      if (refreshToken && (browserRequest || !body?.refreshToken)) assertCsrfRequest(request);
      if (refreshToken) await authService.logout(refreshToken);
      clearBrowserSessionCookies(reply, authScopeOf(request));
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

  // PATCH /api/v1/auth/me
  fastify.patch('/me', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['Auth'],
      summary: 'Update current user basic profile details',
      description: 'Sets the full name used to complete the account profile. Phone numbers and e-mail addresses are added separately via OTP (send-otp + link-phone / link-email).',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['fullName'],
        properties: {
          fullName: { type: 'string', example: 'Rahul Sharma' },
        },
      },
    },
    handler: async (request, reply) => {
      const input = updateProfileSchema.parse(request.body);
      const profile = await authService.updateProfile(request.user.id, input);
      return reply.status(200).send(profile);
    },
  });
}

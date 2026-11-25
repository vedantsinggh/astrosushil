import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fp from 'fastify-plugin';
import { config } from '../config';
import { AuthenticationError, AuthorizationError } from '../errors/app-error';
import { assertAccountActive } from '../modules/auth/account-status';
import { ACCESS_COOKIE, assertCsrfRequest, isAllowedAuthOrigin, isCookieAuthenticatedRequest } from '../modules/auth/auth-cookies';

async function jwtPlugin(app: FastifyInstance) {
  await app.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: config.JWT_ACCESS_EXPIRES_IN,
    },
  });

  // Authentication Decorator
  app.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
    if (isAllowedAuthOrigin(request.headers.origin)) {
      if (!request.cookies?.[ACCESS_COOKIE]) {
        throw new AuthenticationError('Browser session cookie is required');
      }
      request.headers.authorization = undefined;
    }
    const cookieAuthenticated = isCookieAuthenticatedRequest(request);
    try {
      if (cookieAuthenticated) {
        assertCsrfRequest(request);
        request.headers.authorization = `Bearer ${request.cookies[ACCESS_COOKIE]}`;
      }
      await request.jwtVerify();
      // Map 'sub' claim to 'id' property on request.user
      const decoded = request.user as unknown as { sub: string; role: 'USER' | 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' };
      if (!decoded || !decoded.sub) {
        throw new AuthenticationError('Invalid token claims');
      }
      request.user = {
        id: decoded.sub,
        role: decoded.role,
      };
    } catch (err: any) {
      // Debug-level only and never includes token material (AGENTS.md §5.1).
      request.log.debug({ tokenPresent: Boolean(request.headers.authorization) }, 'JWT verification failed');
      if (err instanceof AuthenticationError || err instanceof AuthorizationError) {
        throw err;
      }
      throw new AuthenticationError(err.message || 'Invalid or expired access token');
    }
    // A blocked (suspended or deleted) account's still-valid access token stops working on every
    // route. Cached per user (modules/auth/account-status.ts), so this is normally no query.
    // Outside the try block on purpose: the refusal is a 403, and a failed lookup is not a 401.
    await assertAccountActive(request.user.id);
  });

  // Optional Authentication Decorator
  app.decorate('authenticateOptional', async (request: FastifyRequest, _reply: FastifyReply) => {
    if (isAllowedAuthOrigin(request.headers.origin)) request.headers.authorization = undefined;
    if (!request.headers.authorization && !request.cookies?.[ACCESS_COOKIE]) {
      return;
    }
    const cookieAuthenticated = isCookieAuthenticatedRequest(request);
    if (cookieAuthenticated) assertCsrfRequest(request);
    try {
      if (cookieAuthenticated) {
        request.headers.authorization = `Bearer ${request.cookies[ACCESS_COOKIE]}`;
      }
      await request.jwtVerify();
      const decoded = request.user as unknown as { sub: string; role: 'USER' | 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' };
      if (decoded && decoded.sub) {
        request.user = {
          id: decoded.sub,
          role: decoded.role,
        };
      }
    } catch (_err) {
      // Ignore token verification error for optional auth
      return;
    }
    // A valid token of a blocked account is refused here too: presenting it is acting as that account.
    const verified = request.user as { id?: string } | undefined;
    if (verified?.id) await assertAccountActive(verified.id);
  });

  // Role Authorization Decorator
  app.decorate('authorize', (allowedRoles: ('USER' | 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT')[]) => {
    return async (request: FastifyRequest, _reply: FastifyReply) => {
      if (!request.user || !request.user.role) {
        throw new AuthenticationError('Authentication required before authorization check');
      }

      if (!allowedRoles.includes(request.user.role)) {
        throw new AuthorizationError('You do not have permission to access this resource');
      }
    };
  });
}

export const registerJwt = fp(jwtPlugin);

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticateOptional: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (allowedRoles: ('USER' | 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT')[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

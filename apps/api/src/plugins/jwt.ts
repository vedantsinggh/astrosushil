import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fp from 'fastify-plugin';
import { config } from '../config';
import { AuthenticationError, AuthorizationError } from '../errors/app-error';

async function jwtPlugin(app: FastifyInstance) {
  await app.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: config.JWT_ACCESS_EXPIRES_IN,
    },
  });

  // Authentication Decorator
  app.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      const tokenPresent = Boolean(authHeader && authHeader.trim().length > 0);
      let rawToken = '';
      if (authHeader) {
        const trimmed = authHeader.trim();
        rawToken = trimmed.toLowerCase().startsWith('bearer ') ? trimmed.slice(7).trim() : trimmed;
      }
      const parts = rawToken ? rawToken.split('.') : [];

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AUTH TRACE] tokenPresent = ${tokenPresent}`);
        console.log(`[AUTH TRACE] tokenParts = ${parts.length}`);
        console.log(`[AUTH TRACE] tokenLength = ${rawToken.length}`);
        console.log(`[AUTH TRACE] tokenPrefix = ${rawToken.slice(0, 10)}...`);
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
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[AUTH TRACE ERROR] Verification failed: ${err?.message || err}`);
      }
      if (err instanceof AuthenticationError) {
        throw err;
      }
      throw new AuthenticationError(err.message || 'Invalid or expired access token');
    }
  });

  // Optional Authentication Decorator
  app.decorate('authenticateOptional', async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.headers.authorization) {
      return;
    }
    try {
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
    }
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

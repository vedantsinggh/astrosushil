import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { config } from '../config';
import { AuthenticationError, AuthorizationError } from '../errors/app-error';

export async function registerJwt(app: FastifyInstance) {
  await app.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: config.JWT_ACCESS_EXPIRES_IN,
    },
  });

  // Authentication Decorator
  app.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      // Map 'sub' claim to 'id' property on request.user
      const decoded = request.user as unknown as { sub: string; role: 'USER' | 'ADMIN' };
      if (!decoded || !decoded.sub) {
        throw new AuthenticationError('Invalid token claims');
      }
      request.user = {
        id: decoded.sub,
        role: decoded.role,
      };
    } catch (err: any) {
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
      const decoded = request.user as unknown as { sub: string; role: 'USER' | 'ADMIN' };
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
  app.decorate('authorize', (allowedRoles: ('USER' | 'ADMIN')[]) => {
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

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticateOptional: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (allowedRoles: ('USER' | 'ADMIN')[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

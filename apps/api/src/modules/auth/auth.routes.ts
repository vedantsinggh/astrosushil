import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { authService } from './auth.service';
import { registerSchema, loginSchema, refreshSchema, logoutSchema } from './auth.schemas';

export async function authRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // POST /api/v1/auth/register
  fastify.post('/register', {
    schema: {
      tags: ['Auth'],
      summary: 'Register a new user',
      description: 'Creates a new user account with email and password',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', minLength: 8, example: 'SecurePassword123' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' },
                createdAt: { type: 'string' },
              },
            },
            tokens: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                expiresIn: { type: 'string' },
              },
            },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const input = registerSchema.parse(request.body);
      const signJwt = (payload: object) => fastify.jwt.sign(payload);
      const result = await authService.register(input, signJwt);
      return reply.status(201).send(result);
    },
  });

  // POST /api/v1/auth/login
  fastify.post('/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Login user',
      description: 'Authenticates user with email and password and returns tokens',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', example: 'SecurePassword123' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' },
                createdAt: { type: 'string' },
              },
            },
            tokens: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                expiresIn: { type: 'string' },
              },
            },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const input = loginSchema.parse(request.body);
      const signJwt = (payload: object) => fastify.jwt.sign(payload);
      const result = await authService.login(input, signJwt);
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
      response: {
        200: {
          type: 'object',
          properties: {
            tokens: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                expiresIn: { type: 'string' },
              },
            },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const input = refreshSchema.parse(request.body);
      const signJwt = (payload: object) => fastify.jwt.sign(payload);
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
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
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
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const profile = await authService.getProfile(request.user.id);
      return reply.status(200).send(profile);
    },
  });
}

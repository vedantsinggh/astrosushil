import { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export async function registerSwagger(app: FastifyInstance) {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Astro Sushil Platform API',
        description: 'REST API documentation for Astro Sushil - Scalable Vedic Astrology & BNN Platform',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Local Development Server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Provide JWT Access Token obtained from /api/v1/auth/login or /register',
          },
        },
      },
      tags: [
        { name: 'Health', description: 'System Health Check' },
        { name: 'Auth', description: 'Authentication & Session Management' },
        { name: 'Users', description: 'User Profile Operations' },
        { name: 'Birth Profiles', description: 'Birth Profiles Management for Chart Calculations' },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
  });
}

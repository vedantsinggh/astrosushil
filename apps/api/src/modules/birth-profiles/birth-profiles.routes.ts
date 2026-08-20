import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { birthProfilesService } from './birth-profiles.service';
import {
  createBirthProfileSchema,
  updateBirthProfileSchema,
  birthProfileParamsSchema,
} from './birth-profiles.schemas';

export async function birthProfilesRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // Enforce authentication for all birth profile endpoints
  fastify.addHook('onRequest', fastify.authenticate);

  // POST /api/v1/birth-profiles
  fastify.post('/', {
    schema: {
      tags: ['Birth Profiles'],
      summary: 'Create a new birth profile',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'dateOfBirth', 'timeOfBirth', 'latitude', 'longitude', 'timezone'],
        properties: {
          name: { type: 'string', example: 'Sushil Kumar' },
          dateOfBirth: { type: 'string', example: '1990-05-15' },
          timeOfBirth: { type: 'string', example: '14:30:00' },
          latitude: { type: 'number', example: 28.6139 },
          longitude: { type: 'number', example: 77.2090 },
          timezone: { type: 'string', example: 'Asia/Kolkata' },
          placeName: { type: 'string', example: 'New Delhi, India' },
        },
      },
    },
    handler: async (request, reply) => {
      const input = createBirthProfileSchema.parse(request.body);
      const result = await birthProfilesService.createProfile(request.user.id, input);
      return reply.status(201).send(result);
    },
  });

  // POST /api/v1/birth-profiles/migrate
  fastify.post('/migrate', {
    schema: {
      tags: ['Birth Profiles'],
      summary: 'Migrate local guest birth profile to authenticated account (idempotent)',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'dateOfBirth', 'timeOfBirth', 'latitude', 'longitude', 'timezone'],
        properties: {
          name: { type: 'string', example: 'Sushil Kumar' },
          dateOfBirth: { type: 'string', example: '1990-05-15' },
          timeOfBirth: { type: 'string', example: '14:30:00' },
          latitude: { type: 'number', example: 28.6139 },
          longitude: { type: 'number', example: 77.2090 },
          timezone: { type: 'string', example: 'Asia/Kolkata' },
          placeName: { type: 'string', example: 'New Delhi, India' },
        },
      },
    },
    handler: async (request, reply) => {
      const input = createBirthProfileSchema.parse(request.body);
      const result = await birthProfilesService.migrateGuestProfile(request.user.id, input);
      return reply.status(200).send(result);
    },
  });

  // GET /api/v1/birth-profiles
  fastify.get('/', {
    schema: {
      tags: ['Birth Profiles'],
      summary: 'List user birth profiles',
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const profiles = await birthProfilesService.getUserProfiles(request.user.id);
      return reply.status(200).send(profiles);
    },
  });

  // GET /api/v1/birth-profiles/:id
  fastify.get('/:id', {
    schema: {
      tags: ['Birth Profiles'],
      summary: 'Get a specific birth profile by ID',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
    handler: async (request, reply) => {
      const { id } = birthProfileParamsSchema.parse(request.params);
      const profile = await birthProfilesService.getProfileById(id, request.user);
      return reply.status(200).send(profile);
    },
  });

  // PATCH /api/v1/birth-profiles/:id
  fastify.patch('/:id', {
    schema: {
      tags: ['Birth Profiles'],
      summary: 'Partially update a birth profile',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
    handler: async (request, reply) => {
      const { id } = birthProfileParamsSchema.parse(request.params);
      const input = updateBirthProfileSchema.parse(request.body);
      const updated = await birthProfilesService.updateProfile(id, input, request.user);
      return reply.status(200).send(updated);
    },
  });

  // PUT /api/v1/birth-profiles/:id (Alias for PATCH / update)
  fastify.put('/:id', {
    schema: {
      tags: ['Birth Profiles'],
      summary: 'Update a birth profile',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
    handler: async (request, reply) => {
      const { id } = birthProfileParamsSchema.parse(request.params);
      const input = updateBirthProfileSchema.parse(request.body);
      const updated = await birthProfilesService.updateProfile(id, input, request.user);
      return reply.status(200).send(updated);
    },
  });

  // DELETE /api/v1/birth-profiles/:id
  fastify.delete('/:id', {
    schema: {
      tags: ['Birth Profiles'],
      summary: 'Delete a birth profile',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
    handler: async (request, reply) => {
      const { id } = birthProfileParamsSchema.parse(request.params);
      const result = await birthProfilesService.deleteProfile(id, request.user);
      return reply.status(200).send(result);
    },
  });
}

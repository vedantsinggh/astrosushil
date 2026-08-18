import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../services/prisma.service';

const registerDeviceSchema = z.object({
  fcmToken: z.string().min(1, 'fcmToken is required'),
  deviceType: z.enum(['ANDROID', 'IOS', 'WEB']).default('ANDROID'),
});

export async function notificationsRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  fastify.addHook('onRequest', fastify.authenticate);

  // POST /api/v1/notifications/register-device
  fastify.post('/register-device', {
    schema: {
      tags: ['Notifications'],
      summary: 'Register FCM device token for push notifications',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['fcmToken'],
        properties: {
          fcmToken: { type: 'string' },
          deviceType: { type: 'string', enum: ['ANDROID', 'IOS', 'WEB'], default: 'ANDROID' },
        },
      },
    },
    handler: async (request, reply) => {
      const { fcmToken, deviceType } = registerDeviceSchema.parse(request.body);

      const deviceToken = await prisma.deviceToken.upsert({
        where: { fcmToken },
        update: {
          userId: request.user.id,
          deviceType,
        },
        create: {
          userId: request.user.id,
          fcmToken,
          deviceType,
        },
      });

      return reply.status(200).send({
        message: 'Device token registered successfully',
        deviceToken,
      });
    },
  });

  // GET /api/v1/notifications/inbox
  fastify.get('/inbox', {
    schema: {
      tags: ['Notifications'],
      summary: 'Get push notification inbox for user',
      security: [{ bearerAuth: [] }],
    },
    handler: async (_request, reply) => {
      return reply.status(200).send({
        notifications: [
          {
            id: 'notif-001',
            title: 'Welcome to Astro Sushil',
            body: 'Your account setup is complete. Create a birth profile to get started!',
            read: true,
            createdAt: new Date().toISOString(),
          },
        ],
      });
    },
  });
}

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { notificationService } from './notification.service';
import {
  registerDeviceTokenSchema,
  updateNotificationPreferencesSchema,
} from './notification.schemas';

export async function notificationRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // All user notification routes require authentication
  fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook('onRequest', fastify.authenticate);

    // 1. Get In-App Notifications
    protectedRoutes.get('/notifications', {
      schema: { tags: ['Notifications'], summary: 'Get user in-app notifications' },
      handler: async (request, reply) => {
        const query = request.query as { page?: string; pageSize?: string };
        const page = Math.max(1, parseInt(query.page || '1', 10));
        const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize || '20', 10)));
        const result = await notificationService.getUserNotifications(request.user.id, page, pageSize);
        return reply.status(200).send(result);
      },
    });

    // 2. Get Unread Count
    protectedRoutes.get('/notifications/unread-count', {
      schema: { tags: ['Notifications'], summary: 'Get unread notification count' },
      handler: async (request, reply) => {
        const result = await notificationService.getUnreadCount(request.user.id);
        return reply.status(200).send(result);
      },
    });

    // 3. Mark Notification as Read
    protectedRoutes.patch('/notifications/:id/read', {
      schema: { tags: ['Notifications'], summary: 'Mark single notification as read' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        await notificationService.markAsRead(request.user.id, id);
        return reply.status(200).send({ message: 'Notification marked as read' });
      },
    });

    // 4. Mark All Notifications as Read
    protectedRoutes.post('/notifications/read-all', {
      schema: { tags: ['Notifications'], summary: 'Mark all notifications as read' },
      handler: async (request, reply) => {
        await notificationService.markAllAsRead(request.user.id);
        return reply.status(200).send({ message: 'All notifications marked as read' });
      },
    });

    // 5. Register Device Token
    protectedRoutes.post('/notifications/device-token', {
      schema: { tags: ['Notifications'], summary: 'Register FCM device token' },
      handler: async (request, reply) => {
        const body = registerDeviceTokenSchema.parse(request.body);
        const result = await notificationService.registerDeviceToken(request.user.id, body.fcmToken, body.deviceType);
        return reply.status(200).send({ message: 'Device token registered successfully', token: result });
      },
    });

    // 6. Delete / Deactivate Device Token on Logout
    protectedRoutes.delete('/notifications/device-token', {
      schema: { tags: ['Notifications'], summary: 'Deactivate FCM device token' },
      handler: async (request, reply) => {
        const body = request.body as { fcmToken?: string } | undefined;
        await notificationService.handleUserLogout(request.user.id, body?.fcmToken);
        return reply.status(200).send({ message: 'Device token deactivated' });
      },
    });

    // 7. Get Notification Preferences
    protectedRoutes.get('/notifications/preferences', {
      schema: { tags: ['Notifications'], summary: 'Get user notification preferences' },
      handler: async (request, reply) => {
        const preferences = await notificationService.getUserPreferences(request.user.id);
        return reply.status(200).send(preferences);
      },
    });

    // 8. Update Notification Preferences
    protectedRoutes.put('/notifications/preferences', {
      schema: { tags: ['Notifications'], summary: 'Update user notification preferences' },
      handler: async (request, reply) => {
        const body = updateNotificationPreferencesSchema.parse(request.body);
        const updated = await notificationService.updateUserPreferences(request.user.id, body);
        return reply.status(200).send(updated);
      },
    });
  });
}

import { prisma } from '../../services/prisma.service';
import { logger } from '../../utils/logger';
import { fcmProvider } from './fcm.provider';
import { renderNotificationTemplate } from './notification.templates';
import { SendNotificationOptions, NotificationSendResult } from './notification.types';

export class NotificationService {
  /**
   * Centralized method to send notification across PUSH, EMAIL, and IN_APP channels
   */
  public async sendNotification(options: SendNotificationOptions): Promise<NotificationSendResult> {
    const { userId, type, entityId, route, customTitle, customBody, templateData, channels = ['IN_APP', 'PUSH', 'EMAIL'], idempotencyKey } = options;

    // Idempotency check: Prevent sending duplicate notification for same entity & type
    if (idempotencyKey || entityId) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          type,
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // within 1 hour
          metadata: { contains: entityId || idempotencyKey },
        },
      });

      if (existing) {
        logger.info({ userId, type, entityId }, '[NotificationService] Skipped duplicate notification due to idempotency check');
        return {
          notificationId: existing.id,
          channels: {
            inApp: { status: 'SKIPPED' },
            push: { status: 'SKIPPED', sentCount: 0, failedCount: 0 },
            email: { status: 'SKIPPED' },
          },
        };
      }
    }

    // Fetch user & preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phoneNumber: true, fullName: true },
    });

    if (!user) {
      logger.warn({ userId }, '[NotificationService] Cannot send notification: User not found');
      return {
        channels: {
          inApp: { status: 'FAILED' },
          push: { status: 'FAILED', sentCount: 0, failedCount: 0 },
          email: { status: 'FAILED' },
        },
      };
    }

    const preferences = await this.getUserPreferences(userId);
    const fallbackName = user.email ? user.email.split('@')[0] : (user.phoneNumber || 'User');
    const template = renderNotificationTemplate(type, {
      userName: user.fullName || fallbackName,
      ...templateData,
    });

    const title = customTitle || template.title;
    const body = customBody || template.body;
    const actionRoute = route || template.route || 'OPEN_HOME';

    const result: NotificationSendResult = {
      channels: {},
    };

    // 1. IN_APP Channel
    if (channels.includes('IN_APP')) {
      try {
        const metadataObj = { entityId, route: actionRoute, ...templateData };
        const notif = await prisma.notification.create({
          data: {
            userId,
            type,
            title,
            body,
            metadata: JSON.stringify(metadataObj),
          },
        });
        result.notificationId = notif.id;
        result.channels.inApp = { status: 'SENT' };
      } catch (err) {
        logger.error({ userId, err }, '[NotificationService] Failed to create in-app notification record');
        result.channels.inApp = { status: 'FAILED' };
      }
    }

    // 2. PUSH Channel (FCM)
    const isPushAllowed = preferences.pushEnabled && (type !== 'PROMOTIONAL' || preferences.promotions);
    if (channels.includes('PUSH') && isPushAllowed) {
      const tokens = await prisma.deviceToken.findMany({
        where: { userId, isActive: true },
      });

      if (tokens.length > 0) {
        let sentCount = 0;
        let failedCount = 0;

        for (const t of tokens) {
          const pushRes = await fcmProvider.sendPushNotification({
            token: t.fcmToken,
            notification: { title, body },
            data: {
              type,
              entityId: entityId || '',
              route: actionRoute,
            },
          });

          if (pushRes.success) {
            sentCount += 1;
            await prisma.deviceToken.update({
              where: { id: t.id },
              data: { lastUsedAt: new Date() },
            });
          } else {
            failedCount += 1;
          }
        }

        result.channels.push = {
          status: sentCount > 0 ? 'SENT' : 'FAILED',
          sentCount,
          failedCount,
        };
      } else {
        result.channels.push = { status: 'SKIPPED', sentCount: 0, failedCount: 0 };
      }
    } else {
      result.channels.push = { status: 'SKIPPED', sentCount: 0, failedCount: 0 };
    }

    // 3. EMAIL Channel
    const isEmailAllowed = preferences.emailEnabled && (type !== 'PROMOTIONAL' || preferences.promotions);
    if (channels.includes('EMAIL') && isEmailAllowed && user.email) {
      try {
        logger.info({ userId, email: user.email, subject: template.emailSubject }, '[NotificationService] Transactional email dispatched');
        result.channels.email = { status: 'SENT' };
      } catch (err) {
        logger.error({ userId, err }, '[NotificationService] Failed to dispatch email');
        result.channels.email = { status: 'FAILED' };
      }
    } else {
      result.channels.email = { status: 'SKIPPED' };
    }

    logger.info({ userId, type, result }, '[NotificationService] Notification processing complete');
    return result;
  }

  /**
   * Device Token Registration (with Token Reassignment on multi-device login)
   */
  public async registerDeviceToken(userId: string, fcmToken: string, deviceType: string = 'ANDROID') {
    const cleanToken = fcmToken.trim();

    // Check if token belongs to another user (reassignment)
    const existing = await prisma.deviceToken.findUnique({
      where: { fcmToken: cleanToken },
    });

    if (existing) {
      if (existing.userId !== userId) {
        logger.info(
          { tokenPrefix: cleanToken.substring(0, 10), oldUserId: existing.userId, newUserId: userId },
          '[NotificationService] Reassigning device token to new logged-in user'
        );
      }
      return prisma.deviceToken.update({
        where: { fcmToken: cleanToken },
        data: {
          userId,
          deviceType,
          isActive: true,
          lastUsedAt: new Date(),
        },
      });
    }

    return prisma.deviceToken.create({
      data: {
        userId,
        fcmToken: cleanToken,
        deviceType,
        isActive: true,
        lastUsedAt: new Date(),
      },
    });
  }

  /**
   * Deactivate token on logout
   */
  public async handleUserLogout(userId: string, fcmToken?: string) {
    if (fcmToken) {
      await prisma.deviceToken.updateMany({
        where: { userId, fcmToken },
        data: { isActive: false },
      });
    } else {
      // Deactivate all tokens for user on global logout
      await prisma.deviceToken.updateMany({
        where: { userId },
        data: { isActive: false },
      });
    }
  }

  /**
   * Get user notification preferences (creates default record if none exists)
   */
  public async getUserPreferences(userId: string) {
    let pref = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      pref = await prisma.notificationPreference.create({
        data: {
          userId,
          pushEnabled: true,
          emailEnabled: true,
          astrologyReminders: true,
          reportAlerts: true,
          promotions: false,
        },
      });
    }
    return pref;
  }

  /**
   * Update notification preferences
   */
  public async updateUserPreferences(userId: string, updates: {
    pushEnabled?: boolean;
    emailEnabled?: boolean;
    astrologyReminders?: boolean;
    reportAlerts?: boolean;
    promotions?: boolean;
  }) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...updates,
      },
      update: {
        ...updates,
      },
    });
  }

  /**
   * Get User In-App Notifications
   */
  public async getUserNotifications(userId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get unread notification count for user
   */
  public async getUnreadCount(userId: string) {
    const unreadCount = await prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { unreadCount };
  }

  /**
   * Mark single notification as read
   */
  public async markAsRead(userId: string, notificationId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  }

  /**
   * Mark all notifications as read
   */
  public async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  /**
   * Admin Notification Center Diagnostics
   */
  public async getAdminNotificationStats() {
    const [
      totalNotifications,
      totalUnread,
      activeTokens,
      notificationsByTypeRaw,
      recentNotifications,
    ] = await Promise.all([
      prisma.notification.count(),
      prisma.notification.count({ where: { readAt: null } }),
      prisma.deviceToken.count({ where: { isActive: true } }),
      prisma.notification.groupBy({
        by: ['type'],
        _count: { id: true },
      }),
      prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          readAt: true,
          createdAt: true,
          user: { select: { email: true } },
        },
      }),
    ]);

    const byType = notificationsByTypeRaw.map((t) => ({
      type: t.type,
      count: t._count.id,
    }));

    return {
      stats: {
        totalNotifications,
        totalUnread,
        activeDeviceTokens: activeTokens,
      },
      byType,
      recentNotifications: recentNotifications.map((n) => ({
        id: n.id,
        userEmail: n.user?.email || 'Unknown',
        type: n.type,
        title: n.title,
        body: n.body,
        isRead: Boolean(n.readAt),
        createdAt: n.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Send test push notification to authenticated admin
   */
  public async sendAdminTestNotification(adminUserId: string, title?: string, body?: string) {
    return this.sendNotification({
      userId: adminUserId,
      type: 'SYSTEM',
      customTitle: title || '🧪 Astro Sushil Admin Test Notification',
      customBody: body || 'Test notification dispatched from Admin Panel.',
      channels: ['IN_APP', 'PUSH'],
    });
  }
}

export const notificationService = new NotificationService();

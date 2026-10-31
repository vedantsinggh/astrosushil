import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { adminService } from './admin.service';
import { liveSessionService } from './live-session.service';
import { consultationsService } from '../consultations/consultations.service';
import { coursesService } from '../courses/courses.service';
import { productsService } from '../products/products.service';
import { analyticsService } from './analytics.service';
import { notificationService } from '../notifications/notification.service';
import { sendTestNotificationSchema } from '../notifications/notification.schemas';
import {
  adminLoginSchema,
  usersQuerySchema,
  paginationQuerySchema,
  reportsQuerySchema,
  subscriptionsQuerySchema,
  paymentsQuerySchema,
  updateUserRoleSchema,
  suspendUserSchema,
  activateUserSchema,
  createAdminUserSchema,
  grantEntitlementSchema,
  revokeEntitlementSchema,
  auditLogQuerySchema,
  analyticsQuerySchema,
  analyticsExportQuerySchema,
} from './admin.schemas';
import { hasPermission, Permission } from './admin.permissions';
import { AuthorizationError } from '../../errors/app-error';

export async function adminRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // Helper hook for checking specific permission
  const checkPermission = (perm: Permission) => {
    return async (request: FastifyRequest) => {
      if (!request.user || !request.user.role) {
        throw new AuthorizationError('Authentication required');
      }
      if (!hasPermission(request.user.role, perm)) {
        throw new AuthorizationError(`Role '${request.user.role}' lacks '${perm}' permission`);
      }
    };
  };

  // 1. PUBLIC ADMIN LOGIN
  fastify.post('/auth/login', {
    schema: {
      tags: ['Admin Auth'],
      summary: 'Admin Panel Login',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const body = adminLoginSchema.parse(request.body);
      const signJwt = (payload: object) => (fastify as any).jwt.sign(payload);
      const result = await adminService.login(body, signJwt, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return reply.status(200).send(result);
    },
  });

  // PROTECTED ADMIN ROUTES - require valid admin JWT & role check
  fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook('onRequest', fastify.authenticate);
    protectedRoutes.addHook('onRequest', fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']));

    // Admin Logout
    protectedRoutes.post('/auth/logout', {
      schema: { tags: ['Admin Auth'], summary: 'Admin Panel Logout' },
      handler: async (request, reply) => {
        const body = request.body as { refreshToken?: string } | undefined;
        if (body?.refreshToken) {
          await adminService.logAction({
            adminId: request.user.id,
            adminEmail: (request.user as any).email || request.user.id,
            action: 'ADMIN_LOGOUT',
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
          });
        }
        return reply.status(200).send({ message: 'Logged out successfully' });
      },
    });

    // Admin Profile (/me)
    protectedRoutes.get('/auth/me', {
      schema: { tags: ['Admin Auth'], summary: 'Get current admin profile' },
      handler: async (request, reply) => {
        const result = await adminService.getProfile(request.user.id);
        return reply.status(200).send(result);
      },
    });

    // Dashboard
    protectedRoutes.get('/dashboard', {
      preHandler: [checkPermission('dashboard:read')],
      schema: { tags: ['Admin Dashboard'], summary: 'Get Admin Dashboard metrics' },
      handler: async (_request, reply) => {
        const result = await adminService.getDashboard();
        return reply.status(200).send(result);
      },
    });

    // Subscriptions List
    protectedRoutes.get('/subscriptions', {
      preHandler: [checkPermission('subscriptions:read')],
      schema: { tags: ['Admin Subscriptions'], summary: 'List subscriptions with search & filters' },
      handler: async (request, reply) => {
        const query = subscriptionsQuerySchema.parse(request.query);
        const result = await adminService.getSubscriptions(query);
        return reply.status(200).send(result);
      },
    });

    // Subscription Details
    protectedRoutes.get('/subscriptions/:id', {
      preHandler: [checkPermission('subscriptions:read')],
      schema: { tags: ['Admin Subscriptions'], summary: 'Get subscription details & entitlements' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const adminProfile = await adminService.getProfile(request.user.id);
        const result = await adminService.getSubscriptionDetails(id, adminProfile, {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
        return reply.status(200).send(result);
      },
    });

    // Product Plans Catalog
    protectedRoutes.get('/plans', {
      preHandler: [checkPermission('plans:read')],
      schema: { tags: ['Admin Plans'], summary: 'List available product plans and entitlements' },
      handler: async (_request, reply) => {
        const result = await adminService.getPlans();
        return reply.status(200).send(result);
      },
    });

    // Payments List
    protectedRoutes.get('/payments', {
      preHandler: [checkPermission('payments:read')],
      schema: { tags: ['Admin Payments'], summary: 'List payment transactions with filters & search' },
      handler: async (request, reply) => {
        const query = paymentsQuerySchema.parse(request.query);
        const result = await adminService.getPayments(query, request.user.role);
        return reply.status(200).send(result);
      },
    });

    // Payment Transaction Details
    protectedRoutes.get('/payments/:id', {
      preHandler: [checkPermission('payments:read')],
      schema: { tags: ['Admin Payments'], summary: 'Get transaction details and webhook status' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const adminProfile = await adminService.getProfile(request.user.id);
        const result = await adminService.getPaymentDetails(id, adminProfile, {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
        return reply.status(200).send(result);
      },
    });

    // User Entitlements Evaluation
    protectedRoutes.get('/users/:id/entitlements', {
      preHandler: [checkPermission('entitlements:read')],
      schema: { tags: ['Admin Entitlements'], summary: 'Get user active entitlements' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const result = await adminService.getUserEntitlements(id);
        return reply.status(200).send(result);
      },
    });

    // Grant Manual Entitlement
    protectedRoutes.post('/users/:id/entitlements', {
      preHandler: [checkPermission('entitlements:grant')],
      schema: { tags: ['Admin Entitlements'], summary: 'Grant manual support entitlement to user' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const body = grantEntitlementSchema.parse(request.body);
        const adminProfile = await adminService.getProfile(request.user.id);
        const result = await adminService.grantEntitlement(id, body, adminProfile, {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
        return reply.status(200).send(result);
      },
    });

    // Revoke Manual Entitlement
    protectedRoutes.delete('/users/:id/entitlements/:feature', {
      preHandler: [checkPermission('entitlements:revoke')],
      schema: { tags: ['Admin Entitlements'], summary: 'Revoke manual entitlement from user' },
      handler: async (request, reply) => {
        const { id, feature } = request.params as { id: string; feature: string };
        const body = revokeEntitlementSchema.parse(request.body);
        const adminProfile = await adminService.getProfile(request.user.id);
        const result = await adminService.revokeEntitlement(id, feature, body, adminProfile, {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
        return reply.status(200).send(result);
      },
    });

    // User Sessions
    protectedRoutes.get('/users/:id/sessions', {
      preHandler: [checkPermission('users:read')],
      schema: { tags: ['Admin Sessions'], summary: 'Get active sessions for user' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const result = await adminService.getUserSessions(id);
        return reply.status(200).send(result);
      },
    });

    // Revoke All Sessions for User
    protectedRoutes.post('/users/:id/sessions/revoke', {
      preHandler: [checkPermission('sessions:revoke')],
      schema: { tags: ['Admin Sessions'], summary: 'Revoke all active sessions for user' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const adminProfile = await adminService.getProfile(request.user.id);
        const result = await adminService.revokeUserSessions(id, adminProfile, {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
        return reply.status(200).send(result);
      },
    });

    // Trigger Password Reset
    protectedRoutes.post('/users/:id/password-reset', {
      preHandler: [checkPermission('users:password_reset')],
      schema: { tags: ['Admin Users'], summary: 'Trigger secure password reset for user' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const adminProfile = await adminService.getProfile(request.user.id);
        const result = await adminService.triggerPasswordReset(id, adminProfile, {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
        return reply.status(200).send(result);
      },
    });

    // Suspend User Account
    protectedRoutes.post('/users/:id/suspend', {
      preHandler: [checkPermission('users:suspend')],
      schema: { tags: ['Admin Users'], summary: 'Suspend user account' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const body = suspendUserSchema.parse(request.body);
        const adminProfile = await adminService.getProfile(request.user.id);
        const result = await adminService.suspendUser(id, body, adminProfile, {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
        return reply.status(200).send(result);
      },
    });

    // Activate User Account
    protectedRoutes.post('/users/:id/activate', {
      preHandler: [checkPermission('users:activate')],
      schema: { tags: ['Admin Users'], summary: 'Activate user account' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const body = activateUserSchema.parse(request.body);
        const adminProfile = await adminService.getProfile(request.user.id);
        const result = await adminService.activateUser(id, body, adminProfile, {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
        return reply.status(200).send(result);
      },
    });

    // User Feature Access Diagnostic Check
    protectedRoutes.get('/users/:id/access', {
      preHandler: [checkPermission('entitlements:read')],
      schema: { tags: ['Admin Entitlements'], summary: 'Evaluate feature access diagnostic for user' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const { feature } = request.query as { feature?: string };
        const reqFeature = feature || 'CAREER_REPORT';
        const result = await adminService.getUserFeatureAccess(id, reqFeature);
        return reply.status(200).send(result);
      },
    });

    // Users List
    protectedRoutes.get('/users', {
      preHandler: [checkPermission('users:read')],
      schema: { tags: ['Admin Users'], summary: 'List users with pagination, filters & search' },
      handler: async (request, reply) => {
        const query = usersQuerySchema.parse(request.query);
        const result = await adminService.getUsers(query);
        return reply.status(200).send(result);
      },
    });

    // Admin Staff Users List
    protectedRoutes.get('/admin-users', {
      preHandler: [checkPermission('users:read')],
      schema: { tags: ['Admin Users'], summary: 'List administrative staff users' },
      handler: async (request, reply) => {
        const query = paginationQuerySchema.parse(request.query);
        const result = await adminService.getAdminUsers(query);
        return reply.status(200).send(result);
      },
    });

    // Create New Admin Staff User (SUPER_ADMIN only)
    protectedRoutes.post('/admin-users', {
      preHandler: [checkPermission('admin_users:manage')],
      schema: { tags: ['Admin Users'], summary: 'Create new administrative staff user' },
      handler: async (request, reply) => {
        const body = createAdminUserSchema.parse(request.body);
        const adminProfile = await adminService.getProfile(request.user.id);
        const result = await adminService.createAdminUser(body, adminProfile, {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
        return reply.status(201).send(result);
      },
    });

    // User Details
    protectedRoutes.get('/users/:id', {
      preHandler: [checkPermission('users:read')],
      schema: { tags: ['Admin Users'], summary: 'Get user details by ID' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const adminProfile = await adminService.getProfile(request.user.id);
        const result = await adminService.getUserDetails(id, adminProfile, {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
        return reply.status(200).send(result);
      },
    });

    // Update Admin Staff Role (SUPER_ADMIN only)
    protectedRoutes.patch('/admin-users/:id/role', {
      preHandler: [checkPermission('admin_users:manage')],
      schema: { tags: ['Admin Users'], summary: 'Update administrative staff role' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const body = updateUserRoleSchema.parse(request.body);
        const adminProfile = await adminService.getProfile(request.user.id);
        const result = await adminService.updateUserRole(id, body.role, adminProfile, {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
        return reply.status(200).send(result);
      },
    });

    // Birth Profiles List
    protectedRoutes.get('/birth-profiles', {
      preHandler: [checkPermission('birth_profiles:read')],
      schema: { tags: ['Admin Birth Profiles'], summary: 'List birth profiles with pagination & search' },
      handler: async (request, reply) => {
        const query = paginationQuerySchema.parse(request.query);
        const result = await adminService.getBirthProfiles(query);
        return reply.status(200).send(result);
      },
    });

    // Birth Profile Details
    protectedRoutes.get('/birth-profiles/:id', {
      preHandler: [checkPermission('birth_profiles:read')],
      schema: { tags: ['Admin Birth Profiles'], summary: 'Get birth profile calculation details' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const adminProfile = await adminService.getProfile(request.user.id);
        const result = await adminService.getBirthProfileDetails(id, adminProfile, {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
        return reply.status(200).send(result);
      },
    });

    // Reports List
    protectedRoutes.get('/reports', {
      preHandler: [checkPermission('reports:read')],
      schema: { tags: ['Admin Reports'], summary: 'List reports with status filter, search, & sorting' },
      handler: async (request, reply) => {
        const query = reportsQuerySchema.parse(request.query);
        const result = await adminService.getReports(query);
        return reply.status(200).send(result);
      },
    });

    // Clear Report Cache (SUPER_ADMIN only)
    protectedRoutes.post('/reports/cache/clear', {
      preHandler: [checkPermission('reports:clear_cache')],
      schema: { tags: ['Admin Reports'], summary: 'Clear server-side report cache' },
      handler: async (request, reply) => {
        const adminProfile = await adminService.getProfile(request.user.id);
        const result = await adminService.clearReportCache(adminProfile, {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
        return reply.status(200).send(result);
      },
    });

    // Report Details & Pipeline Debugging
    protectedRoutes.get('/reports/:id', {
      preHandler: [checkPermission('reports:read')],
      schema: { tags: ['Admin Reports'], summary: 'Get report details and 7-stage pipeline diagnostics' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const adminProfile = await adminService.getProfile(request.user.id);
        const result = await adminService.getReportDetails(id, adminProfile, {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
        return reply.status(200).send(result);
      },
    });

    // Report Regeneration (SUPER_ADMIN & ADMIN)
    protectedRoutes.post('/reports/:id/regenerate', {
      preHandler: [checkPermission('reports:regenerate')],
      schema: { tags: ['Admin Reports'], summary: 'Regenerate Career Report and create a new report job' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const adminProfile = await adminService.getProfile(request.user.id);
        const result = await adminService.regenerateReport(id, adminProfile, {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
        return reply.status(200).send(result);
      },
    });

    // Jyoti Monitoring & Error Logs
    protectedRoutes.get('/jyoti', {
      preHandler: [checkPermission('jyoti:read')],
      schema: { tags: ['Admin Jyoti'], summary: 'Get Jyoti AI usage metrics & error status' },
      handler: async (_request, reply) => {
        const result = await adminService.getJyotiStats();
        return reply.status(200).send(result);
      },
    });

    // System Health Checks
    protectedRoutes.get('/system/health', {
      preHandler: [checkPermission('system:read')],
      schema: { tags: ['Admin System'], summary: 'Run real system health checks' },
      handler: async (request, reply) => {
        const adminProfile = await adminService.getProfile(request.user.id);
        const result = await adminService.getSystemHealth(adminProfile, {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
        return reply.status(200).send(result);
      },
    });

    // Audit Logs (with search, filter, date range)
    protectedRoutes.get('/audit-log', {
      preHandler: [checkPermission('audit_log:read')],
      schema: { tags: ['Admin Audit Log'], summary: 'Get administrative audit log' },
      handler: async (request, reply) => {
        const query = auditLogQuerySchema.parse(request.query);
        const result = await adminService.getAuditLogs(query);
        return reply.status(200).send(result);
      },
    });

    // ----------------------------------------------------
    // ANALYTICS ENDPOINTS (PHASE 7)
    // ----------------------------------------------------
    protectedRoutes.get('/analytics/overview', {
      preHandler: [checkPermission('analytics:read')],
      schema: { tags: ['Admin Analytics'], summary: 'Get Analytics Overview KPIs' },
      handler: async (request, reply) => {
        const query = analyticsQuerySchema.parse(request.query);
        const result = await analyticsService.getOverview(query.period, query.startDate, query.endDate);
        return reply.status(200).send(result);
      },
    });

    protectedRoutes.get('/analytics/users', {
      preHandler: [checkPermission('analytics:read')],
      schema: { tags: ['Admin Analytics'], summary: 'Get User Analytics & Growth Trends' },
      handler: async (request, reply) => {
        const query = analyticsQuerySchema.parse(request.query);
        const result = await analyticsService.getUserAnalytics(query.period, query.startDate, query.endDate);
        return reply.status(200).send(result);
      },
    });

    protectedRoutes.get('/analytics/reports', {
      preHandler: [checkPermission('analytics:read')],
      schema: { tags: ['Admin Analytics'], summary: 'Get Report Generation Analytics & Pipeline Health' },
      handler: async (request, reply) => {
        const query = analyticsQuerySchema.parse(request.query);
        const result = await analyticsService.getReportAnalytics(query.period, query.startDate, query.endDate);
        return reply.status(200).send(result);
      },
    });

    protectedRoutes.get('/analytics/jyoti', {
      preHandler: [checkPermission('analytics:read')],
      schema: { tags: ['Admin Analytics'], summary: 'Get Jyoti AI Assistant Usage Metrics' },
      handler: async (_request, reply) => {
        const result = await analyticsService.getJyotiAnalytics();
        return reply.status(200).send(result);
      },
    });

    protectedRoutes.get('/analytics/revenue', {
      preHandler: [checkPermission('analytics:read')],
      schema: { tags: ['Admin Analytics'], summary: 'Get Verified Payment & Revenue Analytics' },
      handler: async (request, reply) => {
        const query = analyticsQuerySchema.parse(request.query);
        const result = await analyticsService.getRevenueAnalytics(query.period, query.startDate, query.endDate);
        return reply.status(200).send(result);
      },
    });

    protectedRoutes.get('/analytics/system', {
      preHandler: [checkPermission('analytics:read')],
      schema: { tags: ['Admin Analytics'], summary: 'Get System Health & Top Error Trends' },
      handler: async (request, reply) => {
        const query = analyticsQuerySchema.parse(request.query);
        const result = await analyticsService.getSystemHealthAnalytics(query.period, query.startDate, query.endDate);
        return reply.status(200).send(result);
      },
    });

    protectedRoutes.get('/analytics/export', {
      preHandler: [checkPermission('analytics:export')],
      schema: { tags: ['Admin Analytics'], summary: 'Export Analytics dataset to CSV' },
      handler: async (request, reply) => {
        const query = analyticsExportQuerySchema.parse(request.query);
        const csv = await analyticsService.generateExportCsv(query.type, query.period, query.startDate, query.endDate);
        
        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', `attachment; filename=astro-sushil-${query.type}-analytics-${query.period}.csv`);
        return reply.status(200).send(csv);
      },
    });

    // ----------------------------------------------------
    // NOTIFICATIONS ENDPOINTS (PHASE 8)
    // ----------------------------------------------------
    protectedRoutes.get('/notifications', {
      preHandler: [checkPermission('notifications:read')],
      schema: { tags: ['Admin Notifications'], summary: 'Get notification stats and recent log entries' },
      handler: async (_request, reply) => {
        const stats = await notificationService.getAdminNotificationStats();
        return reply.status(200).send(stats);
      },
    });

    protectedRoutes.post('/notifications/test-send', {
      preHandler: [checkPermission('notifications:test')],
      schema: { tags: ['Admin Notifications'], summary: 'Send dev/admin test notification' },
      handler: async (request, reply) => {
        const body = sendTestNotificationSchema.parse(request.body || {});
        const adminUser = request.user;
        const result = await notificationService.sendAdminTestNotification(adminUser.id, body.title, body.body);

        // Write audit log entry
        await adminService.logAction({
          adminId: adminUser.id,
          adminEmail: (adminUser as any).email || adminUser.id,
          action: 'ADMIN_TEST_NOTIFICATION_SENT',
          resource: `User:${adminUser.id}`,
          details: `Sent test push notification: ${body.title || 'Dev Test'}`,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });

        return reply.status(200).send({ message: 'Test notification sent successfully', result });
      },
    });

    // ----------------------------------------------------
    // LIVE SESSION CONSULTATION ENDPOINTS (PHASES 1-5)
    // ----------------------------------------------------

    // 1. Create / Start Session
    protectedRoutes.post('/live-sessions', {
      preHandler: [checkPermission('live_sessions:write')],
      schema: { tags: ['Admin Live Sessions'], summary: 'Start a new consultation live session' },
      handler: async (request, reply) => {
        const body = request.body as { userId: string; birthProfileId: string };
        const result = await liveSessionService.createSession(body, request.user);
        return reply.status(201).send(result);
      },
    });

    // 2. List Live Sessions
    protectedRoutes.get('/live-sessions', {
      preHandler: [checkPermission('live_sessions:read')],
      schema: { tags: ['Admin Live Sessions'], summary: 'List live consultation sessions' },
      handler: async (request, reply) => {
        const query = request.query as any;
        const result = await liveSessionService.listSessions(request.user, query);
        return reply.status(200).send(result);
      },
    });

    // 3. Get Live Session by ID
    protectedRoutes.get('/live-sessions/:id', {
      preHandler: [checkPermission('live_sessions:read')],
      schema: { tags: ['Admin Live Sessions'], summary: 'Get live session details & context' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const result = await liveSessionService.getSessionById(id, request.user);
        return reply.status(200).send(result);
      },
    });

    // 4. End Live Session
    protectedRoutes.post('/live-sessions/:id/end', {
      preHandler: [checkPermission('live_sessions:write')],
      schema: { tags: ['Admin Live Sessions'], summary: 'Conclude and end a live session' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const result = await liveSessionService.endSession(id, request.user, {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
        return reply.status(200).send(result);
      },
    });

    // 5. Notes Endpoints
    protectedRoutes.get('/live-sessions/:id/notes', {
      preHandler: [checkPermission('live_sessions:read')],
      schema: { tags: ['Admin Live Sessions'], summary: 'List notes for a live session' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const result = await liveSessionService.listNotes(id, request.user);
        return reply.status(200).send(result);
      },
    });

    protectedRoutes.post('/live-sessions/:id/notes', {
      preHandler: [checkPermission('live_sessions:write')],
      schema: { tags: ['Admin Live Sessions'], summary: 'Create note in live session' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const body = request.body as any;
        const result = await liveSessionService.createNote(id, body, request.user);
        return reply.status(201).send(result);
      },
    });

    protectedRoutes.put('/live-sessions/:id/notes/:noteId', {
      preHandler: [checkPermission('live_sessions:write')],
      schema: { tags: ['Admin Live Sessions'], summary: 'Update note in live session' },
      handler: async (request, reply) => {
        const { id, noteId } = request.params as { id: string; noteId: string };
        const body = request.body as any;
        const result = await liveSessionService.updateNote(id, noteId, body, request.user);
        return reply.status(200).send(result);
      },
    });

    protectedRoutes.delete('/live-sessions/:id/notes/:noteId', {
      preHandler: [checkPermission('live_sessions:delete')],
      schema: { tags: ['Admin Live Sessions'], summary: 'Delete note in live session' },
      handler: async (request, reply) => {
        const { id, noteId } = request.params as { id: string; noteId: string };
        const result = await liveSessionService.deleteNote(id, noteId, request.user);
        return reply.status(200).send(result);
      },
    });

    // 6. Observations Endpoints
    protectedRoutes.post('/live-sessions/:id/observations', {
      preHandler: [checkPermission('live_sessions:write')],
      schema: { tags: ['Admin Live Sessions'], summary: 'Add observation tag in live session' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const body = request.body as any;
        const result = await liveSessionService.addObservation(id, body, request.user);
        return reply.status(201).send(result);
      },
    });

    protectedRoutes.delete('/live-sessions/:id/observations/:obsId', {
      preHandler: [checkPermission('live_sessions:delete')],
      schema: { tags: ['Admin Live Sessions'], summary: 'Remove observation from live session' },
      handler: async (request, reply) => {
        const { id, obsId } = request.params as { id: string; obsId: string };
        const result = await liveSessionService.removeObservation(id, obsId, request.user);
        return reply.status(200).send(result);
      },
    });

    // 7. Client Session History
    protectedRoutes.get('/live-sessions/clients/:userId/history', {
      preHandler: [checkPermission('live_sessions:read')],
      schema: { tags: ['Admin Live Sessions'], summary: 'Get past session history for a client' },
      handler: async (request, reply) => {
        const { userId } = request.params as { userId: string };
        const result = await liveSessionService.getClientSessionHistory(userId, request.user);
        return reply.status(200).send(result);
      },
    });

    // ----------------------------------------------------
    // CONSULTATION BOOKING MANAGEMENT (PHASE 5)
    // ----------------------------------------------------

    // List Bookings
    protectedRoutes.get('/consultations', {
      preHandler: [checkPermission('live_sessions:read')],
      schema: { tags: ['Admin Consultations'], summary: 'List all consultation bookings' },
      handler: async (request, reply) => {
        const query = request.query as any;
        const result = await consultationsService.adminListBookings(query);
        return reply.status(200).send({ statusCode: 200, success: true, data: result });
      },
    });

    // Get Booking Details
    protectedRoutes.get('/consultations/:id', {
      preHandler: [checkPermission('live_sessions:read')],
      schema: { tags: ['Admin Consultations'], summary: 'Get booking details by ID' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const result = await consultationsService.getBookingById(request.user.id, id, true);
        return reply.status(200).send({ statusCode: 200, success: true, data: result });
      },
    });

    // Start Live Session for Booking
    protectedRoutes.post('/consultations/:id/start-session', {
      preHandler: [checkPermission('live_sessions:write')],
      schema: { tags: ['Admin Consultations'], summary: 'Start a Live Session associated with a consultation booking' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const result = await consultationsService.adminStartLiveSession(request.user, id);
        return reply.status(201).send({ statusCode: 201, success: true, data: result });
      },
    });

    // Admin Reschedule
    protectedRoutes.post('/consultations/:id/reschedule', {
      preHandler: [checkPermission('live_sessions:write')],
      schema: { tags: ['Admin Consultations'], summary: 'Admin reschedule consultation booking' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const body = request.body as any;
        const result = await consultationsService.rescheduleBooking(request.user.id, id, body, true);
        return reply.status(200).send({ statusCode: 200, success: true, data: result });
      },
    });

    // Admin Cancel
    protectedRoutes.post('/consultations/:id/cancel', {
      preHandler: [checkPermission('live_sessions:write')],
      schema: { tags: ['Admin Consultations'], summary: 'Admin cancel consultation booking' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const body = request.body as any;
        const result = await consultationsService.cancelBooking(request.user.id, id, body?.reason, true);
        return reply.status(200).send({ statusCode: 200, success: true, data: result });
      },
    });

    // ----------------------------------------------------
    // COURSE MANAGEMENT & ENTITLEMENTS (PHASE 6)
    // ----------------------------------------------------

    // List all courses (Admin)
    protectedRoutes.get('/courses', {
      preHandler: [checkPermission('dashboard:read')],
      schema: { tags: ['Admin Courses'], summary: 'List courses for admin management' },
      handler: async (request, reply) => {
        const query = request.query as any;
        const result = await coursesService.listCourses(request.user.id, query);
        return reply.status(200).send({ statusCode: 200, success: true, data: result });
      },
    });

    // Grant Course Entitlement
    const grantHandler = async (request: any, reply: any) => {
      const { id } = request.params as { id: string };
      const { userId, expiresAt } = request.body as { userId: string; expiresAt?: string };
      const result = await coursesService.adminGrantEntitlement(
        request.user.id,
        id,
        userId,
        'ADMIN_GRANT',
        expiresAt ? new Date(expiresAt) : undefined
      );
      await adminService.logAction({
        adminId: request.user.id,
        adminEmail: (request.user as any).email || request.user.id,
        action: 'GRANT_COURSE_ENTITLEMENT',
        resource: `course:${id}:user:${userId}`,
        details: JSON.stringify({ courseId: id, targetUserId: userId }),
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return reply.status(200).send({ statusCode: 200, success: true, data: result });
    };

    protectedRoutes.post('/courses/:id/grant-access', {
      preHandler: [checkPermission('entitlements:grant')],
      schema: { tags: ['Admin Courses'], summary: 'Grant course access to user' },
      handler: grantHandler,
    });

    protectedRoutes.post('/courses/:id/grant', {
      preHandler: [checkPermission('entitlements:grant')],
      schema: { tags: ['Admin Courses'], summary: 'Grant course access to user' },
      handler: grantHandler,
    });

    // -------------------------------------------------------------------------
    // Phase 7: Orders & Product Fulfillment
    // -------------------------------------------------------------------------
    protectedRoutes.get('/orders', {
      preHandler: [checkPermission('orders:read')],
      schema: { tags: ['Admin Orders'], summary: 'List customer orders with filtering' },
      handler: async (request, reply) => {
        const query = request.query as any;
        const result = await productsService.adminListOrders(query);
        return reply.status(200).send({ statusCode: 200, success: true, data: result });
      },
    });

    protectedRoutes.put('/orders/:id/fulfillment', {
      preHandler: [checkPermission('orders:fulfill')],
      schema: { tags: ['Admin Orders'], summary: 'Update physical product order fulfillment status' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const body = request.body as any;
        const adminProfile = await adminService.getProfile(request.user.id);
        const result = await productsService.adminUpdateFulfillment(
          { id: request.user.id, email: adminProfile.email },
          id,
          body
        );
        return reply.status(200).send({ statusCode: 200, success: true, data: result });
      },
    });

    protectedRoutes.put('/products/:id/stock', {
      preHandler: [checkPermission('products:manage')],
      schema: { tags: ['Admin Products'], summary: 'Update product inventory stock and availability' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const body = request.body as any;
        const adminProfile = await adminService.getProfile(request.user.id);
        const result = await productsService.adminUpdateStock(
          { id: request.user.id, email: adminProfile.email },
          id,
          body
        );
        return reply.status(200).send({ statusCode: 200, success: true, data: result });
      },
    });

    protectedRoutes.post('/products/entitlements/grant', {
      preHandler: [checkPermission('entitlements:grant')],
      schema: { tags: ['Admin Products'], summary: 'Grant digital product entitlement to user' },
      handler: async (request, reply) => {
        const body = request.body as any;
        const adminProfile = await adminService.getProfile(request.user.id);
        const result = await productsService.adminGrantEntitlement(
          { id: request.user.id, email: adminProfile.email },
          body
        );
        return reply.status(200).send({ statusCode: 200, success: true, data: result });
      },
    });

    protectedRoutes.post('/products/entitlements/:id/revoke', {
      preHandler: [checkPermission('entitlements:revoke')],
      schema: { tags: ['Admin Products'], summary: 'Revoke digital product entitlement' },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const { reason } = (request.body as any) || {};
        const adminProfile = await adminService.getProfile(request.user.id);
        const result = await productsService.adminRevokeEntitlement(
          { id: request.user.id, email: adminProfile.email },
          id,
          reason
        );
        return reply.status(200).send({ statusCode: 200, success: true, data: result });
      },
    });
  });
}

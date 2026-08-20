import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '../../services/prisma.service';

export async function adminRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // Enforce JWT Auth & Admin Authorization for all admin routes
  fastify.addHook('onRequest', fastify.authenticate);
  fastify.addHook('onRequest', fastify.authorize(['ADMIN']));

  // GET /api/v1/admin/users
  fastify.get('/users', {
    schema: {
      tags: ['Admin'],
      summary: 'List all registered users (Admin only)',
      security: [{ bearerAuth: [] }],
    },
    handler: async (_request, reply) => {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { birthProfiles: true, orders: true, reports: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return reply.status(200).send({ users });
    },
  });

  // GET /api/v1/admin/orders
  fastify.get('/orders', {
    schema: {
      tags: ['Admin'],
      summary: 'List all system orders (Admin only)',
      security: [{ bearerAuth: [] }],
    },
    handler: async (_request, reply) => {
      const orders = await prisma.order.findMany({
        include: {
          user: { select: { id: true, email: true } },
          reports: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return reply.status(200).send({ orders });
    },
  });

  // GET /api/v1/admin/stats
  fastify.get('/stats', {
    schema: {
      tags: ['Admin'],
      summary: 'System metrics and domain counts (Admin only)',
      security: [{ bearerAuth: [] }],
    },
    handler: async (_request, reply) => {
      const [totalUsers, totalProfiles, totalOrders, totalReports] = await Promise.all([
        prisma.user.count(),
        prisma.birthProfile.count(),
        prisma.order.count(),
        prisma.report.count(),
      ]);

      return reply.status(200).send({
        stats: {
          totalUsers,
          totalProfiles,
          totalOrders,
          totalReports,
        },
      });
    },
  });
}

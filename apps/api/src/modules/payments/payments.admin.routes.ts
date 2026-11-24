/**
 * Staff refund (owner decision 2026-11-24, open-questions M4: refunds are staff-only).
 *
 * Registered without a prefix under /api/v1:
 *   POST /admin/payments/orders/:id/refund   permission payments:refund   audit ORDER_REFUND_ISSUED
 *
 * The refund itself is `commerceService.requestRefund` (balance check, idempotency key, gateway
 * call, order and fulfilment state). This route adds the permission check and the audit entry.
 */
import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { adminService } from '../admin/admin.service';
import { checkPermission } from '../admin/rbac/check-permission';
import { paymentsService } from './payments.service';

export const adminRefundParamsSchema = z.object({ id: z.string().uuid('Invalid order id') });

export const adminRefundBodySchema = z.object({
  /** INR paise; omitted = everything still refundable on the order. */
  amountPaise: z.number().int().positive().optional(),
  /** Why the refund is made. Required for staff: it is the only explanation the audit trail carries. */
  reason: z.string().trim().min(3, 'A reason is required').max(500),
  /** Repeating a request with the same key returns the first refund instead of issuing another. */
  idempotencyKey: z.string().min(4).max(128).optional(),
});

export type AdminRefundBody = z.infer<typeof adminRefundBodySchema>;

export function staffActor(request: FastifyRequest): { id: string; role: string; email: string | null } {
  return {
    id: request.user.id,
    role: request.user.role,
    email: (request.user as { email?: string }).email ?? null,
  };
}

/**
 * Issues the refund and writes the audit entry. Shared with the booking payment-conflict action so
 * both staff refund paths behave the same.
 */
export async function issueStaffRefund(
  request: FastifyRequest,
  orderId: string,
  body: AdminRefundBody,
  context?: string
) {
  const actor = staffActor(request);
  try {
    const result = await paymentsService.refundAsStaff({ ...body, orderId }, actor);
    await adminService.logAction({
      adminId: actor.id,
      adminEmail: actor.email || actor.id,
      action: 'ORDER_REFUND_ISSUED',
      resource: `Order:${orderId}`,
      details: `Refund ${result.refund.id} of ${result.refund.amount} paise, status ${result.refund.status}. Order is now ${result.order.status}. Reason: ${body.reason}${context ? `. ${context}` : ''}`,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    return result;
  } catch (err) {
    await adminService.logAction({
      adminId: actor.id,
      adminEmail: actor.email || actor.id,
      action: 'ORDER_REFUND_REFUSED',
      resource: `Order:${orderId}`,
      details: `Refund of ${body.amountPaise ?? 'the refundable balance'} paise was not issued: ${err instanceof Error ? err.message : 'unknown error'}${context ? `. ${context}` : ''}`,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    throw err;
  }
}

export async function paymentsAdminRoutes(fastify: FastifyInstance) {
  await fastify.register(async (admin) => {
    admin.addHook('onRequest', fastify.authenticate);
    admin.addHook('onRequest', fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']));

    admin.post('/admin/payments/orders/:id/refund', {
      schema: {
        tags: ['Admin Payments'],
        summary: 'Refund a paid order, in full or in part (staff only)',
        security: [{ bearerAuth: [] }],
      },
      preHandler: [checkPermission('payments:refund')],
      handler: async (request, reply) => {
        const { id } = adminRefundParamsSchema.parse(request.params);
        const body = adminRefundBodySchema.parse(request.body ?? {});
        const result = await issueStaffRefund(request, id, body);
        return reply.status(200).send(result);
      },
    });
  });
}

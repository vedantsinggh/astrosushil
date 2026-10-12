import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import crypto from 'crypto';
import { prisma } from '../../services/prisma.service';
import { paymentService } from '../../services/payment.service';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { OrderStatus, PaymentStatus, RefundStatus, BookingStatus, SlotStatus, ConsultationMode, FulfillmentStatus, OrderItemType, FulfillmentType, EntitlementSource, EntitlementStatus } from '@prisma/client';

export async function webhooksRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // POST /api/v1/webhooks/razorpay (Public webhook with mandatory HMAC-SHA256 signature verification)
  fastify.post('/razorpay', {
    schema: {
      tags: ['Webhooks'],
      summary: 'Razorpay webhook listener with signature verification and deduplication',
    },
    handler: async (request, reply) => {
      const signature = request.headers['x-razorpay-signature'] as string | undefined;
      const rawBody = (request as any).rawBody || (typeof request.body === 'string' ? request.body : JSON.stringify(request.body));

      if (!signature) {
        logger.warn('Razorpay webhook received without x-razorpay-signature header');
        return reply.status(400).send({
          error: {
            code: 'WEBHOOK_SIGNATURE_MISSING',
            message: 'Missing x-razorpay-signature header',
          },
        });
      }

      // 1. Verify webhook signature against raw request body
      const isValid = paymentService.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        logger.warn('Razorpay webhook signature verification failed');
        return reply.status(400).send({
          error: {
            code: 'WEBHOOK_SIGNATURE_INVALID',
            message: 'Invalid webhook signature',
          },
        });
      }

      const payload = request.body as any;
      if (!payload || !payload.event) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_PAYLOAD',
            message: 'Invalid webhook payload structure',
          },
        });
      }

      // 2. Deduplication check: compute unique event ID
      const eventId =
        payload.event_id ||
        payload.id ||
        crypto.createHash('sha256').update(rawBody).digest('hex');

      const existingEvent = await prisma.webhookEvent.findUnique({
        where: { eventId },
      });

      if (existingEvent) {
        logger.info({ eventId, event: payload.event }, 'Webhook event already processed (idempotent duplicate)');
        return reply.status(200).send({ status: 'ok', message: 'Event already processed', duplicate: true, received: true });
      }

      // 3. Process event according to lifecycle state machine
      try {
        if (payload.event === 'payment.captured') {
          const razorpayOrderId = payload.payload?.payment?.entity?.order_id;
          const razorpayPaymentId = payload.payload?.payment?.entity?.id;
          const capturedAmount = payload.payload?.payment?.entity?.amount;

          if (razorpayOrderId) {
            const order = await prisma.order.findUnique({
              where: { razorpayOrderId },
              include: { items: true },
            });

            if (order) {
              // Verify amount matches server order amount
              if (capturedAmount && order.amount !== capturedAmount) {
                logger.error(
                  { orderId: order.id, expected: order.amount, actual: capturedAmount },
                  'Webhook payment amount mismatch'
                );
              }

              // Update order to PAID if not already paid or in terminal state
              if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.CANCELLED) {
                await prisma.order.update({
                  where: { id: order.id },
                  data: {
                    status: OrderStatus.PAID,
                    paymentStatus: PaymentStatus.CAPTURED,
                    razorpayPaymentId: razorpayPaymentId || order.razorpayPaymentId,
                  },
                });
                logger.info({ orderId: order.id, razorpayOrderId }, 'Order marked PAID via webhook payment.captured');

                // Auto-confirm linked consultation booking if any
                const linkedBooking = await prisma.consultationBooking.findFirst({
                  where: { orderId: order.id },
                });

                if (linkedBooking && linkedBooking.status === BookingStatus.PENDING_PAYMENT) {
                  const slot = await prisma.appointmentSlot.findFirst({
                    where: { bookingId: linkedBooking.id },
                  });

                  // Late webhook check: ensure slot was not re-allocated
                  if (slot) {
                    await prisma.consultationBooking.update({
                      where: { id: linkedBooking.id },
                      data: {
                        status: BookingStatus.CONFIRMED,
                        confirmedAt: new Date(),
                        reservationExpiresAt: null,
                        meetingLink: linkedBooking.mode === ConsultationMode.IN_PERSON
                          ? null
                          : `https://meet.astrosushil.com/consult-${linkedBooking.id.substring(0, 8)}`,
                      },
                    });
                    await prisma.appointmentSlot.update({
                      where: { id: slot.id },
                      data: { status: SlotStatus.BOOKED, lockedUntil: null },
                    });
                    await prisma.order.update({
                      where: { id: order.id },
                      data: { fulfillmentStatus: FulfillmentStatus.SCHEDULED },
                    });
                    logger.info({ bookingId: linkedBooking.id }, 'Linked consultation booking CONFIRMED via webhook');
                  } else {
                    logger.warn({ bookingId: linkedBooking.id }, 'Slot no longer assigned to booking on late webhook confirmation');
                  }
                }

                // Auto-grant linked course entitlements if any
                const courseItems = order.items?.filter((item) => item.itemType === OrderItemType.COURSE) || [];
                for (const item of courseItems) {
                  const course = await prisma.course.findFirst({
                    where: {
                      OR: [{ sku: item.catalogId }, { id: item.catalogId }, { slug: item.catalogId }],
                    },
                  });

                  if (course) {
                    await prisma.courseEntitlement.upsert({
                      where: {
                        userId_courseId: {
                          userId: order.userId,
                          courseId: course.id,
                        },
                      },
                      update: {
                        status: EntitlementStatus.ACTIVE,
                        orderId: order.id,
                        updatedAt: new Date(),
                      },
                      create: {
                        userId: order.userId,
                        courseId: course.id,
                        orderId: order.id,
                        source: EntitlementSource.PURCHASE,
                        status: EntitlementStatus.ACTIVE,
                      },
                    });
                    logger.info({ userId: order.userId, courseId: course.id }, 'Course entitlement granted via webhook payment.captured');
                  }
                }

                if (courseItems.length > 0) {
                  await prisma.order.update({
                    where: { id: order.id },
                    data: { fulfillmentStatus: FulfillmentStatus.FULFILLED },
                  });
                }

                // Auto-fulfill linked products (digital entitlements & stock decrement)
                const productItems = order.items?.filter((item) => item.itemType === OrderItemType.PRODUCT) || [];
                for (const item of productItems) {
                  const product = await prisma.product.findFirst({
                    where: {
                      OR: [{ catalogId: item.catalogId }, { id: item.catalogId }, { slug: item.catalogId }],
                    },
                  });

                  if (product) {
                    if (product.requiresShipping) {
                      if (product.stock > 0) {
                        await prisma.product.update({
                          where: { id: product.id },
                          data: { stock: { decrement: Math.min(item.quantity, product.stock) } },
                        });
                      }
                    } else {
                      const existingEntitlement = await prisma.digitalProductEntitlement.findFirst({
                        where: {
                          userId: order.userId,
                          productId: product.id,
                          orderId: order.id,
                        },
                      });

                      if (!existingEntitlement) {
                        await prisma.digitalProductEntitlement.create({
                          data: {
                            userId: order.userId,
                            productId: product.id,
                            orderId: order.id,
                            source: EntitlementSource.PURCHASE,
                            status: EntitlementStatus.ACTIVE,
                            assetKey: (product.metadata as any)?.digitalAssetKey || product.imageUrl,
                            bundleAssets: (product.metadata as any)?.bundleAssets || null,
                          },
                        });
                        logger.info({ userId: order.userId, productId: product.id }, 'Digital product entitlement granted via webhook');
                      }
                    }
                  }
                }

                if (productItems.length > 0) {
                  const hasPhysical = productItems.some((item) => item.fulfillmentType === FulfillmentType.PHYSICAL);
                  await prisma.order.update({
                    where: { id: order.id },
                    data: {
                      fulfillmentStatus: hasPhysical ? FulfillmentStatus.PROCESSING : FulfillmentStatus.FULFILLED,
                    },
                  });
                }
              }
            }
          }
        } else if (payload.event === 'payment.failed') {
          const razorpayOrderId = payload.payload?.payment?.entity?.order_id;
          if (razorpayOrderId) {
            const order = await prisma.order.findUnique({
              where: { razorpayOrderId },
            });

            if (order && order.status === OrderStatus.PENDING) {
              await prisma.order.update({
                where: { id: order.id },
                data: {
                  status: OrderStatus.FAILED,
                  paymentStatus: PaymentStatus.FAILED,
                },
              });
              logger.info({ orderId: order.id, razorpayOrderId }, 'Order marked FAILED via webhook payment.failed');

              // Release linked consultation booking slot on payment failure
              const linkedBooking = await prisma.consultationBooking.findFirst({
                where: { orderId: order.id },
              });

              if (linkedBooking && linkedBooking.status === BookingStatus.PENDING_PAYMENT) {
                await prisma.consultationBooking.update({
                  where: { id: linkedBooking.id },
                  data: {
                    status: BookingStatus.CANCELLED,
                    cancellationReason: 'PAYMENT_FAILED',
                  },
                });
                await prisma.appointmentSlot.updateMany({
                  where: { bookingId: linkedBooking.id },
                  data: { status: SlotStatus.AVAILABLE, bookingId: null, lockedUntil: null },
                });
                logger.info({ bookingId: linkedBooking.id }, 'Released consultation booking slot on webhook payment.failed');
              }
            }
          }
        } else if (payload.event === 'refund.processed') {
          const refundEntity = payload.payload?.refund?.entity;
          const paymentId = refundEntity?.payment_id;
          const refundId = refundEntity?.id;
          const refundAmount = refundEntity?.amount;

          if (paymentId) {
            const order = await prisma.order.findFirst({
              where: { razorpayPaymentId: paymentId },
              include: { refunds: true },
            });

            if (order) {
              const existingRefund = order.refunds.find((r) => r.razorpayRefundId === refundId);
              if (!existingRefund && refundId) {
                await prisma.refund.create({
                  data: {
                    orderId: order.id,
                    razorpayRefundId: refundId,
                    razorpayPaymentId: paymentId,
                    amount: refundAmount || 0,
                    status: RefundStatus.PROCESSED,
                    reason: 'Webhook refund.processed',
                  },
                });
              }

              const allRefundsSum =
                order.refunds.reduce((sum, r) => sum + r.amount, 0) + (existingRefund ? 0 : (refundAmount || 0));
              const isFull = allRefundsSum >= order.amount;

              await prisma.order.update({
                where: { id: order.id },
                data: {
                  status: isFull ? OrderStatus.REFUNDED : OrderStatus.PARTIALLY_REFUNDED,
                  paymentStatus: isFull ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
                },
              });

              // Revoke digital entitlements on full refund
              if (isFull) {
                await prisma.digitalProductEntitlement.updateMany({
                  where: { orderId: order.id },
                  data: { status: EntitlementStatus.REVOKED },
                });
              }
            }
          }
        }

        // 4. Record webhook event for deduplication
        await prisma.webhookEvent.create({
          data: {
            eventId,
            eventType: payload.event,
            payload: payload as any,
            status: 'PROCESSED',
          },
        });

        return reply.status(200).send({ status: 'ok', received: true });
      } catch (processingErr) {
        logger.error({ err: processingErr, eventId }, 'Error processing webhook event');
        return reply.status(500).send({
          error: {
            code: 'WEBHOOK_PROCESSING_ERROR',
            message: 'Failed to process webhook event',
          },
        });
      }
    },
  });

  // POST /api/v1/webhooks/whatsapp (Public webhook)
  fastify.post('/whatsapp', {
    schema: {
      tags: ['Webhooks'],
      summary: 'Meta WhatsApp Business API webhook receiver',
    },
    handler: async (request, reply) => {
      request.log.info({ body: request.body }, 'WhatsApp Webhook received');
      return reply.status(200).send({ status: 'ok', received: true });
    },
  });

  // GET /api/v1/webhooks/whatsapp (Meta webhook verification challenge)
  fastify.get('/whatsapp', {
    schema: {
      tags: ['Webhooks'],
      summary: 'Meta WhatsApp webhook verification challenge endpoint',
    },
    handler: async (request, reply) => {
      const query = request.query as any;
      const mode = query['hub.mode'];
      const token = query['hub.verify_token'];
      const challenge = query['hub.challenge'];

      const isProduction = config.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';
      // In production mode, challenge MUST fail if WHATSAPP_VERIFY_TOKEN is unset
      const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || (!isProduction ? 'astro_verify_token' : undefined);

      if (mode === 'subscribe' && expectedToken && token === expectedToken) {
        return reply.status(200).send(challenge);
      }

      return reply.status(403).send({ error: 'Verification failed' });
    },
  });
}

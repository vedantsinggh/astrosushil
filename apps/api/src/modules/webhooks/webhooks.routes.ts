import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import crypto from 'crypto';
import { prisma } from '../../services/prisma.service';
import { paymentService } from '../../services/payment.service';
import { fulfillmentService } from '../fulfillment/fulfillment.service';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { recordCaptureForCancelledOrder, settleOrderPaid } from '../commerce/money/settlement';
import { shopOrdersService } from '../shop-orders/shop-orders.service';
import { transactionsService } from '../transactions/transactions.service';
import { OrderStatus, PaymentStatus, RefundStatus, BookingStatus, SlotStatus, ConsultationMode, FulfillmentStatus, FulfillmentUnitStatus, OrderItemType, EntitlementSource, EntitlementStatus } from '@prisma/client';

/**
 * What `payment.captured` did with the order, decided under the order row lock:
 *   claimed          this event marked the order paid and applied everything a paid order triggers;
 *   already-settled  the customer's own verification (or an earlier event) got there first;
 *   cancelled        the order was cancelled before the money arrived: not marked paid, the
 *                    payment recorded in the ledger for staff (see `recordCaptureForCancelledOrder`).
 */
type CaptureOutcome = 'claimed' | 'already-settled' | 'cancelled';

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
          const paymentCurrency = payload.payload?.payment?.entity?.currency;

          if (razorpayOrderId) {
            const order = await prisma.order.findUnique({
              where: { razorpayOrderId },
              include: { items: true },
            });

            if (order) {
              // What the gateway was asked to charge: the paid currency and its minor-unit amount
              // (orders paid in INR have no separate paid amount; `amount` is it).
              const expectedAmount = order.paidAmountMinor ?? order.amount;
              const expectedCurrency = order.paidCurrency || order.currency;
              const isProductionEnv = config.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';

              // 0. In production a capture event must state its amount and currency.
              if (isProductionEnv && (typeof capturedAmount !== 'number' || !paymentCurrency)) {
                logger.error({ orderId: order.id }, 'Webhook payment.captured without amount or currency: Rejecting capture transition');
                return reply.status(400).send({
                  error: {
                    code: 'PAYMENT_AMOUNT_MISSING',
                    message: 'Captured payment amount and currency are required',
                  },
                });
              }

              // 1. Verify amount matches server order amount strictly
              if (capturedAmount !== undefined && capturedAmount !== null && expectedAmount !== capturedAmount) {
                logger.error(
                  { orderId: order.id, expected: expectedAmount, actual: capturedAmount },
                  'Webhook payment amount mismatch: Rejecting capture transition'
                );
                return reply.status(400).send({
                  error: {
                    code: 'PAYMENT_AMOUNT_MISMATCH',
                    message: `Captured payment amount (${capturedAmount}) does not match order amount (${expectedAmount})`,
                  },
                });
              }

              // 2. Verify currency matches server order currency strictly
              if (paymentCurrency && expectedCurrency !== paymentCurrency) {
                logger.error(
                  { orderId: order.id, expected: expectedCurrency, actual: paymentCurrency },
                  'Webhook payment currency mismatch: Rejecting capture transition'
                );
                return reply.status(400).send({
                  error: {
                    code: 'PAYMENT_CURRENCY_MISMATCH',
                    message: `Captured payment currency (${paymentCurrency}) does not match order currency (${expectedCurrency})`,
                  },
                });
              }

              // 3. Out-of-order & terminal state protection: Never transition terminal states.
              // REFUNDED: the payment this event reports was already settled and given back; nothing to do.
              // CANCELLED is handled under the row lock below: the order stays cancelled and the
              // captured money is recorded in the ledger for staff instead of being dropped.
              if (order.status === OrderStatus.REFUNDED) {
                logger.warn({ orderId: order.id, status: order.status }, 'Webhook payment.captured received for terminal order; skipping transition');
                return reply.status(200).send({ status: 'ok', message: 'Order in terminal state, ignoring capture', received: true });
              }

              const hasProductItems = order.items.some((item) => item.itemType === OrderItemType.PRODUCT);

              // 4. Idempotent check: If order is already PAID, return cleanly and ensure units exist idempotently
              if (order.status === OrderStatus.PAID) {
                await fulfillmentService.createFulfillmentUnitsForOrder(order.id);
                await fulfillmentService.reconcileOrderFulfillment(order.id);
                logger.info({ orderId: order.id }, 'Order already PAID; webhook payment.captured idempotent confirmation');
                return reply.status(200).send({ status: 'ok', message: 'Order already paid', received: true, duplicate: true });
              }

              // 5. Transactionally safe transition using Global Lock Hierarchy: orders -> order_items -> fulfillment_units
              const outcome = await prisma.$transaction(async (tx): Promise<CaptureOutcome> => {
                // Lock order FIRST
                const lockedOrders = await tx.$queryRaw<Array<{ id: string; status: OrderStatus }>>`
                  SELECT id, status FROM "orders" WHERE id = ${order.id} FOR UPDATE;
                `;
                const lockedStatus = lockedOrders[0]?.status;
                if (lockedStatus === OrderStatus.CANCELLED) {
                  // A cancelled order is never marked paid by a late capture (it may have been
                  // cancelled after the read above, too). The money is recorded, not dropped.
                  await recordCaptureForCancelledOrder(tx, order.id, {
                    gatewayPaymentId: razorpayPaymentId || null,
                    gatewayOrderId: razorpayOrderId,
                    raw: payload.payload?.payment?.entity,
                  });
                  return 'cancelled';
                }
                if (lockedStatus !== OrderStatus.PENDING && lockedStatus !== OrderStatus.FAILED) {
                  // PAID: concurrently verified by direct verify. Fulfilled or refunded meanwhile:
                  // already settled once; a capture never moves such an order back to PAID.
                  return 'already-settled';
                }

                // Lock orderItems SECOND
                await tx.$queryRaw`
                  SELECT id FROM "order_items" WHERE "orderId" = ${order.id} ORDER BY id ASC FOR UPDATE;
                `;

                // Update order to PAID, CAPTURED, paidAt
                await tx.$executeRaw`
                  UPDATE "orders"
                  SET
                    status = 'PAID'::"OrderStatus",
                    "paymentStatus" = 'CAPTURED'::"PaymentStatus",
                    "paidAt" = COALESCE("paidAt", clock_timestamp()),
                    "version" = version + 1,
                    "razorpayPaymentId" = COALESCE("razorpayPaymentId", ${razorpayPaymentId || null}),
                    "updatedAt" = clock_timestamp()
                  WHERE id = ${order.id};
                `;

                // Atomically create fulfillment units for this order
                await fulfillmentService.createFulfillmentUnitsForOrder(order.id, tx);

                // Product lines: stock (variants included), download entitlements, coupon use, saved
                // cart and website status, through the same function the customer's own verification
                // calls, inside this paying transaction. Whichever of the two wins the race, the
                // result is the same, and `ShopOrder.paidEffectsApplied` makes it happen once.
                if (hasProductItems) {
                  await shopOrdersService.applyPaidEffects(tx, order.id);
                }

                await fulfillmentService.reconcileOrderFulfillment(order.id, tx);

                // Money: ledger transaction -> SUCCESS and the invoice number, in this same
                // transaction. The order row lock above lets only one of verify / webhook claim it.
                await settleOrderPaid(tx, order.id, {
                  gatewayPaymentId: razorpayPaymentId || null,
                  gatewayOrderId: razorpayOrderId,
                  raw: payload.payload?.payment?.entity,
                });
                return 'claimed';
              });

              if (outcome === 'cancelled') {
                logger.error(
                  { orderId: order.id, razorpayOrderId },
                  'Webhook payment.captured for a cancelled order: order left cancelled, payment recorded for staff'
                );
              } else {
              if (outcome === 'claimed') {
                logger.info({ orderId: order.id, razorpayOrderId }, 'Order marked PAID via webhook payment.captured');
                // Shop order: tell the customer (website channels) once, by the path that claimed
                // the payment. Never throws.
                if (hasProductItems) {
                  await shopOrdersService.notifyOrderStatus(order.id);
                }
              }

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
                        meetingLink: null,
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

                // Products are not handled here any more: stock, downloads, coupon, cart and status
                // were applied inside the paying transaction (shopOrdersService.applyPaidEffects).
              }
              }
            }
          } else if (payload.event === 'payment.failed') {
          const razorpayOrderId = payload.payload?.payment?.entity?.order_id;
          if (razorpayOrderId) {
            const order = await prisma.order.findUnique({
              where: { razorpayOrderId },
              include: { items: { select: { itemType: true } } },
            });

            // Conditional on the status still being PENDING, so a failure event that arrives while
            // the customer's verification is marking the order paid cannot overwrite PAID.
            const failed =
              order && order.status === OrderStatus.PENDING
                ? await prisma.order.updateMany({
                    where: { id: order.id, status: OrderStatus.PENDING },
                    data: {
                      status: OrderStatus.FAILED,
                      paymentStatus: PaymentStatus.FAILED,
                    },
                  })
                : { count: 0 };

            if (order && failed.count === 1) {
              await transactionsService.markOrderFailed(order.id, {
                gatewayPaymentId: payload.payload?.payment?.entity?.id,
                raw: payload.payload?.payment?.entity,
              });
              // Product order: website status -> payment_failed and the coupon hold is freed.
              if (order.items.some((item) => item.itemType === OrderItemType.PRODUCT)) {
                await shopOrdersService.markPaymentFailed(order.id);
              }
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
                order.refunds
                  .filter((r) => r.status !== RefundStatus.FAILED)
                  .reduce((sum, r) => sum + r.amount, 0) + (existingRefund ? 0 : (refundAmount || 0));
              const isFull = allRefundsSum >= order.amount;

              await prisma.order.update({
                where: { id: order.id },
                data: {
                  status: isFull ? OrderStatus.REFUNDED : OrderStatus.PARTIALLY_REFUNDED,
                  paymentStatus: isFull ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
                },
              });

              // Revoke digital entitlements and cancel unfulfilled units on full refund
              if (isFull) {
                await prisma.digitalProductEntitlement.updateMany({
                  where: { orderId: order.id },
                  data: { status: EntitlementStatus.REVOKED },
                });
                await prisma.fulfillmentUnit.updateMany({
                  where: {
                    orderId: order.id,
                    status: { in: [FulfillmentUnitStatus.UNFULFILLED, FulfillmentUnitStatus.PROCESSING] },
                  },
                  data: {
                    status: FulfillmentUnitStatus.CANCELLED,
                    cancelledAt: new Date(),
                  },
                });
                await prisma.report.updateMany({
                  where: {
                    orderId: order.id,
                    status: { notIn: ['COMPLETED'] },
                  },
                  data: {
                    status: 'FAILED',
                    stage: 'FAILED',
                    errorCode: 'ORDER_REFUNDED',
                    errorMessage: 'Order was refunded; report generation cancelled.',
                    claimToken: null,
                    claimExpiresAt: null,
                    claimVersion: { increment: 1 },
                    failedAt: new Date(),
                    updatedAt: new Date(),
                  },
                });
                await fulfillmentService.reconcileOrderFulfillment(order.id);
              }
            }
          }
        } else if (payload.event === 'refund.failed') {
          const refundEntity = payload.payload?.refund?.entity;
          const refundId = refundEntity?.id;
          if (refundId) {
            await prisma.refund.updateMany({
              where: { razorpayRefundId: refundId },
              data: { status: RefundStatus.FAILED },
            });
            logger.warn({ refundId }, 'Refund marked FAILED via webhook refund.failed');
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

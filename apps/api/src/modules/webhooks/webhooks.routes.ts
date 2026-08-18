import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '../../services/prisma.service';

export async function webhooksRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // POST /api/v1/webhooks/razorpay (Public webhook)
  fastify.post('/razorpay', {
    schema: {
      tags: ['Webhooks'],
      summary: 'Razorpay webhook payment status listener',
    },
    handler: async (request, reply) => {
      const payload = request.body as any;
      
      // Process payment.captured event
      if (payload && payload.event === 'payment.captured') {
        const razorpayOrderId = payload.payload?.payment?.entity?.order_id;
        const razorpayPaymentId = payload.payload?.payment?.entity?.id;

        if (razorpayOrderId) {
          await prisma.order.updateMany({
            where: { razorpayOrderId },
            data: {
              status: 'PAID',
              razorpayPaymentId,
            },
          });
        }
      }

      return reply.status(200).send({ status: 'ok', received: true });
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

      if (mode === 'subscribe' && token === (process.env.WHATSAPP_VERIFY_TOKEN || 'astro_verify_token')) {
        return reply.status(200).send(challenge);
      }

      return reply.status(403).send({ error: 'Verification failed' });
    },
  });
}

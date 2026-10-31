import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { authRoutes } from '../modules/auth/auth.routes';
import { usersRoutes } from '../modules/users/users.routes';
import { birthProfilesRoutes } from '../modules/birth-profiles/birth-profiles.routes';
import { astrologyRoutes } from '../modules/astrology/astrology.routes';
import { rashiBhavishyaRoutes } from '../modules/rashi-bhavishya/rashi-bhavishya.routes';
import { vastuRoutes } from '../modules/vastu/vastu.routes';
import { guptaNadiRoutes } from '../modules/gupta-nadi/gupta-nadi.routes';
import { predictionsRoutes } from '../modules/predictions/predictions.routes';
import { paymentsRoutes } from '../modules/payments/payments.routes';
import { webhooksRoutes } from '../modules/webhooks/webhooks.routes';
import { reportsRoutes } from '../modules/reports/reports.routes';
import { adminRoutes } from '../modules/admin/admin.routes';
import { notificationsRoutes } from '../modules/notifications/notifications.routes';
import { jyotiRoutes } from '../modules/jyoti/jyoti.routes';
import { locationsRoutes } from '../modules/locations/locations.routes';
import { consultationsRoutes } from '../modules/consultations/consultations.routes';
import { coursesRoutes } from '../modules/courses/courses.routes';
import { productsRoutes } from '../modules/products/products.routes';
import { accountRoutes } from '../modules/products/account.routes';

export async function registerRoutes(app: FastifyInstance) {
  // Register health route at root level /health
  await app.register(healthRoutes);

  // Register versioned API routes under /api/v1/
  await app.register(
    async (v1) => {
      await v1.register(healthRoutes);
      await v1.register(authRoutes, { prefix: '/auth' });
      await v1.register(usersRoutes, { prefix: '/users' });
      await v1.register(birthProfilesRoutes, { prefix: '/birth-profiles' });
      await v1.register(locationsRoutes, { prefix: '/locations' });
      await v1.register(astrologyRoutes, { prefix: '/astrology' });
      await v1.register(rashiBhavishyaRoutes, { prefix: '/rashi-bhavishya' });
      await v1.register(vastuRoutes, { prefix: '/vastu' });
      await v1.register(guptaNadiRoutes, { prefix: '/gupta-nadi' });
      await v1.register(predictionsRoutes, { prefix: '/predictions' });
      await v1.register(paymentsRoutes, { prefix: '/payments' });
      await v1.register(webhooksRoutes, { prefix: '/webhooks' });
      await v1.register(reportsRoutes, { prefix: '/reports' });
      await v1.register(consultationsRoutes, { prefix: '/consultations' });
      await v1.register(consultationsRoutes, { prefix: '/consultation' });
      await v1.register(coursesRoutes, { prefix: '/courses' });
      await v1.register(coursesRoutes, { prefix: '/course' });
      await v1.register(productsRoutes, { prefix: '/products' });
      await v1.register(productsRoutes, { prefix: '/shop' });
      await v1.register(accountRoutes, { prefix: '/account' });
      await v1.register(adminRoutes, { prefix: '/admin' });
      await v1.register(notificationsRoutes, { prefix: '/notifications' });
      await v1.register(jyotiRoutes, { prefix: '/jyoti' });
    },
    { prefix: '/api/v1' }
  );
}


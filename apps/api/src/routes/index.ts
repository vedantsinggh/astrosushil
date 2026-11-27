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
import { paymentsAdminRoutes } from '../modules/payments/payments.admin.routes';
import { webhooksRoutes } from '../modules/webhooks/webhooks.routes';
import { reportsRoutes } from '../modules/reports/reports.routes';
import { adminRoutes } from '../modules/admin/admin.routes';
import { notificationsRoutes } from '../modules/notifications/notifications.routes';
import { jyotiRoutes } from '../modules/jyoti/jyoti.routes';
import { locationsRoutes } from '../modules/locations/locations.routes';
import { consultationsRoutes } from '../modules/consultations/consultations.routes';
import { bookingsAdminRoutes } from '../modules/bookings/bookings.admin.routes';
import { coursesRoutes } from '../modules/courses/courses.routes';
import { productsRoutes } from '../modules/products/products.routes';
import { accountRoutes } from '../modules/products/account.routes';
import { categoriesRoutes, adminCategoriesRoutes } from '../modules/categories/categories.routes';
import { adminReportCatalogRoutes } from '../modules/commerce/report-catalog.admin';
import { adminProductsRoutes } from '../modules/products/products.admin.routes';
import { cartRoutes } from '../modules/cart/cart.routes';
import { wishlistRoutes } from '../modules/wishlist/wishlist.routes';
import { couponsRoutes, adminCouponsRoutes } from '../modules/coupons/coupons.routes';
import { shopOrdersRoutes, adminShopOrdersRoutes } from '../modules/shop-orders/shop-orders.routes';
import { courseLinksRoutes, adminCourseLinksRoutes } from '../modules/courses/course-links.routes';
import { adminCustomersRoutes } from '../modules/customers/customers.routes';
import { uploadsRoutes } from '../modules/uploads/uploads.routes';
import { contentRoutes } from '../modules/content/content.routes';
import { transactionsRoutes } from '../modules/transactions/transactions.routes';
import { invoicesRoutes } from '../modules/invoices/invoices.routes';
import { businessDashboardRoutes } from '../modules/admin/business-dashboard';
import { appHomeRoutes } from '../modules/app-home/app-home.routes';
import { webAstrologyRoutes } from '../modules/web-astrology/web-astrology.routes';
import { webReportsRoutes } from '../modules/web-astrology/web-reports.routes';
import { exchangeRateService } from '../modules/commerce/money/rates';

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
      await v1.register(paymentsAdminRoutes); // POST /admin/payments/orders/:id/refund (staff only)
      await v1.register(webhooksRoutes, { prefix: '/webhooks' });
      await v1.register(reportsRoutes, { prefix: '/reports' });
      await v1.register(consultationsRoutes, { prefix: '/consultations' });
      await v1.register(consultationsRoutes, { prefix: '/consultation' });
      await v1.register(bookingsAdminRoutes); // /admin/consultation-types, /admin/availability, /admin/bookings
      await v1.register(coursesRoutes, { prefix: '/courses' });
      await v1.register(coursesRoutes, { prefix: '/course' });
      await v1.register(productsRoutes, { prefix: '/products' });
      await v1.register(productsRoutes, { prefix: '/shop' });
      await v1.register(accountRoutes, { prefix: '/account' });
      // shop (website integration): docs/integration/modules/shop.md
      await v1.register(categoriesRoutes, { prefix: '/categories' });
      await v1.register(cartRoutes, { prefix: '/cart' });
      await v1.register(wishlistRoutes, { prefix: '/wishlist' });
      await v1.register(couponsRoutes, { prefix: '/coupons' });
      await v1.register(shopOrdersRoutes, { prefix: '/orders' });
      await v1.register(courseLinksRoutes, { prefix: '/course-links' });
      await v1.register(adminCategoriesRoutes, { prefix: '/admin' }); // /admin/categories
      await v1.register(adminProductsRoutes, { prefix: '/admin' }); // /admin/shop-products
      await v1.register(adminCouponsRoutes, { prefix: '/admin' }); // /admin/coupons
      await v1.register(adminShopOrdersRoutes, { prefix: '/admin' }); // /admin/shop-orders
      await v1.register(adminCourseLinksRoutes, { prefix: '/admin' }); // /admin/course-links
      await v1.register(adminReportCatalogRoutes, { prefix: '/admin' }); // /admin/report-catalogue
      await v1.register(adminCustomersRoutes, { prefix: '/admin' }); // /admin/customers
      await v1.register(adminRoutes, { prefix: '/admin' });
      await v1.register(uploadsRoutes); // POST /admin/uploads, GET /uploads/local/* (dev only)
      await v1.register(appHomeRoutes, { prefix: '/app' }); // GET /app/home (mobile home page)
      await v1.register(contentRoutes); // website CMS: public /banners /blogs /faqs /testimonial /media /inquiry /seo /settings, admin /admin/<same>
      await v1.register(transactionsRoutes); // GET /admin/transactions, /admin/gst-report (+ /export)
      await v1.register(invoicesRoutes); // GET /invoices/orders/:orderId, /admin/invoices/*
      await v1.register(businessDashboardRoutes); // GET /admin/dashboard/business
      // web-astrology (website integration): docs/integration/modules/web-astrology.md
      await v1.register(webAstrologyRoutes, { prefix: '/web/astrology' });
      await v1.register(webAstrologyRoutes, { prefix: '/astrology' }); // website paths: geo-details, generate-kundli, match-making, daily-horoscope
      await v1.register(webReportsRoutes, { prefix: '/web/reports' });
      await v1.register(webReportsRoutes, { prefix: '/report' }); // website paths: /report, /report/slug/:slug, /report/buy, /report/verify-payment, /report/orders
      await v1.register(notificationsRoutes, { prefix: '/notifications' });
      await v1.register(jyotiRoutes, { prefix: '/jyoti' });
      v1.get('/utils/exchange-rates', async (_request, reply) => {
        const snapshot = await exchangeRateService.getPublicRates();
        return reply.status(200).send({
          success: true,
          base: snapshot.base,
          rates: snapshot.rates,
          fetchedAt: snapshot.fetchedAt,
        });
      });
    },
    { prefix: '/api/v1' }
  );
}


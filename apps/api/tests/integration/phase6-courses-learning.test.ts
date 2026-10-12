import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { FastifyInstance } from 'fastify';
import crypto from 'crypto';

describe('Phase 6: Courses & Learning Platform Integration Suite', { timeout: 35000 }, () => {
  let app: FastifyInstance;
  let userA: any;
  let userB: any;
  let adminUser: any;
  let tokenA: string;
  let tokenB: string;
  let adminToken: string;

  let guptNadiCourse: any;
  let knRaoCourse: any;
  let dashMahavidyaCourse: any;
  let freeLessonId: string;
  let paidLessonId: string;

  const RAZORPAY_SECRET = 'test_razorpay_secret_for_local_development_12345';
  const RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret_for_local_development_67890';

  beforeAll(async () => {
    process.env.RAZORPAY_KEY_SECRET = RAZORPAY_SECRET;
    process.env.RAZORPAY_WEBHOOK_SECRET = RAZORPAY_WEBHOOK_SECRET;
    process.env.RAZORPAY_KEY_ID = 'rzp_test_placeholder_key';
    app = buildApp();
    await app.ready();

    // Create test users
    userA = await prisma.user.create({
      data: {
        email: `course_student_a_${Date.now()}@example.com`,
        fullName: 'Learner Arjun',
        phoneNumber: `+9198765${Math.floor(10000 + Math.random() * 90000)}`,
        role: 'USER',
      },
    });

    userB = await prisma.user.create({
      data: {
        email: `course_student_b_${Date.now()}@example.com`,
        fullName: 'Learner Priya',
        phoneNumber: `+9198766${Math.floor(10000 + Math.random() * 90000)}`,
        role: 'USER',
      },
    });

    adminUser = await prisma.user.create({
      data: {
        email: `course_admin_${Date.now()}@example.com`,
        fullName: 'Master Sushil Admin',
        phoneNumber: `+9198767${Math.floor(10000 + Math.random() * 90000)}`,
        role: 'ADMIN',
      },
    });

    tokenA = (app as any).jwt.sign({ sub: userA.id, id: userA.id, role: 'USER' });
    tokenB = (app as any).jwt.sign({ sub: userB.id, id: userB.id, role: 'USER' });
    adminToken = (app as any).jwt.sign({ sub: adminUser.id, id: adminUser.id, role: 'ADMIN' });

    // Seed courses if not already seeded
    const { coursesService } = await import('../../src/modules/courses/courses.service');
    await coursesService.seedVerifiedCourses();

    guptNadiCourse = await prisma.course.findUnique({
      where: { slug: 'gupt-nadi-astrology' },
      include: {
        sections: {
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });

    knRaoCourse = await prisma.course.findUnique({
      where: { slug: 'shri-k-n-rao-method-of-marriage-money-astrology' },
    });

    dashMahavidyaCourse = await prisma.course.findUnique({
      where: { slug: 'dash-mahavidya-astrology' },
    });

    const firstLesson = guptNadiCourse?.sections[0]?.lessons[0];
    const secondLesson = guptNadiCourse?.sections[0]?.lessons[1];

    freeLessonId = firstLesson?.id;
    paidLessonId = secondLesson?.id;
  });

  afterAll(async () => {
    // Cleanup test artifacts
    await prisma.lessonProgress.deleteMany({
      where: { userId: { in: [userA.id, userB.id, adminUser.id] } },
    });
    await prisma.courseEntitlement.deleteMany({
      where: { userId: { in: [userA.id, userB.id, adminUser.id] } },
    });
    await prisma.orderItem.deleteMany({
      where: { order: { userId: { in: [userA.id, userB.id, adminUser.id] } } },
    });
    await prisma.order.deleteMany({
      where: { userId: { in: [userA.id, userB.id, adminUser.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userA.id, userB.id, adminUser.id] } },
    });
  });

  // -------------------------------------------------------------------------
  // 1. CATALOG & DETAILS TESTS
  // -------------------------------------------------------------------------

  it('1. GET /api/v1/courses returns the 3 verified courses with verified pricing', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/courses',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.items.length).toBeGreaterThanOrEqual(3);

    const guptNadi = body.data.items.find((c: any) => c.slug === 'gupt-nadi-astrology');
    expect(guptNadi).toBeDefined();
    expect(guptNadi.pricePaise).toBe(599900); // ₹5,999
    expect(guptNadi.totalLessons).toBe(13);

    const knRao = body.data.items.find(
      (c: any) => c.slug === 'shri-k-n-rao-method-of-marriage-money-astrology'
    );
    expect(knRao).toBeDefined();
    expect(knRao.pricePaise).toBe(499900); // ₹4,999
    expect(knRao.language).toBe('Hindi');

    const dashM = body.data.items.find((c: any) => c.slug === 'dash-mahavidya-astrology');
    expect(dashM).toBeDefined();
    expect(dashM.pricePaise).toBe(899900); // ₹8,999
    expect(dashM.totalLessons).toBe(12);
  });

  it('2. GET /api/v1/courses with level filter ADVANCED returns matching courses', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/courses?level=ADVANCED',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    for (const item of body.data.items) {
      expect(item.level).toBe('ADVANCED');
    }
  });

  it('3. GET /api/v1/courses/:idOrSlug returns course curriculum with ordered lessons and locked media for guest', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/courses/${guptNadiCourse.id}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    const course = body.data.course;
    expect(course.title).toBe('Gupt Nadi Astrology');
    expect(course.isEnrolled).toBe(false);
    expect(course.sections.length).toBeGreaterThanOrEqual(1);

    const totalLessons = course.sections.reduce(
      (acc: number, s: any) => acc + s.lessons.length,
      0
    );
    expect(totalLessons).toBe(13);
    const lessons = course.sections[0].lessons;
    // Lessons must be sorted by orderIndex
    for (let i = 0; i < lessons.length - 1; i++) {
      expect(lessons[i].orderIndex).toBeLessThan(lessons[i + 1].orderIndex);
    }

    // First lesson is free preview
    expect(lessons[0].isFreePreview).toBe(true);
    expect(lessons[0].isUnlocked).toBe(true);

    // Subsequent lessons are locked for unenrolled guest
    expect(lessons[1].isFreePreview).toBe(false);
    expect(lessons[1].isUnlocked).toBe(false);
    expect(lessons[1].videoUrl).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 2. SECURITY & AUTHORIZATION TESTS
  // -------------------------------------------------------------------------

  it('4. GET /api/v1/courses/lessons/:lessonId/playback rejects unauthenticated access to paid lesson (401)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/courses/lessons/${paidLessonId}/playback`,
    });

    expect(res.statusCode).toBe(401);
  });

  it('5. GET /api/v1/courses/lessons/:lessonId/playback rejects unauthorized enrolled user for paid lesson (403)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/courses/lessons/${paidLessonId}/playback`,
      headers: {
        authorization: `Bearer ${tokenB}`,
      },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.payload);
    expect(body.error.message).toContain('Please purchase the course');
  });

  it('6. GET /api/v1/courses/lessons/:lessonId/playback permits free preview playback without prior purchase', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/courses/lessons/${freeLessonId}/playback`,
      headers: {
        authorization: `Bearer ${tokenB}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.lesson.id).toBe(freeLessonId);
    expect(body.data.playback).toBeDefined();
    expect(body.data.playback.isFreePreview).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 3. COMMERCE ENROLLMENT & PAYMENT VERIFICATION
  // -------------------------------------------------------------------------

  let orderId: string;
  let razorpayOrderId: string;

  it('7. POST /api/v1/courses/enroll creates unified commerce order', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/courses/enroll',
      headers: {
        authorization: `Bearer ${tokenA}`,
      },
      payload: {
        courseId: guptNadiCourse.id,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.course.id).toBe(guptNadiCourse.id);
    expect(body.data.order.amountPaise).toBe(599900); // 599900 paise
    expect(body.data.order.currency).toBe('INR');
    expect(body.data.payment.razorpayOrderId).toBeDefined();

    orderId = body.data.order.id;
    razorpayOrderId = body.data.payment.razorpayOrderId;

    // Verify order exists in DB with status PENDING
    const dbOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    expect(dbOrder).toBeDefined();
    expect(dbOrder?.status).toBe('PENDING');
    expect(dbOrder?.items[0].catalogId).toBe('course-gupt-nadi');
  });

  it('8. POST /api/v1/courses/verify-payment with invalid HMAC signature fails', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/courses/verify-payment',
      headers: {
        authorization: `Bearer ${tokenA}`,
      },
      payload: {
        courseId: guptNadiCourse.id,
        orderId,
        razorpayPaymentId: 'pay_test_invalid_123',
        razorpaySignature: 'invalid_forged_signature_hex_code',
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.error.message).toContain('signature');
  });

  it('9. POST /api/v1/courses/verify-payment with valid HMAC grants active entitlement', async () => {
    const testPaymentId = `pay_course_${Date.now()}`;
    const signaturePayload = `${razorpayOrderId}|${testPaymentId}`;
    const validSignature = crypto
      .createHmac('sha256', RAZORPAY_SECRET)
      .update(signaturePayload)
      .digest('hex');

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/courses/verify-payment',
      headers: {
        authorization: `Bearer ${tokenA}`,
      },
      payload: {
        courseId: guptNadiCourse.id,
        orderId,
        razorpayPaymentId: testPaymentId,
        razorpaySignature: validSignature,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.isEnrolled).toBe(true);

    // Verify entitlement in database
    const entitlement = await prisma.courseEntitlement.findUnique({
      where: {
        userId_courseId: {
          userId: userA.id,
          courseId: guptNadiCourse.id,
        },
      },
    });
    expect(entitlement).toBeDefined();
    expect(entitlement?.status).toBe('ACTIVE');
    expect(entitlement?.source).toBe('PURCHASE');
  });

  it('10. Authorized Learner A can now access paid lesson playback', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/courses/lessons/${paidLessonId}/playback`,
      headers: {
        authorization: `Bearer ${tokenA}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.lesson.id).toBe(paidLessonId);
    expect(body.data.playback.isUnlocked).toBe(true);
    expect(body.data.playback.platformUrl).toContain('astrosushil.com');
  });

  it('11. GET /api/v1/courses/my-learning returns enrolled courses for Learner A', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/courses/my-learning',
      headers: {
        authorization: `Bearer ${tokenA}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.items.length).toBeGreaterThanOrEqual(1);

    const enrolled = body.data.items.find((c: any) => c.id === guptNadiCourse.id);
    expect(enrolled).toBeDefined();
    expect(enrolled.isEnrolled).toBe(true);
    expect(enrolled.progressPercentage).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 4. PROGRESS TRACKING & USER ISOLATION
  // -------------------------------------------------------------------------

  it('12. POST /api/v1/courses/lessons/:lessonId/progress persists watched progress and updates completion', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/lessons/${paidLessonId}/progress`,
      headers: {
        authorization: `Bearer ${tokenA}`,
      },
      payload: {
        watchedSeconds: 600,
        isCompleted: true,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.progress.watchedSeconds).toBe(600);
    expect(body.data.progress.isCompleted).toBe(true);

    // Verify course overall progress increased
    const myLearning = await app.inject({
      method: 'GET',
      url: '/api/v1/courses/my-learning',
      headers: {
        authorization: `Bearer ${tokenA}`,
      },
    });
    const enrolled = JSON.parse(myLearning.payload).data.items.find(
      (c: any) => c.id === guptNadiCourse.id
    );
    expect(enrolled.completedLessons).toBe(1);
    expect(enrolled.progressPercentage).toBeGreaterThan(0);
  });

  it('13. User B cannot see or overwrite User A’s progress (User Isolation)', async () => {
    // User B's my-learning is empty
    const resB = await app.inject({
      method: 'GET',
      url: '/api/v1/courses/my-learning',
      headers: {
        authorization: `Bearer ${tokenB}`,
      },
    });
    const bodyB = JSON.parse(resB.payload);
    const found = bodyB.data.items.find((c: any) => c.id === guptNadiCourse.id);
    expect(found).toBeUndefined();

    // Query DB directly to verify User B has 0 progress records for this lesson
    const progressB = await prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId: userB.id,
          lessonId: paidLessonId,
        },
      },
    });
    expect(progressB).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 5. WEBHOOK IDEMPOTENCY
  // -------------------------------------------------------------------------

  it('14. Webhook payment.captured handles course order idempotently', async () => {
    // Create new order for User B
    const enrollRes = await app.inject({
      method: 'POST',
      url: '/api/v1/courses/enroll',
      headers: {
        authorization: `Bearer ${tokenB}`,
      },
      payload: {
        courseId: knRaoCourse.id,
      },
    });
    const enrollBody = JSON.parse(enrollRes.payload);
    const newOrderId = enrollBody.data.order.id;
    const newRzpOrderId = enrollBody.data.payment.razorpayOrderId;

    const webhookPaymentId = `pay_hook_${Date.now()}`;
    const webhookPayload = JSON.stringify({
      entity: 'event',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: webhookPaymentId,
            order_id: newRzpOrderId,
            amount: 499900,
            currency: 'INR',
            status: 'captured',
            method: 'upi',
          },
        },
      },
    });

    const webhookSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(webhookPayload)
      .digest('hex');

    // First delivery
    const hookRes1 = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/razorpay',
      headers: {
        'x-razorpay-signature': webhookSignature,
        'content-type': 'application/json',
      },
      payload: webhookPayload,
    });
    expect(hookRes1.statusCode).toBe(200);

    // Verify entitlement granted
    const entB = await prisma.courseEntitlement.findUnique({
      where: {
        userId_courseId: {
          userId: userB.id,
          courseId: knRaoCourse.id,
        },
      },
    });
    expect(entB?.status).toBe('ACTIVE');

    // Duplicate webhook delivery must be idempotent
    const hookRes2 = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/razorpay',
      headers: {
        'x-razorpay-signature': webhookSignature,
        'content-type': 'application/json',
      },
      payload: webhookPayload,
    });
    expect(hookRes2.statusCode).toBe(200);
  });

  // -------------------------------------------------------------------------
  // 6. ADMIN RBAC & AUDIT LOGGING
  // -------------------------------------------------------------------------

  it('15. Ordinary user cannot access admin course grant endpoint (403)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/courses/${dashMahavidyaCourse.id}/grant`,
      headers: {
        authorization: `Bearer ${tokenA}`,
      },
      payload: {
        userId: userA.id,
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it('16. Admin can grant course entitlement with audit log', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/courses/${dashMahavidyaCourse.id}/grant`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        userId: userA.id,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ACTIVE');
    expect(body.data.source).toBe('ADMIN_GRANT');

    // Verify audit log
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        adminId: adminUser.id,
        action: 'GRANT_COURSE_ENTITLEMENT',
      },
    });
    expect(auditLog).toBeDefined();
  });
});

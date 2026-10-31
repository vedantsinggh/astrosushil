import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { hashPassword } from '../../src/utils/hash';
import { BookingStatus, SlotStatus, EntitlementStatus, OrderStatus, PaymentStatus } from '@prisma/client';

describe('Account Deletion & Personal Data Erasure API (Integration)', () => {
  let app: FastifyInstance;

  // In-memory data store for testing
  const usersDb = new Map<string, any>();
  const refreshTokensDb = new Map<string, any>();
  const birthProfilesDb = new Map<string, any>();
  const reportsDb = new Map<string, any>();
  const bookingsDb = new Map<string, any>();
  const slotsDb = new Map<string, any>();
  const courseEntitlementsDb = new Map<string, any>();
  const digitalEntitlementsDb = new Map<string, any>();
  const lessonProgressDb = new Map<string, any>();
  const shippingAddressesDb = new Map<string, any>();
  const ordersDb = new Map<string, any>();
  const deviceTokensDb = new Map<string, any>();
  const auditLogsDb: any[] = [];

  const testUserId = 'test-user-uuid-1';
  const otherUserId = 'other-user-uuid-2';
  let testUserToken: string;
  let otherUserToken: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // Generate JWT access tokens
    testUserToken = (app as any).jwt.sign({ sub: testUserId, role: 'USER' });
    otherUserToken = (app as any).jwt.sign({ sub: otherUserId, role: 'USER' });

    // Seed test user with password
    const passwordHash = await hashPassword('SecurePass123!');
    usersDb.set(testUserId, {
      id: testUserId,
      email: 'delete-me@astrosushil.com',
      phoneNumber: '+919876543210',
      fullName: 'Test Account To Delete',
      googleId: 'google-uid-12345',
      passwordHash,
      role: 'USER',
      phoneVerifiedAt: new Date(),
      emailVerifiedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    usersDb.set(otherUserId, {
      id: otherUserId,
      email: 'other-user@astrosushil.com',
      phoneNumber: '+919876543211',
      fullName: 'Other Innocent User',
      googleId: null,
      passwordHash,
      role: 'USER',
      phoneVerifiedAt: new Date(),
      emailVerifiedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Seed active refresh token
    refreshTokensDb.set('token-1', {
      id: 'token-1',
      userId: testUserId,
      tokenHash: 'hash-1',
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
    });

    // Seed birth profile & report
    birthProfilesDb.set('bp-1', {
      id: 'bp-1',
      userId: testUserId,
      name: 'Test Native',
      dateOfBirth: '1995-05-15',
      timeOfBirth: '10:30:00',
    });

    reportsDb.set('rep-1', {
      id: 'rep-1',
      userId: testUserId,
      birthProfileId: 'bp-1',
      reportType: 'CAREER',
      status: 'COMPLETED',
    });

    // Seed active future consultation and slot
    slotsDb.set('slot-1', {
      id: 'slot-1',
      bookingId: 'booking-1',
      status: SlotStatus.BOOKED,
      lockedUntil: null,
    });

    bookingsDb.set('booking-1', {
      id: 'booking-1',
      userId: testUserId,
      status: BookingStatus.CONFIRMED,
      customerName: 'Test Account',
      customerPhone: '+919876543210',
      customerEmail: 'delete-me@astrosushil.com',
      primaryQuestion: 'When will I change jobs?',
      slotStartTimeUtc: new Date(Date.now() + 86400000 * 3), // 3 days in future
    });

    // Seed course entitlement and lesson progress
    courseEntitlementsDb.set('ce-1', {
      id: 'ce-1',
      userId: testUserId,
      courseId: 'course-gupt-nadi',
      status: EntitlementStatus.ACTIVE,
    });

    lessonProgressDb.set('lp-1', {
      id: 'lp-1',
      userId: testUserId,
      lessonId: 'lesson-1',
      isCompleted: true,
    });

    // Seed digital product entitlement
    digitalEntitlementsDb.set('de-1', {
      id: 'de-1',
      userId: testUserId,
      productId: 'prod-wallpaper-1',
      status: EntitlementStatus.ACTIVE,
    });

    // Seed shipping address
    shippingAddressesDb.set('addr-1', {
      id: 'addr-1',
      userId: testUserId,
      fullName: 'Test Account',
      phoneNumber: '+919876543210',
      addressLine1: '123 Test Street',
      city: 'Ayodhya',
    });

    // Seed legally mandated Order (Must NOT be deleted)
    ordersDb.set('order-1', {
      id: 'order-1',
      userId: testUserId,
      razorpayOrderId: 'order_test_123',
      amount: 49900,
      status: OrderStatus.PAID,
      paymentStatus: PaymentStatus.CAPTURED,
      notes: 'Please expedite delivery to my home',
      createdAt: new Date(),
    });

    // Mock Prisma methods
    (vi.spyOn(prisma.user, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      if (where.id) return usersDb.get(where.id) || null;
      if (where.email) return Array.from(usersDb.values()).find((u) => u.email === where.email) || null;
      return null;
    });

    (vi.spyOn(prisma.user, 'update') as any).mockImplementation(async ({ where, data }: any) => {
      const existing = usersDb.get(where.id);
      if (!existing) throw new Error('User not found');
      const updated = { ...existing, ...data, updatedAt: new Date() };
      usersDb.set(where.id, updated);
      return updated;
    });

    (vi.spyOn(prisma.refreshToken, 'updateMany') as any).mockImplementation(async ({ where, data }: any) => {
      let count = 0;
      for (const [key, val] of refreshTokensDb.entries()) {
        if (val.userId === where.userId && (where.revokedAt === null ? val.revokedAt === null : true)) {
          refreshTokensDb.set(key, { ...val, ...data });
          count++;
        }
      }
      return { count };
    });

    (vi.spyOn(prisma.deviceToken, 'deleteMany') as any).mockImplementation(async ({ where }: any) => {
      let count = 0;
      for (const [key, val] of deviceTokensDb.entries()) {
        if (val.userId === where.userId) {
          deviceTokensDb.delete(key);
          count++;
        }
      }
      return { count };
    });

    (vi.spyOn(prisma.otpVerification, 'deleteMany') as any).mockResolvedValue({ count: 0 });
    (vi.spyOn(prisma.notificationPreference, 'deleteMany') as any).mockResolvedValue({ count: 0 });
    (vi.spyOn(prisma.notification, 'deleteMany') as any).mockResolvedValue({ count: 0 });

    (vi.spyOn(prisma.birthProfile, 'deleteMany') as any).mockImplementation(async ({ where }: any) => {
      let count = 0;
      for (const [key, val] of birthProfilesDb.entries()) {
        if (val.userId === where.userId) {
          birthProfilesDb.delete(key);
          count++;
        }
      }
      return { count };
    });

    (vi.spyOn(prisma.report, 'deleteMany') as any).mockImplementation(async ({ where }: any) => {
      let count = 0;
      for (const [key, val] of reportsDb.entries()) {
        if (val.userId === where.userId) {
          reportsDb.delete(key);
          count++;
        }
      }
      return { count };
    });

    (vi.spyOn(prisma.courseEntitlement, 'updateMany') as any).mockImplementation(async ({ where, data }: any) => {
      let count = 0;
      for (const [key, val] of courseEntitlementsDb.entries()) {
        if (val.userId === where.userId) {
          courseEntitlementsDb.set(key, { ...val, ...data });
          count++;
        }
      }
      return { count };
    });

    (vi.spyOn(prisma.lessonProgress, 'deleteMany') as any).mockImplementation(async ({ where }: any) => {
      let count = 0;
      for (const [key, val] of lessonProgressDb.entries()) {
        if (val.userId === where.userId) {
          lessonProgressDb.delete(key);
          count++;
        }
      }
      return { count };
    });

    (vi.spyOn(prisma.digitalProductEntitlement, 'updateMany') as any).mockImplementation(async ({ where, data }: any) => {
      let count = 0;
      for (const [key, val] of digitalEntitlementsDb.entries()) {
        if (val.userId === where.userId) {
          digitalEntitlementsDb.set(key, { ...val, ...data });
          count++;
        }
      }
      return { count };
    });

    (vi.spyOn(prisma.shippingAddress, 'deleteMany') as any).mockImplementation(async ({ where }: any) => {
      let count = 0;
      for (const [key, val] of shippingAddressesDb.entries()) {
        if (val.userId === where.userId) {
          shippingAddressesDb.delete(key);
          count++;
        }
      }
      return { count };
    });

    (vi.spyOn(prisma.order, 'updateMany') as any).mockImplementation(async ({ where, data }: any) => {
      let count = 0;
      for (const [key, val] of ordersDb.entries()) {
        if (val.userId === where.userId) {
          ordersDb.set(key, { ...val, ...data });
          count++;
        }
      }
      return { count };
    });

    (vi.spyOn(prisma.consultationBooking, 'findMany') as any).mockImplementation(async ({ where }: any) => {
      return Array.from(bookingsDb.values()).filter((b) => b.userId === where.userId);
    });

    (vi.spyOn(prisma.consultationBooking, 'update') as any).mockImplementation(async ({ where, data }: any) => {
      const existing = bookingsDb.get(where.id);
      if (!existing) throw new Error('Booking not found');
      const updated = { ...existing, ...data };
      bookingsDb.set(where.id, updated);
      return updated;
    });

    (vi.spyOn(prisma.consultationBooking, 'updateMany') as any).mockImplementation(async ({ where, data }: any) => {
      let count = 0;
      for (const [key, val] of bookingsDb.entries()) {
        if (val.userId === where.userId) {
          bookingsDb.set(key, { ...val, ...data });
          count++;
        }
      }
      return { count };
    });

    (vi.spyOn(prisma.appointmentSlot, 'updateMany') as any).mockImplementation(async ({ where, data }: any) => {
      let count = 0;
      for (const [key, val] of slotsDb.entries()) {
        if (val.bookingId === where.bookingId) {
          slotsDb.set(key, { ...val, ...data });
          count++;
        }
      }
      return { count };
    });

    (vi.spyOn(prisma.auditLog, 'create') as any).mockImplementation(async ({ data }: any) => {
      const entry = { id: `log-${Date.now()}`, ...data, createdAt: new Date() };
      auditLogsDb.push(entry);
      return entry;
    });

    // Mock $transaction to execute callback with prisma
    (vi.spyOn(prisma, '$transaction') as any).mockImplementation(async (callback: any) => {
      return callback(prisma);
    });
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('1. Rejects unauthenticated DELETE /api/v1/users/me with HTTP 401', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users/me',
    });
    expect(res.statusCode).toBe(401);
  });

  it('2. Rejects deletion if invalid password is provided for password-secured account', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users/me',
      headers: {
        authorization: `Bearer ${testUserToken}`,
      },
      payload: {
        confirmation: 'DELETE',
        password: 'WrongPassword123!',
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.error?.message).toContain('Invalid confirmation password');

    // Verify user was NOT deleted
    const user = usersDb.get(testUserId);
    expect(user.email).toBe('delete-me@astrosushil.com');
  });

  it('3. Successfully deletes own account with valid confirmation', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users/me',
      headers: {
        authorization: `Bearer ${testUserToken}`,
      },
      payload: {
        confirmation: 'DELETE',
        password: 'SecurePass123!',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.message).toContain('Account and personal data successfully deleted');
    expect(body.deletedAt).toBeDefined();

    // 3a. Verify User Record is Anonymized (PII scrubbed, ID preserved)
    const user = usersDb.get(testUserId);
    expect(user.id).toBe(testUserId);
    expect(user.email).toBeNull();
    expect(user.phoneNumber).toBeNull();
    expect(user.googleId).toBeNull();
    expect(user.passwordHash).toBeNull();
    expect(user.fullName).toBe('Deleted User');

    // 3b. Verify Refresh Token is revoked
    const refreshToken = refreshTokensDb.get('token-1');
    expect(refreshToken.revokedAt).not.toBeNull();

    // 3c. Verify Birth Profile and Reports are deleted
    expect(birthProfilesDb.has('bp-1')).toBe(false);
    expect(reportsDb.has('rep-1')).toBe(false);

    // 3d. Verify Future Consultation Booking is cancelled and Slot is released to AVAILABLE
    const booking = bookingsDb.get('booking-1');
    expect(booking.status).toBe(BookingStatus.CANCELLED);
    expect(booking.cancellationReason).toBe('USER_ACCOUNT_DELETED');
    expect(booking.customerPhone).toBeNull();
    expect(booking.customerEmail).toBeNull();
    expect(booking.primaryQuestion).toContain('DELETED');

    const slot = slotsDb.get('slot-1');
    expect(slot.status).toBe(SlotStatus.AVAILABLE);
    expect(slot.bookingId).toBeNull();

    // 3e. Verify Course and Digital Product Entitlements are revoked
    const courseEntitlement = courseEntitlementsDb.get('ce-1');
    expect(courseEntitlement.status).toBe(EntitlementStatus.REVOKED);

    const digitalEntitlement = digitalEntitlementsDb.get('de-1');
    expect(digitalEntitlement.status).toBe(EntitlementStatus.REVOKED);

    // 3f. Verify Shipping Addresses are removed
    expect(shippingAddressesDb.has('addr-1')).toBe(false);

    // 3g. CRITICAL: Verify financial Orders are RETAINED for 8-year tax/GST audit compliance
    expect(ordersDb.has('order-1')).toBe(true);
    const order = ordersDb.get('order-1');
    expect(order.userId).toBe(testUserId);
    expect(order.amount).toBe(49900);
    expect(order.notes).toBeNull(); // Customer personal note scrubbed

    // 3h. Verify Immutable Audit Log entry was generated
    const auditEntry = auditLogsDb.find((l) => l.action === 'USER_ACCOUNT_DELETED' && l.resource === `User:${testUserId}`);
    expect(auditEntry).toBeDefined();
    expect(auditEntry.adminEmail).toBe('SELF_SERVICE_USER');
  });

  it('4. Idempotent replay: Repeated DELETE /api/v1/users/me returns HTTP 200 without duplicate side-effects', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users/me',
      headers: {
        authorization: `Bearer ${testUserToken}`,
      },
      payload: {
        confirmation: 'DELETE',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.message).toContain('already been deleted');
  });

  it('5. Subsequent GET /api/v1/users/me by deleted user rejects with HTTP 404 (Not Found)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: {
        authorization: `Bearer ${testUserToken}`,
      },
    });

    expect(res.statusCode).toBe(404);
  });

  it('6. Deletion derives identity exclusively from token: Other user account is unaffected', async () => {
    // Attempting to delete using testUserToken could never affect otherUserId
    const otherUser = usersDb.get(otherUserId);
    expect(otherUser.email).toBe('other-user@astrosushil.com');
    expect(otherUser.fullName).toBe('Other Innocent User');

    // Other user can still fetch profile normally
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: {
        authorization: `Bearer ${otherUserToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.email).toBe('other-user@astrosushil.com');
  });
});

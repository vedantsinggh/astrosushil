import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { FastifyInstance } from 'fastify';
import crypto from 'crypto';

describe('Phase 5: Online Consultations & Appointment Booking Suite', { timeout: 30000 }, () => {
  let app: FastifyInstance;
  let userA: any;
  let userB: any;
  let tokenA: string;
  let tokenB: string;
  let profileA: any;

  beforeAll(async () => {
    process.env.RAZORPAY_KEY_SECRET = 'test_razorpay_secret_for_local_development_12345';
    process.env.RAZORPAY_KEY_ID = 'rzp_test_placeholder_key';
    app = buildApp();
    await app.ready();

    // Create test users in postgres
    userA = await prisma.user.create({
      data: {
        email: `consult_client_a_${Date.now()}@example.com`,
        fullName: 'Client Aarav',
        phoneNumber: '+919876543210',
        role: 'USER',
      },
    });

    userB = await prisma.user.create({
      data: {
        email: `consult_client_b_${Date.now()}@example.com`,
        fullName: 'Client Diya',
        phoneNumber: '+919876543211',
        role: 'USER',
      },
    });

    profileA = await prisma.birthProfile.create({
      data: {
        userId: userA.id,
        name: 'Aarav Sharma',
        dateOfBirth: '1990-05-15',
        timeOfBirth: '14:30:00',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
        placeName: 'New Delhi, India',
      },
    });

    tokenA = (app as any).jwt.sign({ sub: userA.id, id: userA.id, role: 'USER' });
    tokenB = (app as any).jwt.sign({ sub: userB.id, id: userB.id, role: 'USER' });
  });

  function getFutureValidDateStr(daysInFuture: number): string {
    const d = new Date();
    const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + daysInFuture, 12, 0, 0));
    if (target.getUTCDay() === 0) {
      target.setUTCDate(target.getUTCDate() + 1);
    }
    return target.toISOString().split('T')[0];
  }

  afterAll(async () => {
    await prisma.consultationBooking.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });
    await prisma.appointmentSlot.deleteMany({});
    await prisma.order.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });
    await prisma.birthProfile.deleteMany({
      where: { id: profileA.id },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userA.id, userB.id] } },
    });
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // 1. CATALOG DISCOVERY & VERIFIED PRICING
  // ---------------------------------------------------------------------------
  it('1. Fetches consultation catalog with verified prices, modes, and notice periods', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/consultations',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);

    const items = body.data;
    // Check Budget Friendly tier
    const budget = items.find((i: any) => i.id === 'consult-budget-friendly');
    expect(budget).toBeDefined();
    expect(budget.pricePaise).toBe(500000); // ₹5,000
    expect(budget.priceWithGst).toBe(5000);
    expect(budget.durationMinutes).toBe(15);
    expect(budget.mode).toBe('AUDIO');
    expect(budget.responseDays).toBe(15);

    // Check General Video tier
    const generalVideo = items.find((i: any) => i.id === 'consult-general-video');
    expect(generalVideo).toBeDefined();
    expect(generalVideo.pricePaise).toBe(1500000); // ₹15,000
    expect(generalVideo.durationMinutes).toBe(30);
    expect(generalVideo.mode).toBe('VIDEO');

    // Check Instant Video tier
    const instant = items.find((i: any) => i.id === 'consult-instant-video');
    expect(instant).toBeDefined();
    expect(instant.pricePaise).toBe(10000000); // ₹1,00,000
    expect(instant.responseDays).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // 2. AVAILABILITY & NOTICE WINDOW CALCULATION
  // ---------------------------------------------------------------------------
  it('2. Enforces response days notice window and working hours on slot queries', async () => {
    // 1. A date that is too soon (e.g. tomorrow) for Budget Friendly (requires 15 days)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const soonRes = await app.inject({
      method: 'GET',
      url: `/api/v1/consultations/slots?consultationId=consult-budget-friendly&date=${tomorrowStr}`,
    });
    expect(soonRes.statusCode).toBe(200);
    const soonBody = JSON.parse(soonRes.payload);
    expect(soonBody.meta.available).toBe(false);
    expect(soonBody.data.length).toBe(0);
    expect(soonBody.message).toContain('Minimum booking notice');

    // 2. A valid future date (20 days from now, non-Sunday)
    const validDateStr = getFutureValidDateStr(20);

    const validRes = await app.inject({
      method: 'GET',
      url: `/api/v1/consultations/slots?consultationId=consult-budget-friendly&date=${validDateStr}`,
    });
    expect(validRes.statusCode).toBe(200);
    const validBody = JSON.parse(validRes.payload);
    expect(validBody.meta.available).toBe(true);
    expect(validBody.data.length).toBeGreaterThan(0);
    expect(validBody.data[0]).toHaveProperty('startTime');
    expect(validBody.data[0]).toHaveProperty('endTime');
  });

  // ---------------------------------------------------------------------------
  // 3. CONCURRENT DOUBLE-BOOKING PREVENTION
  // ---------------------------------------------------------------------------
  it('3. Strictly prevents double booking under concurrent requests for the same slot', async () => {
    const testDateStr = getFutureValidDateStr(25);
    const targetSlot = { startTime: '11:00', endTime: '11:15' };

    // Dispatch two concurrent booking requests from userA and userB for the same slot
    const [resA, resB] = await Promise.all([
      app.inject({
        method: 'POST',
        url: '/api/v1/consultations/book',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          consultationId: 'consult-budget-friendly',
          mode: 'AUDIO',
          date: testDateStr,
          slot: targetSlot,
          birthProfileId: profileA.id,
          notes: 'Career inflection query',
        },
      }),
      app.inject({
        method: 'POST',
        url: '/api/v1/consultations/book',
        headers: { authorization: `Bearer ${tokenB}` },
        payload: {
          consultationId: 'consult-budget-friendly',
          mode: 'AUDIO',
          date: testDateStr,
          slot: targetSlot,
          notes: 'Simultaneous competitor request',
        },
      }),
    ]);

    const statuses = [resA.statusCode, resB.statusCode].sort();
    // One MUST succeed (201) and one MUST be rejected with conflict (409)
    expect(statuses).toEqual([201, 409]);

    const successRes = resA.statusCode === 201 ? resA : resB;
    const successBody = JSON.parse(successRes.payload);
    expect(successBody.data.booking.status).toBe('PENDING_PAYMENT');
    expect(successBody.data.razorpayConfig).toBeDefined();
    expect(successBody.data.razorpayConfig.amount).toBe(500000); // ₹5,000 in paise
  });

  // ---------------------------------------------------------------------------
  // 4. RESERVATION EXPIRY & RE-BOOKING
  // ---------------------------------------------------------------------------
  it('4. Releases expired unpaid reservations so slots become bookable again', async () => {
    const testDateStr = getFutureValidDateStr(26);
    const slot = { startTime: '12:00', endTime: '12:15' };

    // 1. User A reserves the slot
    const bookRes = await app.inject({
      method: 'POST',
      url: '/api/v1/consultations/book',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {
        consultationId: 'consult-budget-friendly',
        mode: 'AUDIO',
        date: testDateStr,
        slot,
      },
    });
    expect(bookRes.statusCode).toBe(201);
    const bookingId = JSON.parse(bookRes.payload).data.booking.id;

    // 2. Simulate expiration by updating reservationExpiresAt to the past
    const past = new Date(Date.now() - 60000);
    await prisma.consultationBooking.update({
      where: { id: bookingId },
      data: { reservationExpiresAt: past },
    });
    await prisma.appointmentSlot.updateMany({
      where: { bookingId },
      data: { lockedUntil: past },
    });

    // 3. User B should now be able to book this slot!
    const bookRes2 = await app.inject({
      method: 'POST',
      url: '/api/v1/consultations/book',
      headers: { authorization: `Bearer ${tokenB}` },
      payload: {
        consultationId: 'consult-budget-friendly',
        mode: 'AUDIO',
        date: testDateStr,
        slot,
      },
    });
    expect(bookRes2.statusCode).toBe(201);
  });

  // ---------------------------------------------------------------------------
  // 5. PAYMENT VERIFICATION & INSTANT CONFIRMATION
  // ---------------------------------------------------------------------------
  it('5. Confirms booking upon payment verification and generates secure meeting link', async () => {
    const testDateStr = getFutureValidDateStr(27);
    const slot = { startTime: '15:00', endTime: '15:30' };

    // 1. Book General Video consultation
    const bookRes = await app.inject({
      method: 'POST',
      url: '/api/v1/consultations/book',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {
        consultationId: 'consult-general-video',
        mode: 'VIDEO',
        date: testDateStr,
        slot,
        birthProfileId: profileA.id,
      },
    });
    expect(bookRes.statusCode).toBe(201);
    const { booking, razorpayConfig } = JSON.parse(bookRes.payload).data;

    // 2. Calculate valid Razorpay HMAC signature
    const paymentId = `pay_${Date.now()}`;
    const secret = process.env.RAZORPAY_KEY_SECRET || 'test_razorpay_secret_for_local_development_12345';
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${razorpayConfig.orderId}|${paymentId}`);
    const signature = hmac.digest('hex');

    // 3. Verify Payment
    const verifyRes = await app.inject({
      method: 'POST',
      url: '/api/v1/consultations/verify-payment',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {
        bookingId: booking.id,
        razorpayOrderId: razorpayConfig.orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
      },
    });

    expect(verifyRes.statusCode).toBe(200);
    const confirmed = JSON.parse(verifyRes.payload).data;
    expect(confirmed.status).toBe('CONFIRMED');
    expect(confirmed.meetingLink).toContain('https://meet.astrosushil.com/consult-');
    expect(confirmed.confirmedAt).toBeDefined();

    // Verify appointment slot is marked BOOKED
    const dbSlot = await prisma.appointmentSlot.findFirst({
      where: { bookingId: booking.id },
    });
    expect(dbSlot?.status).toBe('BOOKED');
  });

  // ---------------------------------------------------------------------------
  // 6. RESCHEDULING & CAPACITY RELEASE
  // ---------------------------------------------------------------------------
  it('6. Atomically reschedules appointment, releasing old slot and claiming new slot', async () => {
    const date1Str = getFutureValidDateStr(28);
    const date2Str = getFutureValidDateStr(29);

    // Book & directly confirm in DB
    const booking = await prisma.consultationBooking.create({
      data: {
        userId: userA.id,
        consultationId: 'consult-standard-video',
        title: 'Standard Consultation (Video)',
        mode: 'VIDEO',
        durationMinutes: 30,
        date: date1Str,
        startTime: '16:00',
        endTime: '16:30',
        slotStartTimeUtc: new Date(`${date1Str}T16:00:00.000Z`),
        slotEndTimeUtc: new Date(`${date1Str}T16:30:00.000Z`),
        status: 'CONFIRMED',
        customerName: 'Aarav Sharma',
      },
    });

    await prisma.appointmentSlot.create({
      data: {
        date: date1Str,
        startTime: '16:00',
        endTime: '16:30',
        startTimeUtc: new Date(`${date1Str}T16:00:00.000Z`),
        endTimeUtc: new Date(`${date1Str}T16:30:00.000Z`),
        status: 'BOOKED',
        bookingId: booking.id,
      },
    });

    // Reschedule to date2 at 17:00
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/consultations/bookings/${booking.id}/reschedule`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {
        newDate: date2Str,
        newSlot: { startTime: '17:00', endTime: '17:30' },
        reason: 'Office travel conflict',
      },
    });

    expect(res.statusCode).toBe(200);
    const rescheduled = JSON.parse(res.payload).data;
    expect(rescheduled.status).toBe('RESCHEDULED');
    expect(rescheduled.date).toBe(date2Str);
    expect(rescheduled.startTime).toBe('17:00');

    // Old slot is AVAILABLE
    const oldSlot = await prisma.appointmentSlot.findFirst({
      where: { date: date1Str, startTime: '16:00' },
    });
    expect(oldSlot?.status).toBe('AVAILABLE');

    // New slot is BOOKED
    const newSlot = await prisma.appointmentSlot.findFirst({
      where: { date: date2Str, startTime: '17:00' },
    });
    expect(newSlot?.status).toBe('BOOKED');
  });

  // ---------------------------------------------------------------------------
  // 7. STRICT IDOR DEFENSE
  // ---------------------------------------------------------------------------
  it('7. Strictly rejects cross-user access attempts with 404 (view, reschedule, cancel)', async () => {
    // Booking belongs to User A
    const booking = await prisma.consultationBooking.create({
      data: {
        userId: userA.id,
        consultationId: 'consult-budget-friendly',
        title: 'Budget Friendly Consultation',
        mode: 'AUDIO',
        durationMinutes: 15,
        date: '2026-11-20',
        startTime: '11:00',
        endTime: '11:15',
        slotStartTimeUtc: new Date('2026-11-20T11:00:00.000Z'),
        slotEndTimeUtc: new Date('2026-11-20T11:15:00.000Z'),
        status: 'CONFIRMED',
        customerName: 'Aarav Sharma',
      },
    });

    // 1. User B tries to VIEW User A's booking -> 404
    const viewRes = await app.inject({
      method: 'GET',
      url: `/api/v1/consultations/bookings/${booking.id}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(viewRes.statusCode).toBe(404);

    // 2. User B tries to RESCHEDULE User A's booking -> 404
    const reschRes = await app.inject({
      method: 'POST',
      url: `/api/v1/consultations/bookings/${booking.id}/reschedule`,
      headers: { authorization: `Bearer ${tokenB}` },
      payload: {
        newDate: '2026-11-21',
        newSlot: '11:30',
      },
    });
    expect(reschRes.statusCode).toBe(404);

    // 3. User B tries to CANCEL User A's booking -> 404
    const cancelRes = await app.inject({
      method: 'POST',
      url: `/api/v1/consultations/bookings/${booking.id}/cancel`,
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { reason: 'Unauthorized cancel attempt' },
    });
    expect(cancelRes.statusCode).toBe(404);
  });

  // ---------------------------------------------------------------------------
  // 8. CANCELLATION & CAPACITY RELEASE
  // ---------------------------------------------------------------------------
  it('8. Cancelling a booking releases slot back to AVAILABLE', async () => {
    const booking = await prisma.consultationBooking.create({
      data: {
        userId: userA.id,
        consultationId: 'consult-budget-friendly',
        title: 'Budget Friendly Consultation',
        mode: 'AUDIO',
        durationMinutes: 15,
        date: '2026-11-25',
        startTime: '13:00',
        endTime: '13:15',
        slotStartTimeUtc: new Date('2026-11-25T13:00:00.000Z'),
        slotEndTimeUtc: new Date('2026-11-25T13:15:00.000Z'),
        status: 'CONFIRMED',
        customerName: 'Aarav Sharma',
      },
    });

    const slot = await prisma.appointmentSlot.create({
      data: {
        date: '2026-11-25',
        startTime: '13:00',
        endTime: '13:15',
        startTimeUtc: new Date('2026-11-25T13:00:00.000Z'),
        endTimeUtc: new Date('2026-11-25T13:15:00.000Z'),
        status: 'BOOKED',
        bookingId: booking.id,
      },
    });

    const cancelRes = await app.inject({
      method: 'POST',
      url: `/api/v1/consultations/bookings/${booking.id}/cancel`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { reason: 'Change of plans' },
    });

    expect(cancelRes.statusCode).toBe(200);
    const cancelled = JSON.parse(cancelRes.payload).data;
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancellationReason).toBe('Change of plans');

    // Slot is now AVAILABLE
    const dbSlot = await prisma.appointmentSlot.findUnique({
      where: { id: slot.id },
    });
    expect(dbSlot?.status).toBe('AVAILABLE');
  });

  // ---------------------------------------------------------------------------
  // 9. ADMIN WORKFLOW & LIVE SESSION INTEGRATION
  // ---------------------------------------------------------------------------
  it('9. Admin can list bookings and start associated Live Session with client profile', async () => {
    const adminToken = (app as any).jwt.sign({
      sub: userA.id,
      id: userA.id,
      role: 'ADMIN',
    });

    // 1. Admin lists bookings
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/consultations',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(listRes.statusCode).toBe(200);
    const listBody = JSON.parse(listRes.payload);
    expect(listBody.success).toBe(true);
    expect(Array.isArray(listBody.data)).toBe(true);

    // 2. Create confirmed booking with birth profile
    const booking = await prisma.consultationBooking.create({
      data: {
        userId: userA.id,
        birthProfileId: profileA.id,
        consultationId: 'consult-general-video',
        title: 'General Consultation (Video)',
        mode: 'VIDEO',
        durationMinutes: 30,
        date: '2026-11-30',
        startTime: '11:00',
        endTime: '11:30',
        slotStartTimeUtc: new Date('2026-11-30T11:00:00.000Z'),
        slotEndTimeUtc: new Date('2026-11-30T11:30:00.000Z'),
        status: 'CONFIRMED',
        customerName: 'Aarav Sharma',
      },
    });

    // 3. Admin launches Live Session for this booking
    const sessionRes = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/consultations/${booking.id}/start-session`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(sessionRes.statusCode).toBe(201);
    const sessionBody = JSON.parse(sessionRes.payload).data;
    expect(sessionBody.session).toBeDefined();
    expect(sessionBody.session.status).toBe('ACTIVE');
    expect(sessionBody.client.name).toContain('Aarav');
    expect(sessionBody.birthProfile.id).toBe(profileA.id);
  });

  // ---------------------------------------------------------------------------
  // 10. WEBHOOK PAYMENT.CAPTURED AUTO-CONFIRMATION & IDEMPOTENCY
  // ---------------------------------------------------------------------------
  it('10. Confirms booking via webhook payment.captured and handles idempotent replay', async () => {
    const testDateStr = getFutureValidDateStr(32);

    // Book consultation
    const bookRes = await app.inject({
      method: 'POST',
      url: '/api/v1/consultations/book',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {
        consultationId: 'consult-standard-audio',
        mode: 'AUDIO',
        date: testDateStr,
        slot: { startTime: '12:00', endTime: '12:30' },
      },
    });
    expect(bookRes.statusCode).toBe(201);
    const { booking, razorpayConfig } = JSON.parse(bookRes.payload).data;

    // Send Razorpay payment.captured webhook
    const webhookPayload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_wh_${Date.now()}`,
            order_id: razorpayConfig.orderId,
            amount: 1500000,
            status: 'captured',
          },
        },
      },
    });

    const whSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret_12345';
    process.env.RAZORPAY_WEBHOOK_SECRET = whSecret;
    const whSignature = crypto
      .createHmac('sha256', whSecret)
      .update(webhookPayload)
      .digest('hex');

    const whRes1 = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/razorpay',
      headers: {
        'x-razorpay-signature': whSignature,
        'content-type': 'application/json',
      },
      payload: webhookPayload,
    });
    expect(whRes1.statusCode).toBe(200);

    // Verify booking is confirmed in DB
    const dbBooking = await prisma.consultationBooking.findUnique({
      where: { id: booking.id },
    });
    expect(dbBooking?.status).toBe('CONFIRMED');

    // Replaying same webhook is idempotent
    const whRes2 = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/razorpay',
      headers: {
        'x-razorpay-signature': whSignature,
        'content-type': 'application/json',
      },
      payload: webhookPayload,
    });
    expect(whRes2.statusCode).toBe(200);
    const whBody2 = JSON.parse(whRes2.payload);
    expect(whBody2.status).toBe('ok');
    expect(whBody2.duplicate).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 11. WEBHOOK PAYMENT.FAILED RELEASES SLOT
  // ---------------------------------------------------------------------------
  it('11. Cancels booking and frees slot when payment.failed webhook arrives', async () => {
    const testDateStr = getFutureValidDateStr(33);

    const bookRes = await app.inject({
      method: 'POST',
      url: '/api/v1/consultations/book',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {
        consultationId: 'consult-budget-friendly',
        mode: 'AUDIO',
        date: testDateStr,
        slot: { startTime: '13:30', endTime: '13:45' },
      },
    });
    expect(bookRes.statusCode).toBe(201);
    const { booking, razorpayConfig } = JSON.parse(bookRes.payload).data;

    const webhookPayload = JSON.stringify({
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: `pay_fail_${Date.now()}`,
            order_id: razorpayConfig.orderId,
            status: 'failed',
          },
        },
      },
    });

    const whSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret_12345';
    const whSignature = crypto
      .createHmac('sha256', whSecret)
      .update(webhookPayload)
      .digest('hex');

    const whRes = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/razorpay',
      headers: {
        'x-razorpay-signature': whSignature,
        'content-type': 'application/json',
      },
      payload: webhookPayload,
    });
    expect(whRes.statusCode).toBe(200);

    const dbBooking = await prisma.consultationBooking.findUnique({
      where: { id: booking.id },
    });
    expect(dbBooking?.status).toBe('CANCELLED');
    expect(dbBooking?.cancellationReason).toBe('PAYMENT_FAILED');

    // Slot is AVAILABLE again
    const slot = await prisma.appointmentSlot.findFirst({
      where: { date: testDateStr, startTime: '13:30' },
    });
    expect(slot?.status).toBe('AVAILABLE');
  });

  // ---------------------------------------------------------------------------
  // 12. CUSTOMER "MY BOOKINGS" HISTORY
  // ---------------------------------------------------------------------------
  it('12. User can view their personalized consultation bookings list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/consultations/my-bookings',
      headers: { authorization: `Bearer ${tokenA}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0]).toHaveProperty('consultationId');
    expect(body.data[0]).toHaveProperty('status');
  });
});

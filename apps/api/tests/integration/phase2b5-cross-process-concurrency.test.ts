import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import path from 'node:path';
import { fork, ChildProcess } from 'node:child_process';
import { prisma } from '../../src/services/prisma.service';
import { nativeRedisClient } from '../../src/services/redis-client';
import { careerReportWorker } from '../../src/services/report-worker.service';
import { OrderStatus, PaymentStatus, FulfillmentStatus } from '@prisma/client';

interface ChildWorker {
  process: ChildProcess;
  pid: number;
  sendRequest: (action: string, data?: any) => Promise<any>;
}

describe('Phase 2B.5 Task 1C: Genuine Cross-Process Concurrency & Infrastructure Hardening', () => {
  let worker1: ChildWorker;
  let worker2: ChildWorker;
  let testUser: any;
  let testProfileA: any;
  let testProfileB: any;

  function spawnWorkerProcess(): Promise<ChildWorker> {
    return new Promise((resolve, reject) => {
      const runnerScript = path.resolve(__dirname, '../helpers/process-report-runner.ts');

      const cp = fork(runnerScript, [], {
        execArgv: [require.resolve('tsx/cli')],
        env: {
          ...process.env,
          NODE_ENV: 'test',
        },
      });

      const pendingMap = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();

      cp.on('message', (msg: any) => {
        if (msg.event === 'READY') {
          const worker: ChildWorker = {
            process: cp,
            pid: msg.pid,
            sendRequest(action: string, data: any = {}) {
              return new Promise((res, rej) => {
                const reqId = crypto.randomUUID();
                pendingMap.set(reqId, { resolve: res, reject: rej });
                cp.send({ action, id: reqId, ...data });
              });
            },
          };
          resolve(worker);
        } else if (msg.event === 'REPORT_RESULT' || msg.event === 'RECOVERY_RESULT') {
          const entry = pendingMap.get(msg.id);
          if (entry) {
            pendingMap.delete(msg.id);
            if (msg.success) {
              entry.resolve(msg.result);
            } else {
              entry.reject(msg.error);
            }
          }
        } else if (msg.event === 'REDIS_DISABLED' || msg.event === 'REDIS_ENABLED' || msg.event === 'PONG') {
          // Handled for state toggles
          for (const [id, entry] of pendingMap.entries()) {
            pendingMap.delete(id);
            entry.resolve(msg);
            break;
          }
        }
      });

      cp.on('error', (err) => {
        reject(err);
      });

      cp.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          for (const entry of pendingMap.values()) {
            entry.reject(new Error(`Child process exited with code ${code}`));
          }
        }
      });
    });
  }

  beforeAll(async () => {
    // 1. Spawn two separate OS processes running independent ReportsService instances
    [worker1, worker2] = await Promise.all([spawnWorkerProcess(), spawnWorkerProcess()]);

    // Verify genuinely separate process IDs
    expect(worker1.pid).toBeDefined();
    expect(worker2.pid).toBeDefined();
    expect(worker1.pid).not.toBe(worker2.pid);

    // 2. Clean test users
    await prisma.user.deleteMany({
      where: {
        OR: [
          { id: 'task1c-cross-user' },
          { phoneNumber: '+919333333333' },
          { email: 'task1c.user@astrosushil.com' },
        ],
      },
    });

    testUser = await prisma.user.create({
      data: {
        id: 'task1c-cross-user',
        email: 'task1c.user@astrosushil.com',
        phoneNumber: '+919333333333',
        fullName: 'Task 1C Cross-Process Test User',
        role: 'USER',
      },
    });

    testProfileA = await prisma.birthProfile.create({
      data: {
        id: crypto.randomUUID(),
        userId: testUser.id,
        name: 'Profile A - Delhi',
        dateOfBirth: '1990-01-15T00:00:00.000Z',
        timeOfBirth: '10:30',
        placeName: 'New Delhi, India',
        latitude: 28.6139,
        longitude: 77.2090,
        timezone: 'Asia/Kolkata',
      },
    });

    testProfileB = await prisma.birthProfile.create({
      data: {
        id: crypto.randomUUID(),
        userId: testUser.id,
        name: 'Profile B - Mumbai',
        dateOfBirth: '1992-05-20T00:00:00.000Z',
        timeOfBirth: '14:45',
        placeName: 'Mumbai, India',
        latitude: 19.0760,
        longitude: 72.8777,
        timezone: 'Asia/Kolkata',
      },
    });
  }, 30000);

  beforeEach(async () => {
    await prisma.report.deleteMany({ where: { userId: testUser.id } });
    await prisma.orderItem.deleteMany({ where: { order: { userId: testUser.id } } });
    await prisma.order.deleteMany({ where: { userId: testUser.id } });
  });

  afterAll(async () => {
    // Terminate worker processes cleanly
    try {
      if (worker1?.process) worker1.process.kill('SIGTERM');
      if (worker2?.process) worker2.process.kill('SIGTERM');
    } catch (_) {}

    await prisma.report.deleteMany({ where: { userId: testUser.id } });
    await prisma.orderItem.deleteMany({ where: { order: { userId: testUser.id } } });
    await prisma.order.deleteMany({ where: { userId: testUser.id } });
    await prisma.birthProfile.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.deleteMany({ where: { id: testUser.id } });

    await nativeRedisClient.quit();
  }, 15000);

  // Helper to create verified PAID order
  async function createPaidOrder(sku: string) {
    const orderId = crypto.randomUUID();
    const rzpOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;
    const rzpPayId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    const targetCatalog = `report-${sku.toLowerCase().replace(/_/g, '-')}`;

    return await prisma.order.create({
      data: {
        id: orderId,
        userId: testUser.id,
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: rzpPayId,
        amount: 29900,
        currency: 'INR',
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.CAPTURED,
        fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
        reportType: sku as any,
        items: {
          create: [
            {
              catalogId: targetCatalog,
              itemType: 'REPORT',
              title: `${sku} Dossier`,
              unitPrice: 29900,
              totalAmount: 29900,
            },
          ],
        },
      },
      include: { items: true, reports: true },
    });
  }

  // =========================================================================
  // 1. GENUINE CROSS-PROCESS CONCURRENCY
  // =========================================================================
  it('1.1 Concurrent equivalent requests across two independent Node.js processes produce exactly 1 report and 1 job', async () => {
    const order = await createPaidOrder('KUNDLI');

    const userContext = { id: testUser.id, role: 'USER' };
    const payload = {
      birthProfileId: testProfileA.id,
      reportType: 'KUNDLI',
      orderId: order.id,
      async: true,
    };

    // Dispatch simultaneously from Worker Process 1 and Worker Process 2
    const [result1, result2] = await Promise.all([
      worker1.sendRequest('CREATE_REPORT', { input: payload, user: userContext }),
      worker2.sendRequest('CREATE_REPORT', { input: payload, user: userContext }),
    ]);

    expect(result1.reportId).toBeDefined();
    expect(result2.reportId).toBeDefined();

    // Both independent processes MUST resolve to the identical reportId
    expect(result1.reportId).toBe(result2.reportId);

    // Exactly 1 report record created in PostgreSQL
    const reportsInDb = await prisma.report.findMany({ where: { orderId: order.id } });
    expect(reportsInDb.length).toBe(1);

    // Order fulfillmentStatus must be PROCESSING
    const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updatedOrder?.fulfillmentStatus).toBe(FulfillmentStatus.PROCESSING);
  });

  it('1.2 Concurrent requests for DIFFERENT report SKUs proceed independently without blocking', async () => {
    const orderKundli = await createPaidOrder('KUNDLI');
    const orderPlanetary = await createPaidOrder('PLANETARY_SUMMARY');

    const userContext = { id: testUser.id, role: 'USER' };

    const [resKundli, resPlanetary] = await Promise.all([
      worker1.sendRequest('CREATE_REPORT', {
        input: { birthProfileId: testProfileA.id, reportType: 'KUNDLI', orderId: orderKundli.id, async: true },
        user: userContext,
      }),
      worker2.sendRequest('CREATE_REPORT', {
        input: { birthProfileId: testProfileA.id, reportType: 'PLANETARY_SUMMARY', orderId: orderPlanetary.id, async: true },
        user: userContext,
      }),
    ]);

    expect(resKundli.reportId).toBeDefined();
    expect(resPlanetary.reportId).toBeDefined();
    expect(resKundli.reportId).not.toBe(resPlanetary.reportId);

    const kundliReports = await prisma.report.findMany({ where: { orderId: orderKundli.id } });
    const planetaryReports = await prisma.report.findMany({ where: { orderId: orderPlanetary.id } });

    expect(kundliReports.length).toBe(1);
    expect(planetaryReports.length).toBe(1);
  });

  it('1.3 Cross-process concurrency serialization succeeds via PostgreSQL advisory-lock fallback when Redis is disabled', async () => {
    // Disable Redis in both child processes
    await Promise.all([
      worker1.sendRequest('DISABLE_REDIS'),
      worker2.sendRequest('DISABLE_REDIS'),
    ]);

    const order = await createPaidOrder('CAREER_PROSITY');
    const userContext = { id: testUser.id, role: 'USER' };
    const payload = {
      birthProfileId: testProfileA.id,
      reportType: 'CAREER_PROSITY',
      orderId: order.id,
      async: true,
    };

    // Both processes contend on PostgreSQL transaction advisory locks (pg_advisory_xact_lock)
    const [result1, result2] = await Promise.all([
      worker1.sendRequest('CREATE_REPORT', { input: payload, user: userContext }),
      worker2.sendRequest('CREATE_REPORT', { input: payload, user: userContext }),
    ]);

    // Re-enable Redis in both processes
    await Promise.all([
      worker1.sendRequest('ENABLE_REDIS'),
      worker2.sendRequest('ENABLE_REDIS'),
    ]);

    expect(result1.reportId).toBe(result2.reportId);

    const reports = await prisma.report.findMany({ where: { orderId: order.id } });
    expect(reports.length).toBe(1);
  });

  it('1.4 Lock failure does not leave permanent locks; subsequent requests succeed cleanly', async () => {
    const userContext = { id: testUser.id, role: 'USER' };

    // Request with non-existent birthProfileId throws error in Process 1
    let threwError = false;
    try {
      await worker1.sendRequest('CREATE_REPORT', {
        input: {
          birthProfileId: crypto.randomUUID(), // invalid profile
          reportType: 'KUNDLI',
          async: true,
        },
        user: userContext,
      });
    } catch {
      threwError = true;
    }
    expect(threwError).toBe(true);

    // Process 2 must be able to acquire the lock immediately without being blocked
    const validOrder = await createPaidOrder('KUNDLI');
    const validRes = await worker2.sendRequest('CREATE_REPORT', {
      input: {
        birthProfileId: testProfileA.id,
        reportType: 'KUNDLI',
        orderId: validOrder.id,
        async: true,
      },
      user: userContext,
    });

    expect(validRes.reportId).toBeDefined();
  });

  // =========================================================================
  // 2. RECURRING STALE-JOB & ORPHANED ORDER RECOVERY
  // =========================================================================
  it('2.1 Recurring stale-job recovery recovers crashed report jobs and orphaned PROCESSING orders', async () => {
    const order = await createPaidOrder('KUNDLI');
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);

    // 1. Seed an orphaned report stuck in CALCULATING stage > 5 minutes
    const staleReportId = crypto.randomUUID();
    await prisma.report.create({
      data: {
        id: staleReportId,
        userId: testUser.id,
        birthProfileId: testProfileA.id,
        orderId: order.id,
        reportType: 'KUNDLI',
        status: 'CALCULATING',
        stage: 'CALCULATING',
        progress: 25,
      } as any,
    });
    await prisma.$executeRaw`UPDATE "reports" SET "updatedAt" = (NOW() at time zone 'UTC') - INTERVAL '10 minutes' WHERE id = ${staleReportId}`;

    // Mark order as PROCESSING in the past
    await prisma.$executeRaw`UPDATE "orders" SET "fulfillmentStatus" = 'PROCESSING'::"FulfillmentStatus", "updatedAt" = (NOW() at time zone 'UTC') - INTERVAL '10 minutes' WHERE id = ${order.id}`;

    // 2. Trigger stale recovery
    const recoveryStats = await careerReportWorker.recoverStaleJobs();
    expect(recoveryStats.recoveredReports).toBeGreaterThanOrEqual(1);

    // 3. Verify report was transitioned to FAILED
    const recoveredReport = await prisma.report.findUnique({ where: { id: staleReportId } });
    expect(recoveredReport?.status).toBe('FAILED');
    expect(recoveredReport?.errorCode).toBe('WORKER_TIMEOUT_RECOVERED');

    // 4. Verify order was transitioned to FAILED (leaving status: PAID)
    const recoveredOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(recoveredOrder?.status).toBe(OrderStatus.PAID);
    expect(recoveredOrder?.fulfillmentStatus).toBe(FulfillmentStatus.FAILED);

    // 5. Customer can immediately retry using the same orderId without being charged again
    const userContext = { id: testUser.id, role: 'USER' };
    const retryResult = await worker1.sendRequest('CREATE_REPORT', {
      input: {
        birthProfileId: testProfileA.id,
        reportType: 'KUNDLI',
        orderId: order.id,
        async: true,
      },
      user: userContext,
    });

    expect(retryResult.reportId).toBeDefined();
    expect(retryResult.reportId).not.toBe(staleReportId);

    const finalOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(finalOrder?.fulfillmentStatus).toBe(FulfillmentStatus.PROCESSING);
  });

  it('2.2 Autonomous recovery recovers orphaned PROCESSING order without active report records', async () => {
    const order = await createPaidOrder('PLANETARY_SUMMARY');

    // Simulate server crash between order claim and report creation:
    // Order was marked PROCESSING, but no Report row exists!
    await prisma.$executeRaw`UPDATE "orders" SET "fulfillmentStatus" = 'PROCESSING'::"FulfillmentStatus", "updatedAt" = (NOW() at time zone 'UTC') - INTERVAL '10 minutes' WHERE id = ${order.id}`;

    // Run recovery
    const recoveryStats = await careerReportWorker.recoverStaleJobs();
    expect(recoveryStats.recoveredOrders).toBeGreaterThanOrEqual(1);

    const recoveredOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(recoveredOrder?.fulfillmentStatus).toBe(FulfillmentStatus.FAILED);
    expect(recoveredOrder?.status).toBe(OrderStatus.PAID);
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/services/prisma.service';
import { fulfillmentService } from '../../src/modules/fulfillment/fulfillment.service';
import { 
  OrderStatus, 
  PaymentStatus, 
  FulfillmentStatus, 
  ObligationType, 
  FulfillmentUnitStatus, 
  OrderItemType, 
  FulfillmentType,
  ShipmentStatus,
  ShipmentItemStatus,
  Role
} from '@prisma/client';
import { ValidationError, ConflictError } from '../../src/errors/app-error';

describe('Phase 1 Fulfillment Foundation Tests', () => {
  let testUser: any;
  let testUserB: any;

  async function cleanupTestData() {
    const users = await prisma.user.findMany({
      where: { email: { in: ['fulfillment-test@astrosushil.com', 'fulfillment-test-b@astrosushil.com'] } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    if (!userIds.length) return;

    const orders = await prisma.order.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    });
    const orderIds = orders.map((o) => o.id);

    if (orderIds.length) {
      await prisma.shipmentItem.deleteMany({ where: { shipment: { orderId: { in: orderIds } } } });
      await prisma.shipment.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.refundItemAllocation.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.refund.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.fulfillmentUnit.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }

    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
  }

  beforeAll(async () => {
    await cleanupTestData();

    testUser = await prisma.user.create({
      data: {
        email: 'fulfillment-test@astrosushil.com',
        fullName: 'Fulfillment Test User',
        role: Role.USER,
      },
    });

    testUserB = await prisma.user.create({
      data: {
        email: 'fulfillment-test-b@astrosushil.com',
        fullName: 'Fulfillment Test User B',
        role: Role.USER,
      },
    });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  // Helper to create paid order with items
  async function createTestOrder(userId: string, itemsData: Array<{
    itemType: OrderItemType;
    catalogId: string;
    title: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    fulfillmentType?: FulfillmentType;
  }>) {
    const orderId = `test-ord-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const totalAmount = itemsData.reduce((sum, item) => sum + item.totalAmount, 0);

    return prisma.order.create({
      data: {
        id: orderId,
        userId,
        razorpayOrderId: `rzp_order_${orderId}`,
        razorpayPaymentId: `rzp_pay_${orderId}`,
        amount: totalAmount,
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.CAPTURED,
        fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
        paidAt: new Date(),
        items: {
          create: itemsData.map((item) => ({
            itemType: item.itemType,
            catalogId: item.catalogId,
            title: item.title,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalAmount: item.totalAmount,
            fulfillmentType: item.fulfillmentType || FulfillmentType.DIGITAL,
          })),
        },
      },
      include: { items: true },
    });
  }

  // 1. Creating one fulfillment unit for quantity 1
  it('1. should create one fulfillment unit for quantity 1', async () => {
    const order = await createTestOrder(testUser.id, [
      {
        itemType: OrderItemType.REPORT,
        catalogId: 'report-career',
        title: 'Career Report',
        quantity: 1,
        unitPrice: 99900,
        totalAmount: 99900,
        fulfillmentType: FulfillmentType.DIGITAL,
      },
    ]);

    const units = await fulfillmentService.createFulfillmentUnitsForOrder(order.id);

    expect(units).toHaveLength(1);
    expect(units[0].orderId).toBe(order.id);
    expect(units[0].orderItemId).toBe(order.items[0].id);
    expect(units[0].unitIndex).toBe(1);
    expect(units[0].obligationType).toBe(ObligationType.REPORT);
    expect(units[0].status).toBe(FulfillmentUnitStatus.UNFULFILLED);
    expect(units[0].version).toBe(0);
  });

  // 2. Creating multiple units for quantity greater than 1
  it('2. should create multiple units for quantity greater than 1', async () => {
    const order = await createTestOrder(testUser.id, [
      {
        itemType: OrderItemType.PRODUCT,
        catalogId: 'prod-brass-yantra',
        title: 'Shree Yantra',
        quantity: 3,
        unitPrice: 150000,
        totalAmount: 450000,
        fulfillmentType: FulfillmentType.PHYSICAL,
      },
    ]);

    const units = await fulfillmentService.createFulfillmentUnitsForOrder(order.id);

    expect(units).toHaveLength(3);
    expect(units.map((u) => u.unitIndex)).toEqual([1, 2, 3]);
    units.forEach((u) => {
      expect(u.orderId).toBe(order.id);
      expect(u.orderItemId).toBe(order.items[0].id);
      expect(u.obligationType).toBe(ObligationType.PHYSICAL_PRODUCT);
      expect(u.status).toBe(FulfillmentUnitStatus.UNFULFILLED);
    });
  });

  // 3. Idempotent repeated creation
  it('3. should be idempotent and not create duplicate units on repeated creation', async () => {
    const order = await createTestOrder(testUser.id, [
      {
        itemType: OrderItemType.CONSULTATION,
        catalogId: 'consult-30m',
        title: '30 Min Consultation',
        quantity: 2,
        unitPrice: 200000,
        totalAmount: 400000,
        fulfillmentType: FulfillmentType.SERVICE,
      },
    ]);

    const firstRun = await fulfillmentService.createFulfillmentUnitsForOrder(order.id);
    expect(firstRun).toHaveLength(2);

    // Repeated run
    const secondRun = await fulfillmentService.createFulfillmentUnitsForOrder(order.id);
    expect(secondRun).toHaveLength(2);
    expect(secondRun.map((u) => u.id)).toEqual(firstRun.map((u) => u.id));

    // Confirm database row count
    const dbCount = await prisma.fulfillmentUnit.count({ where: { orderId: order.id } });
    expect(dbCount).toBe(2);
  });

  // 4. Course quantity greater than 1 rejection
  it('4. should reject course quantity greater than 1 with MULTI_SEAT_COURSES_UNSUPPORTED', async () => {
    const order = await createTestOrder(testUser.id, [
      {
        itemType: OrderItemType.COURSE,
        catalogId: 'course-vedic-astrology',
        title: 'Vedic Astrology Course',
        quantity: 2,
        unitPrice: 500000,
        totalAmount: 1000000,
        fulfillmentType: FulfillmentType.DIGITAL,
      },
    ]);

    await expect(
      fulfillmentService.createFulfillmentUnitsForOrder(order.id)
    ).rejects.toThrow(ValidationError);

    await expect(
      fulfillmentService.createFulfillmentUnitsForOrder(order.id)
    ).rejects.toThrow(/Multi-seat courses are unsupported/i);
  });

  // 5. Preventing a fulfillment unit from referencing an order item belonging to another order
  it('5. should prevent a fulfillment unit from referencing an order item belonging to another order at DB level', async () => {
    const orderA = await createTestOrder(testUser.id, [
      { itemType: OrderItemType.REPORT, catalogId: 'rep-a', title: 'A', quantity: 1, unitPrice: 1000, totalAmount: 1000 },
    ]);
    const orderB = await createTestOrder(testUserB.id, [
      { itemType: OrderItemType.REPORT, catalogId: 'rep-b', title: 'B', quantity: 1, unitPrice: 1000, totalAmount: 1000 },
    ]);

    // Attempt to violate composite foreign key (orderId, orderItemId) -> order_items(orderId, id)
    await expect(
      prisma.fulfillmentUnit.create({
        data: {
          orderId: orderA.id,
          orderItemId: orderB.items[0].id, // Belongs to Order B, not Order A!
          obligationType: ObligationType.REPORT,
          unitIndex: 1,
          status: FulfillmentUnitStatus.UNFULFILLED,
        },
      })
    ).rejects.toThrow();
  });

  // 6. Preventing a refund allocation from referencing a refund belonging to another order
  it('6. should prevent a refund allocation from referencing a refund belonging to another order at DB level', async () => {
    const orderA = await createTestOrder(testUser.id, [
      { itemType: OrderItemType.REPORT, catalogId: 'rep-a', title: 'A', quantity: 1, unitPrice: 2000, totalAmount: 2000 },
    ]);
    const orderB = await createTestOrder(testUserB.id, [
      { itemType: OrderItemType.REPORT, catalogId: 'rep-b', title: 'B', quantity: 1, unitPrice: 3000, totalAmount: 3000 },
    ]);

    const refundA = await prisma.refund.create({
      data: {
        orderId: orderA.id,
        amount: 2000,
        status: 'PENDING',
      },
    });

    // Attempt to link refundA (Order A) with orderB.items[0] (Order B)
    // Protected by composite foreign key (orderId, orderItemId) -> order_items(orderId, id)
    await expect(
      prisma.refundItemAllocation.create({
        data: {
          orderId: orderA.id, // Order A matches refundA, but NOT orderB.items[0]!
          refundId: refundA.id,
          orderItemId: orderB.items[0].id,
          amount: 1000,
        },
      })
    ).rejects.toThrow();
  });

  // 7. Preventing duplicate active shipment allocations for the same fulfillment unit
  it('7. should enforce single active shipment allocation via partial unique index', async () => {
    const order = await createTestOrder(testUser.id, [
      {
        itemType: OrderItemType.PRODUCT,
        catalogId: 'gemstone-ruby',
        title: 'Ruby Gemstone',
        quantity: 1,
        unitPrice: 1000000,
        totalAmount: 1000000,
        fulfillmentType: FulfillmentType.PHYSICAL,
      },
    ]);

    const units = await fulfillmentService.createFulfillmentUnitsForOrder(order.id);
    const unit = units[0];

    const shipment1 = await prisma.shipment.create({
      data: {
        orderId: order.id,
        carrier: 'BlueDart',
        trackingNumber: `TRACK-1-${Date.now()}`,
        status: ShipmentStatus.LABEL_CREATED,
      },
    });

    const shipment2 = await prisma.shipment.create({
      data: {
        orderId: order.id,
        carrier: 'Delhivery',
        trackingNumber: `TRACK-2-${Date.now()}`,
        status: ShipmentStatus.LABEL_CREATED,
      },
    });

    // 1st allocation in Shipment 1 with status ALLOCATED
    await prisma.shipmentItem.create({
      data: {
        shipmentId: shipment1.id,
        fulfillmentUnitId: unit.id,
        status: ShipmentItemStatus.ALLOCATED,
      },
    });

    // 2nd active allocation in Shipment 2 for SAME unit must FAIL via uq_active_fulfillment_unit_shipment
    await expect(
      prisma.shipmentItem.create({
        data: {
          shipmentId: shipment2.id,
          fulfillmentUnitId: unit.id,
          status: ShipmentItemStatus.ALLOCATED,
        },
      })
    ).rejects.toThrow();

    // Mark 1st item as SUPERSEDED_LOST (frees partial unique index)
    await prisma.shipmentItem.update({
      where: { shipmentId_fulfillmentUnitId: { shipmentId: shipment1.id, fulfillmentUnitId: unit.id } },
      data: { status: ShipmentItemStatus.SUPERSEDED_LOST },
    });

    // Now allocation in Shipment 2 must SUCCEED as a replacement
    const replacementItem = await prisma.shipmentItem.create({
      data: {
        shipmentId: shipment2.id,
        fulfillmentUnitId: unit.id,
        status: ShipmentItemStatus.ALLOCATED,
        isReplacement: true,
      },
    });

    expect(replacementItem.isReplacement).toBe(true);
    expect(replacementItem.status).toBe(ShipmentItemStatus.ALLOCATED);
  });

  // 8. Correct aggregation when all units are fulfilled
  it('8. should mark order fulfillmentStatus = FULFILLED while preserving commercial status = PAID', async () => {
    const order = await createTestOrder(testUser.id, [
      { itemType: OrderItemType.REPORT, catalogId: 'rep-career', title: 'Career', quantity: 1, unitPrice: 1000, totalAmount: 1000 },
      { itemType: OrderItemType.COURSE, catalogId: 'course-basics', title: 'Basics', quantity: 1, unitPrice: 2000, totalAmount: 2000 },
    ]);

    const units = await fulfillmentService.createFulfillmentUnitsForOrder(order.id);
    expect(units).toHaveLength(2);

    // Update both units to FULFILLED
    for (const u of units) {
      await fulfillmentService.updateUnitStatusWithCas(u.id, u.version, FulfillmentUnitStatus.FULFILLED);
    }

    const result = await fulfillmentService.reconcileOrderFulfillment(order.id);

    expect(result.orderFulfillmentStatus).toBe(FulfillmentStatus.FULFILLED);
    expect(result.itemStatuses[order.items[0].id]).toBe(FulfillmentStatus.FULFILLED);
    expect(result.itemStatuses[order.items[1].id]).toBe(FulfillmentStatus.FULFILLED);

    // Verify DB persisted state: commercial status MUST REMAIN PAID!
    const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(dbOrder?.fulfillmentStatus).toBe(FulfillmentStatus.FULFILLED);
    expect(dbOrder?.status).toBe(OrderStatus.PAID); // NOT FULFILLED!
  });

  // 9. Correct aggregation when some units remain pending
  it('9. should mark order fulfillmentStatus = PROCESSING when some units remain pending', async () => {
    const order = await createTestOrder(testUser.id, [
      { itemType: OrderItemType.REPORT, catalogId: 'rep-1', title: 'Report 1', quantity: 1, unitPrice: 1000, totalAmount: 1000 },
      { itemType: OrderItemType.REPORT, catalogId: 'rep-2', title: 'Report 2', quantity: 1, unitPrice: 1000, totalAmount: 1000 },
    ]);

    const units = await fulfillmentService.createFulfillmentUnitsForOrder(order.id);

    // Unit 0 fulfilled, Unit 1 stays UNFULFILLED
    await fulfillmentService.updateUnitStatusWithCas(units[0].id, units[0].version, FulfillmentUnitStatus.FULFILLED);

    const result = await fulfillmentService.reconcileOrderFulfillment(order.id);

    expect(result.orderFulfillmentStatus).toBe(FulfillmentStatus.PROCESSING);
    
    // Find item matching fulfilled unit vs pending unit
    const fulfilledItem = order.items.find((i) => i.id === units[0].orderItemId)!;
    const pendingItem = order.items.find((i) => i.id === units[1].orderItemId)!;

    expect(result.itemStatuses[fulfilledItem.id]).toBe(FulfillmentStatus.FULFILLED);
    expect(result.itemStatuses[pendingItem.id]).toBe(FulfillmentStatus.PROCESSING);

    const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(dbOrder?.fulfillmentStatus).toBe(FulfillmentStatus.PROCESSING);
    expect(dbOrder?.status).toBe(OrderStatus.PAID);
  });

  // 10. Correct aggregation when a unit fails or is cancelled
  it('10. should correctly aggregate failures and cancellations without order-level destruction', async () => {
    // Sub-case A: 1 Fulfilled, 1 Cancelled -> Order FULFILLED with hasCancelledItems flag
    const orderA = await createTestOrder(testUser.id, [
      { itemType: OrderItemType.REPORT, catalogId: 'rep-1', title: 'Rep', quantity: 1, unitPrice: 1000, totalAmount: 1000 },
      { itemType: OrderItemType.CONSULTATION, catalogId: 'con-1', title: 'Con', quantity: 1, unitPrice: 2000, totalAmount: 2000 },
    ]);
    const unitsA = await fulfillmentService.createFulfillmentUnitsForOrder(orderA.id);
    await fulfillmentService.updateUnitStatusWithCas(unitsA[0].id, unitsA[0].version, FulfillmentUnitStatus.FULFILLED);
    await fulfillmentService.updateUnitStatusWithCas(unitsA[1].id, unitsA[1].version, FulfillmentUnitStatus.CANCELLED);

    const resultA = await fulfillmentService.reconcileOrderFulfillment(orderA.id);
    expect(resultA.orderFulfillmentStatus).toBe(FulfillmentStatus.FULFILLED);
    const dbOrderA = await prisma.order.findUnique({ where: { id: orderA.id } });
    expect((dbOrderA?.metadata as any)?.hasCancelledItems).toBe(true);
    expect(dbOrderA?.status).toBe(OrderStatus.PAID);

    // Sub-case B: 1 Fulfilled, 1 Failed -> Order PROCESSING with partialFailure flag
    const orderB = await createTestOrder(testUser.id, [
      { itemType: OrderItemType.REPORT, catalogId: 'rep-1', title: 'Rep', quantity: 1, unitPrice: 1000, totalAmount: 1000 },
      { itemType: OrderItemType.REPORT, catalogId: 'rep-2', title: 'Rep 2', quantity: 1, unitPrice: 1000, totalAmount: 1000 },
    ]);
    const unitsB = await fulfillmentService.createFulfillmentUnitsForOrder(orderB.id);
    await fulfillmentService.updateUnitStatusWithCas(unitsB[0].id, unitsB[0].version, FulfillmentUnitStatus.FULFILLED);
    await fulfillmentService.updateUnitStatusWithCas(unitsB[1].id, unitsB[1].version, FulfillmentUnitStatus.FAILED);

    const resultB = await fulfillmentService.reconcileOrderFulfillment(orderB.id);
    expect(resultB.orderFulfillmentStatus).toBe(FulfillmentStatus.PROCESSING);
    const dbOrderB = await prisma.order.findUnique({ where: { id: orderB.id } });
    expect((dbOrderB?.metadata as any)?.partialFailure).toBe(true);

    // Sub-case C: 100% Failed -> Order FAILED
    const orderC = await createTestOrder(testUser.id, [
      { itemType: OrderItemType.REPORT, catalogId: 'rep-1', title: 'Rep', quantity: 1, unitPrice: 1000, totalAmount: 1000 },
    ]);
    const unitsC = await fulfillmentService.createFulfillmentUnitsForOrder(orderC.id);
    await fulfillmentService.updateUnitStatusWithCas(unitsC[0].id, unitsC[0].version, FulfillmentUnitStatus.FAILED);
    const resultC = await fulfillmentService.reconcileOrderFulfillment(orderC.id);
    expect(resultC.orderFulfillmentStatus).toBe(FulfillmentStatus.FAILED);

    // Sub-case D: 100% Cancelled -> Order CANCELLED
    const orderD = await createTestOrder(testUser.id, [
      { itemType: OrderItemType.REPORT, catalogId: 'rep-1', title: 'Rep', quantity: 1, unitPrice: 1000, totalAmount: 1000 },
    ]);
    const unitsD = await fulfillmentService.createFulfillmentUnitsForOrder(orderD.id);
    await fulfillmentService.updateUnitStatusWithCas(unitsD[0].id, unitsD[0].version, FulfillmentUnitStatus.CANCELLED);
    const resultD = await fulfillmentService.reconcileOrderFulfillment(orderD.id);
    expect(resultD.orderFulfillmentStatus).toBe(FulfillmentStatus.CANCELLED);
  });

  // 11. Concurrent reconciliation without lost updates
  it('11. should detect concurrent update conflicts using CAS version check', async () => {
    const order = await createTestOrder(testUser.id, [
      { itemType: OrderItemType.REPORT, catalogId: 'rep-1', title: 'Rep', quantity: 1, unitPrice: 1000, totalAmount: 1000 },
    ]);

    const units = await fulfillmentService.createFulfillmentUnitsForOrder(order.id);
    const targetUnit = units[0];
    expect(targetUnit.version).toBe(0);

    // First update succeeds (version: 0 -> 1)
    const updated = await fulfillmentService.updateUnitStatusWithCas(
      targetUnit.id,
      0, // expectedVersion = 0
      FulfillmentUnitStatus.PROCESSING
    );
    expect(updated?.version).toBe(1);
    expect(updated?.status).toBe(FulfillmentUnitStatus.PROCESSING);

    // Second update with stale expectedVersion = 0 must fail with ConflictError (CAS_CONFLICT)
    await expect(
      fulfillmentService.updateUnitStatusWithCas(
        targetUnit.id,
        0, // stale version!
        FulfillmentUnitStatus.FULFILLED
      )
    ).rejects.toThrow(ConflictError);

    // Update with correct expectedVersion = 1 must succeed
    const finalUpdate = await fulfillmentService.updateUnitStatusWithCas(
      targetUnit.id,
      1, // correct current version
      FulfillmentUnitStatus.FULFILLED
    );
    expect(finalUpdate?.version).toBe(2);
    expect(finalUpdate?.status).toBe(FulfillmentUnitStatus.FULFILLED);
  });
});

import { Prisma, OrderStatus, FulfillmentStatus, ObligationType, FulfillmentUnitStatus, OrderItemType, FulfillmentType, ShipmentItemStatus } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { NotFoundError, ValidationError, ConflictError } from '../../errors/app-error';
import { logger } from '../../utils/logger';

export interface ReconcileResult {
  orderFulfillmentStatus: FulfillmentStatus;
  itemStatuses: Record<string, FulfillmentStatus>;
}

export class FulfillmentService {
  /**
   * Determine the ObligationType for a line item based on its itemType and fulfillmentType.
   */
  public mapItemToObligationType(itemType: OrderItemType, fulfillmentType: FulfillmentType): ObligationType {
    switch (itemType) {
      case OrderItemType.REPORT:
        return ObligationType.REPORT;
      case OrderItemType.COURSE:
        return ObligationType.COURSE;
      case OrderItemType.CONSULTATION:
        return ObligationType.CONSULTATION;
      case OrderItemType.PRODUCT:
        return fulfillmentType === FulfillmentType.PHYSICAL
          ? ObligationType.PHYSICAL_PRODUCT
          : ObligationType.DIGITAL_PRODUCT;
      default:
        throw new ValidationError(`Unknown itemType: ${itemType}`);
    }
  }

  /**
   * Create FulfillmentUnit records for an order.
   * - Enforces 1 unit per purchased item quantity.
   * - Strictly rejects course purchases with quantity > 1 (unsupported multi-seat).
   * - Idempotent: repeated calls do not recreate existing units.
   * - Transactional lock hierarchy: orders -> order_items -> fulfillment_units.
   */
  public async createFulfillmentUnitsForOrder(
    orderId: string,
    txClient?: Prisma.TransactionClient
  ) {
    const execute = async (tx: Prisma.TransactionClient) => {
      // 1. Lock Parent Order FIRST (Global Lock Hierarchy)
      const orders = await tx.$queryRaw<Array<{ id: string; status: OrderStatus; paymentStatus: string; paidAt: Date | null }>>`
        SELECT id, status, "paymentStatus", "paidAt"
        FROM "orders"
        WHERE id = ${orderId}
        FOR UPDATE;
      `;
      if (!orders.length) {
        throw new NotFoundError(`Order ${orderId} not found`);
      }
      const order = orders[0];

      // 2. Lock OrderItems SECOND in ASC Order
      const items = await tx.$queryRaw<Array<{
        id: string;
        orderId: string;
        itemType: OrderItemType;
        quantity: number;
        fulfillmentType: FulfillmentType;
      }>>`
        SELECT id, "orderId", "itemType", quantity, "fulfillmentType"
        FROM "order_items"
        WHERE "orderId" = ${orderId}
        ORDER BY id ASC
        FOR UPDATE;
      `;

      if (!items.length) {
        return [];
      }

      // 3. Validation: Reject multi-seat course purchase
      for (const item of items) {
        if (item.itemType === OrderItemType.COURSE && item.quantity > 1) {
          throw new ValidationError(
            'Multi-seat courses are unsupported. Course quantity must be 1.',
            [{ field: 'quantity', message: 'Quantity cannot exceed 1 for course items', code: 'MULTI_SEAT_COURSES_UNSUPPORTED' }]
          );
        }
      }

      // 4. Lock and query existing fulfillment units for this order
      const existingUnits = await tx.$queryRaw<Array<{
        id: string;
        orderItemId: string;
        unitIndex: number;
      }>>`
        SELECT id, "orderItemId", "unitIndex"
        FROM "fulfillment_units"
        WHERE "orderId" = ${orderId}
        ORDER BY "orderItemId" ASC, "unitIndex" ASC
        FOR UPDATE;
      `;

      const existingMap = new Set(
        existingUnits.map((u) => `${u.orderItemId}:${u.unitIndex}`)
      );

      const createdUnits: any[] = [];

      // 5. Create missing fulfillment units idempotently
      for (const item of items) {
        const obligationType = this.mapItemToObligationType(item.itemType, item.fulfillmentType);

        for (let unitIndex = 1; unitIndex <= item.quantity; unitIndex++) {
          const key = `${item.id}:${unitIndex}`;
          if (existingMap.has(key)) {
            continue; // Idempotent: already exists
          }

          const unit = await tx.fulfillmentUnit.create({
            data: {
              orderId,
              orderItemId: item.id,
              obligationType,
              unitIndex,
              status: FulfillmentUnitStatus.UNFULFILLED,
              version: 0,
            },
          });
          createdUnits.push(unit);
          existingMap.add(key);
        }
      }

      logger.info(
        { orderId, createdCount: createdUnits.length, totalExisting: existingUnits.length },
        '[FulfillmentService] Fulfillment units processed for order'
      );

      // Return all current units for the order
      return tx.fulfillmentUnit.findMany({
        where: { orderId },
        orderBy: [{ orderItemId: 'asc' }, { unitIndex: 'asc' }],
      });
    };

    if (txClient) {
      return execute(txClient);
    }
    return prisma.$transaction(execute, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  /**
   * Retrieve fulfillment units by Order ID.
   */
  public async getFulfillmentUnitsByOrderId(orderId: string) {
    return prisma.fulfillmentUnit.findMany({
      where: { orderId },
      include: {
        report: true,
        courseEntitlement: true,
        consultationBooking: true,
        digitalEntitlement: true,
        shipmentItems: true,
      },
      orderBy: [{ orderItemId: 'asc' }, { unitIndex: 'asc' }],
    });
  }

  /**
   * Retrieve fulfillment units by OrderItem ID.
   */
  public async getFulfillmentUnitsByOrderItemId(orderItemId: string) {
    return prisma.fulfillmentUnit.findMany({
      where: { orderItemId },
      include: {
        report: true,
        courseEntitlement: true,
        consultationBooking: true,
        digitalEntitlement: true,
        shipmentItems: true,
      },
      orderBy: { unitIndex: 'asc' },
    });
  }

  /**
   * Retrieve a single FulfillmentUnit by ID with relations.
   */
  public async getFulfillmentUnitById(unitId: string) {
    return prisma.fulfillmentUnit.findUnique({
      where: { id: unitId },
      include: {
        report: true,
        courseEntitlement: true,
        consultationBooking: true,
        digitalEntitlement: true,
        shipmentItems: true,
      },
    });
  }

  /**
   * Calculate aggregated item-level and order-level fulfillment status from unit states.
   * Deterministic decision logic matching PHASE_1_5A_FULFILLMENT_DESIGN.md Section 10.
   */
  public aggregateFulfillment(
    units: Array<{ id: string; orderItemId: string; status: FulfillmentUnitStatus }>
  ): {
    orderStatus: FulfillmentStatus;
    itemStatuses: Record<string, FulfillmentStatus>;
    hasCancelledItems: boolean;
    hasPartialFailure: boolean;
  } {
    if (!units.length) {
      return {
        orderStatus: FulfillmentStatus.UNFULFILLED,
        itemStatuses: {},
        hasCancelledItems: false,
        hasPartialFailure: false,
      };
    }

    // Group units by orderItemId
    const itemMap: Record<string, FulfillmentUnitStatus[]> = {};
    for (const unit of units) {
      if (!itemMap[unit.orderItemId]) {
        itemMap[unit.orderItemId] = [];
      }
      itemMap[unit.orderItemId].push(unit.status);
    }

    const itemStatuses: Record<string, FulfillmentStatus> = {};
    let anyItemFailed = false;
    let anyItemCancelled = false;

    for (const [orderItemId, statuses] of Object.entries(itemMap)) {
      const nonCancelled = statuses.filter((s) => s !== FulfillmentUnitStatus.CANCELLED);

      if (statuses.length > 0 && nonCancelled.length === 0) {
        itemStatuses[orderItemId] = FulfillmentStatus.CANCELLED;
        anyItemCancelled = true;
      } else if (nonCancelled.every((s) => s === FulfillmentUnitStatus.FULFILLED)) {
        itemStatuses[orderItemId] = FulfillmentStatus.FULFILLED;
      } else if (nonCancelled.every((s) => s === FulfillmentUnitStatus.FAILED)) {
        itemStatuses[orderItemId] = FulfillmentStatus.FAILED;
        anyItemFailed = true;
      } else if (nonCancelled.some((s) => s === FulfillmentUnitStatus.FAILED)) {
        // Partial item failure -> stay in PROCESSING with failure flag
        itemStatuses[orderItemId] = FulfillmentStatus.PROCESSING;
        anyItemFailed = true;
      } else if (nonCancelled.some((s) => s === FulfillmentUnitStatus.PROCESSING || s === FulfillmentUnitStatus.UNFULFILLED || s === FulfillmentUnitStatus.INCONSISTENT_MISSING_RECORD)) {
        itemStatuses[orderItemId] = FulfillmentStatus.PROCESSING;
      } else if (nonCancelled.some((s) => s === FulfillmentUnitStatus.DISPATCHED)) {
        itemStatuses[orderItemId] = FulfillmentStatus.DISPATCHED;
      } else if (nonCancelled.some((s) => s === FulfillmentUnitStatus.SCHEDULED)) {
        itemStatuses[orderItemId] = FulfillmentStatus.SCHEDULED;
      } else {
        itemStatuses[orderItemId] = FulfillmentStatus.PROCESSING;
      }
    }

    // Aggregate parent Order status
    const allStatuses = units.map((u) => u.status);
    const nonCancelledUnits = allStatuses.filter((s) => s !== FulfillmentUnitStatus.CANCELLED);

    let orderStatus: FulfillmentStatus = FulfillmentStatus.PROCESSING;

    if (allStatuses.length > 0 && nonCancelledUnits.length === 0) {
      orderStatus = FulfillmentStatus.CANCELLED;
    } else if (nonCancelledUnits.every((s) => s === FulfillmentUnitStatus.FULFILLED)) {
      orderStatus = FulfillmentStatus.FULFILLED;
    } else if (nonCancelledUnits.every((s) => s === FulfillmentUnitStatus.FAILED)) {
      orderStatus = FulfillmentStatus.FAILED;
    } else if (nonCancelledUnits.some((s) => s === FulfillmentUnitStatus.PROCESSING || s === FulfillmentUnitStatus.UNFULFILLED || s === FulfillmentUnitStatus.INCONSISTENT_MISSING_RECORD)) {
      orderStatus = FulfillmentStatus.PROCESSING;
    } else if (nonCancelledUnits.some((s) => s === FulfillmentUnitStatus.DISPATCHED)) {
      orderStatus = FulfillmentStatus.DISPATCHED;
    } else if (nonCancelledUnits.some((s) => s === FulfillmentUnitStatus.SCHEDULED)) {
      orderStatus = FulfillmentStatus.SCHEDULED;
    } else if (anyItemFailed) {
      orderStatus = FulfillmentStatus.PROCESSING;
    }

    return {
      orderStatus,
      itemStatuses,
      hasCancelledItems: anyItemCancelled,
      hasPartialFailure: anyItemFailed,
    };
  }

  /**
   * Reconcile fulfillment status for an entire order and its items.
   * Lock order: orders -> order_items -> fulfillment_units.
   * IMPORTANT: Does NOT transition Order.status to FULFILLED! Commercial status remains PAID.
   */
  public async reconcileOrderFulfillment(
    orderId: string,
    txClient?: Prisma.TransactionClient
  ): Promise<ReconcileResult> {
    const execute = async (tx: Prisma.TransactionClient) => {
      // 1. Lock Parent Order FIRST (Global Lock Hierarchy)
      const orders = await tx.$queryRaw<Array<{ id: string; status: OrderStatus; fulfillmentStatus: FulfillmentStatus; metadata: any }>>`
        SELECT id, status, "fulfillmentStatus", metadata
        FROM "orders"
        WHERE id = ${orderId}
        FOR UPDATE;
      `;
      if (!orders.length) {
        throw new NotFoundError(`Order ${orderId} not found`);
      }
      const order = orders[0];

      // 2. Lock OrderItems SECOND in ASC Order
      const items = await tx.$queryRaw<Array<{ id: string; fulfillmentStatus: FulfillmentStatus }>>`
        SELECT id, "fulfillmentStatus"
        FROM "order_items"
        WHERE "orderId" = ${orderId}
        ORDER BY id ASC
        FOR UPDATE;
      `;

      // 3. Lock FulfillmentUnits THIRD in ASC Order
      const units = await tx.$queryRaw<Array<{
        id: string;
        orderItemId: string;
        status: FulfillmentUnitStatus;
        version: number;
      }>>`
        SELECT id, "orderItemId", status, version
        FROM "fulfillment_units"
        WHERE "orderId" = ${orderId}
        ORDER BY id ASC
        FOR UPDATE;
      `;

      // 4. Compute aggregated statuses
      const { orderStatus, itemStatuses, hasCancelledItems, hasPartialFailure } = this.aggregateFulfillment(units);

      // 5. Update items if status changed
      for (const item of items) {
        const computed = itemStatuses[item.id] || FulfillmentStatus.UNFULFILLED;
        if (item.fulfillmentStatus !== computed) {
          await tx.$executeRaw`
            UPDATE "order_items"
            SET "fulfillmentStatus" = ${computed}::"FulfillmentStatus", "updatedAt" = clock_timestamp()
            WHERE id = ${item.id};
          `;
        }
      }

      // 6. Update Parent Order fulfillmentStatus (Commercial Order.status is preserved!)
      const currentMeta = (typeof order.metadata === 'object' && order.metadata !== null) ? order.metadata : {};
      const newMeta = {
        ...currentMeta,
        ...(hasCancelledItems ? { hasCancelledItems: true } : {}),
        ...(hasPartialFailure ? { partialFailure: true } : {}),
      };

      await tx.$executeRaw`
        UPDATE "orders"
        SET 
          "fulfillmentStatus" = ${orderStatus}::"FulfillmentStatus",
          "metadata" = ${JSON.stringify(newMeta)}::jsonb,
          "updatedAt" = clock_timestamp()
        WHERE id = ${orderId};
      `;

      return {
        orderFulfillmentStatus: orderStatus,
        itemStatuses,
      };
    };

    if (txClient) {
      return execute(txClient);
    }
    return prisma.$transaction(execute, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  /**
   * Reconcile a single FulfillmentUnit with optimistic concurrency check (version CAS).
   * Lock order: orders -> order_items -> fulfillment_units -> child deliverables.
   */
  public async reconcileFulfillmentUnit(
    orderId: string,
    unitId: string,
    txClient?: Prisma.TransactionClient
  ): Promise<void> {
    const execute = async (tx: Prisma.TransactionClient) => {
      // 1. Lock Parent Order FIRST (Global Lock Hierarchy)
      const orders = await tx.$queryRaw<Array<{
        id: string;
        status: OrderStatus;
        paymentStatus: string;
        paidAt: Date | null;
        isSlaBreached: boolean;
      }>>`
        SELECT 
          id, status, "paymentStatus", "paidAt",
          CASE 
            WHEN "paidAt" IS NULL THEN FALSE
            WHEN clock_timestamp() - "paidAt" >= INTERVAL '15 minutes' THEN TRUE
            ELSE FALSE
          END AS "isSlaBreached"
        FROM "orders"
        WHERE id = ${orderId}
        FOR UPDATE;
      `;
      if (!orders.length) throw new NotFoundError(`Order ${orderId} not found`);
      const order = orders[0];

      // 2. Lock OrderItems SECOND in ASC Order
      const items = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "order_items"
        WHERE "orderId" = ${orderId}
        ORDER BY id ASC
        FOR UPDATE;
      `;
      if (!items.length) throw new NotFoundError(`No items found for order ${orderId}`);

      // 3. Lock FulfillmentUnit THIRD
      const units = await tx.$queryRaw<Array<{
        id: string;
        orderId: string;
        orderItemId: string;
        obligationType: ObligationType;
        status: FulfillmentUnitStatus;
        version: number;
      }>>`
        SELECT id, "orderId", "orderItemId", "obligationType", status, version
        FROM "fulfillment_units"
        WHERE id = ${unitId} AND "orderId" = ${orderId}
        FOR UPDATE;
      `;
      if (!units.length) throw new NotFoundError(`FulfillmentUnit ${unitId} not found for Order ${orderId}`);
      const unit = units[0];

      // 4. Revalidate child deliverable evidence under lock
      let computedStatus: FulfillmentUnitStatus = unit.status;
      let failureReason: string | null = null;
      let errorCode: string | null = null;

      switch (unit.obligationType) {
        case ObligationType.REPORT: {
          const reports = await tx.$queryRaw<Array<{
            id: string;
            status: string;
            storageKey: string | null;
            executionAttempts: number;
            recoveryAttempts: number;
            errorCode: string | null;
          }>>`
            SELECT id, status, "storageKey", "executionAttempts", "recoveryAttempts", "errorCode"
            FROM "reports"
            WHERE "fulfillmentUnitId" = ${unitId}
            FOR UPDATE;
          `;

          if (!reports.length) {
            computedStatus = order.isSlaBreached
              ? FulfillmentUnitStatus.INCONSISTENT_MISSING_RECORD
              : FulfillmentUnitStatus.UNFULFILLED;
          } else {
            const r = reports[0];
            if (r.status === 'COMPLETED') {
              if (r.storageKey != null) {
                computedStatus = FulfillmentUnitStatus.FULFILLED;
              } else {
                computedStatus = FulfillmentUnitStatus.FAILED;
                failureReason = 'Report completed but storageKey is null (invalid deliverable)';
                errorCode = 'INVALID_STORAGE_KEY';
              }
            } else if (r.status === 'FAILED') {
              if (r.recoveryAttempts >= 3 || r.executionAttempts >= 3) {
                computedStatus = FulfillmentUnitStatus.FAILED;
                failureReason = 'Compilation exhausted retry budget';
                errorCode = r.errorCode || 'RECOVERY_EXHAUSTED';
              } else {
                computedStatus = FulfillmentUnitStatus.PROCESSING; // Active retry backoff
              }
            } else {
              computedStatus = FulfillmentUnitStatus.PROCESSING;
            }
          }
          break;
        }

        case ObligationType.COURSE: {
          const entitlements = await tx.$queryRaw<Array<{ id: string; status: string }>>`
            SELECT id, status FROM "course_entitlements"
            WHERE "fulfillmentUnitId" = ${unitId}
            FOR UPDATE;
          `;
          if (!entitlements.length) {
            computedStatus = FulfillmentUnitStatus.INCONSISTENT_MISSING_RECORD;
          } else if (entitlements[0].status === 'ACTIVE') {
            computedStatus = FulfillmentUnitStatus.FULFILLED;
          } else if (entitlements[0].status === 'REVOKED') {
            computedStatus = FulfillmentUnitStatus.CANCELLED;
          } else {
            computedStatus = FulfillmentUnitStatus.PROCESSING;
          }
          break;
        }

        case ObligationType.CONSULTATION: {
          const bookings = await tx.$queryRaw<Array<{ id: string; status: string; completedAt: Date | null }>>`
            SELECT id, status, "completedAt" FROM "consultation_bookings"
            WHERE "fulfillmentUnitId" = ${unitId}
            FOR UPDATE;
          `;
          if (!bookings.length) {
            computedStatus = FulfillmentUnitStatus.INCONSISTENT_MISSING_RECORD;
          } else {
            const b = bookings[0];
            if (b.status === 'COMPLETED' && b.completedAt != null) {
              computedStatus = FulfillmentUnitStatus.FULFILLED;
            } else if (['CONFIRMED', 'RESCHEDULED'].includes(b.status)) {
              computedStatus = FulfillmentUnitStatus.SCHEDULED;
            } else if (b.status === 'NO_SHOW') {
              computedStatus = FulfillmentUnitStatus.FAILED;
              failureReason = 'Customer failed to attend scheduled session';
              errorCode = 'CONSULTATION_NO_SHOW';
            } else if (['CANCELLED', 'REFUNDED'].includes(b.status)) {
              computedStatus = FulfillmentUnitStatus.CANCELLED;
            } else {
              computedStatus = FulfillmentUnitStatus.PROCESSING;
            }
          }
          break;
        }

        case ObligationType.DIGITAL_PRODUCT: {
          const dpes = await tx.$queryRaw<Array<{ id: string; status: string; assetKey: string | null }>>`
            SELECT id, status, "assetKey" FROM "digital_product_entitlements"
            WHERE "fulfillmentUnitId" = ${unitId}
            FOR UPDATE;
          `;
          if (!dpes.length) {
            computedStatus = FulfillmentUnitStatus.INCONSISTENT_MISSING_RECORD;
          } else if (dpes[0].status === 'ACTIVE' && dpes[0].assetKey != null) {
            computedStatus = FulfillmentUnitStatus.FULFILLED;
          } else if (dpes[0].status === 'REVOKED') {
            computedStatus = FulfillmentUnitStatus.CANCELLED;
          } else {
            computedStatus = FulfillmentUnitStatus.PROCESSING;
          }
          break;
        }

        case ObligationType.PHYSICAL_PRODUCT: {
          const activeShipmentRows = await tx.$queryRaw<Array<{
            shipmentItemStatus: string;
            shipmentStatus: string;
            shipmentDeliveredAt: Date | null;
          }>>`
            SELECT 
              si.status AS "shipmentItemStatus",
              s.status AS "shipmentStatus",
              s."deliveredAt" AS "shipmentDeliveredAt"
            FROM "shipment_items" si
            JOIN "shipments" s ON s.id = si."shipmentId"
            WHERE si."fulfillmentUnitId" = ${unitId} 
              AND si.status IN ('ALLOCATED', 'IN_TRANSIT', 'DELIVERED')
            FOR UPDATE;
          `;

          if (!activeShipmentRows.length) {
            computedStatus = FulfillmentUnitStatus.PROCESSING;
          } else {
            const row = activeShipmentRows[0];
            if (row.shipmentItemStatus === 'DELIVERED' && row.shipmentStatus === 'DELIVERED' && row.shipmentDeliveredAt != null) {
              computedStatus = FulfillmentUnitStatus.FULFILLED;
            } else if (row.shipmentItemStatus === 'IN_TRANSIT' && ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'PICKED_UP', 'FAILED_ATTEMPT'].includes(row.shipmentStatus)) {
              computedStatus = FulfillmentUnitStatus.DISPATCHED;
            } else if (row.shipmentItemStatus === 'ALLOCATED' && row.shipmentStatus === 'LABEL_CREATED') {
              computedStatus = FulfillmentUnitStatus.PROCESSING;
            } else {
              computedStatus = FulfillmentUnitStatus.PROCESSING;
            }
          }
          break;
        }

        default:
          throw new ValidationError(`Unknown obligationType: ${unit.obligationType}`);
      }

      // 5. Atomic CAS Update on FulfillmentUnit (Checks version in predicate)
      const rowsAffected = await tx.$executeRaw`
        UPDATE "fulfillment_units"
        SET
          status = ${computedStatus}::"FulfillmentUnitStatus",
          version = version + 1,
          "errorCode" = ${errorCode},
          "failureReason" = ${failureReason},
          "fulfilledAt" = CASE WHEN ${computedStatus} = 'FULFILLED' AND "fulfilledAt" IS NULL THEN clock_timestamp() ELSE "fulfilledAt" END,
          "failedAt" = CASE WHEN ${computedStatus} = 'FAILED' AND "failedAt" IS NULL THEN clock_timestamp() ELSE "failedAt" END,
          "cancelledAt" = CASE WHEN ${computedStatus} = 'CANCELLED' AND "cancelledAt" IS NULL THEN clock_timestamp() ELSE "cancelledAt" END,
          "updatedAt" = clock_timestamp()
        WHERE id = ${unitId} AND version = ${unit.version};
      `;

      if (rowsAffected === 0) {
        throw new ConflictError(`CAS_CONFLICT: FulfillmentUnit ${unitId} was concurrently modified`);
      }

      // 6. Aggregate parent order fulfillment under the held Order lock
      await this.reconcileOrderFulfillment(orderId, tx);
    };

    if (txClient) {
      return execute(txClient);
    }
    return prisma.$transaction(execute, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  /**
   * Helper to manually update a unit status (e.g., when a deliverable completes) with CAS concurrency check.
   */
  public async updateUnitStatusWithCas(
    unitId: string,
    currentVersion: number,
    nextStatus: FulfillmentUnitStatus,
    metadata?: Record<string, any>,
    txClient?: Prisma.TransactionClient
  ) {
    const execute = async (tx: Prisma.TransactionClient) => {
      const rowsAffected = await tx.$executeRaw`
        UPDATE "fulfillment_units"
        SET
          status = ${nextStatus}::"FulfillmentUnitStatus",
          version = version + 1,
          "fulfilledAt" = CASE WHEN ${nextStatus} = 'FULFILLED' AND "fulfilledAt" IS NULL THEN clock_timestamp() ELSE "fulfilledAt" END,
          "failedAt" = CASE WHEN ${nextStatus} = 'FAILED' AND "failedAt" IS NULL THEN clock_timestamp() ELSE "failedAt" END,
          "cancelledAt" = CASE WHEN ${nextStatus} = 'CANCELLED' AND "cancelledAt" IS NULL THEN clock_timestamp() ELSE "cancelledAt" END,
          "metadata" = COALESCE(${metadata ? JSON.stringify(metadata) : null}::jsonb, metadata),
          "updatedAt" = clock_timestamp()
        WHERE id = ${unitId} AND version = ${currentVersion};
      `;

      if (rowsAffected === 0) {
        throw new ConflictError(`CAS_CONFLICT: FulfillmentUnit ${unitId} was concurrently modified (expected version ${currentVersion})`);
      }

      const unit = await tx.fulfillmentUnit.findUnique({ where: { id: unitId } });
      if (unit) {
        await this.reconcileOrderFulfillment(unit.orderId, tx);
      }
      return unit;
    };

    if (txClient) {
      return execute(txClient);
    }
    return prisma.$transaction(execute, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  /**
   * Self-healing recovery for completed reports whose fulfillment unit is not yet marked FULFILLED.
   * Resolves the crash window between report completion and fulfillment reconciliation.
   */
  public async reconcileOrphanedCompletedReports(txClient?: Prisma.TransactionClient): Promise<number> {
    const client = txClient || prisma;
    const reports = await client.report.findMany({
      where: {
        status: 'COMPLETED',
        storageKey: { not: null },
        fulfillmentUnitId: { not: null },
        fulfillmentUnit: {
          status: { not: FulfillmentUnitStatus.FULFILLED },
        },
      },
      select: { id: true, orderId: true, fulfillmentUnitId: true },
      take: 50,
    });

    let reconciledCount = 0;
    for (const r of reports) {
      if (r.orderId && r.fulfillmentUnitId) {
        try {
          await this.reconcileFulfillmentUnit(r.orderId, r.fulfillmentUnitId);
          reconciledCount++;
        } catch (err: any) {
          logger.warn({ reportId: r.id, err: err?.message }, '[FulfillmentService] Error self-healing orphaned report');
        }
      }
    }
    return reconciledCount;
  }
}

export const fulfillmentService = new FulfillmentService();

-- CreateEnum
CREATE TYPE "ObligationType" AS ENUM ('REPORT', 'COURSE', 'CONSULTATION', 'DIGITAL_PRODUCT', 'PHYSICAL_PRODUCT');

-- CreateEnum
CREATE TYPE "FulfillmentUnitStatus" AS ENUM ('UNFULFILLED', 'PROCESSING', 'SCHEDULED', 'DISPATCHED', 'DELIVERED', 'FULFILLED', 'FAILED', 'CANCELLED', 'INCONSISTENT_MISSING_RECORD');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('LABEL_CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED_ATTEMPT', 'RETURNED_TO_ORIGIN', 'LOST');

-- CreateEnum
CREATE TYPE "ShipmentItemStatus" AS ENUM ('ALLOCATED', 'IN_TRANSIT', 'DELIVERED', 'SUPERSEDED_LOST', 'SUPERSEDED_RETURNED', 'CANCELLED');

-- AlterTable
ALTER TABLE "consultation_bookings" ADD COLUMN     "fulfillmentUnitId" TEXT;

-- AlterTable
ALTER TABLE "course_entitlements" ADD COLUMN     "fulfillmentUnitId" TEXT;

-- AlterTable
ALTER TABLE "digital_product_entitlements" ADD COLUMN     "fulfillmentUnitId" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'UNFULFILLED';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "claimExpiresAt" TIMESTAMP(3),
ADD COLUMN     "claimToken" TEXT,
ADD COLUMN     "claimVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "claimedAt" TIMESTAMP(3),
ADD COLUMN     "executionAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "expectedDeliveryAt" TIMESTAMP(3),
ADD COLUMN     "fulfillmentUnitId" TEXT,
ADD COLUMN     "recoveryAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "retryAfter" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "fulfillment_units" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "obligationType" "ObligationType" NOT NULL,
    "unitIndex" INTEGER NOT NULL,
    "status" "FulfillmentUnitStatus" NOT NULL DEFAULT 'UNFULFILLED',
    "version" INTEGER NOT NULL DEFAULT 0,
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fulfillment_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "trackingUrl" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'LABEL_CREATED',
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_items" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "fulfillmentUnitId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isReplacement" BOOLEAN NOT NULL DEFAULT false,
    "status" "ShipmentItemStatus" NOT NULL DEFAULT 'ALLOCATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_item_allocations" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "refundId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "restockQuantity" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_item_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fulfillment_units_orderId_status_idx" ON "fulfillment_units"("orderId", "status");

-- CreateIndex
CREATE INDEX "fulfillment_units_obligationType_status_idx" ON "fulfillment_units"("obligationType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "fulfillment_units_orderItemId_unitIndex_key" ON "fulfillment_units"("orderItemId", "unitIndex");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_trackingNumber_key" ON "shipments"("trackingNumber");

-- CreateIndex
CREATE INDEX "shipments_orderId_idx" ON "shipments"("orderId");

-- CreateIndex
CREATE INDEX "shipments_trackingNumber_idx" ON "shipments"("trackingNumber");

-- CreateIndex
CREATE INDEX "shipment_items_fulfillmentUnitId_idx" ON "shipment_items"("fulfillmentUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_items_shipmentId_fulfillmentUnitId_key" ON "shipment_items"("shipmentId", "fulfillmentUnitId");

-- CreateIndex
CREATE INDEX "refund_item_allocations_orderId_idx" ON "refund_item_allocations"("orderId");

-- CreateIndex
CREATE INDEX "refund_item_allocations_orderItemId_idx" ON "refund_item_allocations"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "refund_item_allocations_refundId_orderItemId_key" ON "refund_item_allocations"("refundId", "orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "consultation_bookings_fulfillmentUnitId_key" ON "consultation_bookings"("fulfillmentUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "course_entitlements_fulfillmentUnitId_key" ON "course_entitlements"("fulfillmentUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "digital_product_entitlements_fulfillmentUnitId_key" ON "digital_product_entitlements"("fulfillmentUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_orderId_id_key" ON "order_items"("orderId", "id");

-- CreateIndex
CREATE INDEX "orders_paidAt_idx" ON "orders"("paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_orderId_id_key" ON "refunds"("orderId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "reports_fulfillmentUnitId_key" ON "reports"("fulfillmentUnitId");

-- CreateIndex
CREATE INDEX "reports_status_expectedDeliveryAt_createdAt_idx" ON "reports"("status", "expectedDeliveryAt", "createdAt");

-- CreateIndex
CREATE INDEX "reports_claimExpiresAt_idx" ON "reports"("claimExpiresAt");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_fulfillmentUnitId_fkey" FOREIGN KEY ("fulfillmentUnitId") REFERENCES "fulfillment_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_bookings" ADD CONSTRAINT "consultation_bookings_fulfillmentUnitId_fkey" FOREIGN KEY ("fulfillmentUnitId") REFERENCES "fulfillment_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_entitlements" ADD CONSTRAINT "course_entitlements_fulfillmentUnitId_fkey" FOREIGN KEY ("fulfillmentUnitId") REFERENCES "fulfillment_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_product_entitlements" ADD CONSTRAINT "digital_product_entitlements_fulfillmentUnitId_fkey" FOREIGN KEY ("fulfillmentUnitId") REFERENCES "fulfillment_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment_units" ADD CONSTRAINT "fulfillment_units_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment_units" ADD CONSTRAINT "fulfillment_units_orderId_orderItemId_fkey" FOREIGN KEY ("orderId", "orderItemId") REFERENCES "order_items"("orderId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_fulfillmentUnitId_fkey" FOREIGN KEY ("fulfillmentUnitId") REFERENCES "fulfillment_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_item_allocations" ADD CONSTRAINT "refund_item_allocations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_item_allocations" ADD CONSTRAINT "refund_item_allocations_orderId_refundId_fkey" FOREIGN KEY ("orderId", "refundId") REFERENCES "refunds"("orderId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_item_allocations" ADD CONSTRAINT "refund_item_allocations_orderId_orderItemId_fkey" FOREIGN KEY ("orderId", "orderItemId") REFERENCES "order_items"("orderId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =========================================================================
-- NATIVE POSTGRESQL CONSTRAINTS & TRIGGERS
-- =========================================================================

-- 1. Partial Unique Index: Exactly one active shipment allocation per fulfillment unit
CREATE UNIQUE INDEX uq_active_fulfillment_unit_shipment 
ON "shipment_items" ("fulfillmentUnitId") 
WHERE "status" IN ('ALLOCATED', 'IN_TRANSIT', 'DELIVERED');

-- 2. Check Constraint: Refund allocations must be strictly positive integers (in paise)
ALTER TABLE "refund_item_allocations" 
ADD CONSTRAINT chk_refund_allocation_amount_positive 
CHECK ("amount" > 0);

-- 3. Trigger Function & Trigger: Verify Shipment parcel belongs to exact same Order as FulfillmentUnit
CREATE OR REPLACE FUNCTION fn_verify_shipment_item_order_consistency()
RETURNS TRIGGER AS $$
DECLARE
  v_shipment_order_id TEXT;
  v_unit_order_id TEXT;
BEGIN
  SELECT "orderId" INTO v_shipment_order_id FROM "shipments" WHERE id = NEW."shipmentId";
  SELECT "orderId" INTO v_unit_order_id FROM "fulfillment_units" WHERE id = NEW."fulfillmentUnitId";
  
  IF v_shipment_order_id IS DISTINCT FROM v_unit_order_id THEN
    RAISE EXCEPTION 'SHIPMENT_ORDER_MISMATCH: Shipment order % does not match unit order %', 
      v_shipment_order_id, v_unit_order_id 
      USING ERRCODE = '23514';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_verify_shipment_item_order
BEFORE INSERT OR UPDATE OF "shipmentId", "fulfillmentUnitId" ON "shipment_items"
FOR EACH ROW EXECUTE FUNCTION fn_verify_shipment_item_order_consistency();

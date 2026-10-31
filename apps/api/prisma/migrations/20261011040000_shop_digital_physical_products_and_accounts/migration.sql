-- AlterEnum
ALTER TYPE "FulfillmentStatus" ADD VALUE 'DISPATCHED';
ALTER TYPE "FulfillmentStatus" ADD VALUE 'DELIVERED';

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('DIGITAL_WALLPAPER', 'DIGITAL_ART', 'DIGITAL_BUNDLE', 'PHYSICAL');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "shippingAddressId" TEXT,
ADD COLUMN "shippingAmount" INTEGER DEFAULT 0,
ADD COLUMN "trackingNumber" TEXT,
ADD COLUMN "courierPartner" TEXT,
ADD COLUMN "dispatchedAt" TIMESTAMP(3),
ADD COLUMN "deliveredAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hindiTitle" TEXT,
    "description" TEXT,
    "hindiDescription" TEXT,
    "category" TEXT NOT NULL,
    "productType" "ProductType" NOT NULL DEFAULT 'DIGITAL_WALLPAPER',
    "mrp" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "requiresShipping" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "galleryImages" JSONB,
    "variants" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_addresses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "countryCode" TEXT NOT NULL DEFAULT 'IN',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_product_entitlements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderId" TEXT,
    "source" "EntitlementSource" NOT NULL DEFAULT 'PURCHASE',
    "status" "EntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "lastDownloadedAt" TIMESTAMP(3),
    "assetKey" TEXT,
    "bundleAssets" JSONB,
    "expiresAt" TIMESTAMP(3),
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digital_product_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
CREATE UNIQUE INDEX "products_catalogId_key" ON "products"("catalogId");
CREATE INDEX "products_category_idx" ON "products"("category");
CREATE INDEX "products_productType_idx" ON "products"("productType");
CREATE INDEX "products_isAvailable_idx" ON "products"("isAvailable");

-- CreateIndex
CREATE INDEX "shipping_addresses_userId_idx" ON "shipping_addresses"("userId");

-- CreateIndex
CREATE INDEX "digital_product_entitlements_userId_status_idx" ON "digital_product_entitlements"("userId", "status");
CREATE INDEX "digital_product_entitlements_productId_idx" ON "digital_product_entitlements"("productId");
CREATE INDEX "digital_product_entitlements_orderId_idx" ON "digital_product_entitlements"("orderId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "shipping_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_addresses" ADD CONSTRAINT "shipping_addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_product_entitlements" ADD CONSTRAINT "digital_product_entitlements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_product_entitlements" ADD CONSTRAINT "digital_product_entitlements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_product_entitlements" ADD CONSTRAINT "digital_product_entitlements_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

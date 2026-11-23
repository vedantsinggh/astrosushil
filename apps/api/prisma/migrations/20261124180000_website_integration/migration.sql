-- CreateEnum
CREATE TYPE "AdminRoleStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ShopCategoryProductType" AS ENUM ('PHYSICAL', 'DIGITAL');

-- CreateEnum
CREATE TYPE "ShopDiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "ShopCouponDiscountType" AS ENUM ('PERCENTAGE', 'FLAT');

-- CreateEnum
CREATE TYPE "ShopCouponAudience" AS ENUM ('GLOBAL', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "ShopCouponRedemptionStatus" AS ENUM ('RESERVED', 'REDEEMED', 'RELEASED');

-- CreateEnum
CREATE TYPE "ShopOrderStatus" AS ENUM ('PAYMENT_PENDING', 'PLACED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'PAYMENT_FAILED');

-- CreateEnum
CREATE TYPE "ShopAddressType" AS ENUM ('HOME', 'WORK', 'OTHER');

-- CreateEnum
CREATE TYPE "CourseLinkStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SalePaymentMethod" AS ENUM ('RAZORPAY', 'MANUAL', 'COD');

-- CreateEnum
CREATE TYPE "LedgerTransactionType" AS ENUM ('ORDER', 'CONSULTATION', 'REPORT');

-- CreateEnum
CREATE TYPE "LedgerTransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "InvoiceAllocationStatus" AS ENUM ('PENDING', 'ALLOCATED', 'NOT_REQUIRED');

-- CreateEnum
CREATE TYPE "OutboundMessageChannel" AS ENUM ('SMS', 'WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "OutboundMessageStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "ConsultationTypeKind" AS ENUM ('NORMAL', 'SPECIAL');

-- CreateEnum
CREATE TYPE "ConsultationGstType" AS ENUM ('INCLUSIVE', 'EXCLUSIVE');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "BookingPaymentMethod" AS ENUM ('RAZORPAY', 'MANUAL');

-- CreateEnum
CREATE TYPE "BookingDiscountType" AS ENUM ('FLAT', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "BookingAdminNoteAction" AS ENUM ('RESCHEDULE', 'PLAN_CHANGE', 'NOTE', 'MANUAL_BOOKING', 'DELETE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProductType" ADD VALUE 'DIGITAL';
ALTER TYPE "ProductType" ADD VALUE 'SERVICE';

-- AlterTable
ALTER TABLE "consultation_bookings" ADD COLUMN     "amountPaise" INTEGER,
ADD COLUMN     "consultationTypeId" TEXT,
ADD COLUMN     "createdByAdminId" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT,
ADD COLUMN     "discountPaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discountType" "BookingDiscountType",
ADD COLUMN     "discountValue" INTEGER,
ADD COLUMN     "exchangeRate" DECIMAL(20,10),
ADD COLUMN     "gstPaise" INTEGER,
ADD COLUMN     "gstRateBasisPoints" INTEGER,
ADD COLUMN     "gstType" "ConsultationGstType",
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "legacyId" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "paidAmountMinor" INTEGER,
ADD COLUMN     "paidCurrency" TEXT,
ADD COLUMN     "paymentMethod" "BookingPaymentMethod",
ADD COLUMN     "priceLabel" TEXT,
ADD COLUMN     "pricePaise" INTEGER,
ADD COLUMN     "reminderSentAt" TIMESTAMP(3),
ADD COLUMN     "source" "BookingSource" NOT NULL DEFAULT 'USER',
ADD COLUMN     "taxablePaise" INTEGER;

-- AlterTable
ALTER TABLE "digital_product_entitlements" ADD COLUMN     "assetName" TEXT,
ADD COLUMN     "legacyId" TEXT,
ADD COLUMN     "orderItemId" TEXT,
ADD COLUMN     "variantId" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "taxInclusive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "exchangeRate" DECIMAL(20,10),
ADD COLUMN     "paidAmountMinor" INTEGER,
ADD COLUMN     "paidCurrency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "paymentMethod" "SalePaymentMethod" NOT NULL DEFAULT 'RAZORPAY';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "dimensions" JSONB,
ADD COLUMN     "discountType" "ShopDiscountType" NOT NULL DEFAULT 'PERCENTAGE',
ADD COLUMN     "discountValue" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gstEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "gstInclusive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "gstRateBp" INTEGER NOT NULL DEFAULT 1800,
ADD COLUMN     "hasVariants" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isTrending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "legacyId" TEXT,
ADD COLUMN     "managedByAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "metaTitle" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "reviewsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shortDescription" TEXT,
ADD COLUMN     "sku" TEXT,
ADD COLUMN     "thumbnailKey" TEXT,
ADD COLUMN     "thumbnailUrl" TEXT,
ADD COLUMN     "weightGrams" INTEGER;

-- AlterTable
ALTER TABLE "shipping_addresses" ADD COLUMN     "landmark" TEXT,
ADD COLUMN     "legacyId" TEXT,
ADD COLUMN     "type" "ShopAddressType" NOT NULL DEFAULT 'HOME';

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "title" TEXT,
    "subtitle" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "imageKey" TEXT,
    "type" TEXT NOT NULL,
    "buttons" JSONB NOT NULL DEFAULT '[]',
    "page" TEXT NOT NULL DEFAULT 'Homepage',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "authorName" TEXT,
    "authorAvatarUrl" TEXT,
    "authorAvatarKey" TEXT,
    "thumbnailUrl" TEXT,
    "thumbnailKey" TEXT,
    "images" JSONB NOT NULL DEFAULT '[]',
    "seoMetaTitle" TEXT,
    "seoMetaDescription" TEXT,
    "seoKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "name" TEXT NOT NULL,
    "designation" TEXT,
    "message" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "imageUrl" TEXT,
    "imageKey" TEXT,
    "serviceName" TEXT,
    "tagline" TEXT,
    "type" TEXT NOT NULL DEFAULT 'text',
    "videoUrl" TEXT,
    "page" TEXT NOT NULL DEFAULT 'home',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_items" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "section" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'image',
    "mediaUrl" TEXT,
    "mediaKey" TEXT,
    "thumbnailUrl" TEXT,
    "thumbnailKey" TEXT,
    "tag" TEXT NOT NULL DEFAULT '',
    "personName" TEXT NOT NULL DEFAULT '',
    "background" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_inquiries" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_pages" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "name" TEXT NOT NULL,
    "metaTitle" TEXT NOT NULL,
    "metaDescription" TEXT NOT NULL,
    "imageUrl" TEXT,
    "imageKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL DEFAULT 'site',
    "legacyId" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "legacyRole" "Role" NOT NULL DEFAULT 'SUPPORT',
    "status" "AdminRoleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "legacyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT,
    "status" "StaffStatus" NOT NULL DEFAULT 'ACTIVE',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "username" TEXT,
    "phoneNumber" TEXT,
    "designation" TEXT,
    "website" TEXT,
    "portfolioLink" TEXT,
    "profilePhoto" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdById" TEXT,
    "legacyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "parentId" TEXT,
    "productType" "ShopCategoryProductType" NOT NULL DEFAULT 'PHYSICAL',
    "imageUrl" TEXT,
    "imageKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "productId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "mrp" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "downloadKey" TEXT,
    "downloadName" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "userId" TEXT NOT NULL,
    "couponCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist_items" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "ShopCouponDiscountType" NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "maxDiscountPaise" INTEGER,
    "minOrderPaise" INTEGER NOT NULL DEFAULT 0,
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTill" TIMESTAMP(3) NOT NULL,
    "audience" "ShopCouponAudience" NOT NULL DEFAULT 'GLOBAL',
    "oneTimePerUser" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_assignments" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_redemptions" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT,
    "orderId" TEXT,
    "status" "ShopCouponRedemptionStatus" NOT NULL DEFAULT 'RESERVED',
    "discountPaise" INTEGER NOT NULL DEFAULT 0,
    "reservedUntil" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_orders" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "orderId" TEXT NOT NULL,
    "status" "ShopOrderStatus" NOT NULL DEFAULT 'PAYMENT_PENDING',
    "orderType" TEXT NOT NULL DEFAULT 'physical',
    "source" TEXT NOT NULL DEFAULT 'cart',
    "addressId" TEXT,
    "shippingAddress" JSONB,
    "couponCode" TEXT,
    "couponDiscountPaise" INTEGER NOT NULL DEFAULT 0,
    "itemsTotalPaise" INTEGER NOT NULL DEFAULT 0,
    "shippingPaise" INTEGER NOT NULL DEFAULT 0,
    "taxPaise" INTEGER NOT NULL DEFAULT 0,
    "stockShortfall" JSONB,
    "paidEffectsApplied" BOOLEAN NOT NULL DEFAULT false,
    "stockRestored" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_links" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "courseId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT,
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "instructorName" TEXT,
    "language" TEXT,
    "level" "CourseLevel",
    "pricePaise" INTEGER NOT NULL,
    "originalPricePaise" INTEGER,
    "discountPercentage" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "totalLessons" INTEGER,
    "totalDurationMinutes" INTEGER,
    "thumbnailUrl" TEXT,
    "thumbnailKey" TEXT,
    "previewVideo" TEXT,
    "platformName" TEXT,
    "redirectUrl" TEXT NOT NULL,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "status" "CourseLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_profiles" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "userId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "username" TEXT,
    "dob" TEXT,
    "gender" TEXT,
    "birthPlace" TEXT,
    "birthTime" TEXT,
    "bio" TEXT,
    "profilePhoto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "legacySourceId" TEXT,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" "LedgerTransactionType" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "baseCurrency" TEXT NOT NULL DEFAULT 'INR',
    "baseAmountPaise" INTEGER NOT NULL DEFAULT 0,
    "subtotalPaise" INTEGER NOT NULL DEFAULT 0,
    "shippingPaise" INTEGER NOT NULL DEFAULT 0,
    "taxPaise" INTEGER NOT NULL DEFAULT 0,
    "taxRateBp" INTEGER NOT NULL DEFAULT 0,
    "taxInclusive" BOOLEAN NOT NULL DEFAULT false,
    "discountPaise" INTEGER NOT NULL DEFAULT 0,
    "exchangeRate" DECIMAL(20,10) NOT NULL DEFAULT 1,
    "method" "SalePaymentMethod" NOT NULL,
    "status" "LedgerTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "gatewayPaymentId" TEXT,
    "gatewayOrderId" TEXT,
    "rawResponse" JSONB,
    "placeOfSupply" TEXT,
    "customerName" TEXT,
    "legacyData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_counters" (
    "key" TEXT NOT NULL,
    "lastValue" BIGINT NOT NULL,
    "initializedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_counters_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "orderId" TEXT,
    "saleType" "LedgerTransactionType" NOT NULL,
    "number" TEXT,
    "sequence" BIGINT,
    "status" "InvoiceAllocationStatus" NOT NULL DEFAULT 'PENDING',
    "allocatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbound_messages" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "entityId" TEXT,
    "userId" TEXT,
    "audience" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "channel" "OutboundMessageChannel" NOT NULL,
    "recipient" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboundMessageStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 4,
    "notBefore" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "providerMessageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbound_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_send_logs" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_send_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_types" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "title" TEXT NOT NULL,
    "kind" "ConsultationTypeKind" NOT NULL DEFAULT 'NORMAL',
    "description" TEXT,
    "includes" TEXT[],
    "durationMinutes" INTEGER NOT NULL,
    "responseDays" INTEGER NOT NULL DEFAULT 0,
    "priceLabel" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultation_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_type_modes" (
    "id" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "mode" "ConsultationMode" NOT NULL,
    "catalogId" TEXT NOT NULL,
    "pricePaise" INTEGER NOT NULL,
    "gstEnabled" BOOLEAN NOT NULL DEFAULT true,
    "gstRateBasisPoints" INTEGER NOT NULL DEFAULT 0,
    "gstType" "ConsultationGstType" NOT NULL DEFAULT 'INCLUSIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultation_type_modes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_type_blocked_dates" (
    "id" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultation_type_blocked_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "legacyId" TEXT,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "slotDurationMinutes" INTEGER NOT NULL,
    "gapMinutes" INTEGER NOT NULL DEFAULT 0,
    "breakStartMinute" INTEGER,
    "breakEndMinute" INTEGER,
    "blockedWeekdays" INTEGER[],
    "bookingHorizonDays" INTEGER,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_days" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "date" DATE NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_blocked_slots" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_blocked_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_admin_notes" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "action" "BookingAdminNoteAction" NOT NULL,
    "note" TEXT,
    "changes" JSONB,
    "addedByName" TEXT,
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_admin_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "banners_legacyId_key" ON "banners"("legacyId");

-- CreateIndex
CREATE INDEX "banners_page_type_isActive_order_idx" ON "banners"("page", "type", "isActive", "order");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_legacyId_key" ON "blog_posts"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_status_createdAt_idx" ON "blog_posts"("status", "createdAt");

-- CreateIndex
CREATE INDEX "blog_posts_category_idx" ON "blog_posts"("category");

-- CreateIndex
CREATE UNIQUE INDEX "faqs_legacyId_key" ON "faqs"("legacyId");

-- CreateIndex
CREATE INDEX "faqs_page_isActive_order_idx" ON "faqs"("page", "isActive", "order");

-- CreateIndex
CREATE UNIQUE INDEX "testimonials_legacyId_key" ON "testimonials"("legacyId");

-- CreateIndex
CREATE INDEX "testimonials_page_isActive_order_idx" ON "testimonials"("page", "isActive", "order");

-- CreateIndex
CREATE UNIQUE INDEX "media_items_legacyId_key" ON "media_items"("legacyId");

-- CreateIndex
CREATE INDEX "media_items_section_isActive_order_idx" ON "media_items"("section", "isActive", "order");

-- CreateIndex
CREATE UNIQUE INDEX "contact_inquiries_legacyId_key" ON "contact_inquiries"("legacyId");

-- CreateIndex
CREATE INDEX "contact_inquiries_createdAt_idx" ON "contact_inquiries"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "seo_pages_legacyId_key" ON "seo_pages"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "seo_pages_name_key" ON "seo_pages"("name");

-- CreateIndex
CREATE UNIQUE INDEX "site_settings_legacyId_key" ON "site_settings"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_roles_name_key" ON "admin_roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "admin_roles_slug_key" ON "admin_roles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "admin_roles_legacyId_key" ON "admin_roles"("legacyId");

-- CreateIndex
CREATE INDEX "admin_roles_status_idx" ON "admin_roles"("status");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_userId_key" ON "staff_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_username_key" ON "staff_profiles"("username");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_legacyId_key" ON "staff_profiles"("legacyId");

-- CreateIndex
CREATE INDEX "staff_profiles_roleId_idx" ON "staff_profiles"("roleId");

-- CreateIndex
CREATE INDEX "staff_profiles_status_isDeleted_idx" ON "staff_profiles"("status", "isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_legacyId_key" ON "product_categories"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_slug_key" ON "product_categories"("slug");

-- CreateIndex
CREATE INDEX "product_categories_parentId_idx" ON "product_categories"("parentId");

-- CreateIndex
CREATE INDEX "product_categories_productType_isActive_idx" ON "product_categories"("productType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_legacyId_key" ON "product_variants"("legacyId");

-- CreateIndex
CREATE INDEX "product_variants_productId_sortOrder_idx" ON "product_variants"("productId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_productId_code_key" ON "product_variants"("productId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "carts_legacyId_key" ON "carts"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "carts_userId_key" ON "carts"("userId");

-- CreateIndex
CREATE INDEX "cart_items_productId_idx" ON "cart_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cartId_productId_variantKey_key" ON "cart_items"("cartId", "productId", "variantKey");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_items_legacyId_key" ON "wishlist_items"("legacyId");

-- CreateIndex
CREATE INDEX "wishlist_items_productId_idx" ON "wishlist_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_items_userId_productId_key" ON "wishlist_items"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_legacyId_key" ON "coupons"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_isActive_validFrom_validTill_idx" ON "coupons"("isActive", "validFrom", "validTill");

-- CreateIndex
CREATE INDEX "coupon_assignments_userId_idx" ON "coupon_assignments"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_assignments_couponId_userId_key" ON "coupon_assignments"("couponId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_redemptions_orderId_key" ON "coupon_redemptions"("orderId");

-- CreateIndex
CREATE INDEX "coupon_redemptions_couponId_status_idx" ON "coupon_redemptions"("couponId", "status");

-- CreateIndex
CREATE INDEX "coupon_redemptions_userId_couponId_idx" ON "coupon_redemptions"("userId", "couponId");

-- CreateIndex
CREATE UNIQUE INDEX "shop_orders_legacyId_key" ON "shop_orders"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "shop_orders_orderId_key" ON "shop_orders"("orderId");

-- CreateIndex
CREATE INDEX "shop_orders_status_createdAt_idx" ON "shop_orders"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "course_links_legacyId_key" ON "course_links"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "course_links_slug_key" ON "course_links"("slug");

-- CreateIndex
CREATE INDEX "course_links_status_isFeatured_idx" ON "course_links"("status", "isFeatured");

-- CreateIndex
CREATE UNIQUE INDEX "customer_profiles_legacyId_key" ON "customer_profiles"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_profiles_userId_key" ON "customer_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_profiles_username_key" ON "customer_profiles"("username");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_legacyId_key" ON "payment_transactions"("legacyId");

-- CreateIndex
CREATE INDEX "payment_transactions_userId_idx" ON "payment_transactions"("userId");

-- CreateIndex
CREATE INDEX "payment_transactions_orderId_idx" ON "payment_transactions"("orderId");

-- CreateIndex
CREATE INDEX "payment_transactions_gatewayOrderId_idx" ON "payment_transactions"("gatewayOrderId");

-- CreateIndex
CREATE INDEX "payment_transactions_status_createdAt_idx" ON "payment_transactions"("status", "createdAt");

-- CreateIndex
CREATE INDEX "payment_transactions_type_createdAt_idx" ON "payment_transactions"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_legacyId_key" ON "invoices"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_orderId_key" ON "invoices"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_sequence_key" ON "invoices"("sequence");

-- CreateIndex
CREATE INDEX "invoices_number_idx" ON "invoices"("number");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "outbound_messages_dedupeKey_key" ON "outbound_messages"("dedupeKey");

-- CreateIndex
CREATE INDEX "outbound_messages_status_notBefore_idx" ON "outbound_messages"("status", "notBefore");

-- CreateIndex
CREATE INDEX "outbound_messages_event_entityId_idx" ON "outbound_messages"("event", "entityId");

-- CreateIndex
CREATE INDEX "outbound_messages_userId_idx" ON "outbound_messages"("userId");

-- CreateIndex
CREATE INDEX "otp_send_logs_scope_keyHash_createdAt_idx" ON "otp_send_logs"("scope", "keyHash", "createdAt");

-- CreateIndex
CREATE INDEX "otp_send_logs_createdAt_idx" ON "otp_send_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "consultation_types_legacyId_key" ON "consultation_types"("legacyId");

-- CreateIndex
CREATE INDEX "consultation_types_isActive_deletedAt_idx" ON "consultation_types"("isActive", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "consultation_type_modes_catalogId_key" ON "consultation_type_modes"("catalogId");

-- CreateIndex
CREATE UNIQUE INDEX "consultation_type_modes_typeId_mode_key" ON "consultation_type_modes"("typeId", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "consultation_type_blocked_dates_typeId_date_key" ON "consultation_type_blocked_dates"("typeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "availability_settings_legacyId_key" ON "availability_settings"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_days_legacyId_key" ON "schedule_days"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_days_date_key" ON "schedule_days"("date");

-- CreateIndex
CREATE INDEX "schedule_days_isBlocked_date_idx" ON "schedule_days"("isBlocked", "date");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_blocked_slots_dayId_startMinute_endMinute_key" ON "schedule_blocked_slots"("dayId", "startMinute", "endMinute");

-- CreateIndex
CREATE INDEX "booking_admin_notes_bookingId_createdAt_idx" ON "booking_admin_notes"("bookingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "consultation_bookings_legacyId_key" ON "consultation_bookings"("legacyId");

-- CreateIndex
CREATE INDEX "consultation_bookings_consultationTypeId_idx" ON "consultation_bookings"("consultationTypeId");

-- CreateIndex
CREATE INDEX "consultation_bookings_slotStartTimeUtc_idx" ON "consultation_bookings"("slotStartTimeUtc");

-- CreateIndex
CREATE UNIQUE INDEX "digital_product_entitlements_legacyId_key" ON "digital_product_entitlements"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "products_legacyId_key" ON "products"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_addresses_legacyId_key" ON "shipping_addresses"("legacyId");

-- AddForeignKey
ALTER TABLE "consultation_bookings" ADD CONSTRAINT "consultation_bookings_consultationTypeId_fkey" FOREIGN KEY ("consultationTypeId") REFERENCES "consultation_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "admin_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_assignments" ADD CONSTRAINT "coupon_assignments_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_assignments" ADD CONSTRAINT "coupon_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_links" ADD CONSTRAINT "course_links_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_type_modes" ADD CONSTRAINT "consultation_type_modes_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "consultation_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_type_blocked_dates" ADD CONSTRAINT "consultation_type_blocked_dates_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "consultation_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_blocked_slots" ADD CONSTRAINT "schedule_blocked_slots_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "schedule_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_admin_notes" ADD CONSTRAINT "booking_admin_notes_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "consultation_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- One astrologer, one calendar: two held or booked slots may never overlap in time.
-- Prisma cannot express an exclusion constraint, so it is written by hand. Rows that already
-- overlap must be resolved before this runs (the data migration reports them).
ALTER TABLE "appointment_slots" ADD CONSTRAINT "appointment_slots_no_overlap"
  EXCLUDE USING gist (tsrange("startTimeUtc", "endTimeUtc", '[)') WITH &&)
  WHERE (status IN ('RESERVED', 'BOOKED'));

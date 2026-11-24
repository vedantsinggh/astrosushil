-- CreateTable
CREATE TABLE "coupon_scopes" (
    "couponId" TEXT NOT NULL,
    "products" BOOLEAN NOT NULL DEFAULT true,
    "reports" BOOLEAN NOT NULL DEFAULT true,
    "consultations" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupon_scopes_pkey" PRIMARY KEY ("couponId")
);


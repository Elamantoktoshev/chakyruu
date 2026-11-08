-- Promo codes: a percent off the invitation publish price, created by the admin.
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PromoCode_discountPercent_check" CHECK ("discountPercent" BETWEEN 1 AND 100),
    CONSTRAINT "PromoCode_maxUses_check" CHECK ("maxUses" IS NULL OR "maxUses" >= 1)
);
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");

ALTER TABLE "Payment" ADD COLUMN "promoCodeId" TEXT;
CREATE INDEX "Payment_promoCodeId_idx" ON "Payment"("promoCodeId");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

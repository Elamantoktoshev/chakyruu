-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('INVITATION', 'CREDIT_PACKAGE');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "confirmedById" TEXT,
ADD COLUMN     "credits" INTEGER,
ADD COLUMN     "gateway" TEXT NOT NULL DEFAULT 'fake',
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "priceCode" TEXT,
ADD COLUMN     "purpose" "PaymentPurpose" NOT NULL DEFAULT 'INVITATION',
ADD COLUMN     "rawResponse" JSONB,
ADD COLUMN     "reference" TEXT,
ALTER COLUMN "invitationId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- CreateIndex
CREATE INDEX "Payment_organizationId_idx" ON "Payment"("organizationId");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_gateway_externalId_key" ON "Payment"("gateway", "externalId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill: payments made before this migration were single invitations through the fake gateway.
UPDATE "Payment" SET "paidAt" = "updatedAt" WHERE "status" = 'SUCCEEDED' AND "paidAt" IS NULL;

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "PriceAudience" AS ENUM ('CLIENT', 'VENUE', 'TAMADA');

-- DropIndex
DROP INDEX "PartnerLead_createdAt_idx";

-- AlterTable
ALTER TABLE "PartnerLead" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
ADD COLUMN     "type" "OrgType" NOT NULL DEFAULT 'VENUE',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Price" (
    "code" TEXT NOT NULL,
    "audience" "PriceAudience" NOT NULL,
    "amountSom" INTEGER NOT NULL,
    "credits" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Price_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE INDEX "PartnerLead_status_createdAt_idx" ON "PartnerLead"("status", "createdAt");


-- Default prices (editable in /admin). Amounts are in som.
INSERT INTO "Price" ("code", "audience", "amountSom", "credits", "active", "sortOrder", "updatedAt") VALUES
  ('INVITATION_PUBLISH', 'CLIENT', 700, NULL, true, 0, CURRENT_TIMESTAMP),
  ('VENUE_PACK_10', 'VENUE', 5000, 10, true, 10, CURRENT_TIMESTAMP),
  ('VENUE_PACK_30', 'VENUE', 13500, 30, true, 11, CURRENT_TIMESTAMP),
  ('VENUE_PACK_100', 'VENUE', 40000, 100, true, 12, CURRENT_TIMESTAMP),
  ('TAMADA_PACK_10', 'TAMADA', 4000, 10, true, 20, CURRENT_TIMESTAMP),
  ('TAMADA_PACK_30', 'TAMADA', 10500, 30, true, 21, CURRENT_TIMESTAMP),
  ('TAMADA_PACK_100', 'TAMADA', 30000, 100, true, 22, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

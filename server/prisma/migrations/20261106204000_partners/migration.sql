-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('VENUE', 'TAMADA', 'AGENCY');

-- CreateEnum
CREATE TYPE "CatalogStatus" AS ENUM ('HIDDEN', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "PartnerLanguage" AS ENUM ('KY', 'RU', 'UZ');

-- CreateEnum
CREATE TYPE "CreditReason" AS ENUM ('PURCHASE', 'GIFT_ISSUED', 'GIFT_REFUND', 'ADMIN_GRANT');

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "hallId" TEXT,
ADD COLUMN     "tamadaOrgId" TEXT,
ADD COLUMN     "venueOrgId" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "address" TEXT,
ADD COLUMN     "catalogStatus" "CatalogStatus" NOT NULL DEFAULT 'HIDDEN',
ADD COLUMN     "city" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "invitationCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "logoKey" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "mapUrl" TEXT,
ADD COLUMN     "type" "OrgType" NOT NULL DEFAULT 'VENUE',
ADD COLUMN     "whatsapp" TEXT;

-- CreateTable
CREATE TABLE "Hall" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TamadaProfile" (
    "organizationId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "photoUrl" TEXT,
    "photoKey" TEXT,
    "bio" TEXT,
    "languages" "PartnerLanguage"[],
    "priceFromSom" INTEGER,
    "videoUrls" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TamadaProfile_pkey" PRIMARY KEY ("organizationId")
);

-- CreateTable
CREATE TABLE "TamadaBusyDate" (
    "organizationId" TEXT NOT NULL,
    "date" DATE NOT NULL,

    CONSTRAINT "TamadaBusyDate_pkey" PRIMARY KEY ("organizationId","date")
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "CreditReason" NOT NULL,
    "giftCodeId" TEXT,
    "paymentId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "eventDate" DATE NOT NULL,
    "hallId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "invitationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TamadaClick" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invitationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TamadaClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Hall_organizationId_idx" ON "Hall"("organizationId");

-- CreateIndex
CREATE INDEX "CreditTransaction_organizationId_createdAt_idx" ON "CreditTransaction"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCode_code_key" ON "GiftCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCode_invitationId_key" ON "GiftCode"("invitationId");

-- CreateIndex
CREATE INDEX "GiftCode_clientPhone_idx" ON "GiftCode"("clientPhone");

-- CreateIndex
CREATE INDEX "GiftCode_organizationId_createdAt_idx" ON "GiftCode"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "TamadaClick_organizationId_createdAt_idx" ON "TamadaClick"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Invitation_venueOrgId_eventDate_idx" ON "Invitation"("venueOrgId", "eventDate");

-- CreateIndex
CREATE INDEX "Invitation_tamadaOrgId_eventDate_idx" ON "Invitation"("tamadaOrgId", "eventDate");

-- CreateIndex
CREATE INDEX "Organization_type_catalogStatus_city_idx" ON "Organization"("type", "catalogStatus", "city");

-- AddForeignKey
ALTER TABLE "Hall" ADD CONSTRAINT "Hall_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TamadaProfile" ADD CONSTRAINT "TamadaProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TamadaBusyDate" ADD CONSTRAINT "TamadaBusyDate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCode" ADD CONSTRAINT "GiftCode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCode" ADD CONSTRAINT "GiftCode_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "Hall"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCode" ADD CONSTRAINT "GiftCode_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TamadaClick" ADD CONSTRAINT "TamadaClick_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_venueOrgId_fkey" FOREIGN KEY ("venueOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_tamadaOrgId_fkey" FOREIGN KEY ("tamadaOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "Hall"("id") ON DELETE SET NULL ON UPDATE CASCADE;

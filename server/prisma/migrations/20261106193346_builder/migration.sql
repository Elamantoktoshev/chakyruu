/*
  Warnings:

  - You are about to drop the column `musicUrl` on the `Invitation` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "TemplateType" ADD VALUE 'KYZ_UZATUU';

-- AlterTable
ALTER TABLE "Invitation" DROP COLUMN "musicUrl",
ADD COLUMN     "adultsOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "eventType" "TemplateType" NOT NULL DEFAULT 'WEDDING',
ADD COLUMN     "musicTrackId" TEXT,
ADD COLUMN     "photoKey" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ALTER COLUMN "hostNames" SET DEFAULT '',
ALTER COLUMN "eventDate" DROP NOT NULL,
ALTER COLUMN "venueName" SET DEFAULT '';

-- Backfill: existing invitations take their event type from their template,
-- and already published ones get a publication timestamp.
UPDATE "Invitation" AS i
SET "eventType" = t."type"
FROM "Template" AS t
WHERE i."templateId" = t."id";

UPDATE "Invitation" SET "publishedAt" = "updatedAt" WHERE "status" = 'PUBLISHED' AND "publishedAt" IS NULL;

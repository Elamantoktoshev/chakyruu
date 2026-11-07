-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "hideBranding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "program" JSONB NOT NULL DEFAULT '[]';


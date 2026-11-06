-- CreateEnum
CREATE TYPE "GuestStatus" AS ENUM ('INVITED', 'ATTENDING', 'DECLINED');

-- CreateEnum
CREATE TYPE "GuestSource" AS ENUM ('INVITED', 'SELF');

-- DropForeignKey
ALTER TABLE "Rsvp" DROP CONSTRAINT "Rsvp_invitationId_fkey";

-- DropTable
DROP TABLE "Rsvp";

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "token" TEXT NOT NULL,
    "status" "GuestStatus" NOT NULL DEFAULT 'INVITED',
    "guestsCount" INTEGER NOT NULL DEFAULT 1,
    "source" "GuestSource" NOT NULL DEFAULT 'INVITED',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Guest_token_key" ON "Guest"("token");

-- CreateIndex
CREATE INDEX "Guest_invitationId_status_idx" ON "Guest"("invitationId", "status");

-- CreateIndex
CREATE INDEX "Guest_invitationId_createdAt_idx" ON "Guest"("invitationId", "createdAt");

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;


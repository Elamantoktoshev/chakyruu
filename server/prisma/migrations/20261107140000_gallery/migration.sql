-- CreateTable
CREATE TABLE "InvitationPhoto" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitationPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvitationPhoto_invitationId_sortOrder_idx" ON "InvitationPhoto"("invitationId", "sortOrder");

-- AddForeignKey
ALTER TABLE "InvitationPhoto" ADD CONSTRAINT "InvitationPhoto_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;


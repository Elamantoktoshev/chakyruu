-- CreateTable
CREATE TABLE "Tilek" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "guestId" TEXT,
    "authorName" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tilek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TilekLike" (
    "tilekId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TilekLike_pkey" PRIMARY KEY ("tilekId","clientId")
);

-- CreateIndex
CREATE INDEX "Tilek_invitationId_hidden_createdAt_idx" ON "Tilek"("invitationId", "hidden", "createdAt");

-- AddForeignKey
ALTER TABLE "Tilek" ADD CONSTRAINT "Tilek_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tilek" ADD CONSTRAINT "Tilek_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TilekLike" ADD CONSTRAINT "TilekLike_tilekId_fkey" FOREIGN KEY ("tilekId") REFERENCES "Tilek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

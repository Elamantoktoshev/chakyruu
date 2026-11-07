-- CreateEnum
CREATE TYPE "TrackCategory" AS ENUM ('ULUTTUK', 'ZAMANBAP', 'BALDARGA', 'KLASSIKA');

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "customMusicDurationSec" INTEGER,
ADD COLUMN     "customMusicKey" TEXT,
ADD COLUMN     "customMusicUrl" TEXT,
ADD COLUMN     "musicStartSec" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "TrackCategory" NOT NULL,
    "file" TEXT,
    "fileKey" TEXT,
    "durationSec" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Track_active_category_sortOrder_idx" ON "Track"("active", "category", "sortOrder");

-- Former hard-coded tracks (shared MUSIC_TRACKS). Off until their licensed files are added
-- to client/public/music and enabled in /admin.
INSERT INTO "Track" ("id", "title", "category", "file", "sortOrder") VALUES
  ('komuz-joy', 'Комуз — Шаттык', 'ULUTTUK', '/music/komuz-joy.mp3', 10),
  ('komuz-lyric', 'Комуз — Лирика', 'ULUTTUK', '/music/komuz-lyric.mp3', 20),
  ('folk-dance', 'Элдик бий', 'ULUTTUK', '/music/folk-dance.mp3', 30),
  ('piano-wedding', 'Фортепиано — Той', 'ZAMANBAP', '/music/piano-wedding.mp3', 10),
  ('strings-classic', 'Скрипка — Классика', 'KLASSIKA', '/music/strings-classic.mp3', 10)
ON CONFLICT ("id") DO NOTHING;

-- Any other leftover id would break the foreign key.
UPDATE "Invitation" SET "musicTrackId" = NULL
WHERE "musicTrackId" IS NOT NULL AND "musicTrackId" NOT IN (SELECT "id" FROM "Track");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_musicTrackId_fkey" FOREIGN KEY ("musicTrackId") REFERENCES "Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;


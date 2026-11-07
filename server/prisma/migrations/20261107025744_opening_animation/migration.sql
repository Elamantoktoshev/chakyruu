-- CreateEnum
CREATE TYPE "OpeningAnimation" AS ENUM ('BOZ_UY', 'ENVELOPE', 'CURTAINS', 'TUNDUK', 'NONE');

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "openingAnimation" "OpeningAnimation" NOT NULL DEFAULT 'BOZ_UY';


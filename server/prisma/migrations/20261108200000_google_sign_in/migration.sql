-- Sign in with Google: a user may have a Google account instead of (or as well as) a phone.
ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;
ALTER TABLE "User" ADD COLUMN "email" TEXT;
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

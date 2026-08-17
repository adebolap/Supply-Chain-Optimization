-- CreateEnum
CREATE TYPE "BroadcastChannel" AS ENUM ('EMAIL', 'SMS');

-- AlterTable: add checkInToken as nullable first so existing rows don't break
ALTER TABLE "Guest" ADD COLUMN     "checkInToken" TEXT;

-- Backfill existing rows with a unique token before making the column required
UPDATE "Guest" SET "checkInToken" = md5(random()::text || clock_timestamp()::text || "id") WHERE "checkInToken" IS NULL;

ALTER TABLE "Guest" ALTER COLUMN "checkInToken" SET NOT NULL;

-- AlterTable
ALTER TABLE "RSVP" ADD COLUMN     "checkedInAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "BroadcastMessage" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "channel" "BroadcastChannel" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BroadcastMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BroadcastMessage_weddingId_idx" ON "BroadcastMessage"("weddingId");

-- CreateIndex
CREATE UNIQUE INDEX "Guest_checkInToken_key" ON "Guest"("checkInToken");

-- AddForeignKey
ALTER TABLE "BroadcastMessage" ADD CONSTRAINT "BroadcastMessage_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

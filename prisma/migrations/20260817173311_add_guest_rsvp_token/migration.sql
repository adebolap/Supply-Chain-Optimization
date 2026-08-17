-- Add rsvpToken as nullable first so existing rows can be backfilled
ALTER TABLE "Guest" ADD COLUMN "rsvpToken" TEXT;

-- Backfill existing rows with a unique value before enforcing NOT NULL
UPDATE "Guest" SET "rsvpToken" = gen_random_uuid()::text WHERE "rsvpToken" IS NULL;

ALTER TABLE "Guest" ALTER COLUMN "rsvpToken" SET NOT NULL;

CREATE UNIQUE INDEX "Guest_rsvpToken_key" ON "Guest"("rsvpToken");

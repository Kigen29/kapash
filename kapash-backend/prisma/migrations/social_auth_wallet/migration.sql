-- Add social auth fields and wallet balance to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "googleId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "appleId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;

-- Backfill: mark existing phone users as verified
UPDATE "users" SET "phoneVerified" = true WHERE "phone" IS NOT NULL;

-- Add unique constraints (only if values not null)
CREATE UNIQUE INDEX IF NOT EXISTS "users_googleId_key" ON "users"("googleId") WHERE "googleId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "users_appleId_key" ON "users"("appleId") WHERE "appleId" IS NOT NULL;

-- Rename UserRole enum values to match frontend expectations
-- Step 1: Create new enum
CREATE TYPE "UserRole_new" AS ENUM ('PLAYER', 'OWNER', 'ADMIN');

-- Step 2: Update column using cast
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING (
  CASE role::text
    WHEN 'CUSTOMER' THEN 'PLAYER'::text
    WHEN 'PITCH_OWNER' THEN 'OWNER'::text
    ELSE role::text
  END
)::"UserRole_new";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'PLAYER'::"UserRole_new";

-- Step 3: Drop old enum, rename new one
DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
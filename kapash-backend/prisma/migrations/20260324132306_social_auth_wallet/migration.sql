-- Social auth + wallet + role rename. Idempotent so it can replay on shadow DB
-- AND on databases where some pieces already exist (because earlier db push or hand SQL).

-- 1. Add social-auth and wallet columns to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "googleId"      TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "appleId"       TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN NOT NULL DEFAULT false;

-- 2. Phone becomes optional (social-auth users may not have a phone yet)
ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;

-- 3. Backfill: mark existing phone-auth users as verified
UPDATE "users" SET "phoneVerified" = true WHERE "phone" IS NOT NULL;

-- 4. Unique constraints on social IDs (multiple NULLs are allowed by Postgres default)
CREATE UNIQUE INDEX IF NOT EXISTS "users_googleId_key" ON "users"("googleId");
CREATE UNIQUE INDEX IF NOT EXISTS "users_appleId_key"  ON "users"("appleId");

-- 5. Rename UserRole enum values: CUSTOMER → PLAYER, PITCH_OWNER → OWNER
--    Wrap in DO block so we can detect whether the rename is already done.
DO $$
BEGIN
  -- If the new value 'PLAYER' is not present yet, perform the rename.
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'PLAYER'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')
  ) THEN
    CREATE TYPE "UserRole_new" AS ENUM ('PLAYER', 'OWNER', 'ADMIN');

    ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
    ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING (
      CASE role::text
        WHEN 'CUSTOMER'    THEN 'PLAYER'::text
        WHEN 'PITCH_OWNER' THEN 'OWNER'::text
        ELSE role::text
      END
    )::"UserRole_new";
    ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'PLAYER'::"UserRole_new";

    DROP TYPE "UserRole";
    ALTER TYPE "UserRole_new" RENAME TO "UserRole";
  END IF;
END $$;

-- 6. Add missing NotificationType enum values (idempotent)
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_FAILED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SLOT_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REVIEW_REQUEST';

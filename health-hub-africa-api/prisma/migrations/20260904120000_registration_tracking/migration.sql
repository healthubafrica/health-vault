-- Safe/additive: nullable column, no default, no backfill.
ALTER TABLE "users" ADD COLUMN "full_name" TEXT;

-- New table, no impact on existing data.
CREATE TABLE "onboarding_progress" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "current_step" INTEGER NOT NULL,
  "step_name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "onboarding_progress_user_id_key" UNIQUE ("user_id"),
  CONSTRAINT "onboarding_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

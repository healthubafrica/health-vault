-- Migration: update_plan_tiers_v2
-- Replaces PlanTier enum values and adds v2 pricing fields to subscription_plans.
-- Safe to run on an empty subscription_plans table (no production data yet).

-- Step 1: Rename existing enum so we can create a fresh one with the same name.
ALTER TYPE "PlanTier" RENAME TO "PlanTier_old";

-- Step 2: Create new enum with v2 tier names.
CREATE TYPE "PlanTier" AS ENUM ('Free', 'BasicCare', 'SilverCare', 'GoldCare', 'ConciergeCare');

-- Step 3: Drop the column that uses the old enum, then re-add with new enum.
--         (No data to preserve — table is empty in dev/staging.)
ALTER TABLE "subscription_plans" DROP COLUMN "tier";
ALTER TABLE "subscription_plans" ADD COLUMN "tier" "PlanTier" NOT NULL DEFAULT 'Free';

-- Step 4: Remove the temporary default (column should stay NOT NULL, no default).
ALTER TABLE "subscription_plans" ALTER COLUMN "tier" DROP DEFAULT;

-- Step 5: Drop the old enum type.
DROP TYPE "PlanTier_old";

-- Step 6: Add new v2 pricing and metadata columns to subscription_plans.
ALTER TABLE "subscription_plans"
  ADD COLUMN "annual_price_kobo" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "launch_price_kobo"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "family_pricing"     JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN "no_claim_pct"       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "is_most_popular"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "is_best_value"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "best_for"           TEXT    NOT NULL DEFAULT '';

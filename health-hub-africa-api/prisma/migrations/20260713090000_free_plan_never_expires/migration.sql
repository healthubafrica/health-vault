-- Free-tier subscriptions never expire: expires_at becomes nullable and
-- NULL means "never". Paid tiers keep their dates.

-- AlterTable
ALTER TABLE "patient_subscriptions" ALTER COLUMN "expires_at" DROP NOT NULL;

-- Backfill: existing Free subscriptions lose their (meaningless) expiry date.
UPDATE "patient_subscriptions" ps
SET "expires_at" = NULL
FROM "subscription_plans" p
WHERE ps."plan_id" = p."id" AND p."tier" = 'Free';

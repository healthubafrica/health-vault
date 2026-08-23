-- Optional partner/referral attribution captured at onboarding, plus the
-- OpenEMR partner routing engine's own decision (recorded for admin
-- visibility). All nullable/additive — no backfill needed.
ALTER TABLE "patients"
  ADD COLUMN "referral_code" TEXT,
  ADD COLUMN "routing_assigned_pool" TEXT,
  ADD COLUMN "routing_result" TEXT,
  ADD COLUMN "routed_at" TIMESTAMP(3);

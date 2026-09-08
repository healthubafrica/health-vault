-- login_events has no Prisma model (raw table, see 20260901170000_add_marketing_attribution) —
-- add a success flag so failed-password attempts can be recorded in the same
-- table/pipeline instead of a new one. DEFAULT true keeps every existing row
-- (which only ever recorded successful logins) semantically unchanged.
ALTER TABLE "login_events" ADD COLUMN "success" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "login_events_success_occurred_at_idx" ON "login_events"("success", "occurred_at" DESC);

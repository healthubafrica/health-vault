-- Safe/additive: nullable columns, no default, no backfill.
ALTER TABLE "patient_activity_events" ADD COLUMN "analytics_session_id" TEXT;
ALTER TABLE "patient_activity_events" ADD COLUMN "environment" TEXT;

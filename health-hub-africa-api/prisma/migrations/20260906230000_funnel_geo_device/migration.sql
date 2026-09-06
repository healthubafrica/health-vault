-- Safe/additive: nullable columns, no default, no backfill.
ALTER TABLE "patient_activity_events" ADD COLUMN "country_code" TEXT;
ALTER TABLE "patient_activity_events" ADD COLUMN "device_category" TEXT;

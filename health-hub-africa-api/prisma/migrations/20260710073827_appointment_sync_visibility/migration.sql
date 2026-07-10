-- Adds appointment-level traceability to OpenEMR sync/error tracking so
-- calendar/encounter sync failures are actionable per-appointment instead of
-- only visible as raw HTTP error rows.

ALTER TABLE "integration_errors" ADD COLUMN "appointment_id" UUID;
ALTER TABLE "integration_errors"
  ADD CONSTRAINT "integration_errors_appointment_id_fkey"
  FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "integration_errors_appointment_id_idx" ON "integration_errors"("appointment_id");

ALTER TABLE "openemr_sync_queue" ADD COLUMN "job_type" TEXT;

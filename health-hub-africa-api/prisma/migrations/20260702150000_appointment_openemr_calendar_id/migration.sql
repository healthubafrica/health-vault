-- Tracks the OpenEMR calendar event (pc_eid) created for a confirmed
-- appointment so reschedules can replace it and cancellations remove it.
ALTER TABLE "appointments" ADD COLUMN "openemr_appointment_id" TEXT;

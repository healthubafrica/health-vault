-- Safe/additive: relax NOT NULL (no data loss), add nullable column.
-- Lets patient_activity_events also hold pre-login/anonymous clickstream
-- rows (identity model foundation) instead of authenticated patients only.
ALTER TABLE "patient_activity_events" ALTER COLUMN "patient_id" DROP NOT NULL;
ALTER TABLE "patient_activity_events" ADD COLUMN "anonymous_visitor_id" TEXT;

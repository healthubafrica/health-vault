-- Post-call CSAT: the owning patient can rate a completed telecare session
-- (1-5 stars, optional free-text feedback) via PATCH /telecare/sessions/:id.
ALTER TABLE "telecare_sessions" ADD COLUMN "patient_rating" SMALLINT;
ALTER TABLE "telecare_sessions" ADD COLUMN "patient_feedback" TEXT;

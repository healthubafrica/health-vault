-- Structured professional-profile fields for providers, patient-facing.
-- All additive and nullable/array-default — safe on existing rows.

ALTER TABLE "providers"
  ADD COLUMN "subspecialties" TEXT[],
  ADD COLUMN "qualifications" TEXT[],
  ADD COLUMN "certifications" TEXT[],
  ADD COLUMN "professional_memberships" TEXT[],
  ADD COLUMN "languages" TEXT[],
  ADD COLUMN "clinical_interests" TEXT[],
  ADD COLUMN "consultation_services" TEXT[],
  ADD COLUMN "clinic_name" TEXT,
  ADD COLUMN "clinic_address" TEXT,
  ADD COLUMN "clinic_city" TEXT,
  ADD COLUMN "clinic_state" TEXT;

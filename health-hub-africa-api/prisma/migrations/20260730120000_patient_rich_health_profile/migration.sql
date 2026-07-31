-- Add structured patient-maintained health profile fields for clinical and emergency care.
ALTER TABLE "patient_medical_info"
ADD COLUMN "height_cm" DECIMAL(5,2),
ADD COLUMN "weight_kg" DECIMAL(5,2),
ADD COLUMN "disability_status" TEXT,
ADD COLUMN "disability_details" TEXT;

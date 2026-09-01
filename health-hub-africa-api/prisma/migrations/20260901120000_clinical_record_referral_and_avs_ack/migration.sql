-- Safe/additive: all nullable, no default, no backfill, no table rewrite.
ALTER TABLE "clinical_records" ADD COLUMN "openemr_acked_at" TIMESTAMP(3);
ALTER TABLE "clinical_records" ADD COLUMN "order_status" TEXT;
ALTER TABLE "clinical_records" ADD COLUMN "destination" TEXT;
ALTER TABLE "clinical_records" ADD COLUMN "patient_instruction" TEXT;

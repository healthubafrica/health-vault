-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('personal_identification', 'medical_history', 'providers', 'specialists', 'emergency', 'hospital', 'laboratory', 'imaging', 'medications', 'vaccinations', 'chronic_disease', 'womens_health', 'childrens_health', 'mental_health', 'dental', 'vision', 'travel', 'legal', 'wearables', 'miscellaneous');

-- CreateEnum
CREATE TYPE "DocumentSource" AS ENUM ('patient_upload', 'provider_upload', 'imported');

-- AlterTable
ALTER TABLE "clinical_records" ADD COLUMN     "category" "DocumentCategory",
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "original_file_name" TEXT,
ADD COLUMN     "source" "DocumentSource" NOT NULL DEFAULT 'provider_upload',
ADD COLUMN     "provider_visibility" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "subscription_plans" ADD COLUMN     "max_file_size_bytes" BIGINT,
ADD COLUMN     "max_files" INTEGER;

-- CreateIndex
CREATE INDEX "clinical_records_patient_id_category_idx" ON "clinical_records"("patient_id", "category");

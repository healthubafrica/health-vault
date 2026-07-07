-- AddValue: ServiceType.TravelSafe
ALTER TYPE "ServiceType" ADD VALUE IF NOT EXISTS 'TravelSafe';

-- CreateEnum: TravelSafeStatus
CREATE TYPE "TravelSafeStatus" AS ENUM ('preparing', 'active', 'completed', 'cancelled');

-- CreateTable: travelsafe_trips
CREATE TABLE "travelsafe_trips" (
  "id"                  UUID NOT NULL DEFAULT gen_random_uuid(),
  "patient_id"          UUID NOT NULL,
  "partner_code"        TEXT,
  "partner_name"        TEXT,
  "destination_country" TEXT NOT NULL,
  "departure_date"      DATE NOT NULL,
  "return_date"         DATE,
  "purpose"             TEXT,
  "status"              "TravelSafeStatus" NOT NULL DEFAULT 'preparing',
  "notes"               TEXT,
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3) NOT NULL,
  CONSTRAINT "travelsafe_trips_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "travelsafe_trips"
  ADD CONSTRAINT "travelsafe_trips_patient_id_fkey"
  FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "travelsafe_trips_patient_id_idx" ON "travelsafe_trips"("patient_id");

-- Make providerId nullable on appointments to support patient self-booking
-- (care team assigns a provider when confirming the request)
ALTER TABLE "appointments" ALTER COLUMN "provider_id" DROP NOT NULL;

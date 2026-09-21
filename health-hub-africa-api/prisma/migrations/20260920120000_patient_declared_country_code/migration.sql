-- Declared residence country as an ISO 3166-1 alpha-2 code (spec §C/§D).
-- Additive + nullable: safe on a populated table, no backfill. Existing rows
-- stay NULL deliberately — patients.country was defaulted/hard-coded to
-- 'Nigeria', so historical values are not real declarations.
ALTER TABLE "patients" ADD COLUMN "country_code" CHAR(2);

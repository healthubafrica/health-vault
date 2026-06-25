-- Marks OpenEMR as the source of truth for facilities. The column stores
-- the UUID returned by OpenEMR's /api/facility list so import jobs can
-- upsert by it and so encounter sync can stop hardcoding facility_id=1.

ALTER TABLE healthcare_facilities
  ADD COLUMN openemr_facility_id VARCHAR(255);

CREATE UNIQUE INDEX healthcare_facilities_openemr_facility_id_key
  ON healthcare_facilities (openemr_facility_id);

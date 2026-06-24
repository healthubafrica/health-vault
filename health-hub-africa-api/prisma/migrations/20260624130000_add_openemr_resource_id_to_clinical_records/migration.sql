-- Track the FHIR resource id of records pulled from OpenEMR so repeat
-- pulls can dedupe cheaply against (Encounter | DocumentReference | MedicationRequest)
-- without scanning by date+title heuristics.

ALTER TABLE clinical_records
  ADD COLUMN openemr_resource_id VARCHAR(255);

CREATE UNIQUE INDEX clinical_records_openemr_resource_id_key
  ON clinical_records (openemr_resource_id);

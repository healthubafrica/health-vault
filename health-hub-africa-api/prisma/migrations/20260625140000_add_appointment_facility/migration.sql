-- Per-appointment facility routing so encounter sync no longer routes
-- every visit to whichever facility happened to be imported first.
-- Nullable for backward compatibility — existing appointments stay unrouted
-- until edited, and telecare appointments may legitimately have no
-- physical facility.

ALTER TABLE appointments
  ADD COLUMN facility_id UUID;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_facility_id_fkey
  FOREIGN KEY (facility_id) REFERENCES healthcare_facilities(id) ON DELETE SET NULL;

CREATE INDEX appointments_facility_id_idx ON appointments(facility_id);

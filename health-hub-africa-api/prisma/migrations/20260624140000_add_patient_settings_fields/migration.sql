ALTER TABLE patients
  ADD COLUMN preferred_language TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN date_format TEXT NOT NULL DEFAULT 'dd/mm/yyyy';

-- Spec §20 / §8.1 / §4.2: widen patient_activity_events from the minimal
-- shape into the full analytics event model.
--
-- Safe/additive: every column is nullable or has a constant default, so
-- Postgres 11+ applies this without a table rewrite. No column is dropped
-- or retyped. Backfill at the end is best-effort for the handful of legacy
-- rows; new rows get accurate values from trackEvent() going forward.

ALTER TABLE "patient_activity_events"
  ADD COLUMN "event_id"              TEXT,
  ADD COLUMN "event_version"         INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "browser"               TEXT,
  ADD COLUMN "os"                    TEXT,
  ADD COLUMN "feature_area"          TEXT,
  ADD COLUMN "page_name"             TEXT,
  ADD COLUMN "page_path"             TEXT,
  ADD COLUMN "element_id"            TEXT,
  ADD COLUMN "element_type"          TEXT,
  ADD COLUMN "action"                TEXT,
  ADD COLUMN "outcome"               TEXT,
  ADD COLUMN "region_code"           TEXT,
  ADD COLUMN "region_name"           TEXT,
  ADD COLUMN "city"                  TEXT,
  ADD COLUMN "continent_code"        TEXT,
  ADD COLUMN "timezone"              TEXT,
  ADD COLUMN "latitude"              DOUBLE PRECISION,
  ADD COLUMN "longitude"             DOUBLE PRECISION,
  ADD COLUMN "geo_accuracy"          TEXT,
  ADD COLUMN "geo_source"            TEXT,
  ADD COLUMN "geo_provider"          TEXT,
  ADD COLUMN "geo_provider_version"  TEXT,
  ADD COLUMN "asn"                   TEXT,
  ADD COLUMN "ingestion_source"      TEXT,
  ADD COLUMN "is_test_event"         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "received_at"           TIMESTAMP(3);

-- event_id is the dedup key. Partial-unique semantics come for free: a
-- b-tree UNIQUE index permits multiple NULLs, so legacy / no-id rows are
-- unaffected.
CREATE UNIQUE INDEX "patient_activity_events_event_id_key"
  ON "patient_activity_events" ("event_id");

CREATE INDEX "patient_activity_events_analytics_session_id_idx"
  ON "patient_activity_events" ("analytics_session_id");

CREATE INDEX "patient_activity_events_is_test_event_occurred_at_idx"
  ON "patient_activity_events" ("is_test_event", "occurred_at" DESC);

-- Legacy-row backfill (best-effort):
--   received_at  -> occurred_at   (closest known approximation of receive time)
--   ingestion_source -> 'web'     (the portal was the only emitter before the
--                                  mobile SDK; documented as inferred in
--                                  docs/ANALYTICS-PRIVACY-GOVERNANCE.md)
UPDATE "patient_activity_events" SET "received_at" = "occurred_at" WHERE "received_at" IS NULL;
UPDATE "patient_activity_events" SET "ingestion_source" = 'web' WHERE "ingestion_source" IS NULL;

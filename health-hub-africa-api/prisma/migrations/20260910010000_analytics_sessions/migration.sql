-- Spec §7: sessionize analytics events by the client analytics_session_id,
-- separate from the auth UserSession. New table only — additive, nothing
-- touched on existing tables.

CREATE TABLE "analytics_sessions" (
    "id"                   UUID NOT NULL DEFAULT gen_random_uuid(),
    "analytics_session_id" TEXT NOT NULL,
    "patient_id"           UUID,
    "anonymous_visitor_id" TEXT,
    "started_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_event_at"        TIMESTAMP(3) NOT NULL,
    "ended_at"             TIMESTAMP(3),
    "entry_page"           TEXT,
    "exit_page"            TEXT,
    "page_view_count"      INTEGER NOT NULL DEFAULT 0,
    "click_count"          INTEGER NOT NULL DEFAULT 0,
    "event_count"          INTEGER NOT NULL DEFAULT 0,
    "engaged"              BOOLEAN NOT NULL DEFAULT false,
    "returning_visitor"    BOOLEAN NOT NULL DEFAULT false,
    "device_category"      TEXT,
    "browser"              TEXT,
    "os"                   TEXT,
    "country_code"         TEXT,
    "continent_code"       TEXT,
    "ingestion_source"     TEXT,
    "environment"          TEXT,
    "is_test_event"        BOOLEAN NOT NULL DEFAULT false,
    "user_agent"           TEXT,

    CONSTRAINT "analytics_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "analytics_sessions_analytics_session_id_key" ON "analytics_sessions"("analytics_session_id");

CREATE INDEX "analytics_sessions_patient_id_started_at_idx" ON "analytics_sessions"("patient_id", "started_at" DESC);

CREATE INDEX "analytics_sessions_anonymous_visitor_id_started_at_idx" ON "analytics_sessions"("anonymous_visitor_id", "started_at" DESC);

CREATE INDEX "analytics_sessions_started_at_idx" ON "analytics_sessions"("started_at" DESC);

ALTER TABLE "analytics_sessions" ADD CONSTRAINT "analytics_sessions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

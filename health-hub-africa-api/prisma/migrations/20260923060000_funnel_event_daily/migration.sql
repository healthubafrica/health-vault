-- Spec §25 funnel-metrics daily aggregate. New table only — additive,
-- nothing touched on existing tables.

CREATE TABLE "funnel_event_daily" (
    "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_date"     DATE NOT NULL,
    "event_name"      TEXT NOT NULL,
    "count"           INTEGER NOT NULL DEFAULT 0,
    "unique_users"    INTEGER NOT NULL DEFAULT 0,
    "unique_sessions" INTEGER NOT NULL DEFAULT 0,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funnel_event_daily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "funnel_event_daily_report_date_event_name_key" ON "funnel_event_daily"("report_date", "event_name");

CREATE INDEX "funnel_event_daily_report_date_idx" ON "funnel_event_daily"("report_date" DESC);

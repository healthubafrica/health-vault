-- Spec §25 page/click/feature/geography daily aggregates. New table only —
-- additive, nothing touched on existing tables.

CREATE TABLE "dimension_daily_metric" (
    "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_date"     DATE NOT NULL,
    "dimension"       TEXT NOT NULL,
    "dimension_value" TEXT NOT NULL,
    "count"           INTEGER NOT NULL DEFAULT 0,
    "unique_users"    INTEGER NOT NULL DEFAULT 0,
    "unique_sessions" INTEGER NOT NULL DEFAULT 0,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dimension_daily_metric_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dimension_daily_metric_report_date_dimension_dimension_va_key" ON "dimension_daily_metric"("report_date", "dimension", "dimension_value");

CREATE INDEX "dimension_daily_metric_report_date_dimension_idx" ON "dimension_daily_metric"("report_date" DESC, "dimension");

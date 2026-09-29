CREATE TABLE "analytics_pipeline_runs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "source" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "report_date" DATE NOT NULL,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "analytics_pipeline_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "analytics_pipeline_runs_source_started_at_idx"
ON "analytics_pipeline_runs"("source", "started_at" DESC);

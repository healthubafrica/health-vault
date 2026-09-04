-- New table, no impact on existing data.
CREATE TABLE "site_visits" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "path" TEXT NOT NULL,
  "referrer" TEXT,
  "landing_page" TEXT,
  "utm_source" TEXT,
  "utm_medium" TEXT,
  "utm_campaign" TEXT,
  "utm_term" TEXT,
  "utm_content" TEXT,
  "country_code" TEXT,
  "region" TEXT,
  "city" TEXT,
  "timezone" TEXT,
  "user_agent" TEXT,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "site_visits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "site_visits_occurred_at_idx" ON "site_visits"("occurred_at" DESC);
CREATE INDEX "site_visits_utm_campaign_occurred_at_idx" ON "site_visits"("utm_campaign", "occurred_at" DESC);

CREATE TYPE "AcquisitionSource" AS ENUM ('social_media', 'friend', 'referral', 'family');

ALTER TABLE "users"
ADD COLUMN "acquisition_source" "AcquisitionSource",
ADD COLUMN "utm_source" TEXT,
ADD COLUMN "utm_medium" TEXT,
ADD COLUMN "utm_campaign" TEXT,
ADD COLUMN "utm_term" TEXT,
ADD COLUMN "utm_content" TEXT,
ADD COLUMN "registration_referrer" TEXT,
ADD COLUMN "registration_landing_page" TEXT;

CREATE TABLE "login_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "ip_address" TEXT,
  "country_code" TEXT,
  "region" TEXT,
  "city" TEXT,
  "timezone" TEXT,
  "user_agent" TEXT,
  "referrer" TEXT,
  "landing_page" TEXT,
  "utm_source" TEXT,
  "utm_medium" TEXT,
  "utm_campaign" TEXT,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "login_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "login_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "login_events_occurred_at_idx" ON "login_events"("occurred_at" DESC);
CREATE INDEX "login_events_user_id_occurred_at_idx" ON "login_events"("user_id", "occurred_at" DESC);
CREATE INDEX "login_events_utm_campaign_occurred_at_idx" ON "login_events"("utm_campaign", "occurred_at" DESC);

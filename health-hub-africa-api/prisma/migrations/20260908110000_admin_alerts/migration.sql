-- Safe/additive: new table, and relax an existing NOT NULL (no data loss,
-- no backfill) so ops-alert emails can be tracked without a patient/user.
CREATE TABLE "admin_alerts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "type" TEXT NOT NULL,
  "severity" "AlertSeverity" NOT NULL DEFAULT 'warning',
  "title" TEXT NOT NULL,
  "body" TEXT,
  "metadata" JSONB,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_alerts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_alerts_created_at_idx" ON "admin_alerts"("created_at" DESC);
CREATE INDEX "admin_alerts_is_read_idx" ON "admin_alerts"("is_read");

ALTER TABLE "notification_deliveries" ALTER COLUMN "user_id" DROP NOT NULL;

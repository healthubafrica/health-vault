-- CreateTable: notification_recipients
CREATE TABLE "notification_recipients" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "label"      TEXT NOT NULL,
  "email"      TEXT NOT NULL,
  "is_active"  BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable: provider_notification_emails
CREATE TABLE "provider_notification_emails" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "provider_id" UUID NOT NULL,
  "label"       TEXT,
  "email"       TEXT NOT NULL,
  "is_active"   BOOLEAN NOT NULL DEFAULT true,
  "added_by"    UUID,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "provider_notification_emails_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "provider_notification_emails"
  ADD CONSTRAINT "provider_notification_emails_provider_id_fkey"
  FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "provider_notification_emails_provider_id_idx" ON "provider_notification_emails"("provider_id");

-- Seed: migrate the existing hardcoded APPOINTMENTS_OPS_EMAIL default so
-- behavior is unchanged the moment this ships — this address becomes an
-- editable row instead of an env var.
INSERT INTO "notification_recipients" ("id", "label", "email", "is_active", "updated_at")
VALUES (gen_random_uuid(), 'Operations', 'appointments@healthhubafrica.com', true, CURRENT_TIMESTAMP);

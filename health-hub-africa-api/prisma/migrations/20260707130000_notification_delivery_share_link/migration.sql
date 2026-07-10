-- Links a NotificationDelivery row back to the RecordShare it was sent for
-- (share-link email/SMS), so the Resend delivery webhook can mirror
-- delivered/bounced status onto that share's RecordShareAccess audit trail.
ALTER TABLE "notification_deliveries" ADD COLUMN "share_id" UUID;

ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_share_id_fkey" FOREIGN KEY ("share_id") REFERENCES "record_shares"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "notification_deliveries_share_id_idx" ON "notification_deliveries"("share_id");
CREATE INDEX "notification_deliveries_provider_ref_idx" ON "notification_deliveries"("provider_ref");

-- Recipient actually received the share-link email (confirmed via Resend's
-- delivery webhook), distinct from link_sent (we handed it to the provider)
-- and link_opened (recipient clicked through).
ALTER TYPE "ShareAccessAction" ADD VALUE IF NOT EXISTS 'link_delivered';

-- Idempotency key for OpenEMR-originated lab orders, mirroring the same
-- pattern already used on clinical_records.openemr_resource_id. Nullable/
-- additive — portal-initiated lab orders (LabsService.createOrder) never
-- set this column.
ALTER TABLE "lab_orders"
  ADD COLUMN "openemr_resource_id" TEXT;

CREATE UNIQUE INDEX "lab_orders_openemr_resource_id_key"
  ON "lab_orders"("openemr_resource_id");

-- Safe/additive: nullable column, no default, no backfill.
ALTER TABLE "appointments" ADD COLUMN "idempotency_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "appointments_idempotency_key_key" ON "appointments"("idempotency_key");

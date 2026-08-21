-- CreateTable: payment_methods
-- Saved cards, tokenized by the gateway on a successful charge. The card
-- number itself is never stored — gateway_token is the gateway's reusable
-- charge token (AES-256-GCM encrypted at rest by the application layer).
CREATE TABLE "payment_methods" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "patient_id"    UUID NOT NULL,
  "gateway"       "PaymentGateway" NOT NULL,
  "gateway_token" TEXT NOT NULL,
  "card_brand"    TEXT,
  "last4"         VARCHAR(4),
  "expiry_month"  VARCHAR(2),
  "expiry_year"   VARCHAR(2),
  "is_default"    BOOLEAN NOT NULL DEFAULT false,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "payment_methods"
  ADD CONSTRAINT "payment_methods_patient_id_fkey"
  FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "payment_methods_patient_id_idx" ON "payment_methods"("patient_id");

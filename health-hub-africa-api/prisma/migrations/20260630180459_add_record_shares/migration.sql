-- CreateEnum
CREATE TYPE "ShareAccessMode" AS ENUM ('public', 'email_list', 'password');

-- CreateEnum
CREATE TYPE "ShareAccessAction" AS ENUM ('viewed', 'otp_sent', 'otp_failed', 'otp_verified', 'forward_detected', 'revoked');

-- CreateTable
CREATE TABLE "record_shares" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "label" TEXT,
    "access_mode" "ShareAccessMode" NOT NULL DEFAULT 'public',
    "allowed_emails" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "password_hash" TEXT,
    "record_types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "expires_at" TIMESTAMP(3),
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMP(3),
    "detect_forwarding" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "record_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_share_accesses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "share_id" UUID NOT NULL,
    "action" "ShareAccessAction" NOT NULL,
    "visitor_email" TEXT,
    "session_fingerprint" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "record_share_accesses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "record_shares_token_hash_key" ON "record_shares"("token_hash");

-- CreateIndex
CREATE INDEX "record_shares_patient_id_idx" ON "record_shares"("patient_id");

-- CreateIndex
CREATE INDEX "record_share_accesses_share_id_occurred_at_idx" ON "record_share_accesses"("share_id", "occurred_at" DESC);

-- AddForeignKey
ALTER TABLE "record_shares" ADD CONSTRAINT "record_shares_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_share_accesses" ADD CONSTRAINT "record_share_accesses_share_id_fkey" FOREIGN KEY ("share_id") REFERENCES "record_shares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

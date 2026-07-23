CREATE TABLE "telecare_guest_invites" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "session_id"  UUID NOT NULL,
  "guest_name"  TEXT NOT NULL,
  "guest_email" TEXT NOT NULL,
  "token_hash"  TEXT NOT NULL,
  "is_revoked"  BOOLEAN NOT NULL DEFAULT false,
  "verified_at" TIMESTAMP(3),
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "telecare_guest_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "telecare_guest_invites_token_hash_key" ON "telecare_guest_invites"("token_hash");
CREATE INDEX "telecare_guest_invites_session_id_idx" ON "telecare_guest_invites"("session_id");

ALTER TABLE "telecare_guest_invites"
  ADD CONSTRAINT "telecare_guest_invites_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "telecare_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

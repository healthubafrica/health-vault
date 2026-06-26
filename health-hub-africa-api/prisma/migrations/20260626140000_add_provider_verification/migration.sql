-- Dedicated provider verification stamp so the existing User.isVerified
-- (set by signup OTP) can't double as "admin has approved this clinician's
-- license and specialty". Sync to OpenEMR and patient appointment booking
-- are now both gated on providers.verified_at IS NOT NULL.

ALTER TABLE providers
  ADD COLUMN verified_at TIMESTAMPTZ,
  ADD COLUMN verified_by UUID;

ALTER TABLE providers
  ADD CONSTRAINT providers_verified_by_fkey
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX providers_verified_at_idx ON providers(verified_at);

-- Backfill existing rows so the live roster keeps working. The bar going
-- forward is explicit admin verify; rows that pre-date this column inherit
-- their created_at as the verification timestamp. Re-verify any provider
-- whose credentials weren't manually checked.
UPDATE providers SET verified_at = created_at WHERE verified_at IS NULL;

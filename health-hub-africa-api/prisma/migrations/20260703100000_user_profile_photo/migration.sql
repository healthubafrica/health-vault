-- Canonical profile photo for every role (admins/coordinators have no
-- patient/provider profile row to hang a photo on). Patient and provider
-- profile photos remain and take precedence when set; the unified
-- /auth/me/profile-photo endpoint mirrors into them to keep readers agreeing.
ALTER TABLE "users" ADD COLUMN "profile_photo_url" TEXT;

-- Backfill from existing role profiles so every dashboard shows the same
-- photo immediately after this release.
UPDATE "users" u SET "profile_photo_url" = p."profile_photo_url"
FROM "patients" p
WHERE p."user_id" = u."id" AND p."profile_photo_url" IS NOT NULL;

UPDATE "users" u SET "profile_photo_url" = pr."profile_photo_url"
FROM "providers" pr
WHERE pr."user_id" = u."id" AND pr."profile_photo_url" IS NOT NULL
  AND u."profile_photo_url" IS NULL;

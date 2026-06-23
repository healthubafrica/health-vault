ALTER TABLE subscription_plans
  ADD COLUMN storage_quota_bytes BIGINT;

ALTER TABLE patients
  ADD COLUMN profile_photo_size_bytes INT,
  ADD COLUMN storage_quota_override_bytes BIGINT;

-- Set 100 MB quota on the Free plan
UPDATE subscription_plans
  SET storage_quota_bytes = 104857600
  WHERE tier = 'Free';

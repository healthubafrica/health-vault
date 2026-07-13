-- Align the Free plan's feature list with the approved offering (the same
-- list the marketing Plans & Pricing page shows). Removes the placeholder
-- "None / Not included" rows and the per-service pay-per-use lines, which
-- are covered by "Access to Pay-Per-Use Services".

UPDATE "subscription_plans"
SET "features" = '[
  "Digital Health Passport",
  "Personal Health Record Storage",
  "Emergency Health Profile",
  "Medication Reminders",
  "Appointment Reminders",
  "Vaccination Tracking",
  "Access to Pay-Per-Use Services"
]'::jsonb
WHERE "slug" = 'free';

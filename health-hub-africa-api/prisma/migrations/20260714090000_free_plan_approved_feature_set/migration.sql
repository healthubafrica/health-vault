-- Narrow the Free plan's feature list to the approved offering: drops
-- "Medication Reminders" and "Vaccination Tracking" (Vaccination Tracking
-- maps to the Immunizations display, now gated to paid tiers in the portal —
-- see ProfilePanel.tsx), and renames "Personal Health Record Storage" to
-- "Basic Personal Health Record (PHR) Storage" to match the approved wording.
-- Must stay in lockstep with myvaultplus-web/src/lib/planData.ts and
-- prisma/seed.ts.

UPDATE "subscription_plans"
SET "features" = '[
  "Digital Health Passport",
  "Basic Personal Health Record (PHR) Storage",
  "Emergency Health Profile",
  "Appointment Reminders",
  "Access to Pay-Per-Use Services"
]'::jsonb
WHERE "slug" = 'free';

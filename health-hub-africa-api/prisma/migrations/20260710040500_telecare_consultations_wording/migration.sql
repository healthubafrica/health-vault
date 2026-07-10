-- Data fix: TeleCare usage is a remote physician consultation, not a
-- physical "visit". Rewrites the TeleCare bullet inside each plan's
-- `features` JSON array in place (MinuteCare's "visit" wording is a
-- different, in-person service and is left untouched).

UPDATE subscription_plans sp
SET features = updated.new_features
FROM (
  SELECT sp2.id, jsonb_agg(
    CASE
      WHEN elem = to_jsonb('TeleCare™ Physician Consultations: Pay-per-visit'::text)
        THEN to_jsonb('TeleCare™ Physician Consultations: Pay-per-consultation'::text)
      ELSE elem
    END
    ORDER BY ord
  ) AS new_features
  FROM subscription_plans sp2, jsonb_array_elements(sp2.features) WITH ORDINALITY AS t(elem, ord)
  WHERE sp2.slug = 'free'
  GROUP BY sp2.id
) AS updated
WHERE sp.id = updated.id;

UPDATE subscription_plans sp
SET features = updated.new_features
FROM (
  SELECT sp2.id, jsonb_agg(
    CASE
      WHEN elem = to_jsonb('TeleCare™ Physician Consultations: 2 visits/year'::text)
        THEN to_jsonb('TeleCare™ Physician Consultations: 2 consultations/year'::text)
      ELSE elem
    END
    ORDER BY ord
  ) AS new_features
  FROM subscription_plans sp2, jsonb_array_elements(sp2.features) WITH ORDINALITY AS t(elem, ord)
  WHERE sp2.slug = 'basiccare'
  GROUP BY sp2.id
) AS updated
WHERE sp.id = updated.id;

UPDATE subscription_plans sp
SET features = updated.new_features
FROM (
  SELECT sp2.id, jsonb_agg(
    CASE
      WHEN elem = to_jsonb('TeleCare™ Physician Consultations: 6 visits/year'::text)
        THEN to_jsonb('TeleCare™ Physician Consultations: 6 consultations/year'::text)
      ELSE elem
    END
    ORDER BY ord
  ) AS new_features
  FROM subscription_plans sp2, jsonb_array_elements(sp2.features) WITH ORDINALITY AS t(elem, ord)
  WHERE sp2.slug = 'silvercare'
  GROUP BY sp2.id
) AS updated
WHERE sp.id = updated.id;

UPDATE subscription_plans sp
SET features = updated.new_features
FROM (
  SELECT sp2.id, jsonb_agg(
    CASE
      WHEN elem = to_jsonb('TeleCare™ Physician Consultations: 24 visits/year'::text)
        THEN to_jsonb('TeleCare™ Physician Consultations: 24 consultations/year'::text)
      ELSE elem
    END
    ORDER BY ord
  ) AS new_features
  FROM subscription_plans sp2, jsonb_array_elements(sp2.features) WITH ORDINALITY AS t(elem, ord)
  WHERE sp2.slug = 'goldcare'
  GROUP BY sp2.id
) AS updated
WHERE sp.id = updated.id;

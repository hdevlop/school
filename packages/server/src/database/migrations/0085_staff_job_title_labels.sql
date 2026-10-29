-- Keep the existing job title, staff references and linked access role.
-- Only replace the old default labels; preserve labels customized by a school.
UPDATE "staff_roles"
SET "label" = CASE
      WHEN "label" = 'General Supervisor' THEN 'Supervisor'
      ELSE "label"
    END,
    "labels" = "labels"
      || CASE WHEN "labels"->>'fr' = 'Surveillant général'
        THEN '{"fr":"Surveillant"}'::jsonb ELSE '{}'::jsonb END
      || CASE WHEN "labels"->>'ar' = 'الحارس العام'
        THEN '{"ar":"مشرف"}'::jsonb ELSE '{}'::jsonb END
      || CASE WHEN "labels"->>'es' = 'Supervisor general'
        THEN '{"es":"Supervisor"}'::jsonb ELSE '{}'::jsonb END,
    "updated_at" = now()
WHERE "code" = 'supervisor'
  AND ("label" = 'General Supervisor'
    OR "labels"->>'fr' = 'Surveillant général'
    OR "labels"->>'ar' = 'الحارس العام'
    OR "labels"->>'es' = 'Supervisor general');

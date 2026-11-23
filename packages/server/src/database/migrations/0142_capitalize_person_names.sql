-- Every person's Latin name is written one way: each word capitalized, the
-- rest lower case, spacing tidied ("ilham  ACHTOUK" → "Ilham Achtouk").
-- capitalizePersonName (@sms/contracts) applies the same rule to each later
-- save. Arabic names have no capitals: only their spacing changes.
--
-- initcap capitalizes accented letters only under a UTF-8 locale. On a
-- database that cannot lowercase "É", every update below changes nothing
-- rather than miswrite accented names (Élodie).
UPDATE "students" SET "name" = initcap(regexp_replace(btrim("name"), '\s+', ' ', 'g'))
WHERE lower('É') = 'é' AND "name" IS DISTINCT FROM initcap(regexp_replace(btrim("name"), '\s+', ' ', 'g'));
--> statement-breakpoint
UPDATE "parents" SET "name" = initcap(regexp_replace(btrim("name"), '\s+', ' ', 'g'))
WHERE lower('É') = 'é' AND "name" IS DISTINCT FROM initcap(regexp_replace(btrim("name"), '\s+', ' ', 'g'));
--> statement-breakpoint
UPDATE "staff" SET "name" = initcap(regexp_replace(btrim("name"), '\s+', ' ', 'g'))
WHERE lower('É') = 'é' AND "name" IS DISTINCT FROM initcap(regexp_replace(btrim("name"), '\s+', ' ', 'g'));
--> statement-breakpoint
UPDATE "teacher_requests" SET "name" = initcap(regexp_replace(btrim("name"), '\s+', ' ', 'g'))
WHERE lower('É') = 'é' AND "name" IS DISTINCT FROM initcap(regexp_replace(btrim("name"), '\s+', ' ', 'g'));
--> statement-breakpoint
UPDATE "users" SET "name" = initcap(regexp_replace(btrim("name"), '\s+', ' ', 'g'))
WHERE lower('É') = 'é' AND "name" IS DISTINCT FROM initcap(regexp_replace(btrim("name"), '\s+', ' ', 'g'));

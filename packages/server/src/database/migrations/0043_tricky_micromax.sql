ALTER TABLE "settings" ALTER COLUMN "theme" SET DEFAULT 'light';--> statement-breakpoint
-- School UI theme is `light | dark`. `system` (the old column default) and the
-- never-offered `auto` both meant "no explicit choice"; both become `light`, the
-- new default, rather than staying as values the settings form can no longer
-- parse. Rows already holding `light` or `dark`, and rows holding NULL, are
-- untouched.
UPDATE "settings" SET "theme" = 'light' WHERE "theme" IN ('system', 'auto');

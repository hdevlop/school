-- A role whose navigation was configured in the roles screen (sidebar:configured)
-- shows only the entries it holds a sidebar:<page> grant for, so Compétences
-- stayed out of its menu although the role may open the page. Give those
-- roles the entry, beside Grades in the order they saved, as 0101 did for
-- Massar. A role without a configured sidebar shows it already. The page
-- still asks for read:competencies; an administrator can take the entry out
-- again in the roles screen. Additive and idempotent; a signed-in account
-- gets the grant at its next sign-in.
INSERT INTO "permissions" ("id", "name", "description", "resource", "action") VALUES
  ('school-sidebar-competencies', 'sidebar:competencies', 'Show competencies in sidebar', 'sidebar', 'show')
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT configured."role_id", entry."id"
FROM "role_permissions" configured
JOIN "permissions" flag ON flag."id" = configured."permission_id" AND flag."name" = 'sidebar:configured'
JOIN "roles" role ON role."id" = configured."role_id"
JOIN "permissions" entry ON entry."name" = 'sidebar:competencies'
WHERE role."name" IN ('admin', 'principal', 'teacher', 'supervisor', 'monitor', 'parent', 'student')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- Right after Grades in a saved order; an order without Grades leaves it last.
UPDATE "role_sidebar_layouts" SET "item_order" = (
  SELECT jsonb_agg(entries.item ORDER BY entries.position, entries.after_grades)
  FROM (
    SELECT saved.value AS item, saved.ordinality AS position, 0 AS after_grades
    FROM jsonb_array_elements("role_sidebar_layouts"."item_order") WITH ORDINALITY AS saved
    UNION ALL
    SELECT '"/competencies"'::jsonb, saved.ordinality, 1
    FROM jsonb_array_elements("role_sidebar_layouts"."item_order") WITH ORDINALITY AS saved
    WHERE saved.value = '"/grades"'::jsonb
  ) entries
)
WHERE NOT ("item_order" ? '/competencies') AND "item_order" ? '/grades';

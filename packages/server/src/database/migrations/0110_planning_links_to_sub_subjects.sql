-- Planning's subject links become sub-subjects of the subject they named; a
-- "No exam" link, or one that is a subject's own name, is not a sub-subject.
INSERT INTO "sub_subjects" ("id", "subject_id", "name", "position")
SELECT substr(md5(random()::text || link."id"), 1, 8), link."subject_id", btrim(link."name"),
  row_number() OVER (PARTITION BY link."subject_id" ORDER BY link."name")::int - 1
FROM "exam_planning_subjects" link
WHERE link."subject_id" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "subjects" s WHERE lower(btrim(s."name")) = lower(btrim(link."name")))
ON CONFLICT DO NOTHING;--> statement-breakpoint
DROP TABLE "exam_planning_subjects" CASCADE;

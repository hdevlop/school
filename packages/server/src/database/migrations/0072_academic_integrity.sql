DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM subjects GROUP BY upper(btrim(code)) HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Subject codes differ only by case or surrounding spaces. Resolve these duplicates before applying academic_integrity.';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "teacher_assignments" DROP CONSTRAINT "teacher_assignments_section_id_sections_id_fk";
--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_code_normalized_unique" ON "subjects" USING btree (upper(btrim("code")));
--> statement-breakpoint
UPDATE subjects SET code = upper(btrim(code)) WHERE code <> upper(btrim(code));
--> statement-breakpoint
INSERT INTO cycles (id, name, labels, sort_order, active)
SELECT 'school-cycle-0', 'Maternelle', '{"fr":"Maternelle","en":"Preschool","ar":"التعليم الأولي","es":"Preescolar"}'::jsonb, 0, true
WHERE NOT EXISTS (SELECT 1 FROM cycles WHERE lower(btrim(name)) IN ('maternelle', 'maternelle', 'preschool', 'التعليم الأولي', 'preescolar') OR labels->>'fr' = 'Maternelle');
--> statement-breakpoint
UPDATE cycles SET labels = '{"fr":"Maternelle","en":"Preschool","ar":"التعليم الأولي","es":"Preescolar"}'::jsonb || coalesce(labels, '{}'::jsonb)
WHERE lower(btrim(name)) IN ('maternelle', 'maternelle', 'preschool', 'التعليم الأولي', 'preescolar');
--> statement-breakpoint
UPDATE classes SET cycle_id = (
  SELECT id FROM cycles WHERE active AND (lower(btrim(name)) IN ('maternelle', 'maternelle', 'preschool', 'التعليم الأولي', 'preescolar') OR labels->>'fr' = 'Maternelle')
  ORDER BY sort_order, id LIMIT 1
)
WHERE cycle_id IS NULL AND lower(btrim(level)) IN ('maternelle', 'maternelle', 'preschool', 'التعليم الأولي', 'preescolar');
--> statement-breakpoint
INSERT INTO cycles (id, name, labels, sort_order, active)
SELECT 'school-cycle-1', 'Primaire', '{"fr":"Primaire","en":"Primary School","ar":"الابتدائي","es":"Primaria"}'::jsonb, 1, true
WHERE NOT EXISTS (SELECT 1 FROM cycles WHERE lower(btrim(name)) IN ('primaire', 'primaire', 'primary school', 'الابتدائي', 'primaria') OR labels->>'fr' = 'Primaire');
--> statement-breakpoint
UPDATE cycles SET labels = '{"fr":"Primaire","en":"Primary School","ar":"الابتدائي","es":"Primaria"}'::jsonb || coalesce(labels, '{}'::jsonb)
WHERE lower(btrim(name)) IN ('primaire', 'primaire', 'primary school', 'الابتدائي', 'primaria');
--> statement-breakpoint
UPDATE classes SET cycle_id = (
  SELECT id FROM cycles WHERE active AND (lower(btrim(name)) IN ('primaire', 'primaire', 'primary school', 'الابتدائي', 'primaria') OR labels->>'fr' = 'Primaire')
  ORDER BY sort_order, id LIMIT 1
)
WHERE cycle_id IS NULL AND lower(btrim(level)) IN ('primaire', 'primaire', 'primary school', 'الابتدائي', 'primaria');
--> statement-breakpoint
INSERT INTO cycles (id, name, labels, sort_order, active)
SELECT 'school-cycle-2', 'Collège', '{"fr":"Collège","en":"Middle School","ar":"الإعدادي","es":"Secundaria"}'::jsonb, 2, true
WHERE NOT EXISTS (SELECT 1 FROM cycles WHERE lower(btrim(name)) IN ('collège', 'collège', 'middle school', 'الإعدادي', 'secundaria') OR labels->>'fr' = 'Collège');
--> statement-breakpoint
UPDATE cycles SET labels = '{"fr":"Collège","en":"Middle School","ar":"الإعدادي","es":"Secundaria"}'::jsonb || coalesce(labels, '{}'::jsonb)
WHERE lower(btrim(name)) IN ('collège', 'collège', 'middle school', 'الإعدادي', 'secundaria');
--> statement-breakpoint
UPDATE classes SET cycle_id = (
  SELECT id FROM cycles WHERE active AND (lower(btrim(name)) IN ('collège', 'collège', 'middle school', 'الإعدادي', 'secundaria') OR labels->>'fr' = 'Collège')
  ORDER BY sort_order, id LIMIT 1
)
WHERE cycle_id IS NULL AND lower(btrim(level)) IN ('collège', 'collège', 'middle school', 'الإعدادي', 'secundaria');
--> statement-breakpoint
INSERT INTO cycles (id, name, labels, sort_order, active)
SELECT 'school-cycle-3', 'Lycée', '{"fr":"Lycée","en":"High School","ar":"الثانوي","es":"Bachillerato"}'::jsonb, 3, true
WHERE NOT EXISTS (SELECT 1 FROM cycles WHERE lower(btrim(name)) IN ('lycée', 'lycée', 'high school', 'الثانوي', 'bachillerato') OR labels->>'fr' = 'Lycée');
--> statement-breakpoint
UPDATE cycles SET labels = '{"fr":"Lycée","en":"High School","ar":"الثانوي","es":"Bachillerato"}'::jsonb || coalesce(labels, '{}'::jsonb)
WHERE lower(btrim(name)) IN ('lycée', 'lycée', 'high school', 'الثانوي', 'bachillerato');
--> statement-breakpoint
UPDATE classes SET cycle_id = (
  SELECT id FROM cycles WHERE active AND (lower(btrim(name)) IN ('lycée', 'lycée', 'high school', 'الثانوي', 'bachillerato') OR labels->>'fr' = 'Lycée')
  ORDER BY sort_order, id LIMIT 1
)
WHERE cycle_id IS NULL AND lower(btrim(level)) IN ('lycée', 'lycée', 'high school', 'الثانوي', 'bachillerato');

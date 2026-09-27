CREATE TABLE "academic_years" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"instruction_starts_on" date NOT NULL,
	"instruction_ends_on" date NOT NULL,
	"reporting_starts_on" date NOT NULL,
	"reporting_ends_on" date NOT NULL,
	"payment_closeout_on" date NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"provenance" text NOT NULL,
	"provenance_note" text,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "active_academic_year_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "academic_years_label_unique" ON "academic_years" USING btree ("label");--> statement-breakpoint
CREATE INDEX "academic_years_reporting_idx" ON "academic_years" USING btree ("reporting_starts_on","reporting_ends_on");--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_active_academic_year_id_academic_years_id_fk" FOREIGN KEY ("active_academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
INSERT INTO "academic_years" (
  "id", "label", "instruction_starts_on", "instruction_ends_on",
  "reporting_starts_on", "reporting_ends_on", "payment_closeout_on",
  "status", "provenance", "provenance_note"
)
SELECT
  'ay_' || replace(label, '-', '_'), label,
  (substring(label, 1, 4) || '-09-01')::date,
  (substring(label, 6, 4) || '-06-30')::date,
  (substring(label, 1, 4) || '-09-01')::date,
  (substring(label, 6, 4) || '-08-31')::date,
  (substring(label, 6, 4) || '-07-14')::date,
  'open', 'assumed',
  'Imported stored year label; September-June and July 14 calendar requires review'
FROM (
  SELECT DISTINCT label FROM (
    SELECT current_academic_year AS label FROM settings
    UNION SELECT academic_year AS label FROM classes
    UNION SELECT academic_year AS label FROM fees
    UNION SELECT academic_year AS label FROM routine_schedules
  ) stored
  WHERE CASE WHEN label ~ '^[0-9]{4}-[0-9]{4}$'
    THEN substring(label, 6, 4)::integer = substring(label, 1, 4)::integer + 1
    ELSE false END
) years
ON CONFLICT (label) DO NOTHING;--> statement-breakpoint
UPDATE settings s SET active_academic_year_id = y.id
FROM academic_years y WHERE y.label = s.current_academic_year;--> statement-breakpoint
ALTER TABLE academic_years ADD CONSTRAINT academic_years_status_check
CHECK (status IN ('draft', 'open', 'closed'));--> statement-breakpoint
ALTER TABLE academic_years ADD CONSTRAINT academic_years_provenance_check
CHECK (provenance IN ('verified', 'assumed'));--> statement-breakpoint
ALTER TABLE academic_years ADD CONSTRAINT academic_years_calendar_order_check
CHECK (
  reporting_starts_on <= instruction_starts_on AND
  instruction_starts_on <= instruction_ends_on AND
  instruction_ends_on <= payment_closeout_on AND
  payment_closeout_on <= reporting_ends_on
);--> statement-breakpoint
ALTER TABLE academic_years ADD CONSTRAINT academic_years_reporting_no_overlap
EXCLUDE USING gist (daterange(reporting_starts_on, reporting_ends_on, '[]') WITH &&);

CREATE TABLE "massar_part_results" (
	"id" text PRIMARY KEY NOT NULL,
	"academic_year_id" text NOT NULL,
	"sheet_id" text NOT NULL,
	"test_id" text NOT NULL,
	"part_id" text NOT NULL,
	"correct" integer NOT NULL,
	"updated_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "massar_part_result_correct" CHECK ("massar_part_results"."correct" >= 0)
);
--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "parts" jsonb;--> statement-breakpoint
ALTER TABLE "exams" ADD COLUMN "parts" jsonb;--> statement-breakpoint
ALTER TABLE "massar_part_results" ADD CONSTRAINT "massar_part_results_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_part_results" ADD CONSTRAINT "massar_part_results_sheet_id_massar_sheets_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."massar_sheets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_part_results" ADD CONSTRAINT "massar_part_results_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "massar_part_result_unique" ON "massar_part_results" USING btree ("sheet_id","test_id","part_id");
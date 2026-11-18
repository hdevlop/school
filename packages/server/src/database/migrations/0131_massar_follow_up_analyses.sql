CREATE TABLE "massar_follow_up_analyses" (
	"id" text PRIMARY KEY NOT NULL,
	"academic_year_id" text NOT NULL,
	"sheet_id" text NOT NULL,
	"student_id" text NOT NULL,
	"analysis" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "massar_analysis_length" CHECK (char_length("massar_follow_up_analyses"."analysis") <= 2000)
);
--> statement-breakpoint
ALTER TABLE "massar_follow_up_analyses" ADD CONSTRAINT "massar_follow_up_analyses_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_follow_up_analyses" ADD CONSTRAINT "massar_follow_up_analyses_sheet_id_massar_sheets_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."massar_sheets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_follow_up_analyses" ADD CONSTRAINT "massar_follow_up_analyses_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_follow_up_analyses" ADD CONSTRAINT "massar_follow_up_analyses_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "massar_analysis_unique" ON "massar_follow_up_analyses" USING btree ("sheet_id","student_id");
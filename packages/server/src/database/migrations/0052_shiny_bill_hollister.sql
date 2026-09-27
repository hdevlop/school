ALTER TABLE "assessments" ADD COLUMN "academic_year_id" text;--> statement-breakpoint
ALTER TABLE "exams" ADD COLUMN "academic_year_id" text;--> statement-breakpoint
ALTER TABLE "grades" ADD COLUMN "academic_year_id" text;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessments_year_date_idx" ON "assessments" USING btree ("academic_year_id","date");--> statement-breakpoint
CREATE INDEX "exams_year_date_idx" ON "exams" USING btree ("academic_year_id","date");--> statement-breakpoint
CREATE INDEX "grades_year_student_idx" ON "grades" USING btree ("academic_year_id","student_id");

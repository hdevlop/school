ALTER TABLE "announcements" ADD COLUMN "academic_year_id" text;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcements_academic_year_idx" ON "announcements" USING btree ("academic_year_id");

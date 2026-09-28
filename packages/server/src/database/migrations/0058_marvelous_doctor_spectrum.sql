ALTER TABLE "alerts" ADD COLUMN "academic_year_id" text;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alerts_academic_year_idx" ON "alerts" USING btree ("academic_year_id");

CREATE TABLE "massar_remarks" (
	"id" text PRIMARY KEY NOT NULL,
	"academic_year_id" text NOT NULL,
	"sheet_id" text NOT NULL,
	"student_id" text NOT NULL,
	"remark" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "massar_remark_length" CHECK (char_length("massar_remarks"."remark") between 1 and 300)
);
--> statement-breakpoint
ALTER TABLE "massar_remarks" ADD CONSTRAINT "massar_remarks_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_remarks" ADD CONSTRAINT "massar_remarks_sheet_id_massar_sheets_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."massar_sheets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_remarks" ADD CONSTRAINT "massar_remarks_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_remarks" ADD CONSTRAINT "massar_remarks_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "massar_remark_unique" ON "massar_remarks" USING btree ("sheet_id","student_id");
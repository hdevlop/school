ALTER TABLE "alerts" ADD COLUMN "class_id" text;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "subject_id" text;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;

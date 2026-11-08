CREATE TABLE "sub_subjects" (
	"id" text PRIMARY KEY NOT NULL,
	"subject_id" text NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "sub_subjects" ADD CONSTRAINT "sub_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sub_subjects_name_unique" ON "sub_subjects" USING btree (lower(btrim("name")));--> statement-breakpoint
CREATE INDEX "sub_subjects_subject_idx" ON "sub_subjects" USING btree ("subject_id");
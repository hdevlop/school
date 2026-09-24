ALTER TABLE "routine_entries" ADD COLUMN "content_groups" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "routine_entries" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "routine_entries" ADD CONSTRAINT "routine_entries_content_groups_array_check" CHECK (jsonb_typeof("routine_entries"."content_groups") = 'array');--> statement-breakpoint
ALTER TABLE "routine_entries" ADD CONSTRAINT "routine_entries_version_positive_check" CHECK ("routine_entries"."version" > 0);

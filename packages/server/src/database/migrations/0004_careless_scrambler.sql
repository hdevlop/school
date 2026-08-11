ALTER TABLE "tokens" ADD COLUMN "previous_hash" text;--> statement-breakpoint
ALTER TABLE "tokens" ADD COLUMN "previous_valid_until" timestamp;--> statement-breakpoint
ALTER TABLE "tokens" ADD COLUMN "previous_used_at" timestamp;

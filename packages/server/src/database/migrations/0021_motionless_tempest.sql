ALTER TABLE "tokens" DROP CONSTRAINT "tokens_user_id_unique";--> statement-breakpoint
UPDATE "tokens" SET "token_family" = "id" WHERE "token_family" IS NULL OR "token_family" = '';--> statement-breakpoint
ALTER TABLE "tokens" ALTER COLUMN "token_family" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "tokens_user_id_idx" ON "tokens" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_token_family_unique" UNIQUE("token_family");

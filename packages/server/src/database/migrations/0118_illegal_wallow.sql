CREATE TABLE "family_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"receipt_number" text NOT NULL,
	"parent_id" text,
	"processed_by" text,
	"idempotency_key" text,
	"idempotency_hash" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "family_receipts_receipt_number_unique" UNIQUE("receipt_number")
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "family_receipt_id" text;--> statement-breakpoint
ALTER TABLE "family_receipts" ADD CONSTRAINT "family_receipts_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_receipts" ADD CONSTRAINT "family_receipts_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "family_receipts_idempotency_key_unique" ON "family_receipts" USING btree ("idempotency_key") WHERE "family_receipts"."idempotency_key" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_family_receipt_id_family_receipts_id_fk" FOREIGN KEY ("family_receipt_id") REFERENCES "public"."family_receipts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_family_receipt_idx" ON "payments" USING btree ("family_receipt_id");
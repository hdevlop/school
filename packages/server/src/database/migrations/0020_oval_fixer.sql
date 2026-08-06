CREATE TYPE "public"."rolloverRunStatus" AS ENUM('pending', 'previewed', 'committed', 'failed', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."paymentStatus" ADD VALUE 'deposited' BEFORE 'failed';--> statement-breakpoint
ALTER TYPE "public"."paymentStatus" ADD VALUE 'bounced' BEFORE 'failed';--> statement-breakpoint
ALTER TYPE "public"."paymentStatus" ADD VALUE 'voided';--> statement-breakpoint
CREATE TABLE "financial_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"actor_id" text,
	"before" jsonb,
	"after" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "financial_notification_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"student_id" text NOT NULL,
	"business_date" date NOT NULL,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rollover_run_items" (
	"id" text PRIMARY KEY NOT NULL,
	"rollover_run_id" text NOT NULL,
	"student_id" text NOT NULL,
	"fee_type_id" text NOT NULL,
	"fee_id" text,
	"status" text NOT NULL,
	"reason" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rollover_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"from_year" text NOT NULL,
	"to_year" text NOT NULL,
	"status" "rolloverRunStatus" DEFAULT 'pending' NOT NULL,
	"preview" jsonb,
	"copy_discounts" boolean DEFAULT false NOT NULL,
	"include_one_time_fees" boolean DEFAULT false NOT NULL,
	"dry_run" boolean DEFAULT true NOT NULL,
	"payload_hash" text NOT NULL,
	"idempotency_key" text,
	"total_students" integer DEFAULT 0 NOT NULL,
	"total_fees" integer DEFAULT 0 NOT NULL,
	"total_skipped" integer DEFAULT 0 NOT NULL,
	"total_errors" integer DEFAULT 0 NOT NULL,
	"started_by" text,
	"committed_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "student_credit_applications" (
	"id" text PRIMARY KEY NOT NULL,
	"credit_lot_id" text NOT NULL,
	"fee_id" text NOT NULL,
	"installment_id" text NOT NULL,
	"payment_allocation_id" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" text NOT NULL,
	"applied_by" text,
	"reversed_at" timestamp,
	"reversal_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "credit_application_amount_positive" CHECK ("student_credit_applications"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "student_credit_lots" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"source_payment_id" text NOT NULL,
	"original_amount" numeric(10, 2) NOT NULL,
	"remaining_amount" numeric(10, 2) NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "credit_lot_original_positive" CHECK ("student_credit_lots"."original_amount" > 0),
	CONSTRAINT "credit_lot_remaining_nonneg" CHECK ("student_credit_lots"."remaining_amount" >= 0),
	CONSTRAINT "credit_lot_remaining_within" CHECK ("student_credit_lots"."remaining_amount" <= "student_credit_lots"."original_amount")
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "check_bank" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "settled_date" date;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "status_changed_at" timestamp;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "bounced_reason" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "void_reason" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "voided_at" timestamp;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "voided_by" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "idempotency_hash" text;--> statement-breakpoint
UPDATE "payments" SET "settled_date" = "payment_date" WHERE "status" = 'completed' AND "settled_date" IS NULL;--> statement-breakpoint
UPDATE "payments" SET "status_changed_at" = COALESCE("updated_at", "created_at", NOW()) WHERE "status_changed_at" IS NULL;--> statement-breakpoint
ALTER TABLE "financial_audit_logs" ADD CONSTRAINT "financial_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_notification_deliveries" ADD CONSTRAINT "financial_notification_deliveries_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rollover_run_items" ADD CONSTRAINT "rollover_run_items_rollover_run_id_rollover_runs_id_fk" FOREIGN KEY ("rollover_run_id") REFERENCES "public"."rollover_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rollover_run_items" ADD CONSTRAINT "rollover_run_items_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rollover_run_items" ADD CONSTRAINT "rollover_run_items_fee_type_id_fee_types_id_fk" FOREIGN KEY ("fee_type_id") REFERENCES "public"."fee_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rollover_run_items" ADD CONSTRAINT "rollover_run_items_fee_id_fees_id_fk" FOREIGN KEY ("fee_id") REFERENCES "public"."fees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rollover_runs" ADD CONSTRAINT "rollover_runs_started_by_users_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_credit_applications" ADD CONSTRAINT "student_credit_applications_credit_lot_id_student_credit_lots_id_fk" FOREIGN KEY ("credit_lot_id") REFERENCES "public"."student_credit_lots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_credit_applications" ADD CONSTRAINT "student_credit_applications_fee_id_fees_id_fk" FOREIGN KEY ("fee_id") REFERENCES "public"."fees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_credit_applications" ADD CONSTRAINT "student_credit_applications_installment_id_fee_installments_id_fk" FOREIGN KEY ("installment_id") REFERENCES "public"."fee_installments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_credit_applications" ADD CONSTRAINT "student_credit_applications_payment_allocation_id_payment_allocations_id_fk" FOREIGN KEY ("payment_allocation_id") REFERENCES "public"."payment_allocations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_credit_applications" ADD CONSTRAINT "student_credit_applications_applied_by_users_id_fk" FOREIGN KEY ("applied_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_credit_lots" ADD CONSTRAINT "student_credit_lots_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_credit_lots" ADD CONSTRAINT "student_credit_lots_source_payment_id_payments_id_fk" FOREIGN KEY ("source_payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "financial_audit_entity_created_idx" ON "financial_audit_logs" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "financial_audit_actor_created_idx" ON "financial_audit_logs" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "financial_audit_action_created_idx" ON "financial_audit_logs" USING btree ("action","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "fin_notif_kind_student_business_unique" ON "financial_notification_deliveries" USING btree ("kind","student_id","business_date");--> statement-breakpoint
CREATE INDEX "fin_notif_kind_business_idx" ON "financial_notification_deliveries" USING btree ("kind","business_date");--> statement-breakpoint
CREATE INDEX "rollover_run_items_run_student_idx" ON "rollover_run_items" USING btree ("rollover_run_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rollover_runs_idempotency_unique" ON "rollover_runs" USING btree ("idempotency_key") WHERE "rollover_runs"."idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "rollover_runs_from_year_idx" ON "rollover_runs" USING btree ("from_year","to_year");--> statement-breakpoint
CREATE INDEX "credit_applications_credit_lot_idx" ON "student_credit_applications" USING btree ("credit_lot_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_lot_source_payment_unique" ON "student_credit_lots" USING btree ("source_payment_id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_voided_by_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chatbot_document_embeddings_hnsw_idx" ON "chatbot_document_embeddings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "payments_idempotency_key_unique" ON "payments" USING btree ("idempotency_key") WHERE "payments"."idempotency_key" IS NOT NULL;

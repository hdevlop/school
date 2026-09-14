CREATE TABLE "notification_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"notification_id" text NOT NULL,
	"push_subscription_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp DEFAULT now() NOT NULL,
	"leased_at" timestamp,
	"processed_at" timestamp,
	"last_error_code" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_deliveries_status_check" CHECK ("notification_deliveries"."status" IN ('pending','processing','sent','failed','skipped','dead')),
	CONSTRAINT "notification_deliveries_attempts_check" CHECK ("notification_deliveries"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"recipient_user_id" text NOT NULL,
	"source_key" text NOT NULL,
	"topic" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"href" text,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notifications_read_after_create_check" CHECK ("notifications"."read_at" IS NULL OR "notifications"."read_at" >= "notifications"."created_at")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint_hash" text NOT NULL,
	"endpoint_ciphertext" text NOT NULL,
	"p256dh_ciphertext" text NOT NULL,
	"auth_ciphertext" text NOT NULL,
	"endpoint_fingerprint" text NOT NULL,
	"user_agent_family" text,
	"disabled_at" timestamp,
	"last_success_at" timestamp,
	"last_failure_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_push_subscription_id_push_subscriptions_id_fk" FOREIGN KEY ("push_subscription_id") REFERENCES "public"."push_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_deliveries_notification_target_unique" ON "notification_deliveries" USING btree ("notification_id","push_subscription_id");--> statement-breakpoint
CREATE INDEX "notification_deliveries_status_available_idx" ON "notification_deliveries" USING btree ("status","available_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_source_recipient_unique" ON "notifications" USING btree ("source_key","recipient_user_id");--> statement-breakpoint
CREATE INDEX "notifications_recipient_unread_created_idx" ON "notifications" USING btree ("recipient_user_id","read_at","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_hash_unique" ON "push_subscriptions" USING btree ("endpoint_hash");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_disabled_idx" ON "push_subscriptions" USING btree ("user_id","disabled_at");
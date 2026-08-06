ALTER TABLE "ai_settings" ADD COLUMN IF NOT EXISTS "api_key_encrypted" text;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"session_key" text NOT NULL,
	"user_id" text,
	"channel" text DEFAULT 'web' NOT NULL,
	"messages" jsonb NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "chat_sessions_session_key_unique" UNIQUE("session_key")
);

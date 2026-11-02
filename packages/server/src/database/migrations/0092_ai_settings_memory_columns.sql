-- najm-chatbot's ai_settings has three memory columns that the schema snapshots
-- have listed since 0015, but no migration ever created: a database built from
-- the migrations alone (a new installation, or a backup restore, which rebuilds
-- the schema from them) did not have them. Databases that got them from a
-- schema push keep their values.
--
-- Additive and idempotent: an existing column is left alone.
ALTER TABLE "ai_settings" ADD COLUMN IF NOT EXISTS "use_memory" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_settings" ADD COLUMN IF NOT EXISTS "max_stored_messages" integer DEFAULT 100;--> statement-breakpoint
ALTER TABLE "ai_settings" ADD COLUMN IF NOT EXISTS "max_prompt_messages" integer DEFAULT 10;

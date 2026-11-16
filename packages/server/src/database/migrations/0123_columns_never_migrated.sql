-- Columns the schema snapshots have listed for a long time that no migration
-- ever created: databases that had them got them from db:push. A database
-- built by migrations alone lacked them, and najm-rag 3.4.0 reads source_file
-- on every semantics query, so the RAG studio and boot phrase seeding failed.
ALTER TABLE "chatbot_tool_semantics" ADD COLUMN IF NOT EXISTS "source_file" text;--> statement-breakpoint
ALTER TABLE "chatbot_routing_settings" ADD COLUMN IF NOT EXISTS "allowed_langs" jsonb;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "title" text;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "message_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "last_message_at" timestamp;

ALTER TABLE "chatbot_tool_semantics" ADD COLUMN IF NOT EXISTS "fingerprint" text;--> statement-breakpoint
ALTER TABLE "chatbot_unmatched_queries" ADD COLUMN IF NOT EXISTS "nearest_tool" text;
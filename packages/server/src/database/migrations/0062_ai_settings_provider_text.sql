-- Migration 0009 used a fixed enum; najm-chatbot now owns provider validation
-- and declares this column as text. Preserve all provider values and secrets.
ALTER TABLE "ai_settings" ALTER COLUMN "provider" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "ai_settings" ALTER COLUMN "provider" TYPE text USING "provider"::text;--> statement-breakpoint
ALTER TABLE "ai_settings" ALTER COLUMN "provider" SET DEFAULT 'ollama';

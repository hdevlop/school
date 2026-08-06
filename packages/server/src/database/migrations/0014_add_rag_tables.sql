CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "chatbot_tool_embeddings" (
  "id" text PRIMARY KEY NOT NULL,
  "tool_name" text NOT NULL,
  "description" text NOT NULL,
  "group" text,
  "local_name" text,
  "arg_names" text[],
  "annotations" jsonb,
  "fingerprint" text NOT NULL,
  "embedding" vector(768),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "chatbot_tool_embeddings_tool_name_unique" UNIQUE("tool_name")
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "chatbot_tool_semantics" (
  "id" text PRIMARY KEY NOT NULL,
  "tool_name" text NOT NULL,
  "phrase" text NOT NULL,
  "lang" text DEFAULT 'und' NOT NULL,
  "source" text,
  "embedding" vector(768),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "semantics_tool_phrase_lang_idx"
  ON "chatbot_tool_semantics" ("tool_name", "phrase", "lang");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "chatbot_routing_settings" (
  "id" text PRIMARY KEY NOT NULL,
  "enable_knowledge" boolean DEFAULT true NOT NULL,
  "max_tools" integer,
  "top_semantic_hits" integer,
  "similarity_threshold" text,
  "fallback_on_router_error" varchar,
  "fallback_on_no_match" varchar,
  "dependencies" jsonb,
  "dangerous_intent_keywords" jsonb,
  "tools_override" varchar,
  "context_override" varchar,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "chatbot_document_sources" (
  "id" text PRIMARY KEY NOT NULL,
  "namespace" text DEFAULT 'rag' NOT NULL,
  "source_type" varchar NOT NULL,
  "original_path" text NOT NULL,
  "ext" text DEFAULT '' NOT NULL,
  "mime" text DEFAULT '' NOT NULL,
  "status" varchar DEFAULT 'pending' NOT NULL,
  "error" text,
  "ingested_at" timestamp,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "chatbot_document_chunks" (
  "id" text PRIMARY KEY NOT NULL,
  "document_id" text NOT NULL,
  "ordinal" integer NOT NULL,
  "page" integer,
  "text" text NOT NULL,
  "tokens" integer DEFAULT 0 NOT NULL,
  "enabled" text DEFAULT 'true' NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "chatbot_document_embeddings" (
  "id" text PRIMARY KEY NOT NULL,
  "chunk_id" text NOT NULL,
  "embedding" vector(768),
  "model" text DEFAULT '' NOT NULL,
  "dimensions" integer DEFAULT 768 NOT NULL,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "chatbot_document_embeddings_chunk_id_unique" UNIQUE("chunk_id")
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "chatbot_studio_audit_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "action" text NOT NULL,
  "user_id" text,
  "details" text DEFAULT '' NOT NULL,
  "created_at" timestamp DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "chatbot_unmatched_queries" (
  "id" text PRIMARY KEY NOT NULL,
  "query" text NOT NULL,
  "normalized" text NOT NULL,
  "score" text NOT NULL,
  "threshold" text NOT NULL,
  "source" text DEFAULT 'router' NOT NULL,
  "occurrence_count" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "chatbot_unmatched_queries_normalized_unique" UNIQUE("normalized")
);

import type { NajmPlugin } from 'najm-core';
import { rag, ragStudio } from 'najm-rag';

import { rewriteDarijaForRouting } from '../modules/chat/darijaRouting';
import { envChoice, envFlag, envInt, envString } from './env';

/**
 * Embeddings for chat tool routing and the knowledge base.
 *
 *   RAG_EMBEDDING_PROVIDER              ollama | openai-compatible (default ollama)
 *   RAG_EMBEDDING_MODEL                 default embeddinggemma
 *   RAG_EMBEDDING_BASE_URL              default per provider, below
 *   RAG_EMBEDDING_API_KEY
 *   RAG_EMBEDDING_DIMENSIONS            default 768
 *   RAG_EMBEDDING_TRUNCATE_DIMENSIONS   true to cut longer vectors to DIMENSIONS
 *   RAG_EMBEDDING_BATCH_SIZE            default 4
 *   RAG_EMBEDDING_TIMEOUT_MS            indexing, default 60000
 *   RAG_EMBEDDING_QUERY_TIMEOUT_MS      one chat question, default 5000
 *   RAG_EMBEDDING_QUERY_COOLDOWN_MS     skip the provider after a failure, default 30000
 *   RAG_EMBEDDING_QUERY_PREFIX          default per provider and model, below;
 *   RAG_EMBEDDING_DOCUMENT_PREFIX       set to an empty value for none
 */

const EMBEDDING_PROVIDERS = ['ollama', 'openai-compatible'] as const;
type EmbeddingProvider = (typeof EMBEDDING_PROVIDERS)[number];

interface EmbeddingDefaults {
  queryPrefix: string;
  documentPrefix: string;
}

const PROVIDER_DEFAULTS: Record<EmbeddingProvider, EmbeddingDefaults & { baseUrl: string }> = {
  ollama: {
    baseUrl: 'http://127.0.0.1:11434',
    queryPrefix: '',
    documentPrefix: '',
  },
  'openai-compatible': {
    baseUrl: 'http://127.0.0.1:18080/v1',
    queryPrefix: 'task: search result | query: ',
    documentPrefix: 'title: none | text: ',
  },
};

// A model's own prompt format wins over its provider's.
const MODEL_DEFAULTS: Record<string, EmbeddingDefaults> = {
  'qwen3-embedding': {
    queryPrefix:
      'Instruct: Retrieve the school management tool that fulfills the user request.\nQuery: ',
    documentPrefix: '',
  },
};

// A named student is found with search. The full student list is not a
// dependency: when search found nothing, the model read all of it (112k
// characters, about 50k tokens) looking for the name. Class-wide work still
// reaches section and class student tools through routing.
const TOOL_DEPENDENCIES: Record<string, string[]> = {
  attendance_mark: ['search_search_students'],
  grades_get_student_report: ['search_search_students'],
  grades_get_by_student: ['search_search_students'],
  grades_create: ['search_search_students', 'assessments_get_all'],
  attendance_get_by_student: ['search_search_students'],
  // "Yesterday" or "last Monday" routes like "today"; the date tool answers it.
  attendance_get_today_students: ['attendance_get_by_date'],
  attendance_get_today_all: ['attendance_get_by_date'],
  // Darija class-list queries may route to sections; the guarded list template
  // needs the class read, which includes its sections, available on that path.
  sections_get_sections: ['classes_get_classes'],
  fees_get_student_fees: ['search_search_students'],
  payments_get_by_student: ['search_search_students'],
  students_get_student_parents: ['search_search_students'],
  'student-routes_get_by_student': ['search_search_students'],
  'student-profile_get_transport': ['search_search_students'],
};

function resolveEmbeddingConfig() {
  const provider = envChoice(
    'RAG_EMBEDDING_PROVIDER',
    process.env.RAG_EMBEDDING_PROVIDER,
    EMBEDDING_PROVIDERS,
    'ollama',
  );
  const model = envString(process.env.RAG_EMBEDDING_MODEL) ?? 'embeddinggemma';
  const defaults = { ...PROVIDER_DEFAULTS[provider], ...MODEL_DEFAULTS[model] };

  return {
    provider,
    model,
    baseUrl: envString(process.env.RAG_EMBEDDING_BASE_URL) ?? defaults.baseUrl,
    apiKey: process.env.RAG_EMBEDDING_API_KEY,
    dimensions: envInt('RAG_EMBEDDING_DIMENSIONS', process.env.RAG_EMBEDDING_DIMENSIONS, {
      fallback: 768,
      min: 1,
    }),
    truncateDimensions: envFlag(process.env.RAG_EMBEDDING_TRUNCATE_DIMENSIONS),
    batchSize: envInt('RAG_EMBEDDING_BATCH_SIZE', process.env.RAG_EMBEDDING_BATCH_SIZE, {
      fallback: 4,
      min: 1,
    }),
    // Indexing batches take up to ~15 s on a CPU model; a chat question takes
    // 0.1-2 s. Questions get their own bound, and after a timeout or refused
    // connection skip the provider for a while instead of each waiting again.
    timeoutMs: envInt('RAG_EMBEDDING_TIMEOUT_MS', process.env.RAG_EMBEDDING_TIMEOUT_MS, {
      fallback: 60_000,
      min: 1,
    }),
    queryTimeoutMs: envInt(
      'RAG_EMBEDDING_QUERY_TIMEOUT_MS',
      process.env.RAG_EMBEDDING_QUERY_TIMEOUT_MS,
      { fallback: 5_000, min: 1 },
    ),
    queryFailureCooldownMs: envInt(
      'RAG_EMBEDDING_QUERY_COOLDOWN_MS',
      process.env.RAG_EMBEDDING_QUERY_COOLDOWN_MS,
      { fallback: 30_000 },
    ),
    // Read raw: an empty prefix is a deliberate setting, not "unset".
    queryPrefix: process.env.RAG_EMBEDDING_QUERY_PREFIX ?? defaults.queryPrefix,
    documentPrefix: process.env.RAG_EMBEDDING_DOCUMENT_PREFIX ?? defaults.documentPrefix,
  };
}

export const ragConfig = (): NajmPlugin =>
  rag({
    dialect: 'pg',
    embedding: resolveEmbeddingConfig(),
    toolRouting: {
      enabled: true,
      // When routing fails, answer without tools and say the data is
      // unreachable (najm-chatbot's notice) rather than send all ~430 tools,
      // about 51k tokens on every step.
      fallbackOnRouterError: 'none',
      dependencies: TOOL_DEPENDENCIES,
    },
    // Darija words become MSA before tool routing embeds a message; the model
    // still reads the user's own words.
    rewriteRoutingQuery: rewriteDarijaForRouting,
    knowledge: true,
    allowedLangs: ['en', 'fr', 'ar', 'es'],
  }) as unknown as NajmPlugin;

// najm-rag 2.1.2 makes the Studio Assistant opt-in; School registers studioAssistant().
export const ragStudioConfig = () => ragStudio({ auth: 'standalone', assistant: true });

import { env, type EmbeddingProvider } from '../../../env';

/**
 * The embedding provider used by chat tool routing and the knowledge base:
 * `env.rag.embedding` plus School's per-provider and per-model defaults.
 * Everything that calls the provider resolves it here, so the two never
 * disagree on where it is.
 */

const PROVIDER_BASE_URLS: Record<EmbeddingProvider, string> = {
  ollama: 'http://127.0.0.1:11434',
  'openai-compatible': 'http://127.0.0.1:18080/v1',
};

const PROVIDER_EMBED_PATHS: Record<EmbeddingProvider, string> = {
  ollama: '/api/embed',
  'openai-compatible': '/embeddings',
};

interface EmbeddingModelPreset {
  queryPrefix: string;
  documentPrefix: string;
  /** Tool routing threshold for this model; unset keeps najm-rag's. */
  similarityThreshold?: number;
}

// Prompts for models najm-rag has no preset for. EmbeddingGemma is left out on
// purpose: with neither prefix set, najm-rag applies its retrieval prompts and
// the 0.35 threshold measured with them. Setting a prefix, even to '', keeps
// the 0.45 default threshold, which is too strict for prompted scores.
const MODEL_PRESETS: Record<string, EmbeddingModelPreset> = {
  'qwen3-embedding': {
    queryPrefix:
      'Instruct: Retrieve the school management tool that fulfills the user request.\nQuery: ',
    documentPrefix: '',
    // Qwen scores unrelated tools around 0.6-0.7; najm-rag's 0.45 default
    // offered tools to every greeting. See docs/chat-routing/measurements.md.
    similarityThreshold: 0.68,
  },
};

/** najm-rag's `embedding` option. */
export function resolveEmbedding() {
  const settings = env.rag.embedding;
  const provider = settings.provider;
  const model = settings.model;
  const preset: Partial<EmbeddingModelPreset> = MODEL_PRESETS[model] ?? {};
  return {
    provider,
    model,
    baseUrl: settings.baseUrl ?? PROVIDER_BASE_URLS[provider],
    apiKey: settings.apiKey,
    dimensions: settings.dimensions,
    truncateDimensions: settings.truncateDimensions,
    batchSize: settings.batchSize,
    timeoutMs: settings.timeoutMs,
    queryTimeoutMs: settings.queryTimeoutMs,
    queryFailureCooldownMs: settings.queryFailureCooldownMs,
    // An empty prefix is a deliberate setting, not "unset".
    queryPrefix: settings.queryPrefix ?? preset.queryPrefix,
    documentPrefix: settings.documentPrefix ?? preset.documentPrefix,
  };
}

/** The tool routing threshold measured for the configured model, or undefined for najm-rag's. */
export function embeddingSimilarityThreshold() {
  return MODEL_PRESETS[env.rag.embedding.model]?.similarityThreshold;
}

/** The URL one embedding request is posted to. */
export function embeddingEndpoint() {
  const provider = env.rag.embedding.provider;
  const base = (env.rag.embedding.baseUrl ?? PROVIDER_BASE_URLS[provider]).replace(/\/+$/u, '');
  return base + PROVIDER_EMBED_PATHS[provider];
}

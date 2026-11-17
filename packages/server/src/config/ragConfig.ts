import type { NajmPlugin } from 'najm-core';
import { rag, ragStudio } from 'najm-rag';

import { env } from '../env';
import { embeddingSimilarityThreshold, resolveEmbedding } from '../modules/chat/routing/embedding';
import { rewriteDarijaForRouting } from '../modules/chat/routing/darijaRouting';
import { ROUTING_TEXT_VERSION, schoolRoutingContext } from '../modules/chat/routing/schoolRoutingContext';
import { seedSemantics } from '../modules/chat/routing/seedSemantics';
import { TOOL_DEPENDENCIES } from '../modules/chat/routing/toolDependencies';
import { JEV_RERANK_THRESHOLDS, schoolJevToolReranker } from '../modules/chat/jev/JevToolReranker';

/**
 * Chat tool routing and the knowledge base. The embedding provider is
 * `env.rag.embedding` (modules/chat/routing/embedding.ts); the measurements
 * behind each number are in docs/chat-routing/measurements.md.
 */
export const ragConfig = (): NajmPlugin =>
  rag({
    dialect: 'pg',
    embedding: resolveEmbedding(),
    toolRouting: {
      enabled: true,
      similarityThreshold: embeddingSimilarityThreshold(),
      // When routing fails, answer without tools and say the data is
      // unreachable (najm-chatbot's notice) rather than send all ~430 tools,
      // about 51k tokens on every step.
      fallbackOnRouterError: 'none',
      dependencies: TOOL_DEPENDENCIES,
    },
    // Darija words become MSA before a message is embedded; the model still
    // reads the user's own words. Stored phrases get the same rewrite, hints
    // included, so phrase and message stay comparable.
    rewriteRoutingQuery: query => schoolRoutingContext(query, rewriteDarijaForRouting(query)),
    // A changed rewrite marks every stored phrase stale for "Reindex semantics".
    routingTextVersion: ROUTING_TEXT_VERSION,
    // School's routing phrases (semantics.json and routing/semantics/): those
    // not stored yet are added after boot tool indexing; studio edits stay.
    // Edit the files to change one for good.
    seedSemantics,
    // Jev picks among the router's tools when CHATBOT_JEV_RERANK is on.
    rerankTools: env.chat.jevRerank ? { rerank: schoolJevToolReranker, ...JEV_RERANK_THRESHOLDS } : undefined,
    knowledge: true,
    allowedLangs: ['en', 'fr', 'ar', 'es'],
  }) as unknown as NajmPlugin;

// najm-rag 2.1.2 makes the Studio Assistant opt-in; School registers studioAssistant().
// The dashboard's /rag-studio page sends the signed-in admin's own token.
export const ragStudioConfig = () => ragStudio({ auth: 'session', assistant: true });

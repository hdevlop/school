import { plugin } from 'najm-core';
import { chatbot, CHATBOT_CONTEXT_PROVIDER } from 'najm-chatbot';
import { studioAssistant } from 'najm-chatbot/studio-assistant';

import { chatDiagnosticsLog } from '../modules/chat/ChatDiagnosticsLog';
import { SchoolChatContextProvider } from '../modules/chat/SchoolChatContextProvider';
import { chatbotSystemPrompt } from './chatbotSystemPrompt';

/** The dashboard's read-only chat. Tool routing and embeddings are in ragConfig. */
export const chatbotConfig = () =>
  chatbot({
    dialect: 'pg',
    defaultSystemPrompt: chatbotSystemPrompt,
    maxSteps: 10,
    // Ends an answer whose provider stream goes silent. It also runs while a
    // tool executes; School's tools are database reads well under this.
    streamTimeout: { chunkMs: 30_000 },
    conversationStore: 'db',
    // The interaction log table would store questions and tool arguments, and
    // School has set no retention rule for them, so it stays off. Diagnostics
    // carry timings, outcomes and embedding cache/attempt spans only;
    // see /api/chat-diagnostics. RAG's request-scoped bridge correlates them.
    chatLogging: { enabled: false, onDiagnostics: chatDiagnosticsLog.record },
  });

/** Gives each chat the selected academic year and today's date. */
export const chatYearContextConfig = () =>
  plugin('school-chat-year-context')
    .requires('rag', 'chatbot')
    .services(SchoolChatContextProvider)
    .alias(CHATBOT_CONTEXT_PROVIDER, SchoolChatContextProvider)
    .build();

export const studioAssistantConfig = () => studioAssistant();

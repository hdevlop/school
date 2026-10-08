import { plugin } from 'najm-core';
import { chatbot, CHATBOT_CONTEXT_PROVIDER } from 'najm-chatbot';
import { studioAssistant } from 'najm-chatbot/studio-assistant';

import { chatDiagnosticsLog } from '../modules/chat/ChatDiagnosticsLog';
import { SchoolChatContextProvider, schoolChatYearContext } from '../modules/chat/SchoolChatContextProvider';
import { schoolReplyTemplate } from '../modules/chat/schoolReplyTemplates';
import { schoolReplyLanguage } from '../modules/chat/schoolReplyLanguage';
import { chatbotSystemPrompt } from './chatbotSystemPrompt';
import { jevPreparationPolicy } from '../modules/chat/jevPreparationPolicy';
import { schoolOpenRouterProvider } from '../modules/chat/jevExperiment';

/** The dashboard's read-only chat. Tool routing and embeddings are in ragConfig. */
export const chatbotConfig = () =>
  chatbot({
    dialect: 'pg',
    defaultSystemPrompt: chatbotSystemPrompt,
    reply: {
      detectLanguage: schoolReplyLanguage,
      template: request => schoolReplyTemplate(request, schoolChatYearContext.getStore()?.academicYear, schoolChatYearContext.getStore()?.role,
        schoolChatYearContext.getStore()?.schoolDate),
      preparation: jevPreparationPolicy(),
    },
    maxSteps: 10,
    // Ends an answer whose provider stream goes silent. It also runs while a
    // tool executes; School's tools are database reads well under this.
    streamTimeout: { chunkMs: 30_000 },
    // Applies only while the AI settings provider is OpenRouter. Cerebras
    // served gpt-oss-120b in 0.9 s p50 against 8.2 s on OpenRouter's cheapest
    // hosts (docs/evidence/chatbot-latency/cerebras-tool-prefix-20261004.md).
    // Fallbacks keep the chat up when Cerebras is not; Groq is excluded.
    openrouter: {
      get provider() { return schoolOpenRouterProvider(); },
      reasoning: { effort: 'low' },
    },
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

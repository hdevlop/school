import { plugin } from 'najm-core';
import { chatbot, CHATBOT_CONTEXT_PROVIDER } from 'najm-chatbot';
import { studioAssistant } from 'najm-chatbot/studio-assistant';

import { chatDiagnosticsLog } from '../modules/chat/diagnostics/ChatDiagnosticsLog';
import { SchoolChatContextProvider, schoolChatYearContext } from '../modules/chat/context/SchoolChatContextProvider';
import { schoolReplyTemplate } from '../modules/chat/replies/schoolReplyTemplates';
import { schoolReplyLanguage } from '../modules/chat/replies/schoolReplyLanguage';
import { chatbotSystemPrompt } from './chatbotSystemPrompt';
import { jevPreparationPolicy } from '../modules/chat/jev/jevPreparationPolicy';
import { schoolOpenRouterProvider } from '../modules/chat/routing/schoolOpenRouterProvider';

/** The dashboard's read-only chat. Tool routing and embeddings are in ragConfig. */
export const chatbotConfig = () =>
  chatbot({
    dialect: 'pg',
    defaultSystemPrompt: chatbotSystemPrompt,
    reply: {
      detectLanguage: schoolReplyLanguage,
      template: request => schoolReplyTemplate(request, schoolChatYearContext.getStore()?.academicYear, schoolChatYearContext.getStore()?.role,
        schoolChatYearContext.getStore()?.schoolDate, schoolChatYearContext.getStore()?.teacherId, schoolChatYearContext.getStore()?.studentId,
        schoolChatYearContext.getStore()?.children, schoolChatYearContext.getStore()?.studentName),
      preparation: jevPreparationPolicy(),
    },
    maxSteps: 10,
    // Ends an answer whose provider stream goes silent. It also runs while a
    // tool executes; School's tools are database reads well under this.
    streamTimeout: { chunkMs: 30_000 },
    // Qualified release pins OSS20B to CoreWeave; the legacy provider policy
    // remains available through the explicit rollback switch.
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

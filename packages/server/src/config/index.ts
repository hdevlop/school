/**
 * School's server: `server.ts` passes School's options to najm-api's preset,
 * which registers the common Najm plugins in order with their shared policy,
 * then adds School's own plugins (theme, rag, chatbot). The files here hold
 * only School policy. Environment variables are read in `src/env.ts` only.
 */
export { schoolServer, schoolServerOptions } from './server';
export { authConfig } from './authConfig';
export { chatbotConfig, chatRequestConfig, studioAssistantConfig } from './chatbotConfig';
export { emailConfig } from './emailConfig';
export { ragConfig, ragStudioConfig } from './ragConfig';
export { themeConfig } from './themeConfig';

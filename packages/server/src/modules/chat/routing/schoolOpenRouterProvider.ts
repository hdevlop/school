import { readSchoolChatControls } from '../transport/schoolChatControls';

/** Qualified OSS20B release provider; legacy remains an explicit rollback. */
export function schoolOpenRouterProvider() {
  return readSchoolChatControls().enabled
    ? { only: ['coreweave'], allow_fallbacks: false, require_parameters: true }
    : { order: ['cerebras'], allow_fallbacks: true, ignore: ['groq'] };
}

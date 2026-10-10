import { readSchoolChatControls } from '../transport/schoolChatControls';

/** Shared by model configuration and the request transport. */
export function schoolOss20bProvider() {
  return { only: ['coreweave'], allow_fallbacks: false, require_parameters: true };
}

/** Qualified OSS20B release provider; legacy remains an explicit rollback. */
export function schoolOpenRouterProvider() {
  return readSchoolChatControls().enabled
    ? schoolOss20bProvider()
    : { order: ['cerebras'], allow_fallbacks: true, ignore: ['groq'] };
}

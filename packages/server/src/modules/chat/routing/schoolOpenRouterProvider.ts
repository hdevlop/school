import { jevExperimentArm } from '../benchmark/jevExperiment';
import { readSchoolChatControls } from '../transport/schoolChatControls';

/** Evaluated while building the request's model, from a consumed server grant. */
export function schoolOpenRouterProvider() {
  if (readSchoolChatControls().enabled) return { only: ['coreweave'], allow_fallbacks: false, require_parameters: true };
  const arm = jevExperimentArm();
  return arm && arm !== '120b-baseline'
    ? { only: ['coreweave'], allow_fallbacks: false, require_parameters: true }
    : { order: ['cerebras'], allow_fallbacks: true, ignore: ['groq'] };
}

import type { ReplyPreparationPolicy } from 'najm-chatbot';
import { effectiveJevMode, readJevControls } from './JevControls';
import { schoolJevRequestContext } from './JevSessionGrants';
import { jevExperimentArm } from './jevExperiment';
import { readSchoolChatControls } from './schoolChatControls';

/** No promise cast or second tool executor: this is the published async contract. */
export function jevPreparationPolicy(): ReplyPreparationPolicy {
  const controls = readJevControls();
  return {
    // The published preparation contract gives synchronous local templates
    // precedence over routing. Enabling that contract does not enable Jev:
    // eligibility and transport remain gated by the server frame and mode.
    enabled: true,
    get strategy() {
      if (schoolJevRequestContext.getStore()?.source === 'ordinary') return 'candidate-first';
      const arm = jevExperimentArm();
      return arm === '20b-coreweave-router-first' ? 'router-first'
        : arm === '20b-coreweave-first' ? 'candidate-first' : 'parallel';
    },
    get timeoutMs() { return schoolJevRequestContext.getStore()?.source === 'ordinary' ? readSchoolChatControls().timeoutMs : controls.timeoutMs; },
    resolveContext: request => {
      const frame = schoolJevRequestContext.getStore();
      return frame?.actorId === request.userId
        ? { historyComplete: frame.historyComplete, priorUserTurns: frame.priorUserTurns }
        : { historyComplete: false, priorUserTurns: null };
    },
    eligible: request => effectiveJevMode() !== 'off' && schoolJevRequestContext.getStore()?.eligible?.(request) === true,
    prepare: request => schoolJevRequestContext.getStore()?.prepare?.(request) ?? Promise.resolve(null),
    onSelection: event => schoolJevRequestContext.getStore()?.onSelection?.(event),
  };
}

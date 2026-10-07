import type { ReplyPreparationPolicy } from 'najm-chatbot';
import { effectiveJevMode, readJevControls } from './JevControls';
import { schoolJevRequestContext } from './JevSessionGrants';
import { jevExperimentArm } from './jevExperiment';

/** No promise cast or second tool executor: this is the published async contract. */
export function jevPreparationPolicy(): ReplyPreparationPolicy {
  const controls = readJevControls();
  return {
    get enabled() { return effectiveJevMode() !== 'off'; },
    get strategy() { return jevExperimentArm() === '20b-coreweave-first' ? 'candidate-first' : 'parallel'; },
    timeoutMs: controls.timeoutMs,
    resolveContext: request => {
      const frame = schoolJevRequestContext.getStore();
      return frame?.actorId === request.userId
        ? { historyComplete: frame.historyComplete, priorUserTurns: frame.priorUserTurns }
        : { historyComplete: false, priorUserTurns: null };
    },
    eligible: request => schoolJevRequestContext.getStore()?.eligible?.(request) === true,
    prepare: request => schoolJevRequestContext.getStore()?.prepare?.(request) ?? Promise.resolve(null),
    onSelection: event => schoolJevRequestContext.getStore()?.onSelection?.(event),
  };
}

import type { ReplyPreparationPolicy } from 'najm-chatbot';
import { effectiveJevMode } from './JevControls';
import { schoolJevRequestContext } from './JevRequestContext';
import { readSchoolChatControls } from '../transport/schoolChatControls';

/** Published preparation contract: local replies, guarded Jev, then ordinary routing. */
export function jevPreparationPolicy(): ReplyPreparationPolicy {
  return {
    enabled: true,
    strategy: 'candidate-first',
    get timeoutMs() { return readSchoolChatControls().timeoutMs; },
    resolveContext: request => {
      const frame = schoolJevRequestContext.getStore();
      return frame?.actorId === request.userId
        ? { historyComplete: frame.historyComplete, priorUserTurns: frame.priorUserTurns }
        : { historyComplete: false, priorUserTurns: null };
    },
    eligible: request => effectiveJevMode() !== 'off' && schoolJevRequestContext.getStore()?.eligible?.(request) === true,
    prepare: request => schoolJevRequestContext.getStore()?.prepare?.(request) ?? Promise.resolve(null),
  };
}

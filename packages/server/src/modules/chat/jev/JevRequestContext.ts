import { AsyncLocalStorage } from 'node:async_hooks';
import type { ReplyPreparationRequest, ReplyTemplate, ReplyPreparationPolicy } from 'najm-chatbot';
import { effectiveJevMode, readSchoolChatControls, type JevMode } from '../transport/schoolChatControls';

/** Fixed codes only; no question, tool arguments, credentials or record identifiers. */
export interface JevRequestDiagnostics {
  eligibility: 'ineligible_metadata' | 'unsupported_query' | 'supported_query';
  classification: 'not_started' | 'pending' | 'candidate' | 'declined' | 'error' | 'aborted';
}

export interface JevRequestContext {
  actorId: string; academicYear: string; mode: JevMode;
  correlationId: string | null; query: string;
  historyComplete: boolean; priorUserTurns: number | null;
  /** Actual HTTP lifetime, separate from the framework's candidate selection signal. */
  requestSignal?: AbortSignal;
  prepare?: (request: ReplyPreparationRequest) => Promise<ReplyTemplate | null>;
  eligible?: (request: ReplyPreparationRequest) => boolean;
  diagnostics?: JevRequestDiagnostics;
}
export const schoolJevRequestContext = new AsyncLocalStorage<JevRequestContext>();

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

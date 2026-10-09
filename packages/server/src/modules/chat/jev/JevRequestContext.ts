import { AsyncLocalStorage } from 'node:async_hooks';
import type { ReplyPreparationRequest, ReplyTemplate } from 'najm-chatbot';
import type { JevMode } from './JevControls';

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

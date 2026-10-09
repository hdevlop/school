import { AsyncLocalStorage } from 'node:async_hooks';
import type { ReplyPreparationRequest, ReplyPreparationSelection, ReplyTemplate } from 'najm-chatbot';
import type { JevMode } from './JevControls';
import type { JevExperimentArm } from '../benchmark/jevExperiment';

/** Fixed codes only; no question, tool arguments, credentials or record identifiers. */
export interface JevRequestDiagnostics {
  eligibility: 'ineligible_metadata' | 'unsupported_query' | 'supported_query' | 'shadow_unfiltered';
  classification: 'not_started' | 'pending' | 'candidate' | 'declined' | 'error' | 'aborted';
}

export interface JevRequestContext {
  actorId: string; role: string; academicYear: string; mode: JevMode;
  correlationId: string | null; caseId: string; query: string;
  historyComplete: boolean; priorUserTurns: number | null;
  source?: 'ordinary';
  experimentArm?: JevExperimentArm;
  /** Actual HTTP lifetime, separate from the framework's candidate selection signal. */
  requestSignal?: AbortSignal;
  prepare?: (request: ReplyPreparationRequest) => Promise<ReplyTemplate | null>;
  eligible?: (request: ReplyPreparationRequest) => boolean;
  onSelection?: (event: ReplyPreparationSelection) => void;
  attemptId?: string;
  diagnostics?: JevRequestDiagnostics;
}
export const schoolJevRequestContext = new AsyncLocalStorage<JevRequestContext>();

import type { ChatDiagnostics } from 'najm-chatbot';
import { chatBenchmarkControlsEnabled, chatBenchmarkSnapshot } from '../benchmark/ChatBenchmarkState';
import { schoolJevRequestContext, type JevRequestDiagnostics } from '../jev/JevRequestContext';
import { schoolToolFailures, type SchoolToolFailure } from './schoolToolFailures';
import { schoolPaidChatContext } from '../budget/SchoolPaidChatTransport';

export type SchoolChatDiagnostics = ChatDiagnostics & {
  benchmark?: ReturnType<typeof chatBenchmarkSnapshot>;
  jev?: JevRequestDiagnostics;
  toolFailures?: SchoolToolFailure[];
  paid?: { calls: number; unknownCosts: number; stopped?: string };
};

/**
 * The most recent chat diagnostics in this process, for the latency benchmark
 * and admins. A diagnostics record holds timings, counts, tool names and
 * outcomes, never the question, the answer or tool arguments, which is why
 * School keeps this instead of najm-chatbot's interaction log table.
 * Per process and lost on restart.
 */
export class ChatDiagnosticsLog {
  private entries: SchoolChatDiagnostics[] = [];

  constructor(private readonly capacity = 200) {}

  readonly record = (diagnostics: ChatDiagnostics): void => {
    const frame = schoolJevRequestContext.getStore();
    const entry: SchoolChatDiagnostics = frame?.correlationId && frame.diagnostics && frame.correlationId === diagnostics.correlationId
      ? { ...diagnostics, jev: { eligibility: frame.diagnostics.eligibility, classification: frame.diagnostics.classification } } : diagnostics;
    const failures = schoolToolFailures(diagnostics);
    // Only names from the actual MCP adapter are trusted metadata. A model
    // can invent a "tool name" containing private question text.
    const observedNames = new Set((diagnostics.tools ?? []).map(tool => tool.name));
    const steps = diagnostics.steps?.map(step => ({ ...step,
      toolCalls: step.toolCalls.map(name => observedNames.has(name) ? name : '[not-dispatched]') }));
    const paid = schoolPaidChatContext.getStore();
    const audited = { ...entry, ...(steps ? { steps } : {}), ...(failures.length ? { toolFailures: failures } : {}),
      ...(paid ? { paid: { calls: paid.calls, unknownCosts: paid.calls - paid.costs.filter(item => item.costUsd !== null).length,
        ...(paid.stopped ? { stopped: paid.stopped } : {}) } } : {}) };
    this.entries.push(chatBenchmarkControlsEnabled()
      ? { ...audited, benchmark: chatBenchmarkSnapshot() } : audited);
    if (this.entries.length > this.capacity) this.entries.shift();
  };

  /** Newest first. */
  recent(limit: number): SchoolChatDiagnostics[] {
    return this.entries.slice(-limit).reverse();
  }

  /** The newest record sent with this `x-request-id`, or null. */
  find(correlationId: string): SchoolChatDiagnostics | null {
    for (let index = this.entries.length - 1; index >= 0; index--) {
      if (this.entries[index]!.correlationId === correlationId) return this.entries[index]!;
    }
    return null;
  }

  clear(): void {
    this.entries = [];
  }
}

export const chatDiagnosticsLog = new ChatDiagnosticsLog();

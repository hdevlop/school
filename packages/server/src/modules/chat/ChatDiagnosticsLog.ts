import type { ChatDiagnostics } from 'najm-chatbot';
import { chatBenchmarkControlsEnabled, chatBenchmarkSnapshot } from './ChatBenchmarkState';
import { schoolJevRequestContext, type JevRequestDiagnostics } from './JevSessionGrants';

export type SchoolChatDiagnostics = ChatDiagnostics & {
  benchmark?: ReturnType<typeof chatBenchmarkSnapshot>;
  jev?: JevRequestDiagnostics;
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
    this.entries.push(chatBenchmarkControlsEnabled()
      ? { ...entry, benchmark: chatBenchmarkSnapshot() } : entry);
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

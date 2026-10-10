import type { ChatDiagnostics } from 'najm-chatbot';
import { schoolJevRequestContext, type JevRequestDiagnostics } from '../jev/JevRequestContext';
import { schoolToolFailures, type SchoolToolFailure } from './schoolToolFailures';

export type SchoolChatDiagnostics = Omit<ChatDiagnostics, 'usage' | 'cost' | 'steps' | 'replyPreparation'> & {
  steps: Omit<ChatDiagnostics['steps'][number], 'inputTokens' | 'outputTokens'>[];
  replyPreparation?: Omit<NonNullable<ChatDiagnostics['replyPreparation']>, 'externalCost'>;
  jev?: JevRequestDiagnostics;
  toolFailures?: SchoolToolFailure[];
};

/**
 * The most recent chat diagnostics in this process, for administrators. A diagnostics record holds timings, counts, tool names and
 * outcomes, never the question, the answer or tool arguments, which is why
 * School keeps this instead of najm-chatbot's interaction log table.
 * Per process and lost on restart.
 */
export class ChatDiagnosticsLog {
  private entries: SchoolChatDiagnostics[] = [];

  constructor(private readonly capacity = 200) {}

  readonly record = (diagnostics: ChatDiagnostics): void => {
    const { usage: _usage, cost: _cost, steps: rawSteps, replyPreparation, ...summary } = diagnostics;
    const frame = schoolJevRequestContext.getStore();
    const failures = schoolToolFailures(diagnostics);
    // Only names from the actual MCP adapter are trusted metadata. A model
    // can invent a "tool name" containing private question text.
    const observedNames = new Set((diagnostics.tools ?? []).map(tool => tool.name));
    const steps = rawSteps.map(({ inputTokens: _input, outputTokens: _output, ...step }) => ({ ...step,
      toolCalls: step.toolCalls.map(name => observedNames.has(name) ? name : '[not-dispatched]') }));
    let preparation: SchoolChatDiagnostics['replyPreparation'];
    if (replyPreparation) {
      const { externalCost: _externalCost, ...selection } = replyPreparation;
      preparation = selection;
    }
    const audited: SchoolChatDiagnostics = { ...summary, steps,
      ...(preparation ? { replyPreparation: preparation } : {}),
      ...(frame?.correlationId && frame.diagnostics && frame.correlationId === diagnostics.correlationId
        ? { jev: { eligibility: frame.diagnostics.eligibility, classification: frame.diagnostics.classification } } : {}),
      ...(failures.length ? { toolFailures: failures } : {}) };
    this.entries.push(audited);
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

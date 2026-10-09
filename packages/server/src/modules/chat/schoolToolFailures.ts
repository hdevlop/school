import type { ChatDiagnostics } from 'najm-chatbot';

export type SchoolToolFailureCode = 'not_dispatched' | 'tool_error' | 'write_blocked';
export interface SchoolToolFailure { step: number | null; code: SchoolToolFailureCode; count: number }

/** Preserve failed attempts even when a later step answers successfully.
 * No inputs, outputs, provider errors or invented tool names are retained.
 * not_dispatched means no matching completed MCP execution record, not a
 * guessed SDK validation reason. This also covers unknown/unoffered tools.
 */
export function schoolToolFailures(diagnostics: ChatDiagnostics): SchoolToolFailure[] {
  if (!Array.isArray(diagnostics.tools) || !Array.isArray(diagnostics.steps)) return [];
  const spans = diagnostics.tools.map(tool => ({ tool, used: false }));
  const failures: SchoolToolFailure[] = [];
  const add = (step: number | null, code: SchoolToolFailureCode) => {
    const prior = failures.find(failure => failure.step === step && failure.code === code);
    if (prior) prior.count++; else failures.push({ step, code, count: 1 });
  };
  diagnostics.steps.forEach((step, index) => {
    for (const name of step.toolCalls) {
      const span = spans.find(item => !item.used && item.tool.name === name
        // Published diagnostic timestamps are rounded to 0.1 ms.
        && item.tool.startMs + item.tool.durationMs <= step.endMs + 0.2);
      if (!span) { add(index, 'not_dispatched'); continue; }
      span.used = true;
      if (span.tool.outcome === 'error') add(index, 'tool_error');
      if (span.tool.outcome === 'blocked') add(index, 'write_blocked');
    }
  });
  // Templates and interrupted model turns can have tool records without a
  // finished model step. Keep their failures too, without inventing a step.
  for (const { tool, used } of spans) if (!used) {
    if (tool.outcome === 'error') add(null, 'tool_error');
    if (tool.outcome === 'blocked') add(null, 'write_blocked');
  }
  return failures;
}

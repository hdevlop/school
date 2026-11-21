import { withoutLeakedPlanning } from './schoolAnswerPlanning';
import { offeredToolName } from './schoolProviderResponse';

/**
 * One corrective retry for a successful OSS20B completion whose content cannot
 * be used: a call to a tool that was not offered, an answer that is only
 * planning or tool syntax, or a question asking the user for an ID that an
 * offered list tool returns. Measured with `bun run eval:chat` on 2026-11-21,
 * these were the remaining failures once the qualified flow was on: a named
 * student answered with an identity tool that routing did not offer (3 of 3
 * runs), and a class test asked the user for its exam ID after reading the
 * sections (3 of 3).
 *
 * The temperature is 0, so the same request would return the same completion:
 * the retry adds a correction to the system message. Provider failures (an
 * HTTP error, a broken stream) are never retried, and the model never changes.
 */

export type CompletionProblem =
  | { kind: 'unoffered_tool'; names: string[] }
  | { kind: 'planning_only' }
  | { kind: 'asks_for_id' };

const LEAKED_CALL = /to=functions\.|<\|(?:channel|call|message)\|>/u;
// An answer asking the user for an ID an offered list tool would return.
const ASKS_FOR_ID = /\b(?:ID|IDs|identifiant|identifier|identificador)\b|المعرف|المعرّف|رقم التعريف|الآيدي|l'?ID\b/iu;

interface Chunk { choices?: { index: number; delta?: { content?: string | null; tool_calls?: { index: number; function?: { name?: string } }[] } }[] }

/** Reads a buffered provider stream; null when it is not a completion this check understands. */
export function completionProblem(raw: string, offered: ReadonlySet<string>): CompletionProblem | null {
  const chunks: Chunk[] = [];
  for (const frame of raw.split(/\r?\n\r?\n/u)) {
    const data = frame.split(/\r?\n/u).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
    if (!data || data === '[DONE]') continue;
    try { chunks.push(JSON.parse(data)); } catch { /* comments keep their framing */ }
  }
  const names = new Map<string, string>();
  let answer = '';
  for (const chunk of chunks) for (const choice of chunk.choices ?? []) {
    for (const call of choice.delta?.tool_calls ?? []) {
      const key = `${choice.index}:${call.index}`;
      names.set(key, (names.get(key) ?? '') + (call.function?.name ?? ''));
    }
    if (typeof choice.delta?.content === 'string') answer += choice.delta.content;
  }
  if (names.size) {
    const unoffered = [...names.values()].filter(name => !offeredToolName(name, offered));
    return unoffered.length ? { kind: 'unoffered_tool', names: unoffered } : null;
  }
  if (!answer.trim() || LEAKED_CALL.test(answer) || 'planningOnly' in withoutLeakedPlanning(answer)) return { kind: 'planning_only' };
  if (offered.size && ASKS_FOR_ID.test(answer) && /[?؟]\s*$/u.test(answer.trim())) return { kind: 'asks_for_id' };
  return null;
}

/** The correction the retry adds to the system message. */
export function correctionNote(problem: CompletionProblem, offered: ReadonlySet<string>): string {
  const tools = [...offered].join(', ');
  switch (problem.kind) {
    case 'unoffered_tool':
      return `Correction: the previous attempt called ${problem.names.join(', ')}, which is not available in this turn. Call only these tools: ${tools}. A student, class or teacher the user names is read with them, not with an identity tool.`;
    case 'planning_only':
      return 'Correction: the previous attempt wrote planning or tool syntax as its answer. Call one of the offered tools through the tool interface, or answer the user directly in their language from the results you have.';
    case 'asks_for_id':
      return `Correction: the previous attempt asked the user for an ID. Never ask for an ID: find it with the offered list tools (${tools}) and continue to the requested read.`;
  }
}

/** The request body with the correction appended to its system message (or prepended as one). */
export function withCorrection(data: { messages?: { role: string; content?: unknown }[] }, note: string) {
  const messages = [...(data.messages ?? [])];
  const index = messages.findIndex(message => message.role === 'system' && typeof message.content === 'string');
  if (index >= 0) messages[index] = { ...messages[index]!, content: `${messages[index]!.content as string}\n\n${note}` };
  else messages.unshift({ role: 'system', content: note });
  return { ...data, messages };
}

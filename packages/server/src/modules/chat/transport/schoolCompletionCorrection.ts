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
 * Also a final answer given after an empty assessment list with no exam read:
 * many schools record every quiz as a class test (the demo has 222 exams and
 * no assessments), and OSS20B answered "no quiz in CM1 A" without opening the
 * class's exams although the prompt says to (2026-11-21). And a "none / not
 * yet" answer given from a class's exam list (which carries no marks) without
 * reading the exam's results: 4 of 39 eval answers the same day. And a mark
 * stated when the conversation read nothing ("Français : 8,5 / 10" for a
 * question routing gave no tool).
 *
 * The temperature is 0, so the same request would return the same completion:
 * the retry adds a correction to the system message. Provider failures (an
 * HTTP error, a broken stream) are never retried, and the model never changes.
 */

export type CompletionProblem =
  | { kind: 'unoffered_tool'; names: string[] }
  | { kind: 'planning_only' }
  | { kind: 'asks_for_id' }
  | { kind: 'empty_quiz_list' }
  | { kind: 'results_not_read' }
  | { kind: 'unread_mark' }
  | { kind: 'parent_account_detour' };

// An answer turning to the reader's parent account ("واش عندك حساب ديال ولي أمر").
const PARENT_ACCOUNT = /ولي\s*(?:ال)?[أا]مر|compte\s+(?:de\s+)?parent|parent\s+account/iu;

/**
 * The conversation already found a student by name, yet the answer asks about
 * the reader's parent account: "w chhal f HG" after "chhal jab jebara barae f
 * math" (2026-11-21). Identity tools come with every student read as
 * dependencies, which invites the detour.
 */
function parentAccountDetour(answer: string, request: CompletionRequest): boolean {
  if (!PARENT_ACCOUNT.test(answer)) return false;
  const messages = request.messages ?? [];
  const searches = new Set<string>();
  for (const message of messages) for (const call of message.tool_calls ?? [])
    if (call.id && call.function?.name === 'search_search_students') searches.add(call.id);
  return messages.some(message => message.role === 'tool' && searches.has(message.tool_call_id ?? '') && !isEmptyList(message.content));
}

// A mark written as "8,5 / 10" or "9.75/10"; a date such as 12/11/2026 is not one.
const MARK = /(?<![\d/])\d+(?:[.,]\d+)?\s*\/\s*\d+(?![\d/])/u;

/** A mark stated although nothing in the conversation was read: it can only be invented. */
function unreadMark(answer: string, request: CompletionRequest): boolean {
  const messages = request.messages ?? [];
  return messages.length > 0 && MARK.test(answer) && !messages.some(message => message.role === 'tool');
}

/** The OpenAI-compatible request the completion answered (its messages only). */
export interface CompletionRequest {
  messages?: { role: string; content?: unknown; tool_call_id?: string; tool_calls?: { id?: string; function?: { name?: string } }[] }[];
}

const QUIZ_LISTS = new Set(['assessments_get_by_section', 'assessments_get_today_assessments', 'assessments_get_all']);

/** "[]", or a wrapper whose only list is empty; text parts are read as their text. */
function isEmptyList(content: unknown): boolean {
  const text = typeof content === 'string' ? content
    : Array.isArray(content) ? content.map(part => (part && typeof part === 'object' && 'text' in part ? String(part.text) : '')).join('') : '';
  try {
    const value: unknown = JSON.parse(text);
    if (Array.isArray(value)) return value.length === 0;
    if (!value || typeof value !== 'object') return false;
    const lists = Object.values(value).filter(Array.isArray);
    return lists.length === 1 && lists[0]!.length === 0;
  } catch { return false; }
}

/** This turn's tool calls by ID, and its tool results with the name of the tool that returned each. */
function turnReads(request: CompletionRequest, offered: ReadonlySet<string>) {
  const messages = request.messages ?? [];
  const turn = messages.slice(messages.findLastIndex(message => message.role === 'user') + 1);
  const calls = new Map<string, string>();
  for (const message of turn) for (const call of message.tool_calls ?? []) {
    if (call.id && call.function?.name) calls.set(call.id, offeredToolName(call.function.name, offered) ?? call.function.name);
  }
  const results = turn.filter(message => message.role === 'tool')
    .map(message => ({ name: calls.get(message.tool_call_id ?? '') ?? '', content: message.content }));
  return { names: [...calls.values()], results };
}

/** This turn read an assessment list that came back empty and read no exams. */
function emptyQuizListWithoutExams(request: CompletionRequest, offered: ReadonlySet<string>): boolean {
  if (!offered.has('exams_get_by_section')) return false;
  const { names, results } = turnReads(request, offered);
  if (names.some(name => name.startsWith('exams_'))) return false;
  return results.some(result => QUIZ_LISTS.has(result.name) && isEmptyList(result.content));
}

// An answer saying there are no results, or none yet.
const SAYS_NONE = /ما\s*كاين(?:ش|اش|ينش)?|ما\s*كايناش|مازال\s*ما|لا\s*توجد|لا\s*يوجد|ليس(?:ت)?\s*هناك|لم\s*(?:يتم|تسجل|تُسجل)|\baucun(?:e|s)?\b|\bpas\s+(?:de|d'|encore)|\bno\s+(?:results?|marks?|grades?|quiz(?:zes)?)\b|\bnone\b|\bnot\s+(?:yet|found)\b/iu;

/**
 * "None", or a mark ("كل التلاميذ جابو 10/10", read off the marks-out-of
 * field), said from a class's exam list that has exams, with no results read
 * this turn.
 */
function resultsNotRead(answer: string, request: CompletionRequest, offered: ReadonlySet<string>): boolean {
  if (!offered.has('grades_get_by_exam') || !(SAYS_NONE.test(answer) || MARK.test(answer))) return false;
  const { names, results } = turnReads(request, offered);
  if (names.some(name => name.startsWith('grades_'))) return false;
  return results.some(result => result.name === 'exams_get_by_section' && !isEmptyList(result.content));
}

// Tool syntax, or a School tool ID written into the answer ("parents_get_my_identity"
// in a numbered plan, 2026-11-21): a reply never names tools.
const LEAKED_CALL = /to=functions\.|<\|(?:channel|call|message)\|>|\b[a-z]+(?:-[a-z]+)*_(?:get|search|list)_[a-z_]+\b/u;
// An answer asking the user for an ID an offered list tool would return.
const ASKS_FOR_ID = /\b(?:ID|IDs|identifiant|identifier|identificador)\b|المعرف|المعرّف|رقم التعريف|الآيدي|l'?ID\b/iu;

interface Chunk { choices?: { index: number; delta?: { content?: string | null; tool_calls?: { index: number; function?: { name?: string } }[] } }[] }

/** Reads a buffered provider stream; null when it is not a completion this check understands. */
export function completionProblem(raw: string, offered: ReadonlySet<string>, request: CompletionRequest = {}): CompletionProblem | null {
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
  if (emptyQuizListWithoutExams(request, offered)) return { kind: 'empty_quiz_list' };
  if (resultsNotRead(answer, request, offered)) return { kind: 'results_not_read' };
  if (unreadMark(answer, request)) return { kind: 'unread_mark' };
  if (parentAccountDetour(answer, request)) return { kind: 'parent_account_detour' };
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
    case 'empty_quiz_list':
      return `Correction: the assessment list was empty, but this school may record its quizzes as class tests (exams). Before answering, call exams_get_by_section with the same sectionId, pick the requested one (the latest dated on or before the school date, matching the subject named)${offered.has('grades_get_by_exam') ? ', then grades_get_by_exam with its examId' : ''}. Say none exists only if the exam list is also empty.`;
    case 'parent_account_detour':
      return 'Correction: this conversation already found the student by name with search_search_students. The latest message is a follow-up about that same student: reuse their id from that result and read the requested data. Do not ask about a parent account or call an identity tool.';
    case 'unread_mark':
      return offered.size
        ? `Correction: the previous attempt stated a mark although no tool was called, so it was invented. Read it with the offered tools (${[...offered].join(', ')}) and answer only from their results.`
        : 'Correction: the previous attempt stated a mark although nothing was read, so it was invented. No data tool is available in this turn: say briefly that you could not read it and ask the user to rephrase the full question (student, subject), without any mark or number.';
    case 'results_not_read':
      return 'Correction: the previous attempt said there are no results, but the class exam list has no marks in it, so it cannot show that. Pick the requested exam from that list (by title or subject; the latest dated on or before the school date when asked for the last one), call grades_get_by_exam with its examId, and answer with each student\'s mark and the average. Say no marks exist only if that read returns none.';
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

import type { Container } from 'diject';
import { AiSettingsService } from 'najm-chatbot';
import { JEV_DECISIONS_URL, JEV_MODEL } from './jevIntents';
import { modelMatches } from './jevDecision';
import { responseText } from './JevIntentClassifier';

/**
 * Jev as najm-rag's `rerankTools` judge: it picks which of the router's
 * candidate tools fits the message. Any failure answers null, and najm-rag
 * keeps the router's order. No access decision: the tools still check the
 * caller's permissions when they run.
 */

export interface ToolCandidate { toolName: string; description: string; similarity: number }
export interface ToolPick { toolName: string | null; confidence: number }
interface ProviderSettings { provider?: string | null; apiKey?: string | null; baseUrl?: string | null }

export const NO_TOOL = 'none';
/** After a failure, skip Jev this long instead of making every message wait for its timeout. */
export const RERANK_FAILURE_COOLDOWN_MS = 30_000;
const DESCRIPTION_CHARS = 400;

const INSTRUCTIONS = 'The message was typed in the chat of a Moroccan school management dashboard by a staff member, '
  + 'teacher, parent or student. It can be English, French, Spanish, Modern Standard Arabic or Moroccan Darija in Arabic '
  + 'or Latin script, or a mix. Which tool should the assistant call first to answer it? '
  + 'Choose none when no listed tool fits or the message asks for no school data.';

/** One provider request: each candidate tool is a choice described by its MCP description. */
export function buildToolPickRequest(query: string, candidates: ToolCandidate[]) {
  const criteria: Record<string, string> = {};
  for (const candidate of candidates) {
    criteria[candidate.toolName] = (candidate.description || candidate.toolName).slice(0, DESCRIPTION_CHARS);
  }
  criteria[NO_TOOL] = 'No listed tool answers this message, or it asks for no school data.';
  return {
    model: JEV_MODEL,
    state: query,
    questions: { tool: { type: 'choice', instructions: INSTRUCTIONS, criteria } },
  };
}

const isConfidence = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;

/** Reads one answer; anything malformed throws rather than guessing. */
export function parseToolPick(body: any, candidates: ToolCandidate[]): ToolPick {
  const answer = body?.answers?.tool;
  const names = new Set([...candidates.map(candidate => candidate.toolName), NO_TOOL]);
  if (!modelMatches(body?.model) || answer?.type !== 'choice' || typeof answer.choice !== 'string'
    || !names.has(answer.choice) || !isConfidence(answer.confidence)) throw new Error('Malformed Jev tool pick');
  return { toolName: answer.choice === NO_TOOL ? null : answer.choice, confidence: answer.confidence };
}

export interface JevToolRerankerOptions {
  /** The chatbot's AI settings; only an OpenRouter key on OpenRouter's own address is used. */
  settings: () => Promise<ProviderSettings | null>;
  transport?: typeof fetch;
  now?: () => number;
}

/** najm-rag's `rerankTools.rerank`. Never throws: a failure is null and starts the cooldown. */
export function createJevToolReranker(options: JevToolRerankerOptions) {
  const transport = options.transport ?? ((input, init) => fetch(input, init));
  const now = options.now ?? Date.now;
  let skipUntil = 0;

  return async function rerank(request: { query: string; candidates: ToolCandidate[]; signal: AbortSignal }): Promise<ToolPick | null> {
    if (now() < skipUntil || request.candidates.length === 0) return null;
    try {
      const settings = await options.settings();
      if (settings?.provider !== 'openrouter' || !settings.apiKey
        || (settings.baseUrl && settings.baseUrl !== 'https://openrouter.ai/api/v1')) return null;
      request.signal.throwIfAborted();
      const response = await transport(JEV_DECISIONS_URL, {
        method: 'POST', redirect: 'error', signal: request.signal,
        headers: { authorization: `Bearer ${settings.apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ ...buildToolPickRequest(request.query, request.candidates),
          session_id: crypto.randomUUID(), provider: { data_collection: 'deny' } }),
      });
      const text = await responseText(response, request.signal);
      if (!response.ok) throw new Error('provider_rejected');
      return parseToolPick(JSON.parse(text), request.candidates);
    } catch {
      // A timeout is najm-rag aborting the signal: it is a failure too.
      skipUntil = now() + RERANK_FAILURE_COOLDOWN_MS;
      return null;
    }
  };
}

let settingsSource: JevToolRerankerOptions['settings'] | null = null;

/** Called once at boot with the server container; until then the reranker answers null. */
export function bindJevToolReranker(container: Container) {
  settingsSource = async () => (await container.resolve(AiSettingsService)).getInternal();
}

/** The instance ragConfig passes to najm-rag. */
export const schoolJevToolReranker = createJevToolReranker({ settings: async () => (settingsSource ? settingsSource() : null) });

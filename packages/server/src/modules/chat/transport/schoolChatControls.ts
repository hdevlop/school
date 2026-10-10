import { envChoice, envInt, envString } from 'najm-core/env';

/** One release switch; Jev off retains the router/20B flow. */
export function readSchoolChatControls() {
  return {
    enabled: envChoice('CHATBOT_FLOW', process.env.CHATBOT_FLOW, ['legacy', 'jev-router-20b'], 'legacy') === 'jev-router-20b',
    timeoutMs: envInt('CHATBOT_JEV_OPERATING_TIMEOUT_MS', process.env.CHATBOT_JEV_OPERATING_TIMEOUT_MS,
      { fallback: 3000, min: 1, max: 10_000 }),
  };
}

export type JevMode = 'off' | 'on';

export function readJevControls() {
  const raw = envString(process.env.CHATBOT_JEV_THRESHOLD);
  const threshold = raw === undefined ? 0.8 : /^\d+(?:\.\d+)?$/u.test(raw) ? Number(raw) : NaN;
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1)
    throw new Error('CHATBOT_JEV_THRESHOLD must be between 0 and 1');
  return {
    mode: envChoice('CHATBOT_JEV_MODE', process.env.CHATBOT_JEV_MODE, ['off', 'on'], 'off'),
    threshold,
  };
}

/** The release switch enables the qualified scope; Jev off retains router fallback. */
export function effectiveJevMode(): JevMode {
  return readSchoolChatControls().enabled ? readJevControls().mode : 'off';
}

/** No session key means the framework creates a new conversation. Existing
 * sessions and multi-message/follow-up input stay on the router, without
 * trusting client historyComplete/priorUserTurns/role/year claims. */
export function ordinaryJevTurn(body: unknown): { query: string; historyComplete: true; priorUserTurns: 0 } | null {
  if (!body || typeof body !== 'object') return null;
  const value = body as { sessionKey?: unknown; messages?: unknown };
  if (value.sessionKey !== undefined || !Array.isArray(value.messages) || value.messages.length !== 1) return null;
  const message = value.messages[0];
  if (!message || message.role !== 'user') return null;
  const parts = message.parts ?? message.content;
  const query = typeof parts === 'string' ? parts : Array.isArray(parts) && parts.length === 1
    && parts[0]?.type === 'text' && typeof parts[0].text === 'string' ? parts[0].text : null;
  return query?.trim() && query.length <= 2000 ? { query, historyComplete: true, priorUserTurns: 0 } : null;
}

import { envChoice, envInt } from 'najm-core/env';

/** One release switch; Jev off retains the router/20B flow and its budget. */
export function readSchoolChatControls() {
  return {
    enabled: envChoice('CHATBOT_FLOW', process.env.CHATBOT_FLOW, ['legacy', 'jev-router-20b'], 'legacy') === 'jev-router-20b',
    monthlyMicroUsd: envInt('CHATBOT_MONTHLY_MICRO_USD', process.env.CHATBOT_MONTHLY_MICRO_USD,
      { fallback: 10_000_000, min: 1, max: 10_000_000 }),
    timeoutMs: envInt('CHATBOT_JEV_OPERATING_TIMEOUT_MS', process.env.CHATBOT_JEV_OPERATING_TIMEOUT_MS,
      { fallback: 3000, min: 1, max: 10_000 }),
  };
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

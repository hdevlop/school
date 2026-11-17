import { env } from '../../../env';

/** One release switch; Jev off retains the router/20B flow. */
export function readSchoolChatControls() {
  return { enabled: env.chat.flow === 'jev-router-20b', timeoutMs: env.chat.jevOperatingTimeoutMs };
}

export type JevMode = 'off' | 'on';

export function readJevControls() {
  return { mode: env.chat.jevMode, threshold: env.chat.jevThreshold };
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

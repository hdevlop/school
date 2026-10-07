import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { jevSyntheticCases } from './jevSyntheticCases';
import type { JevMode } from './JevControls';
import type { ReplyPreparationRequest, ReplyPreparationSelection, ReplyTemplate } from 'najm-chatbot';

export interface JevRequestContext {
  actorId: string; role: string; academicYear: string; mode: JevMode;
  correlationId: string | null; caseId: string; query: string;
  historyComplete: true; priorUserTurns: 0;
  prepare?: (request: ReplyPreparationRequest) => Promise<ReplyTemplate | null>;
  eligible?: (request: ReplyPreparationRequest) => boolean;
  onSelection?: (event: ReplyPreparationSelection) => void;
  attemptId?: string;
}
export const schoolJevRequestContext = new AsyncLocalStorage<JevRequestContext>();

/** Only server-issued, one-use synthetic benchmark sessions establish a first turn. */
export class JevSessionGrants {
  private grants = new Map<string, { actorId: string; academicYear: string; caseId: string; query: string; expiresAt: number }>();
  issue(actorId: string, academicYear: string, caseId: string) {
    const item = jevSyntheticCases.find(item => item.id === caseId);
    if (!item || !actorId || !academicYear) throw new Error('Invalid synthetic Jev session');
    const now = Date.now();
    for (const [key, grant] of this.grants) if (grant.expiresAt <= now) this.grants.delete(key);
    if (this.grants.size >= 500) throw new Error('Jev session capacity reached');
    const sessionKey = `jev-benchmark:${randomUUID()}`;
    this.grants.set(sessionKey, { actorId, academicYear, caseId, query: item.query, expiresAt: now + 600_000 });
    return { sessionKey, caseId, query: item.query };
  }
  consume(sessionKey: unknown, actorId: string | undefined, academicYear: string, messages: unknown) {
    if (typeof sessionKey !== 'string') return null;
    const grant = this.grants.get(sessionKey);
    if (!grant || grant.actorId !== actorId || grant.academicYear !== academicYear) return null;
    this.grants.delete(sessionKey);
    if (grant.expiresAt <= Date.now() || !Array.isArray(messages) || messages.length !== 1) return null;
    const message = messages[0];
    if (!message || message.role !== 'user') return null;
    // The HTTP controller accepts legacy content and AI SDK parts; extra context fails closed.
    const parts = message.parts ?? message.content;
    const query = typeof parts === 'string' ? parts : Array.isArray(parts) && parts.length === 1
      && parts[0]?.type === 'text' && typeof parts[0].text === 'string' ? parts[0].text : null;
    return query === grant.query ? { ...grant, historyComplete: true as const, priorUserTurns: 0 as const } : null;
  }
}
export const jevSessionGrants = new JevSessionGrants();

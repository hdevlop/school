import { randomUUID } from 'node:crypto';
import type { JevMode } from '../jev/JevControls';
import type { JevIntent } from '../jev/jevIntents';

export interface JevAttempt {
  id: string; correlationId: string | null; mode: JevMode; caseId: string; startedAt: string;
  outcome: 'pending' | 'candidate' | 'declined' | 'error' | 'aborted';
  costUsd: number | null; reservedUsd: number; elapsedMs: number | null;
  providerRequestId?: string; choice?: JevIntent; confidence?: number; writeProbability?: number;
  providerGenerationId?: string;
  billingMode?: 'abort' | 'observe';
  transportCompleted?: boolean;
  costSource?: 'decisions_response';
  httpStatus?: number;
  reason?: string;
  selected?: 'template' | 'ordinary';
}

/** Process-local spending stop. Missing/aborted billing is never converted to zero. */
export class JevAttemptLedger {
  private attempts = new Map<string, JevAttempt>();
  constructor(private limits: { maxRequests: number; maxCostUsd: number; unknownReserveUsd: number }) {
    if (!Number.isSafeInteger(limits.maxRequests) || limits.maxRequests < 0 || limits.maxRequests > 1000
      || !Number.isFinite(limits.maxCostUsd) || limits.maxCostUsd < 0
      || !Number.isFinite(limits.unknownReserveUsd) || limits.unknownReserveUsd <= 0) throw new Error('Invalid Jev limits');
  }
  snapshot() {
    const rows = [...this.attempts.values()];
    const knownCostUsd = rows.reduce((sum, row) => sum + (row.costUsd ?? 0), 0);
    const reservedUsd = rows.filter(row => row.costUsd === null).reduce((sum, row) => sum + row.reservedUsd, 0);
    const unknownCosts = rows.filter(row => row.outcome !== 'pending' && row.costUsd === null).length;
    return { ...this.limits, requests: rows.length, pendingRequests: rows.filter(row => row.outcome === 'pending').length,
      knownCostUsd, reservedUsd, unknownCosts,
      stoppedReason: unknownCosts ? 'unknown_cost' : rows.length >= this.limits.maxRequests ? 'request_limit'
        : knownCostUsd + reservedUsd + this.limits.unknownReserveUsd > this.limits.maxCostUsd + 1e-12 ? 'cost_limit' : null };
  }
  start(context: Pick<JevAttempt, 'correlationId' | 'caseId' | 'mode'>): JevAttempt | null {
    if (this.snapshot().stoppedReason) return null;
    const row: JevAttempt = { ...context, id: randomUUID(), startedAt: new Date().toISOString(), outcome: 'pending',
      costUsd: null, reservedUsd: this.limits.unknownReserveUsd, elapsedMs: null };
    this.attempts.set(row.id, row);
    return row;
  }
  settle(id: string, event: Partial<Omit<JevAttempt, 'id' | 'correlationId' | 'mode' | 'caseId' | 'startedAt' | 'reservedUsd'>>) {
    const row = this.attempts.get(id);
    if (!row || row.outcome !== 'pending') return;
    const costUsd = typeof event.costUsd === 'number' && Number.isFinite(event.costUsd) && event.costUsd >= 0 ? event.costUsd : null;
    Object.assign(row, event, { costUsd });
  }
  selection(id: string, selected: 'template' | 'ordinary') {
    const row = this.attempts.get(id);
    if (row) row.selected = selected;
  }
  recent(limit = 200) { return [...this.attempts.values()].slice(-limit).reverse().map(row => ({ ...row })); }
}

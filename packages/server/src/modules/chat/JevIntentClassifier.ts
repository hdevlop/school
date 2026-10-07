import { AiSettingsService, type ReplyPreparationRequest, type ReplyPreparationSelection, type ReplyTemplate } from 'najm-chatbot';
import { Service } from '../../najm';
import { ROLES } from '../../auth';
import { buildDecisionRequest, JEV_DECISIONS_URL, parseDecision } from './jevIntents';
import { acceptsWithQueryGuardV5 } from './jevQueryGuard';
import { readJevControls, effectiveJevMode } from './JevControls';
import { JevAttemptLedger } from './JevAttemptLedger';
import { schoolJevRequestContext } from './JevSessionGrants';
import { jevReplyPlan } from './jevReplyPlan';

@Service()
export class JevIntentClassifier {
  readonly controls = readJevControls();
  readonly ledger = new JevAttemptLedger(this.controls);
  transport: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch> = (...args) => fetch(...args);
  constructor(private settings: AiSettingsService) {}

  eligible(request: ReplyPreparationRequest) {
    const frame = schoolJevRequestContext.getStore();
    return effectiveJevMode() !== 'off' && !!frame && frame.mode !== 'off'
      && frame.actorId === request.userId && [ROLES.ADMIN, ROLES.PRINCIPAL].some(role => role === frame.role)
      && request.channel === 'web' && ['fr', 'ar', 'ary'].includes(request.language ?? '')
      && request.historyComplete === true && request.priorUserTurns === 0 && frame.query === request.userText
      && !request.signal.aborted && !this.ledger.snapshot().stoppedReason;
  }

  readonly onSelection = (event: ReplyPreparationSelection) => {
    const frame = schoolJevRequestContext.getStore();
    if (frame?.attemptId) this.ledger.selection(frame.attemptId, event.selected);
  };

  async prepare(request: ReplyPreparationRequest): Promise<ReplyTemplate | null> {
    if (!this.eligible(request)) return null;
    const frame = schoolJevRequestContext.getStore()!;
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(this.controls.timeoutMs)]);
    let attempt: ReturnType<JevAttemptLedger['start']> = null;
    let costUsd: number | null = null;
    let providerRequestId: string | undefined;
    let httpStatus: number | undefined;
    let failure = 'transport';
    const start = performance.now();
    try {
      const settings = await this.settings.getInternal();
      signal.throwIfAborted();
      if (effectiveJevMode() === 'off' || settings?.provider !== 'openrouter' || !settings.apiKey
        || settings.baseUrl && settings.baseUrl !== 'https://openrouter.ai/api/v1') return null;
      attempt = this.ledger.start({ correlationId: frame.correlationId, caseId: frame.caseId, mode: frame.mode });
      if (!attempt) return null;
      frame.attemptId = attempt.id;
      const response = await this.transport(JEV_DECISIONS_URL, { method: 'POST', redirect: 'error', signal,
        headers: { authorization: `Bearer ${settings.apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ ...buildDecisionRequest(request.userText), session_id: attempt.id, provider: { data_collection: 'deny' } }) });
      httpStatus = response.status; failure = response.ok ? 'invalid_response' : 'provider_rejected';
      const headerId = response.headers.get('x-request-id');
      if (headerId && /^[\w-]{1,160}$/u.test(headerId)) providerRequestId = headerId;
      const text = await response.text();
      if (text.length > 65_536) throw new Error('response_too_large');
      const body = JSON.parse(text);
      if (typeof body?.usage?.cost === 'number' && Number.isFinite(body.usage.cost) && body.usage.cost >= 0) costUsd = body.usage.cost;
      const rawId = response.headers.get('x-request-id') ?? body?.id;
      if (typeof rawId === 'string' && /^[\w-]{1,160}$/u.test(rawId)) providerRequestId = rawId;
      if (!response.ok) throw new Error('provider_rejected');
      signal.throwIfAborted();
      const decision = parseDecision(body);
      const accepted = acceptsWithQueryGuardV5(decision, request.userText, this.controls.threshold, 'core');
      const plan = accepted ? jevReplyPlan(decision.choice, request.language!, frame.academicYear) : null;
      this.ledger.settle(attempt.id, { outcome: plan ? 'candidate' : 'declined', costUsd, providerRequestId, httpStatus,
        elapsedMs: performance.now() - start, choice: decision.choice, confidence: decision.confidence,
        writeProbability: decision.writeProbability, reason: frame.mode === 'shadow' ? 'shadow_only' : plan ? undefined : 'acceptance_guard' });
      // Shadow has the same privacy/budget requirements and never executes a plan.
      return frame.mode === 'on' && effectiveJevMode() !== 'off' ? plan : null;
    } catch {
      if (attempt) this.ledger.settle(attempt.id, { outcome: signal.aborted ? 'aborted' : 'error', costUsd, providerRequestId, httpStatus,
        elapsedMs: performance.now() - start, reason: signal.aborted ? 'cancelled_or_deadline' : failure });
      return null;
    }
  }
}

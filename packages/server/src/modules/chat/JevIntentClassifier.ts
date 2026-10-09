import { AiSettingsService, type ReplyPreparationRequest, type ReplyPreparationSelection, type ReplyTemplate } from 'najm-chatbot';
import { Service } from '../../najm';
import { ROLES } from '../../auth';
import { JEV_DECISIONS_URL, parseDecision } from './jevIntents';
import { acceptsWithQueryGuardV6, hasGuardedJevReply } from './jevQueryGuard';
import { buildJevRuntimeDecisionRequest } from './jevRuntimeWording';
import { readJevControls, effectiveJevMode } from './JevControls';
import { JevAttemptLedger } from './JevAttemptLedger';
import { schoolJevRequestContext } from './JevSessionGrants';
import { jevReplyPlan } from './jevReplyPlan';

/** Observe late rejections even when a test/provider ignores its supplied signal. */
function abortable<T>(start: () => Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const aborted = () => { signal.removeEventListener('abort', aborted); reject(signal.reason); };
    signal.addEventListener('abort', aborted, { once: true });
    try {
      void start().then(value => { signal.removeEventListener('abort', aborted); resolve(value); },
        error => { signal.removeEventListener('abort', aborted); reject(error); });
    } catch (error) { signal.removeEventListener('abort', aborted); reject(error); }
  });
}

async function responseText(response: Response, signal?: AbortSignal) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('missing_body');
  const decoder = new TextDecoder(); let bytes = 0, text = '';
  try {
    while (true) {
      const chunk = await (signal ? abortable(() => reader.read(), signal) : reader.read());
      if (chunk.done) return text + decoder.decode();
      bytes += chunk.value.byteLength;
      if (bytes > 65_536) throw new Error('response_too_large');
      text += decoder.decode(chunk.value, { stream: true });
    }
  } finally { void reader.cancel().catch(() => {}); }
}

@Service()
export class JevIntentClassifier {
  readonly controls = readJevControls();
  readonly ledger = new JevAttemptLedger(this.controls);
  private inFlight = new Set<AbortController>();
  transport: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch> = (...args) => fetch(...args);
  constructor(private settings: AiSettingsService) {}
  cancelInFlight() { for (const controller of this.inFlight) controller.abort(); }

  eligible(request: ReplyPreparationRequest) {
    const frame = schoolJevRequestContext.getStore();
    const metadataEligible = effectiveJevMode() !== 'off' && !!frame && frame.mode !== 'off'
      && frame.actorId === request.userId && [ROLES.ADMIN, ROLES.PRINCIPAL].some(role => role === frame.role)
      && request.channel === 'web' && ['fr', 'ar', 'ary'].includes(request.language ?? '')
      && request.historyComplete === true && request.priorUserTurns === 0 && frame.query === request.userText
      && (this.controls.billingMode !== 'observe' || !!frame.requestSignal && !frame.requestSignal.aborted)
      && !request.signal.aborted && !this.ledger.snapshot().stoppedReason;
    if (!metadataEligible) {
      if (frame && !frame.diagnostics) frame.diagnostics = { eligibility: 'ineligible_metadata', classification: 'not_started' };
      return false;
    }
    // Shadow measures declines as well as supported replies. On mode only pays
    // when at least one existing guarded reply is possible; acceptance still runs later.
    const eligibility = frame.mode === 'shadow' ? 'shadow_unfiltered'
      : hasGuardedJevReply(request.userText) ? 'supported_query' : 'unsupported_query';
    frame.diagnostics = { eligibility, classification: frame.diagnostics?.classification ?? 'not_started' };
    return eligibility !== 'unsupported_query';
  }

  readonly onSelection = (event: ReplyPreparationSelection) => {
    const frame = schoolJevRequestContext.getStore();
    if (frame?.attemptId) this.ledger.selection(frame.attemptId, event.selected);
  };

  async prepare(request: ReplyPreparationRequest): Promise<ReplyTemplate | null> {
    if (!this.eligible(request)) return null;
    const frame = schoolJevRequestContext.getStore()!;
    const deadline = new AbortController();
    const transport = new AbortController();
    const observe = this.controls.billingMode === 'observe';
    const signal = AbortSignal.any([request.signal, deadline.signal]);
    const networkSignal = observe ? AbortSignal.any([transport.signal, frame.requestSignal!])
      : AbortSignal.any([transport.signal, signal]);
    const candidateTimer = setTimeout(() => deadline.abort(), this.controls.timeoutMs);
    const billingTimer = observe ? setTimeout(() => transport.abort(), this.controls.billingTimeoutMs) : undefined;
    let attempt: ReturnType<JevAttemptLedger['start']> = null;
    let costUsd: number | null = null;
    let providerRequestId: string | undefined;
    let providerGenerationId: string | undefined;
    let transportCompleted = false;
    let httpStatus: number | undefined;
    let failure = 'transport';
    const start = performance.now();
    let resolveCancelled!: (value: null) => void;
    const cancelled = new Promise<null>(resolve => { resolveCancelled = resolve; });
    const candidateCancelled = () => {
      resolveCancelled(null);
      // 3.4.0 aborts the candidate immediately before the synchronous selection observer.
      // Only ordinary-selection loss or the candidate deadline may leave billing collection running.
      queueMicrotask(() => {
        if (observe && !deadline.signal.aborted && attempt?.selected !== 'ordinary') transport.abort();
      });
    };
    signal.addEventListener('abort', candidateCancelled, { once: true });
    this.inFlight.add(transport);
    const work = (async (): Promise<ReplyTemplate | null> => { try {
      const settings = await this.settings.getInternal();
      signal.throwIfAborted();
      if (effectiveJevMode() === 'off' || settings?.provider !== 'openrouter' || !settings.apiKey
        || settings.baseUrl && settings.baseUrl !== 'https://openrouter.ai/api/v1') return null;
      attempt = this.ledger.start({ correlationId: frame.correlationId, caseId: frame.caseId, mode: frame.mode });
      if (!attempt) return null;
      frame.attemptId = attempt.id;
      frame.diagnostics!.classification = 'pending';
      const send = () => this.transport(JEV_DECISIONS_URL, { method: 'POST', redirect: 'error', signal: networkSignal,
        headers: { authorization: `Bearer ${settings.apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ ...buildJevRuntimeDecisionRequest(request.userText), session_id: attempt!.id, provider: { data_collection: 'deny' } }) });
      const response = observe ? await abortable(send, networkSignal) : await send();
      httpStatus = response.status; failure = response.ok ? 'invalid_response' : 'provider_rejected';
      const headerId = response.headers.get('x-request-id');
      if (headerId && /^[\w-]{1,160}$/u.test(headerId)) providerRequestId = headerId;
      const text = await responseText(response, observe ? networkSignal : undefined);
      transportCompleted = true;
      const body = JSON.parse(text);
      if (typeof body?.usage?.cost === 'number' && Number.isFinite(body.usage.cost) && body.usage.cost >= 0) costUsd = body.usage.cost;
      const rawId = response.headers.get('x-request-id') ?? body?.id;
      if (typeof rawId === 'string' && /^[\w-]{1,160}$/u.test(rawId)) providerRequestId = rawId;
      if (typeof body?.id === 'string' && /^gen-dec-[\w-]{1,150}$/u.test(body.id)) providerGenerationId = body.id;
      if (!response.ok) throw new Error('provider_rejected');
      const decision = parseDecision(body);
      const accepted = acceptsWithQueryGuardV6(decision, request.userText, this.controls.threshold);
      const plan = !signal.aborted && accepted ? jevReplyPlan(decision.choice, request.language!, frame.academicYear, request.userText) : null;
      frame.diagnostics!.classification = signal.aborted ? 'aborted' : plan ? 'candidate' : 'declined';
      this.ledger.settle(attempt.id, { outcome: signal.aborted ? 'aborted' : plan ? 'candidate' : 'declined',
        costUsd, costSource: costUsd === null ? undefined : 'decisions_response', providerRequestId, providerGenerationId,
        billingMode: this.controls.billingMode, transportCompleted, httpStatus,
        elapsedMs: performance.now() - start, choice: decision.choice, confidence: decision.confidence,
        writeProbability: decision.writeProbability, reason: signal.aborted ? 'candidate_cancelled_billing_completed'
          : frame.mode === 'shadow' ? 'shadow_only' : plan ? undefined : 'acceptance_guard' });
      // Shadow has the same privacy/budget requirements and never executes a plan.
      return frame.mode === 'on' && effectiveJevMode() !== 'off' ? plan : null;
    } catch {
      frame.diagnostics!.classification = signal.aborted || networkSignal.aborted ? 'aborted' : 'error';
      if (attempt) this.ledger.settle(attempt.id, { outcome: signal.aborted || networkSignal.aborted ? 'aborted' : 'error',
        costUsd, costSource: costUsd === null ? undefined : 'decisions_response', providerRequestId, providerGenerationId,
        billingMode: this.controls.billingMode, transportCompleted, httpStatus,
        elapsedMs: performance.now() - start, reason: signal.aborted ? 'cancelled_or_deadline' : failure });
      return null;
    } finally {
      clearTimeout(candidateTimer); if (billingTimer) clearTimeout(billingTimer);
      signal.removeEventListener('abort', candidateCancelled); this.inFlight.delete(transport);
    } })();
    // The framework receives cancellation promptly; the bounded observer settles only the separate ledger.
    return observe ? Promise.race([work, cancelled]) : work;
  }
}

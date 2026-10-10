import { AiSettingsService, type ReplyPreparationRequest, type ReplyTemplate } from 'najm-chatbot';
import { Service } from '../../../najm';
import { JEV_DECISIONS_URL } from './jevIntents';
import { parseDecision } from './jevDecision';
import { acceptsWithQueryGuard } from './guards/queryGuard';
import { buildJevDecisionRequest } from './jevWording';
import { readJevControls, effectiveJevMode, readSchoolChatControls } from '../transport/schoolChatControls';
import { schoolJevRequestContext } from './JevRequestContext';
import { jevReplyPlan, hasOrdinaryJevReply, ORDINARY_JEV_READS } from './jevReplyPlan';
import { schoolChatFetch } from '../transport/SchoolChatTransport';

/** Cancellation stays prompt even if a provider ignores the supplied signal. */
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

async function responseText(response: Response, signal: AbortSignal) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('missing_body');
  const decoder = new TextDecoder(); let bytes = 0, text = '';
  try {
    while (true) {
      const chunk = await abortable(() => reader.read(), signal);
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
  transport: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch> = schoolChatFetch(((input, init) => fetch(input, init)) as typeof fetch);
  constructor(private settings: AiSettingsService) {}

  eligible(request: ReplyPreparationRequest) {
    const frame = schoolJevRequestContext.getStore();
    const metadataEligible = effectiveJevMode() === 'on' && !!frame && frame.mode === 'on'
      && frame.actorId === request.userId
      && request.channel === 'web' && ['fr', 'ar', 'ary'].includes(request.language ?? '')
      && request.historyComplete === true && request.priorUserTurns === 0 && frame.query === request.userText
      && !request.signal.aborted && !frame.requestSignal?.aborted;
    if (!metadataEligible) {
      if (frame && !frame.diagnostics) frame.diagnostics = { eligibility: 'ineligible_metadata', classification: 'not_started' };
      return false;
    }
    const eligibility = hasOrdinaryJevReply(request.userText) ? 'supported_query' : 'unsupported_query';
    frame.diagnostics = { eligibility, classification: frame.diagnostics?.classification ?? 'not_started' };
    return eligibility === 'supported_query';
  }

  async prepare(request: ReplyPreparationRequest): Promise<ReplyTemplate | null> {
    if (!this.eligible(request)) return null;
    const frame = schoolJevRequestContext.getStore()!;
    const deadline = new AbortController();
    const signal = AbortSignal.any([request.signal, deadline.signal, ...(frame.requestSignal ? [frame.requestSignal] : [])]);
    const timer = setTimeout(() => deadline.abort(), readSchoolChatControls().timeoutMs);
    try {
      const settings = await abortable(() => this.settings.getInternal(), signal);
      signal.throwIfAborted();
      if (effectiveJevMode() !== 'on' || settings?.provider !== 'openrouter' || !settings.apiKey
        || settings.baseUrl && settings.baseUrl !== 'https://openrouter.ai/api/v1') return null;
      frame.diagnostics!.classification = 'pending';
      const response = await abortable(() => this.transport(JEV_DECISIONS_URL, { method: 'POST', redirect: 'error', signal,
        headers: { authorization: `Bearer ${settings.apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ ...buildJevDecisionRequest(request.userText), session_id: crypto.randomUUID(), provider: { data_collection: 'deny' } }) }), signal);
      const text = await responseText(response, signal);
      if (!response.ok) throw new Error('provider_rejected');
      const decision = parseDecision(JSON.parse(text));
      const accepted = acceptsWithQueryGuard(decision, request.userText, this.controls.threshold)
        && ORDINARY_JEV_READS.some(choice => choice === decision.choice);
      const plan = !signal.aborted && accepted ? jevReplyPlan(decision.choice, request.language!, frame.academicYear) : null;
      frame.diagnostics!.classification = signal.aborted ? 'aborted' : plan ? 'candidate' : 'declined';
      return effectiveJevMode() === 'on' ? plan : null;
    } catch {
      frame.diagnostics!.classification = signal.aborted ? 'aborted' : 'error';
      return null;
    } finally { clearTimeout(timer); }
  }
}

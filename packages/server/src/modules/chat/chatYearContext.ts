import { ChatController } from 'najm-chatbot';
import type { Container } from 'diject';
import type { MiddlewareHandler } from 'hono';
import { CORRELATION_ID, INJECTION_TYPES, USER } from '../../najm';
import { schoolChatYearContext, SchoolChatContextProvider, type ChatActor } from './SchoolChatContextProvider';
import { JevIntentClassifier } from './JevIntentClassifier';
import { jevSessionGrants, schoolJevRequestContext } from './JevSessionGrants';
import { effectiveJevMode } from './JevControls';
import { latestChatUserText, schoolChatResponse } from './schoolChatResponse';
import { readSchoolChatControls, ordinaryJevTurn } from './schoolChatControls';
import { ChatSpendRepository } from './ChatSpendRepository';
import { installSchoolPaidChatTransport, schoolPaidChatContext, type SchoolPaidChatFrame } from './SchoolPaidChatTransport';

/** Runs after the shared year boundary (50); never resolves or authorizes a second year. */
export function registerChatYearContext(container: Container) {
  installSchoolPaidChatTransport();
  const handler: MiddlewareHandler = async (context, next) => {
    installSchoolPaidChatTransport();
    const provider = await container.resolve(SchoolChatContextProvider);
    const actor = container.get(USER) as ChatActor | undefined;
    const snapshot = await provider.snapshot({ id: actor?.id, role: actor?.role });
    let grant = null;
    let latestUserText = '';
    let ordinary = null;
    try {
      const body = await context.req.json();
      latestUserText = latestChatUserText(body?.messages);
      grant = jevSessionGrants.consume(body?.sessionKey, actor?.id, snapshot.academicYear, body?.messages);
      if (readSchoolChatControls().enabled) ordinary = ordinaryJevTurn(body);
    } catch { /* The existing controller owns malformed-body responses. */ }
    const proceed = () => schoolChatYearContext.run({ ...snapshot, latestUserText }, async () => {
      if ((!grant && !ordinary) || !actor?.id || !actor.role) return next();
      const classifier = await container.resolve(JevIntentClassifier);
      let correlationId: string | null = null;
      try { correlationId = container.get(CORRELATION_ID) ?? null; } catch { /* optional outside transport */ }
      return schoolJevRequestContext.run({ ...(grant ?? ordinary!), ...(grant ? {} : { source: 'ordinary' as const, caseId: 'ordinary' }), actorId: actor.id, role: actor.role,
        academicYear: snapshot.academicYear, mode: effectiveJevMode(), correlationId,
        requestSignal: context.req.raw.signal,
        eligible: request => classifier.eligible(request), prepare: request => classifier.prepare(request),
        onSelection: classifier.onSelection }, next);
    });
    let paid: SchoolPaidChatFrame | undefined;
    const controls = readSchoolChatControls();
    if (controls.enabled && !grant && actor?.id) {
      const compatible = process.env.RAG_EMBEDDING_PROVIDER === 'openai-compatible';
      const base = process.env.RAG_EMBEDDING_BASE_URL?.replace(/\/+$/u, '')
        || (compatible ? 'http://127.0.0.1:18080/v1' : 'http://127.0.0.1:11434');
      const embeddingUrl = base + (compatible ? '/embeddings' : '/api/embed');
      const free = !process.env.RAG_EMBEDDING_API_KEY && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname);
      paid = { repository: await container.resolve(ChatSpendRepository), limit: controls.monthlyMicroUsd,
        ...(free ? { freeEmbeddingUrl: embeddingUrl } : { embeddingUrl }),
        calls: 0, costs: [] };
      await schoolPaidChatContext.run(paid, proceed);
    } else await proceed();
    context.res = schoolChatResponse(context.res, latestUserText, context.req.raw.signal, paid);
  };
  container.setInjection({ type: INJECTION_TYPES.MIDDLEWARE, target: ChatController, order: 55, handler });
}

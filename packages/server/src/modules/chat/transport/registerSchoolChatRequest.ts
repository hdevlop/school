import { ChatController } from 'najm-chatbot';
import type { Container } from 'diject';
import type { MiddlewareHandler } from 'hono';
import { CORRELATION_ID, INJECTION_TYPES, USER } from '../../../najm';
import { schoolChatRequest, SchoolChatRequest } from './SchoolChatRequest';
import { JevIntentClassifier } from '../jev/JevIntentClassifier';
import { schoolJevRequestContext } from '../jev/JevRequestContext';
import { latestChatUserText, schoolChatResponse } from './schoolChatResponse';
import { readSchoolChatControls, ordinaryJevTurn, effectiveJevMode } from './schoolChatControls';
import { installSchoolChatTransport, schoolChatTransportContext } from './SchoolChatTransport';

/** Runs after the shared year boundary (50); never resolves or authorizes a second year. */
export function registerSchoolChatRequest(container: Container) {
  installSchoolChatTransport();
  const handler: MiddlewareHandler = async (context, next) => {
    installSchoolChatTransport();
    const provider = await container.resolve(SchoolChatRequest);
    const actor = container.get(USER) as { id?: string } | undefined;
    const snapshot = await provider.snapshot();
    const { enabled } = readSchoolChatControls();
    let latestUserText = '';
    let ordinary = null;
    try {
      const body = await context.req.json();
      latestUserText = latestChatUserText(body?.messages);
      if (enabled) ordinary = ordinaryJevTurn(body);
    } catch { /* The existing controller owns malformed-body responses. */ }
    const proceed = () => schoolChatRequest.run(snapshot, async () => {
      if (!ordinary || !actor?.id) return next();
      const classifier = await container.resolve(JevIntentClassifier);
      let correlationId: string | null = null;
      try { correlationId = container.get(CORRELATION_ID) ?? null; } catch { /* optional outside transport */ }
      return schoolJevRequestContext.run({ ...ordinary, actorId: actor.id,
        academicYear: snapshot.academicYear, mode: effectiveJevMode(), correlationId,
        requestSignal: context.req.raw.signal,
        eligible: request => classifier.eligible(request), prepare: request => classifier.prepare(request) }, next);
    });
    if (enabled && actor?.id) {
      const compatible = process.env.RAG_EMBEDDING_PROVIDER === 'openai-compatible';
      const base = process.env.RAG_EMBEDDING_BASE_URL?.replace(/\/+$/u, '')
        || (compatible ? 'http://127.0.0.1:18080/v1' : 'http://127.0.0.1:11434');
      const embeddingUrl = base + (compatible ? '/embeddings' : '/api/embed');
      await schoolChatTransportContext.run({ embeddingUrl, calls: 0 }, proceed);
    } else await proceed();
    context.res = schoolChatResponse(context.res, latestUserText, context.req.raw.signal);
  };
  container.setInjection({ type: INJECTION_TYPES.MIDDLEWARE, target: ChatController, order: 55, handler });
}

import { ChatController } from 'najm-chatbot';
import type { Container } from 'diject';
import type { MiddlewareHandler } from 'hono';
import { CORRELATION_ID, INJECTION_TYPES, USER } from '../../najm';
import { schoolChatYearContext, SchoolChatContextProvider, type ChatActor } from './SchoolChatContextProvider';
import { JevIntentClassifier } from './JevIntentClassifier';
import { jevSessionGrants, schoolJevRequestContext } from './JevSessionGrants';
import { effectiveJevMode } from './JevControls';

/** Runs after the shared year boundary (50); never resolves or authorizes a second year. */
export function registerChatYearContext(container: Container) {
  const handler: MiddlewareHandler = async (context, next) => {
    const provider = await container.resolve(SchoolChatContextProvider);
    const actor = container.get(USER) as ChatActor | undefined;
    const snapshot = await provider.snapshot({ id: actor?.id, role: actor?.role });
    let grant = null;
    try {
      const body = await context.req.json();
      grant = jevSessionGrants.consume(body?.sessionKey, actor?.id, snapshot.academicYear, body?.messages);
    } catch { /* The existing controller owns malformed-body responses. */ }
    return schoolChatYearContext.run(snapshot, async () => {
      if (!grant || !actor?.id || !actor.role) return next();
      const classifier = await container.resolve(JevIntentClassifier);
      let correlationId: string | null = null;
      try { correlationId = container.get(CORRELATION_ID) ?? null; } catch { /* optional outside transport */ }
      return schoolJevRequestContext.run({ ...grant, actorId: actor.id, role: actor.role,
        academicYear: snapshot.academicYear, mode: effectiveJevMode(), correlationId,
        requestSignal: context.req.raw.signal,
        eligible: request => classifier.eligible(request), prepare: request => classifier.prepare(request),
        onSelection: classifier.onSelection }, next);
    });
  };
  container.setInjection({ type: INJECTION_TYPES.MIDDLEWARE, target: ChatController, order: 55, handler });
}

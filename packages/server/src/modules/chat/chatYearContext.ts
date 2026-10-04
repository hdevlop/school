import { ChatController } from 'najm-chatbot';
import type { Container } from 'diject';
import type { MiddlewareHandler } from 'hono';
import { INJECTION_TYPES, USER } from '../../najm';
import { schoolChatYearContext, SchoolChatContextProvider, type ChatActor } from './SchoolChatContextProvider';

/** Runs after the shared year boundary (50); never resolves or authorizes a second year. */
export function registerChatYearContext(container: Container) {
  const handler: MiddlewareHandler = async (_context, next) => {
    const provider = await container.resolve(SchoolChatContextProvider);
    const actor = container.get(USER) as ChatActor | undefined;
    return schoolChatYearContext.run(await provider.snapshot({ id: actor?.id, role: actor?.role }), next);
  };
  container.setInjection({ type: INJECTION_TYPES.MIDDLEWARE, target: ChatController, order: 55, handler });
}

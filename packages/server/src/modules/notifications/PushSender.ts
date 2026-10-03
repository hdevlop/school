import { Service } from '../../najm';
import { vapidConfig } from './notificationConfig';
import { createSafePushAgent, InvalidPushEndpoint } from './pushEndpoint';
import type { Agent } from 'node:https';

export const PUSH_DEADLINE_MS = 10_000;

export type PushOutcome = { result: 'sent' | 'gone' | 'transient' | 'failed'; code?: string };

@Service()
export class PushSender {
  protected agentFor(endpoint: string) {
    return createSafePushAgent(endpoint);
  }

  async send(target: { endpoint: string; p256dh: string; auth: string }, payload: { notificationId: string; title: string; body: string }): Promise<PushOutcome> {
    if (!vapidConfig.configured) return { result: 'failed', code: 'push_not_configured' };
    let agent: Agent | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let expired = false;
    try {
      // FIX: SEC-004 — deadline includes DNS resolution and destroys sockets.
      const delivery = async () => {
        agent = await this.agentFor(target.endpoint);
        if (expired) { agent.destroy(); throw new Error('Push deadline exceeded'); }
        const mod = await import('web-push');
        if (expired) throw new Error('Push deadline exceeded');
        const webpush = (mod.default ?? mod) as typeof import('web-push');
        webpush.setVapidDetails(vapidConfig.subject!, vapidConfig.publicKey!, vapidConfig.privateKey!);
        await webpush.sendNotification({ endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } }, JSON.stringify({
          notificationId: payload.notificationId.slice(0, 100),
          title: payload.title.slice(0, 120),
          body: payload.body.slice(0, 300),
        }), { TTL: 86_400, timeout: PUSH_DEADLINE_MS, agent });
      };
      await Promise.race([
        delivery(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            expired = true;
            agent?.destroy();
            reject(new Error('Push deadline exceeded'));
          }, PUSH_DEADLINE_MS);
        }),
      ]);
      return { result: 'sent' };
    } catch (error) {
      if (error instanceof InvalidPushEndpoint) return { result: 'failed', code: 'push_invalid_endpoint' };
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) return { result: 'gone', code: `push_${status}` };
      if (status === 429 || (status && status >= 500)) return { result: 'transient', code: `push_${status}` };
      if (status === 400 || status === 401 || status === 403) return { result: 'failed', code: `push_${status}` };
      return { result: 'transient', code: 'push_network_error' };
    } finally {
      if (timer) clearTimeout(timer);
      agent?.destroy();
    }
  }
}

import { Service } from '../../najm';
import { vapidConfig } from './notificationConfig';
import { createSafePushAgent, InvalidPushEndpoint } from './pushEndpoint';
import { request, type Agent } from 'node:https';

export const PUSH_DEADLINE_MS = 10_000;

export type PushOutcome = { result: 'sent' | 'gone' | 'transient' | 'failed'; code?: string };

/** What `web-push` builds for one notification: the encrypted, signed request. */
export type PushRequestDetails = {
  endpoint: string;
  method: string;
  headers: Record<string, string | number>;
  body: Buffer | string | null;
};

@Service()
export class PushSender {
  protected agentFor(endpoint: string) {
    return createSafePushAgent(endpoint);
  }

  /**
   * Sends the request `web-push` built and resolves with the provider's status.
   *
   * FIX: SEC-004 — the checked addresses are pinned by the agent's `lookup`,
   * and it is passed on the request as well. Bun ignores an Agent's `lookup`
   * but honours one on the request; Node honours both. Without it the worker
   * would resolve the provider again and connect wherever that answer points.
   */
  protected dispatch(details: PushRequestDetails, agent: Agent): Promise<number> {
    return new Promise((resolve, reject) => {
      const url = new URL(details.endpoint);
      const req = request({
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: details.method,
        headers: details.headers,
        agent,
        lookup: agent.options.lookup,
        timeout: PUSH_DEADLINE_MS,
      }, (res) => {
        res.on('error', reject);
        res.on('end', () => resolve(res.statusCode ?? 0));
        res.resume();
      });
      req.on('timeout', () => req.destroy(new Error('Socket timeout')));
      req.on('error', reject);
      if (details.body) req.write(details.body);
      req.end();
    });
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
        const details = webpush.generateRequestDetails({ endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } }, JSON.stringify({
          notificationId: payload.notificationId.slice(0, 100),
          title: payload.title.slice(0, 120),
          body: payload.body.slice(0, 300),
        }), {
          TTL: 86_400,
          vapidDetails: { subject: vapidConfig.subject!, publicKey: vapidConfig.publicKey!, privateKey: vapidConfig.privateKey! },
        }) as PushRequestDetails;
        const statusCode = await this.dispatch(details, agent);
        if (statusCode < 200 || statusCode > 299) throw Object.assign(new Error('Unexpected push response'), { statusCode });
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

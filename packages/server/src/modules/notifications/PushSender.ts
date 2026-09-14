import { Service } from '@server/najm';
import { vapidConfig } from './notificationConfig';

export type PushOutcome = { result: 'sent' | 'gone' | 'transient' | 'failed'; code?: string };

@Service()
export class PushSender {
  async send(target: { endpoint: string; p256dh: string; auth: string }, payload: { notificationId: string; title: string; body: string }): Promise<PushOutcome> {
    if (!vapidConfig.configured) return { result: 'failed', code: 'push_not_configured' };
    try {
      const mod = await import('web-push');
      const webpush = (mod.default ?? mod) as typeof import('web-push');
      webpush.setVapidDetails(vapidConfig.subject!, vapidConfig.publicKey!, vapidConfig.privateKey!);
      await webpush.sendNotification({ endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } }, JSON.stringify({
        notificationId: payload.notificationId.slice(0, 100),
        title: payload.title.slice(0, 120),
        body: payload.body.slice(0, 300),
      }), { TTL: 86_400 });
      return { result: 'sent' };
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) return { result: 'gone', code: `push_${status}` };
      if (status === 429 || (status && status >= 500)) return { result: 'transient', code: `push_${status}` };
      if (status === 400 || status === 401 || status === 403) return { result: 'failed', code: `push_${status}` };
      return { result: 'transient', code: 'push_network_error' };
    }
  }
}

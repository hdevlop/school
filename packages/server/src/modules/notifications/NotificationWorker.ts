import Redis from 'ioredis';
import { Service } from '../../najm';

import { notificationFlags } from './notificationConfig';
import { PersonalNotificationRepository } from './NotificationRepository';
import { PushCryptoService } from './pushCrypto';
import { PushSender } from './PushSender';

@Service()
export class NotificationWorker {
  private stopped = false;
  private redis: Redis | null = null;

  constructor(private readonly repository: PersonalNotificationRepository, private readonly crypto: PushCryptoService, private readonly sender: PushSender) {}

  private async heartbeat() {
    if (!process.env.REDIS_URL) return;
    try {
      if (!this.redis) {
        this.redis = new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
        this.redis.on('error', () => undefined);
      }
      if (this.redis.status === 'wait') await this.redis.connect();
      await this.redis.set('school:notifications:worker:heartbeat', String(Date.now()), 'EX', 30);
    } catch { /* delivery health must not crash the loop */ }
  }

  async dispatchOnce() {
    if (!notificationFlags.dispatchEnabled || !notificationFlags.pushEnabled) {
      await this.heartbeat();
      return 0;
    }
    const jobs = await this.repository.claimDeliveries();
    for (const job of jobs) {
      const id = String(job.id);
      const notificationId = String(job.notification_id);
      const subscriptionId = job.push_subscription_id ? String(job.push_subscription_id) : null;
      const attempts = Number(job.attempts ?? 1);
      try {
        const { notification, subscription } = await this.repository.loadDeliveryContext(notificationId, subscriptionId);
        if (!notification || !subscription || subscription.disabledAt || subscription.userId !== notification.recipientUserId) {
          await this.repository.markDelivery(id, 'skipped', 'subscription_missing');
          continue;
        }
        const outcome = await this.sender.send({
          endpoint: this.crypto.decrypt(subscription.endpointCiphertext),
          p256dh: this.crypto.decrypt(subscription.p256dhCiphertext),
          auth: this.crypto.decrypt(subscription.authCiphertext),
        }, { notificationId: notification.id, title: notification.title, body: notification.body });
        if (outcome.result === 'sent') {
          await this.repository.markSubscriptionResult(subscription.id, true);
          await this.repository.markDelivery(id, 'sent');
        } else if (outcome.result === 'gone') {
          await this.repository.disableSubscription(subscription.id);
          await this.repository.markDelivery(id, 'skipped', outcome.code);
        } else if (outcome.result === 'transient') {
          await this.repository.markSubscriptionResult(subscription.id, false);
          await this.repository.markDeliveryFailed(id, attempts, outcome.code ?? 'push_transient');
        } else {
          await this.repository.markDelivery(id, 'dead', outcome.code ?? 'push_failed');
        }
      } catch {
        await this.repository.markDeliveryFailed(id, attempts, 'delivery_error');
      }
    }
    await this.heartbeat();
    return jobs.length;
  }

  async run() {
    const stop = () => { this.stopped = true; };
    process.once('SIGTERM', stop);
    process.once('SIGINT', stop);
    const heartbeat = setInterval(() => void this.heartbeat(), 10_000);
    await this.heartbeat();
    try {
      while (!this.stopped) {
        const work = await this.dispatchOnce();
        if (work === 0) await new Promise((resolve) => setTimeout(resolve, 2_000));
      }
    } finally {
      clearInterval(heartbeat);
      process.off('SIGTERM', stop);
      process.off('SIGINT', stop);
      await this.redis?.quit().catch(() => undefined);
    }
  }
}

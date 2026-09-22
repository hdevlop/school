import { Err, Service, Transaction } from '../../najm';

import { notificationFlags, vapidConfig } from './notificationConfig';
import { notificationListQuery, pushSubscriptionDto, pushUnsubscribeDto, type NotificationListQuery, type PushSubscriptionDto, type PushUnsubscribeDto } from './notificationDto';
import { PersonalNotificationRepository } from './NotificationRepository';
import { fingerprintEndpoint, hashEndpoint, PushCryptoService } from './pushCrypto';

function userAgentFamily(value?: string) {
  const userAgent = value?.toLowerCase() ?? '';
  if (userAgent.includes('firefox')) return 'firefox';
  if (userAgent.includes('edg')) return 'edge';
  if (userAgent.includes('chrome')) return 'chrome';
  if (userAgent.includes('safari')) return 'safari';
  return userAgent ? 'other' : null;
}

@Service()
export class PersonalNotificationService {
  constructor(private readonly repository: PersonalNotificationRepository, private readonly crypto: PushCryptoService) {}

  async listMine(userId: string, query: NotificationListQuery) {
    return this.repository.listMine(userId, notificationListQuery.parse(query ?? {}));
  }

  async unreadCount(userId: string) { return { count: await this.repository.unreadCount(userId) }; }

  @Transaction()
  async markRead(userId: string, id: string) {
    const row = await this.repository.markRead(userId, id);
    if (!row) Err(404, 'Notification not found');
    return row;
  }

  @Transaction()
  async markAllRead(userId: string) {
    const rows = await this.repository.markAllRead(userId);
    return { read: rows.length };
  }

  pushConfig() {
    return { enabled: vapidConfig.configured, publicKey: vapidConfig.configured ? vapidConfig.publicKey : null };
  }

  @Transaction()
  async subscribe(userId: string, input: PushSubscriptionDto, userAgent?: string) {
    const parsed = pushSubscriptionDto.parse(input);
    const row = await this.repository.upsertSubscription({
      userId,
      endpointHash: hashEndpoint(parsed.endpoint),
      endpointCiphertext: this.crypto.encrypt(parsed.endpoint),
      p256dhCiphertext: this.crypto.encrypt(parsed.p256dh),
      authCiphertext: this.crypto.encrypt(parsed.auth),
      endpointFingerprint: fingerprintEndpoint(parsed.endpoint),
      userAgentFamily: userAgentFamily(userAgent),
    });
    return { id: row.id, endpointFingerprint: row.endpointFingerprint };
  }

  @Transaction()
  async unsubscribe(userId: string, input: PushUnsubscribeDto) {
    const parsed = pushUnsubscribeDto.parse(input);
    const removed = await this.repository.removeSubscription(userId, hashEndpoint(parsed.endpoint));
    if (!removed) Err(404, 'Push subscription not found');
    return { removed: true };
  }

  async createFinancialReminder(input: { studentId: string; sourceKey: string; topic: string; title: string; body: string }) {
    if (!notificationFlags.dispatchEnabled) return [];
    return this.repository.createForStudentParents({ ...input, href: '/reminders' });
  }
}

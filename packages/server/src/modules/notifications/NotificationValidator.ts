import { Err, I18n, Service } from '../../najm';

@Service()
export class PersonalNotificationValidator {
  @I18n('notifications.errors') private et!: (key: string) => string;
  ensureNotificationExists<T>(notification: T | null | undefined): T {
    if (!notification) Err(404, this.et('notFound'));
    return notification;
  }

  ensureSubscriptionRemoved(removed: unknown) {
    if (!removed) Err(404, this.et('subscriptionNotFound'));
  }
}

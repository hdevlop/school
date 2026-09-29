import { Err, Service } from '../../najm';

@Service()
export class PersonalNotificationValidator {
  ensureNotificationExists<T>(notification: T | null | undefined): T {
    if (!notification) Err(404, 'Notification not found');
    return notification;
  }

  ensureSubscriptionRemoved(removed: unknown) {
    if (!removed) Err(404, 'Push subscription not found');
  }
}

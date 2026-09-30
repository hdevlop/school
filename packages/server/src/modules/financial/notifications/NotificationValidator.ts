import { Err, t } from '../../../najm';
import { checkCronSecret } from './NotificationRepository';

export function assertCronSecret(provided: string | null | undefined) {
  if (!checkCronSecret(provided)) Err(401, t('financialNotifications.errors.invalidCronSecret'));
}

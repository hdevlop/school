import { Err } from '../../../najm';
import { checkCronSecret } from './NotificationRepository';

export function assertCronSecret(provided: string | null | undefined) {
  if (!checkCronSecret(provided)) Err(401, 'Invalid or missing FINANCIAL_CRON_SECRET');
}

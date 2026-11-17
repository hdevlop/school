import { plugin } from 'najm-core';
import { email, emailConfigFromEnv, type EmailPluginConfig } from 'najm-email';
import { AccountEmailBranding } from '../email/AccountEmailBranding';
import { AccountEmailRepository } from '../email/AccountEmailRepository';
import { env } from '../env';

/** One transport, with School's presentation hook installed for every account email. */
export const schoolEmail = (config: EmailPluginConfig) =>
  plugin('school-email').depends(email(config)).services(AccountEmailRepository, AccountEmailBranding).build();

/**
 * Outgoing mail; the variables are listed on `env.email.transport`. najm-email
 * validates them and logs a failed delivery with no recipient details.
 */
export const emailConfig = () =>
  schoolEmail(emailConfigFromEnv(env.email.transport, { defaultProvider: 'console', defaultFrom: 'noreply@sms.local' }));

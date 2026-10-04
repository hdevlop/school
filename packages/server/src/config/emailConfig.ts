import { email, type EmailPluginConfig, type ProviderConfig } from 'najm-email';

import { envChoice, envFlag, envInt, envString, requireEnv } from './env';

/**
 * Outgoing mail. Without EMAIL_PROVIDER, mail goes to the console, so local
 * development works with no credentials.
 *
 *   EMAIL_PROVIDER           console | memory | resend | sendgrid | smtp (default console)
 *   EMAIL_LOG_LEVEL          console: debug | info (default info)
 *   RESEND_API_KEY           resend
 *   SENDGRID_API_KEY         sendgrid
 *   SENDGRID_SANDBOX_MODE    sendgrid: 1 | true to accept mail without sending it
 *   SMTP_HOST, SMTP_PORT     smtp (port default 587)
 *   SMTP_USER, SMTP_PASS     smtp, both or neither
 *   SMTP_SECURE              smtp: 1 | true for implicit TLS
 *   EMAIL_DEFAULT_FROM       default noreply@sms.local
 *   EMAIL_DEFAULT_REPLY_TO
 *   EMAIL_DEBUG              1 | true
 *   EMAIL_RETRY_ATTEMPTS     default 1
 *   EMAIL_RETRY_DELAY        milliseconds, default 1000
 */

const EMAIL_PROVIDERS = ['console', 'memory', 'resend', 'sendgrid', 'smtp'] as const;
const DEFAULT_EMAIL_FROM = 'noreply@sms.local';
const FOR_PROVIDER = 'for the configured email provider';

function resolveEmailProvider(): ProviderConfig {
  const provider = envChoice('EMAIL_PROVIDER', process.env.EMAIL_PROVIDER, EMAIL_PROVIDERS, 'console');
  switch (provider) {
    case 'console':
      return {
        provider,
        logLevel: process.env.EMAIL_LOG_LEVEL === 'debug' ? 'debug' : 'info',
      };
    case 'memory':
      return { provider };
    case 'resend':
      return {
        provider,
        apiKey: requireEnv('RESEND_API_KEY', process.env.RESEND_API_KEY, FOR_PROVIDER),
      };
    case 'sendgrid':
      return {
        provider,
        apiKey: requireEnv('SENDGRID_API_KEY', process.env.SENDGRID_API_KEY, FOR_PROVIDER),
        sandboxMode: envFlag(process.env.SENDGRID_SANDBOX_MODE),
      };
    case 'smtp': {
      const user = envString(process.env.SMTP_USER);
      const pass = envString(process.env.SMTP_PASS);
      if (Boolean(user) !== Boolean(pass)) {
        throw new Error('SMTP_USER and SMTP_PASS must be configured together.');
      }
      return {
        provider,
        host: requireEnv('SMTP_HOST', process.env.SMTP_HOST, FOR_PROVIDER),
        port: envInt('SMTP_PORT', process.env.SMTP_PORT, { fallback: 587, min: 1, max: 65_535 }),
        secure: envFlag(process.env.SMTP_SECURE),
        auth: user && pass ? { user, pass } : undefined,
      };
    }
  }
}

/**
 * Resolve the provider in application code so Next's production bundler does
 * not have to preserve dynamic environment reads inside najm-email. najm-auth
 * receives the same object; see authConfig.
 */
export function resolveEmailConfig(): EmailPluginConfig {
  return {
    provider: resolveEmailProvider(),
    defaultFrom: envString(process.env.EMAIL_DEFAULT_FROM) ?? DEFAULT_EMAIL_FROM,
    defaultReplyTo: process.env.EMAIL_DEFAULT_REPLY_TO,
    debug: envFlag(process.env.EMAIL_DEBUG),
    retry: {
      attempts: envInt('EMAIL_RETRY_ATTEMPTS', process.env.EMAIL_RETRY_ATTEMPTS, { fallback: 1, min: 1 }),
      delay: envInt('EMAIL_RETRY_DELAY', process.env.EMAIL_RETRY_DELAY, { fallback: 1_000 }),
    },
  };
}

export const emailConfig = () => email(resolveEmailConfig());

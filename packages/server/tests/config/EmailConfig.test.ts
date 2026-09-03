import { afterEach, describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

import { resolveEmailConfig } from '@server/config';

const EMAIL_ENV_KEYS = [
  'EMAIL_PROVIDER',
  'EMAIL_DEFAULT_FROM',
  'EMAIL_DEFAULT_REPLY_TO',
  'EMAIL_DEBUG',
  'EMAIL_LOG_LEVEL',
  'EMAIL_RETRY_ATTEMPTS',
  'EMAIL_RETRY_DELAY',
  'RESEND_API_KEY',
  'SENDGRID_API_KEY',
  'SENDGRID_SANDBOX_MODE',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
] as const;

const originalEnv = Object.fromEntries(
  EMAIL_ENV_KEYS.map((key) => [key, process.env[key]]),
);

/** Placeholder credentials only — never read or assert on a real secret. */
function withEnv(values: Partial<Record<(typeof EMAIL_ENV_KEYS)[number], string>>) {
  for (const key of EMAIL_ENV_KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(values)) process.env[key] = value;
}

afterEach(() => {
  for (const key of EMAIL_ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('email provider resolution', () => {
  it('falls back to the console transport and School default sender', () => {
    withEnv({});

    expect(resolveEmailConfig()).toEqual({
      provider: { provider: 'console', logLevel: 'info' },
      defaultFrom: 'noreply@sms.local',
      defaultReplyTo: undefined,
      debug: false,
      retry: { attempts: 1, delay: 1_000 },
    });
  });

  it('reads the console log level and keeps a configured sender', () => {
    withEnv({
      EMAIL_PROVIDER: ' Console ',
      EMAIL_LOG_LEVEL: 'debug',
      EMAIL_DEFAULT_FROM: 'School <no-reply@example.test>',
      EMAIL_DEFAULT_REPLY_TO: 'replies@example.test',
      EMAIL_DEBUG: 'true',
    });

    expect(resolveEmailConfig()).toMatchObject({
      provider: { provider: 'console', logLevel: 'debug' },
      defaultFrom: 'School <no-reply@example.test>',
      defaultReplyTo: 'replies@example.test',
      debug: true,
    });
  });

  it('resolves the memory transport for tests', () => {
    withEnv({ EMAIL_PROVIDER: 'memory' });

    expect(resolveEmailConfig().provider).toEqual({ provider: 'memory' });
  });

  it('requires an API key for resend', () => {
    withEnv({ EMAIL_PROVIDER: 'resend' });
    expect(() => resolveEmailConfig()).toThrow(/RESEND_API_KEY is required/);

    withEnv({ EMAIL_PROVIDER: 'resend', RESEND_API_KEY: '   ' });
    expect(() => resolveEmailConfig()).toThrow(/RESEND_API_KEY is required/);

    withEnv({ EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'placeholder-key' });
    expect(resolveEmailConfig().provider).toEqual({
      provider: 'resend',
      apiKey: 'placeholder-key',
    });
  });

  it('requires an API key for sendgrid and carries the sandbox flag', () => {
    withEnv({ EMAIL_PROVIDER: 'sendgrid' });
    expect(() => resolveEmailConfig()).toThrow(/SENDGRID_API_KEY is required/);

    withEnv({
      EMAIL_PROVIDER: 'sendgrid',
      SENDGRID_API_KEY: 'placeholder-key',
      SENDGRID_SANDBOX_MODE: '1',
    });
    expect(resolveEmailConfig().provider).toEqual({
      provider: 'sendgrid',
      apiKey: 'placeholder-key',
      sandboxMode: true,
    });
  });

  it('requires an SMTP host and defaults the port to 587', () => {
    withEnv({ EMAIL_PROVIDER: 'smtp' });
    expect(() => resolveEmailConfig()).toThrow(/SMTP_HOST is required/);

    withEnv({ EMAIL_PROVIDER: 'smtp', SMTP_HOST: 'smtp.example.test' });
    expect(resolveEmailConfig().provider).toEqual({
      provider: 'smtp',
      host: 'smtp.example.test',
      port: 587,
      secure: false,
      auth: undefined,
    });
  });

  it('rejects an out-of-range or non-numeric SMTP port', () => {
    for (const port of ['0', '70000', 'not-a-port', '587.5']) {
      withEnv({ EMAIL_PROVIDER: 'smtp', SMTP_HOST: 'smtp.example.test', SMTP_PORT: port });
      expect(() => resolveEmailConfig()).toThrow(/SMTP_PORT must be a whole number/);
    }
  });

  it('requires SMTP_USER and SMTP_PASS together', () => {
    withEnv({
      EMAIL_PROVIDER: 'smtp',
      SMTP_HOST: 'smtp.example.test',
      SMTP_USER: 'mailer',
    });
    expect(() => resolveEmailConfig()).toThrow(/SMTP_USER and SMTP_PASS/);

    withEnv({
      EMAIL_PROVIDER: 'smtp',
      SMTP_HOST: 'smtp.example.test',
      SMTP_PASS: 'placeholder-pass',
    });
    expect(() => resolveEmailConfig()).toThrow(/SMTP_USER and SMTP_PASS/);

    withEnv({
      EMAIL_PROVIDER: 'smtp',
      SMTP_HOST: 'smtp.example.test',
      SMTP_PORT: '465',
      SMTP_SECURE: 'true',
      SMTP_USER: 'mailer',
      SMTP_PASS: 'placeholder-pass',
    });
    expect(resolveEmailConfig().provider).toEqual({
      provider: 'smtp',
      host: 'smtp.example.test',
      port: 465,
      secure: true,
      auth: { user: 'mailer', pass: 'placeholder-pass' },
    });
  });

  it('rejects a provider the plugin is not configured for', () => {
    for (const provider of ['mailgun', 'ses', 'postmark', 'smtps']) {
      withEnv({ EMAIL_PROVIDER: provider });
      expect(() => resolveEmailConfig()).toThrow(/Unsupported EMAIL_PROVIDER/);
    }
  });

  it('falls back to sane retry values when the env holds nonsense', () => {
    withEnv({ EMAIL_RETRY_ATTEMPTS: '-3', EMAIL_RETRY_DELAY: 'soon' });

    expect(resolveEmailConfig().retry).toEqual({ attempts: 1, delay: 1_000 });

    withEnv({ EMAIL_RETRY_ATTEMPTS: '3', EMAIL_RETRY_DELAY: '250' });

    expect(resolveEmailConfig().retry).toEqual({ attempts: 3, delay: 250 });
  });
});

describe('email configuration reaches both plugins', () => {
  it('validates through the same resolver on the email and auth paths', async () => {
    const { authConfig, emailConfig } = await import('@server/config');

    withEnv({ EMAIL_PROVIDER: 'resend' });

    // A provider School cannot satisfy must fail identically wherever it is
    // wired, so Najm Auth can never fall back to a different transport.
    expect(() => emailConfig()).toThrow(/RESEND_API_KEY is required/);
    expect(() => authConfig()).toThrow(/RESEND_API_KEY is required/);
  });

  it('hands Najm Auth the resolved configuration rather than a second read', () => {
    const source = readFileSync(new URL('../../src/config/index.ts', import.meta.url), 'utf8');

    expect(source).toContain('email(resolveEmailConfig())');
    expect(source).toContain('email: resolveEmailConfig(),');
    expect(source).not.toContain("process.env.EMAIL_PROVIDER as any");
  });
});

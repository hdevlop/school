import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import { AccessResetService } from '@server/modules/accessReset/AccessResetService';

/**
 * What the command reports and records.
 *
 * Constructed by hand rather than through the container, so `@Transaction()`
 * does no wrapping here: these prove delivery truthfulness, the per-target
 * cooldown and audit privacy, NOT the atomicity of the parent path. That
 * needs a real PostgreSQL run.
 */

const ACTOR = { id: 'actor-1', role: 'admin' };

type Fakes = {
  mode?: string;
  temporaryCredential?: string;
  delivery?: { emailSent: boolean; undeliveredLinkLive: boolean };
  resolveThrows?: Error;
  authThrows?: Error;
  auditThrows?: Error;
};

const build = (fakes: Fakes = {}) => {
  const audits: any[] = [];
  const authCalls: any[] = [];
  const cacheCounts = new Map<string, number>();

  const mode = fakes.mode ?? 'reset_email_sent';

  const repository = {
    recordAudit: async (entry: any) => {
      if (fakes.auditThrows) throw fakes.auditThrows;
      audits.push(entry);
    },
  };

  const validator = {
    resolveTarget: async () => {
      if (fakes.resolveThrows) throw fakes.resolveThrows;
      return {
        account: { id: 'user-1', name: 'Target', email: 'target@example.com', status: 'active', roleName: 'parent' },
        mode,
        temporaryCredential: fakes.temporaryCredential,
      };
    },
    ensureConfirmationFresh: () => undefined,
  };

  const delivery = fakes.delivery ?? { emailSent: true, undeliveredLinkLive: false };

  const authService = {
    resetToTemporaryCredential: async (userId: string, credential: any) => {
      if (fakes.authThrows) throw fakes.authThrows;
      authCalls.push({ method: 'resetToTemporaryCredential', userId, credential });
      return { userId, purpose: 'password-setup', temporaryCredentialKind: 'ma-cin' };
    },
    sendPasswordReset: async (userId: string) => {
      if (fakes.authThrows) throw fakes.authThrows;
      authCalls.push({ method: 'sendPasswordReset', userId });
      return { userId, ...delivery };
    },
    resendInvitation: async (userId: string) => {
      if (fakes.authThrows) throw fakes.authThrows;
      authCalls.push({ method: 'resendInvitation', userId });
      return { userId, ...delivery };
    },
  };

  const cache = {
    incr: async (key: string) => {
      const next = (cacheCounts.get(key) ?? 0) + 1;
      cacheCounts.set(key, next);
      return { count: next, resetAt: Date.now() + 60_000 };
    },
    del: async (key: string) => cacheCounts.delete(key),
  };

  const service = new AccessResetService(
    repository as any,
    validator as any,
    authService as any,
    cache as any,
  );
  (service as any).at = (key: string) => key;

  return { service, audits, authCalls, cacheCounts };
};

const BODY = { reason: 'Parent lost access after a phone change', expectedMode: 'reset_email_sent' as any };

let previousProvider: string | undefined;

beforeEach(() => {
  previousProvider = process.env.EMAIL_PROVIDER;
});

afterEach(() => {
  if (previousProvider === undefined) delete process.env.EMAIL_PROVIDER;
  else process.env.EMAIL_PROVIDER = previousProvider;
});

describe('AccessResetService — truthful delivery', () => {
  it('reports a real transport that accepted the message as sent', async () => {
    process.env.EMAIL_PROVIDER = 'resend';
    process.env.RESEND_API_KEY = 'test-key';
    const { service } = build();
    const result = await service.resetAccess('user-1', BODY, ACTOR);
    expect(result.delivery).toBe('sent');
  });

  it('never calls a console transport a delivery', async () => {
    process.env.EMAIL_PROVIDER = 'console';
    const { service } = build();
    expect((await service.resetAccess('user-1', BODY, ACTOR)).delivery).toBe('simulated');
  });

  it('never calls a memory transport a delivery', async () => {
    process.env.EMAIL_PROVIDER = 'memory';
    const { service } = build();
    expect((await service.resetAccess('user-1', BODY, ACTOR)).delivery).toBe('simulated');
  });

  it('reports a refused send as not_sent and audits it as a failure', async () => {
    process.env.EMAIL_PROVIDER = 'console';
    const { service, audits } = build({ delivery: { emailSent: false, undeliveredLinkLive: false } });
    const result = await service.resetAccess('user-1', BODY, ACTOR);
    expect(result.delivery).toBe('not_sent');
    expect(audits[0].status).toBe('failure');
  });

  it('lets a failed send be retried immediately instead of holding the cooldown', async () => {
    process.env.EMAIL_PROVIDER = 'console';
    const { service, cacheCounts } = build({ delivery: { emailSent: false, undeliveredLinkLive: false } });
    await service.resetAccess('user-1', BODY, ACTOR);
    expect([...cacheCounts.keys()]).toHaveLength(0);
  });

  it('marks the CIN path not_applicable — it sends nothing', async () => {
    const { service, authCalls } = build({ mode: 'parent_credential_setup', temporaryCredential: 'bb46123' });
    const result = await service.resetAccess(
      'user-1',
      { ...BODY, expectedMode: 'parent_credential_setup' as any },
      ACTOR,
    );
    expect(result.delivery).toBe('not_applicable');
    expect(authCalls[0].method).toBe('resetToTemporaryCredential');
    expect(authCalls[0].credential).toEqual({ kind: 'ma-cin', value: 'bb46123' });
  });

  it('resends an invitation through the invitation method, not the reset one', async () => {
    process.env.EMAIL_PROVIDER = 'console';
    const { service, authCalls } = build({ mode: 'invitation_resent' });
    await service.resetAccess('user-1', { ...BODY, expectedMode: 'invitation_resent' as any }, ACTOR);
    expect(authCalls[0].method).toBe('resendInvitation');
  });
});

describe('AccessResetService — undelivered link anomaly', () => {
  it('records the value-free flag when a link was minted but not delivered or cleaned', async () => {
    process.env.EMAIL_PROVIDER = 'console';
    const { service, audits } = build({ delivery: { emailSent: false, undeliveredLinkLive: true } });
    await service.resetAccess('user-1', BODY, ACTOR);
    expect(audits[0].undeliveredLinkLive).toBe(true);
  });

  it('omits the flag entirely when nothing anomalous happened', async () => {
    process.env.EMAIL_PROVIDER = 'console';
    const { service, audits } = build();
    await service.resetAccess('user-1', BODY, ACTOR);
    expect('undeliveredLinkLive' in audits[0]).toBe(false);
  });
});

describe('AccessResetService — per-target cooldown', () => {
  it('refuses a second command for the same target inside the window', async () => {
    process.env.EMAIL_PROVIDER = 'console';
    const { service } = build();
    await service.resetAccess('user-1', BODY, ACTOR);
    await expect(service.resetAccess('user-1', BODY, ACTOR)).rejects.toThrow(/cooldown/);
  });

  it('serializes parallel clicks: only one gets through', async () => {
    process.env.EMAIL_PROVIDER = 'console';
    const { service, authCalls } = build();
    const results = await Promise.allSettled([
      service.resetAccess('user-1', BODY, ACTOR),
      service.resetAccess('user-1', BODY, ACTOR),
      service.resetAccess('user-1', BODY, ACTOR),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(authCalls).toHaveLength(1);
  });

  it('does not spend the cooldown on a refusal, so a corrected retry is possible', async () => {
    const { service, cacheCounts } = build({ resolveThrows: new Error('staleConfirmation') });
    await expect(service.resetAccess('user-1', BODY, ACTOR)).rejects.toThrow(/staleConfirmation/);
    expect([...cacheCounts.keys()]).toHaveLength(0);
  });

  it('reopens the window when the send itself threw and nothing left', async () => {
    process.env.EMAIL_PROVIDER = 'console';
    const { service, cacheCounts } = build({ authThrows: new Error('no email on this account') });
    await expect(service.resetAccess('user-1', BODY, ACTOR)).rejects.toThrow(/no email/);
    expect([...cacheCounts.keys()]).toHaveLength(0);
  });

  it('holds the window when the mail left but the audit write failed', async () => {
    process.env.EMAIL_PROVIDER = 'console';
    const { service, cacheCounts } = build({ auditThrows: new Error('audit_logs unavailable') });
    // The administrator is told, because a sent mail with no record is a real
    // partial failure — but the cooldown stays so a retry cannot double-send.
    await expect(service.resetAccess('user-1', BODY, ACTOR)).rejects.toThrow(/audit_logs unavailable/);
    expect([...cacheCounts.keys()]).toHaveLength(1);
  });
});

describe('AccessResetService — refusals leave nothing behind', () => {
  it('writes no audit and sends no mail when eligibility is refused', async () => {
    const { service, audits, authCalls } = build({ resolveThrows: new Error('profileMissing') });
    await expect(service.resetAccess('user-1', BODY, ACTOR)).rejects.toThrow(/profileMissing/);
    expect(audits).toHaveLength(0);
    expect(authCalls).toHaveLength(0);
  });

  it('writes no success audit when the Najm call itself fails', async () => {
    process.env.EMAIL_PROVIDER = 'console';
    const { service, audits } = build({ authThrows: new Error('no email on this account') });
    await expect(service.resetAccess('user-1', BODY, ACTOR)).rejects.toThrow(/no email/);
    expect(audits).toHaveLength(0);
  });
});

describe('AccessResetService — audit privacy', () => {
  it('records who, whom, why, the mode and the outcome, and nothing secret', async () => {
    const { service, audits } = build({ mode: 'parent_credential_setup', temporaryCredential: 'bb46123' });
    await service.resetAccess(
      'user-1',
      { reason: 'Parent lost their password', expectedMode: 'parent_credential_setup' as any },
      ACTOR,
    );

    const entry = audits[0];
    expect(entry.actorId).toBe('actor-1');
    expect(entry.targetUserId).toBe('user-1');
    expect(entry.mode).toBe('parent_credential_setup');
    expect(entry.status).toBe('success');
    expect(entry.reason).toBe('Parent lost their password');

    // No credential, CIN, token, link or email body may appear anywhere in it.
    const serialized = JSON.stringify(entry).toLowerCase();
    expect(serialized).not.toContain('bb46123');
    expect(serialized).not.toContain('token');
    expect(serialized).not.toContain('password-setup');
    expect(serialized).not.toContain('http');
    expect(serialized).not.toContain('target@example.com');
  });
});

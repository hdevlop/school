import { describe, expect, it } from 'bun:test';

import { resolveExpectedMode } from './accessResetModes';

/**
 * What the confirmation dialog is allowed to promise.
 *
 * A row the dialog cannot explain with one honest sentence resolves to `null`,
 * and the dialog then shows an unsupported state instead of a confirm button.
 * None of this decides what happens — the server re-resolves from the account
 * itself and refuses when the two disagree.
 */
describe('resolveExpectedMode', () => {
  it('explains an active parent as a CIN credential setup', () => {
    expect(resolveExpectedMode({ id: 'u', role: 'parent', status: 'active' })).toBe(
      'parent_credential_setup',
    );
  });

  it('explains a pending parent as an invitation resend, never as a CIN reset', () => {
    expect(resolveExpectedMode({ id: 'u', role: 'parent', status: 'pending' })).toBe(
      'invitation_resent',
    );
  });

  it('explains active students, teachers and staff as a reset email', () => {
    for (const role of ['student', 'teacher', 'secretary', 'nurse', 'driver', 'accounting']) {
      expect(resolveExpectedMode({ id: 'u', role, status: 'active' })).toBe('reset_email_sent');
    }
  });

  it('explains any pending profiled account as an invitation resend', () => {
    for (const role of ['student', 'teacher', 'librarian']) {
      expect(resolveExpectedMode({ id: 'u', role, status: 'pending' })).toBe('invitation_resent');
    }
  });

  it('offers nothing for an administrator target', () => {
    expect(resolveExpectedMode({ id: 'u', role: 'admin', status: 'active' })).toBeNull();
  });

  it('offers nothing for an inactive account', () => {
    expect(resolveExpectedMode({ id: 'u', role: 'parent', status: 'inactive' })).toBeNull();
  });

  it('offers nothing when the row carries no role or status', () => {
    expect(resolveExpectedMode({ id: 'u', role: null, status: 'active' })).toBeNull();
    expect(resolveExpectedMode({ id: 'u', role: 'parent', status: null })).toBeNull();
    expect(resolveExpectedMode({ id: 'u' })).toBeNull();
  });

  it('offers nothing for a role it does not recognise', () => {
    expect(resolveExpectedMode({ id: 'u', role: 'auditor', status: 'active' })).toBeNull();
  });
});

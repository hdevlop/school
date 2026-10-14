import { describe, expect, it } from 'bun:test';

import { invitationNotice } from '@/shared/invitationNotice';

describe('invitationNotice', () => {
  it('says whether the activation mail left', () => {
    expect(invitationNotice(true, 'a@example.com')).toBe('sent');
    expect(invitationNotice(false, 'a@example.com')).toBe('notSent');
  });

  // A parent or student created without an email used to be told
  // "Invitation email sent to ." — there was no mail to announce.
  it('says nothing for a record without an email address', () => {
    expect(invitationNotice(true, '')).toBeNull();
    expect(invitationNotice(false, '   ')).toBeNull();
    expect(invitationNotice(true, undefined)).toBeNull();
  });

  it('says nothing when no invitation was attempted', () => {
    expect(invitationNotice(undefined, 'a@example.com')).toBeNull();
  });
});

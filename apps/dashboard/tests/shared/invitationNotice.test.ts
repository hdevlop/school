import { describe, expect, it, mock, spyOn } from 'bun:test';
import { toast } from 'sonner';

import { announceInvitation, invitationNotice } from '@/shared/invitationNotice';

describe('invitationNotice', () => {
  it('offers recovery for a failed invitation without reporting success', () => {
    const warning = spyOn(toast, 'warning').mockImplementation(() => 'notice');
    const info = spyOn(toast, 'info').mockImplementation(() => 'notice');
    const retry = mock(() => undefined);
    try {
      announceInvitation(false, 'a@example.com', {
        sent: 'Sent', notSent: 'Not sent', notSentAction: { label: 'Reset access', onClick: retry },
      });
      expect(info).not.toHaveBeenCalled();
      expect(warning).toHaveBeenCalledWith('Not sent', {
        action: { label: 'Reset access', onClick: retry }, duration: 10000,
      });
      expect(retry).not.toHaveBeenCalled();
    } finally {
      warning.mockRestore();
      info.mockRestore();
    }
  });

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

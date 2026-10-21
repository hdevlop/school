import { toast } from 'sonner';

/**
 * Which notice, if any, an account creation deserves.
 *
 * `emailSent` is absent when no invitation was sent at all (a seeded account,
 * or a staff role without app access), and then nothing is said. Nothing is
 * said either for a record without an email address: there is no mail to
 * announce, and "sent to ." misled more than it told.
 */
export function invitationNotice(
  emailSent: unknown,
  email: string | null | undefined,
): 'sent' | 'notSent' | null {
  if (!email?.trim()) return null;
  if (emailSent === true) return 'sent';
  if (emailSent === false) return 'notSent';
  return null;
}

/**
 * An account created from the dashboard waits as pending until its owner
 * follows the emailed activation link and chooses a password. Say whether that
 * mail left, so a failed send is re-sent from Reset access instead of waited
 * on.
 *
 * The caller passes both messages already translated, so every key stays a
 * literal the i18n check can see.
 */
export function announceInvitation(
  emailSent: unknown,
  email: string | null | undefined,
  messages: {
    sent: string;
    notSent: string;
    notSentAction?: { label: string; onClick: () => void };
  },
) {
  const notice = invitationNotice(emailSent, email);
  if (notice === 'sent') toast.info(messages.sent);
  else if (notice === 'notSent') toast.warning(messages.notSent, {
    action: messages.notSentAction,
    duration: 10000,
  });
}

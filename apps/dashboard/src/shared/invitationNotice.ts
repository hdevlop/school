import { toast } from 'sonner';

/**
 * An account created from the dashboard waits as pending until its owner
 * follows the emailed activation link and chooses a password. Say whether that
 * mail left, so a failed send is re-sent from Reset access instead of waited
 * on. `emailSent` is absent when no invitation was sent at all (a seeded
 * account, or a staff role without app access), and then nothing is said.
 *
 * The caller passes both messages already translated, so every key stays a
 * literal the i18n check can see.
 */
export function announceInvitation(
  emailSent: unknown,
  messages: { sent: string; notSent: string },
) {
  if (emailSent === true) toast.info(messages.sent);
  else if (emailSent === false) toast.warning(messages.notSent);
}

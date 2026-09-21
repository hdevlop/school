import type { AccessResetMode } from '../hooks/useResetUserAccess';

export type AccessResetRow = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  status?: string | null;
};

/**
 * Roles whose recovery runs through the account's own mailbox. Parents are
 * absent on purpose: an active parent is recovered with the CIN already on
 * file, which is a different consequence and a different sentence.
 */
export const MAIL_RECOVERABLE_ROLES = new Set([
  'student',
  'teacher',
  'principal',
  'accounting',
  'counselor',
  'nurse',
  'secretary',
  'librarian',
  'driver',
  'assistant',
]);

/**
 * Which single consequence this row can be explained with.
 *
 * The list row carries a role and a status and nothing else — no profile, and
 * certainly no CIN — so this is what the dialog may *describe*, never what the
 * server will do. The server resolves the real mode from freshly loaded state
 * and refuses when the two disagree. `null` means the row cannot be explained
 * with one honest sentence, and the dialog then offers no confirm at all
 * rather than an ambiguous one.
 */
export const resolveExpectedMode = (user: AccessResetRow): AccessResetMode | null => {
  const role = user?.role ?? null;
  const status = user?.status ?? null;

  if (!role || role === 'admin') return null;
  if (status !== 'active' && status !== 'pending') return null;

  // A pending account has never chosen a password, so the invitation it was
  // already sent is the only thing worth repeating — for a parent too.
  if (status === 'pending') {
    return role === 'parent' || MAIL_RECOVERABLE_ROLES.has(role) ? 'invitation_resent' : null;
  }

  if (role === 'parent') return 'parent_credential_setup';
  return MAIL_RECOVERABLE_ROLES.has(role) ? 'reset_email_sent' : null;
};

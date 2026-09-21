import { isMoroccanCin, normalizeMoroccanCin } from 'najm-auth';

import { Err, I18n, Service } from '@server/najm';
import { AccessResetRepository, type AccessResetAccount } from './AccessResetRepository';
import type { AccessResetMode } from './AccessResetDto';

export type AccessResetActor = {
  id: string;
  role?: string | null;
};

/**
 * Staff roles whose HR row carries the login. Teachers are staff too, but they
 * additionally have to resolve through `teachers.staffId`, so they are handled
 * separately rather than listed here.
 */
const STAFF_ACCESS_ROLES = new Set([
  'principal',
  'accounting',
  'counselor',
  'nurse',
  'secretary',
  'librarian',
  'driver',
  'assistant',
]);

/** A staff member on leave still holds a working login; a terminated one does not. */
const CURRENT_STAFF_STATUSES = new Set(['active', 'onLeave']);

export type ResolvedAccessTarget = {
  account: AccessResetAccount;
  mode: AccessResetMode;
  /** Normalized CIN for the parent path only. Never leaves the server. */
  temporaryCredential?: string;
};

@Service()
export class AccessResetValidator {
  @I18n('accessReset.errors') private at!: (key: string) => string;

  constructor(private accessResetRepository: AccessResetRepository) {}

  /**
   * Resolve what this command may do, from state loaded at execution time.
   *
   * Nothing the client sent reaches this decision. An account class this school
   * cannot prove — notably a profileless one, whose origin the `users` table
   * does not record — is refused rather than guessed at, and no refusal
   * reactivates, repairs or re-links anything as a side effect.
   */
  async resolveTarget(userId: string, actor: AccessResetActor): Promise<ResolvedAccessTarget> {
    const account = await this.accessResetRepository.getAccount(userId);
    if (!account) Err(404, this.at('notFound'));

    if (account.id === actor.id) Err(403, this.at('selfReset'));

    const role = account.roleName;
    if (!role) Err(409, this.at('unknownRole'));
    if (role === 'admin') Err(403, this.at('adminTarget'));

    const status = account.status;
    if (status !== 'active' && status !== 'pending') Err(409, this.at('inactiveAccount'));

    if (role === 'parent') return this.resolveParent(account, status);
    if (role === 'student') return this.resolveStudent(account, status);
    if (role === 'teacher') return this.resolveTeacher(account, status);
    if (STAFF_ACCESS_ROLES.has(role)) return this.resolveStaff(account, status);

    Err(409, this.at('unknownRole'));
  }

  private async resolveParent(
    account: AccessResetAccount,
    status: 'active' | 'pending',
  ): Promise<ResolvedAccessTarget> {
    const parent = await this.accessResetRepository.getParentByUserId(account.id);
    if (!parent) Err(409, this.at('profileMissing'));

    // A pending parent has never signed in, so there is no credential worth
    // replacing — the invitation they were already sent is what they need.
    if (status === 'pending') return { account, mode: 'invitation_resent' };

    const cin = parent.cin?.trim();
    if (!cin) Err(409, this.at('parentCinMissing'));
    if (!isMoroccanCin(cin)) Err(409, this.at('parentCinInvalid'));

    return {
      account,
      mode: 'parent_credential_setup',
      temporaryCredential: normalizeMoroccanCin(cin),
    };
  }

  private async resolveStudent(
    account: AccessResetAccount,
    status: 'active' | 'pending',
  ): Promise<ResolvedAccessTarget> {
    const student = await this.accessResetRepository.getStudentByUserId(account.id);
    if (!student) Err(409, this.at('profileMissing'));

    // Enrolment status is tracked apart from the login: a graduated or
    // transferred student keeps a row, but is not someone to restore access for.
    if (student.status !== 'active') Err(409, this.at('profileNotCurrent'));

    return { account, mode: status === 'pending' ? 'invitation_resent' : 'reset_email_sent' };
  }

  private async resolveTeacher(
    account: AccessResetAccount,
    status: 'active' | 'pending',
  ): Promise<ResolvedAccessTarget> {
    const staffRow = await this.ensureStaffRow(account);

    // `teachers` has no user of its own: it hangs off the staff row that holds
    // the login. Both links must land on this same account, or the chain is
    // orphaned and this is not a target.
    const teacher = await this.accessResetRepository.getTeacherByStaffId(staffRow.id);
    if (!teacher) Err(409, this.at('teacherChainMismatch'));

    return { account, mode: status === 'pending' ? 'invitation_resent' : 'reset_email_sent' };
  }

  private async resolveStaff(
    account: AccessResetAccount,
    status: 'active' | 'pending',
  ): Promise<ResolvedAccessTarget> {
    await this.ensureStaffRow(account);
    return { account, mode: status === 'pending' ? 'invitation_resent' : 'reset_email_sent' };
  }

  private async ensureStaffRow(account: AccessResetAccount) {
    const staffRow = await this.accessResetRepository.getStaffByUserId(account.id);
    if (!staffRow) Err(409, this.at('profileMissing'));
    if (staffRow.userId !== account.id) Err(409, this.at('profileMismatch'));
    if (!staffRow.accessRoleId) Err(409, this.at('staffNoLogin'));
    if (!CURRENT_STAFF_STATUSES.has(staffRow.status)) Err(409, this.at('profileNotCurrent'));
    if (staffRow.role !== account.roleName || staffRow.accessRoleId !== account.roleId) {
      Err(409, this.at('profileMismatch'));
    }
    return staffRow;
  }

  /**
   * The confirmation the administrator saw must still describe what the server
   * has now decided to do. Anything else is refused before any mutation or send.
   */
  ensureConfirmationFresh(expected: AccessResetMode, resolved: AccessResetMode) {
    if (expected !== resolved) Err(409, this.at('staleConfirmation'));
  }
}

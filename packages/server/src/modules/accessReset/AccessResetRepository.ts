import { DB } from '../../database/db';
import {
  auditLogs,
  parents,
  roles,
  staff,
  staffRoles,
  students,
  teachers,
  users,
} from '../../database/schema';
import { Repository } from '../../najm';
import { eq, inArray } from 'drizzle-orm';

export type AccessResetAccount = {
  id: string;
  name: string | null;
  email: string;
  status: 'active' | 'inactive' | 'pending' | null;
  roleId: string | null;
  roleName: string | null;
};

export type AccessResetAuditEntry = {
  actorId: string;
  actorRole: string;
  targetUserId: string;
  reason: string;
  mode: string;
  status: 'success' | 'failure';
  outcome: string;
  /** Value-free anomaly flag; present only when Najm reported it. */
  undeliveredLinkLive?: boolean;
};

/**
 * Every lookup here is keyed by the target's user id, read at command time.
 * Nothing on the request body reaches a query, so neither a stale table row nor
 * a crafted payload can redirect the command at another account.
 */
@Repository()
export class AccessResetRepository {
  declare db: DB;

  /**
   * Lock every row the eligibility decision is read from.
   *
   * Locking `users` alone is not enough: a CIN-only edit updates `parents`
   * directly and never touches `users`, so it could change the very value
   * about to be hashed between the re-resolution and the credential write.
   * The same holds for the student, staff and teacher rows the other modes
   * are resolved from.
   *
   * Rows that do not exist lock nothing, which is the correct no-op. The
   * order is fixed — users, parents, students, staff, teachers — so two
   * concurrent commands always take these in the same sequence and cannot
   * deadlock against each other.
   */
  async lockTarget(userId: string) {
    await this.db.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');

    await this.db
      .select({ id: parents.id })
      .from(parents)
      .where(eq(parents.userId, userId))
      .for('update');

    await this.db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.userId, userId))
      .for('update');

    await this.db.select({ id: staff.id }).from(staff).where(eq(staff.userId, userId)).for('update');

    await this.db
      .select({ id: teachers.id })
      .from(teachers)
      .where(
        inArray(
          teachers.staffId,
          this.db.select({ id: staff.id }).from(staff).where(eq(staff.userId, userId)),
        ),
      )
      .for('update');
  }

  async getAccount(userId: string): Promise<AccessResetAccount | null> {
    const [row] = await this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        status: users.status,
        roleId: users.roleId,
        roleName: roles.name,
      })
      .from(users)
      .leftJoin(roles, eq(roles.id, users.roleId))
      .where(eq(users.id, userId))
      .limit(1);

    return (row as AccessResetAccount) ?? null;
  }

  /**
   * The parent's stored CIN, read narrowly by user id. It is passed straight to
   * Najm for hashing and is never returned to a caller, logged, or audited.
   */
  async getParentByUserId(userId: string) {
    const [row] = await this.db
      .select({ id: parents.id, cin: parents.cin })
      .from(parents)
      .where(eq(parents.userId, userId))
      .limit(1);

    return row ?? null;
  }

  async getStudentByUserId(userId: string) {
    const [row] = await this.db
      .select({ id: students.id, status: students.status })
      .from(students)
      .where(eq(students.userId, userId))
      .limit(1);

    return row ?? null;
  }

  /**
   * The HR row plus the access role its staff role maps to. A staff role with
   * no `accessRoleId` grants no login, so such a row is not a reset target.
   */
  async getStaffByUserId(userId: string) {
    const [row] = await this.db
      .select({
        id: staff.id,
        userId: staff.userId,
        status: staff.status,
        role: staff.role,
        accessRoleId: staffRoles.accessRoleId,
      })
      .from(staff)
      .leftJoin(staffRoles, eq(staffRoles.code, staff.role))
      .where(eq(staff.userId, userId))
      .limit(1);

    return row ?? null;
  }

  async getTeacherByStaffId(staffId: string) {
    const [row] = await this.db
      .select({ id: teachers.id, staffId: teachers.staffId })
      .from(teachers)
      .where(eq(teachers.staffId, staffId))
      .limit(1);

    return row ?? null;
  }

  /**
   * The security record for this command. It carries who acted, on whom, why,
   * what the server decided and what actually happened — and no credential,
   * CIN, token, link or email body.
   */
  async recordAudit(entry: AccessResetAuditEntry) {
    await this.db.insert(auditLogs).values({
      userId: entry.actorId,
      userRole: entry.actorRole,
      action: 'access.reset',
      resource: 'user-access',
      resourceId: entry.targetUserId,
      status: entry.status,
      ipAddress: null,
      metadata: {
        mode: entry.mode,
        reason: entry.reason,
        outcome: entry.outcome,
        ...(entry.undeliveredLinkLive === undefined
          ? {}
          : { undeliveredLinkLive: entry.undeliveredLinkLive }),
      },
    });
  }
}

import { isNotNull, sql } from 'drizzle-orm';

import { DB } from '../../database/db';
import { parents, staff, students } from '../../database/schema';
import { Repository } from '../../najm';

export type AccountLinkKind = 'student' | 'parent' | 'staff';
export type AccountLink = { userId: string; kind: AccountLinkKind };

/**
 * Which kind of person each login belongs to. Only the account id and the
 * kind leave here: no name, contact or record id.
 */
@Repository()
export class AccountLinkRepository {
  declare db: DB;

  async getAll(): Promise<AccountLink[]> {
    const linked = (kind: AccountLinkKind, table: typeof students | typeof parents | typeof staff) =>
      this.db.select({ userId: sql<string>`${table.userId}`.as('user_id'), kind: sql<AccountLinkKind>`${kind}`.as('kind') })
        .from(table)
        .where(isNotNull(table.userId));
    return linked('student', students)
      .unionAll(linked('parent', parents))
      .unionAll(linked('staff', staff));
  }
}

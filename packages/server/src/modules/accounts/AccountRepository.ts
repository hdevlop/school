import { eq, isNotNull, sql } from 'drizzle-orm';

import { DB } from '../../database/db';
import { parents, staff, students, users } from '../../database/schema';
import { Repository } from '../../najm';

export type AccountLinkKind = 'student' | 'parent' | 'staff';
export type AccountLink = { userId: string; kind: AccountLinkKind };

@Repository()
export class AccountRepository {
  declare db: DB;

  /**
   * Which kind of person each login belongs to. Only the account id and the
   * kind leave here: no name, contact or record id.
   */
  async getLinks(): Promise<AccountLink[]> {
    const linked = (kind: AccountLinkKind, table: typeof students | typeof parents | typeof staff) =>
      this.db.select({ userId: sql<string>`${table.userId}`.as('user_id'), kind: sql<AccountLinkKind>`${kind}`.as('kind') })
        .from(table)
        .where(isNotNull(table.userId));
    return linked('student', students)
      .unionAll(linked('parent', parents))
      .unionAll(linked('staff', staff));
  }

  async getUser(id: string) {
    const [row] = await this.db.select({ id: users.id, image: users.image }).from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  }

  /**
   * The account's photo, and the photo of the student or parent it belongs to:
   * those screens show the same picture. A staff member's photo is the account's.
   */
  async updateImage(userId: string, image: string | null) {
    // A new updated time also changes the avatar's cache version.
    const [user] = await this.db.update(users).set({ image, updatedAt: sql`now()` }).where(eq(users.id, userId)).returning();
    await this.db.update(students).set({ image }).where(eq(students.userId, userId));
    await this.db.update(parents).set({ image }).where(eq(parents.userId, userId));
    return user;
  }
}

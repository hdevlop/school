import { asc, eq } from 'drizzle-orm';
import { Repository } from '../../najm';
import type { DB } from '../../database/db';
import { teacherRequests } from './TeacherRequestSchema';

@Repository()
export class TeacherRequestRepository {
  declare db: DB;

  /** Oldest first: the order they arrived in. */
  list() { return this.db.select().from(teacherRequests).orderBy(asc(teacherRequests.createdAt)); }

  async find(id: string) {
    const [row] = await this.db.select().from(teacherRequests).where(eq(teacherRequests.id, id));
    return row;
  }

  /** Nothing is returned when this address already waits: the first request stands. */
  async create(input: typeof teacherRequests.$inferInsert) {
    const [row] = await this.db.insert(teacherRequests).values(input)
      .onConflictDoNothing({ target: teacherRequests.email }).returning();
    return row;
  }

  async delete(id: string) { await this.db.delete(teacherRequests).where(eq(teacherRequests.id, id)); }
}

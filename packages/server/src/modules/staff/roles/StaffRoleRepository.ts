import { count, eq } from 'drizzle-orm';
import { Repository } from '@server/najm';
import { staff, staffRoles, users } from '@server/database/schema';
import { DB } from '@server/database/db';

const staffRoleSelect = {
  code: staffRoles.code,
  label: staffRoles.label,
  labels: staffRoles.labels,
  category: staffRoles.category,
  sortOrder: staffRoles.sortOrder,
  isSystem: staffRoles.isSystem,
  active: staffRoles.active,
  accessRoleId: staffRoles.accessRoleId,
  createdAt: staffRoles.createdAt,
  updatedAt: staffRoles.updatedAt,
};

@Repository()
export class StaffRoleRepository {
  declare db: DB;

  private buildQuery() {
    return this.db.select(staffRoleSelect).from(staffRoles);
  }

  async getAll() {
    return await this.buildQuery().orderBy(staffRoles.sortOrder, staffRoles.label);
  }

  async getActive() {
    return await this.buildQuery()
      .where(eq(staffRoles.active, true))
      .orderBy(staffRoles.sortOrder, staffRoles.label);
  }

  async getByCode(code: string) {
    const [row] = await this.buildQuery().where(eq(staffRoles.code, code)).limit(1);
    return row || null;
  }

  async create(data: typeof staffRoles.$inferInsert) {
    const [row] = await this.db.insert(staffRoles).values(data).returning();
    return row;
  }

  async upsert(data: typeof staffRoles.$inferInsert) {
    const [row] = await this.db
      .insert(staffRoles)
      .values(data)
      .onConflictDoUpdate({
        target: staffRoles.code,
        set: {
          label: data.label,
          labels: data.labels,
          category: data.category,
          sortOrder: data.sortOrder,
          isSystem: data.isSystem,
          active: data.active,
          accessRoleId: data.accessRoleId,
        },
      })
      .returning();
    return row;
  }

  async update(code: string, data: Partial<typeof staffRoles.$inferInsert>) {
    const [row] = await this.db
      .update(staffRoles)
      .set(data)
      .where(eq(staffRoles.code, code))
      .returning();
    return row;
  }

  async delete(code: string) {
    const [row] = await this.db.delete(staffRoles).where(eq(staffRoles.code, code)).returning();
    return row;
  }

  async countStaffUsing(code: string) {
    const [row] = await this.db
      .select({ value: count() })
      .from(staff)
      .where(eq(staff.role, code));
    return Number(row?.value ?? 0);
  }

  async countUsersUsingAccessRole(roleId: string) {
    const [row] = await this.db
      .select({ value: count() })
      .from(users)
      .where(eq(users.roleId, roleId));
    return Number(row?.value ?? 0);
  }
}

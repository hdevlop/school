import { eq } from 'drizzle-orm';
import { DB } from '../../database/db';
import { accountantAssignments, assistantAssignments, busAssistantAssignments, cleanerAssignments, securityAssignments, staffCredentials } from '../../database/schema';
import { Repository } from '../../najm';

export type StaffAssignmentInput = {
  zoneId?: string;
  classId?: string;
  sectionId?: string | null;
  cycleId?: string;
  vehicleId?: string;
  status?: 'active' | 'completed' | 'cancelled';
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
};

type AssignmentRow = {
  id: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  [column: string]: unknown;
};

// Every role table shares these columns; only the assigned target differs.
type AssignmentTable = typeof cleanerAssignments;

const ROLE_ASSIGNMENTS: Record<string, { table: unknown; target: (item: StaffAssignmentInput) => Record<string, string | null> }> = {
  cleaner: { table: cleanerAssignments, target: (item) => ({ zoneId: item.zoneId! }) },
  security: { table: securityAssignments, target: (item) => ({ zoneId: item.zoneId! }) },
  assistant: { table: assistantAssignments, target: (item) => ({ classId: item.classId!, sectionId: item.sectionId ?? null }) },
  accountant: { table: accountantAssignments, target: (item) => ({ cycleId: item.cycleId! }) },
  busAssistant: { table: busAssistantAssignments, target: (item) => ({ vehicleId: item.vehicleId! }) },
};

/** Active and not ended before `day` (an end date is the assignment's last day). */
export const isCurrentAssignment = (row: { status: string; endDate: string | null }, day: string) =>
  row.status === 'active' && (!row.endDate || row.endDate >= day);

const sameTarget = (row: AssignmentRow, target: Record<string, string | null>) =>
  Object.entries(target).every(([column, value]) => (row[column] ?? null) === value);

@Repository()
export class StaffAssignmentRepository {
  declare db: DB;

  private spec(role: string) {
    const spec = ROLE_ASSIGNMENTS[role];
    return spec ? { table: spec.table as AssignmentTable, target: spec.target } : null;
  }

  async createForRole(role: string, staffId: string, assignments: StaffAssignmentInput[]) {
    const spec = this.spec(role);
    if (!spec || !assignments.length) return [];
    return this.db.insert(spec.table).values(assignments.map((item) => ({
      staffId,
      ...spec.target(item),
      status: item.status ?? 'active',
      startDate: item.startDate ?? null,
      endDate: item.endDate ?? null,
      notes: item.notes ?? null,
    }) as typeof cleanerAssignments.$inferInsert)).returning();
  }

  /**
   * Make `assignments` the staff member's current ones without erasing history.
   * A row keeps its id when it names the same target and start date, or the
   * same target as a current row; others are inserted from `day`. Current rows
   * the request leaves out end on `day`, and ended rows are never touched.
   */
  async syncCurrentForRole(role: string, staffId: string, assignments: StaffAssignmentInput[], day: string) {
    const spec = this.spec(role);
    if (!spec) return;
    const rows = await this.rowsFor(spec.table, staffId);
    const kept = new Set<string>();
    for (const item of assignments) {
      const target = spec.target(item);
      const open = rows.filter((row) => !kept.has(row.id) && sameTarget(row, target));
      const match = open.find((row) => item.startDate && row.startDate === item.startDate)
        ?? open.find((row) => isCurrentAssignment(row, day));
      if (match) {
        kept.add(match.id);
        const patch = Object.fromEntries((['status', 'startDate', 'endDate', 'notes'] as const)
          .filter((column) => item[column] !== undefined)
          .map((column) => [column, item[column] ?? null]));
        if (Object.keys(patch).length) {
          await this.db.update(spec.table).set(patch).where(eq(spec.table.id, match.id));
        }
      } else {
        await this.db.insert(spec.table).values({
          staffId,
          ...target,
          status: item.status ?? 'active',
          startDate: item.startDate ?? day,
          endDate: item.endDate ?? null,
          notes: item.notes ?? null,
        } as typeof cleanerAssignments.$inferInsert);
      }
    }
    await this.end(spec.table, rows.filter((row) => !kept.has(row.id) && isCurrentAssignment(row, day)), day);
  }

  /** A role change ends the old role's current assignments on `day`; its history stays. */
  async endCurrentForRole(role: string, staffId: string, day: string) {
    const spec = this.spec(role);
    if (!spec) return;
    const rows = await this.rowsFor(spec.table, staffId);
    await this.end(spec.table, rows.filter((row) => isCurrentAssignment(row, day)), day);
  }

  private async rowsFor(table: AssignmentTable, staffId: string) {
    return await this.db.select().from(table).where(eq(table.staffId, staffId)) as unknown as AssignmentRow[];
  }

  // A row that has not begun yet never happened, so it goes; one that has
  // begun ends on `day`.
  private async end(table: AssignmentTable, rows: AssignmentRow[], day: string) {
    for (const row of rows) {
      if (row.startDate && row.startDate > day) {
        await this.db.delete(table).where(eq(table.id, row.id));
      } else {
        await this.db.update(table).set({ status: 'completed', endDate: day }).where(eq(table.id, row.id));
      }
    }
  }

  // Remove every assignment row for a staff member across all role tables.
  // Needed before deleting the staff row because the FKs are onDelete: 'restrict'.
  async deleteAllForStaff(staffId: string) {
    for (const role of Object.keys(ROLE_ASSIGNMENTS)) {
      const { table } = this.spec(role)!;
      await this.db.delete(table).where(eq(table.staffId, staffId));
    }
    await this.db.delete(staffCredentials).where(eq(staffCredentials.staffId, staffId));
  }

  /** Trusted all-years reset: remove links before their vehicles, classes or staff. */
  async clearForSeedReset() {
    for (const { table } of Object.values(ROLE_ASSIGNMENTS)) {
      await this.db.delete(table as AssignmentTable);
    }
    await this.db.delete(staffCredentials);
  }
}

import { eq } from 'drizzle-orm';
import { DB } from '@server/database/db';
import { accountantAssignments, assistantAssignments, busAssistantAssignments, cleanerAssignments, securityAssignments, staffCredentials } from '@server/database/schema';
import { Repository } from '@server/najm';

type StaffAssignmentInput = {
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

@Repository()
export class StaffAssignmentRepository {
  declare db: DB;

  async createForRole(role: string, staffId: string, assignments: StaffAssignmentInput[]) {
    if (!assignments.length) return [];

    if (role === 'cleaner') {
      return this.db.insert(cleanerAssignments).values(assignments.map((item) => ({
        staffId,
        zoneId: item.zoneId!,
        status: item.status ?? 'active',
        startDate: item.startDate ?? null,
        endDate: item.endDate ?? null,
        notes: item.notes ?? null,
      }))).returning();
    }

    if (role === 'assistant') {
      return this.db.insert(assistantAssignments).values(assignments.map((item) => ({
        staffId,
        classId: item.classId!,
        sectionId: item.sectionId ?? null,
        status: item.status ?? 'active',
        startDate: item.startDate ?? null,
        endDate: item.endDate ?? null,
        notes: item.notes ?? null,
      }))).returning();
    }

    if (role === 'busAssistant') {
      return this.db.insert(busAssistantAssignments).values(assignments.map((item) => ({
        staffId,
        vehicleId: item.vehicleId!,
        status: item.status ?? 'active',
        startDate: item.startDate ?? null,
        endDate: item.endDate ?? null,
        notes: item.notes ?? null,
      }))).returning();
    }

    if (role === 'accountant') {
      return this.db.insert(accountantAssignments).values(assignments.map((item) => ({
        staffId,
        cycleId: item.cycleId!,
        status: item.status ?? 'active',
        startDate: item.startDate ?? null,
        endDate: item.endDate ?? null,
        notes: item.notes ?? null,
      }))).returning();
    }

    if (role === 'security') {
      return this.db.insert(securityAssignments).values(assignments.map((item) => ({
        staffId,
        zoneId: item.zoneId!,
        status: item.status ?? 'active',
        startDate: item.startDate ?? null,
        endDate: item.endDate ?? null,
        notes: item.notes ?? null,
      }))).returning();
    }

    return [];
  }

  async deleteForRole(role: string, staffId: string) {
    if (role === 'cleaner') {
      return await this.db.delete(cleanerAssignments).where(eq(cleanerAssignments.staffId, staffId)).returning();
    }
    if (role === 'assistant') {
      return await this.db.delete(assistantAssignments).where(eq(assistantAssignments.staffId, staffId)).returning();
    }
    if (role === 'busAssistant') {
      return await this.db.delete(busAssistantAssignments).where(eq(busAssistantAssignments.staffId, staffId)).returning();
    }
    if (role === 'accountant') {
      return await this.db.delete(accountantAssignments).where(eq(accountantAssignments.staffId, staffId)).returning();
    }
    if (role === 'security') {
      return await this.db.delete(securityAssignments).where(eq(securityAssignments.staffId, staffId)).returning();
    }

    return [];
  }

  // Remove every assignment row for a staff member across all role tables.
  // Needed before deleting the staff row because the FKs are onDelete: 'restrict'.
  async deleteAllForStaff(staffId: string) {
    await this.deleteForRole('cleaner', staffId);
    await this.deleteForRole('assistant', staffId);
    await this.deleteForRole('accountant', staffId);
    await this.deleteForRole('security', staffId);
    await this.deleteForRole('busAssistant', staffId);
    await this.db.delete(staffCredentials).where(eq(staffCredentials.staffId, staffId));
  }

  async replaceForRole(role: string, staffId: string, assignments: StaffAssignmentInput[]) {
    await this.deleteForRole(role, staffId);
    return this.createForRole(role, staffId, assignments);
  }
}

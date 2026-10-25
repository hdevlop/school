import { eq, inArray, sql } from 'drizzle-orm';
import { createPostgresSnapshotStore } from 'najm-offline/pg';
import { Repository } from '../../najm';
import type { DB } from '../../database/db';
import { users, roles, permissions, rolePermissions, parents, studentParents } from '../../database/schema';
import { parentSelect } from '../parents/ParentRepository';

@Repository()
export class OfflineRepository {
  declare db: DB;
  async actor(id: string) {
    const [actor] = await this.db.select({ id: users.id, name: users.name, email: users.email,
      image: users.image, status: users.status, role: roles.name, roleId: users.roleId,
      // Relationship changes invalidate every retained scope at the next renewal.
      // A teacher reaches students through every placement of an enrollment
      // placed in one of their sections (Student's teacher rule), so a move
      // into or out of such a section changes the hash too.
      ownership: sql<string>`md5(concat(
        (SELECT coalesce(jsonb_agg(to_jsonb(sp) ORDER BY sp.student_id, sp.parent_id)::text, '')
          FROM student_parents sp JOIN parents p ON p.id = sp.parent_id WHERE p.user_id = ${id}),
        (SELECT coalesce(jsonb_agg(to_jsonb(ta) ORDER BY ta.id)::text, '') FROM teacher_assignments ta
          JOIN teachers t ON t.id = ta.teacher_id JOIN staff s ON s.id = t.staff_id WHERE s.user_id = ${id}),
        (SELECT coalesce(jsonb_agg(jsonb_build_array(e.id, e.student_id, e.academic_year_id,
            p.id, p.section_id, p.valid_from, p.valid_to) ORDER BY p.id)::text, '')
          FROM student_enrollment_placements p JOIN student_enrollments e ON e.id = p.enrollment_id
          WHERE p.enrollment_id IN (SELECT taught.enrollment_id FROM student_enrollment_placements taught
            JOIN teacher_assignments ta ON ta.section_id = taught.section_id
            JOIN teachers t ON t.id = ta.teacher_id JOIN staff s ON s.id = t.staff_id WHERE s.user_id = ${id})),
        (SELECT coalesce(jsonb_agg(st.id ORDER BY st.id)::text, '') FROM students st WHERE st.user_id = ${id})
      ))`,
    }).from(users).innerJoin(roles, eq(roles.id, users.roleId)).where(eq(users.id, id));
    if (!actor) return null;
    const grants = await this.db.select({ name: permissions.name }).from(rolePermissions)
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(eq(rolePermissions.roleId, actor.roleId!));
    return { ...actor, permissions: grants.map(g => g.name).sort() };
  }
  /**
   * StudentRepository.getParentsByStudentId for students the caller already
   * read through ownership, in one query: the same fields and name order.
   */
  async parentsByStudents(studentIds: string[]) {
    const rows = studentIds.length ? await this.db
      .select({ studentId: studentParents.studentId, ...parentSelect })
      .from(studentParents)
      .innerJoin(parents, eq(studentParents.parentId, parents.id))
      .leftJoin(users, eq(parents.userId, users.id))
      .where(inArray(studentParents.studentId, studentIds))
      .orderBy(parents.name) : [];
    const byStudent = new Map<string, Omit<(typeof rows)[number], 'studentId'>[]>(studentIds.map(id => [id, []]));
    for (const { studentId, ...parent } of rows) byStudent.get(studentId)?.push(parent);
    return byStudent;
  }
  async readPermissionNames() {
    return (await this.db.select({ name: permissions.name }).from(permissions)).map(row => row.name).filter(name => name.startsWith('read:'));
  }
  /** Downloads, written and read through the current transaction. */
  readonly snapshots = createPostgresSnapshotStore(() => this.db);
}

import { Repository } from '../../najm';
import { DB } from '../../database/db';
import { students, teachers, staff, parents, users } from '../../database/schema';
import { and, ilike, or, sql, type SQL, type SQLWrapper } from 'drizzle-orm';
import { Owned, type OwnedWhere, ownershipCondition, type ScopeContext } from '../../auth';
import { Student } from '../students/StudentGuards';
import { Teacher } from '../teachers/TeacherGuards';
import { Parent } from '../parents/ParentGuards';

// Arabic letters typed in several forms: hamza on alif, taa marbuta, alif maqsura.
const ARABIC_FROM = 'أإآةى';
const ARABIC_TO = 'اااهي';
const foldArabic = (text: string) => text.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
const folded = (column: SQLWrapper) => sql`translate(${column}, ${ARABIC_FROM}, ${ARABIC_TO})`;

/**
 * A person's name matches when each word of the query appears in one of the
 * name columns, in any order: "Anas Ftita" finds FTITA ANAS, and an Arabic
 * name finds the student's stored Arabic name. The chat searches with what
 * the user typed; Arabic-script names found nothing before (2026-11-16).
 */
export function nameWordsMatch(query: string, columns: SQLWrapper[]): SQL | undefined {
  const words = query.trim().split(/\s+/).filter(Boolean).slice(0, 6);
  if (!words.length) return undefined;
  return and(...words.map((word) => or(...columns.map((column) => ilike(folded(column), `%${foldArabic(word)}%`)))));
}

@Repository()
export class SearchRepository {
  declare db: DB;
  declare _scopeCtx: ScopeContext;
  @Owned(Student)
  private ownedWhere!: OwnedWhere;

  async searchStudents(query: string, limit = 20) {
    const pattern = `%${query}%`;
    return await this.db
      .select({
        id: students.id,
        name: students.name,
        studentCode: students.studentCode,
        gender: students.gender,
        image: sql<string>`coalesce(${users.image}, ${students.image})`,
        email: users.email,
        phone: students.phone,
        arabicName: students.arabicName,
        type: sql<string>`'student'`.as('type'),
      })
      .from(students)
      .leftJoin(users, sql`${students.userId} = ${users.id}`)
      .where(
        and(this.ownedWhere(), or(
          ilike(students.name, pattern),
          nameWordsMatch(query, [students.name, students.arabicName]),
          ilike(students.studentCode, pattern),
          ilike(students.phone, pattern),
          ilike(users.email, pattern),
        ))
      )
      .limit(limit);
  }

  async searchTeachers(query: string, limit = 20) {
    const pattern = `%${query}%`;
    return await this.db
      .select({
        id: teachers.id,
        name: staff.name,
        cin: staff.cin,
        gender: staff.gender,
        image: users.image,
        email: users.email,
        phone: staff.phone,
        specialization: teachers.specialization,
        type: sql<string>`'teacher'`.as('type'),
      })
      .from(teachers)
      .innerJoin(staff, sql`${teachers.staffId} = ${staff.id}`)
      .leftJoin(users, sql`${staff.userId} = ${users.id}`)
      .where(
        and(ownershipCondition(this.db, [Teacher], this._scopeCtx), or(
          ilike(staff.name, pattern),
          nameWordsMatch(query, [staff.name]),
          ilike(staff.cin, pattern),
          ilike(staff.phone, pattern),
          ilike(users.email, pattern),
          ilike(teachers.specialization, pattern),
        ))
      )
      .limit(limit);
  }

  async searchParents(query: string, limit = 20) {
    const pattern = `%${query}%`;
    return await this.db
      .select({
        id: parents.id,
        name: parents.name,
        cin: parents.cin,
        gender: parents.gender,
        image: sql<string>`coalesce(${users.image}, ${parents.image})`,
        email: users.email,
        phone: parents.phone,
        type: sql<string>`'parent'`.as('type'),
      })
      .from(parents)
      .leftJoin(users, sql`${parents.userId} = ${users.id}`)
      .where(
        and(ownershipCondition(this.db, [Parent], this._scopeCtx), or(
          ilike(parents.name, pattern),
          ilike(parents.cin, pattern),
          ilike(parents.phone, pattern),
          ilike(users.email, pattern),
        ))
      )
      .limit(limit);
  }

  async searchGlobal(query: string, limit = 10) {
    const [studentResults, teacherResults, parentResults] = await Promise.all([
      this.searchStudents(query, limit),
      this.searchTeachers(query, limit),
      this.searchParents(query, limit),
    ]);

    return {
      students: studentResults,
      teachers: teacherResults,
      parents: parentResults,
      total: studentResults.length + teacherResults.length + parentResults.length,
    };
  }
}

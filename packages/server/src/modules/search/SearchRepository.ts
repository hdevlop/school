import { Repository } from '../../najm';
import { DB } from '../../database/db';
import { students, teachers, staff, parents, users } from '../../database/schema';
import { and, desc, ilike, or, sql, type SQL, type SQLWrapper } from 'drizzle-orm';
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

/**
 * Names spelled close to the query also match, best first: "jbara rima" and
 * "jebara rimma" find JEBARA RIMA (0.73, 0.79), "mohammed adanguir" ADANGUIR
 * MOHAMED (0.84), "zakarya achir" AACHIR ZAKARIA (0.64), while the next
 * unrelated names scored 0.25-0.56 and "xyz abc" nothing above 0.25 on the demo
 * school (2026-11-21). The score is pg_trgm's word_similarity of the query to
 * the closest part of the name, accents and Arabic letter forms folded
 * (migration 0138 enables pg_trgm and unaccent).
 */
export const NAME_CLOSENESS_MIN = 0.5;

export function nameCloseness(query: string, columns: SQLWrapper[]): SQL {
  const wanted = foldArabic(query.trim());
  const scores = columns.map((column) =>
    sql`coalesce(word_similarity(lower(unaccent(${wanted})), lower(unaccent(${folded(column)}))), 0)`);
  return sql`greatest(${sql.join(scores, sql`, `)})`;
}

@Repository()
export class SearchRepository {
  declare db: DB;
  declare _scopeCtx: ScopeContext;
  @Owned(Student)
  private ownedWhere!: OwnedWhere;

  async searchStudents(query: string, limit = 20) {
    const pattern = `%${query}%`;
    const closeness = nameCloseness(query, [students.name, students.arabicName]);
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
          sql`${closeness} >= ${NAME_CLOSENESS_MIN}`,
        ))
      )
      .orderBy(desc(closeness), students.name)
      .limit(limit);
  }

  async searchTeachers(query: string, limit = 20) {
    const pattern = `%${query}%`;
    const closeness = nameCloseness(query, [staff.name]);
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
          sql`${closeness} >= ${NAME_CLOSENESS_MIN}`,
        ))
      )
      .orderBy(desc(closeness), staff.name)
      .limit(limit);
  }

  async searchParents(query: string, limit = 20) {
    const pattern = `%${query}%`;
    const closeness = nameCloseness(query, [parents.name]);
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
          nameWordsMatch(query, [parents.name]),
          ilike(parents.cin, pattern),
          ilike(parents.phone, pattern),
          ilike(users.email, pattern),
          sql`${closeness} >= ${NAME_CLOSENESS_MIN}`,
        ))
      )
      .orderBy(desc(closeness), parents.name)
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

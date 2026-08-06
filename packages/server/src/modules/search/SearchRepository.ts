import { Repository } from '@server/najm';
import { DB } from '@server/database/db';
import { students, teachers, staff, parents, users } from '@server/database/schema';
import { ilike, or, sql } from 'drizzle-orm';

@Repository()
export class SearchRepository {
  declare db: DB;

  async searchStudents(query: string, limit = 20) {
    const pattern = `%${query}%`;
    return await this.db
      .select({
        id: students.id,
        name: students.name,
        studentCode: students.studentCode,
        gender: students.gender,
        image: users.image,
        email: users.email,
        phone: students.phone,
        type: sql<string>`'student'`.as('type'),
      })
      .from(students)
      .leftJoin(users, sql`${students.userId} = ${users.id}`)
      .where(
        or(
          ilike(students.name, pattern),
          ilike(students.studentCode, pattern),
          ilike(students.phone, pattern),
          ilike(users.email, pattern),
        )
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
        or(
          ilike(staff.name, pattern),
          ilike(staff.cin, pattern),
          ilike(staff.phone, pattern),
          ilike(users.email, pattern),
          ilike(teachers.specialization, pattern),
        )
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
        image: users.image,
        email: users.email,
        phone: parents.phone,
        type: sql<string>`'parent'`.as('type'),
      })
      .from(parents)
      .leftJoin(users, sql`${parents.userId} = ${users.id}`)
      .where(
        or(
          ilike(parents.name, pattern),
          ilike(parents.cin, pattern),
          ilike(parents.phone, pattern),
          ilike(users.email, pattern),
        )
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

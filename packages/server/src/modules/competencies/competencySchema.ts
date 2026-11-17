import { index, integer, pgEnum, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import type { CompetencyLevel } from '@sms/contracts';

import { createRef, idField, timestamps } from '../../database/shared';
import { usersTable as users } from '../../auth';
import { getEnumValues } from '../../shared/enums';
import { academicYears } from '../academicYears/AcademicYearSchema';
import { studentRef } from '../students/studentSchema';
import { teacherAssignmentRef } from '../teachers/teacherSchema';

export const competencyLevelEnum = pgEnum('competencyLevel', getEnumValues('competencyLevel'));

/**
 * A group of competencies a teacher follows in one class, section and subject
 * (Arabe: Lecture · القراءة, Écriture · الكتابة…). The teacher builds the list;
 * it hangs on the assignment, as homework does, so removing the teacher moves
 * it to the class's vacant slot with everything else recorded there.
 */
export const competencyDomains = pgTable('competency_domains', {
  id: idField(),
  teacherAssignmentId: teacherAssignmentRef('restrict'),
  academicYearId: text('academic_year_id').notNull().references(() => academicYears.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  // The same name in a second language, shown under the first.
  altName: text('alt_name'),
  position: integer('position').notNull().default(0),
  ...timestamps,
}, (table) => [
  index('competency_domains_assignment_idx').on(table.teacherAssignmentId, table.academicYearId),
]);

export const competencyDomainRef = createRef('domain_id', () => competencyDomains.id);

export const competencies = pgTable('competencies', {
  id: idField(),
  domainId: competencyDomainRef(),
  name: text('name').notNull(),
  altName: text('alt_name'),
  position: integer('position').notNull().default(0),
  ...timestamps,
}, (table) => [index('competencies_domain_idx').on(table.domainId)]);

export const competencyRef = createRef('competency_id', () => competencies.id);

/**
 * A pupil's level in one competency for one month (`YYYY-MM`). Non évalué is
 * no row: clearing a level deletes it.
 */
export const competencyEvaluations = pgTable('competency_evaluations', {
  id: idField(),
  competencyId: competencyRef(),
  studentId: studentRef(),
  academicYearId: text('academic_year_id').notNull().references(() => academicYears.id, { onDelete: 'restrict' }),
  month: text('month').notNull(),
  level: competencyLevelEnum('level').$type<CompetencyLevel>().notNull(),
  evaluatedBy: text('evaluated_by').references(() => users.id, { onDelete: 'set null' }),
  ...timestamps,
}, (table) => [
  uniqueIndex('competency_evaluations_unique').on(table.competencyId, table.studentId, table.month),
  index('competency_evaluations_student_idx').on(table.studentId, table.month),
]);

/**
 * The teacher's remark for a pupil's parents, at the foot of the pupil sheet:
 * one per class and subject, pupil and month, as on the monthly paper sheet.
 * It hangs on the assignment like the list, so it moves with it when the
 * teacher is removed. An empty remark is no row.
 */
export const competencyRemarks = pgTable('competency_remarks', {
  id: idField(),
  teacherAssignmentId: teacherAssignmentRef('restrict'),
  studentId: studentRef(),
  academicYearId: text('academic_year_id').notNull().references(() => academicYears.id, { onDelete: 'restrict' }),
  month: text('month').notNull(),
  body: text('body').notNull(),
  writtenBy: text('written_by').references(() => users.id, { onDelete: 'set null' }),
  ...timestamps,
}, (table) => [
  uniqueIndex('competency_remarks_unique').on(table.teacherAssignmentId, table.studentId, table.month),
  index('competency_remarks_student_idx').on(table.studentId, table.month),
]);

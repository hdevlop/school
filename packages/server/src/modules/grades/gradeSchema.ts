import { usersTable as users } from '../../auth';
import { index, pgEnum, pgTable, text } from 'drizzle-orm/pg-core';

import { idField, numericField, timestamps } from '../../database/shared';
import { getEnumValues } from '../../shared/enums';
import { assessments } from '../assessments/assessmentSchema';
import { exams } from '../exams/examSchema';
import { studentRef } from '../students/studentSchema';
import { academicYears } from '../academicYears/AcademicYearSchema';

export const gradeStatusEnum = pgEnum('gradeStatus', getEnumValues('gradeStatus'));

export const grades = pgTable('grades', {
  id: idField(),
  studentId: studentRef(),
  academicYearId: text('academic_year_id').references(() => academicYears.id, { onDelete: 'restrict' }),
  assessmentId: text('assessment_id').references(() => assessments.id, { onDelete: 'restrict' }),
  examId: text('exam_id').references(() => exams.id, { onDelete: 'restrict' }),
  marksObtained: numericField('marks_obtained').notNull(),
  feedback: text('feedback'),
  status: gradeStatusEnum('status').notNull().default('graded'),
  gradedBy: text('graded_by').references(() => users.id),
  ...timestamps,
}, (table) => [index('grades_year_student_idx').on(table.academicYearId, table.studentId)]);

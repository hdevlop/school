import { usersTable as users } from '@server/auth';
import { pgEnum, pgTable, text } from 'drizzle-orm/pg-core';

import { idField, numericField, timestamps } from '@server/database/shared';
import { getEnumValues } from '@server/shared/enums';
import { assessmentRef } from '../assessments/assessmentSchema';
import { examRef } from '../exams/examSchema';
import { studentRef } from '../students/studentSchema';

export const gradeStatusEnum = pgEnum('gradeStatus', getEnumValues('gradeStatus'));

export const grades = pgTable('grades', {
  id: idField(),
  studentId: studentRef(),
  assessmentId: assessmentRef('set null'),
  examId: examRef('set null'),
  marksObtained: numericField('marks_obtained').notNull(),
  feedback: text('feedback'),
  status: gradeStatusEnum('status').notNull().default('graded'),
  gradedBy: text('graded_by').references(() => users.id),
  ...timestamps,
});

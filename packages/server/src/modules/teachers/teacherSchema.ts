import { integer, pgTable, text } from 'drizzle-orm/pg-core';

import {
  createRef, idField, timestamps,
} from '../../database/shared';
import { classRef } from '../classes/classSchema';
import { sectionRef } from '../sections/sectionSchema';
import { subjectRef } from '../subjects/subjectSchema';
import { staff } from '../staff/staffSchema';

export const teachers = pgTable('teachers', {
  id: idField(),
  specialization: text('specialization'),
  yearsOfExperience: integer('years_of_experience'),
  academicDegrees: text('academic_degrees'),
  staffId: text('staff_id').notNull().references(() => staff.id, { onDelete: 'restrict' }).unique(),
  ...timestamps,
});

export const teacherRef = createRef('teacher_id', () => teachers.id);

export const teacherAssignments = pgTable('teacher_assignments', {
  id: idField(),
  classId: classRef('restrict'),
  subjectId: subjectRef(),
  // Empty while the class's subject waits for a teacher: Planning creates such a
  // slot so its exams exist before anyone is assigned; assigning fills it.
  teacherId: text('teacher_id').references(() => teachers.id, { onDelete: 'cascade' }),
  sectionId: sectionRef('restrict'),
  ...timestamps,
});

export const teacherAssignmentRef = createRef('teacher_assignment_id', () => teacherAssignments.id);

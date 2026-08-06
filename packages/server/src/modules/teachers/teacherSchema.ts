import { integer, pgTable, text } from 'drizzle-orm/pg-core';

import {
  createRef, idField, timestamps,
} from '@server/database/shared';
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
  classId: classRef(),
  subjectId: subjectRef(),
  teacherId: teacherRef(),
  sectionId: sectionRef(),
  ...timestamps,
});

export const teacherAssignmentRef = createRef('teacher_assignment_id', () => teacherAssignments.id);

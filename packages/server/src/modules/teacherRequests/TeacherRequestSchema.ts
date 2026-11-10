import { integer, pgTable, text } from 'drizzle-orm/pg-core';
import { genderEnum, idField, timestamps } from '../../database/shared';

/**
 * A teacher's sign-up, waiting for review. The public form writes only here and
 * creates no account. A row lives only while it waits: approving turns it into
 * a teacher and rejecting removes it, so a candidate's details are not kept
 * once the school has decided. One waiting request per address.
 */
export const teacherRequests = pgTable('teacher_requests', {
  id: idField(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone').notNull(),
  cin: text('cin').notNull(),
  address: text('address').notNull(),
  gender: genderEnum('gender'),
  specialization: text('specialization'),
  yearsOfExperience: integer('years_of_experience'),
  academicDegrees: text('academic_degrees'),
  ...timestamps,
});

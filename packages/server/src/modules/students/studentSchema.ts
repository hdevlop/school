import { date, doublePrecision, index, integer, pgEnum, pgTable, text } from 'drizzle-orm/pg-core';

import { createRef, genderEnum, idField, timestamps, userRef } from '../../database/shared';
import { getEnumValues } from '../../shared/enums';
import { classRef } from '../classes/classSchema';
import { parentRef } from '../parents/parentSchema';
import { sectionRef } from '../sections/sectionSchema';

export const studentStatusEnum = pgEnum('studentStatus', getEnumValues('studentStatus'));

export const students = pgTable('students', {
  id: idField(),
  userId: userRef('set null').unique(),
  classId: classRef(),
  sectionId: sectionRef(),
  studentCode: text('student_code').notNull().unique(),
  name: text('name').notNull(),
  arabicName: text('arabic_name'),
  image: text('image'),
  phone: text('phone'),
  address: text('address'),
  addressPlaceId: text('address_place_id'),
  addressLatitude: doublePrecision('address_latitude'),
  addressLongitude: doublePrecision('address_longitude'),
  dateOfBirth: date('date_of_birth'),
  birthplaceId: text('birthplace_id'),
  birthplace: text('birthplace'),
  birthplaceArabic: text('birthplace_arabic'),
  age: integer('age'),
  gender: genderEnum('gender'),
  enrollmentDate: date('enrollment_date').notNull(),
  medicalConditions: text('medical_conditions'),
  previousSchool: text('previous_school'),
  status: studentStatusEnum('status').default('active'),
  ...timestamps,
});

export const studentRef = createRef('student_id', () => students.id);

export const studentParents = pgTable('student_parents', {
  id: idField(),
  studentId: studentRef(),
  parentId: parentRef(),
  ...timestamps,
}, (table) => [
  // The fees list reads each student's parent phone, and family screens read
  // either side of the link; without these each lookup scans the whole table.
  index('student_parents_student_idx').on(table.studentId),
  index('student_parents_parent_idx').on(table.parentId),
]);

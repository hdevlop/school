import { date, doublePrecision, integer, pgEnum, pgTable, text } from 'drizzle-orm/pg-core';

import { createRef, genderEnum, idField, timestamps, userRef } from '@server/database/shared';
import { getEnumValues } from '@server/shared/enums';
import { classRef } from '../classes/classSchema';
import { parentRef } from '../parents/parentSchema';
import { sectionRef } from '../sections/sectionSchema';

export const studentStatusEnum = pgEnum('studentStatus', getEnumValues('studentStatus'));

export const students = pgTable('students', {
  id: idField(),
  userId: userRef('cascade').unique(),
  classId: classRef(),
  sectionId: sectionRef(),
  studentCode: text('student_code').notNull().unique(),
  name: text('name').notNull(),
  phone: text('phone'),
  address: text('address'),
  addressPlaceId: text('address_place_id'),
  addressLatitude: doublePrecision('address_latitude'),
  addressLongitude: doublePrecision('address_longitude'),
  dateOfBirth: date('date_of_birth'),
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
});

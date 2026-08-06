import { date, integer, pgEnum, pgTable, text } from 'drizzle-orm/pg-core';

import {
  createRef, employmentTypeEnum, genderEnum, idField, moneyField, timestamps, userRef,
} from '@server/database/shared';
import { getEnumValues } from '@server/shared/enums';

export const staffStatusEnum = pgEnum('staffStatus', getEnumValues('staffStatus'));
export const shiftEnum = pgEnum('shift', getEnumValues('shift'));
export const compensationModeEnum = pgEnum('compensationMode', getEnumValues('compensationMode'));

export const staff = pgTable('staff', {
  id: idField(),
  userId: userRef('set null').unique(),
  employeeCode: text('employee_code').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').unique(),
  cin: text('cin').unique(),
  gender: genderEnum('gender'),
  phone: text('phone'),
  address: text('address'),
  medicalConditions: text('medical_conditions'),
  role: text('role').notNull(),
  department: text('department'),
  compensationMode: compensationModeEnum('compensation_mode').notNull().default('monthly'),
  salary: moneyField('salary'),
  hourlyRate: moneyField('hourly_rate'),
  workloadHours: integer('workload_hours'),
  shift: shiftEnum('shift'),
  employmentType: employmentTypeEnum('employment_type'),
  hireDate: date('hire_date').notNull(),
  endDate: date('end_date'),
  status: staffStatusEnum('status').notNull().default('active'),
  bankAccount: text('bank_account'),
  emergencyContact: text('emergency_contact'),
  emergencyPhone: text('emergency_phone'),
  ...timestamps,
});

export const staffRef = createRef('staff_id', () => staff.id, 'set null');

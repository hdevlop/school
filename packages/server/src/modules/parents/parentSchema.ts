import { boolean, date, integer, pgEnum, pgTable, text } from 'drizzle-orm/pg-core';

import { createRef, genderEnum, idField, timestamps, userRef } from '@server/database/shared';
import { getEnumValues } from '@server/shared/enums';

export const relationshipTypeEnum = pgEnum('relationshipType', getEnumValues('relationshipType'));
export const maritalStatusEnum = pgEnum('maritalStatus', getEnumValues('maritalStatus'));

export const parents = pgTable('parents', {
  id: idField(),
  userId: userRef('cascade').unique(),
  name: text('name').notNull(),
  cin: text('cin').unique(),
  phone: text('phone'),
  gender: genderEnum('gender'),
  address: text('address'),
  dateOfBirth: date('date_of_birth'),
  age: integer('age'),
  occupation: text('occupation'),
  relationshipType: relationshipTypeEnum('relationship_type').notNull(),
  nationality: text('nationality'),
  maritalStatus: maritalStatusEnum('marital_status'),
  isEmergencyContact: boolean('is_emergency_contact').default(false),
  financialResponsibility: boolean('financial_responsibility').default(false),
  ...timestamps,
});

export const parentRef = createRef('parent_id', () => parents.id);

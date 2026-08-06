import { sql } from 'drizzle-orm';
import { AnyPgColumn, numeric, pgEnum, text, timestamp } from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';

import {
  permissionsTable as permissions,
  rolesTable as roles,
  usersTable as users,
} from '@server/auth';
import { getEnumValues } from '@server/shared/enums';

type ReferenceAction = 'cascade' | 'restrict' | 'no action' | 'set null' | 'set default';

export const timestamps = {
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' })
    .defaultNow()
    .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
};

export const idField = (length = 5) =>
  text('id').primaryKey().notNull().$defaultFn(() => nanoid(length));

export const numericField = (name: string, precision = 5, scale = 2) =>
  numeric(name, { precision, scale });

export const moneyField = (name: string) =>
  numeric(name, { precision: 10, scale: 2 });

export const createRef = (
  columnName: string,
  targetFn: () => AnyPgColumn,
  defaultAction: ReferenceAction = 'cascade',
) => (onDelete: ReferenceAction = defaultAction) => {
  const ref = text(columnName).references(targetFn, { onDelete });
  return onDelete === 'set null' ? ref : ref.notNull();
};

export const userRef = createRef('user_id', () => users.id);
export const roleRef = createRef('role_id', () => roles.id);
export const permissionRef = createRef('permission_id', () => permissions.id);

export const actionByRef = (fieldName: string, onDelete: ReferenceAction = 'set null') => {
  const ref = text(fieldName).references(() => users.id, { onDelete });
  return onDelete === 'set null' ? ref : ref.notNull();
};

export const assignedByRef = () => actionByRef('assigned_by');
export const processedByRef = () => actionByRef('processed_by');
export const approvedByRef = () => actionByRef('approved_by');
export const paidByRef = () => actionByRef('paid_by');

export const genderEnum = pgEnum('gender', getEnumValues('gender'));
export const attendanceStatusEnum = pgEnum('attendanceStatus', getEnumValues('attendanceStatus'));
export const attendanceTypeEnum = pgEnum('attendanceType', getEnumValues('attendanceType'));
export const paymentMethodEnum = pgEnum('paymentMethod', getEnumValues('paymentMethod'));
export const employmentTypeEnum = pgEnum('employmentType', getEnumValues('employmentType'));

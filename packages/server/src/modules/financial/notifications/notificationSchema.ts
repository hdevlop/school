import { date, jsonb, pgTable, text, uniqueIndex, index } from 'drizzle-orm/pg-core';

import { idField, timestamps } from '@server/database/shared';
import { studentRef } from '../../students/studentSchema';

export const financialNotificationDeliveries = pgTable('financial_notification_deliveries', {
  id: idField(),
  kind: text('kind').notNull(),
  studentId: studentRef(),
  businessDate: date('business_date').notNull(),
  payload: jsonb('payload'),
  ...timestamps,
}, (table) => ({
  kindStudentBusinessUnique: uniqueIndex('fin_notif_kind_student_business_unique')
    .on(table.kind, table.studentId, table.businessDate),
  kindBusinessIdx: index('fin_notif_kind_business_idx').on(table.kind, table.businessDate),
}));

export type FinancialNotificationDelivery = typeof financialNotificationDeliveries.$inferSelect;
export type NewFinancialNotificationDelivery = typeof financialNotificationDeliveries.$inferInsert;

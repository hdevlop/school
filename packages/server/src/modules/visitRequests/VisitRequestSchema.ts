import { index, pgTable, text } from 'drizzle-orm/pg-core';
import { idField, timestamps } from '../../database/shared';
import { usersTable } from '../../auth';
import { cycles } from '../cycles/cycleSchema';
import { languageEnum } from '../settings/settingSchema';
import { VISIT_REQUEST_STATUS_VALUES } from '@sms/contracts';
import { pgEnum } from 'drizzle-orm/pg-core';

export const visitRequestStatusEnum = pgEnum('visit_request_status', VISIT_REQUEST_STATUS_VALUES);
export const visitRequests = pgTable('visit_requests', {
  id: idField(), parentName: text('parent_name').notNull(), phone: text('phone').notNull(), email: text('email'),
  cycleId: text('cycle_id').references(() => cycles.id, { onDelete: 'set null' }), message: text('message'),
  language: languageEnum('language').notNull().default('en'), status: visitRequestStatusEnum('status').notNull().default('new'),
  handledBy: text('handled_by').references(() => usersTable.id, { onDelete: 'set null' }), staffNote: text('staff_note'), ...timestamps,
}, table => [index('visit_requests_status_created_idx').on(table.status, table.createdAt)]);

import { boolean, pgEnum, pgTable, text } from 'drizzle-orm/pg-core';

import { idField, timestamps, userRef } from '@server/database/shared';
import { getEnumValues } from '@server/shared/enums';
import { classRef } from '../classes/classSchema';
import { studentRef } from '../students/studentSchema';
import { subjectRef } from '../subjects/subjectSchema';
import { teacherAssignmentRef, teacherRef } from '../teachers/teacherSchema';

export const alertTypeEnum = pgEnum('alertType', getEnumValues('alertType'));
export const alertPriorityEnum = pgEnum('alertPriority', getEnumValues('alertPriority'));
export const alertStatusEnum = pgEnum('alertStatus', getEnumValues('alertStatus'));

export const alerts = pgTable('alerts', {
  id: idField(),
  authorId: userRef('set null'),
  studentId: studentRef('set null'),
  teacherId: teacherRef('set null'),
  teacherAssignmentId: teacherAssignmentRef('set null'),
  classId: classRef('set null'),
  subjectId: subjectRef('set null'),
  type: alertTypeEnum('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  priority: alertPriorityEnum('priority').default('medium'),
  status: alertStatusEnum('status').default('active'),
  targetAudience: text('target_audience'),
  isRead: boolean('is_read').default(false),
  ...timestamps,
});

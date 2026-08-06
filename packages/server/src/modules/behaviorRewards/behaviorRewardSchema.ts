import { index, integer, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { usersTable as users } from '@server/auth';
import { idField, timestamps } from '@server/database/shared';
import { getEnumValues } from '@server/shared/enums';
import { classRef } from '../classes/classSchema';
import { sectionRef } from '../sections/sectionSchema';
import { studentRef } from '../students/studentSchema';

export const behaviorRewardCategoryDbEnum = pgEnum(
  'behavior_reward_category',
  getEnumValues('behaviorRewardCategory'),
);
export const behaviorRecognitionLevelDbEnum = pgEnum(
  'behavior_recognition_level',
  getEnumValues('behaviorRecognitionLevel'),
);
export const behaviorRewardTypeDbEnum = pgEnum(
  'behavior_reward_type',
  getEnumValues('behaviorRewardType'),
);

export const behaviorRewards = pgTable('behavior_rewards', {
  id: idField(),
  studentId: studentRef('restrict'),
  classId: classRef('restrict'),
  sectionId: sectionRef('restrict'),
  awardedBy: text('awarded_by')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  behaviorAt: timestamp('behavior_at', { mode: 'string', withTimezone: true }).notNull(),
  category: behaviorRewardCategoryDbEnum('category').notNull(),
  recognitionLevel: behaviorRecognitionLevelDbEnum('recognition_level').notNull(),
  description: text('description').notNull(),
  rewardType: behaviorRewardTypeDbEnum('reward_type').notNull(),
  points: integer('points').notNull().default(0),
  rewardNote: text('reward_note'),
  ...timestamps,
}, (table) => [
  index('behavior_rewards_student_idx').on(table.studentId),
  index('behavior_rewards_awarded_by_idx').on(table.awardedBy),
  index('behavior_rewards_category_idx').on(table.category),
  index('behavior_rewards_recognition_level_idx').on(table.recognitionLevel),
  index('behavior_rewards_reward_type_idx').on(table.rewardType),
  index('behavior_rewards_behavior_at_idx').on(table.behaviorAt),
]);

import { index, integer, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { usersTable as users } from '../../auth';
import { idField, timestamps } from '../../database/shared';
import { getEnumValues } from '../../shared/enums';
import { classRef } from '../classes/classSchema';
import { sectionRef } from '../sections/sectionSchema';
import { studentRef } from '../students/studentSchema';
import { subjectRef } from '../subjects/subjectSchema';

export const behaviorRewardCategoryDbEnum = pgEnum(
  'behavior_reward_category',
  getEnumValues('behaviorRewardCategory'),
);
export const behaviorRewardTypeDbEnum = pgEnum(
  'behavior_reward_type',
  getEnumValues('behaviorRewardType'),
);
export const behaviorRewardCertificatePlaceDbEnum = pgEnum(
  'behavior_reward_certificate_place',
  getEnumValues('behaviorRewardCertificatePlace'),
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
  description: text('description').notNull(),
  rewardType: behaviorRewardTypeDbEnum('reward_type').notNull(),
  points: integer('points').notNull().default(0),
  rewardNote: text('reward_note'),
  // Set only on a `certificate` reward: the place its printed certificate names.
  certificatePlace: behaviorRewardCertificatePlaceDbEnum('certificate_place'),
  // The subject the behavior was in, when it was in one; deleting the subject keeps the reward.
  subjectId: subjectRef('set null'),
  ...timestamps,
}, (table) => [
  index('behavior_rewards_student_idx').on(table.studentId),
  index('behavior_rewards_awarded_by_idx').on(table.awardedBy),
  index('behavior_rewards_category_idx').on(table.category),
  index('behavior_rewards_reward_type_idx').on(table.rewardType),
  index('behavior_rewards_behavior_at_idx').on(table.behaviorAt),
  index('behavior_rewards_subject_idx').on(table.subjectId),
]);

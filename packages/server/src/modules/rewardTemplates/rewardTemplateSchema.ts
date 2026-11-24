import { boolean, check, index, integer, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { usersTable as users } from '../../auth';
import { idField, timestamps } from '../../database/shared';
import { behaviorRewardCategoryDbEnum, behaviorRewardTypeDbEnum } from '../behaviorRewards/behaviorRewardSchema';

/**
 * The school's bank of ready-made rewards: a category and a reward type, with
 * the points and wording a teacher would otherwise type each time. Recording a
 * reward copies these values, so editing or removing a template never changes
 * a reward already given.
 */
export const behaviorRewardTemplates = pgTable('behavior_reward_templates', {
  id: idField(),
  title: text('title').notNull(),
  category: behaviorRewardCategoryDbEnum('category').notNull(),
  rewardType: behaviorRewardTypeDbEnum('reward_type').notNull(),
  points: integer('points').notNull().default(0),
  description: text('description').notNull().default(''),
  active: boolean('active').notNull().default(true),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  ...timestamps,
}, (table) => [
  uniqueIndex('behavior_reward_templates_title_idx').on(table.category, table.rewardType, sql`lower(${table.title})`),
  index('behavior_reward_templates_pair_idx').on(table.category, table.rewardType),
  check('behavior_reward_templates_points_check', sql`${table.points} >= 0 AND ${table.points} <= 100`),
]);

export type BehaviorRewardTemplate = typeof behaviorRewardTemplates.$inferSelect;
export type NewBehaviorRewardTemplate = typeof behaviorRewardTemplates.$inferInsert;

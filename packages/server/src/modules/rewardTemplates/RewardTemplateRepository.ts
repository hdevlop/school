import { and, asc, eq, ne, sql } from 'drizzle-orm';
import type { BehaviorRewardCategory, BehaviorRewardType } from '@sms/contracts';
import { DB } from '../../database/db';
import { behaviorRewardTemplates } from '../../database/schema';
import { Repository } from '../../najm';

const templateSelect = {
  id: behaviorRewardTemplates.id,
  title: behaviorRewardTemplates.title,
  category: behaviorRewardTemplates.category,
  rewardType: behaviorRewardTemplates.rewardType,
  points: behaviorRewardTemplates.points,
  description: behaviorRewardTemplates.description,
  active: behaviorRewardTemplates.active,
  createdBy: behaviorRewardTemplates.createdBy,
  createdAt: behaviorRewardTemplates.createdAt,
  updatedAt: behaviorRewardTemplates.updatedAt,
};

/** A school-wide catalog: no owner and no school year, like cycles. */
@Repository()
export class RewardTemplateRepository {
  declare db: DB;

  async getAll() {
    return this.db.select(templateSelect).from(behaviorRewardTemplates).orderBy(
      asc(behaviorRewardTemplates.category),
      asc(behaviorRewardTemplates.rewardType),
      asc(behaviorRewardTemplates.title),
    );
  }

  async getById(id: string) {
    const [row] = await this.db.select(templateSelect).from(behaviorRewardTemplates)
      .where(eq(behaviorRewardTemplates.id, id)).limit(1);
    return row ?? null;
  }

  /** A title is unique within its category and reward type, ignoring case. */
  async findDuplicate(title: string, category: string, rewardType: string, excludeId?: string) {
    const [row] = await this.db.select({ id: behaviorRewardTemplates.id }).from(behaviorRewardTemplates)
      .where(and(
        eq(behaviorRewardTemplates.category, category as BehaviorRewardCategory),
        eq(behaviorRewardTemplates.rewardType, rewardType as BehaviorRewardType),
        sql`lower(${behaviorRewardTemplates.title}) = ${title.toLowerCase()}`,
        excludeId ? ne(behaviorRewardTemplates.id, excludeId) : undefined,
      ))
      .limit(1);
    return row ?? null;
  }

  async create(data: typeof behaviorRewardTemplates.$inferInsert) {
    const [created] = await this.db.insert(behaviorRewardTemplates).values(data)
      .returning({ id: behaviorRewardTemplates.id });
    return this.getById(created.id);
  }

  /** Inserts the rows whose name is new for their category and reward type; returns those added. */
  async insertMissing(rows: (typeof behaviorRewardTemplates.$inferInsert)[]) {
    if (!rows.length) return [];
    return this.db.insert(behaviorRewardTemplates).values(rows).onConflictDoNothing()
      .returning({ id: behaviorRewardTemplates.id, title: behaviorRewardTemplates.title });
  }

  async update(id: string, data: Partial<typeof behaviorRewardTemplates.$inferInsert>) {
    await this.db.update(behaviorRewardTemplates).set(data).where(eq(behaviorRewardTemplates.id, id));
    return this.getById(id);
  }

  async delete(id: string) {
    const [deleted] = await this.db.delete(behaviorRewardTemplates)
      .where(eq(behaviorRewardTemplates.id, id)).returning();
    return deleted;
  }
}

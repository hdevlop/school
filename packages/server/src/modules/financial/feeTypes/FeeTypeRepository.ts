import { Repository } from '@server/najm';
import { eq, desc, count } from 'drizzle-orm';
import { feeTypes } from '@server/database/schema';
import { DB } from '@server/database/db';

const feeTypeSelect = {
  id: feeTypes.id,
  name: feeTypes.name,
  description: feeTypes.description,
  category: feeTypes.category,
  amount: feeTypes.amount,
  paymentType: feeTypes.paymentType,
  status: feeTypes.status,
  createdAt: feeTypes.createdAt,
  updatedAt: feeTypes.updatedAt,
};

@Repository()
export class FeeTypeRepository {
  declare db: DB;

  // ========================================
  // QUERY BUILDERS
  // ========================================

  private buildFeeTypeQuery() {
    return this.db
      .select(feeTypeSelect)
      .from(feeTypes);
  }

  // ========================================
  // GET/READ METHODS
  // ========================================

  async getCount() {
    const [result] = await this.db
      .select({ count: count() })
      .from(feeTypes);
    return result.count;
  }

  async getAll() {
    return await this.buildFeeTypeQuery()
      .orderBy(desc(feeTypes.createdAt));
  }

  async getById(id: string) {
    const [feeType] = await this.buildFeeTypeQuery()
      .where(eq(feeTypes.id, id))
      .limit(1);
    return feeType || null;
  }

  async getByName(name: string) {
    const [feeType] = await this.buildFeeTypeQuery()
      .where(eq(feeTypes.name, name))
      .limit(1);
    return feeType || null;
  }

  async getByStatus(status) {
    return await this.buildFeeTypeQuery()
      .where(eq(feeTypes.status, status))
      .orderBy(desc(feeTypes.createdAt));
  }

  async getByCategory(category) {
    return await this.buildFeeTypeQuery()
      .where(eq(feeTypes.category, category))
      .orderBy(desc(feeTypes.createdAt));
  }

  // ========================================
  // CREATE_METHODS
  // ========================================

  async create(data) {
    const [newFeeType] = await this.db
      .insert(feeTypes)
      .values(data)
      .returning();
    return await this.getById(newFeeType.id);
  }

  // ========================================
  // UPDATE_METHODS
  // ========================================

  async update(id: string, data: any) {
    const [updatedFeeType] = await this.db
      .update(feeTypes)
      .set(data)
      .where(eq(feeTypes.id, id))
      .returning();
    return updatedFeeType;
  }

  // ========================================
  // DELETE_METHODS
  // ========================================

  async delete(id: string) {
    const [deletedFeeType] = await this.db
      .delete(feeTypes)
      .where(eq(feeTypes.id, id))
      .returning();
    return deletedFeeType;
  }

  async deleteAll() {
    const deletedFeeTypes = await this.db
      .delete(feeTypes)
      .returning();

    return {
      deletedCount: deletedFeeTypes.length,
      deletedFeeTypes: deletedFeeTypes
    };
  }


}

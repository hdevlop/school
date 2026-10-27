import { Repository } from '../../../najm';
import { sql } from 'drizzle-orm';
import { DB } from '../../../database/db';

@Repository()
export class FeeImportRepository {
  declare db: DB;
  /** Serialize retries and receipt collisions until the student transaction commits. */
  async lock(studentId: string, year: string, receipts: string[]) {
    const keys = [`student:${studentId}:${year}`, ...receipts.map(receipt => `receipt:${receipt}`)].sort();
    for (const key of [...new Set(keys)]) {
      await this.db.execute(sql`SELECT pg_advisory_xact_lock(hashtext('school.finance.import'), hashtext(${key}))`);
    }
  }
}

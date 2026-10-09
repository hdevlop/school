import { sql } from 'drizzle-orm';
import type { DB } from '../../../database/db';
import { Repository } from '../../../najm';

@Repository()
export class JevBenchmarkRepository {
  declare db: DB;
  /** The shared acceptance fixture marker, read-only and separate from year-scoped school data. */
  async isMarkedFixture(): Promise<boolean> {
    try {
      const rows = await this.db.execute<{ id: string }>(sql`select id from school_history_fixture_marker`);
      return rows.length === 1 && rows[0]?.id === 'academic-history-alerts-v1';
    } catch { return false; /* Missing marker disables benchmarking; no empty school result is produced. */ }
  }
}

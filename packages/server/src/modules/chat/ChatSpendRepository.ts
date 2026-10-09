import { sql } from 'drizzle-orm';
import type { DB } from '../../database/db';
import { Repository } from '../../najm';

export interface ChatSpendReservation { id: string; month: string; microUsd: number }
export type ChatSpendKind = 'classification' | 'generation' | 'embedding';

/** Operational allowance, shared by every actor/process using this School DB.
 * No messages, actor IDs or provider credentials are persisted. Pending debits
 * survive crashes; they are never refunded by a timer or process restart. */
@Repository()
export class ChatSpendRepository {
  declare db: DB;
  private ready?: Promise<void>;
  private initialize() {
    return this.ready ??= (async () => {
      await this.db.execute(sql`CREATE TABLE IF NOT EXISTS school_chat_spend_month (
        month text PRIMARY KEY, used_micro_usd bigint NOT NULL CHECK (used_micro_usd >= 0))`);
      await this.db.execute(sql`CREATE TABLE IF NOT EXISTS school_chat_spend_attempt (
        id uuid PRIMARY KEY, month text NOT NULL REFERENCES school_chat_spend_month(month),
        kind text NOT NULL, reserved_micro_usd bigint NOT NULL, charged_micro_usd bigint NOT NULL,
        settled boolean NOT NULL DEFAULT false)`);
    })();
  }
  async reserve(kind: ChatSpendKind, microUsd: number, limit: number, now = new Date()): Promise<ChatSpendReservation | null> {
    if (![microUsd, limit].every(n => Number.isSafeInteger(n) && n > 0) || limit > 10_000_000) throw Error('Invalid chat allowance');
    await this.initialize();
    const month = now.toISOString().slice(0, 7), id = crypto.randomUUID();
    return this.db.transaction(async tx => {
      const rows = await tx.execute(sql`INSERT INTO school_chat_spend_month (month, used_micro_usd)
        SELECT ${month}, ${microUsd} WHERE CAST(${microUsd} AS bigint) <= CAST(${limit} AS bigint)
        ON CONFLICT (month) DO UPDATE SET used_micro_usd = school_chat_spend_month.used_micro_usd + ${microUsd}
        WHERE school_chat_spend_month.used_micro_usd + ${microUsd} <= ${limit} RETURNING month`);
      if (!rows.length) return null;
      await tx.execute(sql`INSERT INTO school_chat_spend_attempt (id, month, kind, reserved_micro_usd, charged_micro_usd)
        VALUES (${id}, ${month}, ${kind}, ${microUsd}, ${microUsd})`);
      return { id, month, microUsd };
    });
  }
  async settle(reservation: ChatSpendReservation, costUsd: number | null) {
    // Unknown charges stay reserved. A known overrun is charged fully and
    // stops further reservations; it must not be silently capped to allowance.
    if (costUsd === null || !Number.isFinite(costUsd) || costUsd < 0) return;
    const charged = Math.ceil(costUsd * 1_000_000);
    if (!Number.isSafeInteger(charged)) return;
    await this.db.transaction(async tx => {
      const rows = await tx.execute<{ charged_micro_usd: string | number }>(sql`UPDATE school_chat_spend_attempt
        SET charged_micro_usd = ${charged}, settled = true WHERE id = ${reservation.id} AND settled = false
        RETURNING charged_micro_usd`);
      if (!rows.length) return;
      await tx.execute(sql`UPDATE school_chat_spend_month SET used_micro_usd = used_micro_usd + ${charged - reservation.microUsd}
        WHERE month = ${reservation.month}`);
    });
  }
  async snapshot(now = new Date()) {
    await this.initialize();
    const rows = await this.db.execute<{ used_micro_usd: string | number }>(sql`SELECT used_micro_usd FROM school_chat_spend_month
      WHERE month = ${now.toISOString().slice(0, 7)}`);
    return { month: now.toISOString().slice(0, 7), usedMicroUsd: Number(rows[0]?.used_micro_usd ?? 0) };
  }
}

import { expect, test } from 'bun:test';
import postgres from 'postgres';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');

test('provider migration preserves legacy settings and permits OpenRouter on enum and text schemas', async () => {
  const sql = postgres(rawUrl, { max: 1, prepare: false, onnotice: () => {} });
  const rollback = new Error('rollback migration probe');
  try {
    const [identity] = await sql`select id from school_history_fixture_marker`;
    expect(identity.id).toBe('academic-history-alerts-v1');
    const migration = await Bun.file(new URL('../../src/database/migrations/0062_ai_settings_provider_text.sql', import.meta.url)).text();
    const statements = migration.split('--> statement-breakpoint').map((part) => part.trim()).filter(Boolean);
    await expect(sql.begin(async (tx) => {
      await tx.unsafe(`CREATE TYPE pg_temp.ai_provider_probe AS ENUM ('anthropic','openai','google','zai','ollama','custom')`);
      // Shadows the real table for this connection only; no app settings change.
      await tx.unsafe(`CREATE TEMP TABLE ai_settings (id text PRIMARY KEY, provider pg_temp.ai_provider_probe NOT NULL DEFAULT 'ollama', api_key_encrypted text, model text) ON COMMIT DROP`);
      await tx.unsafe("insert into ai_settings (id,provider,api_key_encrypted,model) values ('legacy','openai','encrypted-probe','legacy-model')");
      // Both the original enum and an already-aligned text column must work.
      for (let pass = 0; pass < 2; pass++) {
        for (const statement of statements) await tx.unsafe(statement);
        const [legacy] = await tx.unsafe("select * from ai_settings where id='legacy'");
        expect({ id: legacy.id, provider: legacy.provider, api_key_encrypted: legacy.api_key_encrypted, model: legacy.model })
          .toEqual({ id: 'legacy', provider: 'openai', api_key_encrypted: 'encrypted-probe', model: 'legacy-model' });
      }
      await tx.unsafe("insert into ai_settings (id,provider,model) values ('new','openrouter','openai/gpt-oss-120b')");
      await tx.unsafe("insert into ai_settings (id) values ('default')");
      expect((await tx.unsafe("select provider from ai_settings where id='new'"))[0].provider).toBe('openrouter');
      expect((await tx.unsafe("select provider from ai_settings where id='default'"))[0].provider).toBe('ollama');
      const [column] = await tx.unsafe("select a.attnotnull from pg_attribute a where a.attrelid='pg_temp.ai_settings'::regclass and a.attname='provider'");
      expect(column.attnotnull).toBe(true);
      throw rollback;
    })).rejects.toBe(rollback);
  } finally {
    await sql.end();
  }
});

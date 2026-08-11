import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

import { createSettingsDto, updateSettingsDto } from '@server/modules/settings/SettingsDto';

const readSource = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8');

describe('School settings theme — light | dark only', () => {
  it('rejects the retired `system` value and defaults to light', () => {
    expect(createSettingsDto.shape.theme.parse(undefined)).toBe('light');
    expect(createSettingsDto.shape.theme.safeParse('system').success).toBe(false);

    expect(updateSettingsDto.safeParse({ theme: 'light' }).success).toBe(true);
    expect(updateSettingsDto.safeParse({ theme: 'dark' }).success).toBe(true);
    expect(updateSettingsDto.safeParse({ theme: 'system' }).success).toBe(false);
    expect(updateSettingsDto.safeParse({ theme: 'auto' }).success).toBe(false);
  });

  it('keeps the column default, the service fallback, and the validator aligned', () => {
    expect(readSource('../../src/modules/settings/settingSchema.ts')).toContain(
      "theme: text('theme').default('light')",
    );
    expect(readSource('../../src/modules/settings/SettingsService.ts')).toContain(
      "theme: data.theme || 'light'",
    );
    expect(readSource('../../src/modules/settings/SettingsValidator.ts')).toContain(
      "const validThemes = ['light', 'dark']",
    );
  });

  it('migrates stored `system` rows instead of leaving an unparseable value', () => {
    const sql = readSource('../../src/database/migrations/0043_tricky_micromax.sql');

    expect(sql).toContain(`ALTER TABLE "settings" ALTER COLUMN "theme" SET DEFAULT 'light'`);
    expect(sql).toMatch(
      /UPDATE "settings" SET "theme" = 'light' WHERE "theme" IN \('system', 'auto'\)/,
    );
    // The theme data migration stays separate from the Auth v3 and najm-theme
    // schema migrations.
    expect(sql).not.toContain('CREATE TABLE');
    expect(sql).not.toContain('credential_setup');
  });
});

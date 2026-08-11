import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { getTableName } from 'drizzle-orm';
import {
  STANDARD_BRANDING_SLOT_KEYS,
  resolveThemeConfig,
  themePluginConfig,
} from 'najm-theme/server';

import {
  schoolTheme,
  SCHOOL_HERO_MAX_BYTES,
  SCHOOL_LOGO_MAX_BYTES,
} from '@sms/server/theme';
import * as schema from '@server/database/schema';

describe('najm-theme adoption — School configuration', () => {
  it('composes the package tables under their canonical identities', () => {
    expect(getTableName(schema.najmThemeAppearance)).toBe('najm_theme_appearance');
    expect(getTableName(schema.najmThemeBranding)).toBe('najm_theme_branding');
    expect(getTableName(schema.najmThemePresets)).toBe('najm_theme_presets');
  });

  it('loads a fresh factory appearance from the module-owned directory', () => {
    const appearance = schoolTheme.appearance();

    expect(appearance.theme).toBeDefined();
    expect(schoolTheme.appearance()).toEqual(appearance);
    expect(schoolTheme.appearance()).not.toBe(appearance);

    const source = readFileSync(
      new URL('../../src/theme/index.ts', import.meta.url),
      'utf8',
    );
    expect(source).toContain('defineTheme(import.meta.url');
    expect(source).not.toContain('process.cwd()');
  });

  it('ships the four fixed factory slots and preserves the existing School marks', () => {
    expect(schoolTheme.assets.map((asset) => asset.slot).sort()).toEqual(
      [...STANDARD_BRANDING_SLOT_KEYS].sort(),
    );

    const expanded = schoolTheme.asset('sidebarLogoExpanded');
    expect(expanded?.mimeType).toBe('image/png');
    expect(schoolTheme.asset('sidebarLogoCollapsed')?.contentHash).toBe(
      expanded?.contentHash,
    );
    expect(schoolTheme.asset('authLogo')?.contentHash).toBe(expanded?.contentHash);
    expect(schoolTheme.asset('authHeroImage')?.contentHash).not.toBe(
      expanded?.contentHash,
    );
  });

  it('keeps public reads, School routes, storage isolation, and explicit limits', () => {
    const resolved = resolveThemeConfig(
      themePluginConfig(schoolTheme, {
        basePath: '',
        manage: [() => undefined],
        features: { mcp: true },
        limits: {
          logoBytes: SCHOOL_LOGO_MAX_BYTES,
          heroBytes: SCHOOL_HERO_MAX_BYTES,
        },
        storage: { namespace: 'theme-branding' },
      }),
    );

    expect(resolved.basePath).toBe('');
    expect(resolved.publicRead).toBe(true);
    expect(resolved.storage.namespace).toBe('theme-branding');
    expect(resolved.features.mcp).toBe(true);

    const slots = Object.fromEntries(
      resolved.brandingSlots.map((slot) => [slot.key, slot.maxBytes]),
    );
    expect(slots.sidebarLogoExpanded).toBe(2_000_000);
    expect(slots.sidebarLogoCollapsed).toBe(2_000_000);
    expect(slots.authLogo).toBe(2_000_000);
    expect(slots.authHeroImage).toBe(5_000_000);

    const source = readFileSync(
      new URL('../../src/config/themeConfig.ts', import.meta.url),
      'utf8',
    );
    expect(source).toContain('manage: [isAdministrator()]');
    expect(source).toContain('audit: themeAudit');
    expect(source).toContain('diagnostics: reportThemeDiagnostic');
  });

  it('does not reintroduce app-owned theme transport or persistence layers', () => {
    const forbidden = [
      '../../src/modules/theme',
      '../../src/modules/appearance',
      '../../src/modules/branding',
      '../../src/modules/themePresets',
    ];

    expect(
      forbidden.filter((relativePath) =>
        existsSync(new URL(relativePath, import.meta.url)),
      ),
    ).toEqual([]);
  });

  it('generates an additive migration containing only the three theme tables', () => {
    const sql = readFileSync(
      new URL(
        '../../src/database/migrations/0042_young_blockbuster.sql',
        import.meta.url,
      ),
      'utf8',
    );

    expect(sql).toContain('CREATE TABLE "najm_theme_appearance"');
    expect(sql).toContain('CREATE TABLE "najm_theme_branding"');
    expect(sql).toContain('CREATE TABLE "najm_theme_presets"');
    expect(sql).not.toMatch(/\b(?:ALTER|DROP|TRUNCATE)\b/i);
  });
});

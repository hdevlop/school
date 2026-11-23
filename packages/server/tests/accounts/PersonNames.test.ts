import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { nameField } from '../../src/shared/fields';
import { createStaffDto } from '../../src/modules/staff/StaffDto';

describe('person names are saved capitalized', () => {
  it('capitalizes every name the API receives', () => {
    expect(nameField.parse('  ilham   ACHTOUK ')).toBe('Ilham Achtouk');
    expect(nameField.parse("jean-marc d'amour")).toBe("Jean-Marc D'Amour");
    expect(nameField.parse('إلهام أشتوك')).toBe('إلهام أشتوك');
    // Length is still checked on what was typed.
    expect(nameField.safeParse('a').success).toBe(false);
  });

  it('keeps a DTO name required after capitalizing it', () => {
    const shape = createStaffDto.shape.name;
    expect(shape.safeParse(undefined).success).toBe(false);
  });

  it('rewrote the stored names with the same rule (migration 0142)', () => {
    const migration = readFileSync(new URL('../../src/database/migrations/0142_capitalize_person_names.sql', import.meta.url), 'utf8');
    // initcap over the tidied name is capitalizePersonName: each table, set and compared.
    const rule = /initcap\(regexp_replace\(btrim\("name"\), '\\s\+', ' ', 'g'\)\)/g;
    expect(migration.match(rule)?.length).toBe(10);
    for (const table of ['students', 'parents', 'staff', 'teacher_requests', 'users']) expect(migration).toContain(`UPDATE "${table}"`);
    // Skipped, not miswritten, where Postgres cannot lowercase accented letters.
    expect(migration.match(/lower\('É'\) = 'é'/g)?.length).toBe(5);
  });
});

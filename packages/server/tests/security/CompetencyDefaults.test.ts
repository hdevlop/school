import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { COMPETENCY_LIMITS } from '@sms/contracts';
import { DEFAULT_COMPETENCY_LISTS, defaultCompetencyList } from '../../src/modules/competencies/defaultCatalogs';

const migration = readFileSync(new URL('../../src/database/migrations/0129_competency_default_lists.sql', import.meta.url), 'utf8');
const ARABIC = /^[؀-ۿ\s()،:-]+$/;

describe('the default competency lists', () => {
  it('copy the school\'s Arabic grids for CP and CE2 as they are', () => {
    expect(defaultCompetencyList('AR', 'CP')?.domains).toEqual([
      ['القراءة', ['القراءة السليمة', 'فهم المسموع', 'فهم المقروء', 'التجزيء المقطعي', 'المرونة']],
      ['الكتابة', ['الخط', 'النقل', 'الإملاء', 'التعبير الكتابي']],
    ]);
    expect(defaultCompetencyList('AR', 'CE2')?.domains).toEqual([
      ['القراءة', ['القراءة السليمة', 'فهم المقروء', 'فهم أسئلة النص', 'قيمة النص']],
      ['الكتابة', ['الخط', 'النقل', 'الإملاء', 'التعبير الكتابي']],
      ['الظواهر اللغوية', ['التراكيب', 'الصرف والتحويل']],
    ]);
  });

  it('give each class and subject the school teaches at most one list', () => {
    const keys = DEFAULT_COMPETENCY_LISTS.flatMap((list) => list.classes.map((name) => `${list.subject}/${name}`));
    expect(new Set(keys).size).toBe(keys.length);
    for (const name of ['CP', 'CE1', 'CE2', 'CM1', 'CM2', 'CE6']) {
      for (const subject of ['AR', 'FR', 'ENG', 'MATH', 'EI', 'SCI', 'ART', 'INFO']) expect(defaultCompetencyList(subject, name), `${subject}/${name}`).not.toBeNull();
    }
    for (const name of ['1AC', '2AC', '3AC']) {
      for (const subject of ['AR', 'FR', 'ENG', 'MATH', 'EI', 'HG', 'PHY', 'SVT', 'PE']) expect(defaultCompetencyList(subject, name), `${subject}/${name}`).not.toBeNull();
    }
    expect(defaultCompetencyList('AR', 'PS')).toBeNull();
    expect(defaultCompetencyList(null, 'CP')).toBeNull();
  });

  it('hold lists a teacher could have typed: within the limits, no name twice', () => {
    for (const list of DEFAULT_COMPETENCY_LISTS) {
      const label = `${list.subject}/${list.classes.join(',')}`;
      expect(list.domains.length, label).toBeGreaterThan(0);
      expect(list.domains.length, label).toBeLessThanOrEqual(COMPETENCY_LIMITS.domains);
      expect(new Set(list.domains.map(([name]) => name)).size, label).toBe(list.domains.length);
      for (const [name, items] of list.domains) {
        expect(items.length, `${label} ${name}`).toBeGreaterThan(0);
        expect(items.length, `${label} ${name}`).toBeLessThanOrEqual(COMPETENCY_LIMITS.competencies);
        expect(new Set(items).size, `${label} ${name}`).toBe(items.length);
        for (const text of [name, ...items]) expect(text.trim().length > 0 && text.length <= COMPETENCY_LIMITS.name, text).toBe(true);
      }
    }
  });

  // Arabic-only names make a list read right to left on the sheets.
  it('are written in the language each subject is taught in', () => {
    const arabic = (subject: string, name: string) => defaultCompetencyList(subject, name)!.domains
      .every(([domain, items]) => [domain, ...items].every((text) => ARABIC.test(text)));
    for (const name of ['CP', 'CE2', 'CE6', '2AC']) {
      expect(arabic('AR', name), name).toBe(true);
      expect(arabic('EI', name), name).toBe(true);
    }
    expect(arabic('MATH', 'CE6')).toBe(true);
    expect(arabic('MATH', 'CM2')).toBe(false);
    expect(arabic('HG', 'CM1')).toBe(true);
    expect(arabic('HG', '1AC')).toBe(false);
    expect(arabic('FR', 'CP')).toBe(false);
  });
});

describe('the default lists migration', () => {
  it('carries every name of every list', () => {
    const rows = migration.match(/^ {2}\('/gm) ?? [];
    const expected = DEFAULT_COMPETENCY_LISTS.reduce((sum, list) =>
      sum + list.classes.length * list.domains.reduce((count, [, items]) => count + items.length, 0), 0);
    expect(rows.length).toBe(expected);
    expect(migration).toContain("('AR', 'CE2', 2, 'الظواهر اللغوية', 1, 'الصرف والتحويل')");
    expect(migration).toContain("'S''exprimer oralement'");
  });

  it('fills only a class and subject with no list, in a year not over, and writes no level', () => {
    expect(migration).toContain('NOT EXISTS (SELECT 1 FROM "competency_domains" domain WHERE domain."teacher_assignment_id" = assignment."id")');
    expect(migration).toContain('year."reporting_ends_on" >= CURRENT_DATE');
    expect(migration).not.toMatch(/competency_evaluations|DELETE|UPDATE/i);
  });
});

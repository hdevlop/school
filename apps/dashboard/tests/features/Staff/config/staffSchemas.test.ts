import { describe, expect, it } from 'bun:test';
import { ar, en, es, fr } from '@sms/contracts/locales';

import { createStaffSchemas } from '@/features/Staff/config/staffSchemas';

const CATALOGS: Record<string, any> = { en, fr, ar, es };

const lookup = (language: string, key: string) =>
  key.split('.').reduce<any>((node, part) => node?.[part], CATALOGS[language]);

/** Resolves a dotted key against a real catalog, the way `t()` does. */
const translatorFor = (language: string) => (key: string) => lookup(language, key) ?? key;

const messagesByPath = (error: { issues: { path: PropertyKey[]; message: string }[] }) =>
  Object.fromEntries(error.issues.map((issue) => [issue.path.join('.'), issue.message]));

const validPersonal = {
  name: 'Fatima Zahra',
  cin: 'AB123456',
  phone: '+212612345678',
  address: 'Rue 1, Casablanca',
  role: 'cleaner',
  status: 'active',
};

const validEmployment = { compensationMode: 'monthly', salary: '3000', hireDate: '2026-09-01' };

describe('staff form schemas', () => {
  it('names every refusal by a key present in all four catalogs', () => {
    const asked = new Set<string>();
    createStaffSchemas((key) => {
      asked.add(key);
      return key;
    });

    expect(asked.size).toBeGreaterThan(0);
    for (const key of asked) {
      for (const language of Object.keys(CATALOGS)) {
        expect(typeof lookup(language, key), `${language}: ${key}`).toBe('string');
      }
    }
  });

  it('refuses an empty first step in French, not English', () => {
    const { personal } = createStaffSchemas(translatorFor('fr'));
    const result = personal.safeParse({ ...validPersonal, name: '', cin: '', phone: '', address: '' });

    expect(result.success).toBe(false);
    expect(messagesByPath(result.error!)).toMatchObject({
      name: fr.staff.validation.nameMin,
      cin: fr.staff.validation.cinMin,
      phone: fr.staff.validation.phoneInvalid,
      address: fr.staff.validation.addressRequired,
    });
  });

  it('says a blank salary is required instead of failing as a malformed number', () => {
    const { employment } = createStaffSchemas(translatorFor('es'));
    const result = employment.safeParse({ ...validEmployment, salary: '' });

    expect(result.success).toBe(false);
    expect(messagesByPath(result.error!).salary).toBe(es.staff.validation.salaryRequired);
  });

  it('asks cleaners and security staff for a zone', () => {
    const { full } = createStaffSchemas(translatorFor('ar'));
    for (const role of ['cleaner', 'security']) {
      const result = full.safeParse({ ...validPersonal, ...validEmployment, role, assignments: [{}] });
      expect(result.success, role).toBe(false);
      expect(messagesByPath(result.error!)['assignments.0.zoneId'], role).toBe(ar.staff.validation.zoneRequired);
    }

    const placed = full.safeParse({ ...validPersonal, ...validEmployment, assignments: [{ zoneId: 'zone1' }] });
    expect(placed.success).toBe(true);
  });
});

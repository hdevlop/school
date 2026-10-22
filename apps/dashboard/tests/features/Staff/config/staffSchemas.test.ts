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
  it('allows editing persisted assignments with null optional fields without imposing dates', () => {
    const { assignmentStep, full } = createStaffSchemas(translatorFor('en'));
    for (const role of ['cleaner', 'security', 'assistant', 'accountant', 'busAssistant']) {
      const assignments = [{
        ...(role === 'assistant' ? { classId: 'class1', sectionId: null }
          : role === 'accountant' ? { cycleId: 'cycle1' }
          : role === 'busAssistant' ? { vehicleId: 'bus1' } : { zoneId: 'zone1' }),
        startDate: null, endDate: null, notes: null,
      }];
      expect(assignmentStep.safeParse({ role, assignments }).success, role).toBe(true);
      const updated = full.parse({ ...validPersonal, ...validEmployment, name: 'Fatima Updated', salary: '2600', role, assignments });
      expect(updated.salary).toBe(2600);
      expect(updated.assignments?.[0]).toMatchObject({ startDate: null, endDate: null, notes: null });
    }
    expect(assignmentStep.safeParse({ role: 'cleaner', assignments: [{ zoneId: 'zone1', startDate: 'invalid' }] }).success).toBe(false);
  });

  it('allows support staff to be created without class assignments', () => {
    const { assignmentStep, full } = createStaffSchemas(translatorFor('en'));
    expect(assignmentStep.safeParse({ role: 'assistant', classIds: [], assignments: [] }).success).toBe(true);
    expect(full.safeParse({ ...validPersonal, ...validEmployment, role: 'assistant', classIds: [] }).success).toBe(true);
    expect(assignmentStep.safeParse({ role: 'secretary', classIds: [], assignments: [] }).success).toBe(true);
  });

  it('allows an accountant without a cycle while refusing an incomplete dated assignment', () => {
    const { assignmentStep, full } = createStaffSchemas(translatorFor('en'));
    for (const assignments of [undefined, [], [{}], [{ cycleId: '', startDate: null, endDate: null, notes: null }]]) {
      expect(assignmentStep.safeParse({ role: 'accountant', assignments }).success).toBe(true);
      expect(full.safeParse({ ...validPersonal, ...validEmployment, role: 'accountant', assignments }).success).toBe(true);
    }
    const incomplete = assignmentStep.safeParse({ role: 'accountant', assignments: [{ startDate: '2026-10-01' }] });
    expect(incomplete.success).toBe(false);
    expect(messagesByPath(incomplete.error!)['assignments.0.cycleId']).toBe(en.staff.validation.cycleRequired);
  });
  it('validates required driver fields on the employment step', () => {
    const { details } = createStaffSchemas(translatorFor('en'), '2026-10-21');
    const result = details.safeParse({ ...validEmployment, role: 'driver' });
    expect(result.success).toBe(false);
    expect(messagesByPath(result.error!)).toMatchObject({
      licenseNumber: en.staff.validation.licenseNumberRequired,
      licenseType: en.staff.validation.licenseTypeRequired,
      licenseExpiry: en.staff.validation.licenseExpiryRequired,
    });
    expect(details.safeParse({ ...validEmployment, role: 'secretary' }).success).toBe(true);
    const missingSalary = details.safeParse({ ...validEmployment, salary: '', role: 'driver' });
    expect(missingSalary.success).toBe(false);
    expect(messagesByPath(missingSalary.error!)).toMatchObject({
      salary: en.staff.validation.salaryRequired,
      licenseNumber: en.staff.validation.licenseNumberRequired,
      licenseType: en.staff.validation.licenseTypeRequired,
      licenseExpiry: en.staff.validation.licenseExpiryRequired,
    });
  });

  it('refuses expired and impossible dates, and accepts a license expiring today', () => {
    for (const language of Object.keys(CATALOGS)) {
      const { details } = createStaffSchemas(translatorFor(language), '2026-10-21');
      const driver = { ...validEmployment, role: 'driver', licenseNumber: 'DL12345', licenseType: 'D' };
      const expired = details.safeParse({ ...driver, licenseExpiry: '2026-10-05' });
      expect(expired.success).toBe(false);
      expect(messagesByPath(expired.error!).licenseExpiry).toBe(lookup(language, 'staff.validation.licenseExpired'));
      expect(details.safeParse({ ...driver, licenseExpiry: '2026-02-30' }).success).toBe(false);
      for (const licenseExpiry of ['2026-10-21', '2030-01-01']) {
        expect(details.safeParse({ ...driver, licenseExpiry }).success).toBe(true);
      }
    }
  });

  it('requires a vehicle on the assignment step for drivers and bus assistants', () => {
    const { assignmentStep } = createStaffSchemas(translatorFor('en'));
    for (const role of ['driver', 'busAssistant']) {
      for (const assignments of [undefined, [], [{}]]) {
        const result = assignmentStep.safeParse({ role, assignments });
        expect(result.success).toBe(false);
        expect(messagesByPath(result.error!)['assignments.0.vehicleId']).toBe(en.staff.validation.vehicleRequired);
      }
      expect(assignmentStep.safeParse({ role, assignments: [{ vehicleId: 'bus1' }] }).success).toBe(true);
    }
  });

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

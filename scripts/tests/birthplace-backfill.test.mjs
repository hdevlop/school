import { describe, expect, it } from 'bun:test';
import { planBirthplaceUpdate } from '../backfill-student-birthplaces.ts';

describe('birthplace-only backfill', () => {
  it('fills missing names, is repeatable and preserves conflicting identities', () => {
    const plan = planBirthplaceUpdate({}, { birthplace: 'Casa' });
    expect(plan.status).toBe('update');
    expect(plan.fields).toEqual({ birthplaceId: 'MA-HCP-06141010', birthplace: 'Casablanca', birthplaceArabic: 'الدار البيضاء' });
    expect(planBirthplaceUpdate(plan.fields, { birthplace: 'Casablanca' }).status).toBe('unchanged');
    expect(planBirthplaceUpdate({ birthplace: 'Rabat' }, { birthplace: 'Casa' }).status).toBe('conflict');
    expect(planBirthplaceUpdate({}, {}).status).toBe('missingSource');
  });
  it('preserves manual foreign names and existing translations', () => {
    const plan = planBirthplaceUpdate({ birthplace: 'Madrid', birthplaceArabic: 'مدريد' }, { birthplace: 'Madrid' });
    expect(plan.status).toBe('unchanged');
    expect(planBirthplaceUpdate({ birthplace: 'Madrid' }, { birthplace: 'Madrid', birthplaceArabic: 'مدريد' }).fields)
      .toEqual({ birthplaceId: null, birthplace: 'Madrid', birthplaceArabic: 'مدريد' });
  });
});

import { describe, expect, it } from 'bun:test';
import { GENDER_VALUES, MARITAL_STATUS_VALUES, RELATIONSHIP_TYPE_VALUES } from '@sms/contracts';

import { parentSchema, parentsSchema } from './parentSchemas';

const parent = {
  name: 'Fatima Alaoui',
  phone: '212600000000',
  cin: 'AB123456',
  relationshipType: 'mother',
};

describe('parentSchema', () => {
  it('needs only a name, a phone, a CIN and a relationship', () => {
    expect(parentSchema.safeParse(parent).success).toBe(true);
  });

  it('accepts every relationship, marital status and gender the API accepts', () => {
    for (const relationshipType of RELATIONSHIP_TYPE_VALUES) {
      expect(parentSchema.safeParse({ ...parent, relationshipType }).success).toBe(true);
    }
    for (const maritalStatus of MARITAL_STATUS_VALUES) {
      expect(parentSchema.safeParse({ ...parent, maritalStatus }).success).toBe(true);
    }
    for (const gender of GENDER_VALUES) {
      expect(parentSchema.safeParse({ ...parent, gender }).success).toBe(true);
    }
  });

  it('treats a cleared email as absent rather than malformed', () => {
    expect(parentSchema.safeParse({ ...parent, email: '' }).success).toBe(true);
    expect(parentSchema.safeParse({ ...parent, email: 'not-an-email' }).success).toBe(false);
  });

  it('leaves the optional profile fields out when nothing was entered', () => {
    const parsed = parentSchema.parse(parent);

    expect(parsed.maritalStatus).toBeUndefined();
    expect(parsed.gender).toBeUndefined();
    expect(parsed.occupation).toBeUndefined();
    expect(parsed.dateOfBirth).toBeUndefined();
  });

  it('defaults the two responsibility flags to false', () => {
    const parsed = parentSchema.parse(parent);

    expect(parsed.isEmergencyContact).toBe(false);
    expect(parsed.financialResponsibility).toBe(false);
  });

  it('keeps a dateOfBirth only in the stored YYYY-MM-DD form', () => {
    expect(parentSchema.safeParse({ ...parent, dateOfBirth: '1985-04-02' }).success).toBe(true);
    expect(parentSchema.safeParse({ ...parent, dateOfBirth: '02/04/1985' }).success).toBe(false);
    expect(parentSchema.safeParse({ ...parent, dateOfBirth: null }).success).toBe(true);
  });

  it('insists on the three fields the school needs to reach and identify a guardian', () => {
    expect(parentSchema.safeParse({ ...parent, name: 'A' }).success).toBe(false);
    expect(parentSchema.safeParse({ ...parent, phone: 'x' }).success).toBe(false);
    expect(parentSchema.safeParse({ ...parent, cin: 'AB' }).success).toBe(false);
  });
});

describe('parentsSchema', () => {
  it('accepts a student with no guardians on file yet', () => {
    expect(parentsSchema.parse({}).parents).toEqual([]);
  });

  it('validates each guardian in the list', () => {
    expect(parentsSchema.safeParse({ parents: [parent, parent] }).success).toBe(true);
    expect(parentsSchema.safeParse({ parents: [parent, { ...parent, cin: '' }] }).success).toBe(false);
  });
});

import { describe, expect, it } from 'bun:test';
import {
  createParentDto,
  createParentsBulkDto,
  deleteBulkParentDto,
  parentIdParam,
  parentCinParam,
  parentPhoneParam,
  linkStudentDto,
  unlinkStudentParams,
  updateParentDto,
} from '@server/modules/parents/ParentDto';

const validParent = {
  name: 'Mohammed Amrani',
  phone: '+212600000000',
  cin: 'AB123456',
  relationshipType: 'father',
};

describe('createParentDto', () => {
  it('parses a valid minimal parent', () => {
    const result = createParentDto.safeParse(validParent);
    expect(result.success).toBe(true);
  });

  it('parses a parent with all optional fields', () => {
    const data = {
      ...validParent,
      id: 'par_01',
      userId: 'usr_01',
      password: 'SecurePass123',
      email: 'mohammed@example.com',
      gender: 'M',
      address: '123 Rue Casablanca',
      dateOfBirth: '1975-05-15',
      occupation: 'Engineer',
      nationality: 'Moroccan',
      maritalStatus: 'married',
      image: '/images/avatar.png',
      isEmergencyContact: true,
      financialResponsibility: true,
    };
    const result = createParentDto.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('defaults isEmergencyContact to false', () => {
    const result = createParentDto.safeParse(validParent);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isEmergencyContact).toBe(false);
    }
  });

  it('defaults financialResponsibility to false', () => {
    const result = createParentDto.safeParse(validParent);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.financialResponsibility).toBe(false);
    }
  });

  it('accepts valid email', () => {
    const data = { ...validParent, email: 'test@example.com' };
    expect(createParentDto.safeParse(data).success).toBe(true);
  });

  it('rejects invalid email', () => {
    const data = { ...validParent, email: 'bad-email' };
    expect(createParentDto.safeParse(data).success).toBe(false);
  });

  it('accepts empty string as email', () => {
    const data = { ...validParent, email: '' };
    expect(createParentDto.safeParse(data).success).toBe(true);
  });

  it('rejects invalid phone', () => {
    const data = { ...validParent, phone: 'abc' };
    expect(createParentDto.safeParse(data).success).toBe(false);
  });

  it('rejects name shorter than 2 characters', () => {
    const data = { ...validParent, name: 'A' };
    expect(createParentDto.safeParse(data).success).toBe(false);
  });

  it('rejects name longer than 100 characters', () => {
    const data = { ...validParent, name: 'A'.repeat(101) };
    expect(createParentDto.safeParse(data).success).toBe(false);
  });

  it('rejects cin shorter than 8 characters', () => {
    const data = { ...validParent, cin: 'AB12' };
    expect(createParentDto.safeParse(data).success).toBe(false);
  });

  it('rejects invalid gender', () => {
    const data = { ...validParent, gender: 'X' };
    expect(createParentDto.safeParse(data).success).toBe(false);
  });

  it('accepts all valid relationship types', () => {
    const types = ['father', 'mother', 'guardian', 'stepparent', 'grandparent', 'other'];
    for (const relationshipType of types) {
      const data = { ...validParent, relationshipType };
      expect(createParentDto.safeParse(data).success).toBe(true);
    }
  });

  it('rejects invalid relationship type', () => {
    const data = { ...validParent, relationshipType: 'sibling' };
    expect(createParentDto.safeParse(data).success).toBe(false);
  });

  it('rejects occupation longer than 100 characters', () => {
    const data = { ...validParent, occupation: 'A'.repeat(101) };
    expect(createParentDto.safeParse(data).success).toBe(false);
  });

  it('rejects nationality longer than 100 characters', () => {
    const data = { ...validParent, nationality: 'A'.repeat(101) };
    expect(createParentDto.safeParse(data).success).toBe(false);
  });

  it('rejects maritalStatus longer than 50 characters', () => {
    const data = { ...validParent, maritalStatus: 'A'.repeat(51) };
    expect(createParentDto.safeParse(data).success).toBe(false);
  });

  it('rejects dateOfBirth with wrong format', () => {
    const data = { ...validParent, dateOfBirth: '01/01/2024' };
    expect(createParentDto.safeParse(data).success).toBe(false);
  });

  it('accepts null dateOfBirth', () => {
    const data = { ...validParent, dateOfBirth: null };
    expect(createParentDto.safeParse(data).success).toBe(true);
  });

  it('rejects missing name', () => {
    const { name, ...data } = validParent;
    expect(createParentDto.safeParse(data).success).toBe(false);
  });

  it('rejects missing phone', () => {
    const { phone, ...data } = validParent;
    expect(createParentDto.safeParse(data).success).toBe(false);
  });

  it('rejects missing cin', () => {
    const { cin, ...data } = validParent;
    expect(createParentDto.safeParse(data).success).toBe(false);
  });

  it('rejects missing relationshipType', () => {
    const { relationshipType, ...data } = validParent;
    expect(createParentDto.safeParse(data).success).toBe(false);
  });

  it('rejects password shorter than 8 characters', () => {
    const data = { ...validParent, password: 'short' };
    expect(createParentDto.safeParse(data).success).toBe(false);
  });

  it('accepts optional id', () => {
    const data = { ...validParent, id: 'par_01' };
    expect(createParentDto.safeParse(data).success).toBe(true);
  });
});

describe('updateParentDto', () => {
  it('parses an empty object', () => {
    expect(updateParentDto.safeParse({}).success).toBe(true);
  });

  it('parses partial data with only name', () => {
    expect(updateParentDto.safeParse({ name: 'Updated' }).success).toBe(true);
  });

  it('still validates name constraints', () => {
    expect(updateParentDto.safeParse({ name: 'A' }).success).toBe(false);
  });

  it('still validates cin constraints', () => {
    expect(updateParentDto.safeParse({ cin: 'AB' }).success).toBe(false);
  });
});

describe('parentIdParam', () => {
  it('accepts non-empty id', () => {
    expect(parentIdParam.safeParse({ id: 'par_01' }).success).toBe(true);
  });

  it('rejects empty id', () => {
    expect(parentIdParam.safeParse({ id: '' }).success).toBe(false);
  });
});

describe('parentCinParam', () => {
  it('accepts valid cin', () => {
    expect(parentCinParam.safeParse({ cin: 'AB123456' }).success).toBe(true);
  });

  it('rejects short cin', () => {
    expect(parentCinParam.safeParse({ cin: 'AB' }).success).toBe(false);
  });
});

describe('parentPhoneParam', () => {
  it('accepts valid phone', () => {
    expect(parentPhoneParam.safeParse({ phone: '+212600000000' }).success).toBe(true);
  });

  it('rejects invalid phone', () => {
    expect(parentPhoneParam.safeParse({ phone: 'abc' }).success).toBe(false);
  });
});

describe('linkStudentDto', () => {
  it('accepts valid studentId', () => {
    expect(linkStudentDto.safeParse({ studentId: 'stu_01' }).success).toBe(true);
  });

  it('rejects empty studentId', () => {
    expect(linkStudentDto.safeParse({ studentId: '' }).success).toBe(false);
  });
});

describe('unlinkStudentParams', () => {
  it('accepts valid ids', () => {
    expect(unlinkStudentParams.safeParse({ id: 'par_01', studentId: 'stu_01' }).success).toBe(true);
  });

  it('rejects empty id', () => {
    expect(unlinkStudentParams.safeParse({ id: '', studentId: 'stu_01' }).success).toBe(false);
  });

  it('rejects empty studentId', () => {
    expect(unlinkStudentParams.safeParse({ id: 'par_01', studentId: '' }).success).toBe(false);
  });
});

describe('deleteBulkParentDto', () => {
  it('accepts array of non-empty strings', () => {
    expect(deleteBulkParentDto.safeParse({ ids: ['par_01', 'par_02'] }).success).toBe(true);
  });

  it('rejects array with empty strings', () => {
    expect(deleteBulkParentDto.safeParse({ ids: ['par_01', ''] }).success).toBe(false);
  });
});

describe('createParentsBulkDto', () => {
  it('accepts array of valid parents', () => {
    expect(createParentsBulkDto.safeParse([validParent]).success).toBe(true);
  });

  it('accepts empty array', () => {
    expect(createParentsBulkDto.safeParse([]).success).toBe(true);
  });

  it('rejects array with one invalid parent', () => {
    expect(createParentsBulkDto.safeParse([validParent, { ...validParent, phone: 'abc' }]).success).toBe(false);
  });
});

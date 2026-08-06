import { describe, expect, it } from 'bun:test';
import {
  createStudentDto,
  createStudentsBulkDto,
  deleteBulkStudentDto,
  studentIdParam,
  updateStudentDto,
} from '@server/modules/students/StudentDto';

const validStudent = {
  classId: 'cls_01',
  sectionId: 'sec_01',
  studentCode: 'STU001',
  name: 'Ahmed Benali',
  email: 'ahmed@example.com',
  gender: 'M',
  enrollmentDate: '2024-09-01',
};

describe('createStudentDto', () => {
  it('parses a valid minimal student', () => {
    const result = createStudentDto.safeParse(validStudent);
    expect(result.success).toBe(true);
  });

  it('parses a student with all optional fields', () => {
    const data = {
      ...validStudent,
      id: 'stu_01',
      userId: 'usr_01',
      password: 'SecurePass123',
      phone: '+212600000000',
      address: '123 Rue Mohammed V, Casablanca',
      dateOfBirth: '2010-05-15',
      medicalConditions: 'None',
      previousSchool: 'Ecole Primaire ABC',
      image: '/images/avatar.png',
      status: 'active',
      gradeLevel: 6,
      graduationDate: '2026-06-30',
      parents: [{ name: 'Father', phone: '+212600000001' }],
      parentIds: ['par_01'],
      fees: [{ feeTypeId: 'ft_01', amount: 5000 }],
    };
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('defaults status to active when omitted', () => {
    const result = createStudentDto.safeParse(validStudent);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('active');
    }
  });

  it('accepts empty string as email', () => {
    const data = { ...validStudent, email: '' };
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects invalid email format', () => {
    const data = { ...validStudent, email: 'not-an-email' };
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects invalid phone format', () => {
    const data = { ...validStudent, phone: 'abc' };
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('accepts valid phone with plus prefix', () => {
    const data = { ...validStudent, phone: '+212661234567' };
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('accepts null phone', () => {
    const data = { ...validStudent, phone: null };
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects name shorter than 2 characters', () => {
    const data = { ...validStudent, name: 'A' };
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects name longer than 100 characters', () => {
    const data = { ...validStudent, name: 'A'.repeat(101) };
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects invalid gender', () => {
    const data = { ...validStudent, gender: 'X' };
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('accepts female gender', () => {
    const data = { ...validStudent, gender: 'F' };
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const data = { ...validStudent, status: 'unknown' };
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('accepts all valid statuses', () => {
    const statuses = ['active', 'inactive', 'graduated', 'transferred'];
    for (const status of statuses) {
      const data = { ...validStudent, status };
      const result = createStudentDto.safeParse(data);
      expect(result.success).toBe(true);
    }
  });

  it('rejects missing classId', () => {
    const { classId, ...data } = validStudent;
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects missing sectionId', () => {
    const { sectionId, ...data } = validStudent;
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects missing studentCode', () => {
    const { studentCode, ...data } = validStudent;
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const { name, ...data } = validStudent;
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects missing gender', () => {
    const { gender, ...data } = validStudent;
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects missing enrollmentDate', () => {
    const { enrollmentDate, ...data } = validStudent;
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects invalid enrollmentDate format', () => {
    const data = { ...validStudent, enrollmentDate: 'not-a-date' };
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('accepts MM/DD/YYYY enrollmentDate', () => {
    const data = { ...validStudent, enrollmentDate: '09/01/2024' };
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects dateOfBirth with wrong format', () => {
    const data = { ...validStudent, dateOfBirth: '01/01/2024' };
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('accepts null dateOfBirth', () => {
    const data = { ...validStudent, dateOfBirth: null };
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects address longer than 500 characters', () => {
    const data = { ...validStudent, address: 'A'.repeat(501) };
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects medicalConditions longer than 1000 characters', () => {
    const data = { ...validStudent, medicalConditions: 'A'.repeat(1001) };
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects previousSchool longer than 500 characters', () => {
    const data = { ...validStudent, previousSchool: 'A'.repeat(501) };
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 characters', () => {
    const data = { ...validStudent, password: 'short' };
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('accepts optional password with 8+ characters', () => {
    const data = { ...validStudent, password: 'LongPass123' };
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('accepts optional parents array', () => {
    const data = { ...validStudent, parents: [{ name: 'Parent' }] };
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('accepts optional parentIds array', () => {
    const data = { ...validStudent, parentIds: ['par_01', 'par_02'] };
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects parentIds with empty strings', () => {
    const data = { ...validStudent, parentIds: [''] };
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('accepts optional fees array', () => {
    const data = { ...validStudent, fees: [{ amount: 5000 }] };
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('accepts optional gradeLevel', () => {
    const data = { ...validStudent, gradeLevel: 6 };
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('accepts null graduationDate', () => {
    const data = { ...validStudent, graduationDate: null };
    const result = createStudentDto.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe('updateStudentDto', () => {
  it('parses an empty object (all fields optional)', () => {
    const result = updateStudentDto.safeParse({});
    expect(result.success).toBe(true);
  });

  it('parses partial data with only name', () => {
    const result = updateStudentDto.safeParse({ name: 'Updated Name' });
    expect(result.success).toBe(true);
  });

  it('parses partial data with only status', () => {
    const result = updateStudentDto.safeParse({ status: 'graduated' });
    expect(result.success).toBe(true);
  });

  it('still validates name constraints on partial update', () => {
    const result = updateStudentDto.safeParse({ name: 'A' });
    expect(result.success).toBe(false);
  });

  it('still validates email constraints on partial update', () => {
    const result = updateStudentDto.safeParse({ email: 'bad-email' });
    expect(result.success).toBe(false);
  });
});

describe('studentIdParam', () => {
  it('accepts a non-empty id string', () => {
    const result = studentIdParam.safeParse({ id: 'stu_01' });
    expect(result.success).toBe(true);
  });

  it('rejects empty id', () => {
    const result = studentIdParam.safeParse({ id: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing id', () => {
    const result = studentIdParam.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('deleteBulkStudentDto', () => {
  it('accepts array of non-empty strings', () => {
    const result = deleteBulkStudentDto.safeParse({ ids: ['stu_01', 'stu_02'] });
    expect(result.success).toBe(true);
  });

  it('accepts empty array', () => {
    const result = deleteBulkStudentDto.safeParse({ ids: [] });
    expect(result.success).toBe(true);
  });

  it('rejects array with empty strings', () => {
    const result = deleteBulkStudentDto.safeParse({ ids: ['stu_01', ''] });
    expect(result.success).toBe(false);
  });
});

describe('createStudentsBulkDto', () => {
  it('accepts array of valid students', () => {
    const result = createStudentsBulkDto.safeParse([validStudent, validStudent]);
    expect(result.success).toBe(true);
  });

  it('accepts empty array', () => {
    const result = createStudentsBulkDto.safeParse([]);
    expect(result.success).toBe(true);
  });

  it('rejects array with one invalid student', () => {
    const result = createStudentsBulkDto.safeParse([validStudent, { ...validStudent, email: 'bad' }]);
    expect(result.success).toBe(false);
  });
});

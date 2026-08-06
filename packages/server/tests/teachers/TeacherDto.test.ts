import { describe, expect, it } from 'bun:test';
import {
  createTeacherDto,
  createTeachersBulkDto,
  deleteBulkTeacherDto,
  teacherIdParam,
  teacherCinParam,
  teacherEmailParam,
  teacherPhoneParam,
  updateTeacherDto,
} from '@server/modules/teachers/TeacherDto';

const validAssignment = {
  classId: 'cls_01',
  sectionIds: ['sec_01'],
  subjectIds: ['sub_01'],
};

const validTeacher = {
  name: 'Fatima Zahra',
  cin: 'AB123456',
  email: 'fatima@example.com',
  phone: '+212600000000',
  emergencyPhone: '+212600000001',
  hireDate: '2024-09-01',
  assignments: [validAssignment],
};

describe('createTeacherDto', () => {
  it('parses a valid minimal teacher', () => {
    const result = createTeacherDto.safeParse(validTeacher);
    expect(result.success).toBe(true);
  });

  it('parses a teacher with all optional fields', () => {
    const data = {
      ...validTeacher,
      id: 'tch_01',
      userId: 'usr_01',
      password: 'SecurePass123',
      gender: 'F',
      address: '123 Rue Casablanca',
      emergencyContact: 'Ahmed Zahra',
      emergencyPhone: '+212600000001',
      specialization: 'Mathematics',
      yearsOfExperience: 10,
      salary: 15000,
      bankAccount: 'MA1234567890',
      employmentType: 'fullTime',
      workloadHours: 35,
      academicDegrees: 'PhD Mathematics',
      status: 'active',
      image: '/images/avatar.png',
    };
    const result = createTeacherDto.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('defaults status to active when omitted', () => {
    const result = createTeacherDto.safeParse(validTeacher);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('active');
    }
  });

  it('rejects invalid email', () => {
    const data = { ...validTeacher, email: 'bad-email' };
    expect(createTeacherDto.safeParse(data).success).toBe(false);
  });

  it('accepts empty string as email', () => {
    const data = { ...validTeacher, email: '' };
    expect(createTeacherDto.safeParse(data).success).toBe(true);
  });

  it('rejects invalid phone', () => {
    const data = { ...validTeacher, phone: 'abc' };
    expect(createTeacherDto.safeParse(data).success).toBe(false);
  });

  it('rejects name shorter than 2 characters', () => {
    const data = { ...validTeacher, name: 'A' };
    expect(createTeacherDto.safeParse(data).success).toBe(false);
  });

  it('rejects name longer than 100 characters', () => {
    const data = { ...validTeacher, name: 'A'.repeat(101) };
    expect(createTeacherDto.safeParse(data).success).toBe(false);
  });

  it('rejects cin shorter than 8 characters', () => {
    const data = { ...validTeacher, cin: 'AB12' };
    expect(createTeacherDto.safeParse(data).success).toBe(false);
  });

  it('rejects cin longer than 20 characters', () => {
    const data = { ...validTeacher, cin: 'A'.repeat(21) };
    expect(createTeacherDto.safeParse(data).success).toBe(false);
  });

  it('rejects invalid gender', () => {
    const data = { ...validTeacher, gender: 'X' };
    expect(createTeacherDto.safeParse(data).success).toBe(false);
  });

  it('accepts male and female gender', () => {
    expect(createTeacherDto.safeParse({ ...validTeacher, gender: 'M' }).success).toBe(true);
    expect(createTeacherDto.safeParse({ ...validTeacher, gender: 'F' }).success).toBe(true);
  });

  it('accepts all valid statuses', () => {
    for (const status of ['active', 'inactive', 'onLeave']) {
      const data = { ...validTeacher, status };
      expect(createTeacherDto.safeParse(data).success).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    const data = { ...validTeacher, status: 'unknown' };
    expect(createTeacherDto.safeParse(data).success).toBe(false);
  });

  it('accepts all valid employment types', () => {
    for (const type of ['fullTime', 'partTime', 'contract', 'temporary']) {
      const data = { ...validTeacher, employmentType: type };
      expect(createTeacherDto.safeParse(data).success).toBe(true);
    }
  });

  it('rejects invalid employment type', () => {
    const data = { ...validTeacher, employmentType: 'intern' };
    expect(createTeacherDto.safeParse(data).success).toBe(false);
  });

  it('rejects negative yearsOfExperience', () => {
    const data = { ...validTeacher, yearsOfExperience: -1 };
    expect(createTeacherDto.safeParse(data).success).toBe(false);
  });

  it('rejects zero salary', () => {
    const data = { ...validTeacher, salary: 0 };
    expect(createTeacherDto.safeParse(data).success).toBe(false);
  });

  it('accepts positive salary', () => {
    const data = { ...validTeacher, salary: 10000 };
    expect(createTeacherDto.safeParse(data).success).toBe(true);
  });

  it('rejects workload hours exceeding 60', () => {
    const data = { ...validTeacher, workloadHours: 61 };
    expect(createTeacherDto.safeParse(data).success).toBe(false);
  });

  it('rejects negative workload hours', () => {
    const data = { ...validTeacher, workloadHours: -1 };
    expect(createTeacherDto.safeParse(data).success).toBe(false);
  });

  it('rejects specialization longer than 100 characters', () => {
    const data = { ...validTeacher, specialization: 'A'.repeat(101) };
    expect(createTeacherDto.safeParse(data).success).toBe(false);
  });

  it('rejects academic degrees longer than 500 characters', () => {
    const data = { ...validTeacher, academicDegrees: 'A'.repeat(501) };
    expect(createTeacherDto.safeParse(data).success).toBe(false);
  });

  it('rejects bank account longer than 100 characters', () => {
    const data = { ...validTeacher, bankAccount: 'A'.repeat(101) };
    expect(createTeacherDto.safeParse(data).success).toBe(false);
  });

  it('rejects missing name', () => {
    const { name, ...data } = validTeacher;
    expect(createTeacherDto.safeParse(data).success).toBe(false);
  });

  it('rejects missing cin', () => {
    const { cin, ...data } = validTeacher;
    expect(createTeacherDto.safeParse(data).success).toBe(false);
  });

  it('rejects missing phone', () => {
    const { phone, ...data } = validTeacher;
    expect(createTeacherDto.safeParse(data).success).toBe(false);
  });

  it('rejects missing hireDate', () => {
    const { hireDate, ...data } = validTeacher;
    expect(createTeacherDto.safeParse(data).success).toBe(false);
  });

  it('allows missing assignments (optional, defaults to [])', () => {
    const { assignments, ...data } = validTeacher;
    const result = createTeacherDto.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.assignments).toEqual([]);
  });

  it('allows empty assignments array', () => {
    const data = { ...validTeacher, assignments: [] };
    expect(createTeacherDto.safeParse(data).success).toBe(true);
  });

  it('rejects assignment with empty sectionIds', () => {
    const data = { ...validTeacher, assignments: [{ ...validAssignment, sectionIds: [] }] };
    expect(createTeacherDto.safeParse(data).success).toBe(false);
  });

  it('rejects assignment with empty subjectIds', () => {
    const data = { ...validTeacher, assignments: [{ ...validAssignment, subjectIds: [] }] };
    expect(createTeacherDto.safeParse(data).success).toBe(false);
  });

  it('rejects password shorter than 8 characters', () => {
    const data = { ...validTeacher, password: 'short' };
    expect(createTeacherDto.safeParse(data).success).toBe(false);
  });

  it('accepts optional id', () => {
    const data = { ...validTeacher, id: 'tch_01' };
    expect(createTeacherDto.safeParse(data).success).toBe(true);
  });

  it('accepts optional userId', () => {
    const data = { ...validTeacher, userId: 'usr_01' };
    expect(createTeacherDto.safeParse(data).success).toBe(true);
  });
});

describe('updateTeacherDto', () => {
  it('parses an empty object', () => {
    expect(updateTeacherDto.safeParse({}).success).toBe(true);
  });

  it('parses partial data with only name', () => {
    expect(updateTeacherDto.safeParse({ name: 'Updated Name' }).success).toBe(true);
  });

  it('still validates name constraints', () => {
    expect(updateTeacherDto.safeParse({ name: 'A' }).success).toBe(false);
  });

  it('still validates email constraints', () => {
    expect(updateTeacherDto.safeParse({ email: 'bad' }).success).toBe(false);
  });
});

describe('teacherIdParam', () => {
  it('accepts non-empty id', () => {
    expect(teacherIdParam.safeParse({ id: 'tch_01' }).success).toBe(true);
  });

  it('rejects empty id', () => {
    expect(teacherIdParam.safeParse({ id: '' }).success).toBe(false);
  });
});

describe('teacherCinParam', () => {
  it('accepts valid cin', () => {
    expect(teacherCinParam.safeParse({ cin: 'AB123456' }).success).toBe(true);
  });

  it('rejects short cin', () => {
    expect(teacherCinParam.safeParse({ cin: 'AB' }).success).toBe(false);
  });
});

describe('teacherEmailParam', () => {
  it('accepts valid email', () => {
    expect(teacherEmailParam.safeParse({ email: 'a@b.com' }).success).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(teacherEmailParam.safeParse({ email: 'bad' }).success).toBe(false);
  });
});

describe('teacherPhoneParam', () => {
  it('accepts valid phone', () => {
    expect(teacherPhoneParam.safeParse({ phone: '+212600000000' }).success).toBe(true);
  });

  it('rejects invalid phone', () => {
    expect(teacherPhoneParam.safeParse({ phone: 'abc' }).success).toBe(false);
  });
});

describe('deleteBulkTeacherDto', () => {
  it('accepts array of non-empty strings', () => {
    expect(deleteBulkTeacherDto.safeParse(['tch_01', 'tch_02']).success).toBe(true);
  });

  it('rejects array with empty strings', () => {
    expect(deleteBulkTeacherDto.safeParse(['tch_01', '']).success).toBe(false);
  });
});

describe('createTeachersBulkDto', () => {
  it('accepts array of valid teachers', () => {
    expect(createTeachersBulkDto.safeParse([validTeacher]).success).toBe(true);
  });

  it('accepts empty array', () => {
    expect(createTeachersBulkDto.safeParse([]).success).toBe(true);
  });

  it('rejects array with one invalid teacher', () => {
    expect(createTeachersBulkDto.safeParse([validTeacher, { ...validTeacher, email: 'bad' }]).success).toBe(false);
  });
});

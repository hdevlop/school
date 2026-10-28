import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { StudentService } from '../../src/modules/students/StudentService';
import { StudentValidator } from '../../src/modules/students/StudentValidator';
import { createStudentDto, importStudentDto, updateStudentDto } from '../../src/modules/students/StudentDto';
import { ParentService } from '../../src/modules/parents/ParentService';
import { ParentValidator } from '../../src/modules/parents/ParentValidator';
import { createParentDto, importParentDto, updateParentDto } from '../../src/modules/parents/ParentDto';
import { withEnglishMessages } from '../support/englishMessages';

function family() {
  const users: any[] = [], students: any[] = [], parents: any[] = [], links: any[] = [], enrollments: any[] = [];
  const view = (record: any) => record && { ...record, email: users.find(user => user.id === record.userId)?.email ?? null };
  const parentRepository = {
    getById: async (id: string) => view(parents.find(row => row.id === id)),
    getByPhone: async (phone: string) => view(parents.find(row => row.phone === phone)),
    getByCin: async (cin: string) => view(parents.find(row => row.cin === cin)),
    getByEmail: async (email: string) => view(parents.find(row => view(row).email?.toLowerCase() === email.toLowerCase())),
    create: async (row: any) => { parents.push(row); return row; },
    update: async (id: string, data: any) => Object.assign(parents.find(row => row.id === id), data),
    checkStudentExists: async (id: string) => students.some(row => row.id === id),
    checkStudentLinked: async (parentId: string, studentId: string) => links.some(row => row.parentId === parentId && row.studentId === studentId),
    linkStudent: async (row: any) => { links.push(row); return row; },
  };
  const studentRepository = {
    create: async (row: any) => { students.push(row); return row; },
    getById: async (id: string) => view(students.find(row => row.id === id)),
    getAll: async ({ studentId }: any) => students.filter(row => row.id === studentId).map(view),
    update: async (id: string, data: any) => Object.assign(students.find(row => row.id === id), data),
  };
  const auth = { inviteUser: async (data: any) => {
    if (!data.email && !data.phone) throw new Error('Missing identity');
    if (users.some(row => data.phone && row.phone === data.phone || data.email && row.email === data.email)) throw new Error('Duplicate login');
    const user = { ...data, id: `user-${users.length}`, emailSent: Boolean(data.email) };
    users.push(user); return user;
  } };
  const userService = { update: async (id: string, data: any) => {
    expect(id).toBeTruthy();
    Object.assign(users.find(row => row.id === id), data);
  } };
  const storage = { processFile: async (_namespace: string, image: any, options: any) => image || options.fallback };
  const parentValidator = withEnglishMessages(new ParentValidator(parentRepository as any, {} as any));
  const parentService = new ParentService(parentRepository as any, parentValidator, userService as any, auth as any, storage as any, {} as any);
  const studentValidator = withEnglishMessages(new StudentValidator(studentRepository as any, {} as any, {} as any, {} as any, {} as any));
  Object.assign(studentValidator, Object.fromEntries([
    'ensureCodeUnique', 'ensureEmailUnique', 'ensurePhoneUnique', 'ensureClassAndSectionValid',
  ].map(key => [key, async () => {}])));
  const studentService = new StudentService(
    studentRepository as any, studentValidator, userService as any, auth as any, parentService,
    { processFees: async () => {} } as any, {} as any,
    { resolveNewStudentPlacement: async () => ({ id: 'year', label: '2026-2027' }), create: async (row: any, actorId: string) => { const record = { ...row, id: 'enrollment', actorId }; enrollments.push(record); return record; }, end: async (id: string, data: any, actorId: string) => { Object.assign(enrollments.find(row => row.id === id), data, { endedBy: actorId }); } } as any,
    storage as any,
  );
  return { studentService, parentService, parentValidator, users, students, parents, links, enrollments };
}

const student = { name: 'Yasmine Alaoui', studentCode: 'S1', classId: 'class', sectionId: 'section', gender: 'F' as const, enrollmentDate: '2026-09-01', yearEnrolledOn: '2026-09-01' };
const guardian = { name: 'Fatima Alaoui', phone: '+212612345678', relationshipType: 'mother' };
const actor = { id: 'admin', role: 'admin' };

describe('student records and family logins', () => {
  it('saves a separate Arabic name on create and update, including an explicit clear', async () => {
    const f = family();
    const record = await f.studentService.create(createStudentDto.parse({ ...student, arabicName: '  ياسمين العلوي  ' }), actor);
    expect(f.students[0]).toMatchObject({ name: student.name, arabicName: 'ياسمين العلوي', studentCode: 'S1' });
    await f.studentService.update(record.id, updateStudentDto.parse({ arabicName: 'ياسمين بناني' }), actor);
    expect(f.students[0].arabicName).toBe('ياسمين بناني');
    await f.studentService.update(record.id, { name: 'Updated Name' }, actor);
    expect(f.students[0].arabicName).toBe('ياسمين بناني');
    await f.studentService.update(record.id, updateStudentDto.parse({ arabicName: '' }), actor);
    expect(f.students[0].arabicName).toBe('');
    expect(f.users).toEqual([]);
  });
  it('registers siblings without student logins and links both to one parent phone account', async () => {
    const f = family();
    for (const studentCode of ['S1', 'S2']) {
      await f.studentService.createForImport(importStudentDto.parse({ ...student, studentCode, parents: [guardian] }), actor);
    }
    expect(f.students).toHaveLength(2);
    expect(f.students.every(row => row.userId === null)).toBe(true);
    expect(f.parents).toHaveLength(1);
    expect(f.parents[0].cin).toBeNull();
    expect(f.users.map(row => ({ role: row.role, phone: row.phone }))).toEqual([{ role: 'parent', phone: guardian.phone }]);
    expect(f.links).toHaveLength(2);
    expect(f.enrollments.map(row => row.actorId)).toEqual(['admin', 'admin']);
  });

  it('preserves guardians without contacts, without merging people solely by name', async () => {
    const f = family();
    for (const studentCode of ['S1', 'S2']) {
      await f.studentService.createForImport(importStudentDto.parse({ ...student, studentCode, parents: [{ name: guardian.name, relationshipType: 'guardian' }] }), actor);
    }
    expect(f.parents).toHaveLength(2);
    expect(f.users).toEqual([]);
    expect(f.links).toHaveLength(2);
  });

  it('edits records and images without a login, and provisions a student login when personal contact is added', async () => {
    const f = family();
    const record = await f.studentService.create(createStudentDto.parse(student), actor);
    await f.studentService.update(record.id, { name: 'Yasmine Updated', image: '/student.png' }, actor);
    expect(f.users).toEqual([]);
    expect(f.students[0]).toMatchObject({ name: 'Yasmine Updated', image: '/student.png' });
    await f.studentService.update(record.id, { email: 'student@example.ma' }, actor);
    expect(f.users).toHaveLength(1);
    expect(f.users[0]).toMatchObject({ role: 'student', status: 'pending', email: 'student@example.ma', image: '/student.png' });
    expect(f.students[0].userId).toBe(f.users[0].id);
    await f.studentService.update(record.id, { name: 'Yasmine Final' }, actor);
    expect(f.users).toHaveLength(1);
    expect(f.users[0].name).toBe('Yasmine Final');
  });

  it('provisions the same guardian record when their first phone is entered later', async () => {
    const f = family();
    const record = await f.parentService.createForImport(importParentDto.parse({ name: guardian.name, relationshipType: 'guardian' }));
    await f.parentService.update(record.id, { name: 'Fatima Updated', image: '/parent.png' });
    expect(f.users).toEqual([]);
    await f.parentService.update(record.id, { phone: guardian.phone });
    expect(f.parents).toHaveLength(1);
    expect(f.parents[0].userId).toBe(f.users[0].id);
    expect(f.users[0]).toMatchObject({ role: 'parent', phone: guardian.phone, image: '/parent.png' });
  });

  it('reuses a known guardian email but rejects identifiers that point to different parents', async () => {
    const f = family();
    const first = await f.parentService.createForImport(importParentDto.parse({ ...guardian, email: 'guardian@example.ma' }));
    expect((await f.parentValidator.findReusable(importParentDto.parse({ name: guardian.name, relationshipType: 'guardian', email: 'GUARDIAN@example.ma' })))?.id).toBe(first.id);
    await f.parentService.create(createParentDto.parse({ name: 'Other Guardian', phone: '+212612345679', cin: 'AB123456', relationshipType: 'guardian' }));
    await expect(f.parentValidator.findReusable(importParentDto.parse({ ...guardian, cin: 'AB123456' }))).rejects.toThrow();
    expect(f.parents).toHaveLength(2);
  });
});

describe('manual parent requirements and file-import exception', () => {
  it('allows incremental edits of imported records but refuses clearing contact values', () => {
    expect(updateParentDto.safeParse({ name: 'Fatima Updated' }).success).toBe(true);
    expect(updateParentDto.safeParse({ phone: guardian.phone }).success).toBe(true);
    expect(updateParentDto.safeParse({ cin: 'AB123456' }).success).toBe(true);
    for (const value of ['', null, '        ']) {
      expect(updateParentDto.safeParse({ phone: value }).success).toBe(false);
      expect(updateParentDto.safeParse({ cin: value }).success).toBe(false);
    }
  });
  it('rejects incomplete manual parents at DTO and service boundaries before any writes', async () => {
    for (const values of [{}, { phone: guardian.phone }, { cin: 'AB123456' }, { phone: '', cin: '' }, { phone: null, cin: null }]) {
      const parent = { name: guardian.name, relationshipType: 'guardian', ...values };
      expect(createParentDto.safeParse(parent).success).toBe(false);
      expect(createStudentDto.safeParse({ ...student, parents: [parent], source: 'import' }).success).toBe(false);
      const f = family();
      await expect(f.parentService.create(parent as never)).rejects.toThrow();
      await expect(f.studentService.create({ ...student, parents: [parent], source: 'import' } as never, actor)).rejects.toThrow();
      expect([f.users, f.students, f.parents, f.links, f.enrollments]).toEqual([[], [], [], [], []]);
    }
  });

  it('allows complete manual parent entry while the student phone remains optional', async () => {
    const f = family();
    await f.studentService.create(createStudentDto.parse({ ...student, parents: [{ ...guardian, cin: 'AB123456' }] }), actor);
    expect(f.students[0].phone).toBeUndefined();
    expect(f.parents[0]).toMatchObject({ phone: guardian.phone, cin: 'AB123456' });
    expect(f.links).toHaveLength(1);
  });

  it('imports a student without parent information without creating a placeholder', async () => {
    const f = family();
    await f.studentService.createForImport(importStudentDto.parse(student), actor);
    expect(f.students).toHaveLength(1);
    expect([f.users, f.parents, f.links]).toEqual([[], [], []]);
  });

  it('rejects malformed values supplied through the import service', async () => {
    for (const values of [{ phone: 'invalid' }, { cin: 'AB' }, { cin: '        ' }]) {
      const parent = { name: guardian.name, relationshipType: 'guardian', ...values };
      const input = { ...student, parents: [parent] };
      expect(importStudentDto.safeParse(input).success).toBe(false);
      const f = family();
      await expect(f.studentService.createForImport(input as never, actor)).rejects.toThrow();
      expect([f.users, f.students, f.parents]).toEqual([[], [], []]);
    }
  });
});


describe('departed student import', () => {
  it('creates the family record and ends its enrollment with an audit actor', async () => {
    const f = family();
    await f.studentService.createForImport(importStudentDto.parse({ ...student, departure: { leftOn: '2026-10-12', status: 'withdrawn' } }), actor);
    expect(f.students).toHaveLength(1);
    expect(f.enrollments[0]).toMatchObject({ leftOn: '2026-10-12', status: 'withdrawn', endedBy: 'admin' });
  });
  it('does not let a non-administrator bypass enrollment permissions through import', async () => {
    const f = family();
    await expect(f.studentService.createForImport(importStudentDto.parse({ ...student, departure: { leftOn: '2026-10-12', status: 'withdrawn' } }), { id: 'secretary', role: 'secretary' })).rejects.toThrow();
    expect(f.students).toHaveLength(0);
  });
});

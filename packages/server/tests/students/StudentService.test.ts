import { describe, expect, it, mock } from 'bun:test';

const najmEvent = await import('najm-event');

mock.module('najm-event', () => ({
  ...najmEvent,
  Events: () => () => undefined,
  EventService: class {},
  On: () => () => undefined,
}));

const { StudentService } = await import('@server/modules/students/StudentService');

function createMockServiceDeps() {
  return {
    studentRepository: {
      getAll: mock(() => Promise.resolve([])),
      getById: mock(() => Promise.resolve(null)),
      getCount: mock(() => Promise.resolve({ count: 0 })),
      getStudentsByGender: mock(() => Promise.resolve([])),
      getParentsByStudentId: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve({ id: 'stu_01' })),
      update: mock(() => Promise.resolve({ id: 'stu_01', name: 'Updated' })),
      delete: mock(() => Promise.resolve({ id: 'stu_01', userId: 'usr_01' })),
      deleteAll: mock(() => Promise.resolve({ deletedCount: 0, deletedStudents: [] })),
    },
    studentValidator: {
      ensureExists: mock(() => Promise.resolve({
        id: 'stu_01',
        userId: 'usr_01',
        studentCode: 'STU001',
        name: 'Ahmed Benali',
        email: 'ahmed@example.com',
        phone: '+212600000000',
        sectionId: 'sec_01',
      })),
      ensureUserIdUnique: mock(() => Promise.resolve()),
      ensureIdUnique: mock(() => Promise.resolve()),
      ensureCodeUnique: mock(() => Promise.resolve()),
      ensureEmailUnique: mock(() => Promise.resolve()),
      ensurePhoneUnique: mock(() => Promise.resolve()),
      ensureClassAndSectionValid: mock(() => Promise.resolve()),
    },
    userService: {
      create: mock(() => Promise.resolve({ id: 'usr_01', email: 'ahmed@example.com' })),
      update: mock(() => Promise.resolve({ id: 'usr_01' })),
    },
    authService: {
      provisionUser: mock(() => Promise.resolve({ id: 'usr_01', email: 'ahmed@example.com' })),
    },
    parentService: {
      processParents: mock(() => Promise.resolve()),
    },
    feeService: {
      processFees: mock(() => Promise.resolve()),
    },
    studentRouteService: {
      assign: mock(() => Promise.resolve()),
    },
    storage: {
      processFile: mock(() => Promise.resolve('/images/student_male.png')),
      delete: mock(() => Promise.resolve()),
    },
  };
}

function createService(deps = createMockServiceDeps()) {
  const service = new StudentService(
    deps.studentRepository as any,
    deps.studentValidator as any,
    deps.userService as any,
    deps.authService as any,
    deps.parentService as any,
    deps.feeService as any,
    deps.studentRouteService as any,
    deps.storage as any,
  );
  return { service, deps };
}

const validCreateData = {
  classId: 'cls_01',
  sectionId: 'sec_01',
  studentCode: 'STU001',
  name: 'Ahmed Benali',
  email: 'ahmed@example.com',
  phone: '+212600000000',
  gender: 'M',
  enrollmentDate: '2024-09-01',
};

describe('StudentService', () => {
  describe('getCount', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.studentRepository.getCount.mockImplementation(() => Promise.resolve({ count: 42 }));

      const result = await service.getCount();
      expect(result).toEqual({ count: 42 });
    });
  });

  describe('getStudentsByGender', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      const genderData = [{ name: 'Male', value: 25 }, { name: 'Female', value: 17 }];
      deps.studentRepository.getStudentsByGender.mockImplementation(() => Promise.resolve(genderData));

      const result = await service.getStudentsByGender();
      expect(result).toEqual(genderData);
    });
  });

  describe('getAll', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.studentRepository.getAll.mockImplementation(() => Promise.resolve([{ id: 'stu_01' }]));

      const result = await service.getAll();
      expect(result).toEqual([{ id: 'stu_01' }]);
    });
  });

  describe('getById', () => {
    it('delegates to validator ensureExists', async () => {
      const { service, deps } = createService();
      const mockStudent = { id: 'stu_01', name: 'Ahmed Benali' };
      deps.studentValidator.ensureExists.mockImplementation(() => Promise.resolve(mockStudent));

      const result = await service.getById('stu_01');
      expect(result).toEqual(mockStudent);
      expect(deps.studentValidator.ensureExists).toHaveBeenCalledWith('stu_01');
    });
  });

  describe('getParents', () => {
    it('returns parents for a valid student', async () => {
      const { service, deps } = createService();
      const mockParents = [{ id: 'par_01', name: 'Father' }];
      deps.studentRepository.getParentsByStudentId.mockImplementation(() => Promise.resolve(mockParents));

      const result = await service.getParents('stu_01');
      expect(result).toEqual(mockParents);
      expect(deps.studentValidator.ensureExists).toHaveBeenCalledWith('stu_01');
    });
  });

  describe('create', () => {
    it('creates a student with all validations', async () => {
      const { service, deps } = createService();
      deps.studentRepository.create.mockImplementation((data) => Promise.resolve({ ...data, id: data.id || 'stu_01' }));

      const result = await service.create(validCreateData);

      expect(deps.studentValidator.ensureCodeUnique).toHaveBeenCalledWith('STU001');
      expect(deps.studentValidator.ensureEmailUnique).toHaveBeenCalledWith('ahmed@example.com');
      expect(deps.studentValidator.ensurePhoneUnique).toHaveBeenCalledWith('+212600000000');
      expect(deps.studentValidator.ensureClassAndSectionValid).toHaveBeenCalledWith('cls_01', 'sec_01');
      expect(deps.authService.provisionUser).toHaveBeenCalled();
      expect(deps.studentRepository.create).toHaveBeenCalled();
      expect(deps.parentService.processParents).toHaveBeenCalled();
      expect(deps.feeService.processFees).toHaveBeenCalled();
    });

    it('creates a student with custom id', async () => {
      const { service, deps } = createService();
      const data = { ...validCreateData, id: 'custom_01' };
      deps.studentRepository.create.mockImplementation((d) => Promise.resolve(d));

      await service.create(data);

      expect(deps.studentValidator.ensureIdUnique).toHaveBeenCalledWith('custom_01');
    });

    it('creates a student with userId', async () => {
      const { service, deps } = createService();
      const data = { ...validCreateData, userId: 'usr_existing' };
      deps.studentRepository.create.mockImplementation((d) => Promise.resolve(d));

      await service.create(data);

      expect(deps.studentValidator.ensureUserIdUnique).toHaveBeenCalledWith('usr_existing');
    });

    it('skips userId uniqueness check when not provided', async () => {
      const { service, deps } = createService();
      deps.studentRepository.create.mockImplementation((d) => Promise.resolve(d));

      await service.create(validCreateData);

      expect(deps.studentValidator.ensureUserIdUnique).not.toHaveBeenCalled();
    });

    it('skips id uniqueness check when not provided', async () => {
      const { service, deps } = createService();
      deps.studentRepository.create.mockImplementation((d) => Promise.resolve(d));

      await service.create(validCreateData);

      expect(deps.studentValidator.ensureIdUnique).not.toHaveBeenCalled();
    });

    it('processes parents when provided', async () => {
      const { service, deps } = createService();
      const data = {
        ...validCreateData,
        parents: [{ name: 'Father' }],
        parentIds: ['par_existing'],
      };
      deps.studentRepository.create.mockImplementation((d) => Promise.resolve({ ...d }));

      await service.create(data);

      expect(deps.parentService.processParents).toHaveBeenCalledWith(
        expect.anything(),
        [{ name: 'Father' }, 'par_existing'],
      );
    });

    it('passes phone as undefined when not provided', async () => {
      const { service, deps } = createService();
      const data = { ...validCreateData, phone: undefined };
      deps.studentRepository.create.mockImplementation((d) => Promise.resolve(d));

      await service.create(data);

      expect(deps.studentValidator.ensurePhoneUnique).toHaveBeenCalledWith(undefined);
    });

    it('uses male fallback image for male student', async () => {
      const { service, deps } = createService();
      deps.studentRepository.create.mockImplementation((d) => Promise.resolve(d));

      await service.create(validCreateData);

      expect(deps.storage.processFile).toHaveBeenCalledWith(
        'students',
        undefined,
        expect.objectContaining({ fallback: '/images/student_male.png' }),
      );
    });

    it('uses female fallback image for female student', async () => {
      const { service, deps } = createService();
      const data = { ...validCreateData, gender: 'F' };
      deps.studentRepository.create.mockImplementation((d) => Promise.resolve(d));

      await service.create(data);

      expect(deps.storage.processFile).toHaveBeenCalledWith(
        'students',
        undefined,
        expect.objectContaining({ fallback: '/images/student_female.png' }),
      );
    });
  });

  describe('update', () => {
    it('updates user and student data', async () => {
      const { service, deps } = createService();
      const data = { name: 'Updated Name', email: 'updated@example.com' };
      deps.studentRepository.update.mockImplementation((_id, d) => Promise.resolve({ id: 'stu_01', ...d }));

      const result = await service.update('stu_01', data);

      expect(deps.studentValidator.ensureExists).toHaveBeenCalledWith('stu_01');
      expect(deps.studentValidator.ensureCodeUnique).toHaveBeenCalledWith(undefined, 'stu_01');
      expect(deps.studentValidator.ensureEmailUnique).toHaveBeenCalledWith('updated@example.com', 'stu_01');
      expect(deps.userService.update).toHaveBeenCalled();
      expect(deps.studentRepository.update).toHaveBeenCalledWith('stu_01', expect.anything());
    });

    it('calculates age when dateOfBirth is provided', async () => {
      const { service, deps } = createService();
      const data = { dateOfBirth: '2010-05-15' };
      deps.studentRepository.update.mockImplementation((_id, d) => Promise.resolve({ id: 'stu_01', ...d }));

      await service.update('stu_01', data);

      const updateCall = deps.studentRepository.update.mock.calls[0];
      const studentData = updateCall[1];
      expect(studentData.age).toBeGreaterThanOrEqual(14);
      expect(studentData.age).toBeLessThanOrEqual(16);
    });

    it('processes image when provided', async () => {
      const { service, deps } = createService();
      const data = { image: '/images/new_avatar.png' };
      deps.studentRepository.update.mockImplementation((_id, d) => Promise.resolve({ id: 'stu_01', ...d }));

      await service.update('stu_01', data);

      expect(deps.storage.processFile).toHaveBeenCalled();
    });

    it('does not process image when not provided', async () => {
      const { service, deps } = createService();
      const data = { name: 'Updated Name' };
      deps.studentRepository.update.mockImplementation((_id, d) => Promise.resolve({ id: 'stu_01', ...d }));

      await service.update('stu_01', data);

      expect(deps.storage.processFile).not.toHaveBeenCalled();
    });

    it('passes phone as undefined when null', async () => {
      const { service, deps } = createService();
      const data = { phone: null };
      deps.studentRepository.update.mockImplementation((_id, d) => Promise.resolve({ id: 'stu_01', ...d }));

      await service.update('stu_01', data);

      expect(deps.studentValidator.ensurePhoneUnique).toHaveBeenCalledWith(undefined, 'stu_01');
    });
  });

  describe('delete', () => {
    it('deletes student and cleans up avatar', async () => {
      const { service, deps } = createService();
      deps.studentRepository.delete.mockImplementation(() => Promise.resolve({ id: 'stu_01', userId: 'usr_01' }));

      const result = await service.delete('stu_01');

      expect(deps.studentValidator.ensureExists).toHaveBeenCalledWith('stu_01');
      expect(deps.studentRepository.delete).toHaveBeenCalledWith('stu_01');
      expect(deps.storage.delete).toHaveBeenCalledWith('students', 'stu_01_avatar.png');
    });
  });

  describe('deleteAll', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.studentRepository.deleteAll.mockImplementation(() => Promise.resolve({ deletedCount: 5, deletedStudents: [] }));

      const result = await service.deleteAll();
      expect(result.deletedCount).toBe(5);
    });
  });

  describe('deleteBulk', () => {
    it('deletes multiple students and returns results', async () => {
      const { service, deps } = createService();
      deps.studentRepository.delete.mockImplementation(() => Promise.resolve({ id: 'stu_01', userId: 'usr_01' }));

      const result = await service.deleteBulk(['stu_01', 'stu_02']);

      expect(result.deletedCount).toBe(2);
      expect(result.deletedStudents).toHaveLength(2);
    });

    it('returns correct shape', async () => {
      const { service, deps } = createService();
      deps.studentRepository.delete.mockImplementation(() => Promise.resolve({ id: 'stu_01' }));

      const result = await service.deleteBulk(['stu_01']);

      expect(result).toHaveProperty('deletedCount');
      expect(result).toHaveProperty('deletedStudents');
      expect(result).toHaveProperty('deletedFees');
    });
  });

  describe('createBulk', () => {
    it('creates multiple students successfully', async () => {
      const { service, deps } = createService();
      deps.studentRepository.create.mockImplementation((d) => Promise.resolve(d));

      const students = [validCreateData, { ...validCreateData, studentCode: 'STU002' }];
      const result = await service.createBulk(students);

      expect(result).toHaveLength(2);
    });

    it('skips duplicate conflicts', async () => {
      const { service, deps } = createService();
      deps.studentValidator.ensureCodeUnique.mockImplementation(() => {
        const err = new Error('Code already exists') as any;
        err.status = 409;
        throw err;
      });

      const result = await service.createBulk([validCreateData]);

      expect(result).toEqual([]);
    });

    it('wraps individual errors with context', async () => {
      const { service, deps } = createService();
      deps.studentValidator.ensureCodeUnique.mockImplementation(() => {
        throw new Error('Code already exists');
      });

      try {
        await service.createBulk([validCreateData]);
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('STU001');
        expect(error.message).toContain('Code already exists');
      }
    });

    it('uses student name in error when code is missing', async () => {
      const { service, deps } = createService();
      const data = { ...validCreateData, studentCode: undefined };
      deps.studentValidator.ensureCodeUnique.mockImplementation(() => {
        throw new Error('fail');
      });

      try {
        await service.createBulk([data]);
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('Ahmed Benali');
      }
    });

    it('uses index as last resort identifier', async () => {
      const { service, deps } = createService();
      const data = { ...validCreateData, studentCode: undefined, name: undefined };
      deps.studentValidator.ensureCodeUnique.mockImplementation(() => {
        throw new Error('fail');
      });

      try {
        await service.createBulk([data]);
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('at index 0');
      }
    });

    it('returns empty array for empty input', async () => {
      const { service, deps } = createService();
      const result = await service.createBulk([]);
      expect(result).toEqual([]);
    });
  });
});

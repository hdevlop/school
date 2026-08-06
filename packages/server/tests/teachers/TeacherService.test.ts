import { describe, expect, it, mock } from 'bun:test';

mock.module('najm-event', () => ({
  Events: () => () => undefined,
  EventService: class {},
  On: () => () => undefined,
  events: () => ({ services: () => ({ build: () => ({}) }) }),
  getEventListeners: () => [],
  EVENTS_META: Symbol('events'),
  EVENT_CONFIG: Symbol('event_config'),
  EVENT_SERVICE: Symbol('event_service'),
}));

// deleteAll queries the db singleton for linked staff ids; stub it to return none
// so the unit test stays hermetic (no real Postgres connection).
mock.module('@server/database/db', () => ({
  db: {
    select: () => ({ from: () => ({ innerJoin: () => Promise.resolve([]) }) }),
  },
}));

const { TeacherService } = await import('@server/modules/teachers/TeacherService');

function createMockDeps() {
  return {
    teacherRepository: {
      getAll: mock(() => Promise.resolve([])),
      getById: mock(() => Promise.resolve(null)),
      getByCin: mock(() => Promise.resolve(null)),
      getByEmail: mock(() => Promise.resolve(null)),
      getByPhone: mock(() => Promise.resolve(null)),
      getBySpecialization: mock(() => Promise.resolve([])),
      getCount: mock(() => Promise.resolve({ count: 0 })),
      getClasses: mock(() => Promise.resolve([])),
      getStudents: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve({ id: 'tch_01' })),
      update: mock(() => Promise.resolve({ id: 'tch_01' })),
      delete: mock(() => Promise.resolve({ id: 'tch_01', userId: 'usr_01' })),
      deleteAll: mock(() => Promise.resolve({ deletedCount: 0, deletedTeachers: [] })),
      createAssignment: mock(() => Promise.resolve()),
    },
    teacherValidator: {
      ensureExists: mock(() => Promise.resolve({
        id: 'tch_01', userId: 'usr_01', staffId: 'stf_01', cin: 'AB123456',
        name: 'Fatima', email: 'fatima@example.com', phone: '+212600000000',
      })),
      ensureUserIdUnique: mock(() => Promise.resolve()),
      ensureIdUnique: mock(() => Promise.resolve()),
      ensureCinUnique: mock(() => Promise.resolve()),
      ensureEmailUnique: mock(() => Promise.resolve()),
      ensurePhoneUnique: mock(() => Promise.resolve()),
      ensureAssignmentsValid: mock(() => Promise.resolve()),
      ensureCinExists: mock(() => Promise.resolve({ id: 'tch_01' })),
      ensureEmailExists: mock(() => Promise.resolve({ id: 'tch_01' })),
      ensurePhoneExists: mock(() => Promise.resolve({ id: 'tch_01' })),
    },
    userService: {
      create: mock(() => Promise.resolve({ id: 'usr_01', email: 'fatima@example.com' })),
      update: mock(() => Promise.resolve({ id: 'usr_01' })),
    },
    authService: {
      provisionUser: mock(() => Promise.resolve({ id: 'usr_01', email: 'fatima@example.com' })),
    },
    storage: {
      processFile: mock(() => Promise.resolve('/images/teacher_female.png')),
      delete: mock(() => Promise.resolve()),
    },
    staffService: {
      create: mock(() => Promise.resolve({ id: 'stf_01' })),
      update: mock(() => Promise.resolve({ id: 'stf_01' })),
      delete: mock(() => Promise.resolve({ id: 'stf_01' })),
    },
  };
}

function createService(deps = createMockDeps()) {
  const service = new TeacherService(
    deps.teacherRepository as any,
    deps.teacherValidator as any,
    deps.userService as any,
    deps.authService as any,
    deps.storage as any,
    deps.staffService as any,
  );
  return { service, deps };
}

const validCreateData = {
  name: 'Fatima Zahra',
  cin: 'AB123456',
  email: 'fatima@example.com',
  phone: '+212600000000',
  hireDate: '2024-09-01',
  assignments: [{ classId: 'cls_01', sectionIds: ['sec_01'], subjectIds: ['sub_01'] }],
};

describe('TeacherService', () => {
  describe('getAll', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.teacherRepository.getAll.mockImplementation(() => Promise.resolve([{ id: 'tch_01' }]));
      const result = await service.getAll();
      expect(result).toEqual([{ id: 'tch_01' }]);
    });
  });

  describe('getCount', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.teacherRepository.getCount.mockImplementation(() => Promise.resolve({ count: 10 }));
      const result = await service.getCount();
      expect(result).toEqual({ count: 10 });
    });
  });

  describe('getById', () => {
    it('delegates to validator ensureExists', async () => {
      const { service, deps } = createService();
      const mockTeacher = { id: 'tch_01', name: 'Fatima' };
      deps.teacherValidator.ensureExists.mockImplementation(() => Promise.resolve(mockTeacher));
      const result = await service.getById('tch_01');
      expect(result).toEqual(mockTeacher);
    });
  });

  describe('getByCin', () => {
    it('delegates to validator ensureCinExists', async () => {
      const { service, deps } = createService();
      const mockTeacher = { id: 'tch_01' };
      deps.teacherValidator.ensureCinExists.mockImplementation(() => Promise.resolve(mockTeacher));
      const result = await service.getByCin('AB123456');
      expect(result).toEqual(mockTeacher);
    });
  });

  describe('getByEmail', () => {
    it('delegates to validator ensureEmailExists', async () => {
      const { service, deps } = createService();
      const mockTeacher = { id: 'tch_01' };
      deps.teacherValidator.ensureEmailExists.mockImplementation(() => Promise.resolve(mockTeacher));
      const result = await service.getByEmail('fatima@example.com');
      expect(result).toEqual(mockTeacher);
    });
  });

  describe('getByPhone', () => {
    it('delegates to validator ensurePhoneExists', async () => {
      const { service, deps } = createService();
      const mockTeacher = { id: 'tch_01' };
      deps.teacherValidator.ensurePhoneExists.mockImplementation(() => Promise.resolve(mockTeacher));
      const result = await service.getByPhone('+212600000000');
      expect(result).toEqual(mockTeacher);
    });
  });

  describe('getBySpecialization', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.teacherRepository.getBySpecialization.mockImplementation(() => Promise.resolve([{ id: 'tch_01' }]));
      const result = await service.getBySpecialization('Math');
      expect(result).toEqual([{ id: 'tch_01' }]);
    });
  });

  describe('getClasses', () => {
    it('ensures teacher exists then gets classes', async () => {
      const { service, deps } = createService();
      deps.teacherRepository.getClasses.mockImplementation(() => Promise.resolve([{ id: 'cls_01' }]));
      const result = await service.getClasses('tch_01');
      expect(deps.teacherValidator.ensureExists).toHaveBeenCalledWith('tch_01');
      expect(result).toEqual([{ id: 'cls_01' }]);
    });
  });

  describe('getStudents', () => {
    it('ensures teacher exists then gets students', async () => {
      const { service, deps } = createService();
      deps.teacherRepository.getStudents.mockImplementation(() => Promise.resolve([{ id: 'stu_01' }]));
      const result = await service.getStudents('tch_01');
      expect(deps.teacherValidator.ensureExists).toHaveBeenCalledWith('tch_01');
      expect(result).toEqual([{ id: 'stu_01' }]);
    });
  });

  describe('create', () => {
    it('creates a teacher with all validations', async () => {
      const { service, deps } = createService();
      deps.teacherRepository.create.mockImplementation((d) => Promise.resolve(d));

      await service.create(validCreateData);

      expect(deps.teacherValidator.ensureCinUnique).toHaveBeenCalledWith('AB123456');
      expect(deps.teacherValidator.ensureEmailUnique).toHaveBeenCalledWith('fatima@example.com');
      expect(deps.teacherValidator.ensurePhoneUnique).toHaveBeenCalledWith('+212600000000');
      expect(deps.teacherValidator.ensureAssignmentsValid).toHaveBeenCalledWith(validCreateData.assignments);
      expect(deps.authService.provisionUser).toHaveBeenCalled();
      expect(deps.teacherRepository.create).toHaveBeenCalled();
    });

    it('creates teacher with custom id', async () => {
      const { service, deps } = createService();
      const data = { ...validCreateData, id: 'custom_01' };
      deps.teacherRepository.create.mockImplementation((d) => Promise.resolve(d));

      await service.create(data);
      expect(deps.teacherValidator.ensureIdUnique).toHaveBeenCalledWith('custom_01');
    });

    it('creates teacher with userId', async () => {
      const { service, deps } = createService();
      const data = { ...validCreateData, userId: 'usr_existing' };
      deps.teacherRepository.create.mockImplementation((d) => Promise.resolve(d));

      await service.create(data);
      expect(deps.teacherValidator.ensureUserIdUnique).toHaveBeenCalledWith('usr_existing');
    });

    it('skips userId check when not provided', async () => {
      const { service, deps } = createService();
      deps.teacherRepository.create.mockImplementation((d) => Promise.resolve(d));
      await service.create(validCreateData);
      expect(deps.teacherValidator.ensureUserIdUnique).not.toHaveBeenCalled();
    });

    it('uses female fallback image for female teacher', async () => {
      const { service, deps } = createService();
      const data = { ...validCreateData, gender: 'F' };
      deps.teacherRepository.create.mockImplementation((d) => Promise.resolve(d));

      await service.create(data);
      expect(deps.storage.processFile).toHaveBeenCalledWith(
        'teachers', undefined,
        expect.objectContaining({ fallback: '/images/teacher_female.png' }),
      );
    });

    it('uses male fallback image for male teacher', async () => {
      const { service, deps } = createService();
      const data = { ...validCreateData, gender: 'M' };
      deps.teacherRepository.create.mockImplementation((d) => Promise.resolve(d));

      await service.create(data);
      expect(deps.storage.processFile).toHaveBeenCalledWith(
        'teachers', undefined,
        expect.objectContaining({ fallback: '/images/teacher_male.png' }),
      );
    });

    it('processes assignments by creating each combination', async () => {
      const { service, deps } = createService();
      deps.teacherRepository.create.mockImplementation((d) => Promise.resolve({ ...d, id: 'tch_01' }));

      const data = {
        ...validCreateData,
        assignments: [{
          classId: 'cls_01',
          sectionIds: ['sec_01', 'sec_02'],
          subjectIds: ['sub_01', 'sub_02'],
        }],
      };

      await service.create(data);
      expect(deps.teacherRepository.createAssignment).toHaveBeenCalledTimes(4);
    });
  });

  describe('update', () => {
    it('updates user and teacher data', async () => {
      const { service, deps } = createService();
      const data = { name: 'Updated Name', email: 'updated@example.com' };
      deps.teacherRepository.update.mockImplementation((_id, d) => Promise.resolve({ id: 'tch_01', ...d }));

      await service.update('tch_01', data);

      expect(deps.teacherValidator.ensureExists).toHaveBeenCalledWith('tch_01');
      expect(deps.teacherValidator.ensureCinUnique).toHaveBeenCalledWith(undefined, 'tch_01');
      expect(deps.teacherValidator.ensureEmailUnique).toHaveBeenCalledWith('updated@example.com', 'tch_01');
      expect(deps.userService.update).toHaveBeenCalled();
      // name is a shared HR field, so it updates via staffService (inverted write path).
      expect(deps.staffService.update).toHaveBeenCalledWith('stf_01', expect.objectContaining({ name: 'Updated Name', role: 'teacher' }));
    });

    it('processes image when provided', async () => {
      const { service, deps } = createService();
      const data = { image: '/images/new.png' };
      deps.teacherRepository.update.mockImplementation((_id, d) => Promise.resolve({ id: 'tch_01', ...d }));

      await service.update('tch_01', data);
      expect(deps.storage.processFile).toHaveBeenCalled();
    });

    it('does not process image when not provided', async () => {
      const { service, deps } = createService();
      const data = { name: 'Updated Name' };
      deps.teacherRepository.update.mockImplementation((_id, d) => Promise.resolve({ id: 'tch_01', ...d }));

      await service.update('tch_01', data);
      expect(deps.storage.processFile).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes teacher and cleans up avatar', async () => {
      const { service, deps } = createService();
      deps.teacherRepository.delete.mockImplementation(() => Promise.resolve({ id: 'tch_01', userId: 'usr_01' }));

      await service.delete('tch_01');
      expect(deps.teacherValidator.ensureExists).toHaveBeenCalledWith('tch_01');
      expect(deps.teacherRepository.delete).toHaveBeenCalledWith('tch_01');
      expect(deps.staffService.delete).toHaveBeenCalledWith('stf_01');
      expect(deps.storage.delete).toHaveBeenCalledWith('teachers', 'tch_01_avatar.png');
    });

    it('propagates staff cleanup failures', async () => {
      const { service, deps } = createService();
      deps.staffService.delete.mockImplementation(() => {
        throw new Error('staff cleanup failed');
      });

      await expect(service.delete('tch_01')).rejects.toThrow('staff cleanup failed');
    });
  });

  describe('deleteAll', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.teacherRepository.deleteAll.mockImplementation(() => Promise.resolve({ deletedCount: 3, deletedTeachers: [] }));

      const result = await service.deleteAll();
      expect(result.deletedCount).toBe(3);
    });
  });

  describe('deleteBulk', () => {
    it('deletes multiple teachers', async () => {
      const { service, deps } = createService();
      deps.teacherRepository.delete.mockImplementation(() => Promise.resolve({ id: 'tch_01', userId: 'usr_01' }));

      const result = await service.deleteBulk(['tch_01', 'tch_02']);
      expect(result.deletedCount).toBe(2);
      expect(result.deletedTeachers).toHaveLength(2);
    });
  });

  describe('createBulk', () => {
    it('creates multiple teachers successfully', async () => {
      const { service, deps } = createService();
      deps.teacherRepository.create.mockImplementation((d) => Promise.resolve(d));

      const result = await service.createBulk([validCreateData, { ...validCreateData, cin: 'CD789012' }]);
      expect(result).toHaveLength(2);
    });

    it('wraps individual errors with context using cin', async () => {
      const { service, deps } = createService();
      deps.teacherValidator.ensureCinUnique.mockImplementation(() => {
        throw new Error('CIN exists');
      });

      try {
        await service.createBulk([validCreateData]);
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('AB123456');
        expect(error.message).toContain('CIN exists');
      }
    });

    it('uses name in error when cin is missing', async () => {
      const { service, deps } = createService();
      const data = { ...validCreateData, cin: undefined };
      deps.teacherValidator.ensureCinUnique.mockImplementation(() => {
        throw new Error('fail');
      });

      try {
        await service.createBulk([data]);
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('Fatima Zahra');
      }
    });

    it('uses index as last resort identifier', async () => {
      const { service, deps } = createService();
      const data = { ...validCreateData, cin: undefined, name: undefined };
      deps.teacherValidator.ensureCinUnique.mockImplementation(() => {
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

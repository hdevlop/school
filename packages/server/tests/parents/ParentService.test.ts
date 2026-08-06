import { describe, expect, it, mock } from 'bun:test';

mock.module('najm-event', () => ({
  Events: () => () => undefined,
  EventService: class {},
  On: () => () => undefined,
}));

const { ParentService } = await import('@server/modules/parents/ParentService');

function createMockDeps() {
  return {
    parentRepository: {
      getAll: mock(() => Promise.resolve([])),
      getById: mock(() => Promise.resolve(null)),
      getByCin: mock(() => Promise.resolve(null)),
      getByEmail: mock(() => Promise.resolve(null)),
      getByPhone: mock(() => Promise.resolve(null)),
      getCount: mock(() => Promise.resolve({ count: 0 })),
      getChildren: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve({ id: 'par_01' })),
      update: mock(() => Promise.resolve({ id: 'par_01' })),
      delete: mock(() => Promise.resolve({ id: 'par_01', userId: 'usr_01' })),
      deleteAll: mock(() => Promise.resolve({ deletedCount: 0, deletedParents: [] })),
      linkStudent: mock(() => Promise.resolve()),
      unlinkStudent: mock(() => Promise.resolve()),
    },
    parentValidator: {
      ensureExists: mock(() => Promise.resolve({
        id: 'par_01', userId: 'usr_01', cin: 'AB123456',
        name: 'Mohammed', email: 'mohammed@example.com', phone: '+212600000000',
      })),
      ensureUserIdUnique: mock(() => Promise.resolve()),
      ensureIdUnique: mock(() => Promise.resolve()),
      ensureCinUnique: mock(() => Promise.resolve()),
      ensureEmailUnique: mock(() => Promise.resolve()),
      ensurePhoneUnique: mock(() => Promise.resolve()),
      ensureGenderValid: mock(() => Promise.resolve(true)),
      ensureRelationshipTypeValid: mock(() => Promise.resolve(true)),
      ensureMaritalStatusValid: mock(() => Promise.resolve(true)),
      ensureCanDelete: mock(() => Promise.resolve(true)),
      ensureCinExists: mock(() => Promise.resolve({ id: 'par_01' })),
      ensurePhoneExists: mock(() => Promise.resolve({ id: 'par_01' })),
      ensureStudentExists: mock(() => Promise.resolve(true)),
      ensureStudentLinked: mock(() => Promise.resolve(true)),
      ensureStudentNotLinked: mock(() => Promise.resolve(true)),
    },
    userService: {
      create: mock(() => Promise.resolve({ id: 'usr_01', email: 'mohammed@example.com' })),
      update: mock(() => Promise.resolve({ id: 'usr_01' })),
    },
    storage: {
      processFile: mock(() => Promise.resolve('/images/parent_male.png')),
      delete: mock(() => Promise.resolve()),
    },
  };
}

function createService(deps = createMockDeps()) {
  const service = new ParentService(
    deps.parentRepository as any,
    deps.parentValidator as any,
    deps.userService as any,
    deps.storage as any,
  );
  return { service, deps };
}

const validCreateData = {
  name: 'Mohammed Amrani',
  phone: '+212600000000',
  cin: 'AB123456',
  relationshipType: 'father' as const,
};

describe('ParentService', () => {
  describe('getAll', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.parentRepository.getAll.mockImplementation(() => Promise.resolve([{ id: 'par_01' }]));
      const result = await service.getAll();
      expect(result).toEqual([{ id: 'par_01' }]);
    });
  });

  describe('getCount', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.parentRepository.getCount.mockImplementation(() => Promise.resolve({ count: 15 }));
      const result = await service.getCount();
      expect(result).toEqual({ count: 15 });
    });
  });

  describe('getById', () => {
    it('delegates to validator ensureExists', async () => {
      const { service, deps } = createService();
      const mockParent = { id: 'par_01', name: 'Mohammed' };
      deps.parentValidator.ensureExists.mockImplementation(() => Promise.resolve(mockParent));
      const result = await service.getById('par_01');
      expect(result).toEqual(mockParent);
    });
  });

  describe('getByCin', () => {
    it('delegates to validator ensureCinExists', async () => {
      const { service, deps } = createService();
      const mockParent = { id: 'par_01' };
      deps.parentValidator.ensureCinExists.mockImplementation(() => Promise.resolve(mockParent));
      const result = await service.getByCin('AB123456');
      expect(result).toEqual(mockParent);
    });
  });

  describe('getByPhone', () => {
    it('delegates to validator ensurePhoneExists', async () => {
      const { service, deps } = createService();
      const mockParent = { id: 'par_01' };
      deps.parentValidator.ensurePhoneExists.mockImplementation(() => Promise.resolve(mockParent));
      const result = await service.getByPhone('+212600000000');
      expect(result).toEqual(mockParent);
    });
  });

  describe('getChildren', () => {
    it('ensures parent exists then gets children', async () => {
      const { service, deps } = createService();
      deps.parentRepository.getChildren.mockImplementation(() => Promise.resolve([{ id: 'stu_01' }]));
      const result = await service.getChildren('par_01');
      expect(deps.parentValidator.ensureExists).toHaveBeenCalledWith('par_01');
      expect(result).toEqual([{ id: 'stu_01' }]);
    });
  });

  describe('create', () => {
    it('creates a parent with all validations', async () => {
      const { service, deps } = createService();
      const data = { ...validCreateData, gender: 'M', email: 'mohammed@example.com', maritalStatus: 'married' };
      deps.parentRepository.create.mockImplementation((d) => Promise.resolve(d));

      await service.create(data);

      expect(deps.parentValidator.ensureCinUnique).toHaveBeenCalledWith('AB123456');
      expect(deps.parentValidator.ensureEmailUnique).toHaveBeenCalledWith('mohammed@example.com');
      expect(deps.parentValidator.ensurePhoneUnique).toHaveBeenCalledWith('+212600000000');
      expect(deps.parentValidator.ensureGenderValid).toHaveBeenCalledWith('M');
      expect(deps.parentValidator.ensureRelationshipTypeValid).toHaveBeenCalledWith('father');
      expect(deps.parentValidator.ensureMaritalStatusValid).toHaveBeenCalledWith('married');
      expect(deps.userService.create).toHaveBeenCalled();
      expect(deps.parentRepository.create).toHaveBeenCalled();
    });

    it('creates parent with custom id', async () => {
      const { service, deps } = createService();
      const data = { ...validCreateData, id: 'custom_01' };
      deps.parentRepository.create.mockImplementation((d) => Promise.resolve(d));

      await service.create(data);
      expect(deps.parentValidator.ensureIdUnique).toHaveBeenCalledWith('custom_01');
    });

    it('creates parent with userId', async () => {
      const { service, deps } = createService();
      const data = { ...validCreateData, userId: 'usr_existing' };
      deps.parentRepository.create.mockImplementation((d) => Promise.resolve(d));

      await service.create(data);
      expect(deps.parentValidator.ensureUserIdUnique).toHaveBeenCalledWith('usr_existing');
    });

    it('skips userId check when not provided', async () => {
      const { service, deps } = createService();
      deps.parentRepository.create.mockImplementation((d) => Promise.resolve(d));
      await service.create(validCreateData);
      expect(deps.parentValidator.ensureUserIdUnique).not.toHaveBeenCalled();
    });

    it('skips gender/marital checks when not provided', async () => {
      const { service, deps } = createService();
      deps.parentRepository.create.mockImplementation((d) => Promise.resolve(d));
      await service.create(validCreateData);
      expect(deps.parentValidator.ensureGenderValid).not.toHaveBeenCalled();
      expect(deps.parentValidator.ensureMaritalStatusValid).not.toHaveBeenCalled();
    });

    it('skips email check when not provided', async () => {
      const { service, deps } = createService();
      deps.parentRepository.create.mockImplementation((d) => Promise.resolve(d));
      await service.create(validCreateData);
      expect(deps.parentValidator.ensureEmailUnique).not.toHaveBeenCalled();
    });

    it('uses female fallback image for female parent', async () => {
      const { service, deps } = createService();
      const data = { ...validCreateData, gender: 'F' };
      deps.parentRepository.create.mockImplementation((d) => Promise.resolve(d));

      await service.create(data);
      expect(deps.storage.processFile).toHaveBeenCalledWith(
        'parents', undefined,
        expect.objectContaining({ fallback: '/images/parent_female.png' }),
      );
    });

    it('uses male fallback image for male parent', async () => {
      const { service, deps } = createService();
      const data = { ...validCreateData, gender: 'M' };
      deps.parentRepository.create.mockImplementation((d) => Promise.resolve(d));

      await service.create(data);
      expect(deps.storage.processFile).toHaveBeenCalledWith(
        'parents', undefined,
        expect.objectContaining({ fallback: '/images/parent_male.png' }),
      );
    });
  });

  describe('update', () => {
    it('updates user and parent data', async () => {
      const { service, deps } = createService();
      const data = { name: 'Updated', email: 'up@example.com' };
      deps.parentRepository.getById.mockImplementation(() => Promise.resolve({ id: 'par_01', userId: 'usr_01' }));
      deps.parentRepository.update.mockImplementation((_id, d) => Promise.resolve({ id: 'par_01', ...d }));

      await service.update('par_01', data);

      expect(deps.parentValidator.ensureExists).toHaveBeenCalledWith('par_01');
      expect(deps.parentValidator.ensureEmailUnique).toHaveBeenCalledWith('up@example.com', 'par_01');
      expect(deps.userService.update).toHaveBeenCalled();
      expect(deps.parentRepository.update).toHaveBeenCalledWith('par_01', expect.anything());
    });

    it('calculates age when dateOfBirth is provided', async () => {
      const { service, deps } = createService();
      const data = { dateOfBirth: '1980-03-15' };
      deps.parentRepository.getById.mockImplementation(() => Promise.resolve({ id: 'par_01', userId: 'usr_01' }));
      deps.parentRepository.update.mockImplementation((_id, d) => Promise.resolve({ id: 'par_01', ...d }));

      await service.update('par_01', data);

      const updateCall = deps.parentRepository.update.mock.calls[0];
      const parentData = updateCall[1];
      expect(parentData.age).toBeGreaterThanOrEqual(44);
      expect(parentData.age).toBeLessThanOrEqual(46);
    });

    it('processes image when provided', async () => {
      const { service, deps } = createService();
      const data = { image: '/images/new.png' };
      deps.parentRepository.getById.mockImplementation(() => Promise.resolve({ id: 'par_01', userId: 'usr_01' }));
      deps.parentRepository.update.mockImplementation((_id, d) => Promise.resolve({ id: 'par_01', ...d }));

      await service.update('par_01', data);
      expect(deps.storage.processFile).toHaveBeenCalled();
    });

    it('does not process image when not provided', async () => {
      const { service, deps } = createService();
      const data = { name: 'Updated' };
      deps.parentRepository.getById.mockImplementation(() => Promise.resolve({ id: 'par_01', userId: 'usr_01' }));
      deps.parentRepository.update.mockImplementation((_id, d) => Promise.resolve({ id: 'par_01', ...d }));

      await service.update('par_01', data);
      expect(deps.storage.processFile).not.toHaveBeenCalled();
    });

    it('runs field validations only when fields are provided', async () => {
      const { service, deps } = createService();
      const data = { gender: 'M', relationshipType: 'father', maritalStatus: 'married', email: 'a@b.com', cin: 'AB123456', phone: '+212600000000' };
      deps.parentRepository.getById.mockImplementation(() => Promise.resolve({ id: 'par_01', userId: 'usr_01' }));
      deps.parentRepository.update.mockImplementation((_id, d) => Promise.resolve({ id: 'par_01', ...d }));

      await service.update('par_01', data);

      expect(deps.parentValidator.ensureGenderValid).toHaveBeenCalledWith('M');
      expect(deps.parentValidator.ensureRelationshipTypeValid).toHaveBeenCalledWith('father');
      expect(deps.parentValidator.ensureMaritalStatusValid).toHaveBeenCalledWith('married');
    });
  });

  describe('delete', () => {
    it('deletes parent and cleans up avatar', async () => {
      const { service, deps } = createService();
      deps.parentRepository.delete.mockImplementation(() => Promise.resolve({ id: 'par_01', userId: 'usr_01' }));

      await service.delete('par_01');
      expect(deps.parentValidator.ensureCanDelete).toHaveBeenCalledWith('par_01');
      expect(deps.parentRepository.delete).toHaveBeenCalledWith('par_01');
      expect(deps.storage.delete).toHaveBeenCalledWith('parents', 'par_01_avatar.png');
    });
  });

  describe('deleteAll', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.parentRepository.deleteAll.mockImplementation(() => Promise.resolve({ deletedCount: 5, deletedParents: [] }));
      const result = await service.deleteAll();
      expect(result.deletedCount).toBe(5);
    });
  });

  describe('deleteBulk', () => {
    it('deletes multiple parents', async () => {
      const { service, deps } = createService();
      deps.parentRepository.delete.mockImplementation(() => Promise.resolve({ id: 'par_01', userId: 'usr_01' }));
      const result = await service.deleteBulk(['par_01', 'par_02']);
      expect(result.deletedCount).toBe(2);
      expect(result.deletedParents).toHaveLength(2);
    });
  });

  describe('linkStudent', () => {
    it('validates and links student', async () => {
      const { service, deps } = createService();

      await service.linkStudent('par_01', 'stu_01');

      expect(deps.parentValidator.ensureExists).toHaveBeenCalledWith('par_01');
      expect(deps.parentValidator.ensureStudentExists).toHaveBeenCalledWith('stu_01');
      expect(deps.parentValidator.ensureStudentNotLinked).toHaveBeenCalledWith('par_01', 'stu_01');
      expect(deps.parentRepository.linkStudent).toHaveBeenCalledWith({ parentId: 'par_01', studentId: 'stu_01' });
    });
  });

  describe('unlinkStudent', () => {
    it('validates and unlinks student', async () => {
      const { service, deps } = createService();

      await service.unlinkStudent('par_01', 'stu_01');

      expect(deps.parentValidator.ensureExists).toHaveBeenCalledWith('par_01');
      expect(deps.parentValidator.ensureStudentExists).toHaveBeenCalledWith('stu_01');
      expect(deps.parentValidator.ensureStudentLinked).toHaveBeenCalledWith('par_01', 'stu_01');
      expect(deps.parentRepository.unlinkStudent).toHaveBeenCalledWith('par_01', 'stu_01');
    });
  });

  describe('createBulk', () => {
    it('creates multiple parents successfully', async () => {
      const { service, deps } = createService();
      deps.parentRepository.create.mockImplementation((d) => Promise.resolve(d));
      const result = await service.createBulk([validCreateData, { ...validCreateData, cin: 'CD789012' }]);
      expect(result).toHaveLength(2);
    });

    it('wraps individual errors with context using cin', async () => {
      const { service, deps } = createService();
      deps.parentValidator.ensureCinUnique.mockImplementation(() => {
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

    it('uses id in error when cin is present', async () => {
      const { service, deps } = createService();
      deps.parentValidator.ensureCinUnique.mockImplementation(() => {
        throw new Error('fail');
      });

      try {
        await service.createBulk([{ ...validCreateData, id: 'par_custom' }]);
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('AB123456');
      }
    });

    it('uses index as last resort identifier', async () => {
      const { service, deps } = createService();
      deps.parentValidator.ensurePhoneUnique.mockImplementation(() => {
        throw new Error('fail');
      });
      deps.parentValidator.ensureCinUnique.mockImplementation(() => {
        throw new Error('fail');
      });

      const data = { ...validCreateData, cin: 'XX000000' };
      try {
        await service.createBulk([data]);
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('XX000000');
      }
    });

    it('returns empty array for empty input', async () => {
      const { service, deps } = createService();
      const result = await service.createBulk([]);
      expect(result).toEqual([]);
    });
  });

  describe('processParents', () => {
    it('returns early when parents is empty', async () => {
      const { service, deps } = createService();
      const result = await service.processParents({ id: 'stu_01' }, []);
      expect(result).toBeUndefined();
    });

    it('returns early when parents is undefined', async () => {
      const { service, deps } = createService();
      const result = await service.processParents({ id: 'stu_01' }, undefined);
      expect(result).toBeUndefined();
    });

    it('links existing parent by string id', async () => {
      const { service, deps } = createService();
      deps.parentValidator.ensureExists.mockImplementation(() => Promise.resolve({ id: 'par_01' }));

      const result = await service.processParents({ id: 'stu_01' }, ['par_01']);

      expect(deps.parentRepository.linkStudent).toHaveBeenCalledWith({ parentId: 'par_01', studentId: 'stu_01' });
      expect(result).toEqual(['par_01']);
    });

    it('throws when parent id not found', async () => {
      const { service, deps } = createService();
      deps.parentValidator.ensureExists.mockImplementation(() => {
        throw new Error('not found');
      });

      try {
        await service.processParents({ id: 'stu_01' }, ['par_missing']);
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('par_missing');
      }
    });

    it('reuses existing parent by cin', async () => {
      const { service, deps } = createService();
      const existingParent = { id: 'par_existing' };
      deps.parentValidator.ensureCinExists.mockImplementation(() => Promise.resolve(existingParent));

      const result = await service.processParents({ id: 'stu_01' }, [{ cin: 'AB123456', name: 'Test', phone: '+212600000000', relationshipType: 'father' }]);

      expect(deps.parentRepository.linkStudent).toHaveBeenCalledWith({ parentId: 'par_existing', studentId: 'stu_01' });
      expect(result).toEqual(['par_existing']);
    });

    it('creates new parent when cin not found', async () => {
      const { service, deps } = createService();
      deps.parentValidator.ensureCinExists.mockImplementation(() => {
        throw new Error('not found');
      });
      deps.parentRepository.create.mockImplementation(() => Promise.resolve({ id: 'par_new' }));

      const result = await service.processParents({ id: 'stu_01' }, [{ cin: 'NEW12345', name: 'Test', phone: '+212600000000', relationshipType: 'father' }]);

      expect(deps.parentRepository.create).toHaveBeenCalled();
      expect(result).toEqual(['par_new']);
    });

    it('reuses existing parent by phone when no cin', async () => {
      const { service, deps } = createService();
      const existingParent = { id: 'par_existing' };
      deps.parentValidator.ensurePhoneExists.mockImplementation(() => Promise.resolve(existingParent));

      const result = await service.processParents({ id: 'stu_01' }, [{ phone: '+212600000000', name: 'Test', relationshipType: 'father' }]);

      expect(deps.parentRepository.linkStudent).toHaveBeenCalledWith({ parentId: 'par_existing', studentId: 'stu_01' });
    });

    it('creates new parent when neither cin nor phone match', async () => {
      const { service, deps } = createService();
      deps.parentValidator.ensurePhoneExists.mockImplementation(() => {
        throw new Error('not found');
      });
      deps.parentRepository.create.mockImplementation(() => Promise.resolve({ id: 'par_new' }));

      const result = await service.processParents({ id: 'stu_01' }, [{ phone: '+212000000000', name: 'Test', relationshipType: 'father' }]);

      expect(deps.parentRepository.create).toHaveBeenCalled();
      expect(result).toEqual(['par_new']);
    });
  });
});

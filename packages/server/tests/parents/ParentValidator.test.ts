import { describe, expect, it, mock } from 'bun:test';
import { ParentValidator } from '@server/modules/parents/ParentValidator';

function createMockDeps() {
  return {
    parentRepository: {
      getById: mock(() => Promise.resolve(null)),
      getByCin: mock(() => Promise.resolve(null)),
      getByEmail: mock(() => Promise.resolve(null)),
      getByPhone: mock(() => Promise.resolve(null)),
      checkLinkedToStudents: mock(() => Promise.resolve(false)),
      checkStudentExists: mock(() => Promise.resolve(true)),
      checkStudentLinked: mock(() => Promise.resolve(false)),
    },
    userValidator: {
      checkUserIdIsUnique: mock(() => Promise.resolve()),
    },
  };
}

function createValidator(deps = createMockDeps()) {
  const validator = new ParentValidator(
    deps.parentRepository as any,
    deps.userValidator as any,
  );
  Object.defineProperty(validator, 'pt', {
    value: (key: string) => key,
    configurable: true,
  });
  return { validator, deps };
}

const mockParent = {
  id: 'par_01',
  userId: 'usr_01',
  cin: 'AB123456',
  name: 'Mohammed Amrani',
  email: 'mohammed@example.com',
  phone: '+212600000000',
};

describe('ParentValidator', () => {
  describe('ensureExists', () => {
    it('returns parent when found', async () => {
      const { validator, deps } = createValidator();
      deps.parentRepository.getById.mockImplementation(() => Promise.resolve(mockParent));

      const result = await validator.ensureExists('par_01');
      expect(result).toEqual(mockParent);
    });

    it('throws when parent not found', async () => {
      const { validator } = createValidator();
      try {
        await validator.ensureExists('missing');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(404);
        expect(error.message).toBe('notFound');
      }
    });
  });

  describe('ensureIdUnique', () => {
    it('passes when id is not taken', async () => {
      const { validator, deps } = createValidator();
      await validator.ensureIdUnique('new_id');
    });

    it('throws when id already exists', async () => {
      const { validator, deps } = createValidator();
      deps.parentRepository.getById.mockImplementation(() => Promise.resolve(mockParent));

      try {
        await validator.ensureIdUnique('par_01');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toBe('idExists');
      }
    });
  });

  describe('ensureCinUnique', () => {
    it('skips check when cin is falsy', async () => {
      const { validator, deps } = createValidator();
      await validator.ensureCinUnique('');
      expect(deps.parentRepository.getByCin).not.toHaveBeenCalled();
    });

    it('passes when cin is not taken', async () => {
      const { validator, deps } = createValidator();
      await validator.ensureCinUnique('NEW12345');
    });

    it('passes when cin belongs to excluded parent', async () => {
      const { validator, deps } = createValidator();
      deps.parentRepository.getByCin.mockImplementation(() => Promise.resolve(mockParent));
      await validator.ensureCinUnique('AB123456', 'par_01');
    });

    it('throws when cin belongs to different parent', async () => {
      const { validator, deps } = createValidator();
      deps.parentRepository.getByCin.mockImplementation(() => Promise.resolve(mockParent));
      try {
        await validator.ensureCinUnique('AB123456', 'other_id');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toBe('cinExists');
      }
    });
  });

  describe('ensureEmailUnique', () => {
    it('skips check when email is falsy', async () => {
      const { validator, deps } = createValidator();
      await validator.ensureEmailUnique('');
      expect(deps.parentRepository.getByEmail).not.toHaveBeenCalled();
    });

    it('throws when email belongs to different parent', async () => {
      const { validator, deps } = createValidator();
      deps.parentRepository.getByEmail.mockImplementation(() => Promise.resolve(mockParent));
      try {
        await validator.ensureEmailUnique('mohammed@example.com', 'other_id');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toBe('emailExists');
      }
    });
  });

  describe('ensurePhoneUnique', () => {
    it('skips check when phone is falsy', async () => {
      const { validator, deps } = createValidator();
      await validator.ensurePhoneUnique('');
      expect(deps.parentRepository.getByPhone).not.toHaveBeenCalled();
    });

    it('throws when phone belongs to different parent', async () => {
      const { validator, deps } = createValidator();
      deps.parentRepository.getByPhone.mockImplementation(() => Promise.resolve(mockParent));
      try {
        await validator.ensurePhoneUnique('+212600000000', 'other_id');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toBe('phoneExists');
      }
    });
  });

  describe('ensureUserIdUnique', () => {
    it('delegates to userValidator', async () => {
      const { validator, deps } = createValidator();
      await validator.ensureUserIdUnique('usr_01');
      expect(deps.userValidator.checkUserIdIsUnique).toHaveBeenCalledWith('usr_01');
    });
  });

  describe('ensureCinExists', () => {
    it('returns parent when found', async () => {
      const { validator, deps } = createValidator();
      deps.parentRepository.getByCin.mockImplementation(() => Promise.resolve(mockParent));
      const result = await validator.ensureCinExists('AB123456');
      expect(result).toEqual(mockParent);
    });

    it('throws when not found', async () => {
      const { validator } = createValidator();
      try {
        await validator.ensureCinExists('MISSING');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(404);
      }
    });
  });

  describe('ensureEmailExists', () => {
    it('returns parent when found', async () => {
      const { validator, deps } = createValidator();
      deps.parentRepository.getByEmail.mockImplementation(() => Promise.resolve(mockParent));
      const result = await validator.ensureEmailExists('mohammed@example.com');
      expect(result).toEqual(mockParent);
    });

    it('throws when not found', async () => {
      const { validator } = createValidator();
      try {
        await validator.ensureEmailExists('missing@example.com');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(404);
      }
    });
  });

  describe('ensurePhoneExists', () => {
    it('returns parent when found', async () => {
      const { validator, deps } = createValidator();
      deps.parentRepository.getByPhone.mockImplementation(() => Promise.resolve(mockParent));
      const result = await validator.ensurePhoneExists('+212600000000');
      expect(result).toEqual(mockParent);
    });

    it('throws when not found', async () => {
      const { validator } = createValidator();
      try {
        await validator.ensurePhoneExists('+212000000000');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(404);
      }
    });
  });

  describe('ensureGenderValid', () => {
    it('accepts M, F, Other', async () => {
      const { validator } = createValidator();
      for (const gender of ['M', 'F', 'Other']) {
        const result = await validator.ensureGenderValid(gender);
        expect(result).toBe(true);
      }
    });

    it('rejects invalid gender', async () => {
      const { validator } = createValidator();
      try {
        await validator.ensureGenderValid('X');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('invalidGender');
      }
    });
  });

  describe('ensureRelationshipTypeValid', () => {
    it('accepts all valid types', async () => {
      const { validator } = createValidator();
      for (const type of ['father', 'mother', 'guardian', 'stepparent', 'grandparent', 'other']) {
        const result = await validator.ensureRelationshipTypeValid(type);
        expect(result).toBe(true);
      }
    });

    it('rejects invalid type', async () => {
      const { validator } = createValidator();
      try {
        await validator.ensureRelationshipTypeValid('sibling');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('invalidRelationshipType');
      }
    });
  });

  describe('ensureMaritalStatusValid', () => {
    it('accepts all valid statuses', async () => {
      const { validator } = createValidator();
      for (const status of ['single', 'married', 'divorced', 'widowed', 'separated']) {
        const result = await validator.ensureMaritalStatusValid(status);
        expect(result).toBe(true);
      }
    });

    it('rejects invalid status', async () => {
      const { validator } = createValidator();
      try {
        await validator.ensureMaritalStatusValid('complicated');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('invalidMaritalStatus');
      }
    });
  });

  describe('ensureCanDelete', () => {
    it('passes when parent has no linked students', async () => {
      const { validator, deps } = createValidator();
      deps.parentRepository.checkLinkedToStudents.mockImplementation(() => Promise.resolve(false));
      const result = await validator.ensureCanDelete('par_01');
      expect(result).toBe(true);
    });

    it('throws when parent has linked students', async () => {
      const { validator, deps } = createValidator();
      deps.parentRepository.checkLinkedToStudents.mockImplementation(() => Promise.resolve(true));
      try {
        await validator.ensureCanDelete('par_01');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toBe('hasLinkedStudents');
      }
    });
  });

  describe('ensureStudentExists', () => {
    it('passes when student exists', async () => {
      const { validator, deps } = createValidator();
      deps.parentRepository.checkStudentExists.mockImplementation(() => Promise.resolve(true));
      const result = await validator.ensureStudentExists('stu_01');
      expect(result).toBe(true);
    });

    it('throws when student does not exist', async () => {
      const { validator, deps } = createValidator();
      deps.parentRepository.checkStudentExists.mockImplementation(() => Promise.resolve(false));
      await expect(validator.ensureStudentExists('missing')).rejects.toThrow();
    });
  });

  describe('ensureStudentLinked', () => {
    it('passes when student is linked', async () => {
      const { validator, deps } = createValidator();
      deps.parentRepository.checkStudentLinked.mockImplementation(() => Promise.resolve(true));
      const result = await validator.ensureStudentLinked('par_01', 'stu_01');
      expect(result).toBe(true);
    });

    it('throws when student is not linked', async () => {
      const { validator, deps } = createValidator();
      deps.parentRepository.checkStudentLinked.mockImplementation(() => Promise.resolve(false));
      try {
        await validator.ensureStudentLinked('par_01', 'stu_01');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toBe('studentNotLinked');
      }
    });
  });

  describe('ensureStudentNotLinked', () => {
    it('passes when student is not linked', async () => {
      const { validator, deps } = createValidator();
      deps.parentRepository.checkStudentLinked.mockImplementation(() => Promise.resolve(false));
      const result = await validator.ensureStudentNotLinked('par_01', 'stu_01');
      expect(result).toBe(true);
    });

    it('throws when student is already linked', async () => {
      const { validator, deps } = createValidator();
      deps.parentRepository.checkStudentLinked.mockImplementation(() => Promise.resolve(true));
      try {
        await validator.ensureStudentNotLinked('par_01', 'stu_01');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toBe('studentAlreadyLinked');
      }
    });
  });

  describe('isExists', () => {
    it('returns true when parent exists', async () => {
      const { validator, deps } = createValidator();
      deps.parentRepository.getById.mockImplementation(() => Promise.resolve(mockParent));
      expect(await validator.isExists('par_01')).toBe(true);
    });

    it('returns false when parent does not exist', async () => {
      const { validator, deps } = createValidator();
      expect(await validator.isExists('missing')).toBe(false);
    });
  });

  describe('isEmailExists', () => {
    it('returns false when email is empty', async () => {
      const { validator, deps } = createValidator();
      expect(await validator.isEmailExists('')).toBe(false);
      expect(deps.parentRepository.getByEmail).not.toHaveBeenCalled();
    });
  });

  describe('isPhoneExists', () => {
    it('returns false when phone is empty', async () => {
      const { validator, deps } = createValidator();
      expect(await validator.isPhoneExists('')).toBe(false);
      expect(deps.parentRepository.getByPhone).not.toHaveBeenCalled();
    });
  });

  describe('check aliases', () => {
    it('checkExists delegates to ensureExists', async () => {
      const { validator, deps } = createValidator();
      deps.parentRepository.getById.mockImplementation(() => Promise.resolve(mockParent));
      const result = await validator.checkExists('par_01');
      expect(result).toEqual(mockParent);
    });

    it('checkCinIsUnique delegates to ensureCinUnique', async () => {
      const { validator, deps } = createValidator();
      await validator.checkCinIsUnique('AB123456');
      expect(deps.parentRepository.getByCin).toHaveBeenCalledWith('AB123456');
    });
  });
});

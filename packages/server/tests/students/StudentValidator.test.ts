import { describe, expect, it, mock } from 'bun:test';
import { StudentValidator } from '@server/modules/students/StudentValidator';

function createMockValidatorDeps() {
  return {
    studentRepository: {
      getById: mock(() => Promise.resolve(null)),
      getByStudentCode: mock(() => Promise.resolve(null)),
      getByEmail: mock(() => Promise.resolve(null)),
      getByPhone: mock(() => Promise.resolve(null)),
    },
    userValidator: {
      checkUserIdIsUnique: mock(() => Promise.resolve()),
    },
    classValidator: {
      ensureClassId: mock(() => Promise.resolve()),
    },
    sectionValidator: {
      ensureExists: mock(() => Promise.resolve()),
      ensureSectionInClass: mock(() => Promise.resolve()),
    },
  };
}

function createValidator(deps = createMockValidatorDeps()) {
  const validator = new StudentValidator(
    deps.studentRepository as any,
    deps.userValidator as any,
    deps.classValidator as any,
    deps.sectionValidator as any,
  );
  Object.defineProperty(validator, 'st', {
    value: (key: string) => key,
    configurable: true,
  });
  return { validator, deps };
}

const mockStudent = {
  id: 'stu_01',
  userId: 'usr_01',
  studentCode: 'STU001',
  name: 'Ahmed Benali',
  email: 'ahmed@example.com',
  sectionId: 'sec_01',
};

describe('StudentValidator', () => {
  describe('ensureExists', () => {
    it('returns the student when found', async () => {
      const { validator, deps } = createValidator();
      deps.studentRepository.getById.mockImplementation(() => Promise.resolve(mockStudent));

      const result = await validator.ensureExists('stu_01');
      expect(result).toEqual(mockStudent);
    });

    it('throws when student is not found', async () => {
      const { validator } = createValidator();

      try {
        await validator.ensureExists('nonexistent');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(404);
        expect(error.message).toBe('notFound');
      }
    });
  });

  describe('ensureIdUnique', () => {
    it('passes when no student with that id exists', async () => {
      const { validator, deps } = createValidator();
      deps.studentRepository.getById.mockImplementation(() => Promise.resolve(null));

      await validator.ensureIdUnique('new_id');
    });

    it('throws when a student with that id already exists', async () => {
      const { validator, deps } = createValidator();
      deps.studentRepository.getById.mockImplementation(() => Promise.resolve(mockStudent));

      try {
        await validator.ensureIdUnique('stu_01');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toBe('idExists');
      }
    });
  });

  describe('ensureCodeUnique', () => {
    it('skips check when studentCode is undefined', async () => {
      const { validator, deps } = createValidator();
      await validator.ensureCodeUnique(undefined);
      expect(deps.studentRepository.getByStudentCode).not.toHaveBeenCalled();
    });

    it('passes when code is not taken', async () => {
      const { validator, deps } = createValidator();
      deps.studentRepository.getByStudentCode.mockImplementation(() => Promise.resolve(null));

      await validator.ensureCodeUnique('NEW001');
    });

    it('passes when code belongs to the excluded student', async () => {
      const { validator, deps } = createValidator();
      deps.studentRepository.getByStudentCode.mockImplementation(() => Promise.resolve(mockStudent));

      await validator.ensureCodeUnique('STU001', 'stu_01');
    });

    it('throws when code belongs to a different student', async () => {
      const { validator, deps } = createValidator();
      deps.studentRepository.getByStudentCode.mockImplementation(() => Promise.resolve(mockStudent));

      try {
        await validator.ensureCodeUnique('STU001', 'other_id');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toBe('studentCodeExists');
      }
    });

    it('throws when code is taken without exclusion', async () => {
      const { validator, deps } = createValidator();
      deps.studentRepository.getByStudentCode.mockImplementation(() => Promise.resolve(mockStudent));

      try {
        await validator.ensureCodeUnique('STU001');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
      }
    });
  });

  describe('ensureEmailUnique', () => {
    it('skips check when email is undefined', async () => {
      const { validator, deps } = createValidator();
      await validator.ensureEmailUnique(undefined);
      expect(deps.studentRepository.getByEmail).not.toHaveBeenCalled();
    });

    it('passes when email is not taken', async () => {
      const { validator, deps } = createValidator();
      deps.studentRepository.getByEmail.mockImplementation(() => Promise.resolve(null));

      await validator.ensureEmailUnique('new@example.com');
    });

    it('throws when email belongs to a different student', async () => {
      const { validator, deps } = createValidator();
      deps.studentRepository.getByEmail.mockImplementation(() => Promise.resolve(mockStudent));

      try {
        await validator.ensureEmailUnique('ahmed@example.com', 'other_id');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toBe('emailExists');
      }
    });
  });

  describe('ensurePhoneUnique', () => {
    it('skips check when phone is undefined', async () => {
      const { validator, deps } = createValidator();
      await validator.ensurePhoneUnique(undefined);
      expect(deps.studentRepository.getByPhone).not.toHaveBeenCalled();
    });

    it('passes when phone is not taken', async () => {
      const { validator, deps } = createValidator();
      deps.studentRepository.getByPhone.mockImplementation(() => Promise.resolve(null));

      await validator.ensurePhoneUnique('+212600000000');
    });

    it('throws when phone belongs to a different student', async () => {
      const { validator, deps } = createValidator();
      deps.studentRepository.getByPhone.mockImplementation(() => Promise.resolve(mockStudent));

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

  describe('ensureCodeExists', () => {
    it('returns the student when found by code', async () => {
      const { validator, deps } = createValidator();
      deps.studentRepository.getByStudentCode.mockImplementation(() => Promise.resolve(mockStudent));

      const result = await validator.ensureCodeExists('STU001');
      expect(result).toEqual(mockStudent);
    });

    it('throws when student code is not found', async () => {
      const { validator, deps } = createValidator();
      deps.studentRepository.getByStudentCode.mockImplementation(() => Promise.resolve(null));

      try {
        await validator.ensureCodeExists('MISSING');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(404);
      }
    });
  });

  describe('ensureEmailExists', () => {
    it('returns the student when found by email', async () => {
      const { validator, deps } = createValidator();
      deps.studentRepository.getByEmail.mockImplementation(() => Promise.resolve(mockStudent));

      const result = await validator.ensureEmailExists('ahmed@example.com');
      expect(result).toEqual(mockStudent);
    });

    it('throws when email is not found', async () => {
      const { validator, deps } = createValidator();
      deps.studentRepository.getByEmail.mockImplementation(() => Promise.resolve(null));

      try {
        await validator.ensureEmailExists('missing@example.com');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(404);
      }
    });
  });

  describe('ensurePhoneExists', () => {
    it('returns the student when found by phone', async () => {
      const { validator, deps } = createValidator();
      deps.studentRepository.getByPhone.mockImplementation(() => Promise.resolve(mockStudent));

      const result = await validator.ensurePhoneExists('+212600000000');
      expect(result).toEqual(mockStudent);
    });

    it('throws when phone is not found', async () => {
      const { validator, deps } = createValidator();
      deps.studentRepository.getByPhone.mockImplementation(() => Promise.resolve(null));

      try {
        await validator.ensurePhoneExists('+212000000000');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(404);
      }
    });
  });

  describe('ensureInSection', () => {
    it('passes when student is in the section', async () => {
      const { validator, deps } = createValidator();
      deps.studentRepository.getById.mockImplementation(() => Promise.resolve(mockStudent));

      await validator.ensureInSection('stu_01', 'sec_01');
      expect(deps.sectionValidator.ensureExists).toHaveBeenCalledWith('sec_01');
    });

    it('throws when student is in a different section', async () => {
      const { validator, deps } = createValidator();
      deps.studentRepository.getById.mockImplementation(() => Promise.resolve(mockStudent));

      try {
        await validator.ensureInSection('stu_01', 'sec_other');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toBe('notInSection');
      }
    });
  });

  describe('ensureClassAndSectionValid', () => {
    it('validates classId when provided', async () => {
      const { validator, deps } = createValidator();
      await validator.ensureClassAndSectionValid('cls_01');
      expect(deps.classValidator.ensureClassId).toHaveBeenCalledWith('cls_01', undefined);
    });

    it('validates sectionId when provided', async () => {
      const { validator, deps } = createValidator();
      await validator.ensureClassAndSectionValid(undefined, 'sec_01');
      expect(deps.sectionValidator.ensureSectionInClass).toHaveBeenCalledWith('sec_01', undefined, undefined, undefined);
    });

    it('skips validation when no class or section provided', async () => {
      const { validator, deps } = createValidator();
      await validator.ensureClassAndSectionValid();
      expect(deps.classValidator.ensureClassId).not.toHaveBeenCalled();
      expect(deps.sectionValidator.ensureSectionInClass).not.toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    it('runs all uniqueness checks for create', async () => {
      const { validator, deps } = createValidator();
      const data = {
        userId: 'usr_01',
        id: 'stu_01',
        studentCode: 'STU001',
        email: 'ahmed@example.com',
        phone: '+212600000000',
        classId: 'cls_01',
        sectionId: 'sec_01',
      };

      const result = await validator.validate(data);

      expect(deps.userValidator.checkUserIdIsUnique).toHaveBeenCalledWith('usr_01');
      expect(deps.studentRepository.getById).toHaveBeenCalledWith('stu_01');
      expect(deps.studentRepository.getByStudentCode).toHaveBeenCalledWith('STU001');
      expect(deps.studentRepository.getByEmail).toHaveBeenCalledWith('ahmed@example.com');
      expect(deps.studentRepository.getByPhone).toHaveBeenCalledWith('+212600000000');
      expect(result).toEqual(data);
    });

    it('runs existence check for update (with excludeId)', async () => {
      const { validator, deps } = createValidator();
      deps.studentRepository.getById.mockImplementation(() => Promise.resolve(mockStudent));

      const data = {
        studentCode: 'STU001',
        classId: 'cls_01',
        sectionId: 'sec_01',
      };

      const result = await validator.validate(data, 'stu_01');

      expect(deps.studentRepository.getById).toHaveBeenCalledWith('stu_01');
      expect(deps.userValidator.checkUserIdIsUnique).not.toHaveBeenCalled();
      expect(result).toEqual(data);
    });

    it('skips uniqueness checks for undefined optional fields', async () => {
      const { validator, deps } = createValidator();
      const data = {
        classId: 'cls_01',
        sectionId: 'sec_01',
      };

      await validator.validate(data);

      expect(deps.studentRepository.getByStudentCode).not.toHaveBeenCalled();
      expect(deps.studentRepository.getByEmail).not.toHaveBeenCalled();
      expect(deps.studentRepository.getByPhone).not.toHaveBeenCalled();
    });
  });

  describe('check aliases', () => {
    it('checkIdIsUnique delegates to ensureIdUnique', async () => {
      const { validator, deps } = createValidator();
      deps.studentRepository.getById.mockImplementation(() => Promise.resolve(null));

      await validator.checkIdIsUnique('new_id');
      expect(deps.studentRepository.getById).toHaveBeenCalledWith('new_id');
    });

    it('checkExists delegates to ensureExists', async () => {
      const { validator, deps } = createValidator();
      deps.studentRepository.getById.mockImplementation(() => Promise.resolve(mockStudent));

      const result = await validator.checkExists('stu_01');
      expect(result).toEqual(mockStudent);
    });

    it('checkCodeIsUnique delegates to ensureCodeUnique', async () => {
      const { validator, deps } = createValidator();
      deps.studentRepository.getByStudentCode.mockImplementation(() => Promise.resolve(null));

      await validator.checkCodeIsUnique('NEW001');
      expect(deps.studentRepository.getByStudentCode).toHaveBeenCalledWith('NEW001');
    });

    it('checkEmailIsUnique delegates to ensureEmailUnique', async () => {
      const { validator, deps } = createValidator();
      deps.studentRepository.getByEmail.mockImplementation(() => Promise.resolve(null));

      await validator.checkEmailIsUnique('new@example.com');
      expect(deps.studentRepository.getByEmail).toHaveBeenCalledWith('new@example.com');
    });

    it('checkPhoneIsUnique delegates to ensurePhoneUnique', async () => {
      const { validator, deps } = createValidator();
      deps.studentRepository.getByPhone.mockImplementation(() => Promise.resolve(null));

      await validator.checkPhoneIsUnique('+212600000000');
      expect(deps.studentRepository.getByPhone).toHaveBeenCalledWith('+212600000000');
    });
  });
});

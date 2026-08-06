import { describe, expect, it, mock } from 'bun:test';
import { TeacherValidator } from '@server/modules/teachers/TeacherValidator';

function createMockDeps() {
  return {
    teacherRepository: {
      getById: mock(() => Promise.resolve(null)),
      getByCin: mock(() => Promise.resolve(null)),
      getByEmail: mock(() => Promise.resolve(null)),
      getByPhone: mock(() => Promise.resolve(null)),
      checkInSection: mock(() => Promise.resolve(false)),
      getTeacherAssignment: mock(() => Promise.resolve(null)),
      getTeacherAssignmentById: mock(() => Promise.resolve(null)),
    },
    sectionValidator: { ensureExists: mock(() => Promise.resolve()), ensureSectionInClass: mock(() => Promise.resolve()) },
    userValidator: { checkUserIdIsUnique: mock(() => Promise.resolve()) },
    classValidator: { ensureExists: mock(() => Promise.resolve()) },
    subjectValidator: { ensureExists: mock(() => Promise.resolve()) },
  };
}

function createValidator(deps = createMockDeps()) {
  const validator = new TeacherValidator(
    deps.teacherRepository as any,
    deps.sectionValidator as any,
    deps.userValidator as any,
    deps.classValidator as any,
    deps.subjectValidator as any,
  );
  Object.defineProperty(validator, 'tt', {
    value: (key: string) => key,
    configurable: true,
  });
  return { validator, deps };
}

const mockTeacher = {
  id: 'tch_01',
  userId: 'usr_01',
  cin: 'AB123456',
  name: 'Fatima Zahra',
  email: 'fatima@example.com',
  phone: '+212600000000',
};

describe('TeacherValidator', () => {
  describe('ensureExists', () => {
    it('returns teacher when found', async () => {
      const { validator, deps } = createValidator();
      deps.teacherRepository.getById.mockImplementation(() => Promise.resolve(mockTeacher));

      const result = await validator.ensureExists('tch_01');
      expect(result).toEqual(mockTeacher);
    });

    it('throws when teacher not found', async () => {
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
    it('passes when no teacher with that id exists', async () => {
      const { validator, deps } = createValidator();
      await validator.ensureIdUnique('new_id');
    });

    it('throws when id already exists', async () => {
      const { validator, deps } = createValidator();
      deps.teacherRepository.getById.mockImplementation(() => Promise.resolve(mockTeacher));

      try {
        await validator.ensureIdUnique('tch_01');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toBe('idExists');
      }
    });
  });

  describe('ensureCinUnique', () => {
    it('skips check when cin is undefined', async () => {
      const { validator, deps } = createValidator();
      await validator.ensureCinUnique(undefined);
      expect(deps.teacherRepository.getByCin).not.toHaveBeenCalled();
    });

    it('passes when cin is not taken', async () => {
      const { validator, deps } = createValidator();
      await validator.ensureCinUnique('NEW12345');
    });

    it('passes when cin belongs to excluded teacher', async () => {
      const { validator, deps } = createValidator();
      deps.teacherRepository.getByCin.mockImplementation(() => Promise.resolve(mockTeacher));
      await validator.ensureCinUnique('AB123456', 'tch_01');
    });

    it('throws when cin belongs to different teacher', async () => {
      const { validator, deps } = createValidator();
      deps.teacherRepository.getByCin.mockImplementation(() => Promise.resolve(mockTeacher));
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
    it('skips check when email is undefined', async () => {
      const { validator, deps } = createValidator();
      await validator.ensureEmailUnique(undefined);
      expect(deps.teacherRepository.getByEmail).not.toHaveBeenCalled();
    });

    it('throws when email belongs to different teacher', async () => {
      const { validator, deps } = createValidator();
      deps.teacherRepository.getByEmail.mockImplementation(() => Promise.resolve(mockTeacher));
      try {
        await validator.ensureEmailUnique('fatima@example.com', 'other_id');
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
      expect(deps.teacherRepository.getByPhone).not.toHaveBeenCalled();
    });

    it('throws when phone belongs to different teacher', async () => {
      const { validator, deps } = createValidator();
      deps.teacherRepository.getByPhone.mockImplementation(() => Promise.resolve(mockTeacher));
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
    it('returns teacher when found', async () => {
      const { validator, deps } = createValidator();
      deps.teacherRepository.getByCin.mockImplementation(() => Promise.resolve(mockTeacher));
      const result = await validator.ensureCinExists('AB123456');
      expect(result).toEqual(mockTeacher);
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
    it('returns teacher when found', async () => {
      const { validator, deps } = createValidator();
      deps.teacherRepository.getByEmail.mockImplementation(() => Promise.resolve(mockTeacher));
      const result = await validator.ensureEmailExists('fatima@example.com');
      expect(result).toEqual(mockTeacher);
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
    it('returns teacher when found', async () => {
      const { validator, deps } = createValidator();
      deps.teacherRepository.getByPhone.mockImplementation(() => Promise.resolve(mockTeacher));
      const result = await validator.ensurePhoneExists('+212600000000');
      expect(result).toEqual(mockTeacher);
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

  describe('ensureAssignmentsValid', () => {
    it('skips when assignments is empty', async () => {
      const { validator, deps } = createValidator();
      await validator.ensureAssignmentsValid([]);
      expect(deps.classValidator.ensureExists).not.toHaveBeenCalled();
    });

    it('skips when assignments is undefined', async () => {
      const { validator, deps } = createValidator();
      await validator.ensureAssignmentsValid(undefined);
      expect(deps.classValidator.ensureExists).not.toHaveBeenCalled();
    });

    it('validates class, sections, and subjects for each assignment', async () => {
      const { validator, deps } = createValidator();
      const assignments = [{
        classId: 'cls_01',
        sectionIds: ['sec_01', 'sec_02'],
        subjectIds: ['sub_01'],
      }];

      await validator.ensureAssignmentsValid(assignments);

      expect(deps.classValidator.ensureExists).toHaveBeenCalledWith('cls_01');
      expect(deps.subjectValidator.ensureExists).toHaveBeenCalledWith('sub_01');
      expect(deps.sectionValidator.ensureSectionInClass).toHaveBeenCalledTimes(2);
    });
  });

  describe('ensureInSection', () => {
    it('passes when teacher is in section', async () => {
      const { validator, deps } = createValidator();
      deps.teacherRepository.getById.mockImplementation(() => Promise.resolve(mockTeacher));
      deps.teacherRepository.checkInSection.mockImplementation(() => Promise.resolve(true));

      await validator.ensureInSection('tch_01', 'sec_01');
      expect(deps.sectionValidator.ensureExists).toHaveBeenCalledWith('sec_01');
    });

    it('throws when teacher is not in section', async () => {
      const { validator, deps } = createValidator();
      deps.teacherRepository.getById.mockImplementation(() => Promise.resolve(mockTeacher));
      deps.teacherRepository.checkInSection.mockImplementation(() => Promise.resolve(false));

      try {
        await validator.ensureInSection('tch_01', 'sec_other');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toBe('notInSection');
      }
    });
  });

  describe('ensureAssignmentExists', () => {
    it('passes when assignment exists', async () => {
      const { validator, deps } = createValidator();
      deps.teacherRepository.getTeacherAssignment.mockImplementation(() => Promise.resolve({ id: 'asg_01' }));

      await validator.ensureAssignmentExists('tch_01', 'sub_01', 'sec_01');
    });

    it('throws when assignment not found', async () => {
      const { validator, deps } = createValidator();
      deps.teacherRepository.getTeacherAssignment.mockImplementation(() => Promise.resolve(null));

      try {
        await validator.ensureAssignmentExists('tch_01', 'sub_01', 'sec_01');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(404);
        expect(error.message).toBe('assignmentNotFound');
      }
    });
  });

  describe('ensureAssignmentExistsById', () => {
    it('passes when assignment exists', async () => {
      const { validator, deps } = createValidator();
      deps.teacherRepository.getTeacherAssignmentById.mockImplementation(() => Promise.resolve({ id: 'asg_01' }));

      await validator.ensureAssignmentExistsById('asg_01');
    });

    it('throws when assignment not found', async () => {
      const { validator, deps } = createValidator();
      deps.teacherRepository.getTeacherAssignmentById.mockImplementation(() => Promise.resolve(null));

      try {
        await validator.ensureAssignmentExistsById('missing');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(404);
        expect(error.message).toBe('assignmentNotFound');
      }
    });
  });

  describe('check aliases', () => {
    it('checkExists delegates to ensureExists', async () => {
      const { validator, deps } = createValidator();
      deps.teacherRepository.getById.mockImplementation(() => Promise.resolve(mockTeacher));
      const result = await validator.checkExists('tch_01');
      expect(result).toEqual(mockTeacher);
    });

    it('checkCinIsUnique delegates to ensureCinUnique', async () => {
      const { validator, deps } = createValidator();
      await validator.checkCinIsUnique('AB123456');
      expect(deps.teacherRepository.getByCin).toHaveBeenCalledWith('AB123456');
    });

    it('checkEmailIsUnique delegates to ensureEmailUnique', async () => {
      const { validator, deps } = createValidator();
      await validator.checkEmailIsUnique('fatima@example.com');
      expect(deps.teacherRepository.getByEmail).toHaveBeenCalledWith('fatima@example.com');
    });

    it('checkPhoneIsUnique delegates to ensurePhoneUnique', async () => {
      const { validator, deps } = createValidator();
      await validator.checkPhoneIsUnique('+212600000000');
      expect(deps.teacherRepository.getByPhone).toHaveBeenCalledWith('+212600000000');
    });
  });
});

import { describe, expect, it } from 'bun:test';
import { SubjectService } from '../../src/modules/subjects/SubjectService';
import { SubjectValidator } from '../../src/modules/subjects/SubjectValidator';
import { createSubjectDto, updateSubjectDto } from '../../src/modules/subjects/SubjectDto';
import { ClassValidator } from '../../src/modules/classes/ClassValidator';
import { SectionValidator } from '../../src/modules/sections/SectionValidator';
import { StudentEnrollmentService } from '../../src/modules/studentEnrollments/StudentEnrollmentService';
import { StudentEnrollmentValidator } from '../../src/modules/studentEnrollments/StudentEnrollmentValidator';
import { withEnglishMessages } from '../support/englishMessages';

describe('academic integrity', () => {
  it('normalizes subject codes for create and partial update', () => {
    expect(createSubjectDto.parse({ code: ' math ', name: 'Mathematics' }).code).toBe('MATH');
    expect(updateSubjectDto.parse({ code: ' math ' }).code).toBe('MATH');
    expect(createSubjectDto.safeParse({ code: '  ', name: 'Mathematics' }).success).toBe(false);
  });

  it('normalizes service callers too, and gives concurrent duplicates the ordinary conflict message', async () => {
    const repository = {
      getByCode: async () => null,
      create: async (data: { code: string }) => {
        expect(data.code).toBe('MATH');
        throw { cause: { code: '23505', constraint_name: 'subjects_code_normalized_unique' } };
      },
    };
    const service = new SubjectService(repository as any, withEnglishMessages(new SubjectValidator(repository as any)));
    await expect(service.create({ code: ' math ', name: 'Mathematics' })).rejects.toThrow('code');
  });

  it('names linked staff when a class cannot be deleted', async () => {
    const validator = withEnglishMessages(new ClassValidator({ getAssignedStaff: async () => [{ name: 'Salma Alaoui' }] } as any, {} as any));
    await expect(validator.ensureHasNoStaff('class')).rejects.toThrow('Salma Alaoui');
  });

  it('names linked people before a section can be deleted or moved', async () => {
    const validator = withEnglishMessages(new SectionValidator({ getAssignedPeople: async () => [{ name: 'Youssef Amrani' }] } as any, {} as any, {} as any));
    await expect(validator.ensureHasNoAssignments('section')).rejects.toThrow('Youssef Amrani');
  });

  it('refuses a new inactive cycle assignment but preserves the current one on unrelated edits', async () => {
    const validator = withEnglishMessages(new ClassValidator({ getCycle: async () => ({ active: false }) } as any, {} as any));
    await expect(validator.ensureCycleSelectable('inactive')).rejects.toThrow('active cycle');
    await validator.ensureCycleSelectable('inactive', 'inactive');
    await validator.ensureCycleSelectable(null, 'inactive');
  });

  it('locks before counting seats, excludes the enrollment being corrected, and checks reductions', async () => {
    const calls: unknown[] = [];
    const year = { id: 'year', label: '2026-2027', reportingStartsOn: '2026-09-01', reportingEndsOn: '2027-08-31' };
    const repository = {
      lockSectionCapacity: async () => { calls.push('lock'); return { name: 'A', maxStudents: 1, academicYear: year.label }; },
      sectionPeakOccupancy: async (...args: unknown[]) => { calls.push(args); return 1; },
    };
    const service = new StudentEnrollmentService(repository as any, { requireId: async () => year } as any,
      {} as any, {} as any, withEnglishMessages(new StudentEnrollmentValidator()));
    Object.defineProperty(service, 'year', { value: year });
    await expect(service.ensureSectionCapacity('section', '2026-10-01', null, { excludeEnrollmentId: 'self' }))
      .rejects.toThrow('maximum 1');
    expect(calls).toEqual(['lock', ['section', 'year', '2026-10-01', '2027-09-01', 'self']]);
    await service.ensureSectionCapacity('section', null, null, { capacity: 1, additionalStudents: 0 });
  });
});

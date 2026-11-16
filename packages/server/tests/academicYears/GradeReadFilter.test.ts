import 'reflect-metadata';
import { expect, test } from 'bun:test';
import { getValidationConfig } from 'najm-validation';
import { GradeController } from '../../src/modules/grades/GradeController';
import { GradeService } from '../../src/modules/grades/GradeService';
import { gradeSectionFilterDto, sectionGradesDto } from '../../src/modules/grades/GradeDto';

test('the section grade route exposes subject filtering and forwards both IDs to the existing service', async () => {
  const calls: unknown[] = [];
  const controller = new GradeController({ getAll: async (filters: unknown) => { calls.push(filters); return []; } } as unknown as GradeService);
  const validation = getValidationConfig(GradeController.prototype, 'listBySection');
  expect(validation?.query).toBe(gradeSectionFilterDto);
  const filters = gradeSectionFilterDto.parse({ subjectId: 'subject-1', sectionId: 'forged-section', academicYear: 'forged-year' });
  await controller.listBySection('section-1', filters);
  await controller.listBySection('section-1');
  expect(calls).toEqual([{ sectionId: 'section-1', subjectId: 'subject-1' }, { sectionId: 'section-1', subjectId: undefined }]);
  for (const subjectId of ['', null, [], 42]) expect(gradeSectionFilterDto.safeParse({ subjectId }).success).toBe(false);
});

test('the section grades tool takes both IDs in its body and forwards only them', async () => {
  const calls: unknown[] = [];
  const controller = new GradeController({ getAll: async (filters: unknown) => { calls.push(filters); return []; } } as unknown as GradeService);
  expect(getValidationConfig(GradeController.prototype, 'getBySection')?.body).toBe(sectionGradesDto);
  const body = sectionGradesDto.parse({ sectionId: 'section-1', subjectId: 'subject-1', academicYear: 'forged-year' });
  expect(await controller.getBySection(body)).toMatchObject({ marks: 0 });
  await controller.getBySection(sectionGradesDto.parse({ sectionId: 'section-1' }));
  expect(calls).toEqual([{ sectionId: 'section-1', subjectId: 'subject-1' }, { sectionId: 'section-1', subjectId: undefined }]);
  expect(sectionGradesDto.safeParse({ subjectId: 'subject-1' }).success).toBe(false);
});

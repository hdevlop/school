import { describe, expect, it } from 'bun:test';
import { assessmentPlanningDto, updateAssessmentDto } from '../../src/modules/assessments/AssessmentDto';
import { AssessmentService } from '../../src/modules/assessments/AssessmentService';

const planning = { round: 'Contrôle n°1', semester: 1 as const, groups: [{ label: 'التراكيب', language: 'ar' as const, lessons: ['الجملة الاسمية', 'الجملة الفعلية'] }] };

describe('assessment revision planning', () => {
  it('accepts multilingual topic groups through the existing partial-update DTO', () => {
    expect(updateAssessmentDto.parse({ planning })).toEqual({ planning });
    expect(updateAssessmentDto.parse({ title: 'Changed title' })).not.toHaveProperty('planning');
    expect(updateAssessmentDto.parse({ planning: null }).planning).toBeNull();
  });

  it('rejects invalid semesters, languages and unbounded revision content', () => {
    for (const change of [{ round: ' ' }, { semester: 3 }, { groups: [] }, { groups: Array(21).fill(planning.groups[0]) },
      { groups: [{ ...planning.groups[0], language: 'javascript' }] },
      { groups: [{ ...planning.groups[0], lessons: ['x'.repeat(501)] }] },
      { groups: [{ ...planning.groups[0], lessons: Array(41).fill('Lesson') }] }]) {
      expect(assessmentPlanningDto.safeParse({ ...planning, ...change }).success).toBe(false);
    }
  });

  it('saves planning without changing the source date, assignment, targets or grading', async () => {
    const writes: unknown[] = [];
    const service = Object.create(AssessmentService.prototype) as AssessmentService;
    Object.assign(service, {
      assessmentValidator: {
        ensureExists: async () => ({ id: 'owned', date: '2026-11-09', academicYearId: 'year', sectionIds: ['section'], teacher: { id: 'teacher' }, subject: { id: 'subject' } }),
        validate: async () => {},
      },
      assessmentRepository: { update: async (id: string, data: unknown) => { writes.push({ id, data }); return data; } },
    });
    await service.update('owned', { planning });
    expect(writes).toEqual([{ id: 'owned', data: { planning } }]);
    await service.update('owned', { title: 'New title' });
    expect(writes[1]).toEqual({ id: 'owned', data: { title: 'New title' } });
  });

  it('does not write when the scoped existing-record check refuses the assessment', async () => {
    let wrote = false;
    const service = Object.create(AssessmentService.prototype) as AssessmentService;
    Object.assign(service, {
      assessmentValidator: { ensureExists: async () => { throw new Error('Outside owned year'); } },
      assessmentRepository: { update: async () => { wrote = true; } },
    });
    await expect(service.update('other-year', { planning })).rejects.toThrow('Outside owned year');
    expect(wrote).toBe(false);
  });
});

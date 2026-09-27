import { describe, expect, it } from 'bun:test';
import { ClassRoutineService } from '../../src/modules/classRoutines/ClassRoutineService';

describe('normal routine history access', () => {
  it('lists the routines of the year it is given', async () => {
    const calls: string[] = [];
    const service = new ClassRoutineService(
      { list: async (filters: { academicYear?: string }) => {
        calls.push(`list:${filters.academicYear}`);
        return [];
      } } as any,
      {} as any,
      {} as any,
    );
    await service.list({ academicYear: '2020-2021' }, { id: 'year-1', label: '2027-2028' } as any);
    expect(calls).toEqual(['list:2027-2028']);
  });

  it('refuses an old routine ID before reading its periods and entries', async () => {
    let detailRead = false;
    const service = new ClassRoutineService(
      { getPeriods: async () => { detailRead = true; return []; } } as any,
      { ensureSchedule: async () => ({ id: 'old-routine', academicYear: '2026-2027' }) } as any,
      { resolve: async () => { throw new Error('Other school years are restricted'); } } as any,
    );
    await expect(service.getById('old-routine', 'teacher'))
      .rejects.toThrow('Other school years are restricted');
    expect(detailRead).toBe(false);
  });

  it('refuses old-section assignments before reading them', async () => {
    let assignmentRead = false;
    const service = new ClassRoutineService(
      {
        getSection: async () => ({ classAcademicYear: '2026-2027' }),
        getAssignmentsForSection: async () => { assignmentRead = true; return []; },
      } as any,
      { ensureSectionAcademicYear: async () => {} } as any,
      { resolve: async () => { throw new Error('Other school years are restricted'); } } as any,
    );
    await expect(service.getAssignments('old-section', 'teacher'))
      .rejects.toThrow('Other school years are restricted');
    expect(assignmentRead).toBe(false);
  });
});

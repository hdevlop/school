import { describe, expect, it } from 'bun:test';
import { ClassService } from '../../src/modules/classes/ClassService';
import { SectionService } from '../../src/modules/sections/SectionService';

const oldYear = { id: 'year-old', label: '2025-2026' } as any;

describe('normal class list year scope', () => {
  it('reads the owned classes of the resolved year', async () => {
    const service = new ClassService(
      {
        getAll: async (label: string) => [{ id: 'allowed-old', academicYear: label }],
        getByAcademicYear: async () => { throw new Error('unscoped repository path'); },
      } as any,
      {} as any, {} as any, {} as any,
    );
    expect<unknown>(await service.getAll(oldYear)).toEqual([{ id: 'allowed-old', academicYear: '2025-2026' }]);
  });

  it("reads a class's students from placements in the class's own year", async () => {
    const calls: unknown[] = [];
    const service = new ClassService(
      { getClassStudents: async (classId: string, yearId: string) => { calls.push(['students', classId, yearId]); return []; } } as any,
      { ensureExists: async () => ({ id: 'class-old', academicYear: '2025-2026' }) } as any,
      {} as any,
      { resolve: async (label: string, role?: string) => { calls.push(['resolve', label, role]); return oldYear; } } as any,
    );
    await service.getStudents('class-old', 'admin');
    expect(calls).toEqual([['resolve', '2025-2026', 'admin'], ['students', 'class-old', 'year-old']]);
  });
});

describe('normal section list year scope', () => {
  it('reads the owned sections of the resolved year', async () => {
    const service = new SectionService(
      {
        getAll: async (label: string) => [{ id: 'allowed-old', class: { academicYear: label } }],
        getByAcademicYear: async () => { throw new Error('unscoped repository path'); },
      } as any,
      {} as any, {} as any,
    );
    expect<unknown>(await service.getAll(oldYear)).toEqual([
      { id: 'allowed-old', class: { academicYear: '2025-2026' } },
    ]);
  });
});

describe('class and section writes in a registered year', () => {
  it('resolves a class creation year before checking uniqueness or writing', async () => {
    const calls: string[] = [];
    const service = new ClassService(
      { create: async () => { calls.push('write'); return { id: 'c1' }; } } as any,
      { ensureNameUnique: async () => { calls.push('unique'); } } as any,
      {} as any,
      { resolve: async (label: string, role: string) => {
        calls.push(`resolve ${label} ${role}`);
        if (label === 'unknown') throw new Error('Academic year not found');
        return { label };
      } } as any,
    );
    const classData = { name: 'CE1', level: 'Middle', academicYear: 'unknown' };
    await expect(service.create(classData, 'admin')).rejects.toThrow('Academic year not found');
    await service.create({ ...classData, academicYear: '2025-2026' }, 'admin');
    expect(calls).toEqual(['resolve unknown admin', 'resolve 2025-2026 admin', 'unique', 'write']);
  });

  it('keeps a same-year class edit and checks a requested year change', async () => {
    const calls: string[] = [];
    const service = new ClassService(
      { update: async () => { calls.push('write'); return { id: 'c1' }; } } as any,
      {
        ensureExists: async () => ({ id: 'c1', name: 'CE1', academicYear: '2025-2026' }),
        ensureNameUnique: async () => { calls.push('unique'); },
        ensureHasNoSections: async () => { calls.push('empty'); },
      } as any,
      {} as any,
      { resolve: async (label: string) => { calls.push(`resolve ${label}`); return { label }; } } as any,
    );
    await service.update('c1', { name: 'CE2' }, 'admin');
    await service.update('c1', { academicYear: '2026-2027' }, 'admin');
    expect(calls).toEqual(['unique', 'write', 'resolve 2026-2027', 'empty', 'unique', 'write']);
  });

  it('resolves a section target class year before creation', async () => {
    const calls: string[] = [];
    const service = new SectionService(
      { create: async () => { calls.push('write'); return { id: 's1' }; } } as any,
      {
        ensureClassExists: async () => ({ id: 'c1', academicYear: '2025-2026' }),
        ensureNameUniqueInClass: async () => { calls.push('unique'); },
      } as any,
      { resolve: async (label: string, role: string) => {
        calls.push(`resolve ${label} ${role}`);
        return { label };
      } } as any,
    );
    await service.create({ classId: 'c1', name: 'A', maxStudents: 30, status: 'active' }, 'admin');
    expect(calls).toEqual(['resolve 2025-2026 admin', 'unique', 'write']);
  });

  it('keeps same-class section edits and resolves a reassigned class year', async () => {
    const calls: string[] = [];
    const service = new SectionService(
      { update: async () => { calls.push('write'); return { id: 's1' }; } } as any,
      {
        ensureExists: async () => ({ id: 's1', name: 'A', classId: 'old' }),
        ensureClassExists: async () => ({ id: 'new', academicYear: '2026-2027' }),
        ensureNameUniqueInClass: async () => { calls.push('unique'); },
        ensureHasNoStudents: async () => { calls.push('empty'); },
      } as any,
      { resolve: async (label: string) => { calls.push(`resolve ${label}`); return { label }; } } as any,
    );
    await service.update('s1', { classId: 'old', maxStudents: 35 }, 'admin');
    await service.update('s1', { classId: 'new' }, 'admin');
    expect(calls).toEqual(['unique', 'write', 'resolve 2026-2027', 'empty', 'unique', 'write']);
  });
});

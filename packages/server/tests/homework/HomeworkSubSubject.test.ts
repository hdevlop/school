import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { HomeworkService } from '../../src/modules/homework/HomeworkService';
import { homeworkParts, matchPart } from '../../src/modules/homework/homeworkParts';

describe('the parts a homework may name', () => {
  it('are what Massar grades the class on that year, spelled once and without stray spaces', () => {
    const cp = [{ code: 'C1', name: 'Comptine/Chant' }, { code: 'C2', name: 'Graphisme' }, { code: 'C3', name: 'Activités orales ' }];
    const twice = [{ code: 'C9', name: 'graphisme' }, { code: 'C4', name: 'Projet de\nclasse' }];
    expect(homeworkParts([cp, twice], ['Lecture', 'Dictée']))
      .toEqual(['Comptine/Chant', 'Graphisme', 'Activités orales', 'Projet de classe']);
  });

  it('are the subject’s own sub-subjects when the class has no Massar parts for it', () => {
    expect(homeworkParts([], ['Lecture', 'Dictée', ' Lecture'])).toEqual(['Lecture', 'Dictée']);
    expect(homeworkParts([[]], [])).toEqual([]);
  });

  it('match a requested name whatever its case or accents, spelled as offered', () => {
    expect(matchPart(['Graphisme', 'Orthographe/Dictée'], 'GRAPHISME')).toBe('Graphisme');
    expect(matchPart(['Orthographe/Dictée'], 'orthographe/dictee')).toBe('Orthographe/Dictée');
    expect(matchPart(['Graphisme'], 'Lecture')).toBeNull();
  });
});

// CP Français is taught as Graphisme and Comptine/Chant; CP Arabic as الخط.
const PARTS: Record<string, string[]> = { fr: ['Graphisme', 'Comptine/Chant'], ar: ['الخط'] };
const actor = { id: 'user-1', role: 'teacher' } as any;

function serviceWith(current: { subjectId: string; subSubject: string | null }) {
  const writes: Record<string, unknown>[] = [];
  const stored = {
    id: 'hw-1', academicYearId: 'year-1', date: '2026-11-13', dueOn: null, sectionIds: ['section-a'],
    subject: { id: current.subjectId }, teacher: { id: 'teacher-1' }, subSubject: current.subSubject,
  };
  const repository = {
    update: async (_id: string, changes: Record<string, unknown>) => { writes.push(changes); },
    create: async (row: Record<string, unknown>) => { writes.push(row); return { id: 'hw-2' }; },
  };
  const findPart = async (name: string, subjectId: string) => matchPart(PARTS[subjectId] ?? [], name);
  const validator = {
    ensureExists: async () => stored,
    resolveTeacherId: async () => 'teacher-1',
    ensureDueAfterGiven: () => {},
    ensureSelectedYear: () => {},
    ensureSameYear: () => {},
    ensureAssignments: async () => ['assignment-2'],
    findPart,
    ensurePart: async (name: string, subjectId: string) => {
      const part = await findPart(name, subjectId);
      if (!part) throw new Error('homework.errors.subSubjectMismatch');
      return part;
    },
  };
  const sources = { ensureTargetsValid: async () => ({ id: 'year-1' }) };
  const service = new HomeworkService(repository as any, validator as any, sources as any, {} as any);
  return { service, writes };
}

const post = { sectionIds: ['section-a'], subjectId: 'fr', title: 'Graphisme p. 4', date: '2026-11-13' };

describe('the sub-subject of a homework', () => {
  it('is stored on create, spelled as the class is taught it', async () => {
    const { service, writes } = serviceWith({ subjectId: 'fr', subSubject: null });
    await service.create({ ...post, subSubject: 'graphisme' }, actor);
    expect(writes[0]).toMatchObject({ subSubject: 'Graphisme' });
  });

  it('is refused when the class is not taught the subject with that part', async () => {
    const { service, writes } = serviceWith({ subjectId: 'fr', subSubject: null });
    await expect(service.create({ ...post, subSubject: 'Lecture' }, actor)).rejects.toThrow('subSubjectMismatch');
    await expect(service.update('hw-1', { subSubject: 'الخط' }, actor)).rejects.toThrow('subSubjectMismatch');
    expect(writes).toEqual([]);
  });

  it('is kept by an edit that changes neither it, the subject nor the sections; changed or removed when named', async () => {
    const kept = serviceWith({ subjectId: 'fr', subSubject: 'Graphisme' });
    await kept.service.update('hw-1', { title: 'Graphisme p. 5' }, actor);
    expect(kept.writes[0]).not.toHaveProperty('subSubject');

    const changed = serviceWith({ subjectId: 'fr', subSubject: 'Graphisme' });
    await changed.service.update('hw-1', { subSubject: 'Comptine/Chant' }, actor);
    expect(changed.writes[0]).toMatchObject({ subSubject: 'Comptine/Chant' });

    const removed = serviceWith({ subjectId: 'fr', subSubject: 'Graphisme' });
    await removed.service.update('hw-1', { subSubject: null }, actor);
    expect(removed.writes[0]).toMatchObject({ subSubject: null });
  });

  it('is dropped when the subject changes to one the class is not taught with that part', async () => {
    const { service, writes } = serviceWith({ subjectId: 'fr', subSubject: 'Graphisme' });
    await service.update('hw-1', { subjectId: 'ar' }, actor);
    expect(writes[0]).toMatchObject({ subSubject: null, teacherAssignmentId: 'assignment-2' });
  });
});

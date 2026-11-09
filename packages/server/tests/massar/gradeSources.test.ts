import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { MassarService } from '../../src/modules/massar/MassarService';

describe('Massar grade sources', () => {
  it('offers every component of a mapped, owned sheet, even when Planning has only one matching exam', async () => {
    const components = ['التعبير الكتابي', 'القراءة', 'الإملاء', 'الخط ', 'النقل', 'الاستماع والتحدث\n']
      .map((name, index) => ({ code: String(index), name }));
    const row = {
      sheet: { id: 'owned-sheet', components }, cls: { classId: 'cp', sectionId: 'a' },
      subject: { subjectId: 'arabic' }, level: { maxMark: 10 }, teacherId: null,
      round: { term: 1, exam: 1, termLabel: 'Semester 1', examLabel: 'Contrôle 1' },
    };
    const repository = { sheets: async () => [row, { ...row, sheet: { ...row.sheet, id: 'unmapped' }, cls: { ...row.cls, sectionId: null } }] };
    let requested: string[] = [];
    const link = { examLinks: async (sheetIds: string[]) => {
      requested = sheetIds;
      return [{ sheet: { id: 'owned-sheet' }, componentCode: '2', exam: { id: 'dictation-exam' } }];
    } };
    const service = new MassarService(repository as never, {} as never, {} as never, {} as never, {} as never, link as never);
    const sources = await service.gradeSources();
    expect(sources).toHaveLength(6);
    expect(sources.map(source => source.title)).toEqual(components.map(component => component.name.trim()));
    expect(sources.every(source => source.classId === 'cp' && source.sectionId === 'a' && source.totalMarks === 10)).toBe(true);
    expect(sources.filter(source => source.linkedExamId)).toEqual([expect.objectContaining({ componentCode: '2', linkedExamId: 'dictation-exam' })]);
    expect(new Set(sources.map(source => source.id)).size).toBe(6);
    expect(requested).toEqual(['owned-sheet', 'unmapped']);
  });
});

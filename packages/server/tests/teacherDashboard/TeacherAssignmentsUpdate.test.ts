import { describe, expect, it } from 'bun:test';
import { TeacherService } from '../../src/modules/teachers/TeacherService';

type Row = { classId: string; sectionId: string; subjectId: string };

// The edit form sends the year's whole assignment list. The update used to
// validate it and then drop it, so a removed or added assignment never saved,
// and a teacher could not be cleared for deletion from the dashboard.
function serviceWith(current: Row[]) {
  const calls: string[] = [];
  const service = {
    teacherRepository: {
      getAssignmentRows: async () => current,
      deleteAssignment: async (_teacherId: string, sectionId: string, subjectId: string) => {
        calls.push(`delete ${sectionId}/${subjectId}`);
      },
      createAssignment: async (row: Row & { teacherId: string }) => {
        calls.push(`create ${row.sectionId}/${row.subjectId}`);
      },
    },
  };
  const replace = (TeacherService.prototype as any).replaceTeacherAssignments;
  return { calls, run: (assignments: unknown) => replace.call(service, 'T1', assignments) };
}

describe('teacher update assignments', () => {
  it('removes every assignment of the year when the list is empty', async () => {
    const { calls, run } = serviceWith([
      { classId: 'C1', sectionId: 'S1', subjectId: 'M' },
      { classId: 'C1', sectionId: 'S2', subjectId: 'M' },
    ]);

    await run([]);

    expect(calls).toEqual(['delete S1/M', 'delete S2/M']);
  });

  it('keeps rows already there and only adds or removes the difference', async () => {
    const { calls, run } = serviceWith([
      { classId: 'C1', sectionId: 'S1', subjectId: 'M' },
      { classId: 'C1', sectionId: 'S1', subjectId: 'F' },
    ]);

    await run([{ classId: 'C1', sectionIds: ['S1', 'S2'], subjectIds: ['M'] }]);

    expect(calls).toEqual(['delete S1/F', 'create S2/M']);
  });

  it('writes nothing when the list is unchanged', async () => {
    const { calls, run } = serviceWith([{ classId: 'C1', sectionId: 'S1', subjectId: 'M' }]);

    await run([{ classId: 'C1', sectionIds: ['S1'], subjectIds: ['M'] }]);

    expect(calls).toEqual([]);
  });
});

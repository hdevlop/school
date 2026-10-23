import { expect, it } from 'bun:test';
import { StudentService } from '../../src/modules/students/StudentService';

const data = { studentCode: 'S-001', classId: 'class', sectionId: 'section', yearEnrolledOn: '2026-09-01' };
const refused = (status: number, message: string) => Object.assign(new Error(message), { status });

it('returns field issues before collecting parents or fees, using the authoritative rules', async () => {
  const calls: string[] = [];
  const service = {
    studentValidator: { ensureCodeUnique: async (code: string) => {
      calls.push(code); throw refused(409, 'Code already exists');
    } },
    studentEnrollments: { resolveNewStudentPlacement: async (...args: string[]) => {
      calls.push(...args); throw refused(409, 'Section full');
    } },
  };
  const result = await StudentService.prototype.validateAdmission.call(service, data);
  expect(result.issues).toEqual([
    { field: 'studentCode', message: 'Code already exists' },
    { field: 'sectionId', message: 'Section full' },
  ]);
  expect(calls).toEqual(['S-001', 'class', 'section', '2026-09-01']);
});

it('does not disguise infrastructure or year-scope errors as a successful preflight', async () => {
  const service = {
    studentValidator: { ensureCodeUnique: async () => { throw new Error('Year context missing'); } },
  };
  await expect(StudentService.prototype.validateAdmission.call(service, data)).rejects.toThrow('Year context missing');
});

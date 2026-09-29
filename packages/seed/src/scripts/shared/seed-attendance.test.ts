import { expect, it, spyOn } from 'bun:test';
import { defaultSchoolYearCalendar } from '@sms/contracts/academic-years';
import { seedAttendance } from './seed-attendance';

it('limits demo attendance to this run and uses the resolved calendar', async () => {
  const year = { id: 'historical', label: '2023-2024', ...defaultSchoolYearCalendar('2023-2024') } as any;
  const inserted: any[] = [];
  const random = spyOn(Math, 'random').mockReturnValue(0.1);
  const log = spyOn(console, 'log').mockImplementation(() => {});
  try {
    await seedAttendance(year, { seedDemo: async (rows: any[]) => { inserted.push(...rows); return rows; } } as any,
      { getAll: async (...args: unknown[]) => {
        expect(args).toEqual([]);
        return ['new-student', 'earlier-student'].map((id) => ({ id, sectionId: 'section', enrollmentDate: year.instructionStartsOn }));
      } },
      { getAll: async () => [{ staffId: 'new-teacher', hireDate: year.instructionStartsOn }] },
      { getAll: async () => ['new-staff', 'earlier-staff'].map((id) => ({ id, hireDate: year.instructionStartsOn })) },
      { studentIds: new Set(['new-student']), staffIds: new Set(['new-teacher', 'new-staff']) });
    expect(new Set(inserted.filter((row) => row.type === 'student').map((row) => row.studentId))).toEqual(new Set(['new-student']));
    expect(new Set(inserted.filter((row) => row.type === 'staff').map((row) => row.staffId))).toEqual(new Set(['new-teacher', 'new-staff']));
    expect(inserted.every((row) => row.date >= year.instructionStartsOn && row.date <= year.instructionEndsOn)).toBe(true);
  } finally {
    random.mockRestore();
    log.mockRestore();
  }
});

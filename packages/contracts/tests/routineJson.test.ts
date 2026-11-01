import { describe, expect, it } from 'bun:test';
import { isRoutineJson, parseRoutineJson, routineNameKey, type RoutineJson } from '../src/routineJson';

const valid = (): RoutineJson => ({
  format: 'school-class-routines',
  version: 1,
  schoolYear: '2026-2027',
  exportedAt: '2026-11-01T10:00:00.000Z',
  routines: [{
    className: 'CP',
    sectionName: 'A',
    name: 'CP A',
    periods: [
      { type: 'lesson', name: 'P1', startTime: '08:30', endTime: '09:30' },
      { type: 'break', name: 'Lunch', startTime: '12:30', endTime: '13:30' },
      { type: 'lesson', name: 'P2', startTime: '13:30', endTime: '14:30' },
    ],
    lessons: [
      { day: 'monday', period: 1, subject: 'Mathématiques', subjectCode: 'MATH', teacher: 'Sara', roomNumber: '12', notes: null, contentGroups: [] },
      { day: 'monday', period: 3, subject: 'القراءة', contentGroups: [{ kind: 'alternative', options: ['الإملاء', 'الخط'] }] },
    ],
    duties: [{ day: 'monday', period: 2, staff: 'Omar', notes: null }],
  }],
});

const changed = (change: (document: any) => void) => {
  const document: any = valid();
  change(document);
  return document;
};

describe('routine JSON files', () => {
  it('accepts a whole timetable with Arabic content and optional fields left out', () => {
    expect(isRoutineJson(valid())).toBe(true);
  });

  it('refuses a wrong format, version, year or export date', () => {
    for (const document of [
      changed(d => { d.format = 'school-exam-planning'; }),
      changed(d => { d.version = 2; }),
      changed(d => { d.schoolYear = '2026'; }),
      changed(d => { d.exportedAt = 'yesterday'; }),
      changed(d => { d.extra = true; }),
      changed(d => { d.routines = []; }),
    ]) expect(isRoutineJson(document)).toBe(false);
  });

  it('applies the layout editor rules to periods', () => {
    for (const document of [
      changed(d => { d.routines[0].periods[0].endTime = '08:00'; }),
      changed(d => { d.routines[0].periods[1].startTime = '09:00'; d.routines[0].periods[1].endTime = '09:15'; d.routines[0].periods[0].endTime = '09:30'; }),
      changed(d => { d.routines[0].periods = d.routines[0].periods.map((p: any) => ({ ...p, type: 'break' })); d.routines[0].lessons = []; d.routines[0].duties = []; }),
      changed(d => { d.routines[0].periods[0].startTime = '8:30'; }),
      changed(d => { d.routines[0].periods[0].type = 'recess'; }),
    ]) expect(isRoutineJson(document)).toBe(false);
  });

  it('refuses lessons and duties that point nowhere, double up or put supervision on a lesson period', () => {
    for (const document of [
      changed(d => { d.routines[0].lessons[0].period = 4; }),
      changed(d => { d.routines[0].lessons[0].period = 0; }),
      changed(d => { d.routines[0].lessons[0].day = 'funday'; }),
      changed(d => { d.routines[0].lessons.push({ ...d.routines[0].lessons[0], subject: 'Lecture' }); }),
      changed(d => { d.routines[0].duties[0].period = 1; }),
      changed(d => { d.routines[0].lessons.push({ day: 'monday', period: 2, subject: 'Sport', contentGroups: [] }); }),
      changed(d => { d.routines[0].lessons[1].contentGroups = [{ kind: 'alternative', options: ['Same', ' same '] }]; }),
      changed(d => { d.routines[0].lessons[0].teacherId = 'abc'; }),
    ]) expect(isRoutineJson(document)).toBe(false);
  });

  it('refuses the same class and section twice, however it is written', () => {
    expect(isRoutineJson(changed(d => { d.routines.push({ ...d.routines[0], className: ' cp ', sectionName: 'a' }); }))).toBe(false);
    expect(isRoutineJson(changed(d => { d.routines.push({ ...d.routines[0], sectionName: 'B' }); }))).toBe(true);
  });

  it('normalizes text and fills optional fields', () => {
    const result = parseRoutineJson(changed(d => { d.routines[0].className = ' CP '; d.routines[0].lessons[0].teacher = '  '; }));
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.routines[0].className).toBe('CP');
    expect(result.data.routines[0].lessons[0].teacher).toBeNull();
    expect(result.data.routines[0].lessons[1]).toMatchObject({ subjectCode: null, teacher: null, roomNumber: null, notes: null });
  });

  it('compares names as people read them', () => {
    expect(routineNameKey(' Éva ')).toBe(routineNameKey('éva'));
  });
});

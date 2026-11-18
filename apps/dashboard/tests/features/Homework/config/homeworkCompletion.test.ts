import { describe, expect, it } from 'bun:test';
import type { HomeworkMissedRecord, HomeworkRosterEntry } from '@sms/contracts';
import { completionDraft, completionEntries, missedByStudent, missedThisMonth, personInitials } from '@/features/Homework/config/homeworkCompletion';
import { familyCompletions } from '@/features/Homework/hooks/useHomeworkTableColumns';

const pupil = (studentId: string, status: HomeworkRosterEntry['status'] = null, note: string | null = null): HomeworkRosterEntry =>
  ({ studentId, name: studentId, image: null, status, note });

let id = 0;
const missed = (studentId: string, date: string, status: HomeworkMissedRecord['status'] = 'not_done', subject = 'Maths'): HomeworkMissedRecord => ({
  id: `c-${++id}`, status, note: null, homeworkId: `hw-${id}`, title: `Exercice ${id}`, date, dueOn: null,
  subject: { id: subject, name: subject }, subSubject: null,
  student: { id: studentId, name: studentId, image: null },
  class: { id: 'cp', name: 'CP' }, section: { id: 'cp-a', name: 'A' },
});

describe('the follow-up form', () => {
  it('starts every pupil not yet checked as done, and keeps what was recorded', () => {
    expect(completionDraft([pupil('amine'), pupil('sara', 'not_done', 'Cahier oublié')])).toEqual({
      amine: { status: 'done', note: '' },
      sara: { status: 'not_done', note: 'Cahier oublié' },
    });
  });

  it('saves every pupil of the roster, a remark only where one was typed', () => {
    const roster = [pupil('amine'), pupil('sara'), pupil('yassine')];
    expect(completionEntries(roster, {
      amine: { status: 'done', note: '   ' },
      sara: { status: 'incomplete', note: ' Exercice 2 ' },
    })).toEqual([
      { studentId: 'amine', status: 'done', note: null },
      { studentId: 'sara', status: 'incomplete', note: 'Exercice 2' },
      // A pupil the draft lost is still saved, as done.
      { studentId: 'yassine', status: 'done', note: null },
    ]);
  });
});

describe('missed homework by pupil', () => {
  const today = '2026-11-18';

  it('counts not done and incomplete apart, and this month on its own', () => {
    const [sara] = missedByStudent([
      missed('sara', '2026-11-17'),
      missed('sara', '2026-11-03', 'incomplete', 'Français'),
      missed('sara', '2026-10-20'),
    ], today);
    expect(sara).toMatchObject({ notDone: 2, incomplete: 1, thisMonth: 2, lastDate: '2026-11-17', subjects: ['Maths', 'Français'], toReport: false });
    expect(missedThisMonth(sara, today).map((record) => record.date)).toEqual(['2026-11-17', '2026-11-03']);
  });

  it('suggests an incident from three missed this month, never for older ones', () => {
    const groups = missedByStudent([
      missed('amine', '2026-11-02'), missed('amine', '2026-11-09'), missed('amine', '2026-11-16', 'incomplete'),
      missed('sara', '2026-10-02'), missed('sara', '2026-10-09'), missed('sara', '2026-10-16'), missed('sara', '2026-10-23'),
    ], today);
    expect(groups.map((group) => [group.student.id, group.toReport])).toEqual([['amine', true], ['sara', false]]);
  });

  it('lists the most missed this month first', () => {
    const groups = missedByStudent([
      missed('omar', '2026-10-01'), missed('omar', '2026-10-02'),
      missed('lina', '2026-11-01'),
    ], today);
    expect(groups.map((group) => group.student.id)).toEqual(['lina', 'omar']);
  });
});

describe('an avatar without a photo', () => {
  it('shows the first letters of the first two names', () => {
    expect(personInitials('AMARAI AHMED')).toBe('AA');
    expect(personInitials('el qarnani mohamed reda')).toBe('EQ');
    expect(personInitials('  Sara ')).toBe('S');
    expect(personInitials('أحمد العلوي')).toBe('أا');
    expect(personInitials('')).toBe('?');
  });
});

describe('the follow-up a family reads', () => {
  const row = (fields: object) => ({ id: 'hw-1', ...fields }) as never;

  it('a pupil: their own record, unnamed', () => {
    expect(familyCompletions(row({ completion: { status: 'not_done', note: 'Oublié' } })))
      .toEqual([{ key: 'self', name: null, status: 'not_done', note: 'Oublié' }]);
  });

  it('a parent: each recorded child, named only when there are several', () => {
    const children = [
      { id: 'a', name: 'Amine', seenAt: null, completion: { status: 'done', note: null } },
      { id: 'b', name: 'Sara', seenAt: null, completion: null },
    ];
    expect(familyCompletions(row({ children }))).toEqual([{ key: 'a', name: 'Amine', status: 'done', note: null }]);
    expect(familyCompletions(row({ children: [children[0]] }))[0].name).toBeNull();
    expect(familyCompletions(row({ children: [] }))).toEqual([]);
  });
});

import { expect, it } from 'bun:test';
import type { MassarSheetDetail, MassarSheetRow } from '@sms/contracts';
import { MassarDraft } from '@/features/Massar/config/MassarDraft';
import { classState, controlList, dueState, nextCell, nextRound, overview, parseCell, pastedCells, sheetState } from '@/features/Massar/config/massarModel';
import { massarPlanningControls } from '@sms/contracts';
import { buildMassarDocument } from '@/features/Massar/config/massarDocument';

const detail = () => ({ sheet: { id: 'sheet', revision: 3 }, maxMark: 10, students: [{ id: 's1' }, { id: 's2' }], components: [{ code: 'a' }, { code: 'b' }], marks: [] }) as unknown as MassarSheetDetail;
it('serializes sparse auto-saves and preserves edits made while a request is pending', async () => {
  const calls: any[] = []; let finish!: (value: { revision: number }) => void;
  const draft = new MassarDraft(detail(), async (revision, marks) => { calls.push({ revision, marks }); return calls.length === 1 ? new Promise(resolve => { finish = resolve; }) : { revision: revision + 1 }; });
  try {
    draft.update({ 's1:a': { text: '8', absence: 'none' } });
    const first = draft.flush();
    draft.update({ 's1:a': { text: '9', absence: 'none' }, 's2:b': { text: '12', absence: 'none' } });
    await draft.flush(); expect(calls).toHaveLength(1);
    finish({ revision: 4 }); await first;
    expect(draft.snapshot().cells['s1:a'].text).toBe('9'); expect(draft.snapshot().dirty).toBe(true);
    await draft.flush(); expect(calls[1]).toMatchObject({ revision: 4, marks: [{ studentId: 's1', componentCode: 'a', mark: 9 }] });
    expect(draft.snapshot().invalid).toBe(true); expect(draft.snapshot().cells['s2:b'].text).toBe('12');
    expect(calls.flatMap(call => call.marks).some(mark => mark.mark === 12)).toBe(false);
  } finally { draft.dispose(); }
});
it('keeps a rejected revision and the draft for explicit retry, without replacing edits on a refetch', async () => {
  const revisions: number[] = [];
  const draft = new MassarDraft(detail(), async revision => { revisions.push(revision); throw new Error('stale revision'); });
  try {
    draft.update({ 's1:a': { text: '8', absence: 'none' } }); await draft.flush();
    draft.sync({ ...detail(), sheet: { ...detail().sheet, revision: 9 } });
    expect(draft.snapshot().cells['s1:a'].text).toBe('8'); expect(draft.snapshot().error).toBe('stale revision');
    await draft.retry(); expect(revisions).toEqual([3, 3]);
    draft.discard(); expect(draft.snapshot().dirty).toBe(false); expect(draft.recovery().cells).toEqual({});
  } finally { draft.dispose(); }
});
it('recovers only unsaved cells and keeps their original revision after a year switch', async () => {
  const original = new MassarDraft(detail(), async revision => ({ revision: revision + 1 }));
  original.update({ 's1:a': { text: '8', absence: 'none' } });
  const recovery = JSON.parse(JSON.stringify(original.recovery())); original.dispose();
  expect(Object.keys(recovery.cells)).toEqual(['s1:a']);
  let savedRevision = -1;
  const recovered = new MassarDraft({ ...detail(), sheet: { ...detail().sheet, revision: 9 } }, async revision => { savedRevision = revision; throw new Error('stale revision'); });
  try { recovered.restore(recovery); await recovered.flush(); expect(savedRevision).toBe(3); expect(recovered.snapshot().dirty).toBe(true); }
  finally { recovered.dispose(); }
});
it('parses pasted Excel blocks, keeps invalid values, and moves in both directions', () => {
  const block = pastedCells('8,5\tA\r\n12\tno\r\n', 0, 0, 2, 2);
  expect(block).toHaveLength(4); expect(parseCell(block[0].cell, 10)?.mark).toBe(8.5);
  expect(parseCell(block[1].cell, 10)).toEqual({ mark: null, absence: 'justified' });
  expect(parseCell(block[2].cell, 10)).toBeNull(); expect(parseCell(block[3].cell, 10)).toBeNull();
  expect(nextCell('Enter', 0, 0, 3, 2)).toEqual({ row: 1, col: 0 });
  expect(nextCell('Tab', 0, 1, 3, 2)).toEqual({ row: 1, col: 0 });
  expect(nextCell('ArrowLeft', 0, 0, 3, 2, false, true)).toEqual({ row: 0, col: 1 });
  expect(nextCell('ArrowUp', 0, 0, 3, 2)).toBeNull();
});
it('counts Done from marks without Submit and groups missing sheets by teacher', () => {
  const sheets = [
    { id: '1', className: '2APG-1', subjectName: 'Arabic', teacherName: 'Salma', total: 30, missing: 0, status: 'in_progress' },
    { id: '2', className: '1APG-1', subjectName: 'Arabic', teacherName: 'Salma', total: 30, missing: 10, status: 'in_progress' },
    { id: '3', className: '1APG-1', subjectName: 'Math', teacherName: null, total: 30, missing: 30, status: 'not_started' },
  ] as MassarSheetRow[];
  expect(sheetState(sheets[0])).toBe('done'); expect(classState([sheets[0]])).toBe('done');
  expect(overview(sheets)).toMatchObject({ done: 1, classes: ['1APG-1', '2APG-1'] });
  expect(overview(sheets).missing.map(([teacher, rows]) => [teacher, rows.map(row => row.id)])).toEqual([['Salma', ['2']], [null, ['3']]]);
});
it('handles no deadline, future, today and late; places overdue teachers first', () => {
  expect(dueState(null, '2026-11-06').status).toBe('none');
  expect(dueState('2026-11-08', '2026-11-06')).toEqual({ status: 'future', days: 2 });
  expect(dueState('2026-11-06', '2026-11-06')).toEqual({ status: 'today', days: 0 });
  expect(dueState('2026-11-04', '2026-11-06')).toEqual({ status: 'late', days: 2 });
  const base = { id: 'sheet', status: 'in_progress', missing: 10, total: 30, className: '1APG-1', subjectName: 'Arabic' } as MassarSheetRow;
  expect(sheetState({ ...base, late: true })).toBe('late');
  expect(sheetState({ ...base, late: true, missing: 0 })).toBe('done');
  expect(classState([{ ...base, late: true }])).toBe('late');
  expect(overview([{ ...base, teacherName: 'On time' }, { ...base, id: 'late', late: true, teacherName: 'Overdue' }]).missing.map(([name]) => name)).toEqual(['Overdue', 'On time']);
});
it('keeps integrated activities reachable after the last ordinary assessment', () => {
  const full = [1, 2].flatMap(term => [1, 2, 3].map(exam => ({ term, exam, dueDate: null })));
  expect(nextRound([], full)).toEqual({ term: 1, exam: 1 });
  expect(nextRound([{ term: 1, exam: 3 }] as any, full)).toEqual({ term: 2, exam: 1 });
  expect(nextRound([{ term: 2, exam: 3 }] as any, full)).toEqual({ term: 1, exam: 4 });
  expect(nextRound([{ term: 1, exam: 4 }, { term: 2, exam: 3 }] as any, full)).toEqual({ term: 2, exam: 4 });
});
it('follows Planning: each month with exams is one Contrôle of its semester, then integrated activities', () => {
  const controls = massarPlanningControls([
    { classId: 'b', months: { '2026-10': [{ date: '2026-10-20' }, { date: '2026-10-22' }], '2026-12': [{ date: '2026-12-15' }] } },
    { classId: 'a', months: { '2026-10': [{ date: '2026-10-21' }], '2026-11': [], '2027-03': [{ date: '2027-03-10' }] } },
  ]);
  expect(controls).toEqual([
    { term: 1, exam: 1, examFrom: '2026-10-20', examTo: '2026-10-22', classIds: ['a', 'b'] },
    { term: 1, exam: 2, examFrom: '2026-12-15', examTo: '2026-12-15', classIds: ['b'] },
    { term: 2, exam: 1, examFrom: '2027-03-10', examTo: '2027-03-10', classIds: ['a'] },
  ]);
  const planned = controls.map(({ term, exam, examFrom, examTo }) => ({ term, exam, examFrom, examTo, dueDate: term === 2 ? '2027-03-31' : null }));
  expect(nextRound([], planned)).toEqual({ term: 1, exam: 1 });
  expect(nextRound([{ term: 1, exam: 2 }] as any, planned)).toEqual({ term: 2, exam: 1 });
  expect(nextRound([{ term: 2, exam: 1 }] as any, planned)).toEqual({ term: 1, exam: 4 });
  const rounds = [{ id: 'r1', term: 1, exam: 1, dueDate: '2026-11-15' }] as any;
  expect(controlList(rounds, planned).map(item => [item.term, item.exam, item.state, item.dueDate, item.examFrom])).toEqual([
    [1, 1, 'opened', '2026-11-15', '2026-10-20'], [1, 2, 'next', null, '2026-12-15'], [2, 1, 'later', '2027-03-31', '2027-03-10']]);
});
it('prints every selected sheet with marks and empty cells, escapes names and refuses active logo URLs', () => {
  const data = { ...detail(), schoolName: '<script>school</script>', sheet: { ...detail().sheet, className: '1APG-1', subjectName: 'Arabic' }, yearLabel: '2026-2027', round: { term: 1, exam: 1 }, students: [{ id: 's1', name: '<Student>', studentCode: 'S1', position: 0 }], marks: [{ studentId: 's1', componentCode: 'a', mark: 0, absence: 'none' }] } as MassarSheetDetail;
  const html = buildMassarDocument([data, data], { language: 'ar', logo: 'javascript:alert(1)', title: 'Notes', student: 'Student', birthDate: 'DOB', teacher: 'Teacher', maxMark: '/', term: 'Term', exam: 'Exam' });
  // One A4 sheet per subject; a mark prints with two decimals, as Massar shows it, and an empty part stays blank.
  expect((html.match(/<section class="sheet"/g) ?? [])).toHaveLength(2); expect(html).toContain('<td class="mark" dir="ltr">0.00</td><td class="mark" dir="ltr"></td>');
  expect(html).toContain('@page{size:A4 landscape;margin:0}');
  expect(html).toContain('&lt;Student&gt;'); expect(html).not.toContain('<script>'); expect(html).not.toContain('javascript:');
});

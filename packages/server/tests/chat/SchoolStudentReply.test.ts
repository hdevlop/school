import { expect, test } from 'bun:test';
import { schoolStudentGradeReply } from '../../src/modules/chat/replies/schoolStudentReply';

test('own grades preserve fractional marks and assessment identity without generating facts', () => {
  const reply = schoolStudentGradeReply('وريني النقط ديالي', 'ary', '2026-2027', 'student', 'S1');
  expect(reply?.calls).toEqual([{ name: 'student-profile_get_academic', input: { studentId: 'S1', academicYear: '2026-2027' } }]);
  const grade = { studentId: 'S1', marksObtained: '6.75', subject: { name: 'Mathématiques' }, assessment: { title: 'Quiz', totalMarks: '10.00' } };
  expect(reply?.render?.([{ grades: [grade] }])).toContain('Mathématiques — Quiz: 6.75 / 10');
  expect(reply?.render?.([{ grades: [] }])).toContain('ما لقيت حتى نقطة');
  for (const bad of [{ ...grade, studentId: 'S2' }, { ...grade, marksObtained: '11' }, { ...grade, marksObtained: '' }, { ...grade, assessment: null }]) expect(() => reply?.render?.([{ grades: [bad] }])).toThrow();
  expect(() => reply?.render?.(['Error (FORBIDDEN)'])).toThrow();
});
test('filters, names, other roles and unresolved identity decline the own-grade template', () => {
  for (const query of ['وريني النقط ديال ياسين', 'وريني النقط ديالي فالرياضيات', 'nchof no9at dyali 2025-2026', 'وريني النقط ديالي وغيابي']) {
    expect(schoolStudentGradeReply(query, 'ary', '2026-2027', 'student', 'S1')).toBeNull();
  }
  expect(schoolStudentGradeReply('وريني النقط ديالي', 'ary', '2026-2027', 'student')).toBeNull();
  for (const role of ['admin', 'parent', 'teacher']) expect(schoolStudentGradeReply('وريني النقط ديالي', 'ary', '2026-2027', role, 'S1')).toBeNull();
});

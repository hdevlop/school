import { expect, test } from 'bun:test';
import { countEquivalentExpectation } from '../chatbot-darija-equivalence-report.mjs';
test('staff school counts accept the shared KPI source; filtered and non-staff cases do not', () => {
  const item = { expectation: { actor: 'history-admin', kind: 'read', requiredToolGroups: [['students_get_student_count'], ['teachers_get_teacher_count']] } };
  expect(countEquivalentExpectation(item).expectation.requiredToolGroups).toEqual([
    ['students_get_student_count', 'academic-dashboard_get_kpis'], ['teachers_get_teacher_count', 'academic-dashboard_get_kpis']]);
  const filtered = { expectation: { ...item.expectation, requiredToolGroups: [['students_get_students']] } };
  expect(countEquivalentExpectation(filtered)).toBe(filtered);
  const student = { expectation: { ...item.expectation, actor: 'student' } };
  expect(countEquivalentExpectation(student)).toBe(student);
});

import { expect, test } from 'bun:test';
import { scoreSelection } from '../chatbot-darija-selection-report.mjs';

const row = tools => ({ done: true, errors: [], tools, diagnostics: { tools: tools.map(tool => ({ name: tool.name, outcome: 'executed' })) } });
const item = { intent: 'attendance_today', expectation: { kind: 'read', studentAttendance: true, academicYear: '2026-2027',
  requiredToolGroups: [['attendance_get_today_students', 'attendance_get_today_all']] } };
const schema = ['attendance_get_today_students', 'attendance_get_today_all'].map(name =>
  ({ name, annotations: { readOnlyHint: true }, inputSchema: {} }));
test('all-attendance needs student scope; a completed stream alone is insufficient', () => {
  expect(scoreSelection(row([]), item, schema, new Set(), '2026-10-08').toolPlanChecksPassed).toBe(false);
  expect(scoreSelection(row([{ name: 'attendance_get_today_all', arguments: {} }]), item, schema, new Set(), '2026-10-08').issues)
    .toContain('missing_student_attendance_scope');
  expect(scoreSelection(row([{ name: 'attendance_get_today_all', arguments: { type: 'student' } }]), item, schema, new Set(), '2026-10-08').toolPlanChecksPassed).toBe(true);
});
test('names used as IDs and wrong years fail argument checks', () => {
  const result = scoreSelection(row([{ name: 'attendance_get_today_students', arguments: { id: 'CE2', academicYear: '2025-2026' } }]),
    item, schema, new Set(['real-id']), '2026-10-08');
  expect(result.issues).toContain('unresolved_id:id'); expect(result.issues).toContain('wrong_year');
});
test('clarification with no tools still requires semantic review', () => {
  const result = scoreSelection(row([]), { expectation: { kind: 'clarification', requiredToolGroups: [], finalAnswerReview: true } },
    schema, new Set(), '2026-10-08');
  expect(result.toolPlanChecksPassed).toBe(true);
  expect(result.reviewFlags).toContain('clarification_or_result_filter_needs_review');
  expect(result.finalAnswerCorrectness).toBeNull();
});

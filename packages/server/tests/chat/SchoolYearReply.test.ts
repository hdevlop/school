import { expect, test } from 'bun:test';
import { schoolYearReply } from '../../src/modules/chat/replies/schoolYearReply';
import { schoolReplyTemplate } from '../../src/modules/chat/replies/schoolReplyTemplates';

test('an explicit other academic year returns a restriction before any read for personal roles', () => {
  for (const role of ['parent', 'teacher', 'student']) {
    for (const userText of ['بغيت النقط ديال العام 2025-2026.', 'nchof no9at l3am 2025/2026', 'النقاط ديال السنة 2025‑2026',
      'وريني الغياب فالعام 2025-2026.', 'بغيت الأقسام فالسنة 2025-2026.', 'النقط وبالعام 2025-2026']) {
      const reply = schoolReplyTemplate({ userText, language: 'ary', channel: 'web' }, '2026-2027', role);
      expect(reply).toEqual({ label: 'school:explicit-other-year', text: expect.stringContaining('غير العام الدراسي الحالي 2026-2027') });
      expect(reply).not.toHaveProperty('calls');
    }
  }
});
test('year switching roles get the dashboard selection instruction', () => {
  expect(schoolYearReply('العام 2025-2026', 'ary', '2026-2027', 'admin')?.text).toContain('اختار');
});
test('current year, calendar dates, codes and non-consecutive ranges stay on the normal path', () => {
  for (const query of ['النقط ديال العام 2026-2027', 'attendance 2026-10-09', 'student code 2025-2026', 'العام 2025-2028',
    'فالعام 2026-2027', 'العامودي 2025-2026', 'student code xفالعام 2025-2026']) {
    expect(schoolYearReply(query, 'ary', '2026-2027', 'student')).toBeNull();
  }
  expect(schoolYearReply('العام 2025-2026', 'ary', undefined, 'student')).toBeNull();
});

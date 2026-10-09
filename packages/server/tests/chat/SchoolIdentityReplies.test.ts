import { schoolClassIdentityReply } from '../../src/modules/chat/replies/schoolClassReply';
import { expect, test } from 'bun:test';
import { schoolReplyTemplate } from '../../src/modules/chat/replies/schoolReplyTemplates';
import { schoolReplyLanguage } from '../../src/modules/chat/replies/schoolReplyLanguage';
const year = '2026-2027';
const lists = ['الأقسام كاملين ديال المدرسة عطيني سميتهم.', 'l2a9sam kamlin dyal lmdrasa 3tini smiythom.',
  'عطيني سميات الأقسام كاملين', 'werini lista dyal l2a9sam kamlin'];
const fifths = ['شحال من تلميذ كاين فالقسم الخامس بوحدو؟', 'ch7al mn tilmid kayn f l9ism lkhamis bo7do?',
  'شحال من تلاميذ فالقسم الخامس', 'ch7al mn tlamd f l9sim lkhamis'];
const daughters = ['بغيت غير النقط ديال بنتي فهاد العام.', 'bghit ghir nno9at dyal bnti f had l3am.', 'وريني نقط بنتي', '3tini no9at dyal bnti'];
function read(query: string) {
  const plan = schoolClassIdentityReply(query, 'ary', year);
  if (!plan || 'text' in plan) throw Error('Expected read');
  return plan;
}
test.each(lists)('class lists preserve class identity and nested section labels: %s', query => {
  const plan = read(query);
  expect(plan.calls).toEqual([{ name: 'classes_get_classes', input: { academicYear: year } }]);
  const result = plan.render([[{ id: 'class', name: 'CE2', sections: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] }]]);
  expect(result).toContain('- CE2: A, B');
  expect(result).toContain('الأقسام والشعب');
});
test.each(fifths)('fifth count uses discovered class ID, all sections and both genders: %s', query => {
  const plan = read(query);
  expect(plan.calls).toEqual(['classes_get_classes', 'students_get_students'].map(name => ({ name, input: { academicYear: year } })));
  const classes = [{ id: 'fifth', name: 'CM2', level: '5' }, { id: 'other', name: 'CE2', level: '3' }];
  const students = [{ id: 'a', classId: 'fifth', sectionId: 'A', gender: 'female' },
    { id: 'b', classId: 'fifth', sectionId: 'B', gender: 'male' }, { id: 'c', classId: 'other', gender: 'female' }];
  expect(plan.render([classes, students])).toContain('CM2 فيه 2 تلميذ');
  expect(plan.render([classes, [...students, students[0]]])).toContain('CM2 فيه 2 تلميذ');
  expect(plan.render([classes, []])).toContain('CM2 فيه 0 تلميذ');
  expect(plan.render([classes, [...students, { id: 'unknown', classId: null }]])).toContain('ما نقدرش نأكد العدد الكامل');
});
test('unresolved class, cross-cycle duplicates and section labels never establish a zero count', () => {
  const plan = read(fifths[0]);
  for (const classes of [[], [{ id: 'history', name: 'History', sections: [{ id: 'fifth', name: '5' }] }],
    [{ id: 'primary', name: '5 AEP' }, { id: 'other-cycle', name: 'Other', level: '5' }]]) {
    const text = plan.render([classes, []]);
    expect(text).toContain('ما قدرتش نحدد');
    expect(text).not.toContain('0 تلميذ');
  }
  const classes = [{ id: 'fifth', name: 'الخامس' }];
  for (const results of [[classes, 'Error (FORBIDDEN)'], [classes], [[...classes, classes[0]], []],
    [classes, [{ id: 'a', classId: 'fifth' }, { id: 'a', classId: 'other' }]], [classes, [{ id: 'a', classId: 5 }]], [classes, [null]]]) {
    expect(() => plan.render(results)).toThrow();
  }
});
test.each(['وريني الأقسام ديال الأستاذ أحمد', lists[0] + ' "CE2"', lists[1] + ' section A', fifths[0] + ' البنات',
  fifths[1] + ' absent', fifths[1] + ' 2025-2026', 'شحال من تلميذ فالقسم الرابع', 'شحال من تلميذ فالشعبة الخامسة'])('qualified class requests retain routing: %s', query => {
  expect(schoolClassIdentityReply(query, 'ary', year)).toBeNull();
});

test('personal requests use routed identity tools, while closed class reads keep year and write handling', () => {
 for (const query of [...lists, ...fifths]) {
  const request = { userText: query, channel: 'web', language: schoolReplyLanguage(query) };
  expect(schoolReplyTemplate(request, year)).not.toBeNull();
  expect(schoolReplyTemplate(request)).toBeNull();
  expect(schoolReplyTemplate({ ...request, channel: 'whatsapp' }, year)).toBeNull();
 }
 for (const userText of daughters) expect(schoolReplyTemplate({ userText, language: 'ary', channel: 'web' }, year)).toBeNull();
 expect(schoolReplyTemplate({ userText: 'بدل النقط ديال بنتي', language: 'ary', channel: 'web' }, year)).not.toHaveProperty('calls');
});

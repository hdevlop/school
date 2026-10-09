import { expect, test } from 'bun:test';
import { schoolTeacherCountReply } from '../../src/modules/chat/schoolTeacherReply';

test('personal teacher totals use the authenticated identity and the tool total, including zero', () => {
  for (const query of ['chhal mn tlamid 3ndi?', 'شحال من تلميذ عندي أنا؟']) {
    const reply = schoolTeacherCountReply(query, 'ary', '2026-2027', 'teacher', 'T1');
    expect(reply?.calls).toEqual([{ name: 'teacher-profile_get_my_students', input: { teacherId: 'T1', academicYear: '2026-2027' } }]);
    expect(reply?.render?.([{ studentCount: 0 }])).toContain('0 تلميذ');
    expect(reply?.render?.([{ studentCount: 44 }])).toContain('44 تلميذ');
    for (const result of [null, { studentCount: -1 }, { studentCount: '44' }, { studentCount: NaN }]) expect(() => reply?.render?.([result])).toThrow();
  }
});
test('qualifiers, another teacher, missing identity and other roles stay on the router', () => {
  for (const query of ['ch7al mn tilmid 3ndi f 4A?', 'ch7al mn bent 3ndi?', 'شحال من تلميذ عندي فالسادس؟', 'ch7al mn tilmid 3nd Yassine?', 'count school students']) {
    expect(schoolTeacherCountReply(query, 'ary', '2026-2027', 'teacher', 'T1')).toBeNull();
  }
  expect(schoolTeacherCountReply('ch7al mn tilmid 3ndi', 'ary', '2026-2027', 'teacher')).toBeNull();
  for (const role of ['admin', 'parent', 'student']) expect(schoolTeacherCountReply('ch7al mn tilmid 3ndi', 'ary', '2026-2027', role, 'T1')).toBeNull();
});

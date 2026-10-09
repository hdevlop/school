import { expect, test } from 'bun:test';
import { schoolChildGradeReply, schoolClassIdentityReply, type SchoolChatChild } from '../../src/modules/chat/replies/schoolIdentityReplies';
import { schoolReplyTemplate } from '../../src/modules/chat/replies/schoolReplyTemplates';
import { schoolReplyLanguage } from '../../src/modules/chat/replies/schoolReplyLanguage';
import { createJevFixture } from './jevFixture';
import { setBenchmarkJevMode } from '../../src/modules/chat/jev/JevControls';

const year = '2026-2027';
const lists = ['الأقسام كاملين ديال المدرسة عطيني سميتهم.', 'l2a9sam kamlin dyal lmdrasa 3tini smiythom.',
  'عطيني سميات الأقسام كاملين', 'werini lista dyal l2a9sam kamlin'];
const fifths = ['شحال من تلميذ كاين فالقسم الخامس بوحدو؟', 'ch7al mn tilmid kayn f l9ism lkhamis bo7do?',
  'شحال من تلاميذ فالقسم الخامس', 'ch7al mn tlamd f l9sim lkhamis'];
const daughters = ['بغيت غير النقط ديال بنتي فهاد العام.', 'bghit ghir nno9at dyal bnti f had l3am.', 'وريني نقط بنتي', '3tini no9at dyal bnti'];
const children: SchoolChatChild[] = [{ id: 'daughter', name: 'Salma', gender: 'female' }, { id: 'son', name: 'Omar', gender: 'male' }];
function read(query: string) {
  const plan = schoolClassIdentityReply(query, 'ary', year, 'admin');
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

test.each(['parent', 'student', 'teacher', 'accounting', undefined])('class-wide reads require the correct actor: %s', role => {
  for (const query of [...lists, ...fifths]) expect(schoolClassIdentityReply(query, 'ary', year, role)).not.toHaveProperty('calls');
});
test.each(['وريني الأقسام ديال الأستاذ أحمد', lists[0] + ' "CE2"', lists[1] + ' section A', fifths[0] + ' البنات',
  fifths[1] + ' absent', fifths[1] + ' 2025-2026', 'شحال من تلميذ فالقسم الرابع', 'شحال من تلميذ فالشعبة الخامسة'])('qualified class requests retain routing: %s', query => {
  expect(schoolClassIdentityReply(query, 'ary', year, 'admin')).toBeNull();
});

test.each(daughters)('child grades use the owned daughter ID and actual grades: %s', query => {
  const plan = schoolChildGradeReply(query, 'ary', year, 'parent', children);
  expect(plan?.calls).toEqual([{ name: 'student-profile_get_academic', input: { studentId: 'daughter', academicYear: year } }]);
  const grade = { studentId: 'daughter', marksObtained: '6.75', subject: { name: 'Mathématiques' }, assessment: { title: 'Quiz', totalMarks: '10' } };
  const text = plan?.render?.([{ grades: [grade] }]);
  expect(text).toContain('النقط ديال Salma'); expect(text).toContain('Mathématiques — Quiz: 6.75 / 10');
  expect(text).not.toContain('الحضور');
  expect(plan?.render?.([{ grades: [] }])).toContain('ما لقيت حتى نقطة مسجلة لـ Salma');
  expect(() => plan?.render?.([{ grades: [{ ...grade, studentId: 'outsider' }] }])).toThrow();
  expect(() => plan?.render?.(['Error (FORBIDDEN)'])).toThrow();
});

test('persisted M/F genders resolve owned siblings without guessing unknown or mismatched genders', () => {
  const persisted = [{ id: 'daughter', name: 'Salma', gender: 'F' }, { id: 'son', name: 'Omar', gender: 'M' }];
  expect(schoolChildGradeReply(daughters[0], 'ary', year, 'parent', persisted)?.calls?.[0].input.studentId).toBe('daughter');
  expect(schoolChildGradeReply('وريني نقط ولدي', 'ary', year, 'parent', persisted)?.calls?.[0].input.studentId).toBe('son');
  for (const candidates of [[persisted[1]], [{ ...persisted[0], gender: 'unknown' }], [...persisted, { id: 'unknown', name: 'Aya', gender: null }]]) {
    expect(schoolChildGradeReply(daughters[0], 'ary', year, 'parent', candidates)).not.toHaveProperty('calls');
  }
});

test('son and generic child resolve independently; uncertain identity never dispatches', () => {
  expect(schoolChildGradeReply('وريني نقط ولدي', 'ary', year, 'parent', children)?.calls?.[0].input.studentId).toBe('son');
  expect(schoolChildGradeReply('وريني نقط طفلي', 'ary', year, 'parent', [children[0]])?.calls?.[0].input.studentId).toBe('daughter');
  for (const candidates of [undefined, [], [children[1]], children.map(child => ({ ...child, gender: null })),
    [children[0], { id: 'unknown', name: 'Unknown' }], [children[0], { id: 'second', name: 'Aya', gender: 'female' }]]) {
    expect(schoolChildGradeReply(daughters[0], 'ary', year, 'parent', candidates)).not.toHaveProperty('calls');
  }
  for (const role of ['admin', 'principal', 'teacher', 'student', undefined]) {
    expect(schoolChildGradeReply(daughters[0], 'ary', year, role, children)).not.toHaveProperty('calls');
  }
  expect(schoolChildGradeReply(daughters[0], 'ary', year, 'parent', undefined)?.text).not.toContain('ما لقيت حتى ولد');
  expect(schoolChildGradeReply(daughters[0], 'ary', year, 'parent', [])?.text).toContain('ما لقيت حتى ولد');
});

test('a clarification can be resolved by an exact owned full name, including unknown gender', () => {
  const linked = [{ id: 'child-a', name: 'Salma Idrissi', gender: null }, { id: 'child-b', name: 'Omar Idrissi', gender: 'male' }];
  for (const query of ['وريني النقط ديال Salma Idrissi فهاد العام', 'werini nno9at dyal Salma Idrissi f had l3am']) {
    expect(schoolChildGradeReply(query, 'ary', year, 'parent', linked)?.calls?.[0].input.studentId).toBe('child-a');
    expect(schoolChildGradeReply(query, 'ary', year, 'parent', [...linked, { ...linked[0], id: 'duplicate-name' }])).not.toHaveProperty('calls');
    expect(schoolChildGradeReply(query + ' فالرياضيات', 'ary', year, 'parent', linked)).toBeNull();
    expect(schoolChildGradeReply(query, 'ary', year, 'admin', linked)).toBeNull();
  }
  expect(schoolChildGradeReply('وريني نقط بنتي Omar Idrissi', 'ary', year, 'parent', linked)).not.toHaveProperty('calls');
  for (const query of ['وريني النقط ديال Outsider Person', 'وريني النقط ديال Salma Idrissi و Omar Idrissi', 'وريني نقط ديال Salma Idrissi "غير الغياب"']) {
    expect(schoolChildGradeReply(query, 'ary', year, 'parent', linked)).toBeNull();
  }
});

test.each([daughters[0] + ' فالرياضيات', daughters[1] + ' 2025-2026', daughters[0] + ' "ياسين"',
  'وريني نقط بنتي وغيابها', 'وريني نقط بنتي وولدي', 'وريني نقط بنتي سلمى', 'وريني نقط ديال بنت الأستاذ'])('qualified child requests retain routing: %s', query => {
  expect(schoolChildGradeReply(query, 'ary', year, 'parent', children)).toBeNull();
});

test('runtime template uses trusted child context, year/write priority and web-only identity reads', () => {
  for (const query of [...lists, ...fifths, ...daughters]) {
    const request = { userText: query, channel: 'web', language: schoolReplyLanguage(query) };
    expect(request.language).toBe('ary');
    expect(schoolReplyTemplate(request, year, 'admin')).not.toBeNull();
    expect(schoolReplyTemplate(request)).toBeNull();
    expect(schoolReplyTemplate({ ...request, channel: 'whatsapp' }, year, 'admin')).toBeNull();
  }
  const query = daughters[1];
  expect(schoolReplyTemplate({ userText: query, language: 'ary', channel: 'web' }, year, 'parent', undefined, undefined, undefined, children)?.label).toBe('school:child-grades');
  expect(schoolReplyTemplate({ userText: 'بدل النقط ديال بنتي', language: 'ary', channel: 'web' }, year, 'parent', undefined, undefined, undefined, children)).not.toHaveProperty('calls');
});

test('published chat and MCP execute corrected plans, clarify unresolved identities and avoid both paid models', async () => {
  const keys = ['DB_URL', 'NODE_ENV', 'CHATBOT_BENCHMARK_CONTROLS'];
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  process.env.DB_URL = 'postgres://localhost/school_history_test'; process.env.NODE_ENV = 'test';
  process.env.CHATBOT_BENCHMARK_CONTROLS = 'true'; setBenchmarkJevMode('off');
  try {
    for (const populated of [false, true]) {
      const fixture = await createJevFixture({ identityData: populated });
      try {
        for (const role of ['admin', 'principal']) for (const selectedYear of ['2025-2026', year]) {
          for (const query of [lists[0], lists[1], fifths[0], fifths[1], daughters[0], daughters[1]]) {
            const response = await fixture.call('/chat', { messages: [{ role: 'user', parts: [{ type: 'text', text: query }] }] }, role, selectedYear);
            expect(response.status).toBe(200);
            const events = (await response.text()).split(/\r?\n/u).filter(line => line.startsWith('data: {')).map(line => JSON.parse(line.slice(6)));
            const text = events.filter(event => event.type === 'text-delta').map(event => event.delta).join('');
            const diagnostic = fixture.events.at(-1)!;
            expect(diagnostic.reply?.error, JSON.stringify({ query, role, selectedYear, populated, diagnostic })).toBeUndefined();
            expect(diagnostic.tools.map(tool => tool.name)).toEqual(lists.includes(query) ? ['classes_get_classes']
              : fifths.includes(query) ? ['classes_get_classes', 'students_get_students'] : []);
            expect(diagnostic.tools.every(tool => tool.outcome === 'executed')).toBe(true);
            if (lists.includes(query)) expect(text).toContain(populated ? `CM2 ${selectedYear}: A, B` : 'ما كاين حتى قسم');
            if (fifths.includes(query)) {
              expect(text).toContain(populated ? `CM2 ${selectedYear} فيه 2 تلميذ` : 'ما قدرتش نحدد');
              if (!populated) expect(text).not.toContain('0 تلميذ');
            }
            if (daughters.includes(query)) expect(text).toContain('شكون كتقصد');
          }
        }
        expect(fixture.counts()).toEqual({ decisions: 0, generations: 0 });
        expect(fixture.routingCalls()).toBe(0);
      } finally { await fixture.server.stop(); }
    }
  } finally {
    for (const key of keys) if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key];
    setBenchmarkJevMode('off');
  }
});

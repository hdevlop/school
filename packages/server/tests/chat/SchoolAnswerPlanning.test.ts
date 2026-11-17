import { expect, test } from 'bun:test';
import { withoutLeakedPlanning } from '../../src/modules/chat/transport/schoolAnswerPlanning';

// The three leaks seen in 180 real chat answers on 2026-11-16, shortened.
test.each([
  ['We need to answer in Darija. Provide grades list.**نتائج CHAABI ABDELHAMID**', '**نتائج CHAABI ABDELHAMID**'],
  ['We need grades for assessment VduvW. Maybe need section? Probably error. We can explain cannot retrieve.Je suis désolé, mais je n’ai pas pu récupérer les résultats.',
    'Je suis désolé, mais je n’ai pas pu récupérer les résultats.'],
  ['Let me check. The tool returned it.Le bulletin de TAHIR JAD : 16/20.', 'Le bulletin de TAHIR JAD : 16/20.'],
])('planning before the answer is cut: %s', (answer, kept) => {
  expect(withoutLeakedPlanning(answer)).toEqual({ text: kept });
});

test('planning with no answer after it is planning only', () => {
  expect(withoutLeakedPlanning('We need grades for student JAD TAHER in section 2AC A. Need student identity. Use students_get_students search? We don\'t have name.'))
    .toEqual({ planningOnly: true });
  expect(withoutLeakedPlanning('We need search.We can\'t find the student.')).toEqual({ planningOnly: true });
});

test.each([
  'المعدل العام ديال المؤسسة هو 10.',
  '**Notes de la classe CM1 A** - Moyenne générale : 8.19/10.',
  'We have 465 students and 18 teachers.',
  'We need more details: which class do you mean?',
  'Les notes: 9.5/10, 8.25/10.',
])('an ordinary answer is untouched: %s', (answer) => {
  expect(withoutLeakedPlanning(answer)).toEqual({ text: answer });
});

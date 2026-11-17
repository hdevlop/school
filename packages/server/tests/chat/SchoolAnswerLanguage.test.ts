import { expect, test } from 'bun:test';
import { answerLanguageInstruction, schoolAnswerLanguage } from '../../src/modules/chat/replies/schoolAnswerLanguage';

test.each([
  ['les notes de la classe 4AC B', 'fr'],
  ['la moyenne de Mathématiques en CE2 A', 'fr'],
  ['show the marks of class 1AC C please', 'en'],
  ['what is the average in 3AC A', 'en'],
  ['muestra las notas de la clase CM1 B', 'es'],
  ['ما هو معدل قسم 3AC A', 'ar'],
  ['أريد درجات التلميذة سارة', 'ar'],
  ['شحال المعدل ديال 3AC A', 'ary'],
  ['عطيني النقط ديال سارة فالرياضيات', 'ary'],
  ['werini nno9at dyal 4AC B', 'ary'],
  ['bghit les notes de 5AP A', 'ary'],
  ['chno 3ndo f lfrançais', 'ary'],
])('%s is answered in %s', (query, language) => {
  expect(schoolAnswerLanguage(query)).toBe(language);
});

test('a class code is not Arabizi: "les notes du 2AC C" stays French', () => {
  expect(schoolAnswerLanguage('les notes du 2AC C')).toBe('fr');
  expect(schoolAnswerLanguage('marks of 6AP B and CE1 A')).toBe('en');
});

test('the instruction names the language; nothing is said when it is unclear', () => {
  expect(answerLanguageInstruction('les notes de la classe 4AC B')).toContain('in French');
  expect(answerLanguageInstruction('werini nno9at dyal 4AC B')).toContain('Moroccan Darija written in Arabic script');
  expect(answerLanguageInstruction('2AC B')).toBeNull();
});

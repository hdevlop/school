import { expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nProvider } from 'najm-i18n/react';
import { translations } from '@sms/contracts/locales';
import StudentCard from '@/features/Students/components/StudentCard';

const student = { name: 'Yasmine Alaoui', gender: 'F', class: { name: 'CE1' }, section: { name: 'A' } };
const render = (data: Record<string, unknown>, language = 'en') => renderToStaticMarkup(
  <I18nProvider translations={translations} initialLanguage={language}>
    <StudentCard data={{ ...student, ...data }} />
  </I18nProvider>,
);

test.each(['en', 'ar'])('student cards show supplied Massar code and Arabic name with explicit text directions (%s)', language => {
  const markup = render({ studentCode: 'F257114351', arabicName: 'ياسمين العلوي' }, language);
  expect(markup).toContain('Yasmine Alaoui');
  expect(markup).toContain('F257114351');
  expect(markup).toContain('ياسمين العلوي');
  expect(markup).toContain('lang="ar" dir="rtl"');
  expect(markup).toContain('<bdi dir="ltr"');
  expect(markup).toContain(translations[language].students.card.massarCode);
});

test.each([undefined, null, '', '   '])('student cards hide absent optional details (%j)', value => {
  const markup = render({ studentCode: value, arabicName: value });
  expect(markup).not.toContain('Massar code');
  expect(markup).not.toContain('lang="ar"');
  expect(markup).toContain('Yasmine Alaoui');
});

import { expect, it } from 'bun:test';
import { translate } from 'najm-i18n';
import { translations } from '@sms/contracts/locales';
import { translateIssueMessage } from '../../src/config/validationMessages';
import { massarMarkDto } from '../../src/modules/massar/MassarDto';
it('shows the blocked class and missing-student count in every language', () => {
  for (const language of ['en','fr','ar','es'] as const) {
    const message = translate(translations, language, 'massar.blockedClass', { name: '1APG-2', count: 3 });
    expect(message).toContain('1APG-2'); expect(message).toContain('3'); expect(message).not.toContain('{');
  }
});
it('translates the mark/absence refusal through School validation in all four languages', () => {
  const result = massarMarkDto.safeParse({ studentId: 'synthetic-student', componentCode: '1001', mark: 0, absence: 'justified' });
  expect(result.success).toBe(false); if (result.success) return;
  for (const language of ['en','fr','ar','es'] as const) {
    const message = translateIssueMessage(result.error.issues[0] as never, language, (key, params) => translate(translations, language, key, params as never));
    expect(message).toBe(translations[language].massar.errors.invalidMark);
    expect(message).not.toContain('massar.errors');
  }
});
it('has every Massar refusal and status in every language', () => {
  const english = translations.en.massar;
  for (const language of ['fr','ar','es'] as const) for (const section of ['errors','sheetStatus','roundStatus','success','change'] as const) {
    const other = translations[language].massar[section];
    for (const key of Object.keys(english[section])) expect(typeof (other as Record<string, string>)[key], `${language}: ${section}.${key}`).toBe('string');
  }
});

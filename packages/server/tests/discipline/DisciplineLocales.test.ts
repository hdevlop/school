import { describe, expect, it } from 'bun:test';

const locales = ['en', 'fr', 'ar', 'es'] as const;
const expected = {
  categories: [
    'classroom_disruption', 'disrespect', 'bullying', 'fighting', 'cheating',
    'vandalism', 'uniform_violation', 'device_misuse', 'prohibited_item', 'other',
  ],
  severity: ['low', 'medium', 'high', 'critical'],
  status: ['open', 'resolved'],
  actions: [
    'verbal_warning', 'written_warning', 'detention', 'counseling',
    'parent_meeting', 'suspension', 'other',
  ],
} as const;

describe('Discipline translations', () => {
  for (const locale of locales) {
    it(`contains the complete ${locale} discipline contract`, async () => {
      const translations = JSON.parse(await Bun.file(
        new URL(`../../src/locales/${locale}.json`, import.meta.url),
      ).text());

      expect(translations.navigation.discipline).toBeTruthy();
      expect(translations.navigation.studentConduct).toBeTruthy();
      expect(translations.discipline.table).toBeTruthy();
      expect(translations.discipline.filters).toBeTruthy();
      expect(translations.discipline.form).toBeTruthy();
      expect(translations.discipline.dialogs).toBeTruthy();
      expect(translations.discipline.success).toBeTruthy();
      expect(translations.discipline.errors).toBeTruthy();
      expect(translations.confirm.discipline).toBeTruthy();

      for (const [group, keys] of Object.entries(expected)) {
        for (const key of keys) {
          expect(translations.discipline[group][key]).toBeTruthy();
        }
      }
    });
  }
});

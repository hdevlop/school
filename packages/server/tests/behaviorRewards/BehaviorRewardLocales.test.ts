import { describe, expect, it } from 'bun:test';

const locales = ['en', 'fr', 'ar', 'es'] as const;
const expected = {
  categories: [
    'academic_effort', 'improvement', 'respect', 'helpfulness', 'leadership',
    'teamwork', 'responsibility', 'community_service', 'excellent_attendance', 'other',
  ],
  recognitionLevels: ['appreciation', 'achievement', 'excellence'],
  rewardTypes: [
    'verbal_praise', 'written_praise', 'merit', 'badge',
    'certificate', 'privilege', 'prize', 'other',
  ],
} as const;

describe('Behavior reward translations', () => {
  for (const locale of locales) {
    it(`contains the complete ${locale} behavior reward contract`, async () => {
      const translations = JSON.parse(await Bun.file(
        new URL(`../../src/locales/${locale}.json`, import.meta.url),
      ).text());

      expect(translations.navigation.studentConduct).toBeTruthy();
      expect(translations.navigation.behaviorRewards).toBeTruthy();
      expect(translations.behaviorRewards.table).toBeTruthy();
      expect(translations.behaviorRewards.filters).toBeTruthy();
      expect(translations.behaviorRewards.form).toBeTruthy();
      expect(translations.behaviorRewards.dialogs).toBeTruthy();
      expect(translations.behaviorRewards.success).toBeTruthy();
      expect(translations.behaviorRewards.errors).toBeTruthy();
      expect(translations.confirm.behaviorRewards).toBeTruthy();

      for (const [group, keys] of Object.entries(expected)) {
        for (const key of keys) {
          const translated = translations.behaviorRewards[group][key];
          expect(translated).toBeTruthy();
          expect(translated).not.toBe(key);
        }
      }
    });
  }
});

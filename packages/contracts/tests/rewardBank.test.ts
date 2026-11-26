import { describe, expect, it } from 'bun:test';
import { BEHAVIOR_REWARD_CATEGORY_VALUES, BEHAVIOR_REWARD_TYPE_VALUES } from '../src/enums';
import { REWARD_BANK, REWARD_BANK_LANGUAGES, REWARD_TYPE_POINTS, rewardBankFor } from '../src/rewardBank';

describe("School's built-in reward bank", () => {
  it('describes every category eight ways, each written in every language', () => {
    for (const category of BEHAVIOR_REWARD_CATEGORY_VALUES) {
      expect(REWARD_BANK.filter(entry => entry.category === category), category).toHaveLength(8);
    }
    expect(REWARD_BANK.every(entry => (BEHAVIOR_REWARD_CATEGORY_VALUES as readonly string[]).includes(entry.category))).toBe(true);
    for (const entry of REWARD_BANK) for (const language of REWARD_BANK_LANGUAGES) {
      expect(entry.title[language]?.trim(), `${entry.id} ${language}`).toBeTruthy();
      expect(entry.description[language]?.trim().length, `${entry.id} ${language}`).toBeGreaterThan(20);
      // A description fits the reward form's field.
      expect(entry.description[language].length, `${entry.id} ${language}`).toBeLessThanOrEqual(200);
    }
    expect(new Set(REWARD_BANK.map(entry => entry.id)).size).toBe(REWARD_BANK.length);
  });

  it('gives every reward type its points, a praise less than a prize', () => {
    for (const type of BEHAVIOR_REWARD_TYPE_VALUES) expect(REWARD_TYPE_POINTS[type], type).toBeGreaterThan(0);
    expect(REWARD_TYPE_POINTS.verbal_praise).toBeLessThan(REWARD_TYPE_POINTS.certificate);
    expect(REWARD_TYPE_POINTS.certificate).toBeLessThan(REWARD_TYPE_POINTS.prize);
  });

  it('offers a category in the interface language, with the reward type points, and French otherwise', () => {
    const arabic = rewardBankFor('academic_effort', 'certificate', 'ar');
    expect(arabic).toHaveLength(8);
    expect(arabic[0]).toMatchObject({ id: 'bank:academic_effort.1', category: 'academic_effort', rewardType: 'certificate', points: REWARD_TYPE_POINTS.certificate, active: true });
    expect(arabic[0].description).toMatch(/[؀-ۿ]/);
    expect(rewardBankFor('academic_effort', 'certificate', 'de')[0].description).toBe(REWARD_BANK[0].description.fr);
    expect(rewardBankFor('', 'certificate', 'fr')).toEqual([]);
    expect(rewardBankFor('academic_effort', null, 'fr')).toEqual([]);
  });
});

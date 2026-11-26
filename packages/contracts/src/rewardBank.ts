import data from './data/rewardBank.json';
import type { BehaviorRewardCategory, BehaviorRewardType } from './enums';

/** The languages the built-in bank is written in, as the interface names them. */
export const REWARD_BANK_LANGUAGES = ['fr', 'ar', 'en', 'es'] as const;
export type RewardBankLanguage = (typeof REWARD_BANK_LANGUAGES)[number];

type Written = Record<RewardBankLanguage, string>;
/** One built-in reward: what the student did, named and described in every language. */
export type RewardBankEntry = { id: string; category: BehaviorRewardCategory; title: Written; description: Written };

/**
 * School's built-in reward bank: for every category, eight ways to describe
 * what a student did, in French, Arabic, English and Spanish, written as
 * phrases that suit any student ("Efforts réguliers et belle motivation…").
 * The reward form's "generate" offers them after the school's own bank, so it
 * works on a new school with an empty bank. The reward type sets the points.
 */
export const REWARD_BANK: readonly RewardBankEntry[] = data.entries as RewardBankEntry[];

/** The points a reward type gives by default: a verbal praise is small, a prize large. */
export const REWARD_TYPE_POINTS: Readonly<Record<BehaviorRewardType, number>> = data.points as Record<BehaviorRewardType, number>;

const languageOf = (language: string | null | undefined): RewardBankLanguage =>
  (REWARD_BANK_LANGUAGES as readonly string[]).includes(language ?? '') ? language as RewardBankLanguage : 'fr';

/**
 * The built-in rewards for a category and reward type, in the interface
 * language (French when it has none), shaped like a bank template: each
 * gives the reward type's points. None until a category and type are chosen.
 */
export function rewardBankFor(category: string | null | undefined, rewardType: string | null | undefined, language: string | null | undefined) {
  const points = REWARD_TYPE_POINTS[rewardType as BehaviorRewardType];
  if (!category || points === undefined) return [];
  const lang = languageOf(language);
  return REWARD_BANK.filter(entry => entry.category === category).map(entry => ({
    id: `bank:${entry.id}`,
    title: entry.title[lang],
    category: entry.category,
    rewardType: rewardType as BehaviorRewardType,
    points,
    description: entry.description[lang],
    active: true,
  }));
}

import type { BehaviorRewardCategory, BehaviorRewardType } from '@sms/contracts';

export type RewardTemplate = {
  id: string;
  title: string;
  category: BehaviorRewardCategory;
  rewardType: BehaviorRewardType;
  points: number;
  description?: string | null;
  active: boolean;
};

/**
 * The templates the reward form offers for the chosen category and reward
 * type: active ones only, in title order. An archived template stays in the
 * bank but is no longer suggested.
 */
export const templatesFor = <Template extends RewardTemplate>(
  templates: readonly Template[] | null | undefined,
  category: string | null | undefined,
  rewardType: string | null | undefined,
): Template[] => (templates ?? [])
  .filter((template) => template.active && template.category === category && template.rewardType === rewardType)
  .sort((a, b) => a.title.localeCompare(b.title));

/**
 * What "generate" cycles through: the school's own bank for the category and
 * reward type first, then School's built-in rewards (`rewardBankFor` from
 * `@sms/contracts/reward-bank`), so it works with an empty bank. A built-in
 * text the school already copied into its bank is offered once.
 */
export const generateCandidates = <Template extends RewardTemplate>(
  schoolTemplates: readonly Template[] | null | undefined,
  builtIn: readonly RewardTemplate[],
  category: string | null | undefined,
  rewardType: string | null | undefined,
): RewardTemplate[] => {
  const own = templatesFor(schoolTemplates, category, rewardType);
  const written = new Set(own.map((template) => (template.description ?? '').trim()));
  return [...own, ...builtIn.filter((template) => !written.has((template.description ?? '').trim()))];
};

/**
 * The template a click on "generate" fills next: the one after the last one
 * filled, else after the one whose wording is already in the description,
 * else the first. It wraps, so clicking again keeps cycling through them.
 */
export const nextTemplate = <Template extends RewardTemplate>(
  matches: readonly Template[],
  lastId: string | null,
  currentDescription?: string | null,
): Template | undefined => {
  if (matches.length === 0) return undefined;
  let index = lastId ? matches.findIndex((template) => template.id === lastId) : -1;
  if (index < 0 && currentDescription?.trim()) {
    index = matches.findIndex((template) => (template.description ?? '').trim() === currentDescription.trim());
  }
  return matches[(index + 1) % matches.length];
};

/** The values a template writes into the reward form. */
export const templateFormValues = (template: Pick<RewardTemplate, 'points' | 'description'>) => ({
  points: Number(template.points || 0),
  description: template.description ?? '',
});

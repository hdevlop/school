import {
  BEHAVIOR_REWARD_CATEGORY_VALUES,
  BEHAVIOR_REWARD_CERTIFICATE_PLACE_VALUES,
  BEHAVIOR_REWARD_TYPE_VALUES,
} from '@sms/contracts';
import type {
  BehaviorRewardCategory,
  BehaviorRewardCertificatePlace,
  BehaviorRewardType,
} from '@sms/contracts';

type Translate = (key: string, ...args: any[]) => string;

type EnumOption<Value extends string = string> = {
  readonly value: Value;
  readonly label: string;
};

const optionsFromValues = <Value extends string>(
  values: readonly Value[],
  t: Translate,
  translationPrefix: string,
): readonly EnumOption<Value>[] =>
  values.map((value) => ({ value, label: t(`${translationPrefix}.${value}`) }));

/**
 * The two selects on the reward form, and the two matching table filters.
 *
 * Both used to build the same `.map(value => ({ value, label: t(...) }))` by
 * hand, which is how a filter list drifts from the form that writes it. One
 * builder each, used by both.
 */

export const BEHAVIOR_REWARD_CATEGORY_TRANSLATION_PREFIX = 'behaviorRewards.categories';
export const BEHAVIOR_REWARD_TYPE_TRANSLATION_PREFIX = 'behaviorRewards.rewardTypes';

export const buildBehaviorRewardCategoryOptions = (
  t: Translate,
): readonly EnumOption<BehaviorRewardCategory>[] =>
  optionsFromValues(
    BEHAVIOR_REWARD_CATEGORY_VALUES,
    t,
    BEHAVIOR_REWARD_CATEGORY_TRANSLATION_PREFIX,
  );

export const buildBehaviorRewardTypeOptions = (
  t: Translate,
): readonly EnumOption<BehaviorRewardType>[] =>
  optionsFromValues(BEHAVIOR_REWARD_TYPE_VALUES, t, BEHAVIOR_REWARD_TYPE_TRANSLATION_PREFIX);

/** The place a certificate reward prints with, shown only when the reward type is `certificate`. */
export const buildBehaviorRewardCertificatePlaceOptions = (
  t: Translate,
): readonly EnumOption<BehaviorRewardCertificatePlace>[] =>
  optionsFromValues(BEHAVIOR_REWARD_CERTIFICATE_PLACE_VALUES, t, 'behaviorRewards.certificates');

/** "No subject": a reward for a behavior outside a lesson, in the form and the subject filter. */
export const NO_REWARD_SUBJECT = '__none__';

type RewardSubject = { id: string; name: string; code?: string | null };

/**
 * The form's subjects, "none" first: then those the teacher teaches the pupil,
 * then every other one, so a teacher finds theirs at the top without being
 * barred from the rest. `taught` is null for a role that teaches no class.
 */
export function buildRewardSubjectOptions(subjects: readonly RewardSubject[], taught: ReadonlySet<string> | null, t: Translate) {
  const rank = (subject: RewardSubject) => (taught?.has(subject.id) ? 0 : 1);
  return [
    { value: NO_REWARD_SUBJECT, label: t('behaviorRewards.form.subjectPlaceholder') },
    ...[...subjects]
      .sort((left, right) => rank(left) - rank(right))
      .map((subject) => ({ value: subject.id, label: subject.code ? `${subject.name} (${subject.code})` : subject.name })),
  ];
}

type RewardWithSubject = { subject?: { id?: string | null; name?: string | null } | null };

/** What the subject filter matches a reward on: its subject, or "none". */
export const rewardSubjectValue = (reward: RewardWithSubject) => reward.subject?.id || NO_REWARD_SUBJECT;

/**
 * The subject filter offers the subjects the list's rewards name, by name, and
 * "no subject" last when some name none: a reward given before subjects were
 * recorded is found there.
 */
export function buildRewardSubjectFilterOptions(rewards: readonly RewardWithSubject[], t: Translate, language?: string) {
  const names = new Map<string, string>();
  let hasNone = false;
  for (const reward of rewards) {
    if (reward.subject?.id) names.set(reward.subject.id, reward.subject.name || reward.subject.id);
    else hasNone = true;
  }
  return [
    ...Array.from(names, ([value, label]) => ({ value, label })).sort((left, right) => left.label.localeCompare(right.label, language)),
    ...(hasNone ? [{ value: NO_REWARD_SUBJECT, label: t('behaviorRewards.filters.noSubject') }] : []),
  ];
}

import {
  BEHAVIOR_RECOGNITION_LEVEL_VALUES,
  BEHAVIOR_REWARD_CATEGORY_VALUES,
  BEHAVIOR_REWARD_TYPE_VALUES,
} from '@sms/contracts';
import type {
  BehaviorRecognitionLevel,
  BehaviorRewardCategory,
  BehaviorRewardType,
} from '@sms/contracts';

import { optionsFromValues, type EnumOption, type Translate } from '@/shared/forms/enumOptions';

/**
 * The three selects on the reward form, and the three matching table filters.
 *
 * Both used to build the same `.map(value => ({ value, label: t(...) }))` by
 * hand, which is how a filter list drifts from the form that writes it. One
 * builder each, used by both.
 */

export const BEHAVIOR_REWARD_CATEGORY_TRANSLATION_PREFIX = 'behaviorRewards.categories';
export const BEHAVIOR_RECOGNITION_LEVEL_TRANSLATION_PREFIX = 'behaviorRewards.recognitionLevels';
export const BEHAVIOR_REWARD_TYPE_TRANSLATION_PREFIX = 'behaviorRewards.rewardTypes';

export const buildBehaviorRewardCategoryOptions = (
  t: Translate,
): readonly EnumOption<BehaviorRewardCategory>[] =>
  optionsFromValues(
    BEHAVIOR_REWARD_CATEGORY_VALUES,
    t,
    BEHAVIOR_REWARD_CATEGORY_TRANSLATION_PREFIX,
  );

export const buildBehaviorRecognitionLevelOptions = (
  t: Translate,
): readonly EnumOption<BehaviorRecognitionLevel>[] =>
  optionsFromValues(
    BEHAVIOR_RECOGNITION_LEVEL_VALUES,
    t,
    BEHAVIOR_RECOGNITION_LEVEL_TRANSLATION_PREFIX,
  );

export const buildBehaviorRewardTypeOptions = (
  t: Translate,
): readonly EnumOption<BehaviorRewardType>[] =>
  optionsFromValues(BEHAVIOR_REWARD_TYPE_VALUES, t, BEHAVIOR_REWARD_TYPE_TRANSLATION_PREFIX);

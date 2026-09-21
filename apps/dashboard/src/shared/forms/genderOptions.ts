import { GENDER_VALUES } from '@sms/contracts';
import type { Gender } from '@sms/contracts';

import { optionsFromValues, type EnumOption, type Translate } from '@/shared/forms/enumOptions';

/**
 * Male or female, labelled from `common.gender`.
 *
 * Four features ask the same question of four different people — a student, a
 * parent, a teacher, a driver — and there is nothing feature-specific about
 * the answer. Rather than four identical builders, or a `Students` module that
 * `Drivers` has to import from, this one lives in the shared escape hatch.
 *
 * Note the Drivers form previously built its own list from `common.male` and
 * `common.female`, which are separate catalog entries holding the same words.
 * It now reads `common.gender.M` / `common.gender.F` like everywhere else, so
 * a translator changing one label changes it everywhere it is shown.
 */
export const GENDER_TRANSLATION_PREFIX = 'common.gender';

export const buildGenderOptions = (t: Translate): readonly EnumOption<Gender>[] =>
  optionsFromValues(GENDER_VALUES, t, GENDER_TRANSLATION_PREFIX);

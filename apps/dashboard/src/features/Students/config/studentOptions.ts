import { GENDER_VALUES } from '@sms/contracts';
import type { Gender } from '@sms/contracts';

type Translate = (key: string, ...args: any[]) => string;

type EnumOption<Value extends string = string> = {
  readonly value: Value;
  readonly label: string;
};

export const GENDER_TRANSLATION_PREFIX = 'common.gender';

export const buildGenderOptions = (t: Translate): readonly EnumOption<Gender>[] =>
  GENDER_VALUES.map((value) => ({
    value,
    label: t(`${GENDER_TRANSLATION_PREFIX}.${value}`),
  }));

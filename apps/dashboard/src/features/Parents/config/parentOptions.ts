import { MARITAL_STATUS_VALUES, RELATIONSHIP_TYPE_VALUES } from '@sms/contracts';
import type { MaritalStatus, RelationshipType } from '@sms/contracts';

import {
  optionsFromValues,
  withStoredValue,
  type EnumOption,
  type Translate,
} from '@/shared/forms/enumOptions';

/**
 * The selects on the parent form.
 *
 * Parent records are long-lived and often imported, so the edit variants below
 * take the value already on the record and keep it selectable even if it is no
 * longer offered. Opening an old record must not quietly rewrite it: the user
 * sees what is stored and replaces it deliberately, or leaves it alone.
 */

export const RELATIONSHIP_TYPE_TRANSLATION_PREFIX = 'parents.relationships';
export const MARITAL_STATUS_TRANSLATION_PREFIX = 'parents.maritalStatus';

export const buildRelationshipTypeOptions = (
  t: Translate,
): readonly EnumOption<RelationshipType>[] =>
  optionsFromValues(RELATIONSHIP_TYPE_VALUES, t, RELATIONSHIP_TYPE_TRANSLATION_PREFIX);

export const buildMaritalStatusOptions = (t: Translate): readonly EnumOption<MaritalStatus>[] =>
  optionsFromValues(MARITAL_STATUS_VALUES, t, MARITAL_STATUS_TRANSLATION_PREFIX);

/**
 * The same lists, plus whatever the record being edited actually holds.
 *
 * An unrecognised stored value is labelled through the same translation prefix
 * — it renders as the raw key if nothing matches, which is honest: the user
 * can see something unexpected is there instead of finding the field
 * mysteriously blank.
 */
export const buildRelationshipTypeOptionsFor = (
  t: Translate,
  storedValue?: string | null,
): readonly EnumOption<RelationshipType>[] =>
  withStoredValue(buildRelationshipTypeOptions(t), storedValue, (value) =>
    t(`${RELATIONSHIP_TYPE_TRANSLATION_PREFIX}.${value}`),
  );

export const buildMaritalStatusOptionsFor = (
  t: Translate,
  storedValue?: string | null,
): readonly EnumOption<MaritalStatus>[] =>
  withStoredValue(buildMaritalStatusOptions(t), storedValue, (value) =>
    t(`${MARITAL_STATUS_TRANSLATION_PREFIX}.${value}`),
  );

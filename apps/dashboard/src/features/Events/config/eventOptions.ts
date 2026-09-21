import { EVENT_STATUS_VALUES, EVENT_TYPE_VALUES, EVENT_VISIBILITY_VALUES } from '@sms/contracts';
import type { EventStatus, EventType, EventVisibility } from '@sms/contracts';

import { optionsFromValues, type EnumOption, type Translate } from '@/shared/forms/enumOptions';

/**
 * The three selects on the event form.
 *
 * These used to carry hardcoded English label maps, inherited from
 * `EventForm.tsx`, which won over `t()` and pinned all three selects to English
 * whatever language the user had chosen. Every one of those strings was already
 * in the English catalog verbatim, so removing them changed nothing for an
 * English reader and gave French, Arabic and Spanish the labels they had all
 * along.
 */

export const EVENT_TYPE_TRANSLATION_PREFIX = 'events.type';
export const EVENT_STATUS_TRANSLATION_PREFIX = 'events.status';
export const EVENT_VISIBILITY_TRANSLATION_PREFIX = 'events.visibility';

export const buildEventTypeOptions = (t: Translate): readonly EnumOption<EventType>[] =>
  optionsFromValues(EVENT_TYPE_VALUES, t, EVENT_TYPE_TRANSLATION_PREFIX);

export const buildEventStatusOptions = (t: Translate): readonly EnumOption<EventStatus>[] =>
  optionsFromValues(EVENT_STATUS_VALUES, t, EVENT_STATUS_TRANSLATION_PREFIX);

export const buildEventVisibilityOptions = (t: Translate): readonly EnumOption<EventVisibility>[] =>
  optionsFromValues(EVENT_VISIBILITY_VALUES, t, EVENT_VISIBILITY_TRANSLATION_PREFIX);

import { FEE_STATUS_VALUES, SCHEDULE_VALUES } from '@sms/contracts';
import type { FeeStatus, Schedule } from '@sms/contracts';

import { optionsFromValues, type EnumOption, type Translate } from '@/shared/forms/enumOptions';

/** The selects on the fee forms. */

export const SCHEDULE_TRANSLATION_PREFIX = 'fees.schedule';
export const FEE_STATUS_TRANSLATION_PREFIX = 'fees.status';

/** How often the fee is charged. Bound, sent, and honoured by the API. */
export const buildScheduleOptions = (t: Translate): readonly EnumOption<Schedule>[] =>
  optionsFromValues(SCHEDULE_VALUES, t, SCHEDULE_TRANSLATION_PREFIX);

/**
 * Fee status — shown, never sent.
 *
 * The edit dialog renders this select, but `feeSchema` has no `status` field,
 * so whatever is chosen is stripped before the request is built. That is on
 * purpose: status is derived by the server from the installments and the
 * payments allocated against them, and a fee marked "paid" from the browser
 * would simply be recalculated back.
 *
 * The list is built from the contract anyway, so it cannot show a state the
 * server would never produce.
 */
export const buildFeeStatusOptions = (t: Translate): readonly EnumOption<FeeStatus>[] =>
  optionsFromValues(FEE_STATUS_VALUES, t, FEE_STATUS_TRANSLATION_PREFIX);

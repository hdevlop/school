import { FEE_STATUS_VALUES, SCHEDULE_VALUES } from '@sms/contracts';
import type { FeeStatus, Schedule } from '@sms/contracts';

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

/** The selects on the fee forms. */

export const SCHEDULE_TRANSLATION_PREFIX = 'fees.schedule';
export const FEE_STATUS_TRANSLATION_PREFIX = 'fees.status';

/** How often the fee is charged. Bound, sent, and honoured by the API. */
export const buildScheduleOptions = (t: Translate): readonly EnumOption<Schedule>[] =>
  optionsFromValues(SCHEDULE_VALUES, t, SCHEDULE_TRANSLATION_PREFIX);

/** Annually in the roster means all tuition for the viewed year is paid. */
export const getFeeListFrequencyFilter = (frequency?: Schedule): {
  schedule?: Schedule;
  tuitionPayment?: 'paidInFull';
} => frequency === 'annually' ? { tuitionPayment: 'paidInFull' } : frequency ? { schedule: frequency } : {};

export const buildFeeListFrequencyOptions = (t: Translate): readonly EnumOption<Schedule>[] =>
  buildScheduleOptions(t).filter(option => option.value !== 'oneTime').map(option =>
    option.value === 'annually' ? { ...option, label: t('fees.filters.fullTuitionPaid') } : option);

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

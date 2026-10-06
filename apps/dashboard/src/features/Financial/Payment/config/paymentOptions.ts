import { PAYMENT_METHOD_VALUES } from '@sms/contracts';
import type { PaymentMethod, PaymentStatus } from '@sms/contracts';

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

const withStoredValue = <Value extends string>(
  options: readonly EnumOption<Value>[],
  storedValue: string | null | undefined,
  label: (value: string) => string,
): readonly EnumOption<Value>[] => {
  if (!storedValue || options.some((option) => option.value === storedValue)) return options;
  return [...options, { value: storedValue as Value, label: label(storedValue) }];
};

/**
 * How money arrives, and what state a payment is in.
 *
 * Payment owns both lists. Expenses imports the method builder from here
 * rather than keeping its own copy — a school pays a supplier the same ways a
 * parent pays a fee, and two lists would drift.
 */

export const PAYMENT_METHOD_TRANSLATION_PREFIX = 'payments.methods';
export const PAYMENT_STATUS_TRANSLATION_PREFIX = 'payments.status';

export const buildPaymentMethodOptions = (t: Translate): readonly EnumOption<PaymentMethod>[] =>
  optionsFromValues(PAYMENT_METHOD_VALUES, t, PAYMENT_METHOD_TRANSLATION_PREFIX);

/** Keeps a method a stored payment already used selectable when editing it. */
export const buildPaymentMethodOptionsFor = (
  t: Translate,
  storedValue?: string | null,
): readonly EnumOption<PaymentMethod>[] =>
  withStoredValue(buildPaymentMethodOptions(t), storedValue, (value) =>
    t(`${PAYMENT_METHOD_TRANSLATION_PREFIX}.${value}`),
  );

/**
 * The methods the cashier's Record Payment dialog offers.
 *
 * A subset of `PAYMENT_METHOD_VALUES`: the four that dialog offered before
 * its labels were translated, kept as they were. `debitCard`, `online` and
 * `mobilePayment` stay accepted by the API and selectable when a stored
 * payment is corrected; offering them at the desk is a product decision, not
 * a translation one. `paymentOptions.test.ts` pins the list.
 */
export const DESK_PAYMENT_METHOD_VALUES = [
  'cash',
  'check',
  'bankTransfer',
  'creditCard',
] as const satisfies readonly PaymentMethod[];

export const buildDeskPaymentMethodOptions = (t: Translate): readonly EnumOption<PaymentMethod>[] =>
  optionsFromValues(DESK_PAYMENT_METHOD_VALUES, t, PAYMENT_METHOD_TRANSLATION_PREFIX);

/**
 * The payment states a user may filter the table by.
 *
 * A deliberate subset of `PAYMENT_STATUS_VALUES`, where the API accepts more
 * than the UI offers (as the desk payment methods above):
 *
 * - `deposited`, `bounced` and `voided` are steps the server moves a check
 *   payment through. No form writes them, and they have no `payments.status.*`
 *   entries in any of the four catalogs, so offering them would list raw keys.
 * - Nothing is hidden by this. The payments table renders each row's status
 *   with `NBadge`, which resolves every server state from the shared catalog,
 *   so a bounced payment still reads as bounced — it just is not a filter.
 *
 * Widening this list means adding the translations first. `paymentOptions.test.ts`
 * holds the subset to exactly these four so that stays a decision.
 */
export const FILTERABLE_PAYMENT_STATUS_VALUES = [
  'completed',
  'pending',
  'failed',
  'refunded',
] as const satisfies readonly PaymentStatus[];

export const buildPaymentStatusFilterOptions = (
  t: Translate,
): readonly EnumOption<PaymentStatus>[] =>
  optionsFromValues(
    FILTERABLE_PAYMENT_STATUS_VALUES,
    t,
    PAYMENT_STATUS_TRANSLATION_PREFIX,
  );

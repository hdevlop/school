import { EXPENSE_CATEGORY_VALUES, EXPENSE_STATUS_VALUES } from '@sms/contracts';
import type { ExpenseCategory, ExpenseStatus } from '@sms/contracts';

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
 * The selects on the expense form.
 *
 * The payment-method select is not here: it is built by
 * `@/features/Financial/Payment/config/paymentOptions`, which owns that list
 * for the whole Financial area.
 */

export const EXPENSE_CATEGORY_TRANSLATION_PREFIX = 'expenses.categories';
export const EXPENSE_STATUS_TRANSLATION_PREFIX = 'expenses.status';

/**
 * Categories a user may file an expense under.
 *
 * Payroll is not among them, and does not need excluding: salary spend is
 * created by the payroll run, and the `expense_category` column has no
 * `salary` member at all. The form used to pass `filter: v => v !== 'salary'`
 * to the old global hook — a guard against a value the API has never accepted,
 * kept alive because the frontend list was a separate copy. With the list
 * derived from the contract there is nothing to filter.
 */
export const buildExpenseCategoryOptions = (t: Translate): readonly EnumOption<ExpenseCategory>[] =>
  optionsFromValues(EXPENSE_CATEGORY_VALUES, t, EXPENSE_CATEGORY_TRANSLATION_PREFIX);

export const buildExpenseStatusOptions = (t: Translate): readonly EnumOption<ExpenseStatus>[] =>
  optionsFromValues(EXPENSE_STATUS_VALUES, t, EXPENSE_STATUS_TRANSLATION_PREFIX);

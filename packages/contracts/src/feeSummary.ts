export type FeePaymentDateFilters = { dateFrom?: string; dateTo?: string };

/** Selected fee year's collections and overdue balances, in major currency units. */
export type FeeSummary = {
  collected: string;
  cash: string;
  check: string;
  bankTransfer: string;
  bankDeposit: string;
  tpe: string;
  overdue: string;
};

type Amount = number | string | null;

type FeeCardTotals = {
  netAmount?: Amount;
  totalPaid?: Amount;
  collectedToDate?: Amount;
  totalDue?: Amount;
  overdueAmount?: Amount;
  totalFees?: Amount;
};

/** Keep collected payments, overdue debt, and the billed total distinct. */
export function getFeeCardSummary(data: FeeCardTotals = {}) {
  const netAmount = Number(data.netAmount ?? 0);
  const paidAmount = Number(data.collectedToDate ?? data.totalPaid ?? 0);
  const overdueAmount = Number(data.overdueAmount ?? 0);
  const hasFees = Number(data.totalFees ?? 0) > 0;
  const hasOverdue = hasFees && overdueAmount > 0;
  const isPaid = hasFees && !hasOverdue && Number(data.totalDue ?? 0) <= 0 && paidAmount >= netAmount;

  return {
    hasFees,
    hasOverdue,
    isPaid,
    paidAmount,
    overdueAmount,
    netAmount,
    progress: netAmount > 0 ? Math.min((paidAmount / netAmount) * 100, 100) : isPaid ? 100 : 0,
  };
}

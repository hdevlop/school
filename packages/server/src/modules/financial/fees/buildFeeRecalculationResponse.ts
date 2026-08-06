type RecalculatedFee = {
  paidAmount?: string | number | null;
  status?: string | null;
};

export function buildFeeRecalculationResponse(
  feeId: string,
  recalculatedFee?: RecalculatedFee | null,
) {
  return {
    feeId,
    totalAllocated: Number(recalculatedFee?.paidAmount) || 0,
    status: recalculatedFee?.status,
  };
}

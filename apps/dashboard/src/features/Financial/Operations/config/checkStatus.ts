/** A pending check is deposited at the bank, then settled once it clears. */
export const CHECK_STATUS_COLOR = { pending: 'warning', deposited: 'info' } as const;

type CheckStep = { status: 'deposited' | 'completed'; labelKey: string };

/** The one forward step a check can take from its status, if any. */
export const nextCheckStep = (status: string): CheckStep | null => {
  if (status === 'pending') return { status: 'deposited', labelKey: 'financialOperations.deposit' };
  if (status === 'deposited') return { status: 'completed', labelKey: 'financialOperations.complete' };
  return null;
};

export const CHECK_STATUS_FILTER_VALUES = ['pending', 'deposited'] as const;

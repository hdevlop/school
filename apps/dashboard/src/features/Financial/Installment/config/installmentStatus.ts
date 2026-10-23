export const UPCOMING_STATUS_COLOR = { upcoming: 'info', due: 'warning' } as const;

// Due dates are calendar dates. Compare them with the school's business date,
// without converting through the browser's time zone or the payment date.
export const isInstallmentDue = (
  installment: { status: string; dueDate: string },
  businessDate: string,
) => installment.status !== 'paid' && installment.status !== 'cancelled'
  && (installment.status !== 'pending' || installment.dueDate.slice(0, 10) <= businessDate);

export const displayInstallmentStatus = (status: string, dueDate: string, businessDate: string) => (
  status === 'pending'
    ? isInstallmentDue({ status, dueDate }, businessDate) ? 'due' : 'upcoming'
    : status
);

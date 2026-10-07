// An installment is `pending` until its due date passes, so it reads as
// upcoming: it can be paid ahead, and nobody is waiting on it.
export const UPCOMING_STATUS_COLOR = { upcoming: 'info' } as const;
export const displayInstallmentStatus = (status: string) => (status === 'pending' ? 'upcoming' : status);

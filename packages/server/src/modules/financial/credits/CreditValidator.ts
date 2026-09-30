import { Err, I18n, Service } from '../../../najm';

@Service()
export class CreditValidator {
  @I18n('payments.errors') private pt!: (key: string, params?: Record<string, unknown>) => string;
  ensureAvailableBalance(amount: number, requestedCents: number, availableCents: number) {
    if (availableCents < requestedCents) {
      Err(400, this.pt('creditExceedsBalance', { amount, available: (availableCents / 100).toFixed(2) }));
    }
  }

  ensureInstallmentsAvailable<T>(installments: T[] | null | undefined) {
    if (!installments || installments.length === 0) Err(400, this.pt('noInstallmentsForCredit'));
    return installments;
  }

  ensureFullyAllocated(remainingCents: number) {
    if (remainingCents > 0) Err(400, this.pt('creditExceedsInstallments', { excess: (remainingCents / 100).toFixed(2) }));
  }
}

import { Err, Service } from '../../../najm';

@Service()
export class CreditValidator {
  ensureAvailableBalance(amount: number, requestedCents: number, availableCents: number) {
    if (availableCents < requestedCents) {
      Err(400, `Requested credit ${amount} exceeds available balance ${(availableCents / 100).toFixed(2)}`);
    }
  }

  ensureInstallmentsAvailable<T>(installments: T[] | null | undefined) {
    if (!installments || installments.length === 0) Err(400, 'No installments available to apply credit to');
    return installments;
  }

  ensureFullyAllocated(remainingCents: number) {
    if (remainingCents > 0) Err(400, `Credit exceeds available installment balance by ${(remainingCents / 100).toFixed(2)}`);
  }
}

import { Err, Service } from '../../../najm';

@Service()
export class FinancialAuditValidator {
  ensureExists<T>(entry: T | null | undefined) {
    if (!entry) Err(404, 'Audit log entry not found');
    return entry;
  }
}

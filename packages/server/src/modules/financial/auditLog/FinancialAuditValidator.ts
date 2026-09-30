import { Err, I18n, Service } from '../../../najm';

@Service()
export class FinancialAuditValidator {
  @I18n('financialAudit.errors') private et!: (key: string) => string;
  ensureExists<T>(entry: T | null | undefined) {
    if (!entry) Err(404, this.et('notFound'));
    return entry;
  }
}

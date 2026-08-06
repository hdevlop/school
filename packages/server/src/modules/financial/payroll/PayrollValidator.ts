import { Err, I18n, Service } from '@server/najm';
import { PayrollRepository } from './PayrollRepository';

@Service()
export class PayrollValidator {
  @I18n('payroll.errors') private t!: (key: string) => string;

  constructor(private payrollRepository: PayrollRepository) { }

  async ensureExists(id: string) {
    const row = await this.payrollRepository.getById(id);
    if (!row) {
      Err(404, this.t('notFound'));
    }
    return row!;
  }

  async ensurePayable(id: string) {
    const payslip = await this.ensureExists(id);
    if (payslip.status === 'paid') {
      Err(400, this.t('alreadyPaid'));
    }
    if (payslip.status === 'cancelled') {
      Err(400, this.t('cancelled'));
    }
    return payslip;
  }
}

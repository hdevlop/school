import { Err, I18n, Service } from '../../../najm';
import { PayrollRepository } from './PayrollRepository';
import { Year } from '../../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';

@Service()
export class PayrollValidator {
  @I18n('payroll.errors') private t!: (key: string) => string;
  @Year() private readonly year!: ResolvedAcademicYear;

  constructor(private payrollRepository: PayrollRepository) { }

  ensureActiveStaff<T extends { status: string }>(staff: T | null | undefined) {
    if (!staff) Err(404, this.t('staffNotFound'));
    if (staff.status !== 'active') Err(400, this.t('staffInactive'));
    return staff;
  }

  ensureCompensation(base: number) {
    if (!(base > 0)) Err(400, this.t('noCompensation'));
  }

  ensurePeriodInSelectedYear(period: string) {
    const firstDay = `${period}-01`;
    if (firstDay < this.year.reportingStartsOn || firstDay > this.year.reportingEndsOn) {
      Err(409, this.t('outsideYear'));
    }
  }

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

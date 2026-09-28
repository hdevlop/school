import { Err, I18n, Service } from '../../../najm';
import { RefuelRepository } from './RefuelRepository';
import { Year } from '../../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';



@Service()
export class RefuelValidator {
  @Year() private readonly year!: ResolvedAcademicYear;
  @I18n('refuels.errors') private t!: (key: string) => string;

  constructor(private refuelRepository: RefuelRepository) { }

  async validate(data, excludeId: string | null = null) {
    if (excludeId) {
      await this.checkExists(excludeId);
    }

    if (data.voucherNumber) {
      await this.checkVoucherNumberIsUnique(data.voucherNumber, excludeId);
    }

    if (data.datetime) {
      this.validateDate(data.datetime);
      const day = await this.refuelRepository.schoolDayOf(data.datetime);
      if (day < this.year.reportingStartsOn || day > this.year.reportingEndsOn) {
        Err(409, 'Refuel date is outside the selected school year');
      }
    }

    return data;
  }

  async checkExists(id) {
    const refuel = await this.refuelRepository.getById(id);
    if (!refuel) {
      Err(404, this.t('notFound'));
    }
    return true;
  }

  async checkVoucherNumberExists(voucherNumber) {
    const refuel = await this.refuelRepository.getByVoucherNumber(voucherNumber);
    if (!refuel) {
      Err(404, this.t('notFound'));
    }
    return refuel;
  }

  async checkVoucherNumberIsUnique(voucherNumber, excludeId = null) {
    if (!voucherNumber) return true;

    const existing = await this.refuelRepository.getByVoucherNumberAcrossYears(voucherNumber);
    if (existing && existing.id !== excludeId) {
      Err(409, this.t('voucherExists'));
    }
    return true;
  }

  validateDate(date) {
    if (!date) {
      Err(400, this.t('dateRequired'));
    }

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      Err(400, this.t('invalidDateFormat'));
    }

    return true;
  }

  validateDateRange(startDate, endDate) {
    this.validateDate(startDate);
    this.validateDate(endDate);

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      Err(400, this.t('endDateAfterStart'));
    }

    return true;
  }
}

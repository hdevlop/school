import { Service, Events, EventService } from '@server/najm';
import { InstallmentRepository } from './InstallmentRepository';
import { InstallmentValidator } from './InstallmentValidator';
import { SettingsRepository } from '../../settings/SettingsRepository';
import {
  getAcademicYearRange,
  getScheduleConfig,
  buildInstallments,
  formatDateOnly,
  parseDateOnly,
  resolveAcademicPeriodStart,
  toCents,
} from '../utils';
import type { CreateInstallmentDto, UpdateInstallmentDto } from './InstallmentDto';
import { getBusinessDate } from '@server/shared/businessDate';

@Service()
export class InstallmentService {
  @Events() private events!: EventService;

  constructor(
    private installmentRepository: InstallmentRepository,
    private installmentValidator: InstallmentValidator,
    private settingsRepository: SettingsRepository,
  ) { }

  async getAll() {
    return this.installmentRepository.getAll();
  }

  async getById(id: string) {
    await this.installmentValidator.checkExists(id);
    return this.installmentRepository.getById(id);
  }

  async getByFeeId(feeId: string) {
    await this.installmentValidator.validateFeeExists(feeId);
    return this.installmentRepository.getByFeeId(feeId);
  }

  async getOverdue() {
    return this.installmentRepository.getOverdue();
  }

  async getPending() {
    return this.installmentRepository.getPending();
  }

  async getPaid() {
    return this.installmentRepository.getPaid();
  }

  async getAllocatedTotal(id: string) {
    await this.installmentValidator.checkExists(id);
    return await this.installmentRepository.getAllocatedTotal(id);
  }

  async create(data: CreateInstallmentDto) {
    await this.installmentValidator.validate(data);
    const created = this.installmentRepository.create(data);
    this.events.emit('installment.created', created);
    return created;
  }

  async update(id: string, data: UpdateInstallmentDto) {
    await this.installmentValidator.validate(data, id)
    const updated = await this.installmentRepository.update(id, data);
    this.events.emit('installment.updated', updated);
    return updated;
  }

  async delete(id: string) {
    await this.installmentValidator.checkExists(id);
    const deleted = await this.installmentRepository.delete(id);
    this.events.emit('installment.deleted', deleted);
    return deleted;
  }

  async deleteAll() {
    const result = await this.installmentRepository.deleteAll();
    this.events.emit('installments.deleted', result);
    return result;
  }

  async cancelFutureUnpaidByFeeId(feeId: string, effectiveDate: string) {
    await this.installmentValidator.validateFeeExists(feeId);
    const cancelled = await this.installmentRepository.cancelFutureUnpaidByFeeId(feeId, effectiveDate);
    this.events.emit('installments.cancelled', { feeId, effectiveDate, count: cancelled.length });
    return cancelled;
  }

  async resumeCancelledByFeeId(feeId: string, effectiveDate: string) {
    await this.installmentValidator.validateFeeExists(feeId);
    const resumed = await this.installmentRepository.resumeCancelledByFeeId(feeId, effectiveDate);
    this.events.emit('installments.resumed', { feeId, effectiveDate, count: resumed.length });
    return resumed;
  }

  async generateInstallments(fee) {
    const { id: feeId, schedule, netAmount, effectiveDate, createdAt } = fee;
    await this.installmentRepository.deleteByFeeId(feeId);
    const settings = await this.settingsRepository.getAdminSettings();

    // Prefer effectiveDate (enrollment date) over createdAt so mid-year and
    // back-dated enrollments generate the correct installment start month.
    const referenceDate = effectiveDate
      ? parseDateOnly(effectiveDate)
      : createdAt
        ? new Date(createdAt)
        : getBusinessDate();

    const { start: academicStart, end } = getAcademicYearRange(
      settings.startMonth || 'september',
      settings.endMonth || 'june',
      fee.academicYear,
      referenceDate,
    );

    const start = resolveAcademicPeriodStart(academicStart, end, referenceDate);

    const config = getScheduleConfig(schedule || 'oneTime', start, end);
    const netAmountValue = Math.max(0, Number(netAmount) || 0);

    const installments = buildInstallments({
      feeId,
      netAmount: netAmountValue,
      ...config,
      start,
    });

    await this.installmentRepository.createBulk(installments);

    this.events.emit('installments.generated', { feeId, count: installments.length });
    return installments;
  }

  async getInstallmentStats() {
    const all = await this.installmentRepository.getAll();
    const today = formatDateOnly(getBusinessDate());

    const active = all.filter(i => i.status !== 'cancelled');
    const overdue = active.filter(i => i.status === 'overdue' || (i.status === 'pending' && i.dueDate < today));
    const pending = active.filter(i => i.status === 'pending' && i.dueDate >= today);
    const paid = active.filter(i => i.status === 'paid');
    const partiallyPaid = active.filter(i => i.status === 'partiallyPaid');

    const totalAmount = active.reduce((sum, inst) => sum + Number(inst.amount || 0), 0);
    const paidAmount = paid.reduce((sum, inst) => sum + Number(inst.amount || 0), 0);
    const overdueAmount = overdue.reduce((sum, inst) => sum + Number(inst.amount || 0), 0);
    const pendingAmount = pending.reduce((sum, inst) => sum + Number(inst.amount || 0), 0);
    const partiallyPaidAmount = partiallyPaid.reduce((sum, inst) => sum + Number(inst.amount || 0), 0);

    return {
      total: active.length,
      overdue: overdue.length,
      pending: pending.length,
      paid: paid.length,
      partiallyPaid: partiallyPaid.length,
      totalAmount,
      paidAmount,
      overdueAmount,
      pendingAmount,
      partiallyPaidAmount,
      collectionRate: totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0
    };
  }

  async recalculate(id) {
    if (!id) return;
    const totalAllocated = await this.getAllocatedTotal(id);
    const installment = await this.installmentRepository.getById(id);
    const amount = Number(installment.amount) || 0;
    let status = installment.status;

    if (toCents(totalAllocated) >= toCents(amount)) {
      status = 'paid';
    }
    else if (totalAllocated > 0) {
      status = 'partiallyPaid';
    }
    else {
      const today = formatDateOnly(getBusinessDate());
      status = installment.dueDate < today ? 'overdue' : 'pending';
    }

    await this.update(id, {
      paidAmount: totalAllocated,
      status,
    });
  }

  async recalculateByFeeId(feeId) {
    if (!feeId) return;

    await this.installmentValidator.validateFeeExists(feeId);
    const installments = await this.installmentRepository.getByFeeId(feeId);

    const results = [];
    for (const installment of installments) {
      await this.recalculate(installment.id);
      results.push(installment.id);
    }
    return results;
  }

}

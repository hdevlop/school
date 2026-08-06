import { Err, Events, EventService, Service, Transaction } from '@server/najm';
import { PayrollRepository } from './PayrollRepository';
import { PayrollValidator } from './PayrollValidator';
import { StaffRepository } from '../../staff/StaffRepository';
import { generatePayslipNumber, generateTransactionRef } from '../utils';
import type {
  PayPayslipDto,
  PayStaffBulkDto,
  PayStaffDto,
  RunPayrollDto,
  UnpayStaffDto,
  UpdatePayslipDto,
} from './PayrollDto';
import { FinancialAuditService } from '../auditLog/FinancialAuditService';
import { formatDateOnly } from '../utils/dateOnly';
import { fromCents } from '../utils/money';
import { getBusinessDate } from '@server/shared/businessDate';

const money = (value: unknown) => Number(value ?? 0);
const toMoney = (value: number) => fromCents(Math.round(value * 100));

const calculateStaffBasePay = (member: any) => {
  if (member?.compensationMode === 'hourly') {
    return money(member.hourlyRate) * money(member.workloadHours);
  }
  return money(member?.salary);
};

@Service()
export class PayrollService {
  @Events() private events!: EventService;

  constructor(
    private payrollRepository: PayrollRepository,
    private payrollValidator: PayrollValidator,
    private staffRepository: StaffRepository,
    private auditService: FinancialAuditService,
  ) { }

  async getAll() {
    return await this.payrollRepository.getAll();
  }

  async getById(id: string) {
    return this.payrollValidator.ensureExists(id);
  }

  async getByPeriod(period: string) {
    const [payslips, summary] = await Promise.all([
      this.payrollRepository.getByPeriod(period),
      this.payrollRepository.getPeriodSummary(period),
    ]);
    return { payslips, summary };
  }

  async getByStaff(staffId: string) {
    return await this.payrollRepository.getByStaff(staffId);
  }

  /**
   * Generate `pending` payslips for every active staff member with a salary that
   * does not yet have a payslip for the given period. Salary/name/role are snapshotted.
   */
  @Transaction()
  async runPayroll({ period }: RunPayrollDto, processedBy?: string) {
    const activeStaff = await this.staffRepository.getByStatus('active');
    const eligible = activeStaff.filter((member) => calculateStaffBasePay(member) > 0);

    const alreadyPaid = new Set(await this.payrollRepository.getStaffIdsWithPayslip(period));
    const toCreate = eligible.filter((member) => !alreadyPaid.has(member.id));

    const rows = toCreate.map((member) => {
      const base = calculateStaffBasePay(member);
      return {
        staffId: member.id,
        staffName: member.name,
        staffRole: member.role,
        period,
        baseSalary: toMoney(base),
        totalAllowances: '0',
        totalDeductions: '0',
        grossAmount: toMoney(base),
        netAmount: toMoney(base),
        status: 'pending' as const,
        payslipNumber: generatePayslipNumber(period),
        processedBy: processedBy ?? null,
      };
    });

    const created = await this.payrollRepository.createMany(rows);
    for (const payslip of created) {
      await this.auditService.record({
        entityType: 'payslip', entityId: payslip.id, action: 'payroll.generated',
        actorId: processedBy, before: null, after: payslip, metadata: { period },
      });
    }
    this.events.emit('payroll.run', { period, created: created.length });

    return {
      period,
      createdCount: created.length,
      skippedCount: eligible.length - created.length,
      created,
    };
  }

  @Transaction()
  async pay(id: string, data: PayPayslipDto, processedBy?: string) {
    const existing = await this.payrollValidator.ensurePayable(id);

    const update: Record<string, any> = {
      status: 'paid',
      paymentMethod: data.paymentMethod,
      paymentDate: data.paymentDate || formatDateOnly(getBusinessDate()),
      transactionRef: data.transactionRef || generateTransactionRef(),
    };
    if (data.notes != null) update.notes = data.notes;
    if (processedBy) update.processedBy = processedBy;

    const updated = await this.payrollRepository.update(id, update);
    await this.auditService.record({
      entityType: 'payslip', entityId: id, action: 'payroll.paid', actorId: processedBy,
      before: existing, after: updated,
    });
    this.events.emit('payroll.paid', updated);
    return updated;
  }

  /**
   * One-click pay: create the payslip (snapshotting the staff salary) AND mark it paid in a single
   * step. If a payslip already exists for the staff+period, it's paid instead of duplicated.
   */
  @Transaction()
  async payStaff(data: PayStaffDto, processedBy?: string) {
    const { staffId, period } = data;
    const paymentMethod = data.paymentMethod || 'bankTransfer';

    const existing = await this.payrollRepository.getByStaffAndPeriod(staffId, period);
    if (existing) {
      return this.pay(existing.id, {
        paymentMethod,
        paymentDate: data.paymentDate,
        transactionRef: data.transactionRef,
        notes: data.notes,
      }, processedBy);
    }

    const staff = await this.staffRepository.getById(staffId);
    if (!staff) Err(404, 'Staff not found');
    if (staff!.status !== 'active') Err(400, 'Only active staff can be paid');

    const base = calculateStaffBasePay(staff);
    if (!(base > 0)) Err(400, 'Staff member has no compensation set');

    const row: Record<string, any> = {
      staffId,
      staffName: staff!.name,
      staffRole: staff!.role,
      period,
      baseSalary: toMoney(base),
      totalAllowances: '0',
      totalDeductions: '0',
      grossAmount: toMoney(base),
      netAmount: toMoney(base),
      status: 'paid',
      paymentMethod,
      paymentDate: data.paymentDate || formatDateOnly(getBusinessDate()),
      transactionRef: data.transactionRef || generateTransactionRef(),
      payslipNumber: generatePayslipNumber(period),
    };
    if (data.notes != null) row.notes = data.notes;
    if (processedBy) row.processedBy = processedBy;

    const created = await this.payrollRepository.create(row as any);
    await this.auditService.record({
      entityType: 'payslip', entityId: created.id, action: 'payroll.createdAndPaid',
      actorId: processedBy, before: null, after: created,
    });
    this.events.emit('payroll.paid', created);
    return created;
  }

  /** Undo a payment — keep the payslip snapshot and return it to pending. */
  @Transaction()
  async unpayStaff(data: UnpayStaffDto, actorId?: string) {
    const existing = await this.payrollRepository.getByStaffAndPeriod(data.staffId, data.period);
    if (!existing) return { unpaid: false };
    const updated = await this.payrollRepository.update(existing.id, {
      status: 'pending',
      paymentMethod: null,
      paymentDate: null,
      transactionRef: null,
      processedBy: null,
    });
    await this.auditService.record({
      entityType: 'payslip', entityId: existing.id, action: 'payroll.unpaid', actorId,
      before: existing, after: updated,
    });
    this.events.emit('payroll.unpaid', updated);
    return { unpaid: true, payslip: updated };
  }

  async payStaffBulk(data: PayStaffBulkDto, processedBy?: string) {
    const { staffIds, period, ...rest } = data;
    let paidCount = 0;
    // Sequential — avoids racing the (staffId, period) unique index across the pool.
    for (const staffId of staffIds) {
      try {
        await this.payStaff({ staffId, period, ...rest }, processedBy);
        paidCount++;
      } catch {
        // skip staff that can't be paid (no salary, already paid, etc.)
      }
    }
    return { paidCount, requested: staffIds.length };
  }

  @Transaction()
  async update(id: string, data: UpdatePayslipDto, actorId?: string) {
    const existing = await this.payrollValidator.ensureExists(id);

    const update: Record<string, any> = {};
    if (data.status !== undefined) update.status = data.status;
    if (data.paymentMethod !== undefined) update.paymentMethod = data.paymentMethod;
    if (data.paymentDate !== undefined) update.paymentDate = data.paymentDate || null;
    if (data.notes !== undefined) update.notes = data.notes || null;

    const recalc = data.totalAllowances !== undefined || data.totalDeductions !== undefined;
    if (recalc) {
      const base = money(existing.baseSalary);
      const allowances = data.totalAllowances !== undefined
        ? money(data.totalAllowances)
        : money(existing.totalAllowances);
      const deductions = data.totalDeductions !== undefined
        ? money(data.totalDeductions)
        : money(existing.totalDeductions);
      const gross = base + allowances;
      update.totalAllowances = toMoney(allowances);
      update.totalDeductions = toMoney(deductions);
      update.grossAmount = toMoney(gross);
      update.netAmount = toMoney(gross - deductions);
    }

    const updated = await this.payrollRepository.update(id, update);
    await this.auditService.record({
      entityType: 'payslip', entityId: id, action: 'payroll.updated', actorId,
      before: existing, after: updated, metadata: { changedFields: Object.keys(update) },
    });
    this.events.emit('payroll.updated', updated);
    return updated;
  }

  @Transaction()
  async delete(id: string, actorId?: string) {
    const existing = await this.payrollValidator.ensureExists(id);
    const deleted = await this.payrollRepository.delete(id);
    await this.auditService.record({
      entityType: 'payslip', entityId: id, action: 'payroll.deleted', actorId,
      before: existing, after: null,
    });
    this.events.emit('payroll.deleted', deleted);
    return deleted;
  }

  async deleteBulk(ids: string[], actorId?: string) {
    const deleted = await Promise.all(ids.map((id) => this.delete(id, actorId)));
    return { deletedCount: deleted.length };
  }

  async deleteAll() {
    const deleted = await this.payrollRepository.deleteAll();
    this.events.emit('payroll.deletedAll', deleted);
    return deleted;
  }
}

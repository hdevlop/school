import { describe, expect, it } from 'bun:test';
import { PgDialect } from 'drizzle-orm/pg-core';
import { NotificationController } from '../../src/modules/financial/notifications/NotificationController';
import { NotificationService } from '../../src/modules/financial/notifications/NotificationService';
import { NotificationRepository } from '../../src/modules/financial/notifications/NotificationRepository';
import { runNotificationsDto } from '../../src/modules/financial/notifications/NotificationDto';
import { PaymentService } from '../../src/modules/financial/payments/PaymentService';
import { PaymentValidator } from '../../src/modules/financial/payments/PaymentValidator';
import { updatePaymentDto } from '../../src/modules/financial/payments/PaymentDto';
import { AllocationService } from '../../src/modules/financial/allocations/AllocationService';
import { AllocationValidator } from '../../src/modules/financial/allocations/AllocationValidator';
import { InstallmentRepository } from '../../src/modules/financial/installments/InstallmentRepository';
import { createInstallmentDto, updateInstallmentDto } from '../../src/modules/financial/installments/InstallmentDto';
import { createFeeDto, updateFeeDto } from '../../src/modules/financial/fees/FeeDto';
import { RolloverService } from '../../src/modules/financial/rollover/RolloverService';
import { CreditService } from '../../src/modules/financial/credits/CreditService';
import { StudentRouteController } from '../../src/modules/transport/studentRoutes/StudentRouteController';
import { StudentRouteService } from '../../src/modules/transport/studentRoutes/StudentRouteService';
import { StudentRouteValidator } from '../../src/modules/transport/studentRoutes/StudentRouteValidator';
import { withEnglishMessages } from '../support/englishMessages';
import { events, feeHarness, recurringInput } from '../support/financeHarness';

describe('SEC-005 financial cron input and SQL boundary', () => {
  it('rejects SQL canaries, invalid dates, fractional/unbounded days and body extras', () => {
    for (const input of [{ daysAhead: "0 days' + (SELECT interval '0 days') + interval '0" },
      { daysAhead: -1 }, { daysAhead: 366 }, { daysAhead: 1.5 }, { daysAhead: Infinity },
      { businessDate: '2026-02-30' }, { unknown: 'value' }]) {
      expect(runNotificationsDto.safeParse(input).success).toBe(false);
    }
    expect(runNotificationsDto.parse({ daysAhead: 0 }).daysAhead).toBe(0);
  });

  it('protects direct job calls and binds the actual repository day window', async () => {
    const repo = new NotificationRepository();
    let condition: any;
    const builder: any = { from: () => builder, innerJoin: () => builder,
      where: (value: any) => { condition = value; return builder; }, orderBy: async () => [] };
    Object.assign(repo, { db: { select: () => builder } });
    const service = new NotificationService(repo, {} as any, {} as any, {} as any);
    const controller = new NotificationController(service);
    const previous = process.env.FINANCIAL_CRON_SECRET;
    process.env.FINANCIAL_CRON_SECRET = 'synthetic-finance-regression-secret';
    try {
      await expect(controller.runCheckDue({ daysAhead: 'SQL_CANARY', dryRun: true } as any,
        'synthetic-finance-regression-secret')).rejects.toThrow();
      expect(condition).toBeUndefined();
      const result = await controller.runCheckDue({ businessDate: '2026-10-03', daysAhead: 21, dryRun: true },
        'synthetic-finance-regression-secret');
      expect(result.processed).toBe(0);
      const compiled = new PgDialect().sqlToQuery(condition);
      expect(compiled.params).toContain(21);
      expect(compiled.sql).not.toContain("INTERVAL '21 days'");
      // Repository parameterization also protects a direct caller bypassing the DTO.
      await repo.getStudentsWithChecksDueInWindow('2026-10-03', 'SQL_CANARY' as any);
      const defensive = new PgDialect().sqlToQuery(condition);
      expect(defensive.sql).not.toContain('SQL_CANARY');
      expect(defensive.params).toContain('SQL_CANARY');
    } finally {
      if (previous === undefined) delete process.env.FINANCIAL_CRON_SECRET;
      else process.env.FINANCIAL_CRON_SECRET = previous;
    }
  });
});

describe('SEC-006 recurring discount round trips', () => {
  it.each([{ baseAmount: 100 }, { schedule: 'quarterly' }, { discountAmount: 10 }])(
    'preserves a 10 MAD monthly discount on an ordinary edit: %j', async data => {
      const h = feeHarness();
      await h.service.create(createFeeDto.parse(recurringInput), 'accountant', 'accounting');
      expect(Number(h.fee.discountAmount)).toBe(100);
      await h.service.update('audit-fee', updateFeeDto.parse(data), 'accountant', 'accounting');
      expect(Number(h.fee.netAmount)).toBe(900);
      expect(Number(h.fee.discountAmount)).toBe(100);
      expect(h.installments.reduce((sum, row) => sum + Number(row.amount), 0)).toBe(900);
    });

  it('prorates the original monthly discount when the effective date changes', async () => {
    const h = feeHarness();
    await h.service.create(createFeeDto.parse(recurringInput), 'accountant', 'accounting');
    await h.service.update('audit-fee', updateFeeDto.parse({ effectiveDate: '2027-02-01' }), 'accountant', 'accounting');
    expect(Number(h.fee.discountAmount)).toBe(50);
    expect(Number(h.fee.netAmount)).toBe(450);
    expect(h.installments).toHaveLength(5);
  });

  it('preserves aggregate cent remainders on unrelated edits', async () => {
    const h = feeHarness();
    await h.service.create(createFeeDto.parse(recurringInput), 'accountant', 'accounting');
    h.fee = { ...h.fee, discountAmount: '100.01', netAmount: '899.99' };
    await h.service.update('audit-fee', updateFeeDto.parse({ baseAmount: 100 }), 'accountant', 'accounting');
    expect(Number(h.fee.discountAmount)).toBe(100.01);
    expect(Number(h.fee.netAmount)).toBe(899.99);
  });

  it('rollover preview and commit both copy the monthly discount into a shorter target year', async () => {
    const h = feeHarness();
    const source = { sourceFeeId: 'source', studentId: 'audit-student', feeTypeId: 'audit-type', schedule: 'monthly',
      sourceBaseAmount: '100', effectiveDate: '2026-09-01', discountAmount: '100', discountReason: null, notes: null,
      feeTypeName: 'Tuition', feeTypeCategory: 'tuition', feeTypeAmount: '100', paymentType: 'recurring', feeTypeStatus: 'active' };
    const repo = { getActiveStudents: async () => [{ id: 'audit-student', name: 'Canary Student' }],
      getTargetEnrollments: async () => [{ studentId: 'audit-student', status: 'active', enrolledOn: '2028-02-01', leftOn: null }],
      getSourceFeesForRollover: async () => [source], getExistingFeeIdsForYear: async () => [], createRunItem: async () => {} };
    const rollover = new RolloverService(repo as any, h.service,
      { getAdminSettings: async () => ({ startMonth: 'september', endMonth: 'june' }) } as any,
      {} as any, {} as any, {} as any);
    const preview = await (rollover as any).buildPreview({ fromYear: '2026-2027', toYear: '2027-2028', copyDiscounts: true });
    expect(preview.projectedNet).toBe(450);
    expect(preview.details.proposedFees[0].discountAmount).toBe(10);
    await (rollover as any).commitProposed('run', preview.details.proposedFees[0], '2027-2028', 'accountant');
    expect(Number(h.fee.netAmount)).toBe(450);
    expect(Number(h.fee.discountAmount)).toBe(50);
  });
});

function cancelledAllocationHarness() {
  const row = { id: 'cancelled', feeId: 'fee', number: 2, amount: '100.00', paidAmount: '0', status: 'cancelled' };
  const fee = { id: 'fee', studentId: 'student', netAmount: 100, paidAmount: 0, installments: [row] };
  const writes: object[] = [];
  const feeRepo = { getByIdAllYears: async () => fee };
  const instRepo = { getByFeeIdAllYears: async () => [row], getByFeeAndNumbersForUpdate: async () => [row] };
  const allocRepo = { getCompletedTotalByInstallmentIds: async () => new Map(),
    getReservedTotalByInstallmentIds: async () => new Map(), getTotalAllocatedForPayment: async () => 0,
    create: async (data: object) => { writes.push(data); return data; } };
  const pv = withEnglishMessages(new PaymentValidator({} as any, {} as any, {} as any, feeRepo as any, allocRepo as any, instRepo as any));
  const av = withEnglishMessages(new AllocationValidator(allocRepo as any, {} as any, feeRepo as any, instRepo as any));
  const service = new AllocationService(allocRepo as any, av, instRepo as any, {} as any, {} as any, { record: async () => {} } as any);
  Object.assign(service, { events });
  return { row, writes, pv, service, instRepo, allocRepo };
}

describe('SEC-007 cancelled installment lifecycle', () => {
  it('refuses both initial and locked explicit allocation targets before insertion', async () => {
    const h = cancelledAllocationHarness();
    const allocations = [{ feeId: 'fee', number: 2, amount: 100 }];
    await expect(h.pv.validateAllocationStudents('student', allocations)).rejects.toThrow('cancelled');
    await expect(h.pv.validateAllocationBalanceUnderLock({ allocations })).rejects.toThrow('cancelled');
    const mapped = await h.service.mapAllocations({ allocations });
    // Mapping is historical; the locked write is the final lifecycle authority.
    await expect(h.service.processLockedAllocations({ paymentId: 'payment', paymentAmount: 100, allocations: mapped }))
      .rejects.toThrow('cancelled');
    expect(h.writes).toEqual([]);
  });

  it('does not settle a check or activate credit against a cancelled target', async () => {
    const h = cancelledAllocationHarness();
    const effects: string[] = [];
    const service = new PaymentService({ getByIdForUpdate: async () => ({ paymentMethod: 'check', status: 'deposited' }),
      update: async () => effects.push('update') } as any, h.pv, {} as any,
      { ...h.allocRepo, getByPaymentId: async () => [{ installmentId: h.row.id, feeId: 'fee', installment: { number: 2 }, amount: '100' }] } as any,
      {} as any, h.instRepo as any, {} as any,
      { activateCreditForSourcePayment: async () => effects.push('credit') } as any);
    await expect(service.updateCheckStatus('payment', { status: 'completed' })).rejects.toThrow('cancelled');
    expect(effects).toEqual([]);
  });
});

function paymentEditHarness(paymentMethod: string, status: string) {
  let payment: any = { id: 'payment', studentId: 'student', paymentMethod, status, amount: 150, settledDate: null };
  const effects: string[] = [];
  const repo = { getById: async () => ({ ...payment }), getByIdForUpdate: async () => ({ ...payment }),
    update: async (_id: string, data: object) => { effects.push('update'); payment = { ...payment, ...data }; return payment; } };
  const validator = withEnglishMessages(new PaymentValidator(repo as any, {} as any, {} as any, {} as any, {} as any, {} as any));
  const service = new PaymentService(repo as any, validator, {} as any, { getByPaymentId: async () => [] } as any,
    { recalcFinancialsByStudent: async () => {} } as any, {} as any, { record: async () => {} } as any, {} as any);
  Object.assign(service, { events });
  return { service, effects, get payment() { return payment; } };
}

describe('SEC-008 receipt payment method boundaries', () => {
  it.each(['pending', 'deposited', 'completed', 'voided'])('rejects check -> cash for a %s receipt', async status => {
    const h = paymentEditHarness('check', status);
    await expect(h.service.update('payment', updatePaymentDto.parse({ paymentMethod: 'cash' }), 'accountant'))
      .rejects.toThrow('void the receipt');
    expect(h.effects).toEqual([]);
    expect(h.payment.paymentMethod).toBe('check');
  });
  it('rejects cash -> check but keeps same-method and non-check edits', async () => {
    const h = paymentEditHarness('cash', 'completed');
    await expect(h.service.update('payment', updatePaymentDto.parse({ paymentMethod: 'check' }), 'accountant')).rejects.toThrow();
    await h.service.update('payment', updatePaymentDto.parse({ paymentMethod: 'bankTransfer', paymentDate: '2026-10-01' }), 'accountant');
    expect(h.payment.status).toBe('completed');
    expect(h.payment.settledDate).toBe('2026-10-01');
    expect(h.payment.amount).toBe(150);
  });
});

describe('SEC-009 fee history preservation', () => {
  it('blocks paid/reserved fee deletion and mixed bulk deletion before any delete', async () => {
    const h = feeHarness();
    await h.service.create(createFeeDto.parse(recurringInput), 'accountant', 'accounting');
    h.fee = { ...h.fee, paymentCount: 1, paidAmount: '900.00', status: 'paid' };
    await expect(h.service.delete('audit-fee', 'accountant', 'accounting')).rejects.toThrow('payment allocations');
    await expect(h.service.deleteBulk(['unallocated', 'audit-fee'], 'accountant', 'accounting')).rejects.toThrow('payment allocations');
    expect(h.writes.some(row => row.deleted)).toBe(false);
    expect(h.fee.status).toBe('paid');
  });
  it('still allows deleting an unallocated fee', async () => {
    const h = feeHarness();
    await h.service.create(createFeeDto.parse(recurringInput), 'accountant', 'accounting');
    await h.service.delete('audit-fee', 'accountant', 'accounting');
    expect(h.fee).toBeNull();
    expect(h.audit.at(-1).actorId).toBe('accountant');
  });
});

describe('SEC-010 schedule and SEC-011 status ownership', () => {
  it('rejects standalone money/count changes while allowing audited date corrections', async () => {
    const h = feeHarness('oneTime');
    await h.service.create(createFeeDto.parse({ ...recurringInput, schedule: 'oneTime', discountAmount: 0 }), 'accountant', 'accounting');
    const id = h.installments[0].id;
    await expect(h.instService.update(id, updateInstallmentDto.parse({ amount: 90 }), 'accountant')).rejects.toThrow('fee schedule');
    await expect(h.instService.create(createInstallmentDto.parse({ feeId: 'audit-fee', number: 2, amount: 50, dueDate: '2026-10-01' })))
      .rejects.toThrow('fee schedule');
    await expect(h.instService.delete(id)).rejects.toThrow('fee schedule');
    await h.instService.update(id, updateInstallmentDto.parse({ dueDate: '2026-10-01' }), 'accountant');
    expect(h.installments).toHaveLength(1);
    expect(Number(h.installments[0].amount)).toBe(100);
    expect(Number(h.fee.netAmount)).toBe(100);
    expect(h.audit.at(-1).actorId).toBe('accountant');
    expect(h.audit.at(-1).before.dueDate).toBe('2026-09-01');
  });
  it('ignores claimed paid status at both DTO and direct-service boundaries', async () => {
    const h = feeHarness();
    await h.service.create(createFeeDto.parse(recurringInput), 'accountant', 'accounting');
    expect(updateFeeDto.parse({ status: 'paid' })).not.toHaveProperty('status');
    await h.service.update('audit-fee', { status: 'paid', notes: 'correction' } as any, 'accountant', 'accounting');
    expect(h.fee.status).not.toBe('paid');
    expect(Number(h.fee.paidAmount)).toBe(0);
    expect(h.fee.notes).toBe('correction');
  });
});

describe('SEC-012 current transport audit operator', () => {
  it('records the ending admin, retaining the original assignment author separately', async () => {
    const h = feeHarness();
    await h.service.create(createFeeDto.parse(recurringInput), 'admin-A', 'admin');
    h.instService.cancelFutureUnpaidByFeeId = async () => [{ amount: '90' }] as any;
    const route = { id: 'route', studentId: 'audit-student', assignmentDate: '2026-09-01', status: 'active', assignedBy: 'admin-A' };
    const validator = withEnglishMessages(new StudentRouteValidator({} as any, {} as any, {} as any));
    Object.assign(validator, { checkExists: async () => ({ ...route }), year: { reportingStartsOn: '2026-09-01', reportingEndsOn: '2027-08-31' } });
    const service = new StudentRouteService({ lockStudent: async () => {}, update: async (_id: string, data: object) => ({ ...route, ...data }) } as any,
      validator, h.service, { getAll: async () => [{ id: 'audit-type', category: 'transport', status: 'active' }] } as any);
    const controller = new StudentRouteController(service);
    await controller.unassignAt('route', { unassignmentDate: '2026-10-01' }, { id: 'admin-B' });
    expect(h.audit.at(-1).action).toBe('fee.transportEnded');
    expect(h.audit.at(-1).actorId).toBe('admin-B');
    expect(h.fee.assignedBy).toBe('admin-A');
  });
});

describe('SEC-013 credit cancellation audit snapshots', () => {
  it.each(['available', 'pending', 'consumed'])('retains the actual %s before-state', async status => {
    const audit: any[] = [];
    const before = { id: 'lot', status, remainingAmount: '50.00' };
    const after = { ...before, status: 'cancelled' };
    const service = new CreditService({ getLotsBySourcePaymentForUpdate: async () => [{ ...before }],
      cancelLotsBySourcePayment: async () => [{ ...after }], reverseApplicationsByPayment: async () => [] } as any,
      {} as any, {} as any, {} as any, {} as any, { record: async (row: any) => audit.push(row) } as any, {} as any);
    await service.cancelCreditForSourcePayment('payment', 'accountant');
    expect(audit[0].before.status).toBe(status);
    expect(audit[0].after.status).toBe('cancelled');
    expect(audit[0].actorId).toBe('accountant');
  });
});

describe('SEC-014 one-time fee schedule', () => {
  it('normalizes direct create/update requests to one installment', async () => {
    const h = feeHarness('oneTime');
    await h.service.create(createFeeDto.parse(recurringInput), 'accountant', 'accounting');
    expect(h.fee.schedule).toBe('oneTime');
    expect(h.installments).toHaveLength(1);
    expect(Number(h.fee.netAmount)).toBe(90);
    await h.service.update('audit-fee', updateFeeDto.parse({ schedule: 'monthly' }), 'accountant', 'accounting');
    expect(h.fee.schedule).toBe('oneTime');
    expect(h.installments).toHaveLength(1);
    expect(Number(h.fee.netAmount)).toBe(90);
    await h.service.update('audit-fee', updateFeeDto.parse({ baseAmount: 5 }), 'accountant', 'accounting');
    expect(Number(h.fee.discountAmount)).toBe(5);
    expect(Number(h.fee.netAmount)).toBe(0);
  });
});

describe('shared schedule locking', () => {
  it('takes one transaction lock per fee in a stable order before locking allocation rows', async () => {
    const queries: any[] = [];
    const repo = new InstallmentRepository();
    Object.assign(repo, { db: { execute: async (query: any) => { queries.push(new PgDialect().sqlToQuery(query)); return []; } } });
    await repo.getByFeeAndNumbersForUpdate([{ feeId: 'b', number: 2 }, { feeId: 'a', number: 1 }, { feeId: 'b', number: 3 }]);
    expect(queries).toHaveLength(3);
    expect(queries[0].params).toEqual(['a']);
    expect(queries[1].params).toEqual(['b']);
    expect(queries[2].sql).toContain('FOR UPDATE');
  });
  it('rechecks fee payment history after waiting for the schedule lock', async () => {
    const h = feeHarness();
    await h.service.create(createFeeDto.parse(recurringInput), 'accountant', 'accounting');
    h.instService.lockFeeSchedule = async () => { h.fee = { ...h.fee, paymentCount: 1 }; };
    const writes = h.writes.length;
    await expect(h.service.update('audit-fee', updateFeeDto.parse({ baseAmount: 110 }), 'accountant', 'accounting'))
      .rejects.toThrow('after payments');
    expect(h.writes).toHaveLength(writes);
  });
});

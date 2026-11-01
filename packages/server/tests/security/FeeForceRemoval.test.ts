import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { getGuardMetadata } from 'najm-guard';
import { FeeController } from '../../src/modules/financial/fees/FeeController';
import { FeeForceRemovalService } from '../../src/modules/financial/fees/FeeForceRemovalService';
import { FeeValidator } from '../../src/modules/financial/fees/FeeValidator';
import { withEnglishMessages } from '../support/englishMessages';

function harness(status = 'completed') {
  const fee = { id: 'fee', studentId: 'student', academicYear: '2026-2027', installments: [{ id: 'installment' }] };
  const receipts = [{ id: 'receipt', studentId: 'student', amount: '100.00', status }];
  const allocations = [{ id: 'direct', paymentId: 'receipt', feeId: 'fee', amount: '20.01' }];
  const applications: any[] = [];
  const lots: any[] = [];
  const credits: any[] = [];
  const audits: any[] = [];
  const effects: string[] = [];
  const fees = {
    getById: async () => fee,
    delete: async () => { effects.push('delete'); return fee; },
  };
  const validator = withEnglishMessages(new FeeValidator(fees as any, {} as any, {} as any));
  const repository = {
    lockPayments: async () => { effects.push('payments'); return receipts; },
    lockCreditLots: async () => { effects.push('lots'); return lots; },
    getAllocations: async () => allocations,
    getCreditApplications: async () => applications,
    saveCredit: async (data: any) => { credits.push(data); return { ...data, id: data.id ?? 'new-credit' }; },
  };
  const service = new FeeForceRemovalService(fees as any, validator, repository as any,
    { lockFeeSchedule: async () => { effects.push('schedule'); } } as any,
    { resolve: async () => ({ status: 'active' }) } as any,
    { record: async (audit: any) => { effects.push('audit'); audits.push(audit); } } as any);
  Object.assign(service, { events: { emit: () => effects.push('event') } });
  return { service, repository, fees, fee, receipts, allocations, applications, lots, credits, audits, effects };
}

describe('administrator fee force removal', () => {
  it('requires both the admin role and financial write permissions on the route', () => {
    const guards = getGuardMetadata(FeeController, 'forceRemoveById');
    expect(guards.some(guard => guard.guardClass.name === 'RoleGuard' && guard.params === 'admin')).toBe(true);
    const permissions = guards.filter(guard => guard.guardClass.name === 'PermissionGuard').map(guard => guard.params);
    expect(permissions).toContain('delete:fees');
    expect(permissions).toContain('update:payments');
  });

  it.each(['accounting', 'principal', 'parent', undefined])('rejects direct service calls by %s before reading or writing', async role => {
    const h = harness();
    await expect(h.service.remove('fee', { id: 'actor', role })).rejects.toMatchObject({ status: 403 });
    expect(h.effects).toEqual([]);
  });

  it('returns only the removed fee portion as credit and snapshots history before deletion', async () => {
    const h = harness();
    await h.service.remove('fee', { id: 'admin', role: 'admin' });
    expect(h.credits).toEqual([{ id: undefined, studentId: 'student', sourcePaymentId: 'receipt',
      originalAmount: '20.01', remainingAmount: '20.01', status: 'available' }]);
    expect(h.receipts).toEqual([{ id: 'receipt', studentId: 'student', amount: '100.00', status: 'completed' }]);
    expect(h.audits[0]).toMatchObject({ action: 'fee.forceRemoved', actorId: 'admin',
      before: { id: 'fee', installments: [{ id: 'installment' }], allocations: h.allocations },
      metadata: { receipts: h.receipts } });
    expect(h.effects).toEqual(['payments', 'lots', 'schedule', 'audit', 'delete', 'event']);
  });

  it('restores applied credit without counting it twice in the original lot amount', async () => {
    const h = harness();
    h.allocations.push({ id: 'from-credit', paymentId: 'receipt', feeId: 'fee', amount: '10.02' });
    h.applications.push({ paymentAllocationId: 'from-credit', amount: '10.02', status: 'active' });
    h.lots.push({ id: 'lot', studentId: 'student', sourcePaymentId: 'receipt',
      originalAmount: '30.03', remainingAmount: '20.01', status: 'available' });
    await h.service.remove('fee', { id: 'admin', role: 'admin' });
    expect(h.credits[0]).toMatchObject({ id: 'lot', originalAmount: '50.04', remainingAmount: '50.04', status: 'available' });
    expect(h.audits[0].before.creditApplications).toEqual(h.applications);
    expect(h.audits[0].metadata.creditChanges[0].before.remainingAmount).toBe('20.01');
  });

  it.each(['pending', 'deposited'])('keeps released %s cheque money pending', async status => {
    const h = harness(status);
    await h.service.remove('fee', { id: 'admin', role: 'admin' });
    expect(h.credits[0].status).toBe('pending');
  });

  it.each(['voided', 'refunded', 'bounced', 'failed'])('does not create spendable credit for %s receipts', async status => {
    const h = harness(status);
    await h.service.remove('fee', { id: 'admin', role: 'admin' });
    expect(h.credits).toEqual([]);
    expect(h.effects).toContain('delete');
  });

  it('refuses a newly linked receipt absent from the locked snapshot', async () => {
    const h = harness();
    h.allocations.push({ id: 'new-link', paymentId: 'new-receipt', feeId: 'fee', amount: '1.00' });
    await expect(h.service.remove('fee', { id: 'admin', role: 'admin' })).rejects.toMatchObject({ status: 409 });
    expect(h.credits).toEqual([]);
    expect(h.effects).not.toContain('delete');
  });

  it('does not remove a fee when the audit write fails', async () => {
    const h = harness('voided');
    Object.assign(h.service, { audit: { record: async () => { throw new Error('audit unavailable'); } } });
    await expect(h.service.remove('fee', { id: 'admin', role: 'admin' })).rejects.toThrow('audit unavailable');
    expect(h.effects).not.toContain('delete');
  });
});

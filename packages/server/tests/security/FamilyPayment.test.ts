// One parent paying for several children: one family receipt over one ordinary
// payment per child. In-memory fakes only; no database or network.
import { describe, expect, it } from 'bun:test';
import { PaymentService } from '../../src/modules/financial/payments/PaymentService';
import { PaymentValidator, computeFamilyIdempotencyHash } from '../../src/modules/financial/payments/PaymentValidator';
import { createFamilyPaymentDto } from '../../src/modules/financial/payments/PaymentDto';
import { withEnglishMessages } from '../support/englishMessages';
import { events } from '../support/financeHarness';

const children = [
  { studentId: 'amine', allocations: [{ feeId: 'fee-amine', number: 3, amount: 1500 }] },
  { studentId: 'salma', allocations: [
    { feeId: 'fee-salma', number: 3, amount: 1200 },
    { feeId: 'fee-salma-bus', number: 3, amount: 300.5 },
  ] },
];
const input = { parentId: 'parent', paymentMethod: 'cash', paymentDate: '2026-11-12', children };

describe('family payment input', () => {
  it('accepts several children of one parent on one receipt', () => {
    const parsed = createFamilyPaymentDto.parse(input);
    expect(parsed.children.map((child) => child.studentId)).toEqual(['amine', 'salma']);
  });

  it('refuses the same child twice, a child with nothing to pay, and an empty receipt', () => {
    expect(createFamilyPaymentDto.safeParse({ ...input, children: [children[0], children[0]] }).success).toBe(false);
    expect(createFamilyPaymentDto.safeParse({ ...input, children: [{ studentId: 'amine', allocations: [] }] }).success).toBe(false);
    expect(createFamilyPaymentDto.safeParse({ ...input, children: [] }).success).toBe(false);
  });

  it('asks a family cheque for its number and due date', () => {
    const result = createFamilyPaymentDto.safeParse({ ...input, paymentMethod: 'check' });
    expect(result.success).toBe(false);
    const paths = result.error!.issues.map((issue) => issue.path.join('.'));
    expect(paths).toContain('checkNumber');
    expect(paths).toContain('checkDueDate');
  });

  it('hashes a retry the same whatever order the children and lines come in', () => {
    const reordered = {
      ...input,
      children: [
        { ...children[1], allocations: [...children[1].allocations].reverse() },
        children[0],
      ],
    };
    expect(computeFamilyIdempotencyHash(reordered)).toBe(computeFamilyIdempotencyHash(input));
    expect(computeFamilyIdempotencyHash({ ...input, paymentDate: '2026-11-13' }))
      .not.toBe(computeFamilyIdempotencyHash(input));
  });
});

function recordHarness({ linked = ['amine', 'salma'], parentExists = true, existing = null as any } = {}) {
  const receipts: any[] = [];
  const payments: any[] = [];
  const checks: string[] = [];
  const emitted: any[] = [];
  const repo = {
    parentExists: async () => parentExists,
    getStudentIdsLinkedToParent: async (_parentId: string, ids: string[]) => ids.filter((id) => linked.includes(id)),
    createFamilyReceipt: async (data: any) => {
      const receipt = { id: 'family', ...data };
      receipts.push(receipt);
      return receipt;
    },
    getFamilyReceiptByIdempotencyKey: async () => existing,
    getFamilyReceiptById: async (id: string) => [...receipts, existing].find((receipt) => receipt?.id === id) ?? null,
    getByFamilyReceipt: async (id: string) => payments.filter((payment) => payment.familyReceiptId === id),
    getReceiptItems: async () => [],
  };
  const validator = withEnglishMessages(new PaymentValidator(repo as any, {} as any, {} as any, {} as any, {} as any, {} as any));
  // Each child's own payment rules are `record`'s, covered elsewhere.
  Object.assign(validator, {
    validate: async () => {},
    ensureCheckNumberUnique: async (studentId: string, checkNumber: string) => { checks.push(`${studentId}:${checkNumber}`); },
  });
  const service = new PaymentService(repo as any, validator, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  Object.assign(service, {
    events: { emit: (name: string, payload: any) => emitted.push([name, payload.payment.studentId]) },
    createRecordedPayment: async (payment: any, allocations: any[], processedBy: string, _hash: null, _settled: undefined, familyReceiptId: string) => {
      const row = { id: `pay-${payment.studentId}`, ...payment, amount: String(payment.amount), processedBy, familyReceiptId, status: 'completed' };
      payments.push(row);
      return { payment: row, allocations, replayed: false };
    },
  });
  return { service, receipts, payments, checks, emitted };
}

describe('recording a family payment', () => {
  it('writes one receipt and one payment per child, each exactly what its installments take', async () => {
    const h = recordHarness();
    const result = await h.service.recordFamily(createFamilyPaymentDto.parse(input), 'cashier');
    expect(h.receipts).toHaveLength(1);
    expect(h.receipts[0]).toMatchObject({ parentId: 'parent', processedBy: 'cashier' });
    const number = h.receipts[0].receiptNumber;
    expect(h.payments.map((payment) => [payment.studentId, payment.amount, payment.receiptNumber])).toEqual([
      ['amine', '1500', `${number}-1`],
      ['salma', '1500.5', `${number}-2`],
    ]);
    for (const payment of h.payments) {
      expect(payment).toMatchObject({ familyReceiptId: 'family', paymentMethod: 'cash', paymentDate: '2026-11-12',
        autoAllocate: false, keepRemainderAsCredit: false });
    }
    expect(result).toMatchObject({ id: 'family', receiptNumber: number, amount: '3000.50', status: 'completed' });
    expect(result.payments).toHaveLength(2);
    expect(h.emitted).toEqual([['payment.recorded', 'amine'], ['payment.recorded', 'salma']]);
  });

  it('refuses a child who is not linked to the parent before writing anything', async () => {
    const h = recordHarness({ linked: ['amine'] });
    await expect(h.service.recordFamily(createFamilyPaymentDto.parse(input), 'cashier'))
      .rejects.toThrow('linked to this parent');
    expect(h.receipts).toEqual([]);
    expect(h.payments).toEqual([]);
  });

  it('refuses an unknown parent', async () => {
    const h = recordHarness({ parentExists: false });
    await expect(h.service.recordFamily(createFamilyPaymentDto.parse(input), 'cashier')).rejects.toThrow('Parent not found');
    expect(h.receipts).toEqual([]);
  });

  it('checks the one cheque against each child it pays for', async () => {
    const h = recordHarness();
    await h.service.recordFamily(createFamilyPaymentDto.parse({
      ...input, paymentMethod: 'check', checkNumber: 'CH-77', checkDueDate: '2026-11-30',
    }), 'cashier');
    expect(h.checks).toEqual(['amine:CH-77', 'salma:CH-77']);
    expect(h.payments.map((payment) => payment.checkNumber)).toEqual(['CH-77', 'CH-77']);
  });

  it('replays a retried request instead of recording it twice', async () => {
    const key = '00000000-0000-4000-8000-000000000042';
    const body = createFamilyPaymentDto.parse({ ...input, idempotencyKey: key });
    const existing = { id: 'earlier', receiptNumber: 'RCP-1', idempotencyKey: key, idempotencyHash: computeFamilyIdempotencyHash(body) };
    const h = recordHarness({ existing });
    const result = await h.service.recordFamily(body, 'cashier');
    expect(result.id).toBe('earlier');
    expect(h.receipts).toEqual([]);
    expect(h.payments).toEqual([]);
  });

  it('refuses a key already used for a different family payment', async () => {
    const key = '00000000-0000-4000-8000-000000000043';
    const h = recordHarness({ existing: { id: 'earlier', idempotencyKey: key, idempotencyHash: 'another payload' } });
    await expect(h.service.recordFamily(createFamilyPaymentDto.parse({ ...input, idempotencyKey: key }), 'cashier'))
      .rejects.toThrow('idempotency key');
    expect(h.payments).toEqual([]);
  });
});

function familyHarness(paymentMethod = 'check', status = 'pending') {
  const rows: Record<string, any> = {
    p1: { id: 'p1', studentId: 'amine', familyReceiptId: 'family', receiptNumber: 'RCP-F-1', paymentMethod, status, amount: '1500', checkNumber: 'CH-1' },
    p2: { id: 'p2', studentId: 'salma', familyReceiptId: 'family', receiptNumber: 'RCP-F-2', paymentMethod, status, amount: '1500', checkNumber: 'CH-1' },
    alone: { id: 'alone', studentId: 'adam', familyReceiptId: null, receiptNumber: 'RCP-A', paymentMethod, status, amount: '900', checkNumber: 'CH-9' },
  };
  const writes: Array<[string, any]> = [];
  const locks: string[][] = [];
  const credits: string[] = [];
  const repo = {
    getById: async (id: string) => (rows[id] ? { ...rows[id] } : undefined),
    getByIdForUpdate: async (id: string) => (rows[id] ? { ...rows[id] } : null),
    getFamilyMemberIdsForUpdate: async (familyReceiptId: string) => {
      const ids = Object.values(rows).filter((row) => row.familyReceiptId === familyReceiptId).map((row) => row.id).sort();
      locks.push(ids);
      return ids;
    },
    update: async (id: string, data: any) => {
      writes.push([id, data]);
      rows[id] = { ...rows[id], ...data };
      return { ...rows[id] };
    },
    findDuplicateCheckUnderLock: async () => null,
  };
  const validator = withEnglishMessages(new PaymentValidator(repo as any, {} as any, {} as any, {} as any, {} as any, {} as any));
  Object.assign(validator, { checkExists: async (id: string) => rows[id] });
  const credit = {
    cancelCreditForSourcePayment: async (id: string) => { credits.push(`cancel:${id}`); },
    activateCreditForSourcePayment: async (id: string) => { credits.push(`activate:${id}`); },
  };
  const service = new PaymentService(repo as any, validator, {} as any, { getByPaymentId: async () => [] } as any,
    { recalcFinancialsByStudent: async () => {} } as any, {} as any, { record: async () => {} } as any, credit as any);
  Object.assign(service, { events });
  return { service, rows, writes, locks, credits };
}

describe('acting on a payment that belongs to a family receipt', () => {
  it('voids every child on the receipt, not only the one opened', async () => {
    const h = familyHarness('cash', 'completed');
    const result = await h.service.voidPayment('p2', { reason: 'Wrong month' }, 'cashier');
    expect(result.id).toBe('p2');
    expect(h.rows.p1.status).toBe('voided');
    expect(h.rows.p2.status).toBe('voided');
    expect(h.rows.alone.status).toBe('completed');
    expect(h.locks).toEqual([['p1', 'p2']]);
    expect(h.credits).toEqual(['cancel:p1', 'cancel:p2']);
  });

  it('bounces the one cheque for every child', async () => {
    const h = familyHarness('check', 'deposited');
    await h.service.updateCheckStatus('p1', { status: 'bounced', reason: 'No funds' }, 'cashier');
    expect([h.rows.p1.status, h.rows.p2.status]).toEqual(['bounced', 'bounced']);
    expect(h.rows.p2.bouncedReason).toBe('No funds');
  });

  it('refunds the whole receipt', async () => {
    const h = familyHarness('cash', 'completed');
    await h.service.refund('p1', 'Left the school', 'cashier');
    expect([h.rows.p1.status, h.rows.p2.status]).toEqual(['refunded', 'refunded']);
  });

  it('applies an edit to every child but keeps each payment its own number', async () => {
    const h = familyHarness('check', 'pending');
    await h.service.update('p1', { checkNumber: 'CH-2', receiptNumber: 'RCP-F-1', notes: 'Corrected' }, 'cashier');
    expect([h.rows.p1.checkNumber, h.rows.p2.checkNumber]).toEqual(['CH-2', 'CH-2']);
    expect([h.rows.p1.receiptNumber, h.rows.p2.receiptNumber]).toEqual(['RCP-F-1', 'RCP-F-2']);
    expect(h.writes.every(([, data]) => !('receiptNumber' in data))).toBe(true);
  });

  it('refuses replacing the family cheque with cash, and renumbering one payment', async () => {
    const h = familyHarness('check', 'pending');
    await expect(h.service.update('p1', { paymentMethod: 'cash' }, 'cashier')).rejects.toThrow('void the family receipt');
    await expect(h.service.update('p2', { receiptNumber: 'RCP-NEW' }, 'cashier')).rejects.toThrow('cannot be changed');
    expect(h.writes).toEqual([]);
  });

  it('leaves a payment on no family receipt to change alone', async () => {
    const h = familyHarness('cash', 'completed');
    await h.service.voidPayment('alone', { reason: 'Duplicate' }, 'cashier');
    expect(h.rows.alone.status).toBe('voided');
    expect([h.rows.p1.status, h.rows.p2.status]).toEqual(['completed', 'completed']);
    expect(h.locks).toEqual([]);
  });
});

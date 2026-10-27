import { describe, expect, it } from 'bun:test';
import { buildFeeImport, isFeeReport } from '@/features/Financial/Fees/config/feeImport';

const students = [{ id: 'st1', studentCode: 'F001' }];
const types = [
  { id: 'tuition', name: 'Tuition', labels: { fr: 'Scolarité', ar: 'التمدرس' }, paymentType: 'recurring', amount: '400' },
  { id: 'registration', name: 'Registration', paymentType: 'oneTime', amount: '200' },
];
const year = '2026-2027';
const t = (key: string) => key;
const build = (rows: Record<string, unknown>[]) => buildFeeImport(rows, students, types, year, t);

describe('fee assignment import', () => {
  it('retains the source admission date for the explicit date review and rejects invalid dates', () => {
    const result = build([{ studentCode: 'F001', enrollmentDate: '2026-09-01', fees: [], payments: [] }]);
    expect(result.students[0].enrollmentDate).toBe('2026-09-01');
    expect(result.students[0]).not.toHaveProperty('dateCorrection');
    expect(build([{ studentCode: 'F001', enrollmentDate: '2026-02-30', fees: [] }]).problems[0].message).toBe('fees.import.invalidDate');
  });
  it('identifies summary and detail reports before matching their obsolete student codes', () => {
    const summary = [{ studentCode: 'fake_0001', name: 'Student', 'Total due': 11000, 'Total paid': 3000, Remaining: 8000 }];
    expect(isFeeReport(summary)).toBe(true);
    expect(build(summary)).toMatchObject({ fees: [], students: [], problems: [{ row: 2, message: 'fees.import.reportFile' }] });
    expect(isFeeReport([{ studentCode: 'F001', item: 'Sep', service: 'Tuition', due: 400, paid: 200, remaining: 200 }])).toBe(true);
    expect(isFeeReport([{ studentCode: 'F001', feeTypeId: 'tuition', 'Total due': 400, 'Total paid': 200, Remaining: 200 }])).toBe(false);
    expect(isFeeReport([{ studentCode: 'F001', fees: [], payments: [] }])).toBe(false);
  });
  it('imports nested charges and groups receipt lines into one payment with multiple allocations', () => {
    const line = { receiptNumber: '40/26', myskoolPlusReceipt: '40 /26', paymentDate: '2026-08-24', paymentMethod: 'bankTransfer' as const };
    const result = build([{ studentCode: 'F001', fees: [
      { feeTypeId: 'tuition', schedule: 'oneTime', baseAmount: 400, effectiveDate: '2026-09-01' },
      { feeTypeId: 'tuition', schedule: 'oneTime', baseAmount: 450, effectiveDate: '2026-10-01' },
    ], payments: [
      { ...line, feeTypeId: 'tuition', month: '2026-09', amount: 400 },
      { ...line, feeTypeId: 'tuition', month: '2026-10', amount: 200 },
    ] }]);
    expect(result.problems).toEqual([]);
    expect(result.students[0].fees).toHaveLength(2);
    expect(result.students[0].payments).toEqual([{ ...line, allocations: [
      { feeTypeId: 'tuition', month: '2026-09', amount: 400 },
      { feeTypeId: 'tuition', month: '2026-10', amount: 200 },
    ] }]);
  });

  it('uses the receipt date for an unknown cheque due date and preserves the requested notes', () => {
    const result = build([{ studentCode: 'F001', fees: [], payments: [{
      receiptNumber: '2/26', paymentDate: '2026-09-01', paymentMethod: 'check', feeTypeId: 'tuition', month: '2027-06', amount: 50,
    }] }]);
    expect(result.problems).toEqual([]);
    expect(result.students[0].payments[0]).toMatchObject({ checkNumber: 'NON SAISI', checkDueDate: '2026-09-01',
      notes: 'Échéance non connue (reprise MyskoolPlus)\nN° de chèque non saisi dans MyskoolPlus' });
  });

  it('keeps the day a cheque was cashed, only for a cheque and never before it was received', () => {
    const cheque = { receiptNumber: '3/26', paymentDate: '2026-09-02', paymentMethod: 'check', checkNumber: '252',
      feeTypeId: 'tuition', month: '2026-09', amount: 50 };
    const result = build([{ studentCode: 'F001', fees: [], payments: [{ ...cheque, settledDate: '2026-09-02' }] }]);
    expect(result.problems).toEqual([]);
    expect(result.students[0].payments[0]).toMatchObject({ checkNumber: '252', settledDate: '2026-09-02' });
    expect(build([{ studentCode: 'F001', fees: [], payments: [cheque] }]).students[0].payments[0].settledDate).toBeUndefined();
    for (const wrong of [{ settledDate: '2026-09-01' }, { settledDate: '2026-02-30' }, { paymentMethod: 'cash', settledDate: '2026-09-02' }]) {
      expect(build([{ studentCode: 'F001', fees: [], payments: [{ ...cheque, ...wrong }] }]).problems[0].message).toBe('fees.import.invalidPayment');
    }
  });

  it('refuses missing receipt metadata and contradictory details for one receipt', () => {
    const line = { receiptNumber: '40/26', paymentDate: '2026-09-01', paymentMethod: 'cash', feeTypeId: 'tuition', month: '2026-09', amount: 50 };
    expect(build([{ studentCode: 'F001', fees: [], payments: [line, { ...line, paymentMethod: 'debitCard' }] }]).problems[0].message)
      .toBe('fees.import.receiptConflict');
    expect(build([{ studentCode: 'F001', fees: [], payments: [{ ...line, receiptNumber: '' }] }]).problems[0].message)
      .toBe('fees.import.invalidPayment');
    expect(build([{ studentCode: 'F001', fees: [], payments: [{ ...line, amount: [50] }] }]).problems[0].message)
      .toBe('fees.import.invalidPayment');
    const crossStudent = buildFeeImport([{ studentCode: 'F001', fees: [], payments: [line] },
      { studentCode: 'F002', fees: [], payments: [line] }], [...students, { id: 'st2', studentCode: 'F002' }], types, year, t);
    expect(crossStudent.problems[0].message).toBe('fees.import.receiptConflict');
  });
  it('matches student codes and translated catalog names, using catalog defaults', () => {
    const result = build([{ studentCode: ' f001 ', feeType: 'التمدرس' }]);
    expect(result.problems).toEqual([]);
    expect(result.fees[0]).toMatchObject({ studentId: 'st1', feeTypeId: 'tuition', academicYear: year, schedule: 'monthly', baseAmount: 400, discountAmount: 0 });
    expect(build([{ studentCode: 'F001', feeTypeId: 'registration' }]).fees[0].schedule).toBe('oneTime');
  });

  it('accepts explicit assignment details and strips balances, payment status and actors', () => {
    const result = build([{ studentCode: 'F001', feeTypeId: 'tuition', schedule: 'quarterly', baseAmount: '500',
      discountAmount: '50', effectiveDate: '2026-10-01', notes: 'Sibling discount', status: 'paid', paidAmount: 9999, assignedBy: 'other' }]);
    expect(result.problems).toEqual([]);
    expect(result.fees[0]).toMatchObject({ schedule: 'quarterly', baseAmount: 500, discountAmount: 50, effectiveDate: '2026-10-01' });
    expect(result.fees[0]).not.toHaveProperty('paidAmount');
    expect(result.fees[0]).not.toHaveProperty('status');
    expect(result.fees[0]).not.toHaveProperty('assignedBy');
  });

  it('reports missing and unknown students and fee types with spreadsheet row numbers', () => {
    expect(build([
      { studentCode: 'missing', feeTypeId: 'tuition' },
      { studentCode: 'F001', feeType: 'missing' },
      { studentCode: 'F001' },
    ]).problems).toEqual([
      { row: 2, message: 'fees.import.unknownStudent' },
      { row: 3, message: 'fees.import.unknownFeeType' },
      { row: 4, message: 'fees.import.unknownFeeType' },
    ]);
  });

  it('refuses ambiguous catalog names instead of assigning an arbitrary type', () => {
    const result = buildFeeImport([{ studentCode: 'F001', feeType: 'Tuition' }], students,
      [...types, { ...types[0], id: 'other-tuition' }], year, t);
    expect(result.fees).toEqual([]);
    expect(result.problems[0].message).toBe('fees.import.unknownFeeType');
  });

  it('refuses another year, impossible dates and duplicate assignments', () => {
    const result = build([
      { studentCode: 'F001', feeTypeId: 'tuition', academicYear: '2025-2026' },
      { studentCode: 'F001', feeTypeId: 'tuition', effectiveDate: '2026-02-30' },
      { studentCode: 'F001', feeTypeId: 'tuition' },
      { studentCode: 'f001', feeType: 'Scolarité' },
    ]);
    expect(result.problems.map(problem => problem.message)).toEqual(['fees.import.wrongYear', 'fees.import.invalidDate', 'fees.import.duplicate']);
  });

  it('refuses invalid amounts, discounts, schedules and non-scalar fields', () => {
    for (const detail of [{ baseAmount: '-1' }, { baseAmount: 'abc' }, { discountAmount: '401' },
      { discountAmount: '-1' }, { schedule: 'weekly' }, { baseAmount: { value: 500 } }]) {
      const result = build([{ studentCode: 'F001', feeTypeId: 'tuition', ...detail }]);
      expect(result.fees).toEqual([]);
      expect(result.problems).toHaveLength(1);
    }
  });
});

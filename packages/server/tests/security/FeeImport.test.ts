import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { buildImportedFeePlan, sameImportedSchedule } from '../../src/modules/financial/fees/feeImportPlan';
import { importStudentFeesDto, importStudentFeesWithDatesDto } from '../../src/modules/financial/fees/FeeImportDto';
import { importedEnrollmentDates } from '../../src/modules/studentEnrollments/importEnrollmentDates';
import { StudentEnrollmentValidator } from '../../src/modules/studentEnrollments/StudentEnrollmentValidator';
import { withEnglishMessages } from '../support/englishMessages';
import { FeeController } from '../../src/modules/financial/fees/FeeController';
import { getGuardMetadata } from 'najm-guard';

const context = { academicYear: '2026-2027', enrollmentDate: '2026-09-01', startMonth: 'september', endMonth: 'june', paymentType: 'recurring', defaultAmount: 400 };
const fee = { feeTypeId: 'tuition', schedule: 'oneTime', baseAmount: 400, effectiveDate: '2026-09-01' };
describe('financial import schedules and transport validation', () => {
  it('restores source dates earlier than import day without postponing existing history', () => {
    expect(importedEnrollmentDates('2026-09-01', '2026-10-26', { enrolledOn: '2026-10-26' }, '2026-09-01'))
      .toEqual({ admissionDate: '2026-09-01', yearEnrolledOn: '2026-09-01', changed: true });
    expect(importedEnrollmentDates('2025-08-20', '2026-10-26', { enrolledOn: '2026-10-26' }, '2026-09-01'))
      .toEqual({ admissionDate: '2025-08-20', yearEnrolledOn: '2026-09-01', changed: true });
    expect(importedEnrollmentDates('2026-10-01', '2025-09-01', { enrolledOn: '2026-09-01' }, '2026-09-01'))
      .toEqual({ admissionDate: '2025-09-01', yearEnrolledOn: '2026-09-01', changed: false });
  });
  it('requires unchanged admission state and a simple initial enrollment for bulk date correction', () => {
    const validator = withEnglishMessages(new StudentEnrollmentValidator());
    const state = { enrolledOn: '2026-10-26', leftOn: null, status: 'active' as const,
      placements: [{ id: 'p1', classId: 'c1', sectionId: 's1', validFrom: '2026-10-26', validTo: null }] };
    expect(() => validator.ensureImportDatesEditable(state, '2026-09-01')).not.toThrow();
    expect(() => validator.ensureImportDatesEditable({ ...state, placements: [state.placements[0], { ...state.placements[0], id: 'p2' }] }, '2026-09-01')).toThrow();
    expect(() => validator.ensureImportDatesEditable({ ...state, leftOn: '2026-11-01' }, '2026-09-01')).toThrow();
    expect(() => validator.ensureImportAdmissionUnchanged('2026-10-25', '2026-10-26')).toThrow();
    expect(() => validator.ensureCorrectionAllowed('accounting')).toThrow();
    const body = { studentId: 's1', enrollmentDate: '2026-09-01', fees: [], payments: [],
      dateCorrection: { enrollmentId: 'e1', expectedAdmissionDate: '2026-10-26', expected: state } };
    expect(importStudentFeesWithDatesDto.safeParse(body).success).toBe(true);
    expect(importStudentFeesWithDatesDto.safeParse({ ...body, dateCorrection: undefined }).success).toBe(false);
    expect(importStudentFeesDto.parse(body)).not.toHaveProperty('dateCorrection');
  });
  it('preserves different monthly amounts and does not invent a missing month', () => {
    const plan = buildImportedFeePlan([fee, { ...fee, baseAmount: 450, effectiveDate: '2026-11-01' }], context);
    expect(plan.netAmount).toBe('850.00');
    expect(plan.schedule).toBe('monthly');
    expect(plan.installments.map(item => [item.number, item.dueDate, item.amount])).toEqual([[1, '2026-09-01', 400], [2, '2026-11-01', 450]]);
    expect(sameImportedSchedule(plan.installments, plan.installments)).toBe(true);
    expect(sameImportedSchedule([{ ...plan.installments[0], amount: 399 }, plan.installments[1]], plan.installments)).toBe(false);
  });
  it('expands normal monthly charges to June and preserves the per-period discount', () => {
    const plan = buildImportedFeePlan([{ ...fee, schedule: 'monthly', discountAmount: 50 }], context);
    expect(plan.installments).toHaveLength(10);
    expect(plan.netAmount).toBe('3500.00');
    expect(plan.discountAmount).toBe('500.00');
    expect(plan.installments.at(-1)?.dueDate).toBe('2027-06-01');
  });
  it('rejects overlapping charges instead of silently double billing', () => {
    expect(() => buildImportedFeePlan([fee, fee], context)).toThrow('overlappingCharges');
    expect(() => buildImportedFeePlan([{ ...fee, schedule: 'monthly' }, fee], context)).toThrow('overlappingCharges');
    expect(() => buildImportedFeePlan([{ ...fee, effectiveDate: '2026-08-01' }], context)).toThrow();
  });
  it('rejects malformed payment metadata and never accepts status or an acting user from a file', () => {
    const body = { studentId: 's1', fees: [fee], payments: [{ receiptNumber: '1', paymentDate: '2026-09-01', paymentMethod: 'cash',
      allocations: [{ feeTypeId: 'tuition', month: '2026-09', amount: 50 }] }] };
    expect(importStudentFeesDto.safeParse(body).success).toBe(true);
    expect(importStudentFeesDto.safeParse({ ...body, payments: [{ ...body.payments[0], paymentDate: '2026-02-30' }] }).success).toBe(false);
    expect(importStudentFeesDto.safeParse({ ...body, payments: [{ ...body.payments[0], paymentMethod: 'invalid' }] }).success).toBe(false);
    expect(importStudentFeesDto.parse({ ...body, assignedBy: 'untrusted', payments: [{ ...body.payments[0], status: 'completed', processedBy: 'untrusted' }] }).payments[0])
      .not.toHaveProperty('processedBy');
  });
  it('accepts the day a cheque was cashed, only for a cheque received by then', () => {
    const cheque = { receiptNumber: '1', paymentDate: '2026-09-02', paymentMethod: 'check', settledDate: '2026-09-02',
      allocations: [{ feeTypeId: 'tuition', month: '2026-09', amount: 50 }] };
    const body = (payment: Record<string, unknown>) => ({ studentId: 's1', fees: [fee], payments: [{ ...cheque, ...payment }] });
    expect(importStudentFeesDto.parse(body({})).payments[0].settledDate).toBe('2026-09-02');
    expect(importStudentFeesDto.safeParse(body({ settledDate: '2026-09-01' })).success).toBe(false);
    expect(importStudentFeesDto.safeParse(body({ paymentMethod: 'cash' })).success).toBe(false);
  });
  it('requires fee and payment creation permissions, and the right to settle a cheque', () => {
    const metadata = JSON.stringify(getGuardMetadata(FeeController, 'importStudentFees'));
    expect(metadata).toContain('create:fees');
    expect(metadata).toContain('create:payments');
    expect(metadata).toContain('update:fees');
    expect(metadata).toContain('update:payments');
    expect(JSON.stringify(getGuardMetadata(FeeController, 'importStudentFeesWithDates'))).toContain('update:students');
    expect(JSON.stringify(getGuardMetadata(FeeController, 'importStudentFeesWithDates'))).toContain('update:payments');
  });
});

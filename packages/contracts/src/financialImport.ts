import type { PaymentMethod, Schedule } from './enums';

export interface FinancialImportDateCorrection {
  enrollmentId: string;
  expectedAdmissionDate: string;
  expected: {
    enrolledOn: string;
    leftOn: string | null;
    status: 'active' | 'withdrawn' | 'graduated' | 'transferred';
    placements: Array<{ id: string; classId: string; sectionId: string; validFrom: string; validTo: string | null }>;
  };
}

export interface FinancialImportDatePreview {
  studentId: string;
  studentCode: string;
  name: string;
  admissionDate: string;
  yearEnrolledOn: string;
  correction: FinancialImportDateCorrection;
}

/** One existing student's charges and receipts, saved as one transaction. */
export interface StudentFinancialImport {
  studentId: string;
  enrollmentDate?: string;
  dateCorrection?: FinancialImportDateCorrection;
  fees: Array<{
    feeTypeId: string;
    schedule: Schedule;
    academicYear?: string;
    baseAmount?: number;
    discountAmount?: number;
    effectiveDate?: string | null;
    discountReason?: string | null;
    notes?: string | null;
  }>;
  payments: Array<{
    receiptNumber: string;
    myskoolPlusReceipt?: string;
    paymentDate: string;
    paymentMethod: PaymentMethod;
    checkNumber?: string;
    checkDueDate?: string;
    /** A cheque the source already cashed: recorded as completed on this day instead of pending. */
    settledDate?: string;
    notes?: string;
    allocations: Array<{ feeTypeId: string; month: string; amount: number }>;
  }>;
}

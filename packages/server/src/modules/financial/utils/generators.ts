import { nanoid } from 'nanoid';

/**
 * Generate unique receipt number
 * Format: RCP-YYYYMMDD-XXXXXXXXXX
 */
export function generateReceiptNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const datePart = `${year}${month}${day}`;
  const random = nanoid(10).toUpperCase();

  return `RCP-${datePart}-${random}`;
}

/**
 * Generate unique transaction reference
 * Format: TXN-YYYYMMDD-XXXXXXXXXX
 */
export function generateTransactionRef(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const datePart = `${year}${month}${day}`;
  const random = nanoid(10).toUpperCase();

  return `TXN-${datePart}-${random}`;
}

/**
 * Generate unique invoice number
 * Format: INV-YYYYMMDD-XXXXXXXXXX
 */
export function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const datePart = `${year}${month}${day}`;
  const random = nanoid(10).toUpperCase();

  return `INV-${datePart}-${random}`;
}

/**
 * Generate unique payment reference
 * Format: PAY-YYYYMMDD-XXXXXXXXXX
 */
export function generatePaymentRef(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const datePart = `${year}${month}${day}`;
  const random = nanoid(10).toUpperCase();

  return `PAY-${datePart}-${random}`;
}

/**
 * Generate unique payslip number
 * Format: PSL-YYYYMM-XXXXXXXXXX (anchored to the payroll period)
 */
export function generatePayslipNumber(period?: string): string {
  const datePart = (period || new Date().toISOString().slice(0, 7)).replace(/-/g, '');
  const random = nanoid(10).toUpperCase();

  return `PSL-${datePart}-${random}`;
}

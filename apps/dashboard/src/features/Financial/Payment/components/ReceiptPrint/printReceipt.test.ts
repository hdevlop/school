import { afterEach, expect, it } from 'bun:test';
import { buildReceiptHtml, printReceipt, type ReceiptData } from './printReceipt';

const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'window', original);
  else Reflect.deleteProperty(globalThis, 'window');
});
const input: ReceiptData = { receiptNumber: '001', paymentDate: '2026-10-03', studentName: 'élève طالب', studentCode: 'S001', amount: 100, currency: 'MAD', paymentMethod: 'cash' };

it('SEC-003 renders all receipt data as escaped text, including invalid dates and fallback methods', () => {
  const canary = '<b>"élève طالب" & \'canary\'</b>\nSecond line';
  const fields = ['receiptNumber', 'paymentDate', 'studentName', 'studentCode', 'schoolName', 'schoolAddress', 'schoolPhone', 'feeYear', 'transactionRef', 'checkNumber', 'notes', 'processedBy', 'paymentMethod'] as const;
  for (const field of fields) {
    const html = buildReceiptHtml({ ...input, [field]: canary, yearAllocatedAmount: 100 });
    expect(html).toContain('&lt;b&gt;&quot;élève طالب&quot; &amp; &#39;canary&#39;&lt;/b&gt;\nSecond line');
    expect(html).not.toContain(canary);
    expect(html).toContain('white-space: pre-wrap');
  }
});
it('SEC-003 forwards escaped content into the actual print window', () => {
  const writes: string[] = [];
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    open: () => ({ document: { write: (html: string) => writes.push(html), close() {} } }),
  } });
  printReceipt({ ...input, notes: '<script>canary</script>' });
  expect(writes).toHaveLength(1);
  expect(writes[0]).toContain('&lt;script&gt;canary&lt;/script&gt;');
  expect(writes[0]).not.toContain('<script>canary</script>');
});

import { describe, expect, it } from 'bun:test';
import { buildReceiptHtml, type ReceiptData } from './printReceipt';

const receipt: ReceiptData = {
  receiptNumber: 'R-1',
  paymentDate: '2026-07-10',
  studentName: 'Amina',
  studentCode: 'S-1',
  amount: 500,
  currency: 'MAD',
  paymentMethod: 'cash',
};

describe('payment receipt print data', () => {
  it('keeps the full receipt amount and names its selected fee-year portion', () => {
    const html = buildReceiptHtml({ ...receipt, feeYear: '2025-2026', yearAllocatedAmount: 300 });
    const money = (amount: number) => new Intl.NumberFormat('fr-MA', {
      style: 'currency', currency: 'MAD',
    }).format(amount);

    expect(html).toContain(`<div class="amount-figure">${money(500)}</div>`);
    expect(html).toContain('<td>2025-2026</td>');
    expect(html).toContain(`<td>${money(300)}</td>`);
    expect(html).toContain('10 juillet 2026');
  });

  it('leaves an all-year receipt free of a selected-year allocation', () => {
    const html = buildReceiptHtml(receipt);
    expect(html).not.toContain('Affecté à cette année');
    expect(html).not.toContain('Année scolaire');
  });
});

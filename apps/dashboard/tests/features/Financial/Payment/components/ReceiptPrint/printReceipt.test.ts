import { afterEach, expect, it } from 'bun:test';
import { buildReceiptHtml, printReceipt, type ReceiptData } from '@/features/Financial/Payment/components/ReceiptPrint/printReceipt';

const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'window', original);
  else Reflect.deleteProperty(globalThis, 'window');
});
const input: ReceiptData = { receiptNumber: '001', paymentDate: '2026-10-03', studentName: 'élève طالب', studentCode: 'S001', amount: 100, currency: 'MAD', paymentMethod: 'cash' };

it('keeps processor email off the receipt even when an older caller supplies it', () => {
  const legacyInput = { ...input, processedBy: 'admin@admin.com' };
  const html = buildReceiptHtml(legacyInput);
  expect(html).not.toContain('admin@admin.com');
  expect(html).not.toContain('Encaissé par');
});

it('SEC-003 renders all receipt data as escaped text, including invalid dates and fallback methods', () => {
  const canary = '<b>"élève طالب" & \'canary\'</b>\nSecond line';
  const fields = ['receiptNumber', 'paymentDate', 'studentName', 'studentCode', 'schoolName', 'schoolAddress', 'schoolPhone', 'feeYear', 'transactionRef', 'checkNumber', 'notes', 'paymentMethod'] as const;
  for (const language of ['fr', 'ar'] as const) for (const field of fields) {
    const html = buildReceiptHtml({ ...input, language, [field]: canary, yearAllocatedAmount: 100 });
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

it('keeps the full payment distinct from its allocation to a school year', () => {
  const html = buildReceiptHtml({ ...input, amount: 1500, feeYear: '2025-2026', yearAllocatedAmount: 500 });
  const money = (amount: number) => new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(amount);
  expect(html).toContain(`class="amount-figure" dir="ltr">${money(1500)}`);
  expect(html).toContain('2025-2026');
  expect(html).toContain(money(500));
  expect(html).toContain('Affecté à cette année');
});

it('shows an available school year even when an allocation amount is absent', () => {
  const html = buildReceiptHtml({ ...input, feeYear: '2025-2026' });
  expect(html).toContain('2025-2026');
  expect(html).not.toContain('Affecté à cette année');
});

it('prints a French receipt by default, without Arabic receipt labels', () => {
  const html = buildReceiptHtml(input);
  expect(html).toContain('<html lang="fr" dir="ltr">');
  expect(html).toContain('REÇU DE PAIEMENT');
  expect(html).toContain('Espèces');
  expect(html).toContain('Veuillez conserver ce reçu.');
  expect(html).not.toContain('طريقة الأداء');
  expect(html).not.toContain('وصل أداء');
});

it('prints an Arabic receipt in RTL, with localized dates and amounts and no French receipt labels', () => {
  const html = buildReceiptHtml({ ...input, language: 'ar', feeYear: '2025-2026', yearAllocatedAmount: 50 });
  expect(html).toContain('<html lang="ar" dir="rtl">');
  expect(html).toContain('وصل أداء');
  expect(html).toContain('نقداً');
  expect(html).toContain('المخصص لهذه السنة');
  expect(html).toContain('يرجى الاحتفاظ بهذا الوصل.');
  expect(html).toContain(new Intl.NumberFormat('ar-MA', { style: 'currency', currency: 'MAD', numberingSystem: 'latn' }).format(100));
  expect(html).toContain(new Intl.NumberFormat('ar-MA', { style: 'currency', currency: 'MAD', numberingSystem: 'latn' }).format(50));
  expect(html).not.toContain('REÇU DE PAIEMENT');
  expect(html).not.toContain('Espèces');
  expect(html).not.toContain('dirhams');
});

it('preserves mixed-script student names and isolates receipt identifiers in both layouts', () => {
  for (const language of ['fr', 'ar'] as const) {
    const html = buildReceiptHtml({ ...input, language });
    expect(html).toContain(`<p class="student-name" dir="auto">${input.studentName}</p>`);
    expect(html).toContain('<bdi dir="ltr">001</bdi>');
    expect(html).toContain('<bdi dir="ltr">S001</bdi>');
  }
});

it('accepts the print logo while rejecting executable and protocol-relative URLs', () => {
  expect(buildReceiptHtml({ ...input, schoolLogo: '/images/branding/school-logo-monochrome.png' }))
    .toContain('src="/images/branding/school-logo-monochrome.png"');
  for (const schoolLogo of ['javascript:alert(1)', '//untrusted.example/logo.png', 'data:image/svg+xml,<svg onload=alert(1)>']) {
    expect(buildReceiptHtml({ ...input, schoolLogo })).not.toContain('<img');
  }
});

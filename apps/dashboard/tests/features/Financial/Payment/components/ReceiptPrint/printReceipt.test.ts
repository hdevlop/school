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
    open: () => ({ document: { write: (html: string) => writes.push(html), close() {}, images: [] }, focus() {}, print() {} }),
  } });
  printReceipt({ ...input, notes: '<script>canary</script>' });
  expect(writes).toHaveLength(1);
  expect(writes[0]).toContain('&lt;script&gt;canary&lt;/script&gt;');
  expect(writes[0]).not.toContain('<script>canary</script>');
});

// The page's CSP allows only nonce-bearing scripts, and the receipt window
// inherits it: the inline print script was blocked, so no print dialog opened.
it('prints from the opener, with no script in the receipt, after the logo settles', () => {
  const html = buildReceiptHtml({ ...input, schoolLogo: '/logo.png' });
  expect(html).not.toContain('<script');
  const listeners: Record<string, () => void> = {};
  const logo = { complete: false, addEventListener: (type: string, fn: () => void) => { listeners[type] = fn; } };
  let printed = 0;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    open: () => ({ document: { write() {}, close() {}, images: [logo] }, focus() {}, print: () => { printed += 1; } }),
  } });
  printReceipt({ ...input, schoolLogo: '/logo.png' });
  expect(printed).toBe(0);
  listeners.error();
  expect(printed).toBe(1);
});

it('keeps the full payment distinct from its allocation to a school year', () => {
  const html = buildReceiptHtml({ ...input, amount: 1500, feeYear: '2025-2026', yearAllocatedAmount: 500 });
  const money = (amount: number) => `${new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(amount)}\u00a0dh`;
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

it('uses the receipt language for translated fee names, escapes them and falls back when absent', () => {
  const item = { feeType: 'Saved name', feeTypeLabels: { fr: 'Restaurant <CM1>', ar: 'رسوم المطعم المدرسي' }, academicYear: '2026-2027', amount: 100, remainingAmount: 0 };
  expect(buildReceiptHtml({ ...input, items: [item] })).toContain('Restaurant &lt;CM1&gt;');
  const arabic = buildReceiptHtml({ ...input, language: 'ar', items: [item] });
  expect(arabic).toContain('رسوم المطعم المدرسي');
  expect(arabic).not.toContain('Restaurant');
  expect(buildReceiptHtml({ ...input, language: 'ar', items: [{ ...item, feeTypeLabels: null }] })).toContain('Saved name');
});

it('prints an Arabic receipt in RTL, with localized dates and amounts and no French receipt labels', () => {
  const html = buildReceiptHtml({ ...input, language: 'ar', feeYear: '2025-2026', yearAllocatedAmount: 50 });
  expect(html).toContain('<html lang="ar" dir="rtl">');
  expect(html).toContain('وصل أداء');
  expect(html).toContain('نقداً');
  expect(html).toContain('المخصص لهذه السنة');
  expect(html).toContain('يرجى الاحتفاظ بهذا الوصل.');
  expect(html).toContain('100\u00a0dh');
  expect(html).toContain('50\u00a0dh');
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

it('prints each fee type, its payment portion and installment balance in both languages', () => {
  for (const language of ['fr', 'ar'] as const) {
    const html = buildReceiptHtml({ ...input, language, amount: 150, items: [
      { feeType: 'Scolarité <CM1>', academicYear: '2025-2026', amount: 100, remainingAmount: 250 },
      { feeType: 'Transport', academicYear: '2026-2027', amount: 50, remainingAmount: 0 },
    ] });
    const money = (amount: number) => `${new Intl.NumberFormat(language === 'ar' ? 'ar-MA' : 'fr-MA',
      { maximumFractionDigits: 0, numberingSystem: 'latn' }).format(amount)}\u00a0dh`;
    expect(html).toContain('Scolarité &lt;CM1&gt;');
    expect(html).toContain('Transport');
    expect(html).toContain('2025-2026');
    expect(html).toContain('2026-2027');
    for (const amount of [100, 250, 50, 0, 150]) expect(html).toContain(money(amount));
    expect(html).toContain(language === 'ar' ? 'متبقي الأقساط' : 'Reste');
    expect(html).not.toContain(language === 'ar' ? 'Reste' : 'متبقي الأقساط');
    expect(html).not.toContain('class="credit"');
  }
});

it('shows the common school year once and labels only fees from a different year', () => {
  const items = [
    { feeType: 'Tuition', academicYear: '2026-2027', amount: 100, remainingAmount: 0 },
    { feeType: 'Transport', academicYear: '2026-2027', amount: 50, remainingAmount: 0 },
  ];
  const html = buildReceiptHtml({ ...input, amount: 150, items });
  expect(html.match(/2026-2027/g)).toHaveLength(1);
  expect(html).not.toContain('class="fee-year"');
  expect(html.indexOf('2026-2027')).toBeLessThan(html.indexOf('<table'));
  const mixed = buildReceiptHtml({ ...input, amount: 175, items: [
    ...items, { feeType: 'Old tuition', academicYear: '2025-2026', amount: 25, remainingAmount: 0 },
  ] });
  expect(mixed.match(/2026-2027/g)).toHaveLength(1);
  expect(mixed).toContain('class="fee-year" dir="ltr">2025-2026</bdi>');
  const historical = buildReceiptHtml({ ...input, items: [{ ...items[0], academicYear: '2024-2025' }] });
  expect(historical.match(/2024-2025/g)).toHaveLength(1);
  expect(historical).not.toContain('class="fee-year"');
});

it('identifies the paid monthly installments without an extra balance explanation', () => {
  for (const language of ['fr', 'ar'] as const) {
    const html = buildReceiptHtml({ ...input, language, amount: 1920, items: [{
      feeType: 'Tuition', academicYear: '2026-2027', amount: 1920, remainingAmount: 0,
      schedule: 'monthly', dueDates: ['2026-09-01', '2026-10-01'],
    }] });
    const locale = language === 'ar' ? 'ar-MA' : 'fr-MA';
    for (const date of ['2026-09-01', '2026-10-01']) {
      expect(html).toContain(new Date(date).toLocaleDateString(locale, {
        month: 'long', calendar: 'gregory', timeZone: 'UTC',
      }));
    }
    expect(html).not.toContain('balance-note');
    expect(html).toContain('0\u00a0dh');
  }
});

it('lists only full month names without years or ranges', () => {
  const render = (dueDates: string[]) => buildReceiptHtml({ ...input, items: [{
    feeType: 'Tuition', academicYear: '2026-2027', amount: 100, remainingAmount: 0, schedule: 'monthly', dueDates,
  }] });
  expect(render(['2026-10-01', '2026-09-01'])).toContain('class="installment-period">septembre, octobre</span>');
  expect(render(['2027-01-01', '2026-12-01'])).toContain('class="installment-period">décembre, janvier</span>');
  expect(render(['2026-09-01'])).toContain('class="installment-period">septembre</span>');
  const skipped = render(['2026-09-01', '2026-11-01']);
  expect(skipped).toContain('class="installment-period">septembre, novembre</span>');
  expect(skipped).not.toContain('De septembre');
});

it('separates overpayment credit from fee payments, including a credit-only payment', () => {
  const item = { feeType: 'Transport', academicYear: '2026-2027', amount: 90.10, remainingAmount: 0 };
  expect(buildReceiptHtml({ ...input, amount: 100.20, items: [item] }))
    .toContain('Crédit non affecté <bdi>10\u00a0dh');
  expect(buildReceiptHtml({ ...input, items: [] })).toContain('Crédit non affecté <bdi>100\u00a0dh');
});

it('opens the print window before fetching fresh details and prints only after the read succeeds', async () => {
  const events: string[] = [];
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    open: () => { events.push('open'); return { document: {
      write: (html: string) => { expect(html).toContain('Fresh fee'); events.push('write'); },
      close() {}, images: [],
    }, focus() {}, print: () => events.push('print') }; },
  } });
  await printReceipt(input, async () => {
    events.push('load');
    return { ...input, items: [{ feeType: 'Fresh fee', academicYear: '2026-2027', amount: 100, remainingAmount: 30 }] };
  });
  expect(events).toEqual(['open', 'load', 'write', 'print']);
});

it('closes the unused window and does not print an incomplete receipt when the details fail', async () => {
  let closed = false;
  let printed = false;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    open: () => ({ close: () => { closed = true; }, print: () => { printed = true; } }),
  } });
  await expect(printReceipt(input, async () => { throw new Error('Read refused'); })).rejects.toThrow('Read refused');
  expect(closed).toBe(true);
  expect(printed).toBe(false);
});

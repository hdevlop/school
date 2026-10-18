import { amountInWordsFR } from './amountInWords';
import { DEFAULT_RECEIPT_LANGUAGE, type ReceiptLanguage, type Schedule } from '@sms/contracts';
import { ar, fr } from '@sms/contracts/locales';

export interface ReceiptItem {
  feeType: string;
  academicYear: string;
  amount: number;
  remainingAmount: number;
  schedule?: Schedule;
  dueDates?: string[];
}

export interface ReceiptData {
  language?: ReceiptLanguage;
  receiptNumber: string;
  paymentDate: string;
  studentName: string;
  studentCode: string;
  amount: number;
  feeYear?: string;
  yearAllocatedAmount?: number;
  currency: string;
  paymentMethod: string;
  transactionRef?: string;
  checkNumber?: string;
  notes?: string;
  schoolName?: string;
  schoolLogo?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  items?: ReceiptItem[];
}

function formatDate(dateStr: string, locale: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', calendar: 'gregory', numberingSystem: 'latn' });
}

function formatAmount(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, numberingSystem: 'latn' }).format(amount);
}

// FIX: SEC-003 — data stays text even in the hand-written print document.
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]!);
}

function label(text: string): string {
  return `<div class="field-label">${escapeHtml(text)}</div>`;
}

function field(text: string, value: string, direction = 'auto'): string {
  return `<div class="field">${label(text)}<div class="field-value" dir="${direction}">${escapeHtml(value)}</div></div>`;
}

export function buildReceiptHtml(data: ReceiptData) {
  const language = data.language === 'ar' ? 'ar' : DEFAULT_RECEIPT_LANGUAGE;
  const rtl = language === 'ar';
  const direction = rtl ? 'rtl' : 'ltr';
  const locale = rtl ? 'ar-MA' : 'fr-MA';
  const text = (rtl ? ar : fr).paymentReceipt;
  const school = data.schoolName ?? text.schoolFallback;
  const address = data.schoolAddress ?? '';
  const phone = data.schoolPhone ?? '';
  // Only image URLs are accepted; attributes still go through HTML escaping.
  const logo = data.schoolLogo?.trim();
  const logoUrl = logo && /^(https?:\/\/|\/(?!\/))/i.test(logo) ? logo : undefined;
  const methods: Record<string, string> = text.methods;
  const method = Object.hasOwn(methods, data.paymentMethod) ? methods[data.paymentMethod] : data.paymentMethod;
  const amountWords = language === 'fr' && data.currency === 'MAD' ? amountInWordsFR(data.amount) : '';
  const paymentDate = formatDate(data.paymentDate, locale);
  const money = (amount: number) => formatAmount(amount, data.currency, locale);
  const periods = (item: ReceiptItem) => {
    if (!item.dueDates?.length || item.schedule === 'oneTime' || item.schedule === 'annually') return '';
    let dates: string;
    if (item.schedule === 'monthly') {
      const months = [...new Set(item.dueDates.map((date) => date.slice(0, 7)))].sort();
      const labels = months.map((month) => {
        const parsed = new Date(`${month}-01T00:00:00Z`);
        return isNaN(parsed.getTime()) ? month : parsed.toLocaleDateString(locale, {
          month: 'long', calendar: 'gregory', timeZone: 'UTC',
        });
      });
      dates = labels.join(', ');
    } else {
      dates = item.dueDates.map((date) => formatDate(date, locale)).join(', ');
    }
    return `<span class="installment-period">${escapeHtml(dates)}</span>`;
  };
  const items = data.items ?? [];
  const receiptYear = data.feeYear || items.map((item) => item.academicYear).filter(Boolean).sort().at(-1);
  const creditCents = data.items !== undefined
    ? Math.max(0, Math.round(data.amount * 100) - items.reduce((sum, item) => sum + Math.round(item.amount * 100), 0))
    : 0;
  const breakdown = items.length ? `
    <table class="breakdown" aria-label="${escapeHtml(text.details)}">
      <colgroup><col class="fee-column" /><col /><col /></colgroup>
      <thead><tr><th scope="col">${escapeHtml(text.feeType)}</th><th scope="col" class="money">${escapeHtml(text.paid)}</th><th scope="col" class="money">${escapeHtml(text.remaining)}</th></tr></thead>
      <tbody>${items.map((item) => `<tr>
        <td><span class="fee-name" dir="auto">${escapeHtml(item.feeType)}</span>${periods(item)}${item.academicYear && item.academicYear !== receiptYear ? ` <bdi class="fee-year" dir="ltr">${escapeHtml(item.academicYear)}</bdi>` : ''}</td>
        <td class="money"><bdi>${escapeHtml(money(item.amount))}</bdi></td>
        <td class="money"><bdi>${escapeHtml(money(item.remainingAmount))}</bdi></td>
      </tr>`).join('')}</tbody>
    </table>` : '';
  const credit = creditCents > 0 ? `<p class="credit">${escapeHtml(text.unallocatedCredit)} <bdi>${escapeHtml(money(creditCents / 100))}</bdi></p>` : '';
  const details = [
    data.feeYear && data.yearAllocatedAmount !== undefined
      ? field(text.yearAmount, money(data.yearAllocatedAmount))
      : '',
    data.transactionRef ? field(text.transactionReference, data.transactionRef, 'ltr') : '',
    data.checkNumber ? field(text.checkNumber, data.checkNumber, 'ltr') : '',
    data.notes ? `<div class="notes">${field(text.notes, data.notes)}</div>` : '',
  ].join('');

  return `<!DOCTYPE html>
<html lang="${language}" dir="${direction}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(text.documentTitle)} ${escapeHtml(data.receiptNumber)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, Tahoma, sans-serif;
      font-size: 8pt;
      line-height: 1.25;
      color: #000;
      background: #fff;
      text-align: ${rtl ? 'right' : 'left'};
    }
    .page {
      width: 74mm;
      min-height: 144mm;
      margin: 0 auto;
      overflow-wrap: anywhere;
    }
    [lang="ar"] { font-family: Tahoma, Arial, sans-serif; }
    .header { text-align: center; padding-bottom: 1.5mm; border-bottom: 1.5px solid #000; }
    .school-identity { min-width: 0; }
    .school-logo {
      display: block;
      width: 24mm;
      height: 24mm;
      object-fit: contain;
      margin: 0 auto 2mm;
    }
    .school-name { font-size: 11pt; line-height: 1.2; font-weight: 700; }
    .contact { margin-top: 0.5mm; font-size: 7pt; white-space: pre-wrap; }
    .receipt-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 2mm; padding: 1.5mm 0; }
    .receipt-heading h2 { font-size: 9pt; }
    .receipt-number { font-size: 7.5pt; font-weight: 700; }
    .section { padding: 1.5mm 0; border-top: 1px dashed #000; }
    .field-label { font-size: 7pt; font-weight: 700; }
    .field-value { white-space: pre-wrap; overflow-wrap: anywhere; unicode-bidi: plaintext; }
    .student { display: grid; grid-template-columns: 1fr auto; gap: 2mm; align-items: center; }
    .student-name { font-size: 10pt; font-weight: 700; unicode-bidi: plaintext; }
    .student-code { font-size: 8pt; font-weight: 700; }
    .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 1mm 3mm; }
    .fields .field { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 1mm; }
    .fields .field-value { flex: 1; }
    .receipt-year { grid-column: 1 / -1; }
    .notes { grid-column: 1 / -1; }
    .breakdown { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 7.5pt; margin: 1mm 0; }
    .fee-column { width: 48%; }
    th { font-size: 7pt; text-align: start; border-block: 1px solid #000; padding: 1mm 0; }
    td { padding: 1mm 0; border-bottom: 1px dotted #777; vertical-align: top; }
    th + th, td + td { padding-inline-start: 1mm; }
    .money { text-align: end; font-variant-numeric: tabular-nums; }
    .fee-name { font-weight: 700; }
    .fee-year { display: block; font-size: 6.5pt; }
    .installment-period { display: block; font-size: 7pt; }
    .credit { text-align: end; font-size: 7pt; margin-top: 1mm; }
    .total { padding: 1.5mm 0; border-bottom: 1.5px solid #000; break-inside: avoid; }
    .total-line { display: flex; justify-content: space-between; align-items: baseline; gap: 2mm; }
    .amount-figure { font-size: 15pt; line-height: 1.1; font-weight: 700; font-variant-numeric: tabular-nums; }
    .amount-words { font-size: 7pt; margin-top: 0.5mm; }
    .footer { padding-top: 1mm; text-align: center; font-size: 6.5pt; }
    .thanks { font-weight: 700; }
    @page { size: 80mm 150mm; margin: 3mm; }
    @media screen {
      body { background: #e8e8e8; padding: 6mm; }
      .page { box-sizing: content-box; padding: 3mm; background: #fff; box-shadow: 0 1mm 4mm #0002; }
    }
    @media print {
      .page { width: 100%; min-height: 0; margin: 0; }
      .header, .receipt-heading, .field, .student, tr, .footer { break-inside: avoid; }
      thead { display: table-header-group; }
    }
  </style>
</head>
<body>
<main class="page">
  <header class="header">
    ${logoUrl ? `<img class="school-logo" src="${escapeHtml(logoUrl)}" alt="" />` : ''}
    <div class="school-identity"><h1 class="school-name" dir="auto">${escapeHtml(school)}</h1>
    ${address ? `<p class="contact" dir="auto">${escapeHtml(address)}</p>` : ''}
    ${phone ? `<p class="contact">${escapeHtml(text.phone)} : <bdi dir="ltr">${escapeHtml(phone)}</bdi></p>` : ''}</div>
  </header>

  <div class="receipt-heading">
    <h2>${escapeHtml(text.title)}</h2>
    <p class="receipt-number">${escapeHtml(text.number)} <bdi dir="ltr">${escapeHtml(data.receiptNumber)}</bdi></p>
  </div>

  <section class="section student" aria-label="${escapeHtml(text.student)}">
    <div>${label(text.student)}
    <p class="student-name" dir="auto">${escapeHtml(data.studentName)}</p>
    </div>${data.studentCode ? `<div>${label(text.studentCode)}<p class="student-code"><bdi dir="ltr">${escapeHtml(data.studentCode)}</bdi></p></div>` : ''}
  </section>

  <section class="section fields" aria-label="${escapeHtml(text.paymentSection)}">
    ${field(text.paymentDate, paymentDate, 'ltr')}
    ${field(text.paymentMethod, method)}
    ${receiptYear ? `<div class="receipt-year">${field(text.schoolYear, receiptYear, 'ltr')}</div>` : ''}
  </section>

  ${breakdown}
  ${credit}

  <section class="total" aria-label="${escapeHtml(text.amountPaid)}">
    <div class="total-line">${label(text.amountPaid)}
    <p class="amount-figure" dir="${direction}">${escapeHtml(money(data.amount))}</p></div>
    ${amountWords ? `<p class="amount-words">${escapeHtml(amountWords)}</p>` : ''}
  </section>

  ${details ? `<section class="section fields" aria-label="${escapeHtml(text.details)}">${details}</section>` : ''}

  <footer class="footer">
    <p><span class="thanks">${escapeHtml(text.thankYou)}</span> · ${escapeHtml(text.keepReceipt)}</p>
  </footer>
</main>
</body>
</html>`;
}

// The receipt window inherits the page's Content Security Policy, which allows
// only nonce-bearing scripts, so an inline `window.print()` in it never ran.
// The opener prints it instead, once its images have loaded or failed.
export function printReceipt(data: ReceiptData, loadData?: () => Promise<ReceiptData>) {
  const win = window.open('', '_blank', 'width=420,height=700');
  if (!win) return;
  const render = (receipt: ReceiptData) => {
    if (win.closed) return;
    win.document.write(buildReceiptHtml(receipt));
    win.document.close();
    const print = () => { win.focus(); win.print(); };
    const pending = Array.from(win.document.images ?? []).filter((image) => !image.complete);
    if (pending.length === 0) return print();
    let left = pending.length;
    const settle = () => { left -= 1; if (left === 0) print(); };
    for (const image of pending) {
      image.addEventListener('load', settle, { once: true });
      image.addEventListener('error', settle, { once: true });
    }
  };
  // Open synchronously from the click so browsers allow the popup, then read
  // fresh fee balances before printing. A failed read must not print a total-only receipt.
  if (loadData) return loadData().then(render).catch((error) => { win.close(); throw error; });
  render(data);
}

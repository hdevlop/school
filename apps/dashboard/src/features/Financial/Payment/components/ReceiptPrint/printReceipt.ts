import { amountInWordsFR } from './amountInWords';
import { DEFAULT_RECEIPT_LANGUAGE, type ReceiptLanguage } from '@sms/contracts';
import { ar, fr } from '@sms/contracts/locales';

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
  const details = [
    data.feeYear ? field(text.schoolYear, data.feeYear, 'ltr') : '',
    data.feeYear && data.yearAllocatedAmount !== undefined
      ? field(text.yearAmount, money(data.yearAllocatedAmount))
      : '',
    data.transactionRef ? field(text.transactionReference, data.transactionRef, 'ltr') : '',
    data.checkNumber ? field(text.checkNumber, data.checkNumber, 'ltr') : '',
    data.notes ? field(text.notes, data.notes) : '',
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
      font-size: 14px;
      line-height: 1.5;
      color: #000;
      background: #fff;
      text-align: ${rtl ? 'right' : 'left'};
    }
    .page {
      width: 80mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 4mm 3mm;
      overflow-wrap: anywhere;
    }
    [lang="ar"] { font-family: Tahoma, Arial, sans-serif; }
    .header { text-align: center; padding-bottom: 3mm; }
    .school-logo {
      display: block;
      width: 28mm;
      height: 28mm;
      object-fit: contain;
      margin: 0 auto 2mm;
    }
    .school-name { font-size: 17px; line-height: 1.35; font-weight: 700; }
    .contact { margin-top: 1mm; font-size: 12px; white-space: pre-wrap; }
    .receipt-heading { border-top: 2px solid #000; border-bottom: 1px solid #000; padding: 2mm 0; text-align: center; }
    .receipt-heading h2 { font-size: 17px; line-height: 1.4; }
    .receipt-number { margin-top: 1.5mm; font-size: 14px; font-weight: 700; }
    .section { padding: 3mm 0; border-bottom: 1px dashed #000; }
    .field + .field { margin-top: 2.5mm; }
    .field-label { font-size: 13px; font-weight: 700; }
    .field-value { margin-top: 0.5mm; white-space: pre-wrap; overflow-wrap: anywhere; unicode-bidi: plaintext; }
    .student-name { font-size: 20px; font-weight: 700; line-height: 1.5; margin: 1mm 0 2mm; unicode-bidi: plaintext; }
    .student-code { font-size: 14px; font-weight: 700; margin-top: 0.5mm; }
    .total { padding: 3mm 0; border-bottom: 2px solid #000; text-align: center; break-inside: avoid; }
    .total .field-label { font-size: 13px; }
    .amount-figure { font-size: 28px; line-height: 1.35; font-weight: 700; margin-top: 2mm; font-variant-numeric: tabular-nums; }
    .amount-words { font-size: 12px; margin-top: 1.5mm; }
    .footer { padding-top: 3mm; text-align: center; font-size: 12px; }
    .footer p + p { margin-top: 0.5mm; }
    .thanks { font-size: 14px; font-weight: 700; margin-bottom: 1mm; }
    @media print {
      .page { margin: 0; }
      .header, .receipt-heading, .field, .student, .total, .footer { break-inside: avoid; }
      /* The printer driver owns the roll length and 80 mm paper size. */
      @page { size: auto; margin: 0; }
    }
  </style>
</head>
<body>
<main class="page">
  <header class="header">
    ${logoUrl ? `<img class="school-logo" src="${escapeHtml(logoUrl)}" alt="" />` : ''}
    <h1 class="school-name" dir="auto">${escapeHtml(school)}</h1>
    ${address ? `<p class="contact" dir="auto">${escapeHtml(address)}</p>` : ''}
    ${phone ? `<p class="contact">${escapeHtml(text.phone)} : <bdi dir="ltr">${escapeHtml(phone)}</bdi></p>` : ''}
  </header>

  <div class="receipt-heading">
    <h2>${escapeHtml(text.title)}</h2>
    <p class="receipt-number">${escapeHtml(text.number)} <bdi dir="ltr">${escapeHtml(data.receiptNumber)}</bdi></p>
  </div>

  <section class="section student" aria-label="${escapeHtml(text.student)}">
    ${label(text.student)}
    <p class="student-name" dir="auto">${escapeHtml(data.studentName)}</p>
    ${data.studentCode ? `${label(text.studentCode)}<p class="student-code"><bdi dir="ltr">${escapeHtml(data.studentCode)}</bdi></p>` : ''}
  </section>

  <section class="section" aria-label="${escapeHtml(text.paymentSection)}">
    ${field(text.paymentDate, paymentDate, 'ltr')}
    ${field(text.paymentMethod, method)}
  </section>

  <section class="total" aria-label="${escapeHtml(text.amountPaid)}">
    ${label(text.amountPaid)}
    <p class="amount-figure" dir="${direction}">${escapeHtml(money(data.amount))}</p>
    ${amountWords ? `<p class="amount-words">${escapeHtml(amountWords)}</p>` : ''}
  </section>

  ${details ? `<section class="section" aria-label="${escapeHtml(text.details)}">${details}</section>` : ''}

  <footer class="footer">
    <p class="thanks">${escapeHtml(text.thankYou)}</p>
    <p>${escapeHtml(text.keepReceipt)}</p>
  </footer>
</main>
</body>
</html>`;
}

// The receipt window inherits the page's Content Security Policy, which allows
// only nonce-bearing scripts, so an inline `window.print()` in it never ran.
// The opener prints it instead, once its images have loaded or failed.
export function printReceipt(data: ReceiptData) {
  const win = window.open('', '_blank', 'width=420,height=800');
  if (!win) return;
  win.document.write(buildReceiptHtml(data));
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
}

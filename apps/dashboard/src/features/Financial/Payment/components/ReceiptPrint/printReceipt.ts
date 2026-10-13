import { amountInWordsFR } from './amountInWords';

export interface ReceiptData {
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

const METHOD_FR: Record<string, string> = {
  cash: 'Espèces',
  bankTransfer: 'Virement bancaire',
  check: 'Chèque',
  creditCard: 'Carte de crédit',
  debitCard: 'Carte de débit',
  online: 'Paiement en ligne',
  mobilePayment: 'Paiement mobile',
};

const METHOD_AR: Record<string, string> = {
  cash: 'نقداً',
  bankTransfer: 'تحويل بنكي',
  check: 'شيك',
  creditCard: 'بطاقة ائتمان',
  debitCard: 'بطاقة سحب',
  online: 'دفع إلكتروني',
  mobilePayment: 'دفع هاتفي',
};

function formatDateFR(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatAmountFR(amount: number, currency: string): string {
  return new Intl.NumberFormat('fr-MA', { style: 'currency', currency }).format(amount);
}

// FIX: SEC-003 — data stays text even in the hand-written print document.
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]!);
}

export function buildReceiptHtml(data: ReceiptData) {
  const school = data.schoolName ?? 'École Privée';
  const address = data.schoolAddress ?? '';
  const phone = data.schoolPhone ?? '';
  // Only image URLs are accepted; attributes still go through HTML escaping.
  const logo = data.schoolLogo?.trim();
  const logoUrl = logo && /^(https?:\/\/|\/(?!\/))/i.test(logo) ? logo : undefined;
  const methodFR = METHOD_FR[data.paymentMethod] ?? data.paymentMethod;
  const methodAR = METHOD_AR[data.paymentMethod] ?? data.paymentMethod;
  const amountWords = data.currency === 'MAD' ? amountInWordsFR(data.amount) : '';
  const dateFR = formatDateFR(data.paymentDate);
  const amountFormatted = formatAmountFR(data.amount, data.currency);
  const details = [
    data.feeYear && data.yearAllocatedAmount !== undefined
      ? `<tr><td>Année scolaire / السنة الدراسية</td><td>${escapeHtml(data.feeYear)}</td></tr>
         <tr><td>Affecté à cette année / المخصص لهذه السنة</td><td>${escapeHtml(formatAmountFR(data.yearAllocatedAmount, data.currency))}</td></tr>`
      : '',
    data.transactionRef ? `<tr><td>Référence / المرجع</td><td>${escapeHtml(data.transactionRef)}</td></tr>` : '',
    data.checkNumber ? `<tr><td>N° Chèque / رقم الشيك</td><td>${escapeHtml(data.checkNumber)}</td></tr>` : '',
    data.notes ? `<tr><td>Notes / ملاحظات</td><td>${escapeHtml(data.notes)}</td></tr>` : '',
  ].join('');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Reçu ${escapeHtml(data.receiptNumber)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Arial, monospace;
      font-size: 12px;
      line-height: 1.35;
      color: #000;
      background: #fff;
    }
    .page {
      width: 80mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 4mm;
      overflow-wrap: anywhere;
    }
    .header { text-align: center; padding-bottom: 2mm; }
    .header h1 { font-size: 15px; font-weight: 700; }
    .school-logo {
      display: block;
      max-width: 48mm;
      max-height: 20mm;
      object-fit: contain;
      margin: 0 auto 2mm;
      filter: grayscale(1) contrast(1.5);
    }
    .header p { margin-top: 1mm; }
    .receipt-title { font-size: 13px; font-weight: 700; margin-top: 2mm; }
    .receipt-number { font-size: 11px; }
    .section { border-top: 1px dashed #000; padding: 2mm 0; }
    .row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr); gap: 2mm; }
    .row + .row { margin-top: 1mm; }
    .row .value { text-align: right; }
    .label { font-size: 11px; }
    .student-name { font-weight: 700; margin: 1mm 0; }
    .student-code { font-size: 11px; }
    .total-row { display: flex; justify-content: space-between; align-items: center; gap: 2mm; }
    .total-label { font-size: 11px; font-weight: 700; }
    .amount-figure { font-size: 17px; font-weight: 700; text-align: right; }
    .amount-words { font-size: 11px; margin-top: 1mm; }
    .details-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .details-table td { white-space: pre-wrap; overflow-wrap: anywhere; vertical-align: top; padding: 0.5mm 0; font-size: 11px; }
    .details-table td:first-child { width: 48%; padding-right: 2mm; }
    .details-table td:last-child { text-align: right; }
    .footer { border-top: 1px dashed #000; padding-top: 2mm; text-align: center; font-size: 11px; }
    @media print {
      .page { margin: 0; }
      .header, .row, .total-row, .details-table tr, .footer { break-inside: avoid; }
      /* The printer driver owns the roll length and 80 mm paper size. */
      @page { size: auto; margin: 0; }
    }
  </style>
</head>
<body>
<div class="page">
  <header class="header">
    ${logoUrl ? `<img class="school-logo" src="${escapeHtml(logoUrl)}" alt="" />` : ''}
    <h1>${escapeHtml(school)}</h1>
    ${address ? `<p>${escapeHtml(address)}</p>` : ''}
    ${phone ? `<p>Tél : ${escapeHtml(phone)}</p>` : ''}
    <div class="receipt-title">REÇU / <span lang="ar" dir="rtl">وصل استلام</span></div>
    <p class="receipt-number">N° ${escapeHtml(data.receiptNumber)}</p>
  </header>

  <div class="section">
    <div class="row">
      <span class="label">Date / التاريخ</span>
      <span class="value">${escapeHtml(dateFR)}</span>
    </div>
    <div class="row">
      <span class="label">Mode / الطريقة</span>
      <span class="value">${escapeHtml(methodFR)} / <span lang="ar" dir="rtl">${escapeHtml(methodAR)}</span></span>
    </div>
  </div>

  <div class="section">
    <div class="label">Élève / الطالب</div>
    <div class="student-name">${escapeHtml(data.studentName)}</div>
    <div class="student-code">${escapeHtml(data.studentCode)}</div>
  </div>

  <div class="section">
    <div class="total-row">
      <div class="total-label">TOTAL PAYÉ<br/><span lang="ar" dir="rtl">المبلغ المدفوع</span></div>
      <div class="amount-figure">${escapeHtml(amountFormatted)}</div>
    </div>
    ${amountWords ? `<div class="amount-words">${escapeHtml(amountWords)}</div>` : ''}
  </div>

  ${details ? `<div class="section">
    <table class="details-table">${details}</table>
  </div>` : ''}

  <footer class="footer">Merci / <span lang="ar" dir="rtl">شكراً</span></footer>
</div>
<script>window.onload = function(){ window.print(); };</script>
</body>
</html>`;

  return html;
}

export function printReceipt(data: ReceiptData) {
  const win = window.open('', '_blank', 'width=380,height=600');
  if (!win) return;
  win.document.write(buildReceiptHtml(data));
  win.document.close();
}

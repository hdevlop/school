import { amountInWordsFR } from './amountInWords';

export interface ReceiptData {
  receiptNumber: string;
  paymentDate: string;
  studentName: string;
  studentCode: string;
  amount: number;
  paymentMethod: string;
  transactionRef?: string;
  checkNumber?: string;
  notes?: string;
  schoolName?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  processedBy?: string;
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
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatAmountFR(amount: number): string {
  return new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ' MAD';
}

export function printReceipt(data: ReceiptData) {
  const school = data.schoolName ?? 'École Privée';
  const address = data.schoolAddress ?? '';
  const phone = data.schoolPhone ?? '';
  const methodFR = METHOD_FR[data.paymentMethod] ?? data.paymentMethod;
  const methodAR = METHOD_AR[data.paymentMethod] ?? data.paymentMethod;
  const amountWords = amountInWordsFR(data.amount);
  const dateFR = formatDateFR(data.paymentDate);
  const amountFormatted = formatAmountFR(data.amount);

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Reçu ${data.receiptNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 13px;
      color: #1a1a1a;
      background: #fff;
    }
    .page {
      width: 148mm;
      min-height: 210mm;
      margin: auto;
      padding: 12mm 14mm;
      display: flex;
      flex-direction: column;
      gap: 6mm;
    }
    /* ---- Header ---- */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #1a56db;
      padding-bottom: 5mm;
    }
    .school-info h1 {
      font-size: 17px;
      font-weight: 700;
      color: #1a56db;
      letter-spacing: 0.3px;
    }
    .school-info p { font-size: 11px; color: #555; margin-top: 2px; }
    .receipt-label {
      text-align: right;
    }
    .receipt-label .title-fr {
      font-size: 20px;
      font-weight: 800;
      color: #1a56db;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .receipt-label .title-ar {
      font-size: 16px;
      font-weight: 700;
      color: #1a56db;
      direction: rtl;
      margin-top: 2px;
    }
    .receipt-label .number {
      font-size: 12px;
      color: #374151;
      margin-top: 3px;
      font-weight: 600;
    }
    /* ---- Meta row ---- */
    .meta {
      display: flex;
      justify-content: space-between;
      background: #f0f4ff;
      border-radius: 6px;
      padding: 4mm 5mm;
    }
    .meta-item label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .meta-item value, .meta-item p { font-weight: 600; font-size: 13px; margin-top: 1px; }
    /* ---- Student block ---- */
    .section-title {
      font-size: 10px;
      text-transform: uppercase;
      color: #6b7280;
      letter-spacing: 0.6px;
      font-weight: 600;
      margin-bottom: 2mm;
    }
    .student-block {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 4mm 5mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .student-name { font-size: 16px; font-weight: 700; }
    .student-code { font-size: 11px; color: #6b7280; margin-top: 2px; font-family: monospace; }
    /* ---- Amount block ---- */
    .amount-block {
      border: 2px solid #1a56db;
      border-radius: 8px;
      padding: 5mm 6mm;
      background: #f8faff;
    }
    .amount-row { display: flex; justify-content: space-between; align-items: center; }
    .amount-figure {
      font-size: 26px;
      font-weight: 800;
      color: #1a56db;
    }
    .amount-ar {
      font-size: 14px;
      direction: rtl;
      color: #374151;
      font-weight: 600;
    }
    .amount-words {
      margin-top: 3mm;
      font-size: 11px;
      color: #374151;
      font-style: italic;
      border-top: 1px dashed #c7d2fe;
      padding-top: 2mm;
    }
    /* ---- Details table ---- */
    .details-table { width: 100%; border-collapse: collapse; }
    .details-table tr td {
      padding: 2mm 0;
      font-size: 12px;
      border-bottom: 1px solid #f3f4f6;
    }
    .details-table td:first-child { color: #6b7280; width: 40%; }
    .details-table td:last-child { font-weight: 600; text-align: right; }
    /* ---- Bilingual footer ---- */
    .bilingual-footer {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #e5e7eb;
      padding-top: 4mm;
      margin-top: auto;
    }
    .sig-block { text-align: center; }
    .sig-block .sig-label { font-size: 10px; color: #6b7280; }
    .sig-block .sig-label-ar { font-size: 10px; color: #6b7280; direction: rtl; }
    .sig-line {
      width: 35mm;
      border-bottom: 1px solid #374151;
      margin: 8mm auto 1mm;
    }
    .stamp-area {
      width: 28mm;
      height: 28mm;
      border: 2px dashed #c7d2fe;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #c7d2fe;
      font-size: 10px;
      text-align: center;
      margin: 2mm auto;
    }
    .watermark {
      text-align: center;
      font-size: 9px;
      color: #9ca3af;
      margin-top: 3mm;
    }
    @media print {
      body { background: #fff; }
      .page { margin: 0; padding: 10mm 12mm; }
      @page { size: A5 portrait; margin: 0; }
    }
  </style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div class="school-info">
      <h1>${school}</h1>
      ${address ? `<p>${address}</p>` : ''}
      ${phone ? `<p>Tél : ${phone}</p>` : ''}
    </div>
    <div class="receipt-label">
      <div class="title-fr">Reçu</div>
      <div class="title-ar">وصل استلام</div>
      <div class="number">N° ${data.receiptNumber}</div>
    </div>
  </div>

  <!-- Meta -->
  <div class="meta">
    <div class="meta-item">
      <label>Date / التاريخ</label>
      <p>${dateFR}</p>
    </div>
    <div class="meta-item" style="text-align:right">
      <label>Méthode / الطريقة</label>
      <p>${methodFR} &nbsp;/&nbsp; ${methodAR}</p>
    </div>
  </div>

  <!-- Student -->
  <div>
    <div class="section-title">Élève / الطالب</div>
    <div class="student-block">
      <div>
        <div class="student-name">${data.studentName}</div>
        <div class="student-code">${data.studentCode}</div>
      </div>
    </div>
  </div>

  <!-- Amount -->
  <div class="amount-block">
    <div class="amount-row">
      <div class="amount-figure">${amountFormatted}</div>
      <div class="amount-ar">المبلغ المدفوع</div>
    </div>
    <div class="amount-words">${amountWords}</div>
  </div>

  <!-- Details -->
  <div>
    <div class="section-title">Détails / التفاصيل</div>
    <table class="details-table">
      ${data.transactionRef ? `<tr><td>Référence / المرجع</td><td>${data.transactionRef}</td></tr>` : ''}
      ${data.checkNumber ? `<tr><td>N° Chèque / رقم الشيك</td><td>${data.checkNumber}</td></tr>` : ''}
      ${data.notes ? `<tr><td>Notes / ملاحظات</td><td>${data.notes}</td></tr>` : ''}
      ${data.processedBy ? `<tr><td>Encaissé par / قبضه</td><td>${data.processedBy}</td></tr>` : ''}
    </table>
  </div>

  <!-- Footer -->
  <div class="bilingual-footer">
    <div class="sig-block">
      <div class="stamp-area">Cachet<br/>ختم</div>
      <div class="sig-label">Cachet de l'école</div>
      <div class="sig-label-ar">ختم المدرسة</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Signature autorisée</div>
      <div class="sig-label-ar">التوقيع المخوّل</div>
    </div>
  </div>

  <div class="watermark">Document généré le ${new Date().toLocaleDateString('fr-FR')} · ${school}</div>
</div>
<script>window.onload = function(){ window.print(); };</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=700,height=900');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

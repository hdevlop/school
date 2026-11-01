import type { Table } from '@tanstack/react-table';
import { buildSchoolPrintDocument, escapePrintHtml, schoolPrintCells, type SchoolPrintDocumentOptions } from '@/shared/schoolPrintDocument';
import { isStudentDisabled } from '@/features/Students/config/studentActivity';
import { getFeeCardSummary } from '../utils/feeCardSummary';

type FeePrintFormat = {
  money: (value: number) => string;
  date: (value: string) => string;
  percent: (value: number) => string;
  gender: (value: string) => string;
  status: (value: 'paid' | 'overdue' | 'paying' | 'noFees') => string;
};

export const FEE_PRINT_COLUMN_WEIGHTS = [25, 50, 19, 35, 16, 17, 34, 42, 31, 31, 26];

type FeePrintRow = { cells: string[]; progress: number | null; progressLabel: string };

/** Print current students with assigned fees across all filtered, sorted pages. */
export function feePrintSnapshot(table: Table<any>, format: FeePrintFormat) {
  const rows = table.getPrePaginationRowModel().rows
    .filter(({ original }) => Number(original.totalFees ?? 0) > 0 && !isStudentDisabled(original));
  return rows.map(({ original: data }): FeePrintRow => {
    const summary = getFeeCardSummary(data);
    const student = data.student;
    const status = !summary.hasFees ? 'noFees' : summary.isPaid ? 'paid' : summary.hasOverdue ? 'overdue' : 'paying';
    return {
      cells: [
        student?.studentCode || '—',
        student?.name || '—',
        student?.gender ? format.gender(student.gender) : '—',
        student?.phone?.trim() || student?.contactPhone || '—',
        data.class?.name || '—',
        data.section?.name || '—',
        format.money(summary.paidAmount),
        format.money(Number(data.dueThroughMonth ?? 0)),
        String(data.overdueInstallmentCount ?? 0),
        data.lastPayment ? format.date(data.lastPayment) : '—',
        format.status(status),
      ],
      progress: summary.hasFees ? summary.progress : null,
      progressLabel: format.percent(summary.progress),
    };
  });
}

export function buildFeePrintDocument(rows: readonly FeePrintRow[], options: SchoolPrintDocumentOptions) {
  const e = escapePrintHtml;
  const body = rows.map(({ cells, progress, progressLabel }, index) => {
    const paymentCell = progress === null ? schoolPrintCells([cells[6]]) : `<td>
      <bdi>${e(cells[6])}</bdi>
      <div style="display:flex;align-items:center;gap:1.5mm;margin-top:0.5mm">
        <span style="display:block;flex:1;height:1.5mm;background:#e2e8f0;border-radius:1mm;overflow:hidden"><span style="display:block;width:${Math.max(0, Math.min(100, progress))}%;height:100%;background:#16a34a"></span></span>
        <bdi style="font-size:7pt;color:#64748b;white-space:nowrap">${e(progressLabel)}</bdi>
      </div></td>`;
    return `<tr><td class="index">${index + 1}</td>${schoolPrintCells(cells.slice(0, 6))}${paymentCell}${schoolPrintCells(cells.slice(7))}</tr>`;
  }).join('');
  return buildSchoolPrintDocument({ ...options, wrapHeadings: true }, body,
    `<span class="chip">${e(options.totalLabel)} <b>${rows.length}</b></span>`);
}

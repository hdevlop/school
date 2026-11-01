import type { Table } from '@tanstack/react-table';
import type { NTableColumnMeta } from 'najm-kit';
import { buildSchoolPrintDocument, escapePrintHtml, schoolPrintCells, type SchoolPrintDocumentOptions } from '@/shared/schoolPrintDocument';
import { isStudentDisabled } from './studentActivity';

type StudentPrintFormat = {
  gender: (value: string) => string;
  date: (value: string) => string;
};

// Proportions preserve room for names and dates while fitting the available
// page width, including when the print dialog applies its own margins.
const COLUMN_WEIGHTS: Record<string, number> = {
  studentCode: 25, name: 56, arabicName: 40, dateOfBirth: 32, birthplace: 28,
  phone: 36, class: 16, section: 17, gender: 19,
};

/** Print current enrollments across all filtered, sorted pages. */
export function studentPrintSnapshot(table: Table<any>, format: StudentPrintFormat) {
  const columns = table.getVisibleLeafColumns().filter(column => column.accessorFn
    && (column.columnDef.meta as NTableColumnMeta | undefined)?.export !== false);
  return {
    columnWeights: columns.map(column => COLUMN_WEIGHTS[column.id] ?? 25),
    columns: columns.map(column => {
      const header = (column.columnDef.meta as NTableColumnMeta | undefined)?.exportHeader ?? column.columnDef.header;
      return typeof header === 'string' ? header : column.id;
    }),
    rows: table.getPrePaginationRowModel().rows.filter(row => !isStudentDisabled(row.original)).map(row => columns.map(column => {
      const value = row.getValue(column.id);
      if (value == null || value === '') return '—';
      if (column.id === 'gender') return format.gender(String(value));
      if (column.id === 'dateOfBirth') return format.date(String(value));
      return String(value);
    })),
  };
}

export function buildStudentPrintDocument(rows: readonly (readonly string[])[], options: SchoolPrintDocumentOptions) {
  const body = rows.map((cells, index) => `<tr><td class="index">${index + 1}</td>${schoolPrintCells(cells)}</tr>`).join('');
  const summary = `<span class="chip">${escapePrintHtml(options.totalLabel)} <b>${rows.length}</b></span>`;
  return buildSchoolPrintDocument(options, body, summary);
}

import type { Table } from '@tanstack/react-table';
import { toOfficialClassName } from '@sms/contracts';

const CLASS_COLUMNS = ['class', 'className', 'class.name', 'classSection'];
function officialClassValue(value: unknown, composite: boolean): unknown {
  if (typeof value === 'string') return composite
    ? value.replace(/^([a-z0-9]+)(\s*[/ -]\s*)([a-z]|\d+)$/i, (_match, code, separator, section) => `${toOfficialClassName(code)}${separator}${section}`)
    : toOfficialClassName(value);
  if (Array.isArray(value)) return value.map(item => officialClassValue(item, composite));
  if (value && typeof value === 'object' && 'name' in value && typeof value.name === 'string') {
    return { ...value, name: toOfficialClassName(value.name) };
  }
  return value;
}

/** Uses the live table model, preserving visible columns, filters and sorting across pages. */
export function schoolTableSnapshot<T>(table: Table<T>, classNameColumns: readonly string[] = CLASS_COLUMNS) {
  const columns = table.getVisibleLeafColumns().filter(column => column.accessorFn);
  const headers = columns.map(column => (column.columnDef as { accessorKey?: string }).accessorKey ?? column.id);
  return {
    headers,
    rows: table.getPrePaginationRowModel().rows.map(row => columns.map((column, index) => {
      const value = row.getValue(column.id);
      return classNameColumns.includes(headers[index]) ? officialClassValue(value, headers[index] === 'classSection') : value;
    })),
  };
}

/** UTF-8 CSV, with formula-like text escaped before a spreadsheet opens it. */
export function schoolTableCsv(snapshot: { headers: string[]; rows: unknown[][] }): string {
  const encode = (value: unknown) => {
    let text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (typeof value !== 'number' && /^\s*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return '\uFEFF' + [snapshot.headers, ...snapshot.rows].map(row => row.map(encode).join(',')).join('\r\n');
}

export function downloadSchoolTable<T>(table: Table<T>, classNameColumns?: readonly string[]) {
  const csv = schoolTableCsv(schoolTableSnapshot(table, classNameColumns));
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'table.csv';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

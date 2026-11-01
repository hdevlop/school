import type { ColumnDef } from '@tanstack/react-table';
import type { NTableColumnMeta } from 'najm-kit';
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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
// Postgres numeric arrives as text ("1250.00"). Only a decimal point qualifies,
// so codes and phone numbers ("0612345678", "001") stay text.
const DECIMAL = /^-?\d+\.\d+$/;

/**
 * A stored value as a spreadsheet should hold it: ISO dates as dates and
 * decimal amounts as numbers, so Excel sorts and sums them. CSV writes the
 * same text as before.
 */
export function exportCell(value: unknown): unknown {
  // Related records (a reporter, a class) export the name their cell shows, not JSON.
  if (Array.isArray(value)) return value.map(item => recordName(item) ?? exportCell(item)).filter(item => item !== '' && item != null).join(', ');
  if (value && typeof value === 'object' && !(value instanceof Date)) return recordName(value) ?? value;
  if (typeof value !== 'string') return value;
  if (DECIMAL.test(value)) return Number(value);
  if (ISO_DATE.test(value)) {
    const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
    return Number.isNaN(date.getTime()) ? value : date;
  }
  return value;
}

function recordName(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const name = [record.name, record.title, record.label, record.email].find(item => typeof item === 'string' && item.trim());
  return name as string | undefined;
}

/** A translated label for a stored code, as the cell shows it; unknown codes export as stored. */
export function exportLabel(translate: (code: string) => string) {
  return (value: unknown) => (value == null || value === '' ? value : translate(String(value)));
}

/** The label `<NBadge status={code} />` shows: the catalog's `status.<code>`, else the code. */
export function exportStatus(t: (key: string) => string) {
  return exportLabel(code => {
    const key = `status.${code}`;
    const label = t(key);
    return label && label !== key ? label : code;
  });
}

type ExportColumn<T> = ColumnDef<T, any> & { accessorKey?: string; columns?: ExportColumn<T>[]; meta?: NTableColumnMeta<T> };

/**
 * School's file-export policy, as Najm column metadata, for Excel, CSV and
 * print alike: class columns export official class codes, and every other
 * value goes through `exportCell`. A column that sets `meta.exportValue`
 * keeps its own.
 */
export function withSchoolExports<T>(
  columns: ReadonlyArray<ColumnDef<T, any>>,
  classNameColumns: readonly string[] = CLASS_COLUMNS,
): ColumnDef<T, any>[] {
  return (columns as ReadonlyArray<ExportColumn<T>>).map(column => {
    if (column.columns) return { ...column, columns: withSchoolExports(column.columns, classNameColumns) };
    if (column.meta?.exportValue) return column;
    const key = column.accessorKey ?? column.id;
    const exportValue = key && classNameColumns.includes(key)
      ? (value: unknown) => officialClassValue(value, key === 'classSection')
      : exportCell;
    return { ...column, meta: { ...column.meta, exportValue } };
  });
}

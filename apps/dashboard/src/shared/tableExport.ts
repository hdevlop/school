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

type ExportColumn<T> = ColumnDef<T, any> & { accessorKey?: string; columns?: ExportColumn<T>[]; meta?: NTableColumnMeta<T> };

/**
 * School's file-export policy, as Najm column metadata: class columns export
 * official class codes in every format (Excel, CSV and print). A column that
 * already sets `meta.exportValue` keeps its own.
 */
export function withOfficialClassExports<T>(
  columns: ReadonlyArray<ColumnDef<T, any>>,
  classNameColumns: readonly string[] = CLASS_COLUMNS,
): ColumnDef<T, any>[] {
  return (columns as ReadonlyArray<ExportColumn<T>>).map(column => {
    if (column.columns) return { ...column, columns: withOfficialClassExports(column.columns, classNameColumns) };
    const key = column.accessorKey ?? column.id;
    if (!key || !classNameColumns.includes(key) || column.meta?.exportValue) return column;
    const composite = key === 'classSection';
    return { ...column, meta: { ...column.meta, exportValue: (value: unknown) => officialClassValue(value, composite) } };
  });
}

import { describe, expect, it } from 'bun:test';
import { createTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel, getPaginationRowModel, type ColumnDef, type Table } from '@tanstack/react-table';
import type { NTableColumnMeta } from 'najm-kit';
import { withOfficialClassExports } from '@/shared/tableExport';
import { buildStudentImport } from '@/features/Students/config/studentImport';

/** What Najm's CSV export writes: field names, and each column's exportValue over visible, filtered, sorted rows. */
function exported<T>(table: Table<T>) {
  const columns = table.getVisibleLeafColumns().filter(column => column.accessorFn);
  return {
    headers: columns.map(column => (column.columnDef as { accessorKey?: string }).accessorKey ?? column.id),
    rows: table.getPrePaginationRowModel().rows.map(row => columns.map(column => {
      const exportValue = (column.columnDef.meta as NTableColumnMeta | undefined)?.exportValue;
      return exportValue ? exportValue(row.getValue(column.id), row.original) : row.getValue(column.id);
    })),
  };
}

type Student = { name: string; studentCode: string; class: { name: string }; section: string; gender: string; email: string };

function studentTable() {
  const columns: ColumnDef<Student, any>[] = [
    { accessorKey: 'studentCode' }, { accessorKey: 'name' }, { accessorKey: 'email' },
    { accessorKey: 'class', accessorFn: row => row.class.name },
    { accessorKey: 'section' }, { accessorKey: 'gender' },
  ];
  return createTable({
    data: [
      { name: 'Zineb', studentCode: 'S1', class: { name: 'CP' }, section: 'A', gender: 'F', email: '' },
      { name: 'Amine', studentCode: 'S2', class: { name: '1AC' }, section: 'B', gender: 'M', email: '' },
      { name: 'Excluded', studentCode: 'S3', class: { name: 'CP' }, section: 'A', gender: 'M', email: '' },
    ],
    columns: withOfficialClassExports(columns),
    state: {
      sorting: [{ id: 'name', desc: false }],
      columnFilters: [{ id: 'name', value: 'i' }],
      columnVisibility: { email: false },
      pagination: { pageIndex: 0, pageSize: 1 },
    },
    onStateChange: () => {}, renderFallbackValue: '',
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(), getPaginationRowModel: getPaginationRowModel(),
  });
}

describe('School file exports', () => {
  it('class columns export official class codes, and the CSV still imports back', () => {
    const table = studentTable();
    const snapshot = exported(table);
    expect(snapshot.headers).toEqual(['studentCode', 'name', 'class', 'section', 'gender']);
    expect(snapshot.rows).toEqual([
      ['S2', 'Amine', '1APIC', 'B', 'M'], ['S1', 'Zineb', '1APG', 'A', 'F'],
    ]);
    expect(table.getPrePaginationRowModel().rows.map(row => row.getValue('class'))).toEqual(['1AC', 'CP']);
    const rows = snapshot.rows.map(values => Object.fromEntries(snapshot.headers.map((key, index) => [key, values[index]])));
    const result = buildStudentImport(rows, [
      { id: 'primary', name: 'CP', sections: [{ id: 'primary-a', name: 'A' }] },
      { id: 'college', name: '1AC', sections: [{ id: 'college-b', name: 'B' }] },
    ], '2026-10-16');
    expect(result.problems).toEqual([]);
    expect(result.students.map(student => student.classId)).toEqual(['college', 'primary']);
  });

  it('converts only class columns, including objects and combined class/section labels', () => {
    const original = { name: 'CP', class: { id: 'c1', name: 'CP' }, className: 'Blue', 'class.name': 'CE2', classSection: 'CM1 / A' };
    const columns: ColumnDef<typeof original, any>[] = Object.keys(original).map(key => ({ id: key, accessorFn: row => row[key as keyof typeof original] }));
    const table = (classNameColumns?: readonly string[]) => createTable({
      data: [original], columns: withOfficialClassExports(columns, classNameColumns),
      state: {}, onStateChange: () => {}, renderFallbackValue: '', getCoreRowModel: getCoreRowModel(),
    });
    expect(exported(table()).rows[0]).toEqual(['CP', { id: 'c1', name: '1APG' }, 'Blue', '3APG', '4APG / A']);
    expect(original.class.name).toBe('CP');
    expect(exported(table(['name'])).rows[0][0]).toBe('1APG');
  });

  it("keeps a column's own exportValue, other metadata and grouped columns", () => {
    const own = (value: unknown) => `own ${value}`;
    const [kept, grouped] = withOfficialClassExports<{ class: string }>([
      { accessorKey: 'class', meta: { exportValue: own } } as ColumnDef<{ class: string }, any>,
      { id: 'group', columns: [{ accessorKey: 'class', meta: { hiddenBelow: 'md' } } as ColumnDef<{ class: string }, any>] },
    ]) as Array<ColumnDef<{ class: string }, any> & { columns?: Array<ColumnDef<{ class: string }, any>> }>;
    expect((kept.meta as NTableColumnMeta).exportValue).toBe(own);
    const child = grouped.columns![0].meta as NTableColumnMeta;
    expect(child.hiddenBelow).toBe('md');
    expect(child.exportValue!('CP', {})).toBe('1APG');
  });
});

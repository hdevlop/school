import { describe, expect, it } from 'bun:test';
import { createTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel, getPaginationRowModel } from '@tanstack/react-table';
import { schoolTableCsv, schoolTableSnapshot } from '@/shared/tableExport';
import { buildStudentImport } from '@/features/Students/config/studentImport';

function studentTable() {
  return createTable({
    data: [
      { name: 'Zineb', studentCode: 'S1', class: { name: 'CP' }, section: 'A', gender: 'F', email: '' },
      { name: 'Amine', studentCode: 'S2', class: { name: '1AC' }, section: 'B', gender: 'M', email: '' },
      { name: 'Excluded', studentCode: 'S3', class: { name: 'CP' }, section: 'A', gender: 'M', email: '' },
    ],
    columns: [
      { accessorKey: 'studentCode' }, { accessorKey: 'name' }, { accessorKey: 'email' },
      { accessorKey: 'class', accessorFn: row => row.class.name },
      { accessorKey: 'section' }, { accessorKey: 'gender' },
    ],
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
  it('exports official class codes using the visible, filtered and sorted rows across pages', () => {
    const table = studentTable();
    expect(table.getRowModel().rows).toHaveLength(1);
    const snapshot = schoolTableSnapshot(table);
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
    const table = createTable({
      data: [original],
      columns: Object.keys(original).map(key => ({ id: key, accessorFn: row => row[key as keyof typeof original] })),
      state: {}, onStateChange: () => {}, renderFallbackValue: '', getCoreRowModel: getCoreRowModel(),
    });
    expect(schoolTableSnapshot(table).rows[0]).toEqual(['CP', { id: 'c1', name: '1APG' }, 'Blue', '3APG', '4APG / A']);
    expect(original.class.name).toBe('CP');
    expect(schoolTableSnapshot(table, ['name']).rows[0][0]).toBe('1APG');
  });

  it('writes UTF-8 CSV with quoted cells and escapes spreadsheet formulas', () => {
    const csv = schoolTableCsv({ headers: ['name', 'class'], rows: [['اسم, "élève"', '1APG'], ['=1+1', null], [12, '+212600000000']] });
    expect(csv).toBe('\uFEFF"name","class"\r\n"اسم, ""élève""","1APG"\r\n"\'=1+1",""\r\n"12","\'+212600000000"');
  });
});

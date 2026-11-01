import { describe, expect, it } from 'bun:test';
import { createTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel, getPaginationRowModel } from '@tanstack/react-table';
import { buildStudentPrintDocument, studentPrintSnapshot } from '@/features/Students/config/studentPrint';

describe('student list print', () => {
  it('prints all filtered, sorted pages with readable values and parent phone fallback', () => {
    const table = createTable({
      data: [
        { name: 'Zineb', dateOfBirth: '2012-07-24', gender: 'F', phone: '', contactPhone: '+212600000001', email: 'hidden@example.com' },
        { name: 'Amine', dateOfBirth: '2012-06-02', gender: 'M', phone: '+212600000002', email: '' },
        { name: 'Excluded', dateOfBirth: '', gender: 'M', phone: '', email: '' },
      ],
      columns: [
        { accessorKey: 'name', header: () => null, meta: { exportHeader: 'Name' } },
        { accessorKey: 'dateOfBirth', header: 'Date of Birth' },
        { accessorKey: 'gender', header: 'Gender' },
        { accessorKey: 'phone', header: 'Phone', accessorFn: row => row.phone || row.contactPhone },
        { accessorKey: 'email', header: 'Email' },
        { id: 'actions', cell: () => null },
      ],
      state: {
        sorting: [{ id: 'name', desc: false }], columnFilters: [{ id: 'name', value: 'i' }],
        columnVisibility: { email: false }, pagination: { pageIndex: 0, pageSize: 1 },
      },
      onStateChange: () => {}, renderFallbackValue: '',
      getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(),
      getSortedRowModel: getSortedRowModel(), getPaginationRowModel: getPaginationRowModel(),
    });
    const snapshot = studentPrintSnapshot(table, {
      gender: value => value === 'F' ? 'Female' : 'Male',
      date: value => value.split('-').reverse().join('/'),
    });
    expect(snapshot.columns).toEqual(['Name', 'Date of Birth', 'Gender', 'Phone']);
    expect(snapshot.columnWeights).toEqual([56, 32, 19, 36]);
    expect(snapshot.rows).toEqual([
      ['Amine', '02/06/2012', 'Male', '+212600000002'],
      ['Zineb', '24/07/2012', 'Female', '+212600000001'],
    ]);
    expect(table.getColumn('phone')?.getIsVisible()).toBe(true);
    expect(table.getRowModel().rows).toHaveLength(1);
  });

  it('excludes departed enrollments from both the printed rows and total, using the viewed year', () => {
    const table = createTable({
      data: [
        { name: 'Current in viewed year', status: 'withdrawn', enrollment: { status: 'active', leftOn: null } },
        { name: 'Left school', status: 'active', enrollment: { status: 'active', leftOn: '2026-10-01' } },
        ...['withdrawn', 'transferred', 'graduated'].map(status => ({
          name: status, status: 'active', enrollment: { status, leftOn: null },
        })),
      ],
      columns: [{ accessorKey: 'name', header: 'Name' }],
      state: {}, onStateChange: () => {}, renderFallbackValue: '', getCoreRowModel: getCoreRowModel(),
    });
    const snapshot = studentPrintSnapshot(table, { gender: value => value, date: value => value });
    expect(snapshot.rows).toEqual([['Current in viewed year']]);
    const html = buildStudentPrintDocument(snapshot.rows, {
      language: 'en', school: { name: 'School', contact: [] }, title: 'Students', date: '01/11/2026',
      details: [], columns: snapshot.columns, columnWeights: snapshot.columnWeights,
      totalLabel: 'Total', signature: 'Signature', assetOrigin: 'https://school.test',
      accent: { color: '#d64e57', foreground: '#fff' },
    });
    expect(html).toContain('<span class="chip">Total <b>1</b></span>');
    expect(html).not.toContain('Left school');
    expect(html).not.toContain('<bdi>withdrawn</bdi>');
    expect(html).not.toContain('<bdi>transferred</bdi>');
    expect(html).not.toContain('<bdi>graduated</bdi>');
    expect(table.getPrePaginationRowModel().rows).toHaveLength(5);
  });

  it('uses the attendance letterhead, colored table, summary and signature without a status column', () => {
    const html = buildStudentPrintDocument([['S1', 'Aya <script>', 'آية']], {
      language: 'ar', school: { name: 'School', logo: '/logo.png', contact: ['Rabat'] },
      title: 'Students', date: '01/11/2026', details: [{ label: 'Class', value: '3AC' }],
      columns: ['Code', 'Name', 'Arabic Name'], columnWeights: [25, 75, 55], totalLabel: 'Total', signature: 'Signature',
      assetOrigin: 'https://school.test', accent: { color: '#d64e57', foreground: '#fff' }, orientation: 'landscape',
    });
    expect(html).toContain('<header class="top">');
    expect(html).toContain('src="https://school.test/logo.png"');
    expect(html).toContain('<span class="chip">Total <b>1</b></span>');
    expect(html).toContain('<footer><span class="signature">Signature</span></footer>');
    expect(html).toContain('th{background:var(--accent)');
    expect(html).toContain('tbody tr:nth-child(even)');
    expect(html).toContain('@page{size:A4 landscape;margin:0}');
    const widths = [...html.matchAll(/<col style="width:([\d.]+)%">/g)].map(match => Number(match[1]));
    expect(widths).toHaveLength(4);
    expect(widths.reduce((sum, width) => sum + width, 0)).toBeCloseTo(100, 8);
    expect(html).not.toMatch(/<col style="width:[^"]*mm/);
    expect(html).toContain('table{table-layout:fixed}th{white-space:nowrap}');
    expect(html).toContain('Aya &lt;script&gt;');
    expect(html).not.toContain('<th>Phone</th>');
    expect(html).not.toContain('<span class="badge');
    expect(html).toContain('dir="rtl"');
  });
});

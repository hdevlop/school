import { describe, expect, it } from 'bun:test';
import { createTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel, getPaginationRowModel } from '@tanstack/react-table';
import { buildFeePrintDocument, feePrintSnapshot, FEE_PRINT_COLUMN_WEIGHTS } from '@/features/Financial/Fees/config/feePrint';

const format = {
  money: (value: number) => `${value.toFixed(2)} MAD`,
  date: (value: string) => value.split('-').reverse().join('/'),
  percent: (value: number) => `${Math.round(value)}%`,
  gender: (value: string) => value === 'F' ? 'Female' : 'Male',
  status: (value: string) => value,
};

function table(data: any[]) {
  return createTable({
    data,
    columns: [{ id: 'student', accessorFn: row => row.student.name }],
    state: { sorting: [{ id: 'student', desc: false }], columnFilters: [{ id: 'student', value: 'a' }], pagination: { pageIndex: 0, pageSize: 1 } },
    onStateChange: () => {}, renderFallbackValue: '', getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(), getSortedRowModel: getSortedRowModel(), getPaginationRowModel: getPaginationRowModel(),
  });
}

describe('fee list print', () => {
  it('prints every filtered and sorted page with contacts, monthly debt and received payments', () => {
    const roster = table([
      { student: { studentCode: 'S2', name: 'Zineb A', gender: 'F', phone: ' ', contactPhone: '+212600000002' },
        class: { name: 'CP' }, section: { name: 'A' }, totalFees: 2, netAmount: '16000', totalPaid: '8000',
        collectedToDate: '4000', totalDue: '8000', dueThroughMonth: '500', overdueAmount: '200',
        overdueInstallmentCount: 2, overdueCount: 1, lastPayment: '2026-10-30' },
      { student: { studentCode: 'S1', name: 'Amine', gender: 'M', phone: '+212600000001' },
        totalFees: 1, netAmount: '12000', totalPaid: '12000', collectedToDate: '12000', totalDue: '0', dueThroughMonth: '0' },
      { student: { name: 'Excluded' }, totalFees: 0 },
    ]);
    const snapshot = feePrintSnapshot(roster, format);
    expect(roster.getRowModel().rows).toHaveLength(1);
    expect(snapshot).toHaveLength(2);
    expect(snapshot[0].cells).toEqual(['S1', 'Amine', 'Male', '+212600000001', '—', '—', '12000.00 MAD', '0.00 MAD', '0', '—', 'paid']);
    expect(snapshot[1].cells).toEqual(['S2', 'Zineb A', 'Female', '+212600000002', 'CP', 'A', '4000.00 MAD', '500.00 MAD', '2', '30/10/2026', 'overdue']);
    expect(snapshot[1].progress).toBe(25);
    expect(snapshot[1].progressLabel).toBe('25%');
  });

  it('keeps future-only and fully paid rows distinct while excluding students without fees', () => {
    const rows = feePrintSnapshot(table([
      { student: { name: 'Aya' }, totalFees: 0 },
      { student: { name: 'Amal' }, totalFees: 1, netAmount: '1000', totalPaid: '1000', collectedToDate: '200', totalDue: '0', dueThroughMonth: '0' },
      { student: { name: 'Anas' }, totalFees: 1, netAmount: '0', totalDue: '0' },
    ]), format);
    expect(rows.map(row => row.cells[10])).toEqual(['paying', 'paid']);
    expect(rows.map(row => row.progress)).toEqual([20, 100]);
    expect(rows[0].cells[6]).toBe('200.00 MAD');
    expect(rows[1].cells[9]).toBe('—');
  });

  it('excludes students without fees and departed enrollments from rows and the printed total', () => {
    const fee = { totalFees: 1, netAmount: '100', totalPaid: '100', totalDue: '0' };
    const roster = table([
      { ...fee, student: { name: 'Amine' }, status: 'withdrawn', enrollment: { status: 'active', leftOn: null } },
      { ...fee, student: { name: 'Aya' }, netAmount: '0', totalPaid: '0' },
      { student: { name: 'A no-fee student' }, totalFees: '0', enrollment: { status: 'active' } },
      { student: { name: 'A missing-fees student' } },
      { ...fee, student: { name: 'A left student' }, enrollment: { status: 'active', leftOn: '2026-10-01' } },
      ...['withdrawn', 'transferred', 'graduated'].map(status => ({
        ...fee, student: { name: `A ${status} student` }, enrollment: { status, leftOn: null },
      })),
    ]);
    const rows = feePrintSnapshot(roster, format);
    expect(rows.map(row => row.cells[1])).toEqual(['Amine', 'Aya']);
    expect(roster.getPrePaginationRowModel().rows).toHaveLength(8);
    const html = buildFeePrintDocument(rows, {
      language: 'en', school: { name: 'School', contact: [] }, title: 'Fees', date: '01/11/2026',
      details: [], columns: Array(11).fill('Column'), columnWeights: FEE_PRINT_COLUMN_WEIGHTS,
      totalLabel: 'Total', signature: 'Signature', assetOrigin: 'https://school.test',
      accent: { color: '#d64e57', foreground: '#fff' }, orientation: 'landscape',
    });
    expect(html).toContain('<span class="chip">Total <b>2</b></span>');
    expect(html).toContain('<td class="index">2</td>');
    expect(html).not.toContain('<td class="index">3</td>');
    for (const excluded of ['no-fee', 'missing-fees', 'left', 'withdrawn', 'transferred', 'graduated']) {
      expect(html).not.toContain(`A ${excluded}`);
    }
  });

  it('uses the student letterhead, striped landscape table and payment bar without annual amounts', () => {
    const rows = feePrintSnapshot(table([{ student: { name: 'Aya <script>', studentCode: 'S1', phone: '+212600000001' },
      totalFees: 1, netAmount: '98765', totalPaid: '300', collectedToDate: '300', totalDue: '98465', dueThroughMonth: '200' }]), format);
    const html = buildFeePrintDocument(rows, {
      language: 'ar', school: { name: 'School', logo: '/logo.png', contact: ['Rabat'] }, title: 'Fees', date: '01/11/2026',
      details: [{ label: 'School year', value: '2026-2027' }],
      columns: ['Code', 'Student', 'Gender', 'Phone', 'Class', 'Section', 'Paid so far', 'Due through this month', 'Overdue count', 'Last payment', 'Status'],
      columnWeights: FEE_PRINT_COLUMN_WEIGHTS, totalLabel: 'Total', signature: 'Signature', assetOrigin: 'https://school.test',
      accent: { color: '#d64e57', foreground: '#fff' }, orientation: 'landscape',
    });
    expect(html).toContain('<header class="top">');
    expect(html).toContain('src="https://school.test/logo.png"');
    expect(html).toContain('tbody tr:nth-child(even)');
    expect(html).toContain('@page{size:A4 landscape;margin:0}');
    expect(html).toContain('th{white-space:normal}');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('<bdi dir="ltr">+212600000001</bdi>');
    expect(html).toContain('background:#16a34a');
    expect(html).toContain('Aya &lt;script&gt;');
    expect(html).toContain('<span class="chip">Total <b>1</b></span>');
    expect(html).toContain('200.00 MAD');
    expect(html).not.toContain('98765');
    expect(html).not.toContain('98465');
    expect(html).not.toContain('Net Amount');
  });
});

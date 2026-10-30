import { describe, expect, it } from 'bun:test';
import { translations } from '@sms/contracts/locales';
import { ROSTER_PRINT_CHOICES, buildRosterDocument, orderByCycle, rowsForChoice, type RosterDocumentOptions } from '@/features/Attendance/config/rosterPrint';

const choice = (key: string) => ROSTER_PRINT_CHOICES.find((item) => item.key === key)!;
const rows = [
  { cells: ['ST-1', 'Amine'], mark: 'present' as const },
  { cells: ['ST-2', 'Salma'], mark: 'absent' as const },
  { cells: ['ST-3', 'Yahya'], mark: 'late' as const },
  { cells: ['ST-4', 'Aya'], mark: 'unmarked' as const },
];
const options: RosterDocumentOptions = {
  language: 'en',
  school: { name: 'Academy', logo: '/api/branding/logo.png', contact: ['Rabat', '+212600000000'] },
  title: 'Student Attendance',
  date: '30/10/2026',
  details: [{ label: 'Class', value: '3AC' }],
  columns: ['Code', 'Name'],
  statusHeader: 'Status',
  statusLabels: { present: 'Present', absent: 'Absent', late: 'Late', unmarked: 'Not recorded' },
  totalLabel: 'Total',
  signature: 'Signature',
  assetOrigin: 'https://school.test',
  accent: { color: ' oklch(0.6 0.2 25) ', foreground: '#ffffff' },
};

describe('attendance register print', () => {
  it('offers all, each mark, and absent with late together', () => {
    expect(ROSTER_PRINT_CHOICES.map((item) => item.key)).toEqual(['all', 'present', 'absent', 'late', 'absentAndLate']);
    expect(rowsForChoice(rows, choice('all'))).toEqual(rows);
    expect(rowsForChoice(rows, choice('present')).map((row) => row.cells[1])).toEqual(['Amine']);
    expect(rowsForChoice(rows, choice('absentAndLate')).map((row) => row.cells[1])).toEqual(['Salma', 'Yahya']);
  });

  it('lists the whole school in cycle order, then section, then name', () => {
    const student = (name: string, cls: string, section: string) => ({ name, class: { name: cls }, section: { name: section } });
    const ordered = orderByCycle([
      student('Younouss', '3AC', 'A'),
      student('Sahir', 'PS', 'A'),
      student('Rabii', '3AC', 'A'),
      student('Lmir', 'CP', 'B'),
      student('Khadar', 'CP', 'A'),
    ]);
    expect(ordered.map((person) => person.name)).toEqual(['Sahir', 'Khadar', 'Lmir', 'Rabii', 'Younouss']);
  });

  it('names every choice in all four languages', () => {
    for (const [language, catalog] of Object.entries(translations)) {
      for (const item of ROSTER_PRINT_CHOICES) {
        const value = item.label.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], catalog);
        expect(typeof value, `${language}: ${item.label}`).toBe('string');
      }
    }
  });

  it('prints the given people with their marks, counts and the register details', () => {
    const html = buildRosterDocument(rowsForChoice(rows, choice('absentAndLate')), options);
    expect(html).toContain('<span class="badge mark-absent">Absent</span>');
    expect(html).toContain('<span class="badge mark-late">Late</span>');
    expect(html).not.toContain('Amine');
    expect(html).toContain('<span class="chip">Total <b>2</b></span>');
    expect(html).toContain('<h2>Student Attendance</h2><p><bdi>30/10/2026</bdi></p>');
    expect(html).toContain('<dt>Class</dt><dd><bdi>3AC</bdi></dd>');
    expect(html).toContain('<footer><span class="signature">Signature</span></footer>');
  });

  it('heads the sheet with the school letterhead and keeps its own margins', () => {
    const html = buildRosterDocument(rows, options);
    expect(html).toContain('<img src="https://school.test/api/branding/logo.png" alt="">');
    expect(html).toContain('<h1><bdi>Academy</bdi></h1><p><bdi>Rabat</bdi> · <bdi>+212600000000</bdi></p>');
    // Margins: None in the print dialog drops @page margins, so the page's own padding carries them.
    expect(html).toContain('@page{size:A4 portrait;margin:0}');
    expect(html).toContain('box-decoration-break:clone');
  });

  it('colors the sheet with the app primary, and only with a plain color value', () => {
    expect(buildRosterDocument(rows, options)).toContain(':root{--accent:oklch(0.6 0.2 25);--accent-foreground:#ffffff}');
    const injected = buildRosterDocument(rows, { ...options, accent: { color: 'red}body{display:none', foreground: 'url(x)' } });
    expect(injected).toContain(':root{--accent:#d64e57;--accent-foreground:#ffffff}');
    expect(injected).not.toContain('display:none');
  });

  it('keeps names as text, logos to web addresses, and follows the language direction', () => {
    const html = buildRosterDocument([{ cells: ['<img src=x onerror=alert(1)>'], mark: 'present' }], {
      ...options, language: 'ar', columns: ['Name'], school: { ...options.school, logo: 'javascript:alert(1)' },
    });
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img');
    expect(html).toContain('dir="rtl"');
  });

  it('keeps phone numbers and numeric codes left to right on an Arabic sheet', () => {
    const html = buildRosterDocument([{ cells: ['8889999/26', 'سهير', '+212 600 000 000'], mark: 'present' }], { ...options, language: 'ar', columns: ['Code', 'Name', 'Phone'] });
    expect(html).toContain('<td><bdi dir="ltr">8889999/26</bdi></td><td><bdi>سهير</bdi></td><td><bdi dir="ltr">+212 600 000 000</bdi></td>');
  });
});

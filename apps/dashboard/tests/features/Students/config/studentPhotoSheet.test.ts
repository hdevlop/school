import { describe, expect, it } from 'bun:test';
import { createTable, getCoreRowModel, getFilteredRowModel } from '@tanstack/react-table';
import { buildStudentPhotoSheet, hasStudentPhoto, studentPhotoSheetGroups, studentPhotoSheetLayout } from '@/features/Students/config/studentPhotoSheet';

const options = {
  language: 'en', school: { name: 'School', contact: [] }, title: 'Student photo sheet', date: '21/11/2026',
  details: [{ label: 'School year', value: '2026-2027' }], totalLabel: 'Total', signature: 'Signature',
  assetOrigin: 'https://school.test', accent: { color: '#d64e57', foreground: '#fff' },
  labels: { class: 'Class', section: 'Section' },
};

describe('student photo sheet', () => {
  it('groups the filtered active students by class section in table order', () => {
    const table = createTable({
      data: [
        { name: 'Aya', class: { name: '1AC' }, section: { name: 'A' }, image: '/uploads/aya.jpg' },
        { name: 'Omar', class: { name: '2AC' }, section: { name: 'B' } },
        { name: 'Left', class: { name: '1AC' }, section: { name: 'A' }, enrollment: { status: 'withdrawn', leftOn: null } },
        { name: 'Sara', class: { name: '1AC' }, section: { name: 'A' } },
        { name: 'Filtered out', class: { name: '1AC' }, section: { name: 'A' } },
      ],
      columns: [{ accessorKey: 'name', header: 'Name' }],
      state: { columnFilters: [{ id: 'name', value: 'a' }], pagination: { pageIndex: 0, pageSize: 1 } },
      onStateChange: () => {}, renderFallbackValue: '',
      getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(),
    });
    expect(studentPhotoSheetGroups(table).map(group => [group.className, group.sectionName, group.students.map(s => s.name)]))
      .toEqual([['1AC', 'A', ['Aya', 'Sara']], ['2AC', 'B', ['Omar']]]);
  });

  it('starts one sheet per section with its count, real photos and initials for the rest', () => {
    const html = buildStudentPhotoSheet([
      { className: '1AC', sectionName: 'A', students: [
        { name: 'Aya <b>', arabicName: 'آية', image: '/uploads/aya.jpg' },
        { name: 'Sara Idrissi', image: '/images/student_female.png' },
        { name: 'Hack', image: 'javascript:alert(1)' },
      ] },
      { className: '2AC', sectionName: 'B', students: [{ name: 'Omar' }] },
    ], options);
    expect(html.match(/<section class="sheet fill">/g)).toHaveLength(2);
    expect(html).toContain('<dt>Class</dt><dd><bdi>1AC</bdi></dd>');
    expect(html).toContain('<dt>Section</dt><dd><bdi>B</bdi></dd>');
    expect(html).toContain('<span class="chip">Total <b>3</b></span>');
    expect(html).toContain('src="https://school.test/uploads/aya.jpg"');
    expect(html).toContain('Aya &lt;b&gt;');
    expect(html).toContain('lang="ar" dir="rtl">آية</span>');
    expect(html).toContain('<span class="initials" aria-hidden="true">SI</span>');
    expect(html).not.toContain('student_female.png');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('size:A4 portrait');
    expect(html).toContain('<section class="sheet fill">');
  });

  it('keeps six across and fits a class of up to sixty on one page', () => {
    const students = (count: number) => Array.from({ length: count }, (_, i) => ({ name: `Student ${i + 1}` }));
    const sheet = (count: number) => buildStudentPhotoSheet([{ className: '1AC', sectionName: 'A', students: students(count) }], options);
    expect(sheet(31)).toContain('<div class="grid" style="--rows:6">');
    expect(sheet(45)).toContain('<div class="grid compact" style="--rows:8">');
    expect(sheet(45)).toContain('<section class="sheet fill">');
    expect(sheet(61)).not.toContain('sheet fill');
    expect(sheet(45)).not.toContain('repeat(7,');
    expect(studentPhotoSheetLayout(8)).toEqual({ rows: 5, compact: false, fill: true });
    expect(studentPhotoSheetLayout(30)).toEqual({ rows: 5, compact: false, fill: true });
    expect(studentPhotoSheetLayout(36)).toEqual({ rows: 6, compact: false, fill: true });
    expect(studentPhotoSheetLayout(37)).toEqual({ rows: 7, compact: true, fill: true });
    expect(studentPhotoSheetLayout(60)).toEqual({ rows: 10, compact: true, fill: true });
    expect(studentPhotoSheetLayout(61)).toEqual({ rows: 11, compact: true, fill: false });
  });

  it('treats bundled pictures and the placeholder as no photo', () => {
    expect(hasStudentPhoto('/images/student_male.png')).toBe(false);
    expect(hasStudentPhoto('/noavatar.png')).toBe(false);
    expect(hasStudentPhoto('  ')).toBe(false);
    expect(hasStudentPhoto('/api/storage/students/x.webp')).toBe(true);
  });
});

import { describe, expect, it } from 'bun:test';
import {
  arabicLevelName, buildInsuranceDocument, insuranceClasses, levelYearLabels, INSURANCE_ROWS_PER_PAGE,
  type InsuranceDocumentOptions, type InsuranceStudent,
} from '@/features/Students/insurance/insuranceDocument';

const cp = { id: 'cp', name: 'CP' };
const student = (id: string, overrides: Partial<InsuranceStudent> = {}): InsuranceStudent => ({
  id, name: `Student ${id}`, studentCode: `M${id}`, status: 'active', class: cp,
  enrollmentDate: '2025-09-01', enrollment: { enrolledOn: '2025-09-01' }, ...overrides,
});
const options: InsuranceDocumentOptions = {
  schoolName: 'مؤسسة النجاح', schoolAddress: 'شارع الإمام مالك', schoolPhones: ['0522750085', '0808524592'],
  licenseNumber: '2015/100.119', licenseDate: '2015-10-19',
  cycles: ['التعليم الأولي', 'الابتدائي'], academicYear: '2025-2026', assetOrigin: 'https://school.example',
};

describe('insurance register', () => {
  it('prints the Arabic birthplace, escapes it, and falls back to Latin when needed', () => {
    const html = buildInsuranceDocument(insuranceClasses([
      student('a', { birthplace: 'Casablanca', birthplaceArabic: 'الدار البيضاء' }),
      student('b', { birthplace: '<Madrid>' }),
    ]), options);
    expect(html).toContain('<bdi>الدار البيضاء</bdi>');
    expect(html).toContain('<bdi>&lt;Madrid&gt;</bdi>');
    expect(html).not.toContain('<Madrid>');
  });
  it('lists active, placed students one class at a time, in academic and name order', () => {
    const classes = insuranceClasses([
      student('b', { arabicName: 'يوسف' }),
      student('a', { arabicName: 'أحمد' }),
      student('ce1', { class: { id: 'ce1', name: 'CE1' } }),
      student('gone', { status: 'withdrawn' }),
      student('unplaced', { class: null }),
    ]);
    expect(classes.map(cls => cls.id)).toEqual(['cp', 'ce1']);
    expect(classes[0].students.map(row => row.id)).toEqual(['a', 'b']);
  });

  it('names known levels the ministry way and keeps custom class names', () => {
    expect(arabicLevelName('CP')).toBe('الأول ابتدائي');
    expect(arabicLevelName('1APIC')).toBe('الأولى إعدادي');
    expect(arabicLevelName('Atelier')).toBe('Atelier');
    expect(levelYearLabels('2025-2026')).toEqual(['24', '25']);
  });

  it('spans the grouped headers and pads each class to full sheets', () => {
    const rows = Array.from({ length: INSURANCE_ROWS_PER_PAGE + 1 }, (_, index) => student(String(index).padStart(2, '0')));
    const html = buildInsuranceDocument(insuranceClasses(rows), options);
    expect(html).toContain('<html lang="ar" dir="rtl">');
    expect(html.match(/<section class="sheet"/g)).toHaveLength(2);
    expect(html.match(/<td class="number">/g)).toHaveLength(2 * INSURANCE_ROWS_PER_PAGE);
    expect(html).toContain('<td class="number">26</td>');
    expect(html).toContain('<th colspan="3" class="group">معلومات عن المؤسسة التي أتى منها</th>');
    expect(html).toContain('<th colspan="4" class="group">معلومات عن المؤسسة الحالية</th>');
    expect(html).toContain('<th colspan="2">المستويات التي درس بها</th>');
    expect(html).toContain('<th dir="ltr">24</th><th dir="ltr">25</th>');
    expect(html).toContain('<bdi dir="ltr">2025/2026</bdi>');
    expect(html).toContain('القسم: الأول ابتدائي');
    expect(html).toContain('size:A4 landscape');
  });

  it('dates a renewal only for students first enrolled before this year, and escapes every value', () => {
    const html = buildInsuranceDocument(insuranceClasses([
      student('old', { dateOfBirth: '2018-03-07', enrollmentDate: '2023-09-04', enrollment: { enrolledOn: '2025-09-02' }, previousSchool: '<b>X</b>' }),
      student('new'),
    ]), options);
    expect(html).toContain('<bdi dir="ltr">07/03/2018</bdi>');
    expect(html).toContain('<bdi dir="ltr">04/09/2023</bdi></td>\n          <td><bdi dir="ltr">02/09/2025</bdi>');
    expect(html).toContain('<bdi dir="ltr">01/09/2025</bdi></td>\n          <td></td>');
    expect(html).toContain('&lt;b&gt;X&lt;/b&gt;');
    expect(html).not.toContain('<b>X</b>');
  });

  it('prints the license and every phone from Settings, and leaves a line to fill when they are missing', () => {
    const html = buildInsuranceDocument(insuranceClasses([student('a')]), options);
    expect(html).toContain('رقم الرخصة: <bdi dir="ltr">2015/100.119</bdi>');
    expect(html).toContain('تاريخها: <bdi dir="ltr">19/10/2015</bdi>');
    expect(html).toContain('<bdi dir="ltr">0522750085 / 0808524592</bdi>');
    const bare = buildInsuranceDocument(insuranceClasses([student('a')]), { ...options, schoolPhones: [], licenseNumber: null, licenseDate: null });
    expect(bare).toContain('رقم الرخصة: <span class="blank"></span>');
    expect(bare).toContain('الهاتف:</b> <span class="blank"></span>');
  });

  it('accepts only http(s) logos', () => {
    expect(buildInsuranceDocument(insuranceClasses([student('a')]), { ...options, schoolLogo: 'javascript:alert(1)' })).not.toContain('<img');
    expect(buildInsuranceDocument(insuranceClasses([student('a')]), { ...options, schoolLogo: '/logo.png' })).toContain('src="https://school.example/logo.png"');
  });
});

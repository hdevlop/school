import { describe, expect, it } from 'bun:test';
import { FeeService } from '../../src/modules/financial/fees/FeeService';

function build(selectedYear = '2025-2026') {
  const created: Array<{ studentId: string; academicYear?: string; effectiveDate?: string | null }> = [];
  const reads: string[] = [];
  const classes = {
    getByAcademicYear: async () => [{ id: 'old-class' }],
    getClassSections: async () => [{ id: 'old-section' }],
    getClassStudents: async () => {
      reads.push('current-class');
      return [{ id: 'current-student', name: 'Current Student', sectionId: 'old-section' }];
    },
  };
  const enrollments = {
    listRosterAtDate: async (yearId: string, date: string) => {
      reads.push(`${yearId}:${date}`);
      return [
        { studentId: 'historical-student', studentName: 'Historical Student', classId: 'old-class', sectionId: 'old-section' },
        { studentId: 'other-section-student', studentName: 'Other Student', classId: 'old-class', sectionId: 'other-section' },
        { studentId: 'current-student', studentName: 'Current Student', classId: 'new-class', sectionId: 'new-section' },
      ];
    },
  };
  const years = {
    requireLabel: async (label: string) => ({
      id: label === '2025-2026' ? 'old-year' : 'active-year', label,
      reportingStartsOn: `${label.slice(0, 4)}-09-01`, reportingEndsOn: `${label.slice(5)}-08-31`,
    }),
  };
  const service = new FeeService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    classes as any,
    {} as any,
    {} as any,
    enrollments as any,
    years as any,
  );
  (service as any).year = {
    id: selectedYear === '2025-2026' ? 'old-year' : 'active-year',
    label: selectedYear,
  };
  service.create = async (data: any) => {
    created.push(data);
    return { id: `fee-${data.studentId}` } as any;
  };
  return { service, created, reads };
}

describe('year-targeted class bulk fees', () => {
  const data = {
    classId: 'old-class', sectionId: 'old-section', feeTypeId: 'fee-type',
    schedule: 'oneTime' as const, academicYear: '2025-2026', effectiveDate: '2025-10-01',
  };

  it('uses the dated placement instead of the current student class', async () => {
    const { service, created, reads } = build();
    expect(await service.createClassBulk(data, 'finance-1')).toEqual({
      created: 1, skipped: 0, errors: [],
    });
    expect(created.map((fee) => ({
      studentId: fee.studentId, academicYear: fee.academicYear,
      effectiveDate: fee.effectiveDate,
    }))).toEqual([{
      studentId: 'historical-student', academicYear: '2025-2026',
      effectiveDate: '2025-10-01',
    }]);
    expect(reads).toEqual(['old-year:2025-10-01']);
  });

  it('requires a real effective date inside the selected year', async () => {
    const { service, created, reads } = build();
    await expect(service.createClassBulk({ ...data, effectiveDate: undefined }, 'finance-1'))
      .rejects.toThrow();
    await expect(service.createClassBulk({ ...data, effectiveDate: '2025-02-30' }, 'finance-1'))
      .rejects.toThrow();
    expect(created).toEqual([]);
    expect(reads).toEqual([]);
  });

  it("charges the request's year when the fee names none, from that year's roster", async () => {
    const { service, created, reads } = build('2026-2027');
    await service.createClassBulk({ ...data, academicYear: undefined, effectiveDate: '2026-10-01' }, 'finance-1');
    expect(reads).toEqual(['active-year:2026-10-01']);
    expect(created.every((fee) => fee.academicYear === '2026-2027')).toBe(true);
  });
});

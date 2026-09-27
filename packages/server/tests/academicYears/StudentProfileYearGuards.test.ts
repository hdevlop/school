import { describe, expect, it } from 'bun:test';
import { StudentService } from '../../src/modules/students/StudentService';
import { StudentValidator } from '../../src/modules/students/StudentValidator';

function build() {
  let writes = 0;
  const student = {
    id: 'student-1', userId: 'user-1', classId: 'class-2025',
    sectionId: 'section-2025', status: 'active', enrollmentDate: '2025-08-20',
  };
  const validator = new StudentValidator(
    { getById: async () => student } as any,
    {} as any, {} as any, {} as any,
    { earliestEnrolledOn: async () => '2025-09-01' } as any,
  );
  const service = new StudentService(
    { update: async () => { writes++; return student; } } as any,
    validator,
    { update: async () => { writes++; } } as any,
    {} as any, {} as any, {} as any, {} as any,
    {} as any,
    {} as any,
  );
  return { service, getWrites: () => writes };
}

describe('student profile history guards', () => {
  it('rejects direct class changes even for a legacy student', async () => {
    const { service, getWrites } = build();
    await expect(service.update('student-1', { classId: 'class-2026' }))
      .rejects.toThrow();
    expect(getWrites()).toBe(0);
  });

  it('rejects moving original admission after a dated enrollment', async () => {
    const { service, getWrites } = build();
    await expect(service.update('student-1', { enrollmentDate: '2025-09-02' }))
      .rejects.toThrow();
    expect(getWrites()).toBe(0);
  });
});

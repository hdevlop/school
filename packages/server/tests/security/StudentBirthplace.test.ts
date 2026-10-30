import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { createStudentDto, importStudentDto, updateStudentDto } from '../../src/modules/students/StudentDto';
import { StudentService } from '../../src/modules/students/StudentService';

const identity = { name: 'Yasmine Alaoui', studentCode: 'birthplace-canary', gender: 'F', classId: 'c', sectionId: 's', enrollmentDate: '2026-09-01', yearEnrolledOn: '2026-09-01' };

describe('student birthplace persistence', () => {
  it('validates all creation transports and partial updates without requiring birthplace', () => {
    for (const schema of [createStudentDto, importStudentDto]) {
      expect(schema.safeParse(identity).success).toBe(true);
      expect(schema.parse({ ...identity, birthplace: ' Madrid ', birthplaceArabic: 'مدريد' })).toMatchObject({ birthplace: 'Madrid', birthplaceArabic: 'مدريد' });
      expect(schema.safeParse({ ...identity, birthplaceId: 'missing' }).success).toBe(false);
      expect(schema.safeParse({ ...identity, birthplace: 'x'.repeat(201) }).success).toBe(false);
    }
    expect(updateStudentDto.parse({ birthplace: null, birthplaceArabic: null, birthplaceId: null })).toEqual({ birthplace: null, birthplaceArabic: null, birthplaceId: null });
  });
  it('stores canonical names in the normal creation service without creating a login', async () => {
    let saved: Record<string, unknown> | undefined;
    const service = new StudentService(
      { create: async (data: Record<string, unknown>) => { saved = data; return data; } } as never,
      { ensureNestedCreateAllowed() {}, parseNestedCreate: () => ({}), ensureCodeUnique() {}, ensureEmailUnique() {}, ensurePhoneUnique() {}, ensureClassAndSectionValid() {}, ensureCreateAllowed() {} } as never,
      {} as never, {} as never,
      { processParents: async () => ({}) } as never,
      { processFees: async () => {} } as never,
      {} as never,
      { resolveNewStudentPlacement: async () => ({ id: 'year', label: '2026-2027' }), create: async () => ({ id: 'enrollment' }) } as never,
      { processFile: async () => null } as never,
    );
    await service.createForImport({ ...identity, gender: 'F', birthplace: 'Casa' }, { id: 'admin', role: 'admin' });
    expect(saved).toMatchObject({ birthplaceId: 'MA-HCP-06141010', birthplace: 'Casablanca', birthplaceArabic: 'الدار البيضاء' });
  });
  it('updates only birthplace fields and leaves them alone on unrelated edits', async () => {
    const writes: Record<string, unknown>[] = [];
    const existing = { id: 's', userId: null, name: 'Yasmine Alaoui' };
    const service = new StudentService(
      { update: async (_id: string, fields: Record<string, unknown>) => { writes.push(fields); } } as never,
      { ensureExists: async () => existing, ensureProfileUpdateAllowed() {}, ensureCodeUnique() {}, ensureEmailUnique() {}, ensurePhoneUnique() {}, ensureClassAndSectionValid() {} } as never,
      {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never,
    );
    service.getById = async () => existing as never;
    await service.update('s', { birthplace: 'الدار البيضاء' });
    expect(writes[0]).toEqual({ birthplaceId: 'MA-HCP-06141010', birthplace: 'Casablanca', birthplaceArabic: 'الدار البيضاء' });
    await service.update('s', { birthplace: '' });
    expect(writes[1]).toEqual({ birthplaceId: null, birthplace: null, birthplaceArabic: null });
    await service.update('s', { name: 'Yasmine' });
    expect(writes[2]).toEqual({ name: 'Yasmine' });
  });
});

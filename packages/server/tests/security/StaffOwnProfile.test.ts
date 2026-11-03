import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { StaffService } from '../../src/modules/staff/StaffService';

const record = {
  id: 'staff-1',
  userId: 'user-1',
  employeeCode: 'EMP-000001',
  name: 'Fatima Zahra',
  cin: 'AB123456',
  phone: '+212612345678',
  email: 'fatima@example.ma',
  address: 'Casablanca',
  medicalConditions: 'Asthma',
  role: 'floorManager',
  roleLabel: 'Floor manager',
  roleLabels: { fr: "Responsable d'étage" },
  department: 'Primary',
  salary: 9000,
  hourlyRate: 50,
  bankAccount: 'MA00',
  emergencyContact: 'Someone',
  emergencyPhone: '+212600000000',
  shift: 'morning',
  employmentType: 'fullTime',
  hireDate: '2026-09-01',
  status: 'active',
  assignments: [
    { id: 'a-1', type: 'floorManager', className: 'CM1', notes: 'Under review', current: true },
    { id: 'a-2', type: 'floorManager', className: 'CE2', notes: null, current: false },
  ],
};

function serviceFor(row: unknown) {
  const requested: string[] = [];
  const repository = { getByUserId: async (userId: string) => { requested.push(userId); return row; } };
  const service = new StaffService(
    repository as never, {} as never, {} as never, {} as never, {} as never,
    {} as never, {} as never, {} as never, {} as never,
  );
  return { service, requested };
}

describe('a staff member reading their own record', () => {
  it('reads the record of the id it is given', async () => {
    const { service, requested } = serviceFor(record);
    await service.getOwnProfile('user-1');
    expect(requested).toEqual(['user-1']);
  });

  it('returns the work details and nothing else', async () => {
    const { service } = serviceFor(record);
    const profile = await service.getOwnProfile('user-1');
    expect(Object.keys(profile ?? {}).sort()).toEqual([
      'assignments', 'department', 'employeeCode', 'employmentType', 'hireDate',
      'phone', 'roleLabel', 'roleLabels', 'shift', 'status',
    ]);
  });

  it('keeps only current assignments, without the notes written about them', async () => {
    const { service } = serviceFor(record);
    const profile = await service.getOwnProfile('user-1');
    expect(profile?.assignments).toEqual([{ id: 'a-1', type: 'floorManager', className: 'CM1', current: true }] as never);
  });

  it('answers null for an account with no staff record', async () => {
    const { service } = serviceFor(null);
    expect(await service.getOwnProfile('admin-1')).toBeNull();
  });
});

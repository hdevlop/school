import { describe, expect, it } from 'bun:test';
import { createStaffDto, updateStaffDto } from '../../src/modules/staff/StaffDto';

const staff = {
  name: 'Fatima Zahra', phone: '+212612345678', address: 'Casablanca',
  role: 'secretary', salary: 3000, hireDate: '2026-09-01',
};

describe('staff CIN validation', () => {
  it('accepts seven-character identifiers when creating and updating staff', () => {
    for (const cin of ['A123456', '1234567', 'AB123456', 'A'.repeat(20)]) {
      expect(createStaffDto.safeParse({ ...staff, cin }).success, cin).toBe(true);
      expect(updateStaffDto.safeParse({ cin }).success, cin).toBe(true);
    }
  });

  it('retains both length limits and allows unrelated partial updates', () => {
    for (const cin of ['', 'A12345', 'A'.repeat(21)]) {
      expect(createStaffDto.safeParse({ ...staff, cin }).success, cin).toBe(false);
      expect(updateStaffDto.safeParse({ cin }).success, cin).toBe(false);
    }
    expect(updateStaffDto.safeParse({ name: staff.name }).success).toBe(true);
  });
});

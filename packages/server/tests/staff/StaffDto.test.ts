import { describe, expect, it } from 'bun:test';
import { createStaffDto, updateStaffDto } from '@server/modules/staff/StaffDto';

const validStaff = {
  name: 'Amina Benali',
  cin: 'AB123456',
  phone: '+212600000000',
  address: '123 Rue Casablanca',
  role: 'secretary',
  hireDate: '2024-09-01',
  salary: 5000,
};

describe('createStaffDto', () => {
  it('parses a valid minimal staff member', () => {
    expect(createStaffDto.safeParse(validStaff).success).toBe(true);
  });

  it('rejects missing cin', () => {
    const { cin, ...data } = validStaff;
    expect(createStaffDto.safeParse(data).success).toBe(false);
  });

  it('rejects missing phone', () => {
    const { phone, ...data } = validStaff;
    expect(createStaffDto.safeParse(data).success).toBe(false);
  });

  it('rejects missing address', () => {
    const { address, ...data } = validStaff;
    expect(createStaffDto.safeParse(data).success).toBe(false);
  });

  it('rejects empty address', () => {
    expect(createStaffDto.safeParse({ ...validStaff, address: '' }).success).toBe(false);
  });

  it('rejects missing salary', () => {
    const { salary, ...data } = validStaff;
    expect(createStaffDto.safeParse(data).success).toBe(false);
  });
});

describe('updateStaffDto', () => {
  it('keeps staff updates partial', () => {
    expect(updateStaffDto.safeParse({}).success).toBe(true);
  });

  it('still validates provided cin and phone', () => {
    expect(updateStaffDto.safeParse({ cin: 'AB12' }).success).toBe(false);
    expect(updateStaffDto.safeParse({ phone: 'abc' }).success).toBe(false);
  });
});

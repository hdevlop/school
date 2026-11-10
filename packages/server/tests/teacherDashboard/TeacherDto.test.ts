import { describe, expect, it } from 'bun:test';
import { createTeacherDto, updateTeacherDto } from '../../src/modules/teachers/TeacherDto';

const teacher = {
  name: 'Youssef Idrissi', cin: 'AB123456', email: 'youssef@example.ma',
  phone: '+212612345678', address: '12 Rue Hassan II, Rabat', hireDate: '2026-09-01',
};

describe('teacher address validation', () => {
  it.each([undefined, null, '', '   '])('rejects creating a teacher without an address (%j)', address => {
    expect(createTeacherDto.safeParse({ ...teacher, address }).success).toBe(false);
  });

  it.each([null, '', '   '])('rejects clearing an address on update (%j)', address => {
    expect(updateTeacherDto.safeParse({ address }).success).toBe(false);
  });

  it('trims valid addresses and retains the length limit', () => {
    expect(createTeacherDto.parse({ ...teacher, address: '  Rabat  ' }).address).toBe('Rabat');
    expect(updateTeacherDto.parse({ address: '  Rabat  ' }).address).toBe('Rabat');
    expect(createTeacherDto.safeParse({ ...teacher, address: 'A'.repeat(501) }).success).toBe(false);
    expect(updateTeacherDto.safeParse({ address: 'A'.repeat(501) }).success).toBe(false);
  });

  it('keeps unrelated partial updates possible', () => {
    expect(updateTeacherDto.parse({ name: 'Youssef Idrissi' })).toEqual({ name: 'Youssef Idrissi' });
  });
});

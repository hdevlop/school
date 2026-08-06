import { describe, expect, it } from 'bun:test';
import {
  createDisciplineDto,
  resolveDisciplineDto,
  updateDisciplineDto,
} from '@server/modules/discipline/DisciplineDto';

const validCreate = {
  studentId: 'student_01',
  incidentAt: '2026-07-12T09:30:00.000Z',
  category: 'classroom_disruption',
  severity: 'medium',
  location: 'Room 12',
  description: 'The student repeatedly interrupted the lesson after two reminders.',
};

describe('Discipline DTOs', () => {
  it('accepts a valid creation payload', () => {
    expect(createDisciplineDto.safeParse(validCreate).success).toBe(true);
  });

  it.each(['studentId', 'incidentAt', 'category', 'severity', 'description'])('rejects a missing %s', (field) => {
    const input = { ...validCreate } as any;
    delete input[field];
    expect(createDisciplineDto.safeParse(input).success).toBe(false);
  });

  it('rejects invalid enum values', () => {
    expect(createDisciplineDto.safeParse({ ...validCreate, severity: 'extreme' }).success).toBe(false);
    expect(createDisciplineDto.safeParse({ ...validCreate, category: 'unknown' }).success).toBe(false);
  });

  it('enforces incident text limits', () => {
    expect(createDisciplineDto.safeParse({ ...validCreate, location: 'x'.repeat(151) }).success).toBe(false);
    expect(createDisciplineDto.safeParse({ ...validCreate, description: 'x'.repeat(2001) }).success).toBe(false);
  });

  it('keeps derived and workflow fields out of generic updates', () => {
    const result = updateDisciplineDto.parse({ reportedBy: 'attacker', status: 'resolved', classId: 'class_02' });
    expect(result).toEqual({});
  });

  it('requires a valid action and a non-empty resolution note', () => {
    expect(resolveDisciplineDto.safeParse({ actionType: 'detention', resolutionNote: 'Parent contacted.' }).success).toBe(true);
    expect(resolveDisciplineDto.safeParse({ actionType: 'detention' }).success).toBe(false);
    expect(resolveDisciplineDto.safeParse({ actionType: 'invalid', resolutionNote: 'Done' }).success).toBe(false);
    expect(resolveDisciplineDto.safeParse({ actionType: 'detention', resolutionNote: 'x'.repeat(2001) }).success).toBe(false);
  });
});

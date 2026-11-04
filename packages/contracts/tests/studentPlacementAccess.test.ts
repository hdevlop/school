import { describe, expect, it } from 'bun:test';
import { canEditStudentPlacement } from '../src/accessControl';

describe('student placement edit access', () => {
  it.each(['admin', 'principal', 'registrar'])('allows %s alongside the student update permission', role => {
    expect(canEditStudentPlacement(role)).toBe(true);
  });

  it.each(['teacher', 'parent', 'student', 'secretary', 'accounting', 'supervisor', 'custom', undefined, null])('refuses %s', role => {
    expect(canEditStudentPlacement(role)).toBe(false);
  });
});

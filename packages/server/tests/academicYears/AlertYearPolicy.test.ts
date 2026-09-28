import { describe, expect, it } from 'bun:test';
import { alertYearScope } from '../../src/modules/alerts/alertYearPolicy';

describe('new Alert year attribution', () => {
  it('keeps academic and audience announcements in the selected year', () => {
    expect(alertYearScope({ type: 'academic' })).toBe('year');
    expect(alertYearScope({ type: 'attendance', studentId: 'student-01' })).toBe('year');
    expect(alertYearScope({ type: 'behavioral', teacherId: 'teacher-01' })).toBe('year');
    expect(alertYearScope({ type: 'health', studentId: 'student-01' })).toBe('year');
    expect(alertYearScope({ type: 'announcement' })).toBe('year');
    expect(alertYearScope({ type: 'reminder' })).toBe('year');
  });

  it('keeps system notices and unbound emergencies shared', () => {
    expect(alertYearScope({ type: 'system' })).toBe('shared');
    expect(alertYearScope({ type: 'emergency' })).toBe('shared');
    expect(alertYearScope({ type: 'emergency', classId: 'class-2025' })).toBe('year');
    expect(alertYearScope({ type: 'emergency', studentId: 'student-01' })).toBe('year');
  });

  it('marks system notices with academic references invalid for validator rejection', () => {
    expect(alertYearScope({ type: 'system', classId: 'class-2025' })).toBe('invalid');
    expect(alertYearScope({ type: 'system', subjectId: 'math' })).toBe('invalid');
  });
});

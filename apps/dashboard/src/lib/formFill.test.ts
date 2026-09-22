import { describe, expect, it } from 'bun:test';

import { examSchema } from '@/features/Exams/config/examSchemas';
import { buildFill } from './devFill';

describe('development form fill', () => {
  it('keeps the live relation ids the form pins over generated ones', () => {
    const filled = buildFill(examSchema, {
      classId: 'live-class',
      sectionId: 'live-section',
      subjectId: 'live-subject',
      teacherId: 'live-teacher',
    });

    expect(filled.classId).toBe('live-class');
    expect(filled.sectionId).toBe('live-section');
    expect(filled.subjectId).toBe('live-subject');
    expect(filled.teacherId).toBe('live-teacher');
  });

  it('treats an array override as the options to pick one value from', () => {
    const options = [{ value: 'subject-a' }, { value: 'subject-b' }];
    const filled = buildFill(examSchema, { subjectId: options });

    expect(['subject-a', 'subject-b']).toContain(filled.subjectId);
  });

  it('fills the rest of an exam from the shared fixtures', () => {
    const filled = buildFill(examSchema, { teacherId: 'live-teacher' });

    expect(typeof filled.title).toBe('string');
    expect(filled.title.length).toBeGreaterThan(0);
    expect(filled.startTime).toMatch(/^\d{2}:\d{2}$/);
    expect(filled.totalMarks).toBeGreaterThan(0);
  });
});

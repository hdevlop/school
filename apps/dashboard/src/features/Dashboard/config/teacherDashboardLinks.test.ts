import { describe, expect, it } from 'bun:test';
import { lessonAttendanceHref, splitMinutes } from './teacherDashboardLinks';

describe('lessonAttendanceHref', () => {
  it('names the parameters the student register reads', () => {
    const href = lessonAttendanceHref({ classId: 'c 1', sectionId: 's&2', teacherAssignmentId: 'a3' });
    const url = new URL(href, 'http://school.test');
    expect(url.pathname).toBe('/attendance/students');
    expect(url.searchParams.get('classId')).toBe('c 1');
    expect(url.searchParams.get('sectionId')).toBe('s&2');
    expect(url.searchParams.get('assignmentId')).toBe('a3');
  });
});

describe('splitMinutes', () => {
  it('splits a countdown into hours and minutes', () => {
    expect(splitMinutes(25)).toEqual({ hours: 0, minutes: 25 });
    expect(splitMinutes(200)).toEqual({ hours: 3, minutes: 20 });
    expect(splitMinutes(-4)).toEqual({ hours: 0, minutes: 0 });
  });
});

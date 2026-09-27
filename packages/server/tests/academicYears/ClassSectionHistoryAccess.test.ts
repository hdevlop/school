import { describe, expect, it } from 'bun:test';
import { ClassService } from '../../src/modules/classes/ClassService';
import { SectionService } from '../../src/modules/sections/SectionService';

describe('class and section history access', () => {
  it('lists the classes and sections of the year it is given', async () => {
    const calls: string[] = [];
    const year = { id: 'year-1', label: '2027-2028' } as any;
    const classes = new ClassService({ getAll: async (label: string) => {
      calls.push(`classes:${label}`); return [];
    } } as any, {} as any, {} as any, {} as any);
    const sections = new SectionService({ getAll: async (label: string) => {
      calls.push(`sections:${label}`); return [];
    } } as any, {} as any, {} as any);
    await classes.getAll(year);
    await sections.getAll(year);
    expect(calls).toEqual(['classes:2027-2028', 'sections:2027-2028']);
  });

  it('refuses a related old-class read before the related repository query', async () => {
    let relatedRead = false;
    const classes = new ClassService(
      { getClassSections: async () => { relatedRead = true; return []; } } as any,
      { ensureExists: async () => ({ id: 'old-class', academicYear: '2026-2027' }) } as any,
      {} as any,
      { resolve: async () => { throw new Error('Other school years are restricted'); } } as any,
    );
    await expect(classes.getSections('old-class', 'teacher'))
      .rejects.toThrow('Other school years are restricted');
    expect(relatedRead).toBe(false);
  });

  it('refuses a related old-section read before the related repository query', async () => {
    let relatedRead = false;
    const sections = new SectionService(
      { getStudents: async () => { relatedRead = true; return []; } } as any,
      { ensureExists: async () => ({ id: 'old-section', class: { academicYear: '2026-2027' } }) } as any,
      { resolve: async () => { throw new Error('Other school years are restricted'); } } as any,
    );
    await expect(sections.getStudents('old-section', 'teacher'))
      .rejects.toThrow('Other school years are restricted');
    expect(relatedRead).toBe(false);
  });
});

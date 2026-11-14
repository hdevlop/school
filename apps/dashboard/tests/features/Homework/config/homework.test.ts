import { describe, expect, it } from 'bun:test';
import { HOMEWORK_LIMITS, type HomeworkAttachment } from '@sms/contracts';
import { translations } from '@sms/contracts/locales';

import { createHomeworkSchema } from '@/features/Homework/config/homeworkSchemas';
import { fileRefusal, fileSizeLabel, liveAttachments, refusalLimitMb, remainingFileSlots } from '@/features/Homework/config/homeworkFiles';
import { fitWithin, renamedFor } from '@/lib/compressImage';
import { taughtClassIds, taughtSectionIds, taughtSubjectIds } from '@/features/Homework/config/homeworkTeaching';

// The translator echoes the key: a wrong key would render raw in the form.
const echo = (key: string) => key;
const MB = 1024 * 1024;

const valid = {
  classId: 'class-1',
  sectionIds: ['section-a'],
  subjectId: 'subject-1',
  teacherId: 'teacher-1',
  title: 'Exercices 4 et 5 p. 32',
  content: '',
  date: '2026-11-13',
  dueOn: '2026-11-19',
};

describe('the homework form', () => {
  const adminSchema = createHomeworkSchema(echo, { teacherRequired: true });
  const teacherSchema = createHomeworkSchema(echo, { teacherRequired: false });

  it('accepts a homework without details or a due date', () => {
    const parsed = adminSchema.parse({ ...valid, content: undefined, dueOn: '' });
    expect(parsed.dueOn).toBeNull();
    expect(parsed.title).toBe(valid.title);
  });

  it('asks the administration for a teacher and never asks a teacher', () => {
    const refused = adminSchema.safeParse({ ...valid, teacherId: '' });
    expect(refused.success).toBe(false);
    expect(refused.error?.issues[0]).toMatchObject({ path: ['teacherId'], message: 'homework.errors.teacherRequired' });
    expect(teacherSchema.safeParse({ ...valid, teacherId: undefined }).success).toBe(true);
  });

  it('refuses a due date before the day the homework is given', () => {
    const refused = adminSchema.safeParse({ ...valid, dueOn: '2026-11-12' });
    expect(refused.success).toBe(false);
    expect(refused.error?.issues[0]).toMatchObject({ path: ['dueOn'], message: 'homework.errors.dueBeforeGiven' });
    expect(adminSchema.safeParse({ ...valid, dueOn: valid.date }).success).toBe(true);
  });

  it('needs a section, a subject and a title, within the shared limits', () => {
    expect(adminSchema.safeParse({ ...valid, sectionIds: [] }).success).toBe(false);
    expect(adminSchema.safeParse({ ...valid, subjectId: '' }).success).toBe(false);
    expect(adminSchema.safeParse({ ...valid, title: 'ab' }).success).toBe(false);
    expect(adminSchema.safeParse({ ...valid, title: 'x'.repeat(HOMEWORK_LIMITS.title + 1) }).success).toBe(false);
    expect(adminSchema.safeParse({ ...valid, content: 'x'.repeat(HOMEWORK_LIMITS.content + 1) }).success).toBe(false);
    expect(adminSchema.safeParse({ ...valid, date: '13/11/2026' }).success).toBe(false);
  });
});

describe('homework files in the form', () => {
  const attachment = (id: string, purgedAt: string | null = null): HomeworkAttachment =>
    ({ id, kind: 'image', mimeType: 'image/webp', size: 1000, width: 10, height: 10, position: 0, purgedAt });

  it('counts only files that are still stored toward the limit of five', () => {
    const live = liveAttachments([attachment('a'), attachment('b', '2026-11-01T00:00:00Z')]);
    expect(live.map((item) => item.id)).toEqual(['a']);
    expect(remainingFileSlots(live.length, 0)).toBe(4);
    expect(remainingFileSlots(3, 2)).toBe(0);
    expect(remainingFileSlots(5, 3)).toBe(0);
    expect(liveAttachments()).toEqual([]);
  });

  it('refuses what the server refuses: other types, a PDF over 5 MB, an image over 10 MB', () => {
    expect(fileRefusal({ type: 'image/webp', size: 300_000 })).toBeNull();
    expect(fileRefusal({ type: 'application/pdf', size: 5 * MB })).toBeNull();
    expect(fileRefusal({ type: 'application/pdf', size: 5 * MB + 1 })).toBe('pdfTooLarge');
    expect(fileRefusal({ type: 'image/jpeg', size: 10 * MB + 1 })).toBe('imageTooLarge');
    expect(fileRefusal({ type: 'application/zip', size: 10 })).toBe('unsupportedFile');
    expect(fileRefusal({ type: '', size: 10 })).toBe('unsupportedFile');
    expect(refusalLimitMb('pdfTooLarge')).toBe(5);
    expect(refusalLimitMb('imageTooLarge')).toBe(10);
  });

  it('has a message with the limit for every refusal, in every language', () => {
    for (const language of ['en', 'fr', 'ar', 'es'] as const) {
      const errors = translations[language].homework.errors;
      expect(errors.pdfTooLarge).toContain('{{max}}');
      expect(errors.imageTooLarge).toContain('{{max}}');
      expect(errors.unsupportedFile.length).toBeGreaterThan(0);
      expect(translations[language].homework.form.tooManyFiles).toContain('{{max}}');
    }
  });

  it('labels a size in the unit a person reads', () => {
    expect(fileSizeLabel(300 * 1024)).toBe('300 KB');
    expect(fileSizeLabel(200)).toBe('1 KB');
    expect(fileSizeLabel(2.5 * MB)).toBe('2.5 MB');
  });
});

describe('reducing a photo in the browser', () => {
  it('fits the longest edge in 1600 px and keeps the proportions', () => {
    expect(fitWithin({ width: 4000, height: 3000 }, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin({ width: 3000, height: 4000 }, 1600)).toEqual({ width: 1200, height: 1600 });
    expect(fitWithin({ width: 3024, height: 4032 }, HOMEWORK_LIMITS.imageEdge)).toEqual({ width: 1200, height: 1600 });
  });

  it('never enlarges and never returns an empty size', () => {
    expect(fitWithin({ width: 800, height: 600 }, 1600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin({ width: 1600, height: 1600 }, 1600)).toEqual({ width: 1600, height: 1600 });
    expect(fitWithin({ width: 10000, height: 2 }, 1600)).toEqual({ width: 1600, height: 1 });
    expect(fitWithin({ width: 0, height: 0 }, 1600)).toEqual({ width: 0, height: 0 });
  });

  it('names the result after what it now holds', () => {
    expect(renamedFor('IMG_0042.HEIC', 'image/webp')).toBe('IMG_0042.webp');
    expect(renamedFor('tableau.photo.jpeg', 'image/jpeg')).toBe('tableau.photo.jpg');
    expect(renamedFor('scan', 'image/webp')).toBe('scan.webp');
    expect(renamedFor('.jpg', 'image/webp')).toBe('photo.webp');
    expect(renamedFor('page.png', 'image/png')).toBe('page.png');
  });
});

describe('what a teacher may post homework for', () => {
  // CM1 · A and B: Informatique in both, Maths only in A. CE2 · A: Informatique.
  const own = [
    { classId: 'cm1', sectionIds: ['cm1-a', 'cm1-b'], subjectIds: ['info'] },
    { classId: 'cm1', sectionIds: ['cm1-a'], subjectIds: ['math'] },
    { classId: 'ce2', sectionIds: ['ce2-a'], subjectIds: ['info'] },
  ];

  it('offers only the classes and sections they teach', () => {
    expect([...taughtClassIds(own)!]).toEqual(['cm1', 'ce2']);
    expect([...taughtSectionIds(own, 'cm1')!]).toEqual(['cm1-a', 'cm1-b']);
    expect([...taughtSectionIds(own, 'cm2')!]).toEqual([]);
  });

  it('offers a subject only when taught in every chosen section', () => {
    expect([...taughtSubjectIds(own, 'cm1', [])!].sort()).toEqual(['info', 'math']);
    expect([...taughtSubjectIds(own, 'cm1', ['cm1-a'])!].sort()).toEqual(['info', 'math']);
    expect([...taughtSubjectIds(own, 'cm1', ['cm1-a', 'cm1-b'])!]).toEqual(['info']);
    expect([...taughtSubjectIds(own, 'ce2', ['ce2-a'])!]).toEqual(['info']);
    // Before a class is chosen: everything they teach, so a one-subject teacher has nothing to pick.
    expect([...taughtSubjectIds(own, '', [])!].sort()).toEqual(['info', 'math']);
    expect([...taughtSubjectIds([own[0]], '', [])!]).toEqual(['info']);
  });

  it('a teacher with no assignments is offered nothing; other roles are not narrowed', () => {
    expect(taughtClassIds([])!.size).toBe(0);
    expect(taughtSubjectIds([], 'cm1', ['cm1-a'])!.size).toBe(0);
    expect(taughtClassIds(null)).toBeNull();
    expect(taughtSectionIds(null, 'cm1')).toBeNull();
    expect(taughtSubjectIds(null, 'cm1', ['cm1-a'])).toBeNull();
  });
});

import { scopedHistoryRepository } from '../academicYears/fixtures/scopedHistoryRepository';
import { describe, expect, it } from 'bun:test';
import { historyAnnouncementCases, historyYears } from '../academicYears/fixtures/alertsHistoryManifest';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { AnnouncementRepository } = await import('../../src/modules/announcements/AnnouncementRepository');
const rollback = Symbol('rollback');

describe('Announcements selected-year repository on the marked PostgreSQL fixture', () => {
  it('returns exact annual IDs for lists, details, filters and stats while hiding unresolved rows', async () => {
    const { repo, inYear } = await scopedHistoryRepository(AnnouncementRepository, db);
    await expect(repo.getAll()).rejects.toThrow('Resolved academic year is missing');
    await expect(repo.create({})).rejects.toThrow('Resolved academic year is missing');
    await expect(repo.deleteAll()).rejects.toThrow('Resolved academic year is missing');
    for (const year of historyYears) {
      const expected = historyAnnouncementCases.filter((item) => item.year === year.label)
        .map((item) => item.id).sort();
      expect((await inYear(year.id, () => repo.getAll())).map((row) => row.id).sort()).toEqual(expected);
      expect((await inYear(year.id, () => repo.getRecent())).map((row) => row.id).sort()).toEqual(expected);
      expect((await inYear(year.id, () => repo.getCount())).count).toBe(expected.length);
      expect((await inYear(year.id, () => repo.getStats())).total).toBe(expected.length);
      expect((await inYear(year.id, () => repo.getByAuthor('history-admin'))).map((row) => row.id).sort()).toEqual(expected);
      for (const id of expected) expect((await inYear(year.id, () => repo.getById(id)))?.id).toBe(id);
      const other = historyAnnouncementCases.find((item) => item.year !== year.label)!;
      expect(await inYear(year.id, () => repo.getById(other.id))).toBeUndefined();
      expect(await inYear(year.id, () => repo.getById('history-announcement-unresolved'))).toBeUndefined();
    }
    expect((await inYear('history-year-2025', () => repo.getByClass('history-class-2025'))).map((row) => row.id))
      .toEqual(['history-announcement-2025-class']);
    expect((await inYear('history-year-2026', () => repo.getByClass('history-class-2025')))).toEqual([]);
    expect((await inYear('history-year-2026', () => repo.getByTargetAudience('all'))).map((row) => row.id))
      .toEqual(['history-announcement-2026-all']);
    expect(await inYear('history-year-2025', () => repo.classesInYear(['history-class-2025']))).toBe(true);
    expect(await inYear('history-year-2026', () => repo.classesInYear(['history-class-2025']))).toBe(false);
    expect((await inYear('history-year-2026', () => repo.getPublished())).map((row) => row.id))
      .toEqual(['history-announcement-2026-all']);
    expect((await inYear('history-year-2026', () => repo.getUpcoming())).map((row) => row.id))
      .toEqual(['history-announcement-2026-class']);
    expect((await inYear('history-year-2025', () => repo.getExpired())).map((row) => row.id))
      .toEqual(['history-announcement-2025-class']);
    expect((await inYear('history-year-2026', () => repo.getActiveForAudience('students', undefined))).map((row) => row.id))
      .toEqual(['history-announcement-2026-all']);
  });

  it('shows teachers, parents and students only the live announcements addressed to them', async () => {
    const { repo, inYear } = await scopedHistoryRepository(AnnouncementRepository, db);
    for (const role of ['teacher', 'parent', 'student']) {
      const reader = { id: 'history-unlinked-user', role };
      // The live notice for everyone reaches them; the unpublished class notice stays with staff.
      expect((await inYear('history-year-2026', () => repo.getAll(), reader)).map((row) => row.id))
        .toEqual(['history-announcement-2026-all']);
      expect(await inYear('history-year-2026', () => repo.getById('history-announcement-2026-class'), reader))
        .toBeUndefined();
      // The 2025 class notice has expired, so it no longer reaches anyone but staff.
      expect(await inYear('history-year-2025', () => repo.getAll(), reader)).toEqual([]);
    }
  });

  it('reaches the students of a targeted class, and not other students, with a live class announcement', async () => {
    const { announcements } = await import('../../src/modules/announcements/announcementSchema');
    const { students } = await import('../../src/modules/students/studentSchema');
    try {
      await db.transaction(async (tx) => {
        const { repo, inYear } = await scopedHistoryRepository(AnnouncementRepository, tx as unknown as typeof db);
        const placed = (await tx.select({ userId: students.userId, classId: students.classId }).from(students))
          .filter((row) => row.userId && row.classId);
        const member = placed[0];
        const outsider = placed.find((row) => row.classId !== member.classId);
        if (!member || !outsider) throw new Error('Fixture needs students in two classes');
        await tx.insert(announcements).values({
          id: 'history-announcement-live-class', academicYearId: 'history-year-2026', authorId: 'history-admin',
          title: 'Live class notice', content: 'A live notice for one class only.', targetAudience: 'class',
          classId: member.classId, classIds: [member.classId!], isPublished: true,
          publishDate: '2026-09-01T08:00:00.000Z', expiryDate: '2027-05-01T08:00:00.000Z',
        });
        const read = async (userId: string) => (await inYear('history-year-2026', () => repo.getAll(),
          { id: userId, role: 'student' })).map((row) => row.id).sort();
        expect(await read(member.userId!)).toEqual(['history-announcement-2026-all', 'history-announcement-live-class']);
        expect(await read(outsider.userId!)).toEqual(['history-announcement-2026-all']);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  });

  it('keeps status changes, individual and bulk deletion in the selected year', async () => {
    try {
      await db.transaction(async (tx) => {
        const { repo, inYear } = await scopedHistoryRepository(AnnouncementRepository, tx as unknown as typeof db);
        const old = 'history-year-2025';
        const current = 'history-year-2026';
        const id = 'history-announcement-2025-class';
        expect(await inYear(current, () => repo.update(id, { title: 'Wrong year' }))).toBeUndefined();
        expect(await inYear(current, () => repo.publish(id))).toBeUndefined();
        expect(await inYear(current, () => repo.delete(id))).toBeUndefined();
        expect((await inYear(old, () => repo.update(id, { title: 'Corrected past notice' })))?.title)
          .toBe('Corrected past notice');
        expect((await inYear(old, () => repo.unpublish(id)))?.isPublished).toBe(false);
        expect((await inYear(old, () => repo.publish(id)))?.isPublished).toBe(true);
        expect((await inYear(old, () => repo.deleteBulk([id, 'history-announcement-2026-all']))).deletedCount).toBe(1);
        expect((await inYear(current, () => repo.getAll())).length).toBe(2);
        expect((await inYear(current, () => repo.deleteAll())).deletedCount).toBe(2);
        expect((await inYear(old, () => repo.getAll())).length).toBe(0);
        expect((await inYear(current, () => repo.getById('history-announcement-unresolved')))).toBeUndefined();
        await repo.clearForSeedReset();
        expect((await tx.select().from((await import('../../src/modules/announcements/announcementSchema')).announcements)).length).toBe(0);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
    const { repo, inYear } = await scopedHistoryRepository(AnnouncementRepository, db);
    expect((await inYear('history-year-2026', () => repo.getAll())).length)
      .toBe(historyAnnouncementCases.filter((item) => item.year === '2026-2027').length);
    expect((await db.select().from((await import('../../src/modules/announcements/announcementSchema')).announcements)).length)
      .toBe(historyAnnouncementCases.length + 1);
  });
});

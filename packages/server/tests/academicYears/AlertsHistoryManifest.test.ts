import { describe, expect, it } from 'bun:test';
import {
  historyAlertCases, historyClasses, historyEnrollments,
  historyFixtureExpected, historyStudents, historyYears,
} from './fixtures/alertsHistoryManifest';

describe('academic-year acceptance fixture manifest', () => {
  it('reuses exactly ten student identities across three registered years', () => {
    expect(historyStudents.map((student) => student.id)).toHaveLength(historyFixtureExpected.studentIdentities);
    expect(new Set(historyStudents.map((student) => student.id)).size).toBe(historyFixtureExpected.studentIdentities);
    expect(historyYears.map((year) => year.label)).toEqual(['2024-2025', '2025-2026', '2026-2027']);

    const counts = Object.fromEntries(historyYears.map((year) => [
      year.label,
      historyStudents.filter((student) => (student.years as readonly string[]).includes(year.label)).length,
    ]));
    expect(counts).toEqual(historyFixtureExpected.enrollmentsByYear);
    expect(Object.values(counts).reduce((sum, count) => sum + count, 0))
      .toBe(historyFixtureExpected.totalEnrollments);
    expect(historyEnrollments).toHaveLength(23);
    expect(historyClasses).toHaveLength(3);
    expect(historyClasses.flatMap((entry) => entry.sections)).toHaveLength(6);
  });

  it('pins one midyear transfer and two historical exits with exclusive dates', () => {
    const transfer = historyEnrollments.find((row) => row.studentId === 'history-student-05'
      && row.label === '2025-2026')!;
    expect(transfer.placements).toHaveLength(2);
    expect(transfer.placements[0].validTo).toBe('2026-01-15');
    expect(transfer.placements[1].validFrom).toBe('2026-01-15');
    expect(transfer.placements[0].sectionId).not.toBe(transfer.placements[1].sectionId);

    expect(historyEnrollments.find((row) => row.studentId === 'history-student-07'
      && row.label === '2025-2026')).toMatchObject({ status: 'withdrawn', leftOn: '2026-03-01' });
    expect(historyEnrollments.find((row) => row.studentId === 'history-student-04'
      && row.label === '2025-2026')).toMatchObject({ status: 'graduated', leftOn: '2026-07-01' });
    expect(historyYears.map((year) => year.closeout)).toEqual([
      '2025-07-14', '2026-07-14', '2027-07-14',
    ]);
  });

  it('contains year-owned and shared alerts without inventing fee-only enrollment', () => {
    const aya = historyStudents.find((student) => student.id === 'history-student-08');
    expect(aya?.years).toEqual(['2026-2027']);
    expect(historyAlertCases.find((alert) => alert.id === 'history-alert-2025-reminder')?.year)
      .toBe('2025-2026');

    const counts = Object.fromEntries(historyYears.map((year) => [
      year.label,
      historyAlertCases.filter((alert) => alert.year === year.label).length,
    ]));
    expect(counts).toEqual(historyFixtureExpected.alertsByYear);
    expect(historyAlertCases.filter((alert) => alert.year === null))
      .toHaveLength(historyFixtureExpected.sharedAlerts);
  });
});

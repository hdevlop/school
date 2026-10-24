'use client';
import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';
import { NLoadingState } from 'najm-kit';
import StudentProfile from '@/features/Students/components/StudentProfile';
import { useStudentProfile } from '@/features/Students/hooks/useStudentProfile';
import { ReadCoverageContext } from './readCoverage';

/** Shares the real hook's existing query observers; it never supplies substitute feature data. */
export function StudentReadView({ studentId }: { studentId: string }) {
  const { t } = useTranslation();
  const { student, isStudentLoading, studentError, isParentsLoading, isParentsError } = useStudentProfile(studentId);
  const coverage = useMemo(() => ({ panels: new Set(['overview']), unavailableText: t('offlineRead.unavailable'),
    unavailableStatisticLabels: new Set([
      'students.profile.tabs.fees', 'students.profile.absences', 'students.profile.attendanceDetails.late',
      'students.profile.examsAverage', 'students.profile.tabs.grades', 'students.profile.gpa',
      'students.profile.nextDue', 'students.profile.averageGrade', 'students.profile.due',
    ].map(key => t(key))),
  }), [t]);
  if (isStudentLoading || isParentsLoading) return <NLoadingState surface="panel" label={t('common.loading')} />;
  // Parent failure cannot become the feature's valid "no linked parents" state.
  if (!student || studentError || isParentsError) return <p role="status" className="mt-6 rounded-lg border bg-card p-6">{t('offlineRead.unavailable')}</p>;
  return <ReadCoverageContext.Provider value={coverage}>
    <p data-school-offline-summary role="status" className="my-3 text-sm text-muted-foreground">{t('offlineRead.summaryUnavailable')}</p>
    <StudentProfile studentId={studentId} />
  </ReadCoverageContext.Provider>;
}

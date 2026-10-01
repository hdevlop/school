'use client';

import { useQuery } from '@tanstack/react-query';
import { NBadge, NButton, NEmptyState, NErrorState, NForbiddenState, NSkeleton, useDialog } from 'najm-kit';
import { localDateInput } from 'najm-kit/format';
import { ArrowRightLeft, CalendarRange, LogOut, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'najm-i18n/react';
import { getAcademicYearsApi } from '@/services/academicYearApi';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';
import { isAuthorizationError } from '@/services/apiError';
import type { EnrollmentPlacement } from '@/services/studentEnrollmentApi';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { dateWithinYear } from '@/features/AcademicYears/utils/viewingYear';
import { useStudentEnrollments } from '@/features/Students/hooks/useStudentEnrollments';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { EndEnrollmentForm, EnrollForm, TransferForm } from './EnrollmentForms';

const serverMessage = (error: any) => error?.response?.data?.message || error?.message;

/**
 * A student's class and section in each school year, from dated enrollment
 * records, and the commands that change them: enrol in a year, change class or
 * section from a date, or end the enrollment. Its actions target the viewed
 * year, or the active one with history off. Administrators and principals only.
 */
export default function EnrollmentTab({ studentId }: { studentId?: string }) {
  const { t } = useTranslation();
  const { displayDate, displayDateTime } = useSchoolFormat();
  const { openDialog } = useDialog();
  const { viewingYear, activeYear } = useViewingAcademicYear();
  const { enrollments, error, isLoading, enroll, transfer, end } = useStudentEnrollments(studentId);
  const { data: yearList } = useQuery({
    queryKey: ['academic-years'],
    queryFn: getAcademicYearsApi,
    staleTime: 5 * 60 * 1000,
  });

  const targetLabel = viewingYear ?? activeYear;
  const targetYear = yearList?.years.find((year) => year.label === targetLabel);
  const targetEnrollment = enrollments.find((enrollment) => enrollment.academicYear.label === targetLabel);
  const openPlacement = targetEnrollment && !targetEnrollment.leftOn
    ? targetEnrollment.placements.find((placement) => !placement.validTo)
    : undefined;
  const canEnroll = !!studentId && !!targetYear && targetYear.status !== 'draft' && !targetEnrollment;

  // The server re-checks every rule; its refusal is shown and keeps the dialog open.
  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
    } catch (err) {
      toast.error(serverMessage(err) || t('students.enrollment.failed'));
      throw err;
    }
  };

  const openEnroll = () => {
    if (!targetYear || !studentId) return;
    openDialog({
      title: t('students.enrollment.enrollIn', { year: targetYear.label }),
      children: <EnrollForm year={targetYear} defaultDate={dateWithinYear(localDateInput(), targetYear)} />,
      width: 'xxl',
      primaryButton: {
        form: 'student-enroll-form',
        text: t('students.enrollment.enrollAction'),
        onClick: (values) => run(
          () => withAcademicYear(targetYear.label, () => enroll({ studentId, academicYearId: targetYear.id, ...values })),
          t('students.enrollment.enrolled'),
        ),
      },
    });
  };

  const openTransfer = (current: EnrollmentPlacement) => {
    if (!targetEnrollment) return;
    openDialog({
      title: t('students.enrollment.transfer'),
      children: <TransferForm year={targetEnrollment.academicYear} current={current} />,
      width: 'xxl',
      primaryButton: {
        form: 'student-transfer-form',
        text: t('students.enrollment.transferAction'),
        onClick: (values) => run(
          () => withAcademicYear(targetEnrollment.academicYear.label, () => transfer({ enrollmentId: targetEnrollment.id, ...values })),
          t('students.enrollment.transferred'),
        ),
      },
    });
  };

  const openEnd = (current: EnrollmentPlacement) => {
    if (!targetEnrollment) return;
    openDialog({
      title: t('students.enrollment.end'),
      children: <EndEnrollmentForm current={current} />,
      width: 'xl',
      primaryButton: {
        form: 'student-end-enrollment-form',
        text: t('students.enrollment.endAction'),
        onClick: (values) => run(
          () => withAcademicYear(targetEnrollment.academicYear.label, () => end({ enrollmentId: targetEnrollment.id, ...values })),
          t('students.enrollment.ended'),
        ),
      },
    });
  };

  const period = (from: string, to: string | null) => (to
    ? t('students.enrollment.fromUntil', { from: displayDate(from), to: displayDate(to) })
    : t('students.enrollment.fromOngoing', { from: displayDate(from) }));

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 py-3">
        <NSkeleton className="h-6 w-48" />
        <NSkeleton className="h-24 w-full" />
        <NSkeleton className="h-24 w-full" />
      </div>
    );
  }
  if (error) {
    return isAuthorizationError(error) ? <NForbiddenState surface="panel" /> : <NErrorState surface="panel" />;
  }

  return (
    <div className="flex flex-col gap-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t('students.enrollment.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('students.enrollment.help')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEnroll && (
            <NButton type="button" size="sm" className="gap-2" onClick={openEnroll}>
              <UserPlus className="h-4 w-4" />
              {t('students.enrollment.enrollIn', { year: targetYear!.label })}
            </NButton>
          )}
          {openPlacement && (
            <>
              <NButton type="button" size="sm" variant="outline" className="gap-2" onClick={() => openTransfer(openPlacement)}>
                <ArrowRightLeft className="h-4 w-4" />
                {t('students.enrollment.transfer')}
              </NButton>
              <NButton type="button" size="sm" variant="outline" className="gap-2" onClick={() => openEnd(openPlacement)}>
                <LogOut className="h-4 w-4" />
                {t('students.enrollment.end')}
              </NButton>
            </>
          )}
        </div>
      </div>

      {enrollments.length === 0 ? (
        <NEmptyState surface="panel" icon={CalendarRange} title={t('students.enrollment.empty')} />
      ) : (
        enrollments.map((enrollment) => (
          <section key={enrollment.id} className="rounded-lg border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-900">{enrollment.academicYear.label}</h3>
                <p className="text-sm text-muted-foreground">{period(enrollment.enrolledOn, enrollment.leftOn)}</p>
              </div>
              <NBadge status={enrollment.status} />
            </div>
            <ul className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
              {enrollment.placements.map((placement) => (
                <li key={placement.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
                  <span className="font-medium text-slate-800">{placement.className} – {placement.sectionName}</span>
                  <span className="text-muted-foreground">
                    {period(placement.validFrom, placement.validTo)}
                    {placement.reason ? ` · ${placement.reason}` : ''}
                    {placement.actorId && placement.updatedAt && (
                      <span className="block text-xs">
                        {t('students.enrollment.changedBy', {
                          actor: placement.actorName ?? placement.actorId,
                          at: displayDateTime(placement.updatedAt),
                        })}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

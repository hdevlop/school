'use client';

import { CalendarClock, Clock, Layers3 } from 'lucide-react';
import { NEmptyState, NErrorState, NPageHeader, NPageHeaderActions } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useTeacherOverview } from '@/features/Dashboard/hooks/useTeacherDashboard';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { useTeacherRoutine } from '../hooks/useClassRoutines';
import { ROUTINE_DAYS, type RoutineDay, type RoutineSchedule } from '../types';
import ClassRoutineSkeleton from './ClassRoutineSkeleton';
import TeacherWeek from './TeacherWeek';

const Chip = ({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) => (
  <span className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs text-muted-foreground">
    <Icon className="size-4 text-primary" aria-hidden="true" />
    {label}
    <span className="text-sm font-semibold text-foreground">{value}</span>
  </span>
);

// The school's business date names today; Sunday is index 0.
const weekdayOf = (date?: string | null): RoutineDay | null => {
  if (!date) return null;
  const index = new Date(`${date}T12:00:00Z`).getUTCDay();
  return ROUTINE_DAYS[(index + 6) % 7];
};

/** A teacher's Planning: their own week across every section they teach. */
export default function TeacherRoutinePage() {
  const { t } = useTranslation();
  const { number } = useSchoolFormat();
  const { viewingYear } = useViewingAcademicYear();
  const overview = useTeacherOverview();
  const teacherId = overview.data?.teacher.id;
  const routine = useTeacherRoutine(teacherId, viewingYear);
  const schedules: RoutineSchedule[] = routine.data ?? [];
  const lessonCount = schedules.reduce((total, schedule) => total + schedule.entries.length, 0);
  const loading = overview.isPending || (Boolean(teacherId) && routine.isPending);
  const failed = overview.isError || routine.isError;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3">
      <NPageHeader
        icon={CalendarClock}
        title={t('classRoutines.ui.teacher.myWeekTitle')}
        subtitle={t('classRoutines.ui.teacher.myWeekSubtitle')}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      {loading ? (
        <ClassRoutineSkeleton />
      ) : failed ? (
        <NErrorState
          surface="panel"
          message={t('classRoutines.ui.errors.loadFailed')}
          onRetry={() => void (overview.isError ? overview.refetch() : routine.refetch())}
        />
      ) : schedules.length ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Chip icon={Clock} label={t('classRoutines.ui.teacher.weeklyLessons')} value={number(lessonCount)} />
            <Chip icon={Layers3} label={t('classRoutines.ui.teacher.sections')} value={number(schedules.length)} />
          </div>
          <TeacherWeek schedules={schedules} today={weekdayOf(overview.data?.date)} />
        </>
      ) : (
        <NEmptyState
          icon={CalendarClock}
          title={t('classRoutines.ui.teacher.noRoutine')}
          description={t('classRoutines.ui.teacher.noRoutineDescription')}
          className="rounded-2xl border border-dashed bg-card/50 py-10"
        />
      )}
    </div>
  );
}

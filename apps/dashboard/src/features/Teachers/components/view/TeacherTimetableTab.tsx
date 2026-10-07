"use client";

import { CalendarClock, CalendarDays, Clock, Layers3 } from 'lucide-react';
import { NCard, NCardAction, NEmptyState, NErrorState } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import TeacherWeek from '@/features/ClassRoutines/components/TeacherWeek';
import { useTeacherRoutine } from '@/features/ClassRoutines/hooks/useClassRoutines';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';

interface TeacherTimetableTabProps {
  teacherId: string;
}

const Chip = ({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) => (
  <span className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-xs text-muted-foreground">
    <Icon className="size-4 text-primary" aria-hidden="true" />
    {label}
    <span className="text-sm font-semibold text-foreground">{value}</span>
  </span>
);

export default function TeacherTimetableTab({ teacherId }: TeacherTimetableTabProps) {
  const { t } = useTranslation();
  const { number } = useSchoolFormat();
  const { viewingYear } = useViewingAcademicYear();
  const { data: schedules = [], isPending, isError, refetch } = useTeacherRoutine(teacherId, viewingYear);
  const lessonCount = schedules.reduce((total, schedule) => total + schedule.entries.length, 0);

  return (
    <NCard
      title={t('dashboard.teacher.timetable.title')}
      icon={CalendarDays}
      className="min-h-full"
      loading={isPending}
    >
      <NCardAction>
        <div className="flex flex-wrap gap-2">
          <Chip icon={Clock} label={t('classRoutines.ui.teacher.weeklyLessons')} value={number(lessonCount)} />
          <Chip icon={Layers3} label={t('classRoutines.ui.teacher.sections')} value={number(schedules.length)} />
        </div>
      </NCardAction>

      {isError ? (
        <NErrorState surface="panel" message={t('classRoutines.ui.errors.loadFailed')} onRetry={() => void refetch()} />
      ) : schedules.length ? (
        // One sheet per teacher: their lessons from every section in one week.
        <TeacherWeek schedules={schedules} />
      ) : (
        <NEmptyState
          icon={CalendarClock}
          title={t('classRoutines.ui.teacher.noRoutine')}
          description={t('classRoutines.ui.teacher.noRoutineDescription')}
          className="py-8"
        />
      )}
    </NCard>
  );
}

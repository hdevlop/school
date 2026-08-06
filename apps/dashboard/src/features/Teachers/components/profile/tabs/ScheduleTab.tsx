"use client";

import { CalendarClock, Clock, Layers3 } from 'lucide-react';
import PageLoadingState from '@/shared/PageLoadingState';
import RoutineGrid from '@/features/ClassRoutines/components/RoutineGrid';
import { useTeacherRoutine } from '@/features/ClassRoutines/hooks/useClassRoutines';
import { useTranslation } from '@/hooks/useLanguage';

interface ScheduleTabProps {
  teacher: any;
}
const StatCard = ({ label, value, icon: Icon }: { label: string; value: string; icon: any }) => (
  <div className="rounded-xl border bg-card p-4 shadow-xs">
    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      <Icon className="h-4 w-4 text-primary" /> {label}
    </div>
    <div className="mt-2 text-2xl font-bold text-foreground">{value}</div>
  </div>
);

export default function ScheduleTab({ teacher }: ScheduleTabProps) {
  const { t } = useTranslation();
  const { data: schedules = [], isPending, isError } = useTeacherRoutine(teacher?.id);
  const lessonCount = schedules.reduce((total, schedule) => total + schedule.entries.length, 0);
  const teachingDays = new Set(
    schedules.flatMap((schedule) => schedule.entries.map((entry) => entry.dayOfWeek)),
  ).size;

  if (isPending) return <PageLoadingState label={t('classRoutines.ui.loading.weeklyRoutine')} className="min-h-64" />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard label={t('classRoutines.ui.teacher.weeklyLessons')} value={String(lessonCount)} icon={Clock} />
        <StatCard label={t('classRoutines.ui.fields.teachingDays')} value={String(teachingDays)} icon={CalendarClock} />
        <StatCard label={t('classRoutines.ui.teacher.sections')} value={String(schedules.length)} icon={Layers3} />
      </div>

      {isError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
          {t('classRoutines.ui.errors.loadFailed')}
        </div>
      ) : schedules.length ? schedules.map((schedule) => (
        <section key={schedule.id} className="space-y-3">
          <div>
            <h3 className="font-semibold">{schedule.className} · {schedule.sectionName}</h3>
            <p className="text-sm text-muted-foreground">{schedule.name} · {schedule.academicYear}</p>
          </div>
          <RoutineGrid
            days={schedule.activeDays}
            periods={schedule.periods}
            entries={schedule.entries}
            duties={schedule.duties}
            defaultRoom={schedule.roomNumber}
          />
        </section>
      )) : (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
          <div>
            <CalendarClock className="mx-auto h-9 w-9 text-muted-foreground" />
            <h3 className="mt-3 font-semibold">{t('classRoutines.ui.teacher.noRoutine')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t('classRoutines.ui.teacher.noRoutineDescription')}</p>
          </div>
        </div>
      )}
    </div>
  );
}

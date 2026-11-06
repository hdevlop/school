'use client';

import { CalendarDays, Clock, UserRound } from 'lucide-react';
import { NCard, NCardAction, NEmptyState, NSkeleton, NajmScroll } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { ROUTINE_DAYS } from '@sms/contracts/routines';
import type { MonitorDashboardOverview } from '@sms/contracts/monitor-dashboard';
import { useRoutineDetails, useRoutineList } from '@/features/ClassRoutines/hooks/useClassRoutines';
import { selectRoutineSchedules } from '@/features/ClassRoutines/utils/selectRoutineSchedules';
import { MONITOR_DASHBOARD_LINKS } from '../../config/monitorDashboardLinks';
import { CardLink, SCROLL_CARD } from '../Teacher/shared';

type TodayRoutineCardProps = {
  overview: MonitorDashboardOverview | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
};

const TodayRoutineCard = ({ overview, loading, error, onRetry }: TodayRoutineCardProps) => {
  const { t } = useTranslation();
  // The overview's date is the school business date, including its time zone.
  const day = overview
    ? ROUTINE_DAYS[(new Date(`${overview.date}T12:00:00Z`).getUTCDay() + 6) % 7]
    : undefined;
  const enabled = Boolean(overview?.schoolDay && overview.sections.length);
  const schedules = useRoutineList({ academicYear: overview?.academicYear, status: 'published' }, enabled);
  const selected = selectRoutineSchedules(
    overview?.sections.map((section) => section.sectionId) ?? [],
    schedules.data ?? [],
  ).filter((schedule) => schedule?.status === 'published' && day && schedule.activeDays.includes(day));
  const details = useRoutineDetails(enabled ? selected.flatMap((schedule) => schedule ? [schedule.id] : []) : [], overview?.academicYear);
  const lessons = details.flatMap(({ data: schedule }) => {
    if (!schedule || !day) return [];
    return schedule.entries.flatMap((entry) => {
      const period = schedule.periods.find((item) => item.id === entry.periodId);
      return entry.dayOfWeek === day && period?.isActive && !period.isBreak
        ? [{ ...entry, startTime: period.startTime, endTime: period.endTime, className: schedule.className, sectionName: schedule.sectionName }]
        : [];
    });
  }).sort((a, b) => a.startTime.localeCompare(b.startTime) || a.className.localeCompare(b.className) || a.sectionName.localeCompare(b.sectionName));
  const loadError = error ?? (schedules.data ? null : schedules.error) ?? details.find((query) => !query.data && query.error)?.error;
  const retry = () => {
    onRetry();
    if (enabled) void schedules.refetch();
    details.forEach((query) => { void query.refetch(); });
  };

  return (
    <NCard
      title={t('dashboard.teacher.schedule.title')}
      icon={CalendarDays}
      className="h-80 min-h-0 max-h-[60dvh] overflow-hidden xl:h-full xl:max-h-none"
      classNames={{ ...SCROLL_CARD, content: 'flex min-h-0 flex-1 flex-col overflow-hidden' }}
      loading={loading || (enabled && schedules.isPending) || details.some((query) => query.isPending)}
      error={loadError}
      onRetry={retry}
      skeleton={(
        <div className="space-y-2" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => <NSkeleton key={index} className="h-16 rounded-lg" />)}
        </div>
      )}
    >
      <NCardAction>
        <CardLink href={MONITOR_DASHBOARD_LINKS.timetable}>{t('dashboard.teacher.schedule.viewTimetable')}</CardLink>
      </NCardAction>
      {lessons.length ? (
        <NajmScroll axis="y" autoHide="scroll" className="min-h-0 flex-1 overscroll-contain">
          <ol className="flex flex-col gap-2 pe-3">
            {lessons.map((lesson) => (
              <li key={lesson.id} className="rounded-lg border border-border/50 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{lesson.subjectName}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{lesson.className} · {lesson.sectionName}</span>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
                  <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                  {lesson.startTime} – {lesson.endTime}
                </p>
                {lesson.teacherName && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{lesson.teacherName}</span>
                  </p>
                )}
              </li>
            ))}
          </ol>
        </NajmScroll>
      ) : (
        <NEmptyState icon={CalendarDays} title={t('dashboard.teacher.schedule.empty')} className="py-4" />
      )}
    </NCard>
  );
};

export default TodayRoutineCard;

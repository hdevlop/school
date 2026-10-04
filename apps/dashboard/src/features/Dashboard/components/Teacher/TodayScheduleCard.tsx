'use client';

import { CalendarDays, CalendarOff } from 'lucide-react';
import { NBadge, NCard, NCardAction, NEmptyState, NSkeleton, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { TeacherDashboardSession, TeacherSessionStatus } from '@sms/contracts/teacher-dashboard';
import { TEACHER_DASHBOARD_LINKS } from '../../config/teacherDashboardLinks';
import { CardLink } from './shared';

type TodayScheduleCardProps = {
  sessions: TeacherDashboardSession[] | undefined;
  nextEntryId: string | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  className?: string;
};

// `inProgress` and `completed` take Najm's status colors; the catalog has no
// color for `upcoming`, which the schedule draws in the primary color.
const STATUS_COLORS = { upcoming: 'primary' } as const;

const DOT_CLASSES: Record<TeacherSessionStatus, string> = {
  upcoming: 'bg-muted-foreground/40',
  inProgress: 'bg-warning',
  completed: 'bg-success',
};

const ScheduleSkeleton = () => (
  <div className="flex flex-col gap-3" aria-hidden="true">
    {Array.from({ length: 4 }, (_, index) => <NSkeleton key={index} className="h-12 w-full rounded-lg" />)}
  </div>
);

const TodayScheduleCard = ({ sessions, nextEntryId, loading, error, onRetry, className }: TodayScheduleCardProps) => {
  const { t } = useTranslation();
  const lessons = sessions ?? [];

  return (
    <NCard
      title={t('dashboard.teacher.schedule.title')}
      icon={CalendarDays}
      className={cn('h-full', className)}
      loading={loading}
      skeleton={<ScheduleSkeleton />}
      error={error}
      errorText={t('common.feedback.errorMessage')}
      onRetry={onRetry}
    >
      <NCardAction>
        <CardLink href={TEACHER_DASHBOARD_LINKS.timetable}>{t('dashboard.teacher.schedule.viewTimetable')}</CardLink>
      </NCardAction>

      {lessons.length ? (
        <ol className="relative ms-1.5 border-s border-border">
          {lessons.map((lesson) => {
            const isNext = lesson.entryId === nextEntryId;
            return (
              <li key={lesson.entryId} className="relative ps-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute -start-[5px] top-1/2 size-2.5 -translate-y-1/2 rounded-full ring-4 ring-card',
                    isNext ? 'bg-primary' : DOT_CLASSES[lesson.status],
                  )}
                />
                <div className={cn('flex items-center gap-3 rounded-lg px-2 py-2.5', isNext && 'bg-primary/5')}>
                  <span className="w-[5.5rem] shrink-0 text-xs tabular-nums text-muted-foreground lg:text-sm">
                    {lesson.startTime} – {lesson.endTime}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{lesson.subjectName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {lesson.className} · {lesson.sectionName}
                      {lesson.roomNumber ? ` • ${t('dashboard.teacher.nextClass.room', { room: lesson.roomNumber })}` : ''}
                    </p>
                  </div>
                  <NBadge status={lesson.status} statusMap={STATUS_COLORS} />
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <NEmptyState icon={CalendarOff} title={t('dashboard.teacher.schedule.empty')} className="py-6" />
      )}
    </NCard>
  );
};

export default TodayScheduleCard;

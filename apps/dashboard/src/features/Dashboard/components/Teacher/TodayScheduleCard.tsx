'use client';

import Link from 'next/link';
import { BookOpen, CalendarDays, CalendarOff, CheckCircle2, Clock, MapPin, UsersRound } from 'lucide-react';
import { NBadge, NButton, NCard, NCardAction, NEmptyState, NSkeleton, NajmScroll, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { TeacherDashboardSession, TeacherSessionStatus } from '@sms/contracts/teacher-dashboard';
import { TEACHER_DASHBOARD_LINKS, lessonAttendanceHref, splitMinutes } from '../../config/teacherDashboardLinks';
import { CardLink, IconTile, SCROLL_CARD, SCROLL_LIST } from './shared';

type TodayScheduleCardProps = {
  sessions: TeacherDashboardSession[] | undefined;
  // The lesson in progress, or else the next one today.
  nextSession: TeacherDashboardSession | null | undefined;
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
    <NSkeleton className="h-28 w-full rounded-xl" />
    {Array.from({ length: 3 }, (_, index) => <NSkeleton key={index} className="h-12 w-full rounded-lg" />)}
  </div>
);

const NextLesson = ({ session }: { session: TeacherDashboardSession }) => {
  const { t } = useTranslation();
  const isCurrent = session.status === 'inProgress';
  const countdown = (total: number) => {
    const { hours, minutes } = splitMinutes(total);
    return hours
      ? t('dashboard.teacher.duration.hoursMinutes', { hours, minutes })
      : t('dashboard.teacher.duration.minutes', { minutes });
  };

  return (
    <div className="flex shrink-0 flex-col gap-3 rounded-xl bg-primary/5 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-primary">
        {isCurrent ? t('dashboard.teacher.nextClass.current') : t('dashboard.teacher.nextClass.title')}
      </p>
      <div className="flex items-start gap-3">
        <IconTile icon={BookOpen} className="bg-card shadow-xs" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{session.subjectName}</p>
          <p className="truncate text-sm text-muted-foreground">
            {session.className} · {session.sectionName}
          </p>
        </div>
        {isCurrent ? (
          <NBadge status="inProgress" />
        ) : session.minutesUntilStart != null ? (
          <NBadge color="primary" look="soft" shape="pill"
            label={t('dashboard.teacher.nextClass.startsIn', { time: countdown(session.minutesUntilStart) })} />
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-foreground">
        <span className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
          {session.roomNumber
            ? t('dashboard.teacher.nextClass.room', { room: session.roomNumber })
            : t('dashboard.teacher.nextClass.noRoom')}
        </span>
        <span className="flex items-center gap-2 tabular-nums">
          <Clock className="size-4 shrink-0 text-primary" aria-hidden="true" />
          {session.startTime} – {session.endTime}
        </span>
        <NButton asChild size="sm" className="ms-auto"
          variant={session.attendanceTaken ? 'soft' : 'default'}
          leftIcon={session.attendanceTaken ? CheckCircle2 : UsersRound}>
          <Link href={lessonAttendanceHref(session)} prefetch={false}>
            {session.attendanceTaken
              ? t('dashboard.teacher.nextClass.attendanceTaken')
              : t('dashboard.teacher.nextClass.takeAttendance')}
          </Link>
        </NButton>
      </div>
    </div>
  );
};

const TodayScheduleCard = ({ sessions, nextSession, loading, error, onRetry, className }: TodayScheduleCardProps) => {
  const { t } = useTranslation();
  const lessons = sessions ?? [];

  return (
    <NCard
      title={t('dashboard.teacher.schedule.title')}
      icon={CalendarDays}
      className={cn('h-full', className)}
      classNames={SCROLL_CARD}
      loading={loading}
      skeleton={<ScheduleSkeleton />}
      error={error}
      errorText={t('common.feedback.errorMessage')}
      onRetry={onRetry}
    >
      <NCardAction>
        <CardLink href={TEACHER_DASHBOARD_LINKS.timetable}>{t('dashboard.teacher.schedule.viewTimetable')}</CardLink>
      </NCardAction>

      {/* Start at the first lesson and keep the whole day available to scroll. */}
      {lessons.length ? (
        <div className="flex flex-col gap-3 fit:min-h-0 fit:flex-1">
          {nextSession && <NextLesson session={nextSession} />}

          <NajmScroll axis="y" className={cn('max-h-80 fit:max-h-none', SCROLL_LIST)}>
            <ol className="relative ms-1.5 me-3 border-s border-border">
              {lessons.map((lesson) => {
                const isNext = lesson.entryId === nextSession?.entryId;
                return (
                  <li key={lesson.entryId} className="relative ps-3">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute -start-[5px] top-1/2 size-2.5 -translate-y-1/2 rounded-full ring-4 ring-card',
                        isNext ? 'bg-primary' : DOT_CLASSES[lesson.status],
                      )}
                    />
                    <div className={cn('flex items-center gap-3 rounded-lg px-2 py-1.5', isNext && 'bg-primary/5')}>
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
          </NajmScroll>
        </div>
      ) : (
        <NEmptyState icon={CalendarOff} title={t('dashboard.teacher.schedule.empty')} className="py-4" />
      )}
    </NCard>
  );
};

export default TodayScheduleCard;

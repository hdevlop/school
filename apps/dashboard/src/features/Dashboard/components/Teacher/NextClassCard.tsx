'use client';

import Link from 'next/link';
import { BookOpen, CalendarCheck, CalendarClock, CheckCircle2, Clock, MapPin, UsersRound } from 'lucide-react';
import { NBadge, NButton, NCard, NCardAction, NEmptyState, NSkeleton, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { TeacherDashboardSession } from '@sms/contracts/teacher-dashboard';
import {
  TEACHER_DASHBOARD_LINKS,
  lessonAttendanceHref,
  splitMinutes,
} from '../../config/teacherDashboardLinks';
import { CardLink, IconTile } from './shared';

type NextClassCardProps = {
  session: TeacherDashboardSession | null | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  className?: string;
};

const NextClassSkeleton = () => (
  <div className="flex flex-col gap-3" aria-hidden="true">
    <NSkeleton className="h-32 w-full rounded-xl" />
    <NSkeleton className="h-10 w-full rounded-lg" />
  </div>
);

const NextClassCard = ({ session, loading, error, onRetry, className }: NextClassCardProps) => {
  const { t } = useTranslation();

  const countdown = (total: number) => {
    const { hours, minutes } = splitMinutes(total);
    return hours
      ? t('dashboard.teacher.duration.hoursMinutes', { hours, minutes })
      : t('dashboard.teacher.duration.minutes', { minutes });
  };

  const isCurrent = session?.status === 'inProgress';

  return (
    <NCard
      title={isCurrent ? t('dashboard.teacher.nextClass.current') : t('dashboard.teacher.nextClass.title')}
      icon={CalendarClock}
      className={cn('h-full', className)}
      classNames={{ content: 'flex-1' }}
      loading={loading}
      skeleton={<NextClassSkeleton />}
      error={error}
      errorText={t('common.feedback.errorMessage')}
      onRetry={onRetry}
    >
      <NCardAction>
        <CardLink href={TEACHER_DASHBOARD_LINKS.timetable}>{t('dashboard.teacher.nextClass.viewAll')}</CardLink>
      </NCardAction>

      {session ? (
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-col gap-3 rounded-xl bg-primary/5 p-3 lg:p-4">
            <div className="flex items-start gap-3">
              <IconTile icon={BookOpen} className="size-11 bg-card shadow-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{session.subjectName}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {session.className} · {session.sectionName}
                </p>
              </div>
              {isCurrent ? (
                <NBadge status="inProgress" />
              ) : session.minutesUntilStart != null ? (
                <NBadge
                  color="primary"
                  look="soft"
                  shape="pill"
                  label={t('dashboard.teacher.nextClass.startsIn', { time: countdown(session.minutesUntilStart) })}
                />
              ) : null}
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground">
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
            </div>
          </div>

          <NButton
            asChild
            size="lg"
            className="mt-auto w-full"
            variant={session.attendanceTaken ? 'soft' : 'default'}
            leftIcon={session.attendanceTaken ? CheckCircle2 : UsersRound}
          >
            <Link href={lessonAttendanceHref(session)} prefetch={false}>
              {session.attendanceTaken
                ? t('dashboard.teacher.nextClass.attendanceTaken')
                : t('dashboard.teacher.nextClass.takeAttendance')}
            </Link>
          </NButton>
        </div>
      ) : (
        <NEmptyState icon={CalendarCheck} title={t('dashboard.teacher.nextClass.empty')} className="py-6" />
      )}
    </NCard>
  );
};

export default NextClassCard;

'use client';

import Link from 'next/link';
import { AlertCircle, Bell, CalendarX2, Check, FileWarning, UsersRound, type LucideIcon } from 'lucide-react';
import { NCard, NSkeleton, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { TeacherDashboardAttention } from '@sms/contracts/teacher-dashboard';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { TEACHER_DASHBOARD_LINKS } from '../../config/teacherDashboardLinks';
import { FILL_CARD } from './shared';

type NeedsAttentionCardProps = {
  attention: TeacherDashboardAttention | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  className?: string;
};

type AttentionRow = {
  key: keyof TeacherDashboardAttention;
  label: string;
  icon: LucideIcon;
  // The dot that tells the rows apart at a glance.
  dot: string;
  href: string;
};

const AttentionSkeleton = () => (
  <div className="flex flex-col gap-3" aria-hidden="true">
    {Array.from({ length: 4 }, (_, index) => <NSkeleton key={index} className="h-6 w-full rounded-md" />)}
  </div>
);

// One line per kind of pending work: its count, or a check once it is clear.
const NeedsAttentionCard = ({ attention, loading, error, onRetry, className }: NeedsAttentionCardProps) => {
  const { t } = useTranslation();
  const { number } = useSchoolFormat();

  const rows: AttentionRow[] = [
    {
      key: 'missingAttendance',
      label: t('dashboard.teacher.attention.missingAttendance'),
      icon: CalendarX2,
      dot: 'bg-rose-500',
      href: TEACHER_DASHBOARD_LINKS.attendance,
    },
    {
      key: 'missingGrades',
      label: t('dashboard.teacher.attention.missingGrades'),
      icon: FileWarning,
      dot: 'bg-amber-500',
      href: TEACHER_DASHBOARD_LINKS.grades,
    },
    {
      key: 'unreadNotifications',
      label: t('dashboard.teacher.attention.notifications'),
      icon: Bell,
      dot: 'bg-sky-500',
      href: TEACHER_DASHBOARD_LINKS.notifications,
    },
    {
      key: 'openConcerns',
      label: t('dashboard.teacher.attention.concerns'),
      icon: UsersRound,
      dot: 'bg-violet-500',
      href: TEACHER_DASHBOARD_LINKS.discipline,
    },
  ];

  return (
    <NCard
      title={t('dashboard.teacher.attention.title')}
      icon={AlertCircle}
      className={cn('h-full', className)}
      classNames={FILL_CARD}
      loading={loading}
      skeleton={<AttentionSkeleton />}
      error={error}
      errorText={t('common.feedback.errorMessage')}
      onRetry={onRetry}
    >
      <ul className="flex flex-col divide-y divide-border/70">
        {rows.map(({ key, label, icon: Icon, dot, href }) => {
          const count = attention?.[key] ?? 0;
          const clear = count === 0;
          return (
            <li key={key} className="first:[&>a]:pt-0 last:[&>a]:pb-0">
              <Link
                href={href}
                prefetch={false}
                className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className={cn('size-2 shrink-0 rounded-full', dot)} aria-hidden="true" />
                  <Icon className={cn('size-4 shrink-0', clear ? 'text-muted-foreground/60' : 'text-muted-foreground')} aria-hidden="true" />
                  <span className={cn('truncate text-sm', clear ? 'text-muted-foreground' : 'text-foreground')}>{label}</span>
                </span>
                {clear ? (
                  <Check className="size-4 shrink-0 text-success" aria-label={t('dashboard.teacher.attention.allClear')} />
                ) : (
                  <strong className="shrink-0 text-sm tabular-nums text-foreground">{number(count)}</strong>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </NCard>
  );
};

export default NeedsAttentionCard;

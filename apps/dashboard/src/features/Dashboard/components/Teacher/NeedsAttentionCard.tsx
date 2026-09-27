'use client';

import Link from 'next/link';
import { AlertCircle, Bell, CalendarX2, ChevronRight, FileWarning, UsersRound } from 'lucide-react';
import { NCard, NSkeleton, cn, type NIconSource } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { TeacherDashboardAttention } from '@sms/contracts/teacher-dashboard';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { TEACHER_DASHBOARD_LINKS } from '../../config/teacherDashboardLinks';
import { IconTile, type Tone } from './shared';

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
  hint: string;
  icon: NIconSource;
  tone: Tone;
  href: string;
};

const AttentionSkeleton = () => (
  <div className="flex flex-col gap-3" aria-hidden="true">
    {Array.from({ length: 4 }, (_, index) => <NSkeleton key={index} className="h-14 w-full rounded-lg" />)}
  </div>
);

const NeedsAttentionCard = ({ attention, loading, error, onRetry, className }: NeedsAttentionCardProps) => {
  const { t } = useTranslation();
  const { number } = useSchoolFormat();

  const rows: AttentionRow[] = [
    {
      key: 'missingAttendance',
      label: t('dashboard.teacher.attention.missingAttendance'),
      hint: t('dashboard.teacher.attention.missingAttendanceHint'),
      icon: CalendarX2,
      tone: 'destructive',
      href: TEACHER_DASHBOARD_LINKS.attendance,
    },
    {
      key: 'missingGrades',
      label: t('dashboard.teacher.attention.missingGrades'),
      hint: t('dashboard.teacher.attention.missingGradesHint'),
      icon: FileWarning,
      tone: 'warning',
      href: TEACHER_DASHBOARD_LINKS.grades,
    },
    {
      key: 'unreadNotifications',
      label: t('dashboard.teacher.attention.notifications'),
      hint: t('dashboard.teacher.attention.notificationsHint'),
      icon: Bell,
      tone: 'primary',
      href: TEACHER_DASHBOARD_LINKS.notifications,
    },
    {
      key: 'openConcerns',
      label: t('dashboard.teacher.attention.concerns'),
      hint: t('dashboard.teacher.attention.concernsHint'),
      icon: UsersRound,
      tone: 'info',
      href: TEACHER_DASHBOARD_LINKS.discipline,
    },
  ];

  return (
    <NCard
      title={t('dashboard.teacher.attention.title')}
      icon={AlertCircle}
      iconColor="text-destructive"
      className={cn('h-full', className)}
      loading={loading}
      skeleton={<AttentionSkeleton />}
      error={error}
      errorText={t('common.feedback.errorMessage')}
      onRetry={onRetry}
    >
      <ul className="flex flex-col divide-y divide-border">
        {rows.map((row) => {
          const count = attention?.[row.key] ?? 0;
          return (
            <li key={row.key}>
              <Link
                href={row.href}
                prefetch={false}
                className="flex items-center gap-3 rounded-lg px-1 py-2.5 transition-colors hover:bg-accent/50"
              >
                <IconTile icon={row.icon} tone={row.tone} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{row.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{row.hint}</p>
                </div>
                <span className={cn('text-base font-semibold tabular-nums', count ? 'text-destructive' : 'text-muted-foreground')}>
                  {number(count)}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </NCard>
  );
};

export default NeedsAttentionCard;

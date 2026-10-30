'use client';

import { NButton, SimpleTooltip } from 'najm-kit';

import { Send, Users, CheckCircle2, XCircle, Clock3, CircleDashed } from 'lucide-react';
import { cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';

interface Stats { total: number; present: number; absent: number; late: number; unmarked: number }

interface Props {
  hasChanges: boolean;
  isSubmitting?: boolean;
  stats: Stats;
  onSubmit: () => void;
  onMarkAllPresent?: () => void;
  canSubmit?: boolean;
  submitTitle?: string;
}

function StatItem({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: number;
  tone?: 'emerald' | 'red' | 'amber' | 'blue';
}) {
  const toneClass =
    tone === 'emerald' ? 'text-emerald-600'
    : tone === 'red' ? 'text-red-600'
    : tone === 'amber' ? 'text-amber-600'
    : tone === 'blue' ? 'text-blue-600'
    : 'text-foreground';

  return (
    <SimpleTooltip content={`${label}: ${value}`}>
      <button type="button" aria-label={`${label}: ${value}`} className="flex cursor-help items-center justify-center gap-1.5 px-2 text-xs outline-offset-4 sm:text-sm">
        <Icon aria-hidden="true" className={cn('h-3.5 w-3.5 shrink-0', toneClass)} />
        <span className={cn('font-mono font-semibold whitespace-nowrap', toneClass)}>{value}</span>
      </button>
    </SimpleTooltip>
  );
}

export default function RosterHeader({
  hasChanges, isSubmitting, stats,
  onSubmit, onMarkAllPresent,
  canSubmit = true, submitTitle,
}: Props) {
  const { t } = useTranslation();
  const title = submitTitle ?? t('attendance.roster.submit');

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none">
      {onMarkAllPresent && <NButton type="button" variant="outline" disabled={isSubmitting || !canSubmit} onClick={onMarkAllPresent} className="h-10 w-full sm:w-auto">
        {t('attendance.roster.markAllPresent')}
      </NButton>}
      <div className="flex h-10 min-w-0 items-center divide-x divide-border rounded-md border bg-card px-1">
        <StatItem icon={Users} label={t('attendance.roster.total')} value={stats.total} tone="blue" />
        <StatItem icon={CircleDashed} label={t('attendance.roster.unmarked')} value={stats.unmarked} />
        <StatItem icon={CheckCircle2} label={t('attendance.roster.present')} value={stats.present} tone="emerald" />
        <StatItem icon={XCircle} label={t('attendance.roster.absent')} value={stats.absent} tone="red" />
        <StatItem icon={Clock3} label={t('attendance.roster.late')} value={stats.late} tone="amber" />
      </div>
      <NButton
        onClick={onSubmit}
        loading={isSubmitting}
        leftIcon={<Send className="h-4 w-4" />}
        disabled={isSubmitting || !hasChanges || !canSubmit}
        aria-label={title}
        title={title}
        className="h-10 w-10 shrink-0 cursor-pointer p-0 disabled:cursor-not-allowed"
      />
    </div>
  );
}

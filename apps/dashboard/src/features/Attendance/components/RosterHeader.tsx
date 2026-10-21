'use client';

import { NButton } from 'najm-kit';

import { Loader2, Send, Users, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import { cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';

interface Stats { total: number; present: number; absent: number; late: number; unmarked: number; pending: number }

interface Props {
  hasChanges: boolean;
  isSubmitting?: boolean;
  stats: Stats;
  onSubmit: () => void;
  onMarkAllPresent: () => void;
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
    <div className="flex min-w-0 items-center justify-center gap-1.5 text-xs sm:text-sm">
      <Icon className={cn('h-3.5 w-3.5 shrink-0', toneClass)} />
      <span className="min-w-0 text-muted-foreground">{label}:</span>
      <span className={cn('font-mono font-semibold', toneClass)}>{value}</span>
    </div>
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
      <NButton type="button" variant="outline" disabled={isSubmitting || !canSubmit} onClick={onMarkAllPresent} className="h-10 w-full sm:w-auto">
        {t('attendance.roster.markAllPresent')}
      </NButton>
      <div className="grid min-w-0 flex-1 grid-cols-2 items-center gap-x-3 gap-y-2 rounded-md border bg-card px-3 py-2 sm:flex sm:h-10 sm:flex-none sm:gap-4 sm:py-0">
        <StatItem icon={Users} label={t('attendance.roster.total')} value={stats.total} tone="blue" />
        <StatItem icon={Clock3} label={t('attendance.roster.unmarked')} value={stats.unmarked} />
        <span className="hidden h-4 w-px shrink-0 bg-border sm:block" />
        <StatItem icon={CheckCircle2} label={t('attendance.roster.present')} value={stats.present} tone="emerald" />
        <span className="hidden h-4 w-px shrink-0 bg-border sm:block" />
        <StatItem icon={XCircle} label={t('attendance.roster.absent')} value={stats.absent} tone="red" />
        <span className="hidden h-4 w-px shrink-0 bg-border sm:block" />
        <StatItem icon={Clock3} label={t('attendance.roster.late')} value={stats.late} tone="amber" />
      </div>
      {stats.pending > 0 && <span role="status" className="order-last basis-full text-end text-xs text-amber-700 dark:text-amber-300">{t('attendance.roster.unsavedMarks', { count: stats.pending })}</span>}
      <NButton
        onClick={onSubmit}
        disabled={isSubmitting || !hasChanges || !canSubmit}
        aria-label={title}
        title={title}
        className="h-10 w-10 shrink-0 cursor-pointer p-0 disabled:cursor-not-allowed"
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </NButton>
    </div>
  );
}

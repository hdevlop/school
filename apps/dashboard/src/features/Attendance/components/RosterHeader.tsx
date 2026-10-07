'use client';

import { NButton } from 'najm-kit';

import { Loader2, Send, Users, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import { cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';

interface Stats { total: number; present: number; absent: number; late: number }

interface Props {
  hasChanges: boolean;
  isSubmitting?: boolean;
  stats: Stats;
  onSubmit: () => void;
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
    <div className="flex items-center justify-center gap-1.5 whitespace-nowrap text-xs sm:text-sm">
      <Icon className={cn('h-3.5 w-3.5 shrink-0', toneClass)} />
      <span className="text-muted-foreground">{label}:</span>
      <span className={cn('font-mono font-semibold', toneClass)}>{value}</span>
    </div>
  );
}

export default function RosterHeader({
  hasChanges, isSubmitting, stats,
  onSubmit,
  canSubmit = true, submitTitle,
}: Props) {
  const { t } = useTranslation();
  const title = submitTitle ?? t('attendance.roster.submit');

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none">
      <div className="grid min-w-0 flex-1 grid-cols-2 items-center gap-x-3 gap-y-2 rounded-md border bg-card px-3 py-2 sm:flex sm:h-10 sm:flex-none sm:gap-4 sm:py-0">
        <StatItem icon={Users} label={t('attendance.roster.total')} value={stats.total} tone="blue" />
        <span className="hidden h-4 w-px shrink-0 bg-border sm:block" />
        <StatItem icon={CheckCircle2} label={t('attendance.roster.present')} value={stats.present} tone="emerald" />
        <span className="hidden h-4 w-px shrink-0 bg-border sm:block" />
        <StatItem icon={XCircle} label={t('attendance.roster.absent')} value={stats.absent} tone="red" />
        <span className="hidden h-4 w-px shrink-0 bg-border sm:block" />
        <StatItem icon={Clock3} label={t('attendance.roster.late')} value={stats.late} tone="amber" />
      </div>
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

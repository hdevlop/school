'use client';

import { NButton } from 'najm-kit';

import { RotateCcw, Loader2, Send, Users, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'najm-i18n/react';

interface Stats { total: number; present: number; absent: number; late: number }

interface Props {
  hasChanges: boolean;
  isSubmitting?: boolean;
  stats: Stats;
  onReset: () => void;
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
    <div className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap text-sm">
      <Icon className={cn('h-3.5 w-3.5 shrink-0', toneClass)} />
      <span className="text-muted-foreground">{label}:</span>
      <span className={cn('font-mono font-semibold', toneClass)}>{value}</span>
    </div>
  );
}

export default function RosterHeader({
  hasChanges, isSubmitting, stats,
  onReset, onSubmit,
  canSubmit = true, submitTitle,
}: Props) {
  const { t } = useTranslation();
  const title = submitTitle ?? t('attendance.roster.submit');

  return (
    <div className="flex items-stretch gap-2 ml-auto">
      <div className="flex items-center rounded-md border bg-card px-3 h-10 gap-4">
        <StatItem icon={Users} label={t('attendance.roster.total')} value={stats.total} tone="blue" />
        <span className="h-4 w-px bg-border shrink-0" />
        <StatItem icon={CheckCircle2} label={t('attendance.roster.present')} value={stats.present} tone="emerald" />
        <span className="h-4 w-px bg-border shrink-0" />
        <StatItem icon={XCircle} label={t('attendance.roster.absent')} value={stats.absent} tone="red" />
        <span className="h-4 w-px bg-border shrink-0" />
        <StatItem icon={Clock3} label={t('attendance.roster.late')} value={stats.late} tone="amber" />
      </div>
      {hasChanges && (
        <NButton
          variant="outline"
          onClick={onReset}
          disabled={isSubmitting}
          aria-label={t('attendance.roster.reset')}
          title={t('attendance.roster.reset')}
          className="h-10 w-10 cursor-pointer p-0 border border-slate-900 bg-white text-slate-900 shadow-sm hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-50 disabled:text-slate-300 disabled:shadow-none"
        >
          <RotateCcw className="h-4 w-4" />
        </NButton>
      )}
      <NButton
        onClick={onSubmit}
        disabled={isSubmitting || !hasChanges || !canSubmit}
        aria-label={title}
        title={title}
        className="h-10 w-10 cursor-pointer p-0 disabled:cursor-not-allowed"
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </NButton>
    </div>
  );
}

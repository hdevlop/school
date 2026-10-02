import { TrendingUp, TrendingDown, Target, Loader2, Send } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { NButton } from 'najm-kit';
import { cn } from 'najm-kit';

interface Stats {
  total: number;
  passing: number;
  highest: number | null;
  lowest: number | null;
  passRate: number;
}

interface Props {
  stats: Stats;
  hasChanges?: boolean;
  isSubmitting?: boolean;
  onSubmit?: () => void;
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
  value: string | number;
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
      <span className={cn('font-semibold font-mono', toneClass)}>{value}</span>
    </div>
  );
}

export default function GradesHeader({
  stats,
  hasChanges = false,
  isSubmitting = false,
  onSubmit,
  canSubmit = true,
  submitTitle,
}: Props) {
  const { t } = useTranslation();
  const title = submitTitle ?? t('grades.toolbar.save');
  const fmt = (v: number | null) => (v == null ? '—' : `${v}%`);
  return (
    <div className="flex w-full flex-wrap items-stretch justify-end gap-2">
      <div className="flex min-h-10 flex-wrap items-center gap-x-4 gap-y-2 rounded-md border bg-card px-3 py-2">
        <StatItem icon={TrendingUp} label={t('grades.toolbar.highest')} value={fmt(stats.highest)} tone="blue" />
        <span className="h-4 w-px bg-border shrink-0" />
        <StatItem icon={TrendingDown} label={t('grades.toolbar.lowest')} value={fmt(stats.lowest)} tone="red" />
        <span className="h-4 w-px bg-border shrink-0" />
        <StatItem icon={Target} label={t('grades.toolbar.passRate')} value={`${stats.passRate}%`} tone="amber" />
      </div>
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

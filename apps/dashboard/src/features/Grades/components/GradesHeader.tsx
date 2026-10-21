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
  onReset?: () => void;
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

  // A phone stacks the label under the value so the three stats share one row;
  // wider screens keep the inline "Label: value" strip.
  return (
    <div className="flex min-w-0 flex-col-reverse items-center justify-center gap-0.5 px-2 sm:flex-row sm:gap-1.5 sm:px-4">
      <span className="flex min-w-0 max-w-full items-center justify-center gap-1 text-[11px] text-muted-foreground sm:gap-1.5 sm:text-sm">
        <Icon className={cn('h-3.5 w-3.5 shrink-0', toneClass)} />
        <span className="min-w-0 text-center whitespace-normal sm:whitespace-nowrap sm:text-start">{label}<span className="max-sm:hidden">:</span></span>
      </span>
      <span className={cn('text-sm font-semibold font-mono whitespace-nowrap', toneClass)}>{value}</span>
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
  onReset,
}: Props) {
  const { t } = useTranslation();
  const title = submitTitle ?? t('grades.toolbar.save');
  const fmt = (v: number | null) => (v == null ? '—' : `${v}%`);
  return (
    <div className="flex w-full flex-wrap items-stretch justify-end gap-2">
      {hasChanges ? (
        <p role="status" className="w-full text-sm font-medium text-amber-700 dark:text-amber-400">
          {t('grades.messages.unsavedChanges')}
        </p>
      ) : null}
      <div className="grid w-full min-w-0 grid-cols-3 items-center divide-x divide-border rounded-md border bg-card py-1.5 sm:flex sm:h-10 sm:w-auto sm:py-0">
        <StatItem icon={TrendingUp} label={t('grades.toolbar.highest')} value={fmt(stats.highest)} tone="blue" />
        <StatItem icon={TrendingDown} label={t('grades.toolbar.lowest')} value={fmt(stats.lowest)} tone="red" />
        <StatItem icon={Target} label={t('grades.toolbar.passRate')} value={`${stats.passRate}%`} tone="amber" />
      </div>
      <div className="flex w-full flex-wrap items-stretch justify-end gap-2 sm:w-auto">
        {hasChanges ? (
          <NButton type="button" variant="outline" disabled={isSubmitting} onClick={onReset}>
            {t('grades.messages.resetChanges')}
          </NButton>
        ) : null}
        <NButton
          onClick={onSubmit}
          disabled={isSubmitting || !hasChanges || !canSubmit}
          aria-label={title}
          title={title}
          className="h-auto min-h-10 shrink-0 cursor-pointer gap-2 px-3 disabled:cursor-not-allowed"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {title}
        </NButton>
      </div>
    </div>
  );
}

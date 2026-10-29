import { TrendingUp, TrendingDown, Target, Send } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { NButton, SimpleTooltip } from 'najm-kit';
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

  return (
    <SimpleTooltip content={`${label}: ${value}`}>
      <button type="button" aria-label={`${label}: ${value}`} className="flex cursor-help items-center justify-center gap-1.5 px-2.5 text-xs outline-offset-4 sm:text-sm">
        <Icon aria-hidden="true" className={cn('h-3.5 w-3.5 shrink-0', toneClass)} />
        <span className={cn('font-mono font-semibold whitespace-nowrap', toneClass)}>{value}</span>
      </button>
    </SimpleTooltip>
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
      <div className="flex h-10 min-w-0 items-center divide-x divide-border rounded-md border bg-card">
        <StatItem icon={TrendingUp} label={t('grades.toolbar.highest')} value={fmt(stats.highest)} tone="blue" />
        <StatItem icon={TrendingDown} label={t('grades.toolbar.lowest')} value={fmt(stats.lowest)} tone="red" />
        <StatItem icon={Target} label={t('grades.toolbar.passRate')} value={`${stats.passRate}%`} tone="amber" />
      </div>
      <div className="flex flex-wrap items-stretch justify-end gap-2">
        {hasChanges ? (
          <NButton type="button" variant="outline" disabled={isSubmitting} onClick={onReset}>
            {t('grades.messages.resetChanges')}
          </NButton>
        ) : null}
        <NButton
          onClick={onSubmit}
          loading={isSubmitting}
          leftIcon={<Send className="h-4 w-4" />}
          disabled={isSubmitting || !hasChanges || !canSubmit}
          aria-label={title}
          title={title}
          className="h-auto min-h-10 shrink-0 cursor-pointer gap-2 px-3 disabled:cursor-not-allowed"
        >
          {title}
        </NButton>
      </div>
    </div>
  );
}

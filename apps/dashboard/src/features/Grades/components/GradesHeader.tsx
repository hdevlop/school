import { TrendingUp, TrendingDown, Target, RotateCcw, Loader2, Send } from 'lucide-react';
import { NButton } from 'najm-kit';
import { cn } from '@/lib/utils';

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
  onReset?: () => void;
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
  onReset,
  onSubmit,
  canSubmit = true,
  submitTitle = 'Save grades',
}: Props) {
  const fmt = (v: number | null) => (v == null ? '—' : `${v}%`);
  return (
    <div className="flex w-full items-stretch justify-end gap-2">
      <div className="flex h-10 items-center gap-4 rounded-md border bg-card px-3">
        <StatItem icon={TrendingUp} label="Highest" value={fmt(stats.highest)} tone="blue" />
        <span className="h-4 w-px bg-border shrink-0" />
        <StatItem icon={TrendingDown} label="Lowest" value={fmt(stats.lowest)} tone="red" />
        <span className="h-4 w-px bg-border shrink-0" />
        <StatItem icon={Target} label="Pass Rate" value={`${stats.passRate}%`} tone="amber" />
      </div>
      {hasChanges && (
        <NButton
          variant="outline"
          onClick={onReset}
          disabled={isSubmitting}
          aria-label="Reset changes"
          title="Reset changes"
          className="h-10 w-10 cursor-pointer p-0 border border-slate-900 bg-white text-slate-900 shadow-sm hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-50 disabled:text-slate-300 disabled:shadow-none"
        >
          <RotateCcw className="h-4 w-4" />
        </NButton>
      )}
      <NButton
        onClick={onSubmit}
        disabled={isSubmitting || !hasChanges || !canSubmit}
        aria-label={submitTitle}
        title={submitTitle}
        className="h-10 w-10 cursor-pointer p-0 disabled:cursor-not-allowed"
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </NButton>
    </div>
  );
}

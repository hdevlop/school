import { Target, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { NButton, SimpleTooltip } from 'najm-kit';

interface Stats {
  total: number;
  passing: number;
  highest: number | null;
  lowest: number | null;
  passRate: number;
}

interface Props {
  stats: Stats;
  /** The last save failed; Retry tries it again. */
  failed?: boolean;
  onRetry?: () => void;
}

/**
 * Grades save on their own, so nothing is said while that goes well: only a
 * failed save shows, with Retry. Beside it, the exam's pass rate.
 */
export default function GradesHeader({ stats, failed = false, onRetry }: Props) {
  const { t } = useTranslation();
  const passRate = `${stats.passRate}%`;
  return (
    // On a phone only a failed save takes a row: the pass rate is for the desktop.
    <div className={`flex w-full items-center justify-between gap-2 md:justify-end ${failed ? '' : 'max-md:hidden'}`}>
      {failed ? (
        <p role="alert" className="flex min-h-9 min-w-0 items-center gap-1.5 text-xs sm:text-sm">
          <TriangleAlert aria-hidden="true" className="size-4 shrink-0 text-destructive" />
          <span className="truncate text-destructive">{t('grades.messages.autosaveFailed')}</span>
          <NButton type="button" size="sm" variant="outline" onClick={onRetry}>{t('grades.messages.retry')}</NButton>
        </p>
      ) : <span className="max-md:hidden" />}
      <SimpleTooltip content={`${t('grades.toolbar.passRate')}: ${passRate}`}>
        <span className="flex h-10 shrink-0 items-center gap-1.5 rounded-md border bg-card px-2.5 text-sm max-md:hidden">
          <Target aria-hidden="true" className="size-3.5 text-amber-600" />
          <span className="text-muted-foreground">{t('grades.toolbar.passRate')}</span>
          <span className="font-mono font-semibold text-amber-600">{passRate}</span>
        </span>
      </SimpleTooltip>
    </div>
  );
}
